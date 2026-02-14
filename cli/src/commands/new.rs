use anyhow::{Context, Result};
use include_dir::{include_dir, Dir};
use std::fs;
use std::path::{Path, PathBuf};

pub(crate) static TEMPLATE_DIR: Dir<'static> =
    include_dir!("$OUT_DIR/templates/default");

// Force recompilation when template contents change (build.rs writes this stamp)
const _TEMPLATE_STAMP: &str = include_str!(concat!(env!("OUT_DIR"), "/template_stamp.txt"));

/// Create a new Arcane project from template
pub fn run(name: &str) -> Result<()> {
    let project_dir = PathBuf::from(name);

    // Check if directory already exists
    if project_dir.exists() {
        anyhow::bail!("Directory '{}' already exists", name);
    }

    println!("Creating new Arcane project: {}", name);

    // Try filesystem first (dev-from-repo), fall back to embedded templates
    match find_template_dir() {
        Some(template_dir) => copy_template_fs(&template_dir, &project_dir, name)?,
        None => copy_template_embedded(&TEMPLATE_DIR, &project_dir, name)?,
    }

    println!("✓ Created {}/", name);
    println!();
    println!("Next steps:");
    println!("  cd {}", name);
    println!("  npm install");
    println!("  arcane dev");
    println!();
    println!("MCP auto-configured for Claude Code, Cursor, and VS Code.");
    println!("AI tools will discover your game engine automatically.");    println!();
    println!("Read AGENTS.md for LLM development guide.");
    println!("Full API reference in types/arcane.d.ts.");
    println!();
    println!("Happy game building! 🎮");

    Ok(())
}

/// Try to find the template directory on the filesystem (for dev-from-repo).
/// Returns None when running from a standalone install.
pub(crate) fn find_template_dir() -> Option<PathBuf> {
    // Walk up from executable location
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.parent().map(|p| p.to_path_buf());
        while let Some(d) = dir {
            let candidate = d.join("templates").join("default");
            if candidate.exists() && candidate.join("package.json").exists() {
                return Some(candidate);
            }
            dir = d.parent().map(|p| p.to_path_buf());
        }
    }

    // Try CWD
    let candidate = PathBuf::from("templates").join("default");
    if candidate.exists() && candidate.join("package.json").exists() {
        return Some(candidate);
    }

    None
}

/// Copy template from filesystem (dev-from-repo path).
fn copy_template_fs(src: &Path, dst: &Path, project_name: &str) -> Result<()> {
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if src_path.is_dir() {
            copy_template_fs(&src_path, &dst_path, project_name)?;
        } else {
            let content = fs::read_to_string(&src_path).with_context(|| {
                format!("Failed to read template file: {}", src_path.display())
            })?;
            let processed = content.replace("{{PROJECT_NAME}}", project_name);
            fs::write(&dst_path, processed)?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let src_metadata = fs::metadata(&src_path)?;
                let mut permissions = fs::metadata(&dst_path)?.permissions();
                permissions.set_mode(src_metadata.permissions().mode());
                fs::set_permissions(&dst_path, permissions)?;
            }
        }
    }

    Ok(())
}

/// Copy template from embedded data (standalone install path).
/// Recursively writes all files from the embedded directory, replacing {{PROJECT_NAME}}.
pub(crate) fn copy_template_embedded(
    dir: &Dir<'_>,
    dst: &Path,
    project_name: &str,
) -> Result<()> {
    fs::create_dir_all(dst)?;

    for file in dir.files() {
        let file_path = file.path();
        // Skip files under a stale "default/" prefix (build cache artifact)
        if file_path.starts_with("default") {
            continue;
        }
        let dst_path = dst.join(file_path);
        if let Some(parent) = dst_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let content = file
            .contents_utf8()
            .with_context(|| format!("Template file not valid UTF-8: {:?}", file_path))?;
        let processed = content.replace("{{PROJECT_NAME}}", project_name);
        fs::write(&dst_path, processed)?;
    }

    for subdir in dir.dirs() {
        // Skip a stale "default" subdirectory (build cache artifact from include_dir)
        if subdir.path() == Path::new("default") {
            continue;
        }
        copy_template_embedded(subdir, dst, project_name)?;
    }

    Ok(())
}
