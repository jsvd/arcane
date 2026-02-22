pub mod test;
pub mod dev;
pub mod describe;
pub mod inspect;
pub mod add;
pub mod type_check;
pub mod new;
pub mod init;
pub mod mcp_bridge;
use std::path::Path;
use arcane_core::scripting::ImportMap;

/// Create an import map for resolving @arcane/runtime imports to the actual runtime files.
/// Used by dev, test, describe, and inspect commands.
pub fn create_import_map(base_dir: &Path) -> ImportMap {
    let mut import_map = ImportMap::new();

    // Find the arcane runtime directory by walking up from entry file dir
    let mut search_dir = base_dir.to_path_buf();
    let runtime_dir = loop {
        // Check for runtime/ with state/ subdir
        let candidate = search_dir.join("runtime");
        if candidate.exists() && candidate.join("state").exists() {
            break Some(candidate);
        }

        // Try going up one level
        if let Some(parent) = search_dir.parent() {
            search_dir = parent.to_path_buf();
        } else {
            break None;
        }
    };

    if let Some(runtime_path) = runtime_dir {
        // Convert to absolute path and then to file URL
        let runtime_abs = runtime_path.canonicalize().unwrap_or(runtime_path);
        let runtime_url = format!("file://{}/", runtime_abs.display());

        let subpaths = [
            "state",
            "rendering",
            "ui",
            "physics",
            "pathfinding",
            "systems",
            "agent",
            "testing",
            "tweening",
            "particles",
            "scenes",
            "persistence",
            "procgen",
            "input",
            "game",
        ];

        // Register mappings for both @arcane/runtime and @arcane-engine/runtime
        for prefix in ["@arcane/runtime", "@arcane-engine/runtime"] {
            import_map.add(format!("{}/", prefix), runtime_url.clone());
            import_map.add(
                prefix.to_string(),
                format!("{}index.ts", runtime_url),
            );
            for subpath in &subpaths {
                // testing has harness.ts instead of index.ts
                let entry = if *subpath == "testing" { "harness.ts" } else { "index.ts" };
                import_map.add(
                    format!("{}/{}", prefix, subpath),
                    format!("{}{}/{}", runtime_url, subpath, entry),
                );
            }
        }
    }

    import_map
}
