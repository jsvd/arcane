use deno_ast::MediaType;
use deno_ast::ParseParams;
use deno_ast::TranspileModuleOptions;
use deno_core::ModuleLoadResponse;
use deno_core::ModuleLoader;
use deno_core::ModuleSourceCode;
use deno_core::ModuleSpecifier;
use deno_error::JsErrorBox;
use std::collections::HashMap;

/// Import map for resolving bare specifiers to file paths
#[derive(Debug, Clone, Default)]
pub struct ImportMap {
    pub imports: HashMap<String, String>,
}

impl ImportMap {
    /// Create a new empty import map
    pub fn new() -> Self {
        Self {
            imports: HashMap::new(),
        }
    }

    /// Add a mapping from a bare specifier to a file path
    pub fn add(&mut self, specifier: String, path: String) {
        self.imports.insert(specifier, path);
    }

    /// Resolve a specifier using the import map
    /// Returns the mapped path if found, otherwise None
    pub fn resolve(&self, specifier: &str) -> Option<&str> {
        // Check for exact match first
        if let Some(mapped) = self.imports.get(specifier) {
            return Some(mapped.as_str());
        }

        // Check for prefix match (e.g., "@arcane/runtime/state" matches "@arcane/runtime/")
        for (key, value) in &self.imports {
            if key.ends_with('/') && specifier.starts_with(key) {
                // Replace the prefix
                let suffix = &specifier[key.len()..];
                // For now, return the base path + suffix
                // This requires string allocation, so we'll handle it differently
                // in the actual resolve method
                continue;
            }
        }

        None
    }
}

#[cfg(test)]
mod import_map_tests {
    use super::*;

    #[test]
    fn empty_import_map_resolves_nothing() {
        let map = ImportMap::new();
        assert_eq!(map.resolve("foo"), None);
        assert_eq!(map.resolve("@arcane/runtime"), None);
    }

    #[test]
    fn exact_match_resolves() {
        let mut map = ImportMap::new();
        map.add("@arcane/runtime".to_string(), "file:///path/to/runtime/index.ts".to_string());

        assert_eq!(map.resolve("@arcane/runtime"), Some("file:///path/to/runtime/index.ts"));
    }

    #[test]
    fn prefix_match_is_not_implemented_yet() {
        let mut map = ImportMap::new();
        map.add("@arcane/runtime/".to_string(), "file:///path/to/runtime/".to_string());

        // The current implementation doesn't return prefix matches
        // (it has TODO code that continues)
        assert_eq!(map.resolve("@arcane/runtime/state"), None);
    }

    #[test]
    fn multiple_mappings_work() {
        let mut map = ImportMap::new();
        map.add("foo".to_string(), "file:///foo.ts".to_string());
        map.add("bar".to_string(), "file:///bar.ts".to_string());
        map.add("baz".to_string(), "file:///baz.ts".to_string());

        assert_eq!(map.resolve("foo"), Some("file:///foo.ts"));
        assert_eq!(map.resolve("bar"), Some("file:///bar.ts"));
        assert_eq!(map.resolve("baz"), Some("file:///baz.ts"));
        assert_eq!(map.resolve("qux"), None);
    }

    #[test]
    fn last_add_wins_for_same_specifier() {
        let mut map = ImportMap::new();
        map.add("foo".to_string(), "file:///first.ts".to_string());
        map.add("foo".to_string(), "file:///second.ts".to_string());

        assert_eq!(map.resolve("foo"), Some("file:///second.ts"));
    }

    #[test]
    fn clone_preserves_mappings() {
        let mut map = ImportMap::new();
        map.add("foo".to_string(), "file:///foo.ts".to_string());

        let cloned = map.clone();
        assert_eq!(cloned.resolve("foo"), Some("file:///foo.ts"));
    }

    #[test]
    fn default_is_empty() {
        let map = ImportMap::default();
        assert_eq!(map.imports.len(), 0);
    }
}

/// Loads `.ts` and `.js` files from the filesystem with import map support.
/// TypeScript files are transpiled via `deno_ast` (type stripping).
/// JavaScript files pass through unchanged.
pub struct TsModuleLoader {
    import_map: ImportMap,
}

impl TsModuleLoader {
    pub fn new() -> Self {
        Self {
            import_map: ImportMap::new(),
        }
    }

    pub fn with_import_map(import_map: ImportMap) -> Self {
        Self { import_map }
    }
}

impl Default for TsModuleLoader {
    fn default() -> Self {
        Self::new()
    }
}

impl ModuleLoader for TsModuleLoader {
    fn resolve(
        &self,
        specifier: &str,
        referrer: &str,
        _kind: deno_core::ResolutionKind,
    ) -> Result<ModuleSpecifier, deno_core::error::ModuleLoaderError> {
        // Try import map resolution first
        let resolved_specifier = self.resolve_with_import_map(specifier, referrer)?;

        deno_core::resolve_import(&resolved_specifier, referrer).map_err(JsErrorBox::from_err)
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

impl TsModuleLoader {
    /// Resolve specifier using import map, returning either mapped path or original specifier
    fn resolve_with_import_map(
        &self,
        specifier: &str,
        referrer: &str,
    ) -> Result<String, deno_core::error::ModuleLoaderError> {
        // If it's already a relative or absolute path, don't use import map
        if specifier.starts_with("./")
            || specifier.starts_with("../")
            || specifier.starts_with('/')
            || specifier.starts_with("file:")
            || specifier.starts_with("http:")
            || specifier.starts_with("https:")
        {
            return Ok(specifier.to_string());
        }

        // Check for exact match
        if let Some(mapped) = self.import_map.imports.get(specifier) {
            return Ok(mapped.clone());
        }

        // Check for prefix match (e.g., "@arcane/runtime/state" matches "@arcane/runtime/")
        for (key, value) in &self.import_map.imports {
            if key.ends_with('/') && specifier.starts_with(key) {
                let suffix = &specifier[key.len()..];
                let resolved = format!("{}{}", value, suffix);
                return Ok(resolved);
            }
        }

        // No mapping found, return original specifier
        Ok(specifier.to_string())
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
