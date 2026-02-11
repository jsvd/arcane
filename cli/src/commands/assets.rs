use anyhow::{Context, Result};
use include_dir::{include_dir, Dir};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Read as IoRead;
use std::path::{Path, PathBuf};

static ASSETS_DIR: Dir<'static> = include_dir!("$OUT_DIR/assets");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetPack {
    pub id: String,
    pub name: String,
    pub description: String,
    pub source: String,
    #[serde(rename = "type")]
    pub asset_type: Vec<String>,
    pub license: String,
    pub url: String,
    pub download_url: String,
    pub tags: Vec<String>,
    #[serde(default)]
    pub contents: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct AssetCatalog {
    pub packs: Vec<AssetPack>,
    pub synonyms: HashMap<String, Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub packs: Vec<AssetPack>,
    pub total: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestions: Option<Vec<String>>,
}

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

fn find_assets_dir() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let mut dir = cwd.as_path();
    loop {
        let candidate = dir.join("assets").join("catalog.json");
        if candidate.exists() {
            return Some(dir.join("assets"));
        }
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let mut dir_opt = exe.parent();
        while let Some(d) = dir_opt {
            let candidate = d.join("assets").join("catalog.json");
            if candidate.exists() {
                return Some(d.join("assets"));
            }
            dir_opt = d.parent();
        }
    }

    None
}

pub fn load_catalog() -> Result<AssetCatalog> {
    // Try filesystem first (dev-from-repo)
    if let Some(assets_dir) = find_assets_dir() {
        let catalog_path = assets_dir.join("catalog.json");
        let content = fs::read_to_string(&catalog_path)
            .with_context(|| format!("Failed to read {}", catalog_path.display()))?;
        return serde_json::from_str(&content).context("Failed to parse catalog.json");
    }

    // Fall back to embedded data
    let file = ASSETS_DIR
        .get_file("catalog.json")
        .context("Embedded catalog.json not found")?;
    let content = file
        .contents_utf8()
        .context("catalog.json is not valid UTF-8")?;
    serde_json::from_str(content).context("Failed to parse embedded catalog.json")
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

fn get_search_terms(query: &str, synonyms: &HashMap<String, Vec<String>>) -> Vec<String> {
    let lower = query.to_lowercase();
    let mut terms: HashSet<String> = HashSet::new();
    terms.insert(lower.clone());

    // Check if query is a synonym of something
    for (main_term, syns) in synonyms {
        if syns.iter().any(|s| s == &lower) {
            terms.insert(main_term.clone());
            for s in syns {
                terms.insert(s.clone());
            }
        }
    }

    // Check if query is a main term
    if let Some(syns) = synonyms.get(&lower) {
        for s in syns {
            terms.insert(s.clone());
        }
    }

    terms.into_iter().collect()
}

fn calculate_relevance(pack: &AssetPack, search_terms: &[String]) -> u32 {
    let mut score: u32 = 0;

    for term in search_terms {
        // Exact name match = highest priority
        if pack.name.to_lowercase().contains(term) {
            score += 10;
        }

        // Contents match = high priority
        for content in &pack.contents {
            if content.to_lowercase().contains(term) {
                score += 8;
            }
        }

        // Tag match = medium priority
        if pack.tags.iter().any(|t| t.to_lowercase().contains(term)) {
            score += 5;
        }

        // Description match = lower priority
        if pack.description.to_lowercase().contains(term) {
            score += 3;
        }
    }

    score
}

fn generate_suggestions(query: &str, catalog: &AssetCatalog) -> Vec<String> {
    let mut suggestions = Vec::new();

    // Suggest browsing by type
    let mut all_types: HashSet<&str> = HashSet::new();
    for pack in &catalog.packs {
        for t in &pack.asset_type {
            all_types.insert(t);
        }
    }
    let mut types: Vec<&str> = all_types.into_iter().collect();
    types.sort();
    suggestions.push(format!("Try browsing by type: {}", types.join(", ")));

    // Suggest related terms
    let lower = query.to_lowercase();
    let mut related: Vec<String> = Vec::new();
    for (main_term, syns) in &catalog.synonyms {
        if main_term.contains(&lower) || syns.iter().any(|s| s.contains(&lower)) {
            related.push(main_term.clone());
            for s in syns {
                related.push(s.clone());
            }
        }
    }
    related.sort();
    related.dedup();
    if !related.is_empty() {
        let display: Vec<&str> = related.iter().map(|s| s.as_str()).take(5).collect();
        suggestions.push(format!("Try related terms: {}", display.join(", ")));
    }

    suggestions.push(
        "Popular packs: platformer-pack-redux, tiny-dungeon, animal-pack-redux, ui-pack"
            .to_string(),
    );

    suggestions
}

pub fn search(catalog: &AssetCatalog, query: &str, type_filter: Option<&str>) -> SearchResult {
    let search_terms = get_search_terms(query, &catalog.synonyms);

    let mut scored: Vec<(u32, &AssetPack)> = catalog
        .packs
        .iter()
        .filter_map(|pack| {
            let score = calculate_relevance(pack, &search_terms);
            if score == 0 {
                return None;
            }
            if let Some(tf) = type_filter {
                if !pack.asset_type.iter().any(|t| t == tf) {
                    return None;
                }
            }
            Some((score, pack))
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0));

    let packs: Vec<AssetPack> = scored.into_iter().map(|(_, p)| p.clone()).collect();
    let total = packs.len();

    let suggestions = if packs.is_empty() {
        Some(generate_suggestions(query, catalog))
    } else {
        None
    };

    SearchResult {
        packs,
        total,
        suggestions,
    }
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

pub fn list<'a>(catalog: &'a AssetCatalog, type_filter: Option<&str>) -> Vec<&'a AssetPack> {
    catalog
        .packs
        .iter()
        .filter(|pack| {
            type_filter
                .map(|tf| pack.asset_type.iter().any(|t| t == tf))
                .unwrap_or(true)
        })
        .collect()
}

