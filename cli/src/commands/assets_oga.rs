use anyhow::{Context, Result};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read as IoRead;
use std::path::{Path, PathBuf};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OGA_BASE_URL: &str = "https://opengameart.org";
const OGA_CC0_LICENSE_ID: &str = "188"; // Drupal taxonomy ID for CC0

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OgaAsset {
    pub id: String,
    pub title: String,
    pub url: String,
    pub license: String,
    pub author: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview_url: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub files: Vec<OgaFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OgaFile {
    pub name: String,
    pub url: String,
    pub size: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct OgaSearchResult {
    pub assets: Vec<OgaAsset>,
    pub total: usize,
    pub page: usize,
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/// Search OpenGameArt for CC0 assets
pub fn search(query: &str, asset_type: Option<&str>, page: usize) -> Result<OgaSearchResult> {
    let mut url = format!(
        "{}/art-search-advanced?keys={}&field_art_license_tid={}&page={}",
        OGA_BASE_URL,
        urlencoding::encode(query),
        OGA_CC0_LICENSE_ID,
        page
    );

    // Add type filter if specified
    if let Some(t) = asset_type {
        let type_id = match t {
            "2d" | "2d-art" => "7",      // 2D Art
            "3d" | "3d-art" => "8",      // 3D Art
            "music" => "12",              // Music
            "sound" | "sfx" => "13",     // Sound Effect
            "texture" => "9",             // Texture
            "concept" => "10",            // Concept Art
            "document" => "11",           // Document
            _ => return Err(anyhow::anyhow!("Unknown asset type: {}", t)),
        };
        url.push_str(&format!("&field_art_type_tid={}", type_id));
    }

    let response = ureq::get(&url)
        .call()
        .with_context(|| format!("Failed to fetch search results from {}", url))?;

    let html = response
        .into_string()
        .context("Failed to read response body")?;

    // Debug: write HTML to file for inspection
    if std::env::var("DEBUG_OGA").is_ok() {
        std::fs::write("/tmp/oga_search.html", &html).ok();
        eprintln!("DEBUG: Wrote HTML to /tmp/oga_search.html");
        eprintln!("DEBUG: URL was: {}", url);
    }

    let document = Html::parse_document(&html);

    // Parse search results
    let assets = parse_search_results(&document)?;

    // Try to extract total count from pagination
    let total = parse_total_results(&document).unwrap_or(assets.len());

    Ok(OgaSearchResult {
        assets,
        total,
        page,
    })
}

fn parse_search_results(document: &Html) -> Result<Vec<OgaAsset>> {
    let mut assets = Vec::new();

    // Search result items are in .views-row divs with class art-previews-inline
    let row_selector = Selector::parse(".views-row.art-previews-inline").unwrap();
    let title_selector = Selector::parse(".art-preview-title a, .field-name-title a").unwrap();
    let preview_selector = Selector::parse("img").unwrap();

    for row in document.select(&row_selector) {
        // Extract title and URL
        if let Some(title_elem) = row.select(&title_selector).next() {
            let title = title_elem.text().collect::<String>().trim().to_string();
            let href = title_elem.value().attr("href");

            if let Some(href) = href {
                // Extract asset ID from URL (e.g., /content/dungeon-tileset -> dungeon-tileset)
                let id = href.trim_start_matches("/content/").to_string();
                let url = if href.starts_with("http") {
                    href.to_string()
                } else {
                    format!("{}{}", OGA_BASE_URL, href)
                };

                // Try to get preview image
                let preview_url = row
                    .select(&preview_selector)
                    .next()
                    .and_then(|img| img.value().attr("src"))
                    .map(|src| {
                        if src.starts_with("http") {
                            src.to_string()
                        } else if src.starts_with("//") {
                            format!("https:{}", src)
                        } else {
                            format!("{}{}", OGA_BASE_URL, src)
                        }
                    });

                assets.push(OgaAsset {
                    id,
                    title,
                    url,
                    license: "CC0".to_string(), // Guaranteed by search filter
                    author: String::new(),      // Will be filled when fetching full details
                    preview_url,
                    files: Vec::new(),
                });
            }
        }
    }

    Ok(assets)
}

fn parse_total_results(document: &Html) -> Option<usize> {
    // Look for pagination info like "Displaying 1 - 24 of 786"
    let text = document.html();

    // Try to find "of XXX" pattern
    if let Some(pos) = text.to_lowercase().find(" of ") {
        let after = &text[pos + 4..];
        // Take next 20 chars and look for a number
        let snippet = &after[..after.len().min(20)];
        if let Some(num_match) = snippet.split(|c: char| !c.is_numeric()).find(|s| !s.is_empty()) {
            if let Ok(total) = num_match.parse::<usize>() {
                return Some(total);
            }
        }
    }

    None
}

// ---------------------------------------------------------------------------
// Asset Details
// ---------------------------------------------------------------------------

/// Fetch full asset details from its page
pub fn fetch_asset_details(asset_id: &str) -> Result<OgaAsset> {
    let url = format!("{}/content/{}", OGA_BASE_URL, asset_id);

    let response = ureq::get(&url)
        .call()
        .with_context(|| format!("Failed to fetch asset page: {}", url))?;

    let html = response
        .into_string()
        .context("Failed to read asset page")?;

    let document = Html::parse_document(&html);

    // Parse license (CRITICAL: verify CC0)
    let license = parse_license(&document)?;
    if license != "CC0" {
        anyhow::bail!(
            "Asset {} is not CC0 (found: {}). Arcane only supports CC0 assets.",
            asset_id,
            license
        );
    }

    // Parse title
    let title_selector = Selector::parse("h1.page__title, h2.node-title, h1#page-title").unwrap();
    let title = document
        .select(&title_selector)
        .next()
        .map(|elem| elem.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| asset_id.to_string());

    // Parse author
    let author_selector = Selector::parse(".field--name-uid a, .username, .submitted a").unwrap();
    let author = document
        .select(&author_selector)
        .next()
        .map(|elem| elem.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    // Parse file links
    let files = parse_file_links(&document)?;

    // Parse preview image
    let preview_selector = Selector::parse(".field--name-field-art-preview img, .art-preview img").unwrap();
    let preview_url = document
        .select(&preview_selector)
        .next()
        .and_then(|img| img.value().attr("src"))
        .map(|src| {
            if src.starts_with("http") {
                src.to_string()
            } else if src.starts_with("//") {
                format!("https:{}", src)
            } else {
                format!("{}{}", OGA_BASE_URL, src)
            }
        });

    Ok(OgaAsset {
        id: asset_id.to_string(),
        title,
        url,
        license,
        author,
        preview_url,
        files,
    })
}

fn parse_license(document: &Html) -> Result<String> {
    // License is typically in a link like: <a href="...">CC0</a>
    // Try multiple selectors to be robust
    let selectors = [
        ".field--name-field-art-license a",
        ".field-name-field-art-license a",
        "a[href*='creativecommons.org']",
        "a[href*='publicdomain']",
    ];

    for selector_str in &selectors {
        if let Ok(selector) = Selector::parse(selector_str) {
            for elem in document.select(&selector) {
                let text = elem.text().collect::<String>().trim().to_string();
                if !text.is_empty() {
                    // Normalize license name
                    if text.contains("CC0") || text.contains("Public Domain") {
                        return Ok("CC0".to_string());
                    }
                    return Ok(text);
                }
            }
        }
    }

    Err(anyhow::anyhow!("Could not find license information on page"))
}

fn parse_file_links(document: &Html) -> Result<Vec<OgaFile>> {
    let mut files = Vec::new();

    // Files are typically in .field--name-field-art-files or similar
    let file_selector = Selector::parse(
        ".field--name-field-art-files a, .field-name-field-art-files a, \
         .file a[href*='/sites/default/files/']"
    ).unwrap();

    for elem in document.select(&file_selector) {
        if let Some(href) = elem.value().attr("href") {
            let name = elem.text().collect::<String>().trim().to_string();
            let url = if href.starts_with("http") {
                href.to_string()
            } else {
                format!("{}{}", OGA_BASE_URL, href)
            };

            files.push(OgaFile {
                name,
                url,
                size: None, // Could fetch with HEAD request if needed
            });
        }
    }

    Ok(files)
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/// Download asset files to destination directory
pub fn download_asset(asset_id: &str, dest: &Path) -> Result<PathBuf> {
    // First, fetch asset details and verify CC0
    let asset = fetch_asset_details(asset_id)?;

    // Create destination directory
    let asset_dir = dest.join(&asset.id);
    fs::create_dir_all(&asset_dir)
        .with_context(|| format!("Failed to create directory {}", asset_dir.display()))?;

    if asset.files.is_empty() {
        return Err(anyhow::anyhow!("Asset {} has no downloadable files", asset_id));
    }

    // Download all files
    for file in &asset.files {
        let file_path = asset_dir.join(&file.name);

        // Skip if already exists (simple caching)
        if file_path.exists() {
            continue;
        }

        let response = ureq::get(&file.url)
            .call()
            .with_context(|| format!("Failed to download {}", file.url))?;

        let mut body = Vec::new();
        response
            .into_reader()
            .read_to_end(&mut body)
            .context("Failed to read file data")?;

        fs::write(&file_path, &body)
            .with_context(|| format!("Failed to write {}", file_path.display()))?;
    }

    Ok(asset_dir)
}

// ---------------------------------------------------------------------------
// CLI Entry Points
// ---------------------------------------------------------------------------

pub fn run_search(query: String, asset_type: Option<String>, page: usize, json: bool) -> Result<()> {
    let result = search(&query, asset_type.as_deref(), page)?;

    if json {
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    if result.assets.is_empty() {
        println!("No CC0 assets found for \"{}\".", query);
        println!("\nTry different search terms or check opengameart.org directly.");
        return Ok(());
    }

    println!(
        "Found {} CC0 asset{} for \"{}\" (page {}):\n",
        result.total,
        if result.total == 1 { "" } else { "s" },
        query,
        page + 1
    );

    for asset in &result.assets {
        println!("  {:<40} {}", asset.id, asset.title);
    }

    println!("\nUse `arcane assets info-oga <asset-id>` to see details.");
    println!("Use `arcane assets download-oga <asset-id> [dest]` to download.");

    if result.assets.len() >= 24 && result.total > result.assets.len() {
        println!(
            "\nShowing page {}. Use --page {} to see more results.",
            page + 1,
            page + 2
        );
    }

    Ok(())
}

pub fn run_info(asset_id: String, json: bool) -> Result<()> {
    let asset = fetch_asset_details(&asset_id)?;

    if json {
        println!("{}", serde_json::to_string_pretty(&asset)?);
        return Ok(());
    }

    println!("{} ({})", asset.title, asset.id);
    println!("{}", "=".repeat(60));
    println!("Author:  {}", asset.author);
    println!("License: {} (public domain)", asset.license);
    println!("URL:     {}", asset.url);

    if !asset.files.is_empty() {
        println!("\nFiles ({}):", asset.files.len());
        for file in &asset.files {
            println!("  • {}", file.name);
        }
    }

    println!("\nUse `arcane assets download-oga {} [dest]` to download.", asset.id);

    Ok(())
}

pub fn run_download(asset_id: String, dest: Option<String>, json: bool) -> Result<()> {
    let dest_path = dest
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("assets/oga"));

    if !json {
        println!("Downloading CC0 asset {} to {}...", asset_id, dest_path.display());
    }

    let asset_dir = download_asset(&asset_id, &dest_path)?;

    if json {
        println!(
            "{{\"status\":\"complete\",\"asset\":\"{}\",\"path\":\"{}\"}}",
            asset_id,
            asset_dir.display()
        );
    } else {
        println!("Downloaded to {}", asset_dir.display());
        println!("\nLicense: CC0 (public domain)");
        println!("Source:  https://opengameart.org");
        println!("\nUse in your game:");
        println!("  const tex = loadTexture(\"{}/{}/...\");", dest_path.display(), asset_id);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_search_html() {
        let html = r#"
            <div class="views-row art-previews-inline">
                <div class="field-name-title">
                    <span class="art-preview-title">
                        <a href="/content/test-asset">Test Asset</a>
                    </span>
                </div>
                <img src="/sites/default/files/preview.png" />
            </div>
        "#;

        let document = Html::parse_document(html);
        let results = parse_search_results(&document).unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "test-asset");
        assert_eq!(results[0].title, "Test Asset");
        assert_eq!(results[0].license, "CC0");
    }

    #[test]
    fn parse_license_cc0() {
        let html = r#"
            <div class="field--name-field-art-license">
                <a href="http://creativecommons.org/publicdomain/zero/1.0/">CC0</a>
            </div>
        "#;

        let document = Html::parse_document(html);
        let license = parse_license(&document).unwrap();

        assert_eq!(license, "CC0");
    }

    #[test]
    fn parse_license_non_cc0_fails() {
        let html = r#"
            <div class="field--name-field-art-license">
                <a href="http://creativecommons.org/licenses/by/3.0/">CC-BY 3.0</a>
            </div>
        "#;

        let document = Html::parse_document(html);
        let license = parse_license(&document).unwrap();

        assert_ne!(license, "CC0");
    }

    #[test]
    fn parse_file_links_test() {
        let html = r#"
            <div class="field--name-field-art-files">
                <a href="/sites/default/files/test.zip">test.zip</a>
                <a href="/sites/default/files/preview.png">preview.png</a>
            </div>
        "#;

        let document = Html::parse_document(html);
        let files = parse_file_links(&document).unwrap();

        assert_eq!(files.len(), 2);
        assert_eq!(files[0].name, "test.zip");
        assert_eq!(files[1].name, "preview.png");
    }
}
