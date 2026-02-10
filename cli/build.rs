use std::fs;
use std::path::{Path, PathBuf};

fn copy_dir_recursive(src: &Path, dst: &Path) {
    fs::create_dir_all(dst).unwrap();
    for entry in fs::read_dir(src).unwrap() {
        let entry = entry.unwrap();
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path);
        } else {
            fs::copy(&src_path, &dst_path).unwrap();
        }
    }
}

fn find_dir(name: &str) -> PathBuf {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());

    // Repo layout: cli/../<name> (e.g. ../templates/default, ../recipes)
    let repo_path = manifest_dir.join("..").join(name);
    if repo_path.exists() {
        return repo_path;
    }

    // Published crate: cli/data/<name>
    let data_path = manifest_dir.join("data").join(name);
    if data_path.exists() {
        return data_path;
    }

    panic!(
        "Cannot find {} directory. Looked at:\n  {}\n  {}",
        name,
        repo_path.display(),
        data_path.display()
    );
}

fn main() {
    let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());

    let templates_src = find_dir("templates/default");
    copy_dir_recursive(&templates_src, &out_dir.join("templates").join("default"));

    let recipes_src = find_dir("recipes");
    copy_dir_recursive(&recipes_src, &out_dir.join("recipes"));

    println!("cargo:rerun-if-changed=../templates/default");
    println!("cargo:rerun-if-changed=../recipes");
    println!("cargo:rerun-if-changed=data");
}
