use anyhow::Result;
use include_dir::{include_dir, Dir};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

static CATALOG_DIR: Dir<'static> = include_dir!("$OUT_DIR/catalog");

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct Catalog {
    packs: Vec<CatalogPack>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CatalogPack {
    id: String,
    name: String,
    source: String,
    download_url: String,
    #[serde(default)]
    tile_size: Option<u32>,
    #[serde(default)]
    spacing: Option<u32>,
    #[serde(default)]
    grid_offset: Option<GridOffset>,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct GridOffset {
    x: i32,
    y: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PackView {
    id: String,
    name: String,
    source: String,
    tile_size: Option<u32>,
    spacing: Option<u32>,
    grid_offset: Option<GridOffset>,
    tags: Vec<String>,
    downloaded: bool,
    #[serde(skip_serializing_if = "String::is_empty")]
    thumbnail_data: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    download_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PackMeta {
    id: String,
    name: String,
    source: String,
    tile_size: Option<u32>,
    spacing: Option<u32>,
    grid_offset: Option<GridOffset>,
    sheet_path: String,
    cache_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpriteEntry {
    name: String,
    relative_path: String,
}

// ---------------------------------------------------------------------------
// Embedded data helpers
// ---------------------------------------------------------------------------

fn find_catalog_dir() -> Option<PathBuf> {
    // Walk up from executable looking for catalog/ directory (repo dev mode)
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.parent().map(|p| p.to_path_buf());
        while let Some(d) = dir {
            let candidate = d.join("catalog");
            if candidate.exists() && candidate.join("catalog.json").exists() {
                return Some(candidate);
            }
            dir = d.parent().map(|p| p.to_path_buf());
        }
    }

    // Try CWD parents
    if let Ok(cwd) = std::env::current_dir() {
        let mut dir = Some(cwd);
        while let Some(d) = dir {
            let candidate = d.join("catalog");
            if candidate.exists() && candidate.join("catalog.json").exists() {
                return Some(candidate);
            }
            dir = d.parent().map(|p| p.to_path_buf());
        }
    }

    None
}

fn load_catalog_json() -> String {
    if let Some(dir) = find_catalog_dir() {
        if let Ok(content) = fs::read_to_string(dir.join("catalog.json")) {
            return content;
        }
    }
    // Fall back to embedded
    CATALOG_DIR
        .get_file("catalog.json")
        .and_then(|f| f.contents_utf8())
        .unwrap_or("{\"packs\":[]}")
        .to_string()
}

fn load_html_template(name: &str) -> String {
    if let Some(dir) = find_catalog_dir() {
        let path = dir.join("html").join(name);
        if let Ok(content) = fs::read_to_string(&path) {
            return content;
        }
    }
    // Fall back to embedded
    let path = format!("html/{}", name);
    CATALOG_DIR
        .get_file(&path)
        .and_then(|f| f.contents_utf8())
        .unwrap_or("<html><body>Template not found</body></html>")
        .to_string()
}

fn load_sound_pack_json(filename: &str) -> Option<String> {
    if let Some(dir) = find_catalog_dir() {
        let path = dir.join("sounds").join("kenney").join(filename);
        if let Ok(content) = fs::read_to_string(&path) {
            return Some(content);
        }
    }
    let path = format!("sounds/kenney/{}", filename);
    CATALOG_DIR
        .get_file(&path)
        .and_then(|f| f.contents_utf8())
        .map(|s| s.to_string())
}

// ---------------------------------------------------------------------------
// Cache directory
// ---------------------------------------------------------------------------

fn cache_dir() -> PathBuf {
    dirs_cache().join("arcane").join("packs")
}

fn dirs_cache() -> PathBuf {
    if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".cache")
    } else {
        PathBuf::from("/tmp")
    }
}

fn is_pack_downloaded(pack_id: &str) -> bool {
    let dir = cache_dir().join(pack_id);
    dir.exists() && dir.is_dir()
}

// ---------------------------------------------------------------------------
// Image / thumbnail helpers
// ---------------------------------------------------------------------------

fn find_pack_image(pack_id: &str) -> Option<PathBuf> {
    let pack_dir = cache_dir().join(pack_id);
    if !pack_dir.exists() {
        return None;
    }

    let possible = [
        "Preview.png",
        "preview.png",
        "Sample.png",
        "sample.png",
        "Tilemap/tilemap_packed.png",
        "Tilemap/tilemap.png",
        "Spritesheet/sheet.png",
        "Tilesheet/tilesheet.png",
        "Tilesheet/monochrome_packed.png",
    ];

    for p in &possible {
        let full = pack_dir.join(p);
        if full.exists() {
            return Some(full);
        }
    }

    // Recursive PNG search (depth <= 2)
    find_png_recursive(&pack_dir, 0)
}

fn find_png_recursive(dir: &Path, depth: u32) -> Option<PathBuf> {
    if depth > 2 {
        return None;
    }
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return None,
    };

    let mut subdirs = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') {
                continue;
            }
            if path.is_file() && name.ends_with(".png") {
                return Some(path);
            }
            if path.is_dir() {
                subdirs.push(path);
            }
        }
    }

    for sub in subdirs {
        if let Some(found) = find_png_recursive(&sub, depth + 1) {
            return Some(found);
        }
    }

    None
}