pub fn get_asset_types(catalog: &AssetCatalog) -> Vec<String> {
    let mut types: HashSet<&str> = HashSet::new();
    for pack in &catalog.packs {
        for t in &pack.asset_type {
            types.insert(t);
        }
    }
    let mut result: Vec<String> = types.into_iter().map(String::from).collect();
    result.sort();
    result
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

pub fn download(pack: &AssetPack, dest: &Path) -> Result<PathBuf> {
    fs::create_dir_all(dest)
        .with_context(|| format!("Failed to create directory {}", dest.display()))?;

    // Download ZIP
    let response = ureq::get(&pack.download_url)
        .call()
        .with_context(|| format!("Failed to download {}", pack.download_url))?;

    let mut body = Vec::new();
    response
        .into_reader()
        .read_to_end(&mut body)
        .context("Failed to read download response")?;

    // Extract ZIP
    let extract_dir = dest.join(&pack.id);
    fs::create_dir_all(&extract_dir)?;

    let cursor = std::io::Cursor::new(body);
    let mut archive = zip::ZipArchive::new(cursor).context("Failed to read ZIP archive")?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();

        // Skip directory entries and unsafe paths
        if name.ends_with('/') || name.contains("..") {
            continue;
        }

        let out_path = extract_dir.join(&name);
        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut out_file = fs::File::create(&out_path)?;
        std::io::copy(&mut file, &mut out_file)?;
    }

    Ok(extract_dir)
}

// ---------------------------------------------------------------------------
// CLI entry points
// ---------------------------------------------------------------------------

