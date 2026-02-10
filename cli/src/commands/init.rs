use anyhow::{bail, Context, Result};
use std::fs;
use std::path::{Path, PathBuf};

/// Find the template directory by walking up from the binary location.
fn find_template_dir() -> Result<PathBuf> {
    // Start from the executable's directory
    let exe = std::env::current_exe().context("Cannot determine executable path")?;
    let mut search_dir = exe
        .parent()
        .context("Executable has no parent directory")?
        .to_path_buf();

    loop {
        let candidate = search_dir.join("templates").join("default");
        if candidate.exists() && candidate.join("package.json").exists() {
            return Ok(candidate);
        }

        match search_dir.parent() {
            Some(parent) => search_dir = parent.to_path_buf(),
            None => break,
        }
    }

    bail!("Could not find templates/default directory")
}

/// Copy a file or directory recursively, replacing {{PROJECT_NAME}} with the actual name.
fn copy_with_replacement(src: &Path, dest: &Path, project_name: &str) -> Result<()> {
    if src.is_dir() {
        fs::create_dir_all(dest)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let src_path = entry.path();
            let file_name = entry.file_name();
            let dest_path = dest.join(&file_name);
            copy_with_replacement(&src_path, &dest_path, project_name)?;
        }
    } else {
        let content = fs::read_to_string(src)?;
        let replaced = content.replace("{{PROJECT_NAME}}", project_name);
        fs::write(dest, replaced)?;

        // Preserve executable permissions if set
        #[cfg(unix)]
        {
            let metadata = fs::metadata(src)?;
            let permissions = metadata.permissions();
            fs::set_permissions(dest, permissions)?;
        }
    }
    Ok(())
}

/// Initialize an Arcane project in the current directory.
pub fn run() -> Result<()> {
    let current_dir = std::env::current_dir()?;
    let project_name = current_dir
        .file_name()
        .and_then(|n| n.to_str())
        .context("Cannot determine current directory name")?;

    // Check if directory already has Arcane files
    if current_dir.join("package.json").exists() {
        bail!(
            "Directory already contains package.json. Remove it first or use `arcane new` to create a fresh project."
        );
    }

    if current_dir.join("src").exists() {
        bail!(
            "Directory already contains src/. Remove it first or use `arcane new` to create a fresh project."
        );
    }

    let template_dir = find_template_dir()?;

    println!("Initializing Arcane project \"{}\"...", project_name);

    // Copy template files into current directory
    for entry in fs::read_dir(&template_dir)? {
        let entry = entry?;
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dest_path = current_dir.join(&file_name);

        copy_with_replacement(&src_path, &dest_path, project_name)?;
    }

    println!("\n✓ Created Arcane project \"{}\"", project_name);
    println!("\nNext steps:");
    println!("  arcane dev              # Run with hot-reload (defaults to src/visual.ts)");
    println!("  arcane test             # Run tests");
    println!("  arcane add --list       # See available recipes");

    Ok(())
}
