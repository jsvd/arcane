---
name: release
description: Bump version numbers across all package files and verify consistency. Pass version as argument (e.g., /release 0.9.0).
allowed-tools: Bash, Read, Edit, Grep
---

Bump all version numbers to the version provided as an argument. The argument is a semver string like `0.11.0`.

## Steps

### 1. Determine current and new versions

Read `core/Cargo.toml` to find the current version. The new version is the argument passed by the user.

### 2. Update all 3 files

Update these files with the new version `X.Y.Z`:

#### a. `core/Cargo.toml`
Change `version = "OLD"` to `version = "X.Y.Z"` (the first `version =` line under `[package]`).

#### b. `cli/Cargo.toml`
Change TWO things:
- `version = "OLD"` to `version = "X.Y.Z"` (under `[package]`)
- `arcane-core = { version = "OLD"` to `arcane-core = { version = "X.Y.Z"` (under `[dependencies]`)

#### c. `README.md`
Update the version reference in the Status section (the crate link).

### 3. Update Cargo.lock

```bash
cargo check 2>&1 | tail -5
```

This auto-updates `Cargo.lock` with the new version numbers.

### 4. Verify no stale versions remain

```bash
grep -rn 'OLD_VERSION' --include='*.toml' --include='*.md' | grep -v node_modules | grep -v target/ | grep -v CHANGELOG
```

Replace `OLD_VERSION` with the **old** version string. If any results appear (other than CHANGELOG.md), report them as warnings.

### 5. Print summary

Print a summary table:

```
## Version Bump Summary: OLD -> X.Y.Z

| File | Change |
|------|--------|
| core/Cargo.toml | version = "X.Y.Z" |
| cli/Cargo.toml | version = "X.Y.Z", arcane-core dep = "X.Y.Z" |
| README.md | crate link updated |
| Cargo.lock | auto-updated |

All version references updated. Ready to commit.
```