pub fn run_list(type_filter: Option<String>, json: bool) -> Result<()> {
    let catalog = load_catalog()?;
    let packs = list(&catalog, type_filter.as_deref());

    if json {
        let output: Vec<&AssetPack> = packs;
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    if packs.is_empty() {
        if let Some(tf) = &type_filter {
            println!("No packs found for type \"{}\".", tf);
            println!("\nAvailable types: {}", get_asset_types(&catalog).join(", "));
        } else {
            println!("No asset packs found in catalog.");
        }
        return Ok(());
    }

    println!(
        "Available asset packs ({}):\n",
        packs.len()
    );
    for pack in &packs {
        let types = pack.asset_type.join(", ");
        println!("  {:<28} {} [{}]", pack.id, pack.description, types);
    }
    println!("\nAll packs are CC0 (public domain) from kenney.nl.");
    println!("Use `arcane assets search <query>` to find specific assets.");
    println!("Use `arcane assets download <pack-id> [dest]` to download.");
    Ok(())
}

pub fn run_search(query: String, type_filter: Option<String>, json: bool) -> Result<()> {
    let catalog = load_catalog()?;
    let result = search(&catalog, &query, type_filter.as_deref());

    if json {
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    if result.packs.is_empty() {
        println!("No packs found for \"{}\".\n", query);
        if let Some(suggestions) = &result.suggestions {
            for s in suggestions {
                println!("  {}", s);
            }
        }
        return Ok(());
    }

    println!(
        "Found {} pack{} matching \"{}\":\n",
        result.total,
        if result.total == 1 { "" } else { "s" },
        query
    );
    for pack in &result.packs {
        let types = pack.asset_type.join(", ");
        println!("  {:<28} {} [{}]", pack.id, pack.description, types);
        if !pack.contents.is_empty() {
            println!("  {:<28} Contents: {}", "", pack.contents.join(", "));
        }
    }
    println!("\nUse `arcane assets download <pack-id> [dest]` to download.");
    Ok(())
}

pub fn run_download(id: String, dest: Option<String>, json: bool) -> Result<()> {
    let catalog = load_catalog()?;
    let pack = catalog
        .packs
        .iter()
        .find(|p| p.id == id)
        .with_context(|| {
            format!(
                "Asset pack \"{}\" not found. Run `arcane assets list` to see available packs.",
                id
            )
        })?;

    let dest_path = dest
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("assets"));

    if json {
        println!(
            "{{\"status\":\"downloading\",\"pack\":\"{}\",\"destination\":\"{}\"}}",
            pack.id,
            dest_path.display()
        );
    } else {
        println!("Downloading {} to {}...", pack.name, dest_path.display());
    }

    let extract_dir = download(pack, &dest_path)?;

    if json {
        println!(
            "{{\"status\":\"complete\",\"pack\":\"{}\",\"path\":\"{}\"}}",
            pack.id,
            extract_dir.display()
        );
    } else {
        println!("Extracted to {}", extract_dir.display());
        println!("\nLicense: {} ({})", pack.license, pack.url);
        println!("Use assets in your game:");
        println!(
            "  const tex = loadTexture(\"{}/{}/...\");",
            dest_path.display(),
            pack.id
        );
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn test_catalog() -> AssetCatalog {
        let json = include_str!(concat!(env!("OUT_DIR"), "/assets/catalog.json"));
        serde_json::from_str(json).expect("catalog.json should parse")
    }

    #[test]
    fn catalog_loads() {
        let catalog = test_catalog();
        assert!(catalog.packs.len() >= 25, "Should have at least 25 packs");
        assert!(
            catalog.synonyms.len() >= 16,
            "Should have at least 16 synonym entries"
        );
    }

    #[test]
    fn catalog_pack_fields() {
        let catalog = test_catalog();
        for pack in &catalog.packs {
            assert!(!pack.id.is_empty(), "Pack ID should not be empty");
            assert!(!pack.name.is_empty(), "Pack name should not be empty");
            assert!(
                !pack.description.is_empty(),
                "Pack description should not be empty"
            );
            assert!(
                !pack.asset_type.is_empty(),
                "Pack should have at least one type"
            );
            assert!(!pack.tags.is_empty(), "Pack should have at least one tag");
            assert_eq!(pack.license, "CC0", "All packs should be CC0");
            assert!(
                pack.download_url.ends_with(".zip"),
                "Download URL should end with .zip"
            );
        }
    }

    #[test]
    fn list_all_packs() {
        let catalog = test_catalog();
        let packs = list(&catalog, None);
        assert_eq!(packs.len(), catalog.packs.len());
    }

    #[test]
    fn list_filter_by_type() {
        let catalog = test_catalog();
        let audio_packs = list(&catalog, Some("audio"));
        assert_eq!(audio_packs.len(), 3, "Should have 3 audio packs");
        for pack in &audio_packs {
            assert!(pack.asset_type.contains(&"audio".to_string()));
        }
    }

    #[test]
    fn list_filter_ui() {
        let catalog = test_catalog();
        let ui_packs = list(&catalog, Some("ui"));
        assert!(ui_packs.len() >= 3, "Should have at least 3 UI packs");
    }

    #[test]
    fn list_filter_fonts() {
        let catalog = test_catalog();
        let font_packs = list(&catalog, Some("fonts"));
        assert_eq!(font_packs.len(), 1);
        assert_eq!(font_packs[0].id, "kenney-fonts");
    }

    #[test]
    fn list_filter_nonexistent_type() {
        let catalog = test_catalog();
        let packs = list(&catalog, Some("nonexistent"));
        assert!(packs.is_empty());
    }

    #[test]
    fn get_asset_types_returns_sorted() {
        let catalog = test_catalog();
        let types = get_asset_types(&catalog);
        assert!(types.contains(&"audio".to_string()));
        assert!(types.contains(&"2d-sprites".to_string()));
        assert!(types.contains(&"ui".to_string()));
        // Verify sorted
        let mut sorted = types.clone();
        sorted.sort();
        assert_eq!(types, sorted);
    }

    #[test]
    fn search_by_name() {
        let catalog = test_catalog();
        let result = search(&catalog, "dungeon", None);
        assert!(result.total > 0, "Should find dungeon-related packs");
        // tiny-dungeon should be in results
        assert!(
            result.packs.iter().any(|p| p.id == "tiny-dungeon"),
            "Should find tiny-dungeon"
        );
    }

    #[test]
    fn search_by_tag() {
        let catalog = test_catalog();
        let result = search(&catalog, "roguelike", None);
        assert!(result.total > 0);
        assert!(result.packs.iter().any(|p| p.id == "roguelike-rpg-pack"));
    }

    #[test]
    fn search_by_contents() {
        let catalog = test_catalog();
        let result = search(&catalog, "skeleton", None);
        assert!(result.total > 0);
        // tiny-dungeon and roguelike-rpg-pack both have skeleton in contents
        assert!(result.packs.iter().any(|p| p.id == "tiny-dungeon"));
    }

    #[test]
    fn search_synonym_expansion() {
        let catalog = test_catalog();
        // "kitty" is a synonym for "cat", animal-pack-redux has "cat" in contents
        let result = search(&catalog, "kitty", None);
        assert!(result.total > 0, "Synonym expansion should find results");
        assert!(
            result.packs.iter().any(|p| p.id == "animal-pack-redux"),
            "Should find animal-pack-redux via kitty→cat synonym"
        );
    }

    #[test]
    fn search_synonym_reverse() {
        let catalog = test_catalog();
        // "cat" should also search for kitty, kitten, feline
        let result = search(&catalog, "cat", None);
        assert!(result.total > 0);
        assert!(result.packs.iter().any(|p| p.id == "animal-pack-redux"));
    }

    #[test]
    fn search_with_type_filter() {
        let catalog = test_catalog();
        let result = search(&catalog, "platformer", Some("tilesets"));
        assert!(result.total > 0);
        for pack in &result.packs {
            assert!(pack.asset_type.contains(&"tilesets".to_string()));
        }
    }

    #[test]
    fn search_no_results_gives_suggestions() {
        let catalog = test_catalog();
        let result = search(&catalog, "xyznonexistent", None);
        assert_eq!(result.total, 0);
        assert!(result.suggestions.is_some());
        let suggestions = result.suggestions.unwrap();
        assert!(!suggestions.is_empty());
        assert!(suggestions.iter().any(|s| s.contains("type")));
    }

    #[test]
    fn search_relevance_ordering() {
        let catalog = test_catalog();
        // "platformer" appears in pack names, tags, and descriptions
        let result = search(&catalog, "platformer", None);
        assert!(result.total >= 3);
        // First result should have "platformer" in the name (highest score)
        assert!(
            result.packs[0].name.to_lowercase().contains("platformer"),
            "Top result should have platformer in name"
        );
    }

    #[test]
    fn search_case_insensitive() {
        let catalog = test_catalog();
        let lower = search(&catalog, "dungeon", None);
        let upper = search(&catalog, "DUNGEON", None);
        let mixed = search(&catalog, "Dungeon", None);
        assert_eq!(lower.total, upper.total);
        assert_eq!(lower.total, mixed.total);
    }

    #[test]
    fn synonym_expansion_mage() {
        let catalog = test_catalog();
        // "mage" is a synonym for "wizard"
        let result = search(&catalog, "mage", None);
        // Should find packs with wizard in contents (roguelike-rpg-pack, tiny-battle)
        assert!(result.total > 0, "mage should expand to wizard and find results");
    }

    #[test]
    fn search_space() {
        let catalog = test_catalog();
        let result = search(&catalog, "space", None);
        assert!(result.total > 0);
        assert!(
            result
                .packs
                .iter()
                .any(|p| p.id == "space-shooter-redux" || p.id == "ui-pack-space-expansion")
        );
    }
}
