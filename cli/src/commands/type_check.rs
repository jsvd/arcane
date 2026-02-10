use anyhow::{bail, Context, Result};
use std::path::Path;
use std::process::Command;

/// Run TypeScript type checking on an entry file.
/// Returns Ok(()) if types are valid, Err if type errors exist.
pub fn check_types(entry_path: &Path) -> Result<()> {
    // First, check if tsc is available
    let tsc_check = Command::new("tsc").arg("--version").output();

    if tsc_check.is_err() {
        eprintln!("[type-check] Warning: tsc not found, skipping type check");
        eprintln!("[type-check] Install TypeScript: npm install -g typescript");
        return Ok(()); // Don't block if tsc isn't installed
    }

    let project_root = entry_path
        .parent()
        .with_context(|| "Cannot determine project directory")?;

    // Look for tsconfig.json in the project directory or parent directories
    let tsconfig_path = find_tsconfig(project_root);

    eprintln!("[type-check] Running TypeScript type checker...");

    let mut cmd = Command::new("tsc");
    cmd.arg("--noEmit")
        .arg("--pretty")
        .current_dir(project_root);

    // If we found a tsconfig, don't need to specify the file
    // Otherwise, add common flags for Deno-style TS
    if tsconfig_path.is_none() {
        cmd.arg("--target").arg("ES2020")
            .arg("--lib").arg("ES2020,DOM")
            .arg("--module").arg("ESNext")
            .arg("--moduleResolution").arg("node")
            .arg("--allowImportingTsExtensions")
            .arg("--skipLibCheck")
            .arg(entry_path);
    }

    let output = cmd.output().with_context(|| "Failed to run tsc")?;

    if !output.status.success() {
        eprintln!("{}", String::from_utf8_lossy(&output.stdout));
        eprintln!("{}", String::from_utf8_lossy(&output.stderr));
        bail!(
            "\n❌ Type checking failed!\n\
            Fix the type errors above before running.\n\
            \n\
            To skip type checking (not recommended):\n\
            export ARCANE_SKIP_TYPE_CHECK=1"
        );
    }

    eprintln!("[type-check] ✅ No type errors found");
    Ok(())
}

/// Find tsconfig.json by walking up from the project directory
fn find_tsconfig(start_dir: &Path) -> Option<std::path::PathBuf> {
    let mut current = start_dir;
    loop {
        let tsconfig = current.join("tsconfig.json");
        if tsconfig.exists() {
            return Some(tsconfig);
        }
        current = current.parent()?;
    }
}

/// Check if type checking should be skipped (env var override)
pub fn should_skip_type_check() -> bool {
    std::env::var("ARCANE_SKIP_TYPE_CHECK").is_ok()
}
