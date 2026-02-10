use std::path::PathBuf;

use arcane_engine::scripting::ArcaneRuntime;

fn fixture_path(name: &str) -> PathBuf {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    PathBuf::from(manifest_dir).join("tests/fixtures").join(name)
}

#[tokio::test]
async fn loads_typescript_module() {
    let mut rt = ArcaneRuntime::new();
    let path = fixture_path("hello.ts");
    rt.execute_file(&path)
        .await
        .expect("Should load a simple TS module");
}

#[tokio::test]
async fn crypto_random_uuid_polyfill_works() {
    let mut rt = ArcaneRuntime::new();
    let path = fixture_path("uuid_test.ts");
    rt.execute_file(&path)
        .await
        .expect("Should execute uuid_test.ts");
}
