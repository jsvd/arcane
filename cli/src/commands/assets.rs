use anyhow::{Context, Result};
use include_dir::{include_dir, Dir};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Read as IoRead;
use std::path::{Path, PathBuf};
use walkdir;
use image::ImageReader;

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
// Inspect
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct FileCategory {
    pub category: String,
    pub count: usize,
    pub files: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spritesheets: Option<Vec<SpritesheetInfo>>,
}

#[derive(Debug, Serialize)]
pub struct InspectResult {
    pub pack_id: String,
    pub pack_name: String,
    pub total_files: usize,
    pub categories: Vec<FileCategory>,
}

fn categorize_file(path: &Path) -> Option<String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let category = match ext.as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "bmp" => "Sprites",
        "wav" | "mp3" | "ogg" | "flac" => "Audio",
        "ttf" | "otf" | "fnt" => "Fonts",
        "txt" | "md" | "json" => "Data",
        "aseprite" | "piskel" => "Sources",
        _ => return None,
    };

    Some(category.to_string())
}

fn get_file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string()
}

#[derive(Debug, Clone, Serialize)]
pub struct SpritesheetInfo {
    pub filename: String,
    pub dimensions: (u32, u32),
    pub likely_frame_size: Option<(u32, u32)>,
    pub likely_grid: Option<(u32, u32)>, // (cols, rows)
    pub likely_frame_count: Option<u32>,
    pub confidence: f32,
}

/// Detect likely spritesheet structure from image dimensions.
/// Tests common frame sizes (16, 24, 32, 48, 64 pixels) and returns the most likely grid.
fn detect_spritesheet(path: &Path) -> Option<SpritesheetInfo> {
    // Only analyze PNG/JPG files
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !matches!(ext.as_str(), "png" | "jpg" | "jpeg") {
        return None;
    }

    // Try to read image dimensions
    let reader = ImageReader::open(path).ok()?;
    let dimensions = reader.into_dimensions().ok()?;
    let (w, h) = (dimensions.0, dimensions.1);

    // Skip very small or very large images (likely not spritesheets)
    if w < 64 || h < 64 || w > 2048 || h > 2048 {
        return None;
    }

    // Common frame sizes to test: 16, 24, 32, 48, 64
    let frame_sizes = vec![16, 24, 32, 48, 64];
    let mut candidates: Vec<_> = Vec::new();

    for frame_size in frame_sizes {
        let cols = w / frame_size;
        let rows = h / frame_size;

        // Must have at least 2×2 grid, and frames must fit evenly
        if cols >= 2 && rows >= 2 && w % frame_size == 0 && h % frame_size == 0 {
            let frame_count = cols * rows;
            let confidence = if rows > 1 { 0.9 } else { 0.5 }; // Multi-row is more confident
            candidates.push((frame_size, cols, rows, frame_count, confidence));
        }

        // Also test single-row (one frame per row)
        if rows >= 2 && h % frame_size == 0 && w % frame_size == 0 {
            let cols = w / frame_size;
            let rows = h / frame_size;
            if cols > 1 {
                let frame_count = cols * rows;
                candidates.push((frame_size, cols, rows, frame_count, 0.85));
            }
        }
    }

    // Pick the candidate with highest confidence (and prefer larger grid)
    if let Some((frame_size, cols, rows, frame_count, confidence)) =
        candidates.into_iter().max_by(|a, b| {
            // Primary: confidence; secondary: total frames
            a.4.partial_cmp(&b.4)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| (a.2 * a.1).cmp(&(b.2 * b.1)))
        })
    {
        // Only return if it looks like a real spritesheet (multi-row or large grid)
        if rows > 1 || (cols > 3 && rows > 1) {
            return Some(SpritesheetInfo {
                filename: get_file_name(path),
                dimensions: (w, h),
                likely_frame_size: Some((frame_size, frame_size)),
                likely_grid: Some((cols, rows)),
                likely_frame_count: Some(frame_count),
                confidence,
            });
        }
    }

    None
}

