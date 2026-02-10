use anyhow::{Context, Result};
use arcane_core::scripting::ArcaneRuntime;

use super::type_check;

/// Run the `arcane inspect` command: load a game entry file headless and
/// inspect the game state at a given path.
pub fn run(entry: String, path: String) -> Result<()> {
    let entry_path = std::fs::canonicalize(&entry)
        .with_context(|| format!("Cannot find entry file: {entry}"))?;

    // Type check before running
    if !type_check::should_skip_type_check() {
        type_check::check_types(&entry_path)?;
    }

    let mut runtime = ArcaneRuntime::new();

    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    rt.block_on(async {
        runtime.execute_file(&entry_path).await
    })?;

    let eval_source = format!(
        "JSON.stringify(globalThis.__arcaneAgent?.inspect('{path}'), null, 2) ?? 'null'"
    );

    let result = runtime.eval_to_string(&eval_source)?;
    println!("{result}");

    Ok(())
}
