# Publishing Guide

Guide for publishing Arcane to crates.io. For the automated workflow, use `/release X.Y.Z`.

## Prerequisites

- crates.io account with API token: `cargo login <token>`
- GitHub CLI: `gh auth status`
- All tests passing

## Release Workflow

The `/release X.Y.Z` skill automates this entire workflow. The steps below document what it does.

### 1. Write CHANGELOG entry

Add a `## [X.Y.Z] - YYYY-MM-DD` section at the top of `CHANGELOG.md`. Use `git log --oneline` since the last tag to find all changes. Group into Added/Changed/Fixed/Removed.

### 2. Run full test suite

```bash
./run-tests.sh              # Node TS tests
cargo run -- test            # V8 TS tests
cargo test --workspace       # Rust tests
cargo check --no-default-features  # Headless check
```

All must pass.

### 3. Update status docs

Update test counts and version in:

| File | What to update |
|---|---|
| `README.md` | Status section (version, test counts, features, demo count) |
| `CLAUDE.md` | Status line (version, test counts) |
| `MEMORY.md` | Current Phase section (version, test counts) |

### 4. Bump versions

Update **3 files**:

| File | What to change |
|---|---|
| `core/Cargo.toml` | `version = "X.Y.Z"` |
| `cli/Cargo.toml` | `version = "X.Y.Z"` AND `arcane-core = { version = "X.Y.Z"` |
| `README.md` | Crate link version in Status section (if present) |

Then `cargo check` to update `Cargo.lock`.

Verify no stale versions:
```bash
grep -rn 'OLD_VERSION' --include='*.toml' --include='*.md' | grep -v node_modules | grep -v target/ | grep -v CHANGELOG
```

### 5. Commit, tag, push

```bash
git add core/Cargo.toml cli/Cargo.toml Cargo.lock README.md CLAUDE.md CHANGELOG.md
git commit -m "Bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

### 6. Publish to crates.io

Publish in dependency order:

```bash
# Core library first
cargo publish -p arcane-core

# Wait for indexing (~60s)
sleep 60

# CLI binary (--allow-dirty because cli/data/ is gitignored but included)
cargo publish -p arcane-engine --allow-dirty
```

`cli/data/` is auto-synced by `build.rs` — no manual step needed.

**Post-publish verification:**
```bash
cargo install arcane-engine
arcane new test-project && cd test-project && arcane test
```

### 7. Create GitHub Release

```bash
gh release create vX.Y.Z --title "Arcane vX.Y.Z" --notes "$(sed -n '/^## \[X.Y.Z\]/,/^## \[/{ /^## \[X.Y.Z\]/d; /^## \[/d; p; }' CHANGELOG.md)"
```

## Troubleshooting

**Version already exists** — Can't reuse version numbers. Increment and republish.

**Dependency not found** — Wait 2-5 minutes for crates.io indexing, then retry.

**`--allow-dirty` needed** — `cli/data/` is gitignored but included in the published crate via `build.rs`. This is expected.

## Rolling Back

Yank only for critical issues. Prefer publishing a patch:

```bash
cargo yank --vers X.Y.Z arcane-engine
# Fix, bump to X.Y.Z+1, re-publish
```

## Deprecated npm Packages

As of v0.11.0, the npm packages are deprecated:
- `@arcane-engine/runtime` — Runtime is now embedded in the CLI binary
- `@arcane-engine/create` — Use `arcane new` instead
