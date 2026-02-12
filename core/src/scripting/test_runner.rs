use std::cell::RefCell;
use std::path::Path;
use std::rc::Rc;

use anyhow::Context;
use deno_core::JsRuntime;
use deno_core::OpState;
use deno_core::RuntimeOptions;

use super::{ImportMap, TsModuleLoader};

/// Result of a single test case.
#[derive(Debug, Clone)]
pub struct TestResult {
    pub suite: String,
    pub name: String,
    pub passed: bool,
    pub error: Option<String>,
}

/// Summary of a test file run.
#[derive(Debug, Clone, Default)]
pub struct TestSummary {
    pub total: usize,
    pub passed: usize,
    pub failed: usize,
}

// Shared state between the op and the test runner.
struct TestRunnerState {
    summary: TestSummary,
    results: Vec<TestResult>,
}

/// Run a single `.test.ts` file in V8 and collect results.
pub fn run_test_file(path: &Path) -> anyhow::Result<TestSummary> {
    run_test_file_with_import_map(path, ImportMap::new())
}

/// Run a single `.test.ts` file in V8 with import map support.
pub fn run_test_file_with_import_map(path: &Path, import_map: ImportMap) -> anyhow::Result<TestSummary> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    rt.block_on(run_test_file_async(path, import_map))
}

#[deno_core::op2(fast)]
fn op_report_test(
    state: &mut OpState,
    #[string] suite: &str,
    #[string] name: &str,
    passed: bool,
    #[string] error: &str,
) {
    let runner_state = state.borrow_mut::<Rc<RefCell<TestRunnerState>>>();
    let mut s = runner_state.borrow_mut();

    s.results.push(TestResult {
        suite: suite.to_string(),
        name: name.to_string(),
        passed,
        error: if error.is_empty() {
            None
        } else {
            Some(error.to_string())
        },
    });

    if passed {
        s.summary.passed += 1;
    } else {
        s.summary.failed += 1;
    }
    s.summary.total += 1;
}

#[deno_core::op2]
#[string]
fn op_crypto_random_uuid_test() -> String {
    super::runtime::generate_uuid()
}

deno_core::extension!(
    test_runner_ext,
    ops = [op_report_test, op_crypto_random_uuid_test],
);

async fn run_test_file_async(path: &Path, import_map: ImportMap) -> anyhow::Result<TestSummary> {
    let state = Rc::new(RefCell::new(TestRunnerState {
        summary: TestSummary::default(),
        results: Vec::new(),
    }));

    let mut runtime = JsRuntime::new(RuntimeOptions {
        module_loader: Some(Rc::new(TsModuleLoader::with_import_map(import_map))),
        extensions: vec![test_runner_ext::init()],
        ..Default::default()
    });

    // Store our state in the op_state so ops can access it
    {
        let op_state = runtime.op_state();
        op_state.borrow_mut().put(state.clone());
    }

    // Install polyfills and test reporter
    runtime.execute_script(
        "<test_init>",
        r#"
        if (typeof globalThis.crypto === "undefined") {
            globalThis.crypto = {};
        }
        if (typeof globalThis.crypto.randomUUID !== "function") {
            globalThis.crypto.randomUUID = () => Deno.core.ops.op_crypto_random_uuid_test();
        }
        globalThis.__reportTest = (suite, name, passed, error) => {
            Deno.core.ops.op_report_test(suite, name, passed, error ?? "");
        };
        "#,
    ).map_err(|e| anyhow::anyhow!("{e}"))?;

    // Load and execute the test file (this registers describe/it blocks)
    let abs_path = std::fs::canonicalize(path)
        .with_context(|| format!("Cannot resolve path: {}", path.display()))?;

    let specifier =
        deno_core::ModuleSpecifier::from_file_path(&abs_path).map_err(|_| {
            anyhow::anyhow!("Cannot convert path to specifier: {}", abs_path.display())
        })?;

    let mod_id = runtime
        .load_main_es_module(&specifier)
        .await
        .with_context(|| format!("Failed to load {}", path.display()))?;

    let eval_result = runtime.mod_evaluate(mod_id);
    runtime
        .run_event_loop(Default::default())
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;
    eval_result
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    // Run the collected tests
    let promise = runtime.execute_script(
        "<run_tests>",
        "(async () => { await globalThis.__runTests(); })()",
    ).map_err(|e| anyhow::anyhow!("{e}"))?;

    let resolve = runtime.resolve(promise);
    runtime
        .run_event_loop(Default::default())
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;
    resolve.await.map_err(|e| anyhow::anyhow!("{e}"))?;

    // Retrieve results from shared state
    let summary = state.borrow().summary.clone();
    Ok(summary)
}
