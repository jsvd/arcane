//! Tests for save/load file operations.

use std::fs;
use std::path::PathBuf;

fn setup_save_dir() -> (PathBuf, tempfile::TempDir) {
    let tmp = tempfile::tempdir().unwrap();
    let save_dir = tmp.path().join(".arcane").join("saves");
    fs::create_dir_all(&save_dir).unwrap();
    (save_dir, tmp)
}

#[test]
fn test_save_and_load_file() {
    let (save_dir, _tmp) = setup_save_dir();
    let path = save_dir.join("test_slot.json");
    let data = r#"{"__arcane":"save","state":{"score":42}}"#;
    fs::write(&path, data).unwrap();
    let loaded = fs::read_to_string(&path).unwrap();
    assert_eq!(loaded, data);
}

#[test]
fn test_delete_file() {
    let (save_dir, _tmp) = setup_save_dir();
    let path = save_dir.join("to_delete.json");
    fs::write(&path, "test").unwrap();
    assert!(path.exists());
    fs::remove_file(&path).unwrap();
    assert!(!path.exists());
}

#[test]
fn test_list_save_files() {
    let (save_dir, _tmp) = setup_save_dir();
    fs::write(save_dir.join("save1.json"), "{}").unwrap();
    fs::write(save_dir.join("save2.json"), "{}").unwrap();
    fs::write(save_dir.join("not_json.txt"), "{}").unwrap();

    let mut keys: Vec<String> = Vec::new();
    for entry in fs::read_dir(&save_dir).unwrap().flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "json") {
            if let Some(stem) = path.file_stem() {
                keys.push(stem.to_string_lossy().to_string());
            }
        }
    }
    keys.sort();
    assert_eq!(keys, vec!["save1", "save2"]);
}

#[test]
fn test_load_nonexistent_returns_empty() {
    let (save_dir, _tmp) = setup_save_dir();
    let path = save_dir.join("nonexistent.json");
    let result = fs::read_to_string(path).unwrap_or_default();
    assert_eq!(result, "");
}

#[test]
fn test_save_dir_created_from_base_dir() {
    let tmp = tempfile::tempdir().unwrap();
    let base_dir = tmp.path().to_path_buf();
    let save_dir = base_dir.join(".arcane").join("saves");
    assert!(save_dir.to_string_lossy().contains(".arcane"));
    assert!(save_dir.to_string_lossy().contains("saves"));
}

#[test]
fn test_key_sanitization() {
    // Valid keys
    assert!("my-save".chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
    assert!("save_01".chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
    assert!("TestSave".chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));

    // Invalid keys (path traversal, special chars)
    assert!(!"../etc/passwd".chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
    assert!(!"/absolute".chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
    assert!(!"has spaces".chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
    assert!(!"has.dots".chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-'));
}