pub fn run_inspect(id: String, cache: Option<String>, json: bool) -> Result<()> {
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

    // Determine cache directory
    let cache_path = if let Some(c) = cache {
        PathBuf::from(c)
    } else {
        std::env::temp_dir().join("arcane-assets-cache")
    };

    // Download pack (will use existing if already there)
    if !json {
        println!("Inspecting {}...", pack.name);
    }

    let extract_dir = if let Ok(existing) = fs::read_dir(&cache_path) {
        let existing_pack = existing
            .filter_map(|e| e.ok())
            .find(|e| {
                e.file_name()
                    .into_string()
                    .ok()
                    .map(|n| n == pack.id)
                    .unwrap_or(false)
            });

        if let Some(existing) = existing_pack {
            existing.path()
        } else {
            download(pack, &cache_path)?
        }
    } else {
        download(pack, &cache_path)?
    };

    // Scan directory
    let mut categories: HashMap<String, Vec<String>> = HashMap::new();
    let mut spritesheets: HashMap<String, Vec<SpritesheetInfo>> = HashMap::new();
    let mut total = 0;

    for entry in walkdir::WalkDir::new(&extract_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(category) = categorize_file(entry.path()) {
                let file_name = get_file_name(entry.path());
                categories
                    .entry(category.clone())
                    .or_insert_with(Vec::new)
                    .push(file_name);
                total += 1;

                // Detect spritesheets for sprite category
                if category == "Sprites" {
                    if let Some(sheet_info) = detect_spritesheet(entry.path()) {
                        spritesheets
                            .entry(category)
                            .or_insert_with(Vec::new)
                            .push(sheet_info);
                    }
                }
            }
        }
    }

    // Sort files in each category and convert to result
    for files in categories.values_mut() {
        files.sort();
    }

    // Sort spritesheets by grid size (larger grids first)
    for sheets in spritesheets.values_mut() {
        sheets.sort_by(|a, b| {
            let a_frames = a.likely_frame_count.unwrap_or(0);
            let b_frames = b.likely_frame_count.unwrap_or(0);
            b_frames.cmp(&a_frames)
        });
    }

    let mut sorted_cats: Vec<_> = categories
        .into_iter()
        .map(|(cat, mut files)| {
            files.sort();
            let cat_spritesheets = spritesheets.get(&cat).cloned();
            FileCategory {
                category: cat.clone(),
                count: files.len(),
                files: files.into_iter().take(20).collect(), // Limit to first 20
                spritesheets: cat_spritesheets,
            }
        })
        .collect();

    sorted_cats.sort_by(|a, b| b.count.cmp(&a.count)); // Sort by count descending

    let result = InspectResult {
        pack_id: pack.id.clone(),
        pack_name: pack.name.clone(),
        total_files: total,
        categories: sorted_cats,
    };

    if json {
        println!("{}", serde_json::to_string_pretty(&result)?);
    } else {
        println!("\n{} ({})", pack.name, pack.id);
        println!("{}", "=".repeat(60));
        println!("Total files: {}\n", total);

        for cat in &result.categories {
            println!("{}  ({})", cat.category, cat.count);

            // Show detected spritesheets first
            if let Some(sheets) = &cat.spritesheets {
                if !sheets.is_empty() {
                    println!("  📊 SPRITESHEETS:");
                    for sheet in sheets {
                        let (w, h) = sheet.dimensions;
                        if let (Some((frame_w, frame_h)), Some((cols, rows)), Some(frames)) = (
                            sheet.likely_frame_size,
                            sheet.likely_grid,
                            sheet.likely_frame_count,
                        ) {
                            println!(
                                "    • {} ({}×{})",
                                sheet.filename, w, h
                            );
                            println!(
                                "      └─ {} cols × {} rows = {} frames @ {}×{} px",
                                cols, rows, frames, frame_w, frame_h
                            );
                        }
                    }
                    println!();
                }
            }

            // Show regular files (limit to 20)
            for file in &cat.files {
                // Skip files we already showed in spritesheets section
                if let Some(sheets) = &cat.spritesheets {
                    if sheets.iter().any(|s| s.filename == *file) {
                        continue;
                    }
                }
                println!("  • {}", file);
            }

            let shown = cat.files.len().min(20);
            if cat.files.len() < cat.count {
                println!("  ... and {} more", cat.count - shown);
            }
            println!();
        }

        println!("Cached at: {}", extract_dir.display());
        println!("\nUse in your game:");
        println!(
            "  const tex = loadTexture(\"{}/{}/...\");",
            cache_path.display(),
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
    fn categorize_file_sprites() {
        assert_eq!(
            categorize_file(Path::new("sprite.png")),
            Some("Sprites".to_string())
        );
        assert_eq!(
            categorize_file(Path::new("tileset.jpg")),
            Some("Sprites".to_string())
        );
        assert_eq!(
            categorize_file(Path::new("background.gif")),
            Some("Sprites".to_string())
        );
    }

    #[test]
    fn categorize_file_audio() {
        assert_eq!(
            categorize_file(Path::new("jump.wav")),
            Some("Audio".to_string())
        );
        assert_eq!(
            categorize_file(Path::new("music.ogg")),
            Some("Audio".to_string())
        );
        assert_eq!(
            categorize_file(Path::new("sound.mp3")),
            Some("Audio".to_string())
        );
    }

    #[test]
    fn categorize_file_fonts() {
        assert_eq!(
            categorize_file(Path::new("font.ttf")),
            Some("Fonts".to_string())
        );
        assert_eq!(
            categorize_file(Path::new("ui.fnt")),
            Some("Fonts".to_string())
        );
    }

    #[test]
    fn categorize_file_data() {
        assert_eq!(
            categorize_file(Path::new("metadata.json")),
            Some("Data".to_string())
        );
        assert_eq!(
            categorize_file(Path::new("readme.txt")),
            Some("Data".to_string())
        );
    }

    #[test]
    fn categorize_file_sources() {
        assert_eq!(
            categorize_file(Path::new("sprite.aseprite")),
            Some("Sources".to_string())
        );
        assert_eq!(
            categorize_file(Path::new("art.piskel")),
            Some("Sources".to_string())
        );
    }

    #[test]
    fn categorize_file_unknown() {
        assert_eq!(categorize_file(Path::new("config.xml")), None);
        assert_eq!(categorize_file(Path::new("README")), None);
    }

    #[test]
    fn detect_spritesheet_ignores_non_images() {
        // Should not try to detect spritesheets on non-image files
        assert!(detect_spritesheet(Path::new("metadata.txt")).is_none());
        assert!(detect_spritesheet(Path::new("audio.wav")).is_none());
    }

    #[test]
    fn detect_spritesheet_ignores_missing_files() {
        // Should gracefully handle non-existent files
        assert!(detect_spritesheet(Path::new("/nonexistent/fake.png")).is_none());
    }

    #[test]
    fn spritesheet_info_serialization() {
        let info = SpritesheetInfo {
            filename: "player.png".to_string(),
            dimensions: (192, 128),
            likely_frame_size: Some((32, 32)),
            likely_grid: Some((6, 4)),
            likely_frame_count: Some(24),
            confidence: 0.9,
        };

        // Should serialize to JSON without errors
        let json = serde_json::to_string(&info).expect("Should serialize");
        assert!(json.contains("player.png"));
        assert!(json.contains("192"));
        assert!(json.contains("\"likely_grid\":[6,4]"));
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
