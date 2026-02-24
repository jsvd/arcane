use std::cell::RefCell;
use std::path::Path;
use std::rc::Rc;

use anyhow::Context;
use deno_core::JsRuntime;
use deno_core::ModuleSpecifier;
use deno_core::OpState;
use deno_core::RuntimeOptions;

use super::{ImportMap, TsModuleLoader};

/// Wraps a `deno_core::JsRuntime` configured with our TypeScript module loader.
pub struct ArcaneRuntime {
    runtime: JsRuntime,
}

/// Newtype to store eval results in OpState.
struct AgentEvalResult(String);

deno_core::extension!(
    arcane_ext,
    ops = [op_crypto_random_uuid, op_agent_store_eval_result],
);

/// Polyfill for `crypto.randomUUID()` which deno_core's V8 doesn't provide.
#[deno_core::op2]
#[string]
fn op_crypto_random_uuid() -> String {
    generate_uuid()
}

/// Store a string value from JS into OpState for eval_to_string to read back.
#[deno_core::op2(fast)]
fn op_agent_store_eval_result(state: &mut OpState, #[string] value: &str) {
    // Replace any previous result
    if state.has::<AgentEvalResult>() {
        state.take::<AgentEvalResult>();
    }
    state.put(AgentEvalResult(value.to_string()));
}

/// Generate a v4 UUID string.
pub(super) fn generate_uuid() -> String {
    let mut bytes = [0u8; 16];
    getrandom(&mut bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6], bytes[7],
        bytes[8], bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15],
    )
}

/// Fill buffer with random bytes using platform APIs.
fn getrandom(buf: &mut [u8]) {
    use std::collections::hash_map::RandomState;
    use std::hash::{BuildHasher, Hasher};
    let mut i = 0;
    while i < buf.len() {
        let s = RandomState::new();
        let mut h = s.build_hasher();
        h.write_u64(i as u64);
        let bytes = h.finish().to_le_bytes();
        let remaining = buf.len() - i;
        let copy_len = remaining.min(8);
        buf[i..i + copy_len].copy_from_slice(&bytes[..copy_len]);
        i += copy_len;
    }
}

const CRYPTO_POLYFILL: &str = r#"
if (typeof globalThis.crypto === "undefined") {
    globalThis.crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== "function") {
    globalThis.crypto.randomUUID = () => Deno.core.ops.op_crypto_random_uuid();
}
"#;

impl ArcaneRuntime {
    /// Create a new runtime with the TypeScript module loader and polyfills.
    pub fn new() -> Self {
        Self::new_with_import_map(ImportMap::new())
    }

    /// Create a new runtime with a custom import map for module resolution.
    pub fn new_with_import_map(import_map: ImportMap) -> Self {
        let runtime = JsRuntime::new(RuntimeOptions {
            module_loader: Some(Rc::new(TsModuleLoader::with_import_map(import_map))),
            extensions: vec![arcane_ext::init(), super::physics_ops::physics_ext::init()],
            ..Default::default()
        });

        let mut rt = Self { runtime };

        // Store physics state in op_state
        {
            let op_state = rt.runtime.op_state();
            op_state
                .borrow_mut()
                .put(Rc::new(RefCell::new(super::physics_ops::PhysicsState(None))));
        }

        rt.runtime
            .execute_script("<crypto_polyfill>", CRYPTO_POLYFILL)
            .expect("Failed to install crypto polyfill");
        rt
    }

    /// Execute an inline script (not a module).
    pub fn execute_script(
        &mut self,
        name: &'static str,
        source: &'static str,
    ) -> anyhow::Result<()> {
        self.runtime
            .execute_script(name, source)
            .context("Script execution failed")?;
        Ok(())
    }

    /// Execute an inline script and return the v8 global handle.
    pub fn execute_script_global(
        &mut self,
        name: &'static str,
        source: &'static str,
    ) -> anyhow::Result<deno_core::v8::Global<deno_core::v8::Value>> {
        self.runtime
            .execute_script(name, source)
            .map_err(|e| anyhow::anyhow!("{e}"))
    }

