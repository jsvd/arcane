---
name: release
description: Full release workflow — changelog, version bump, test, commit, tag, push, publish, GitHub release. Pass version as argument (e.g., /release 0.12.0).
allowed-tools: Bash, Read, Edit, Grep
---

Execute the full Arcane release workflow. The argument is a semver version string like `0.12.0`.

## Steps

### 1. Determine current and new versions

Read `core/Cargo.toml` to find the current version. The new version is the argument passed by the user.

Run `git log --oneline PREV_TAG..HEAD` (where PREV_TAG is the current version's tag, e.g., `v0.11.0`) to see all changes since the last release.

### 2. Update CHANGELOG.md

Add a new `## [X.Y.Z] - YYYY-MM-DD` section at the top (after the `# Changelog` header, before the previous version entry). Group changes into:

```markdown
### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...
```

Only include sections that have content. Use the git log to identify all changes. Write concise, user-facing descriptions (not commit messages).

### 3. Run all test suites

Run all three test suites and capture the pass counts:

```bash
./run-tests.sh 2>&1 | tail -3          # Node TS tests
cargo run -- test 2>&1 | tail -3        # V8 TS tests
cargo test --workspace 2>&1 | tail -3   # Rust tests
cargo check --no-default-features 2>&1 | tail -3  # Headless check
```

All must pass before proceeding. Record the test counts (e.g., "2028 Node + 2125 V8 + 292 Rust").

Also verify that generated declaration files type-check correctly in a scaffolded project:

```bash
# Regenerate declarations (ensures cheatsheet is fresh)
scripts/generate-declarations.sh

# Create a temp project and type-check it
TMPDIR=$(mktemp -d)
cargo run -- new "$TMPDIR/release-check" 2>&1
cd "$TMPDIR/release-check" && npx -p typescript tsc --noEmit 2>&1
cd - && rm -rf "$TMPDIR"
```

If type-checking fails, fix the generated files before proceeding.

### 4. Update status docs with fresh test counts

#### a. `README.md`
- Update the Status section version: `**vX.Y.Z — <summary>**`
- Update the crate link version if it contains one
- Update test count line: `✅ XXXX TS (Node) + XXXX (V8) + XXX Rust tests passing`
- Add any new features to the feature list
- Update demo count if demos were added/removed

#### b. `CLAUDE.md`
- Update the status line (starts with `**Current status:`): version, summary, test counts

#### c. `MEMORY.md` (at `/Users/arkham/.claude/projects/-Users-arkham-project-arcane/memory/MEMORY.md`)
- Update the "Current Phase" section: version, test counts

### 5. Bump version numbers

Update **3 files**:

#### a. `core/Cargo.toml`
Change `version = "OLD"` to `version = "X.Y.Z"`.

#### b. `cli/Cargo.toml`
Change TWO things:
- `version = "OLD"` to `version = "X.Y.Z"` (under `[package]`)
- `arcane-core = { version = "OLD"` to `arcane-core = { version = "X.Y.Z"` (under `[dependencies]`)

#### c. `README.md`
Update the crate link in the Status section if it contains a version number.

### 6. Update Cargo.lock

```bash
cargo check 2>&1 | tail -5
```

### 7. Verify no stale versions

```bash
grep -rn 'OLD_VERSION' --include='*.toml' --include='*.md' | grep -v node_modules | grep -v target/ | grep -v CHANGELOG
```

If any results appear, fix them before proceeding.

### 8. Commit, tag, and push

```bash
git add core/Cargo.toml cli/Cargo.toml Cargo.lock README.md CLAUDE.md CHANGELOG.md
```

Also stage any other files that were updated (MEMORY.md is outside the repo, doesn't need staging).

Commit with:
```
Bump version to X.Y.Z

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Then tag and push:
```bash
git tag vX.Y.Z
git push origin main --tags
```

### 9. Publish to crates.io

Publish in dependency order, waiting for indexing between each:

```bash
# 1. Core library
cargo publish -p arcane-core

# Wait ~60s for crates.io to index
sleep 60

# 2. CLI binary (--allow-dirty because cli/data/ is gitignored but included in crate)
cargo publish -p arcane-engine --allow-dirty
```

If the second publish fails with "arcane-core X.Y.Z not found", wait longer and retry.

### 10. Create GitHub Release

```bash
gh release create vX.Y.Z --title "Arcane vX.Y.Z" --body "$(cat <<'RELEASE_EOF'
<paste the CHANGELOG entry here>

---

Install: `cargo install arcane-engine`
RELEASE_EOF
)"
```

Use the CHANGELOG entry as the release body. Add the install command at the bottom.

### 11. Print summary

```
## Release X.Y.Z Complete

| Step | Status |
|------|--------|
| CHANGELOG.md | ✓ Updated |
| Tests | ✓ XXXX Node + XXXX V8 + XXX Rust |
| Version bump | ✓ 3 files |
| Status docs | ✓ README + CLAUDE.md + MEMORY.md |
| Git | ✓ Committed, tagged vX.Y.Z, pushed |
| crates.io | ✓ arcane-core + arcane-engine published |
| GitHub Release | ✓ Created |

Install: cargo install arcane-engine
```
