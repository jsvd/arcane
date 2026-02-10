use anyhow::{bail, Context, Result};
use include_dir::{include_dir, Dir};
use std::fs;
use std::path::{Path, PathBuf};

static RECIPES_DIR: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../recipes");

/// Find the `recipes/` directory on the filesystem (for dev-from-repo).
/// Returns None when running from a standalone install.
fn find_recipes_dir() -> Option<PathBuf> {
    // Try CWD first, walking up
    let cwd = std::env::current_dir().ok()?;
    let mut dir = cwd.as_path();
    loop {
        let candidate = dir.join("recipes");
        if candidate.is_dir() {
            // Verify it's an engine recipes dir (has subdirs with recipe.json)
            if fs::read_dir(&candidate).ok().map_or(false, |mut entries| {
                entries.any(|e| {
                    e.ok()
                        .map_or(false, |e| e.path().join("recipe.json").exists())
                })
            }) {
                return Some(candidate);
            }
        }
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    // Try relative to the binary
    if let Ok(exe) = std::env::current_exe() {
        let mut dir_opt = exe.parent();
        while let Some(d) = dir_opt {
            let candidate = d.join("recipes");
            if candidate.is_dir() {
                return Some(candidate);
            }
            dir_opt = d.parent();
        }
    }

    None
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

/// List all available recipes from filesystem.
fn list_recipes_fs(recipes_dir: &Path) -> Result<()> {
    let mut entries: Vec<_> = fs::read_dir(recipes_dir)?
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

/// List all available recipes from embedded data.
fn list_recipes_embedded() -> Result<()> {
    let mut recipes: Vec<(String, String)> = Vec::new();

    for subdir in RECIPES_DIR.dirs() {
        let recipe_json_path = subdir.path().join("recipe.json");
        if let Some(file) = RECIPES_DIR.get_file(&recipe_json_path) {
            if let Some(content) = file.contents_utf8() {
                if let Ok((name, desc, _)) = parse_recipe_meta(content) {
                    recipes.push((name, desc));
                }
            }
        }
    }

    if recipes.is_empty() {
        println!("No recipes found.");
        return Ok(());
    }

    recipes.sort_by(|a, b| a.0.cmp(&b.0));

    println!("Available recipes:\n");
    for (name, desc) in &recipes {
        println!("  {:<24} {}", name, desc);
    }
    println!("\nUsage: arcane add <recipe-name>");
    Ok(())
}

/// List all available recipes.
pub fn list_recipes() -> Result<()> {
    match find_recipes_dir() {
        Some(dir) => list_recipes_fs(&dir),
        None => list_recipes_embedded(),
    }
}

/// Copy a recipe from filesystem into the current project.
fn add_recipe_fs(name: &str, recipes_dir: &Path) -> Result<()> {
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

/// Copy a recipe from embedded data into the current project.
fn add_recipe_embedded(name: &str) -> Result<()> {
    let _recipe_dir = RECIPES_DIR.get_dir(name).with_context(|| {
        format!(
            "Recipe \"{}\" not found. Run `arcane add --list` to see available recipes.",
            name
        )
    })?;

    let recipe_json_path = Path::new(name).join("recipe.json");
    let recipe_json = RECIPES_DIR
        .get_file(&recipe_json_path)
        .context("Recipe missing recipe.json")?;
    let content = recipe_json
        .contents_utf8()
        .context("recipe.json not valid UTF-8")?;
    let (recipe_name, _desc, files) = parse_recipe_meta(content)?;

    let dest_dir = std::env::current_dir()?.join("recipes").join(&recipe_name);

    if dest_dir.exists() {
        bail!(
            "Directory {} already exists. Remove it first to re-add the recipe.",
            dest_dir.display()
        );
    }

    fs::create_dir_all(&dest_dir)?;

    // Copy recipe.json
    fs::write(dest_dir.join("recipe.json"), recipe_json.contents())?;

    // Copy listed files
    for file_name in &files {
        let file_path = Path::new(name).join(file_name);
        if let Some(file) = RECIPES_DIR.get_file(&file_path) {
            fs::write(dest_dir.join(file_name), file.contents())?;
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

/// Copy a recipe into the current project.
pub fn add_recipe(name: &str) -> Result<()> {
    match find_recipes_dir() {
        Some(dir) => add_recipe_fs(name, &dir),
        None => add_recipe_embedded(name),
    }
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
