---
name: release
description: Bump version numbers across all package files and verify consistency. Pass version as argument (e.g., /release 0.9.0).
allowed-tools: Bash, Read, Edit, Grep
---

Bump all version numbers to the version provided as an argument. The argument is a semver string like `0.9.0`.

## Steps

### 1. Determine current and new versions

Read `core/Cargo.toml` to find the current version. The new version is the argument passed by the user.

### 2. Update all 7 files

Update these files with the new version `X.Y.Z`:

#### a. `core/Cargo.toml`
Change `version = "OLD"` to `version = "X.Y.Z"` (the first `version =` line under `[package]`).

#### b. `cli/Cargo.toml`
Change TWO things:
- `version = "OLD"` to `version = "X.Y.Z"` (under `[package]`)
- `arcane-engine = { version = "OLD"` to `arcane-engine = { version = "X.Y.Z"` (under `[dependencies]`)

#### c. `packages/runtime/package.json`
Change `"version": "OLD"` to `"version": "X.Y.Z"`.

#### d. `packages/create/package.json`
Change TWO things:
- `"version": "OLD"` to `"version": "X.Y.Z"`
- `"arcane-cli": "^OLD_MINOR"` to `"arcane-cli": "^X.Y.0"` in peerDependencies

#### e. `templates/default/package.json`
Change `"@arcane-engine/runtime": "^OLD_MINOR"` to `"@arcane-engine/runtime": "^X.Y.0"`.

#### f. `README.md`
Update version references in the Status section. There are 4 package links that contain the version number — update each one.

### 3. Update Cargo.lock

```bash
cargo check 2>&1 | tail -5
```

This auto-updates `Cargo.lock` with the new version numbers.

### 4. Verify no stale versions remain

```bash
grep -rn 'OLD_VERSION' --include='*.toml' --include='*.json' --include='*.md' | grep -v node_modules | grep -v target/ | grep -v CHANGELOG
```

Replace `OLD_VERSION` with the **old** version string. If any results appear (other than CHANGELOG.md which intentionally keeps history), report them as warnings.

### 5. Print summary

Print a summary table:

```
## Version Bump Summary: OLD -> X.Y.Z

| File | Change |
|------|--------|
| core/Cargo.toml | version = "X.Y.Z" |
| cli/Cargo.toml | version = "X.Y.Z", arcane-engine dep = "X.Y.Z" |
| packages/runtime/package.json | version = "X.Y.Z" |
| packages/create/package.json | version = "X.Y.Z", peerDep ^X.Y.0 |
| templates/default/package.json | @arcane-engine/runtime ^X.Y.0 |
| README.md | 4 package links updated |
| Cargo.lock | auto-updated |

All version references updated. Ready to commit.
```