    /// Load and evaluate a TypeScript/JavaScript file as an ES module.
    pub async fn execute_file(&mut self, path: &Path) -> anyhow::Result<()> {
        let specifier = ModuleSpecifier::from_file_path(path).map_err(|_| {
            anyhow::anyhow!("Cannot convert path to module specifier: {}", path.display())
        })?;

        let mod_id = self
            .runtime
            .load_main_es_module(&specifier)
            .await
            .context("Failed to load module")?;

        let result = self.runtime.mod_evaluate(mod_id);
        self.runtime
            .run_event_loop(Default::default())
            .await
            .context("Event loop error")?;
        result.await.context("Module evaluation failed")?;
        Ok(())
    }

    /// Create a runtime with the render bridge extension for `arcane dev`.
    /// Includes both crypto polyfill and render ops.
    #[cfg(feature = "renderer")]
    #[cfg(feature = "renderer")]
    pub fn new_with_render_bridge(
        bridge: Rc<RefCell<super::render_ops::RenderBridgeState>>,
    ) -> Self {
        Self::new_with_render_bridge_and_import_map(bridge, ImportMap::new())
    }

    #[cfg(feature = "renderer")]
    pub fn new_with_render_bridge_and_import_map(
        bridge: Rc<RefCell<super::render_ops::RenderBridgeState>>,
        import_map: ImportMap,
    ) -> Self {
        let runtime = JsRuntime::new(RuntimeOptions {
            module_loader: Some(Rc::new(TsModuleLoader::with_import_map(import_map))),
            extensions: vec![
                arcane_ext::init(),
                super::render_ops::render_ext::init(),
                super::physics_ops::physics_ext::init(),
                super::geometry_ops::geometry_ext::init(),
                super::particle_ops::particle_ext::init(),
                super::target_ops::target_ext::init(),
                super::sdf_ops::sdf_ext::init(),
            ],
            ..Default::default()
        });

        let mut rt = Self { runtime };

        // Store bridge state and physics state in op_state
        {
            let op_state = rt.runtime.op_state();
            let mut state = op_state.borrow_mut();
            state.put(bridge);
            state.put(Rc::new(RefCell::new(super::physics_ops::PhysicsState(None))));
            state.put(Rc::new(RefCell::new(super::geometry_ops::GeoState::new())));
            state.put(Rc::new(RefCell::new(super::particle_ops::ParticleState::new())));
            state.put(Rc::new(RefCell::new(super::target_ops::TargetState::new())));
            state.put(Rc::new(RefCell::new(super::sdf_ops::SdfState::new())));
        }

        rt.runtime
            .execute_script("<crypto_polyfill>", CRYPTO_POLYFILL)
            .expect("Failed to install crypto polyfill");
        rt
    }

    /// Execute a non-static script string. Used for per-frame callbacks.
    pub fn execute_script_string(
        &mut self,
        name: &'static str,
        source: impl Into<String>,
    ) -> anyhow::Result<()> {
        let source: String = source.into();
        self.runtime
            .execute_script(name, deno_core::FastString::from(source))
            .context("Script execution failed")?;
        Ok(())
    }

    /// Evaluate a script and return the result as a string.
    /// Works in headless mode — used by agent protocol commands.
    pub fn eval_to_string(&mut self, source: &str) -> anyhow::Result<String> {
        // Wrap the expression: convert to string, then store via op
        let script = format!(
            "Deno.core.ops.op_agent_store_eval_result(String({}))",
            source
        );
        self.runtime
            .execute_script(
                "<agent_eval>",
                deno_core::FastString::from(script),
            )
            .context("Agent eval failed")?;

        // Read result from OpState
        let op_state = self.runtime.op_state();
        let result = op_state
            .borrow_mut()
            .take::<AgentEvalResult>()
            .0;
        Ok(result)
    }

    /// Access the inner JsRuntime for advanced operations.
    pub fn inner(&mut self) -> &mut JsRuntime {
        &mut self.runtime
    }
}
