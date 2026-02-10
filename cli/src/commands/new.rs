use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};

/// Create a new Arcane project from template
pub fn run(name: &str) -> Result<()> {
    let project_dir = PathBuf::from(name);

    // Check if directory already exists
    if project_dir.exists() {
        anyhow::bail!("Directory '{}' already exists", name);
    }

    // Find template directory (relative to binary location or embedded)
    let template_dir = find_template_dir()?;

    // Copy template to new directory
    println!("Creating new Arcane project: {}", name);
    copy_template(&template_dir, &project_dir, name)?;

    println!("✓ Created {}/", name);
    println!();
    println!("Next steps:");
    println!("  cd {}", name);
    println!("  npm install");
    println!("  arcane dev");
    println!();
    println!("Happy game building! 🎮");

    Ok(())
}

/// Find the template directory
fn find_template_dir() -> Result<PathBuf> {
    // Try to find templates directory relative to the binary
    // This works when running from the repo or when templates are installed alongside the binary
    let exe_path = std::env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .context("Failed to get executable directory")?;

    // Try several possible locations
    let candidates = vec![
        exe_dir.join("../templates/default"),           // Installed location
        exe_dir.join("../../templates/default"),        // cargo run location
        exe_dir.join("../../../templates/default"),     // cargo build target location
        PathBuf::from("templates/default"),             // CWD (development)
    ];

    for candidate in candidates {
        if candidate.exists() && candidate.join("package.json").exists() {
            return Ok(candidate);
        }
    }

    anyhow::bail!(
        "Could not find template directory. Please ensure Arcane is properly installed."
    )
}

/// Recursively copy template directory, replacing template variables
fn copy_template(src: &Path, dst: &Path, project_name: &str) -> Result<()> {
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if src_path.is_dir() {
            // Recursively copy directories
            copy_template(&src_path, &dst_path, project_name)?;
        } else {
            // Copy and process file
            copy_file(&src_path, &dst_path, project_name)?;
        }
    }

    Ok(())
}

/// Copy a single file, replacing template variables
fn copy_file(src: &Path, dst: &Path, project_name: &str) -> Result<()> {
    let content = fs::read_to_string(src).with_context(|| {
        format!("Failed to read template file: {}", src.display())
    })?;

    // Replace template variables
    let processed = content.replace("{{PROJECT_NAME}}", project_name);

    fs::write(dst, processed).with_context(|| {
        format!("Failed to write file: {}", dst.display())
    })?;

    // Preserve executable permissions on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let src_metadata = fs::metadata(src)?;
        let mut permissions = fs::metadata(dst)?.permissions();
        permissions.set_mode(src_metadata.permissions().mode());
        fs::set_permissions(dst, permissions)?;
    }

    Ok(())
}
