use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

fn copy_dir_recursive(src: &Path, dst: &Path, hasher: &mut DefaultHasher) {
    fs::create_dir_all(dst).unwrap();
    let mut entries: Vec<_> = fs::read_dir(src).unwrap().map(|e| e.unwrap()).collect();
    entries.sort_by_key(|e| e.file_name());
    for entry in entries {
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path, hasher);
        } else {
            let content = fs::read(&src_path).unwrap();
            content.len().hash(hasher);
            src_path.to_string_lossy().hash(hasher);
            fs::copy(&src_path, &dst_path).unwrap();
        }
    }
}

fn copy_dir_filtered(src: &Path, dst: &Path, hasher: &mut DefaultHasher) {
    fs::create_dir_all(dst).unwrap();
    let mut entries: Vec<_> = fs::read_dir(src).unwrap().map(|e| e.unwrap()).collect();
    entries.sort_by_key(|e| e.file_name());
    for entry in entries {
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_filtered(&src_path, &dst_path, hasher);
        } else {
            // Skip test files — they shouldn't ship in user projects
            if src_path.extension().map_or(false, |ext| ext == "ts") {
                if let Some(name) = src_path.file_name().and_then(|n| n.to_str()) {
                    if name.ends_with(".test.ts") {
                        continue;
                    }
                }
            }
            let content = fs::read(&src_path).unwrap();
            content.len().hash(hasher);
            src_path.to_string_lossy().hash(hasher);
            fs::copy(&src_path, &dst_path).unwrap();
        }
    }
}

fn find_dir(name: &str) -> PathBuf {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());

    // Repo layout: cli/../<name> (e.g. ../templates/default, ../recipes)
    let repo_path = manifest_dir.join("..").join(name);
    if repo_path.exists() {
        return repo_path;
    }

    // Published crate: cli/data/<name>
    let data_path = manifest_dir.join("data").join(name);
    if data_path.exists() {
        return data_path;
    }

    panic!(
        "Cannot find {} directory. Looked at:\n  {}\n  {}",
        name,
        repo_path.display(),
        data_path.display()
    );
}

fn clean_dir(dir: &Path) {
    if dir.exists() {
        fs::remove_dir_all(dir).unwrap();
    }
}

/// When building from the repo, auto-sync cli/data/ from canonical sources.
/// This ensures `cargo publish` always packages fresh templates/recipes/assets,
/// eliminating the manual sync step that caused stale scaffolds to ship.
fn auto_sync_data_dir(manifest_dir: &Path) {
    let repo_root = manifest_dir.join("..");

    // Only sync when canonical sources exist (repo checkout, not published crate)
    let templates_src = repo_root.join("templates").join("default");
    let recipes_src = repo_root.join("recipes");
    let assets_src = repo_root.join("assets");

    if !templates_src.exists() || !recipes_src.exists() || !assets_src.exists() {
        return; // Published crate — cli/data/ already populated by cargo package
    }

    let data_dir = manifest_dir.join("data");

    // Wipe and re-copy to avoid stale files
    clean_dir(&data_dir);

    let mut dummy = DefaultHasher::new();
    let templates_dst = data_dir.join("templates").join("default");
    copy_dir_recursive(&templates_src, &templates_dst, &mut dummy);

    let recipes_dst = data_dir.join("recipes");
    copy_dir_recursive(&recipes_src, &recipes_dst, &mut dummy);

    let assets_dst = data_dir.join("assets");
    copy_dir_recursive(&assets_src, &assets_dst, &mut dummy);

    let runtime_src = repo_root.join("runtime");
    let runtime_dst = data_dir.join("runtime");
    // Use a separate dummy hasher just for the filter function
    let mut filter_hasher = DefaultHasher::new();
    copy_dir_filtered(&runtime_src, &runtime_dst, &mut filter_hasher);
}

fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let mut hasher = DefaultHasher::new();

    // Auto-sync cli/data/ from canonical repo sources so `cargo publish`
    // always packages fresh templates/recipes/assets. This eliminates the
    // manual sync step that caused stale scaffolds to ship.
    auto_sync_data_dir(&manifest_dir);

    // Clean before copying to prevent stale artifacts from prior builds
    let templates_dst = out_dir.join("templates");
    clean_dir(&templates_dst);
    let templates_src = find_dir("templates/default");
    copy_dir_recursive(&templates_src, &templates_dst.join("default"), &mut hasher);

    let assets_dst = out_dir.join("assets");
    clean_dir(&assets_dst);
    let assets_src = find_dir("assets");
    copy_dir_recursive(&assets_src, &assets_dst, &mut hasher);

    // Embed runtime (filtered: no test files)
    let runtime_dst = out_dir.join("runtime");
    clean_dir(&runtime_dst);
    let runtime_src = find_dir("runtime");
    copy_dir_filtered(&runtime_src, &runtime_dst, &mut hasher);

    // Embed recipes
    let recipes_dst = out_dir.join("recipes");
    clean_dir(&recipes_dst);
    let recipes_src = find_dir("recipes");
    copy_dir_recursive(&recipes_src, &recipes_dst, &mut hasher);

    // Write a stamp file that new.rs includes via include_str!().
    // When template contents change, this hash changes, forcing cargo
    // to recompile new.rs (which contains the include_dir! macro).
    let stamp = format!("{}", hasher.finish());
    fs::write(out_dir.join("template_stamp.txt"), stamp).unwrap();

    // Don't emit cargo:rerun-if-changed — let build.rs always re-run.
    // This ensures the OUT_DIR is always clean and the template_stamp.txt
    // is always fresh, preventing stale include_dir! data from being cached.
}
