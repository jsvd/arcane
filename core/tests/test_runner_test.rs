use std::path::PathBuf;

use arcane_core::scripting::run_test_file;

fn fixture_path(name: &str) -> PathBuf {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    PathBuf::from(manifest_dir).join("tests/fixtures").join(name)
}

#[test]
fn runs_simple_test_file() {
    let path = fixture_path("simple.test.ts");
    let summary = run_test_file(&path).expect("Should run test file");
    assert_eq!(summary.total, 3);
    assert_eq!(summary.passed, 3);
    assert_eq!(summary.failed, 0);
}

#[test]
fn runs_state_types_tests() {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let path = PathBuf::from(manifest_dir)
        .parent()
        .unwrap()
        .join("runtime/state/types.test.ts");
    let summary = run_test_file(&path).expect("Should run types.test.ts");
    assert_eq!(summary.total, 5);
    assert_eq!(summary.passed, 5);
    assert_eq!(summary.failed, 0);
}
