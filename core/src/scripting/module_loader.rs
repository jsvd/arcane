use deno_ast::MediaType;
use deno_ast::ParseParams;
use deno_ast::TranspileModuleOptions;
use deno_core::ModuleLoadResponse;
use deno_core::ModuleLoader;
use deno_core::ModuleSourceCode;
use deno_core::ModuleSpecifier;
use deno_error::JsErrorBox;

/// Loads `.ts` and `.js` files from the filesystem.
/// TypeScript files are transpiled via `deno_ast` (type stripping).
/// JavaScript files pass through unchanged.
pub struct TsModuleLoader;

impl ModuleLoader for TsModuleLoader {
    fn resolve(
        &self,
        specifier: &str,
        referrer: &str,
        _kind: deno_core::ResolutionKind,
    ) -> Result<ModuleSpecifier, deno_core::error::ModuleLoaderError> {
        deno_core::resolve_import(specifier, referrer).map_err(JsErrorBox::from_err)
    }

    fn load(
        &self,
        module_specifier: &ModuleSpecifier,
        _maybe_referrer: Option<&deno_core::ModuleLoadReferrer>,
        _options: deno_core::ModuleLoadOptions,
    ) -> ModuleLoadResponse {
        let module_specifier = module_specifier.clone();

        ModuleLoadResponse::Sync(load_module(&module_specifier))
    }
}

fn load_module(
    specifier: &ModuleSpecifier,
) -> Result<deno_core::ModuleSource, deno_core::error::ModuleLoaderError> {
    let path = specifier.to_file_path().map_err(|_| {
        JsErrorBox::generic(format!(
            "Cannot convert module specifier to file path: {specifier}"
        ))
    })?;

    let media_type = MediaType::from_path(&path);

    let (module_type, should_transpile) = match media_type {
        MediaType::JavaScript | MediaType::Mjs | MediaType::Cjs => {
            (deno_core::ModuleType::JavaScript, false)
        }
        MediaType::Jsx => (deno_core::ModuleType::JavaScript, true),
        MediaType::TypeScript
        | MediaType::Mts
        | MediaType::Cts
        | MediaType::Dts
        | MediaType::Dmts
        | MediaType::Dcts
        | MediaType::Tsx => (deno_core::ModuleType::JavaScript, true),
        MediaType::Json => (deno_core::ModuleType::Json, false),
        _ => {
            return Err(JsErrorBox::generic(format!(
                "Unsupported file type: {}",
                path.display()
            )));
        }
    };

    let code = std::fs::read_to_string(&path).map_err(|e| {
        JsErrorBox::generic(format!("Failed to read {}: {e}", path.display()))
    })?;

    let code = if should_transpile {
        let parsed = deno_ast::parse_module(ParseParams {
            specifier: specifier.clone(),
            text: code.into(),
            media_type,
            capture_tokens: false,
            scope_analysis: false,
            maybe_syntax: None,
        })
        .map_err(|e| JsErrorBox::generic(format!("Parse error: {e}")))?;

        let transpiled = parsed
            .transpile(
                &deno_ast::TranspileOptions::default(),
                &TranspileModuleOptions::default(),
                &deno_ast::EmitOptions::default(),
            )
            .map_err(|e| JsErrorBox::generic(format!("Transpile error: {e}")))?;

        transpiled.into_source().text
    } else {
        code
    };

    let module = deno_core::ModuleSource::new(
        module_type,
        ModuleSourceCode::String(code.into()),
        specifier,
        None,
    );

    Ok(module)
}