fn image_to_base64(path: &Path) -> String {
    match fs::read(path) {
        Ok(data) => {
            use base64::Engine;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
            format!("data:image/png;base64,{}", b64)
        }
        Err(_) => String::new(),
    }
}

// ---------------------------------------------------------------------------
// Pack type detection
// ---------------------------------------------------------------------------

fn is_gallery_pack(pack_id: &str) -> bool {
    let pack_dir = cache_dir().join(pack_id);
    if !pack_dir.exists() {
        return false;
    }

    let sheet_paths = [
        "Tilemap/tilemap_packed.png",
        "Tilemap/tilemap.png",
        "Spritesheet/sheet.png",
        "Tilesheet/tilesheet.png",
        "Tilesheet/monochrome_packed.png",
    ];

    for p in &sheet_paths {
        if pack_dir.join(p).exists() {
            return false;
        }
    }

    let sprites = scan_individual_sprites(pack_id);
    sprites.len() > 20
}

fn get_sheet_path(pack_id: &str) -> String {
    let pack_dir = cache_dir().join(pack_id);
    if let Some(img) = find_pack_image(pack_id) {
        if let Ok(rel) = img.strip_prefix(&pack_dir) {
            return rel.to_string_lossy().to_string();
        }
    }
    String::new()
}

fn scan_individual_sprites(pack_id: &str) -> Vec<SpriteEntry> {
    let pack_dir = cache_dir().join(pack_id);
    if !pack_dir.exists() {
        return Vec::new();
    }

    let skip_files: std::collections::HashSet<&str> = [
        "Preview.png",
        "preview.png",
        "Sample.png",
        "sample.png",
        "License.txt",
    ]
    .into_iter()
    .collect();
    let skip_dirs: std::collections::HashSet<&str> = ["Models", ".DS_Store"].into_iter().collect();

    let mut sprites = Vec::new();
    scan_sprites_recursive(&pack_dir, &pack_dir, &skip_files, &skip_dirs, &mut sprites);
    sprites.sort_by(|a, b| a.name.cmp(&b.name));
    sprites
}

fn scan_sprites_recursive(
    root: &Path,
    dir: &Path,
    skip_files: &std::collections::HashSet<&str>,
    skip_dirs: &std::collections::HashSet<&str>,
    sprites: &mut Vec<SpriteEntry>,
) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        if name.starts_with('.') || skip_files.contains(name.as_str()) || skip_dirs.contains(name.as_str()) {
            continue;
        }

        if path.is_dir() {
            scan_sprites_recursive(root, &path, skip_files, skip_dirs, sprites);
        } else if name.ends_with(".png") {
            let relative = path.strip_prefix(root).unwrap_or(&path);
            let sprite_name = name.strip_suffix(".png").unwrap_or(&name).to_string();
            sprites.push(SpriteEntry {
                name: sprite_name,
                relative_path: relative.to_string_lossy().to_string(),
            });
        }
    }
}

fn list_pack_pngs(pack_id: &str) -> Vec<String> {
    let pack_dir = cache_dir().join(pack_id);
    if !pack_dir.exists() {
        return Vec::new();
    }
    let mut files = Vec::new();
    collect_pngs_recursive(&pack_dir, &pack_dir, &mut files);
    files.sort();
    files
}

