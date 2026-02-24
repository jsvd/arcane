use std::path::PathBuf;

use super::type_check;

/// Run type checking only (no tests). Fast feedback for edit workflows.
pub fn run(path: Option<String>) -> anyhow::Result<()> {
    let root = path
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().expect("cannot read current directory"));

    // Find the entry file
    let entry = if root.is_file() {
        root
    } else {
        // Try common entry points
        let candidates = ["src/visual.ts", "src/main.ts", "src/index.ts", "main.ts"];
        candidates
            .iter()
            .map(|c| root.join(c))
            .find(|p| p.exists())
            .unwrap_or_else(|| root.join("src/visual.ts"))
    };

    type_check::check_types(&entry)?;
    Ok(())
}
