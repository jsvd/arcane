use anyhow::{bail, Context, Result};
use std::fs;
use std::path::{Path, PathBuf};

/// Find the `recipes/` directory, trying multiple sources in order:
/// 1. node_modules/@arcane-engine/runtime/recipes/ (npm install)
/// 2. Repo layout: walk up from CWD looking for recipes/ with recipe.json subdirs
/// 3. Relative to binary (dev builds)
fn find_recipes_dir() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;

    // 1. node_modules (preferred — always up to date via npm)
    let nm_path = cwd.join("node_modules/@arcane-engine/runtime/recipes");
    if is_recipes_dir(&nm_path) {
        return Some(nm_path);
    }

    // 2. Walk up from CWD looking for a repo-level recipes/ dir
    let mut dir = cwd.as_path();
    loop {
        let candidate = dir.join("recipes");
        if is_recipes_dir(&candidate) {
            return Some(candidate);
        }
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    // 3. Relative to binary
    if let Ok(exe) = std::env::current_exe() {
        let mut dir_opt = exe.parent();
        while let Some(d) = dir_opt {
            let candidate = d.join("recipes");
            if is_recipes_dir(&candidate) {
                return Some(candidate);
            }
            dir_opt = d.parent();
        }
    }

    None
}

/// Check if a directory looks like a recipes directory (has subdirs with recipe.json).
fn is_recipes_dir(path: &Path) -> bool {
    path.is_dir()
        && fs::read_dir(path).ok().map_or(false, |mut entries| {
            entries.any(|e| {
                e.ok()
                    .map_or(false, |e| e.path().join("recipe.json").exists())
            })
        })
}

/// Parse recipe.json metadata from content string.
fn parse_recipe_meta(content: &str) -> Result<(String, String, Vec<String>)> {
    let v: serde_json::Value = serde_json::from_str(content)?;
    let name = v["name"].as_str().unwrap_or("unknown").to_string();
    let description = v["description"].as_str().unwrap_or("").to_string();
    let files: Vec<String> = v["files"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|f| f.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    Ok((name, description, files))
}

/// Read recipe.json metadata from a filesystem directory.
fn read_recipe_meta(dir: &Path) -> Result<(String, String, Vec<String>)> {
    let meta_path = dir.join("recipe.json");
    let content = fs::read_to_string(&meta_path)
        .with_context(|| format!("Failed to read {}", meta_path.display()))?;
    parse_recipe_meta(&content)
}

/// List all available recipes.
pub fn list_recipes() -> Result<()> {
    let recipes_dir = match find_recipes_dir() {
        Some(dir) => dir,
        None => {
            println!("No recipes found.");
            println!(
                "\nMake sure @arcane-engine/runtime is installed: npm install @arcane-engine/runtime"
            );
            return Ok(());
        }
    };

    let mut entries: Vec<_> = fs::read_dir(&recipes_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter(|e| e.path().join("recipe.json").exists())
        .collect();
    entries.sort_by_key(|e| e.file_name());

    if entries.is_empty() {
        println!("No recipes found in {}", recipes_dir.display());
        return Ok(());
    }

    println!("Available recipes:\n");
    for entry in &entries {
        let dir = entry.path();
        if let Ok((name, desc, _)) = read_recipe_meta(&dir) {
            println!("  {:<24} {}", name, desc);
        }
    }
    println!("\nUsage: arcane add <recipe-name>");
    Ok(())
}

/// Copy a recipe into the current project.
pub fn add_recipe(name: &str) -> Result<()> {
    let recipes_dir = find_recipes_dir().with_context(|| {
        format!(
            "Cannot find recipes directory. Make sure @arcane-engine/runtime is installed:\n  npm install @arcane-engine/runtime"
        )
    })?;

    let source_dir = recipes_dir.join(name);

    if !source_dir.exists() || !source_dir.join("recipe.json").exists() {
        bail!(
            "Recipe \"{}\" not found. Run `arcane add --list` to see available recipes.",
            name
        );
    }

    let (recipe_name, _desc, files) = read_recipe_meta(&source_dir)?;
    let dest_dir = std::env::current_dir()?.join("recipes").join(&recipe_name);

    if dest_dir.exists() {
        bail!(
            "Directory {} already exists. Remove it first to re-add the recipe.",
            dest_dir.display()
        );
    }

    fs::create_dir_all(&dest_dir)?;

    // Copy recipe.json
    fs::copy(source_dir.join("recipe.json"), dest_dir.join("recipe.json"))?;

    // Copy listed files
    for file in &files {
        let src = source_dir.join(file);
        if src.exists() {
            fs::copy(&src, dest_dir.join(file))?;
        }
    }

    println!("Added recipe \"{}\" to {}", recipe_name, dest_dir.display());
    println!("\nImport it in your TypeScript code:");
    println!(
        "  import {{ ... }} from \"./recipes/{}/index.ts\";",
        recipe_name
    );
    Ok(())
}

/// Entry point for the `arcane add` command.
pub fn run(name: Option<String>, list: bool) -> Result<()> {
    if list {
        return list_recipes();
    }

    match name {
        Some(n) => add_recipe(&n),
        None => {
            println!("Usage: arcane add <recipe-name>");
            println!("       arcane add --list");
            Ok(())
        }
    }
}