fn collect_pngs_recursive(root: &Path, dir: &Path, out: &mut Vec<String>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if name.starts_with('.') {
            continue;
        }
        if path.is_dir() {
            collect_pngs_recursive(root, &path, out);
        } else if name.ends_with(".png") {
            if let Ok(rel) = path.strip_prefix(root) {
                out.push(rel.to_string_lossy().to_string());
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Download manager
// ---------------------------------------------------------------------------

fn scrape_kenney_url(asset_id: &str) -> Option<String> {
    let url = format!("https://kenney.nl/assets/{}", asset_id);
    let output = Command::new("curl")
        .args(["-s", &url])
        .output()
        .ok()?;

    let html = String::from_utf8_lossy(&output.stdout);

    // Look for /media/pages/assets/{id}/{hash}/kenney_{id}.zip
    let pattern = "/media/pages/assets/";
    for line in html.lines() {
        if let Some(start) = line.find(pattern) {
            let rest = &line[start..];
            if let Some(end) = rest.find(".zip") {
                let zip_path = &rest[..end + 4];
                return Some(format!("https://kenney.nl{}", zip_path));
            }
        }
    }

    None
}

fn download_pack(pack_id: &str, packs: &[CatalogPack]) -> Result<(), String> {
    let pack = packs
        .iter()
        .find(|p| p.id == pack_id)
        .ok_or_else(|| format!("Pack '{}' not found in catalog", pack_id))?;

    let cache = cache_dir();
    let pack_dir = cache.join(pack_id);
    let zip_path = cache.join(format!("{}.zip", pack_id));

    fs::create_dir_all(&cache).map_err(|e| format!("Failed to create cache dir: {}", e))?;

    // For Kenney packs, try scraping current URL
    let url = if pack.source == "kenney" {
        eprintln!("[catalog] Fetching current download URL for {}...", pack.name);
        scrape_kenney_url(pack_id).unwrap_or_else(|| {
            eprintln!("[catalog] Scraping failed, using catalog URL");
            pack.download_url.clone()
        })
    } else {
        pack.download_url.clone()
    };

    // Download via curl
    eprintln!("[catalog] Downloading {}...", pack.name);
    let status = Command::new("curl")
        .args(["-L", "-o", zip_path.to_str().unwrap(), &url])
        .status()
        .map_err(|e| format!("curl failed: {}", e))?;

    if !status.success() {
        return Err("curl download failed".into());
    }

    // Validate ZIP magic bytes
    let header = fs::read(&zip_path).map_err(|e| format!("Failed to read zip: {}", e))?;
    if header.len() < 2 || header[0] != 0x50 || header[1] != 0x4B {
        let _ = fs::remove_file(&zip_path);
        return Err("Downloaded file is not a valid ZIP (URL may have changed)".into());
    }

    // Extract
    eprintln!("[catalog] Extracting {}...", pack.name);
    fs::create_dir_all(&pack_dir).map_err(|e| format!("Failed to create pack dir: {}", e))?;
    let status = Command::new("unzip")
        .args([
            "-q",
            "-o",
            zip_path.to_str().unwrap(),
            "-d",
            pack_dir.to_str().unwrap(),
        ])
        .status()
        .map_err(|e| format!("unzip failed: {}", e))?;

    if !status.success() {
        return Err("unzip extraction failed".into());
    }

    // Clean up zip
    let _ = fs::remove_file(&zip_path);

    eprintln!("[catalog] {} ready", pack.name);
    Ok(())
}

// ---------------------------------------------------------------------------
// HTTP response helpers
// ---------------------------------------------------------------------------

fn respond_html(html: &str) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    build_response(200, "text/html; charset=utf-8", html.as_bytes())
}

fn respond_json(json: &str) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    build_response(200, "application/json", json.as_bytes())
}

fn respond_404(msg: &str) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    build_response(404, "text/plain", msg.as_bytes())
}

fn respond_file(path: &Path) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    match fs::read(path) {
        Ok(data) => {
            let content_type = match path.extension().and_then(|e| e.to_str()) {
                Some("png") => "image/png",
                Some("jpg" | "jpeg") => "image/jpeg",
                Some("ogg") => "audio/ogg",
                Some("wav") => "audio/wav",
                Some("mp3") => "audio/mpeg",
                _ => "application/octet-stream",
            };
            build_response(200, content_type, &data)
        }
        Err(_) => respond_404("File not found"),
    }
}

