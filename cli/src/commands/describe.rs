use anyhow::{Context, Result};
use arcane_engine::scripting::ArcaneRuntime;

use super::type_check;

/// Run the `arcane describe` command: load a game entry file headless and
/// call its agent describe function.
pub fn run(entry: String, verbosity: Option<String>) -> Result<()> {
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

    let verbosity_arg = verbosity
        .map(|v| format!("'{v}'"))
        .unwrap_or_else(|| "undefined".to_string());

    let eval_source = format!(
        "globalThis.__arcaneAgent?.describe({{ verbosity: {verbosity_arg} }}) ?? 'No agent registered.'"
    );

    let result = runtime.eval_to_string(&eval_source)?;
    println!("{result}");

    Ok(())
}
