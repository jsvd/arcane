use std::path::PathBuf;

use arcane_engine::scripting::{run_test_file, TestSummary};

use super::type_check;

pub fn run(path: Option<String>) -> anyhow::Result<()> {
    let root = path
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().expect("cannot read current directory"));

    let test_files = discover_test_files(&root)?;

    if test_files.is_empty() {
        println!("No test files found.");
        return Ok(());
    }

    println!("Discovered {} test file(s)\n", test_files.len());

    // Type check all test files before running them
    if !type_check::should_skip_type_check() {
        for file in &test_files {
            type_check::check_types(file)?;
        }
    }

    let mut grand_total = TestSummary {
        total: 0,
        passed: 0,
        failed: 0,
    };

    let mut any_failure = false;

    for file in &test_files {
        let display = file
            .strip_prefix(&root)
            .unwrap_or(file)
            .display();
        print!("{display} ... ");

        match run_test_file(file) {
            Ok(summary) => {
                grand_total.total += summary.total;
                grand_total.passed += summary.passed;
                grand_total.failed += summary.failed;

                if summary.failed > 0 {
                    any_failure = true;
                    println!("FAIL ({} passed, {} failed)", summary.passed, summary.failed);
                } else {
                    println!("ok ({} tests)", summary.total);
                }
            }
            Err(e) => {
                any_failure = true;
                println!("ERROR: {e}");
            }
        }
    }

    println!(
        "\n{} tests, {} passed, {} failed",
        grand_total.total, grand_total.passed, grand_total.failed
    );

    if any_failure {
        std::process::exit(1);
    }

    Ok(())
}

fn discover_test_files(root: &PathBuf) -> anyhow::Result<Vec<PathBuf>> {
    let mut files = Vec::new();

    if root.is_file() {
        if root.to_string_lossy().ends_with(".test.ts") {
            files.push(root.clone());
        }
        return Ok(files);
    }

    walk_dir(root, &mut files)?;
    files.sort();
    Ok(files)
}

fn walk_dir(dir: &PathBuf, files: &mut Vec<PathBuf>) -> anyhow::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        // Skip target/, node_modules/, .git/
        if path.is_dir() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name == "target"
                || name == "node_modules"
                || name == "templates"
                || name.starts_with('.')
            {
                continue;
            }
            walk_dir(&path, files)?;
        } else if path.to_string_lossy().ends_with(".test.ts") {
            files.push(path);
        }
    }
    Ok(())
}