fn build_response(
    status: u16,
    content_type: &str,
    data: &[u8],
) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    let data = data.to_vec();
    let data_len = data.len();

    let status = tiny_http::StatusCode(status);
    let ct = tiny_http::Header::from_bytes(&b"Content-Type"[..], content_type.as_bytes()).unwrap();
    let cors =
        tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap();
    let cors_headers = tiny_http::Header::from_bytes(
        &b"Access-Control-Allow-Headers"[..],
        &b"Content-Type"[..],
    )
    .unwrap();
    let cors_methods = tiny_http::Header::from_bytes(
        &b"Access-Control-Allow-Methods"[..],
        &b"GET, POST, OPTIONS"[..],
    )
    .unwrap();

    tiny_http::Response::new(
        status,
        vec![ct, cors, cors_headers, cors_methods],
        std::io::Cursor::new(data),
        Some(data_len),
        None,
    )
}

fn build_cors_preflight() -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    build_response(204, "text/plain", &[])
}

// ---------------------------------------------------------------------------
// Sound data loading
// ---------------------------------------------------------------------------

fn load_sound_packs(catalog_packs: &[CatalogPack]) -> String {
    let index_json = match load_sound_pack_json("_index.json") {
        Some(j) => j,
        None => return "[]".to_string(),
    };

    let index: serde_json::Value = match serde_json::from_str(&index_json) {
        Ok(v) => v,
        Err(_) => return "[]".to_string(),
    };

    let mut sound_packs = Vec::new();

    if let Some(packs) = index.get("packs").and_then(|p| p.as_array()) {
        for pack_entry in packs {
            let id = pack_entry.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let filename = format!("{}.json", id);

            if let Some(pack_json) = load_sound_pack_json(&filename) {
                if let Ok(mut pack_data) = serde_json::from_str::<serde_json::Value>(&pack_json) {
                    // Check if the sound pack is downloaded
                    let downloaded = is_pack_downloaded(id);
                    pack_data
                        .as_object_mut()
                        .map(|o| o.insert("downloaded".to_string(), serde_json::Value::Bool(downloaded)));

                    // Find download URL from sprite catalog if not in sound pack
                    if pack_data.get("downloadUrl").is_none() {
                        if let Some(cp) = catalog_packs.iter().find(|p| p.id == id) {
                            pack_data.as_object_mut().map(|o| {
                                o.insert(
                                    "downloadUrl".to_string(),
                                    serde_json::Value::String(cp.download_url.clone()),
                                )
                            });
                        }
                    }

                    sound_packs.push(pack_data);
                }
            }
        }
    }

    serde_json::to_string(&sound_packs).unwrap_or_else(|_| "[]".to_string())
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

pub fn run(pack_id: Option<String>, sounds: bool, browser: Option<String>) -> Result<()> {
    let catalog_json = load_catalog_json();
    let catalog: Catalog = serde_json::from_str(&catalog_json)
        .map_err(|e| anyhow::anyhow!("Failed to parse catalog.json: {}", e))?;

    let cache = cache_dir();
    fs::create_dir_all(&cache)?;

    // If a specific pack was requested, download it first if needed
    if let Some(ref id) = pack_id {
        if !sounds && !is_pack_downloaded(id) {
            // Verify pack exists
            if !catalog.packs.iter().any(|p| p.id == *id) {
                anyhow::bail!("Pack '{}' not found in catalog", id);
            }
            eprintln!("[catalog] Pack '{}' not cached, downloading...", id);
            download_pack(id, &catalog.packs)
                .map_err(|e| anyhow::anyhow!("Download failed: {}", e))?;
        }
    }

    // Start server on auto-assigned port
    let server = tiny_http::Server::http("127.0.0.1:0")
        .map_err(|e| anyhow::anyhow!("Failed to start server: {}", e))?;

    let port = match server.server_addr() {
        tiny_http::ListenAddr::IP(addr) => addr.port(),
        _ => 0,
    };

    // Determine initial URL
    let url = if sounds {
        if let Some(ref id) = pack_id {
            format!("http://127.0.0.1:{}/sounds?pack={}", port, id)
        } else {
            format!("http://127.0.0.1:{}/sounds", port)
        }
    } else if let Some(ref id) = pack_id {
        format!("http://127.0.0.1:{}/pack/{}", port, id)
    } else {
        format!("http://127.0.0.1:{}", port)
    };

    eprintln!("[catalog] Listening on {}", url);

    // Open browser
    open_browser(&url, browser.as_deref());

    // Request loop
    for mut request in server.incoming_requests() {
        let url_str = request.url().to_string();
        let method = request.method().as_str().to_uppercase();

        // Read body for POST
        let body = if method == "POST" {
            let mut buf = String::new();
            let _ = request.as_reader().read_to_string(&mut buf);
            buf
        } else {
            String::new()
        };

        let path = url_str.split('?').next().unwrap_or(&url_str);

        let resp = match (method.as_str(), path) {
            ("OPTIONS", _) => build_cors_preflight(),

            ("GET", "/") => {
                let html = render_browse(&catalog.packs);
                respond_html(&html)
            }

            ("GET", "/sounds") => {
                let html = render_sounds(&catalog.packs);
                respond_html(&html)
            }

            ("GET", p) if p.starts_with("/pack/") => {
                let id = p.strip_prefix("/pack/").unwrap_or("");
                if is_pack_downloaded(id) {
                    if is_gallery_pack(id) {
                        let html = render_gallery(id, &catalog.packs);
                        respond_html(&html)
                    } else {
                        let html = render_sheet(id, &catalog.packs);
                        respond_html(&html)
                    }
                } else {
                    respond_404("Pack not found or not downloaded")
                }
            }

            ("GET", p) if p.starts_with("/pack-files/") => {
                let id = p.strip_prefix("/pack-files/").unwrap_or("");
                let files = list_pack_pngs(id);
                let json = serde_json::to_string(&files).unwrap_or_else(|_| "[]".to_string());
                respond_json(&json)
            }

            ("GET", p) if p.starts_with("/sprite/") => {
                let rest = p.strip_prefix("/sprite/").unwrap_or("");
                serve_sprite(rest)
            }

            ("GET", p) if p.starts_with("/audio/") => {
                let rest = p.strip_prefix("/audio/").unwrap_or("");
                serve_audio(rest)
            }

            ("POST", p) if p.starts_with("/download/") => {
                let id = p.strip_prefix("/download/").unwrap_or("");
                match download_pack(id, &catalog.packs) {
                    Ok(()) => respond_json("{\"success\":true}"),
                    Err(e) => {
                        let msg = serde_json::json!({"success": false, "error": e});
                        respond_json(&msg.to_string())
                    }
                }
            }

            ("POST", "/done") => {
                // Print the selection JSON to stdout
                println!("{}", body);
                let resp = respond_json("{\"ok\":true}");
                let _ = request.respond(resp);
                // Exit after a brief delay to let the response flush
                std::thread::sleep(std::time::Duration::from_millis(200));
                std::process::exit(0);
            }

            _ => respond_404("Not found"),
        };

        let _ = request.respond(resp);
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Template rendering
// ---------------------------------------------------------------------------

fn render_browse(packs: &[CatalogPack]) -> String {
    let pack_views: Vec<PackView> = packs
        .iter()
        .map(|p| {
            let downloaded = is_pack_downloaded(&p.id);
            let thumbnail_data = if downloaded {
                find_pack_image(&p.id)
                    .map(|path| image_to_base64(&path))
                    .unwrap_or_default()
            } else {
                String::new()
            };

            PackView {
                id: p.id.clone(),
                name: p.name.clone(),
                source: p.source.clone(),
                tile_size: p.tile_size,
                spacing: p.spacing,
                grid_offset: p.grid_offset.clone(),
                tags: p.tags.clone(),
                downloaded,
                thumbnail_data,
                download_url: String::new(),
            }
        })
        .collect();

    let packs_json = serde_json::to_string(&pack_views).unwrap_or_else(|_| "[]".to_string());

    let template = load_html_template("browse.html");
    template.replace("{{PACKS_JSON}}", &packs_json)
}

fn render_sheet(pack_id: &str, packs: &[CatalogPack]) -> String {
    let pack = match packs.iter().find(|p| p.id == pack_id) {
        Some(p) => p,
        None => return "Pack not found".to_string(),
    };

    let sheet_path = get_sheet_path(pack_id);
    let cache_path = cache_dir().join(pack_id);
    let image_path = cache_path.join(&sheet_path);
    let image_data = if image_path.exists() {
        image_to_base64(&image_path)
    } else {
        String::new()
    };

    let meta = PackMeta {
        id: pack.id.clone(),
        name: pack.name.clone(),
        source: pack.source.clone(),
        tile_size: pack.tile_size,
        spacing: pack.spacing,
        grid_offset: pack.grid_offset.clone(),
        sheet_path,
        cache_path: cache_path.to_string_lossy().to_string(),
    };

    let meta_json = serde_json::to_string(&meta).unwrap_or_else(|_| "{}".to_string());

    let template = load_html_template("sheet.html");
    template
        .replace("{{PACK_META_JSON}}", &meta_json)
        .replace("{{IMAGE_DATA}}", &image_data)
}

fn render_gallery(pack_id: &str, packs: &[CatalogPack]) -> String {
    let pack = match packs.iter().find(|p| p.id == pack_id) {
        Some(p) => p,
        None => return "Pack not found".to_string(),
    };

    let sprites = scan_individual_sprites(pack_id);
    let cache_path = cache_dir().join(pack_id);

    let meta = serde_json::json!({
        "id": pack.id,
        "name": pack.name,
        "source": pack.source,
        "cachePath": cache_path.to_string_lossy(),
    });

    let sprites_json = serde_json::to_string(&sprites).unwrap_or_else(|_| "[]".to_string());
    let meta_json = meta.to_string();

    let template = load_html_template("gallery.html");
    template
        .replace("{{PACK_META_JSON}}", &meta_json)
        .replace("{{SPRITES_JSON}}", &sprites_json)
}

fn render_sounds(packs: &[CatalogPack]) -> String {
    let sound_packs_json = load_sound_packs(packs);

    let template = load_html_template("sounds.html");
    template.replace("{{SOUND_PACKS_JSON}}", &sound_packs_json)
}

// ---------------------------------------------------------------------------
// File serving
// ---------------------------------------------------------------------------

fn serve_sprite(path: &str) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    // path is "{packId}/{relativePath...}"
    let (pack_id, relative) = match path.find('/') {
        Some(idx) => (&path[..idx], &path[idx + 1..]),
        None => return respond_404("Invalid sprite path"),
    };

    let decoded = urlencoding_decode(relative);
    let file_path = cache_dir().join(pack_id).join(&decoded);

    respond_file(&file_path)
}

fn serve_audio(path: &str) -> tiny_http::Response<std::io::Cursor<Vec<u8>>> {
    let (pack_id, relative) = match path.find('/') {
        Some(idx) => (&path[..idx], &path[idx + 1..]),
        None => return respond_404("Invalid audio path"),
    };

    let decoded = urlencoding_decode(relative);
    let file_path = cache_dir().join(pack_id).join(&decoded);

    respond_file(&file_path)
}

/// Simple percent-decoding for URL paths
fn urlencoding_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.bytes();

    while let Some(b) = chars.next() {
        if b == b'%' {
            let h = chars.next().unwrap_or(b'0');
            let l = chars.next().unwrap_or(b'0');
            let byte = hex_val(h) * 16 + hex_val(l);
            result.push(byte as char);
        } else if b == b'+' {
            result.push(' ');
        } else {
            result.push(b as char);
        }
    }

    result
}

fn hex_val(b: u8) -> u8 {
    match b {
        b'0'..=b'9' => b - b'0',
        b'a'..=b'f' => b - b'a' + 10,
        b'A'..=b'F' => b - b'A' + 10,
        _ => 0,
    }
}

// ---------------------------------------------------------------------------
// Browser opening
// ---------------------------------------------------------------------------

fn open_browser(url: &str, browser: Option<&str>) {
    let result = match browser {
        Some(app) if cfg!(target_os = "macos") => {
            Command::new("open").args(["-a", app, url]).status()
        }
        Some(app) => Command::new(app).arg(url).status(),
        None if cfg!(target_os = "macos") => Command::new("open").arg(url).status(),
        None if cfg!(target_os = "windows") => {
            Command::new("cmd").args(["/C", "start", url]).status()
        }
        None => Command::new("xdg-open").arg(url).status(),
    };

    if let Err(e) = result {
        eprintln!("[catalog] Could not open browser: {}. Open {} manually.", e, url);
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn urlencoding_decode_basic() {
        assert_eq!(urlencoding_decode("hello%20world"), "hello world");
        assert_eq!(urlencoding_decode("foo/bar"), "foo/bar");
        assert_eq!(urlencoding_decode("a%2Fb"), "a/b");
    }

    #[test]
    fn hex_val_works() {
        assert_eq!(hex_val(b'0'), 0);
        assert_eq!(hex_val(b'9'), 9);
        assert_eq!(hex_val(b'a'), 10);
        assert_eq!(hex_val(b'f'), 15);
        assert_eq!(hex_val(b'A'), 10);
        assert_eq!(hex_val(b'F'), 15);
    }

    #[test]
    fn cache_dir_is_valid() {
        let dir = cache_dir();
        assert!(dir.to_string_lossy().contains("arcane"));
        assert!(dir.to_string_lossy().contains("packs"));
    }
}
