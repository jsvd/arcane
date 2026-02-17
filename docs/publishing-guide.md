# Publishing Guide

Guide for publishing Arcane to crates.io.

## Prerequisites

### crates.io
- crates.io account
- API token: `cargo login <token>`
- Verify credentials: `cargo publish --dry-run`

## Pre-publish Checklist

- [ ] All tests passing (`./run-tests.sh`, `cargo test --workspace`, `cargo run -- test`)
- [ ] Version numbers updated in Cargo.toml files
- [ ] CHANGELOG.md updated with release notes
- [ ] Documentation reviewed and up-to-date
- [ ] No uncommitted changes (`git status` clean)
- [ ] On main branch with latest code

## Publishing Order

Publish in this order to respect dependencies:

1. **arcane-core** (crates.io) — Rust core library
2. **arcane-engine** (crates.io) — CLI binary (embeds runtime + recipes + templates)

## 1. Publish arcane-core

```bash
cd core

# Dry run to check for issues
cargo publish --dry-run

# Publish to crates.io
cargo publish

# Wait for indexing (usually 1-2 minutes)
```

**Post-publish:**
- Verify: `cargo search arcane-core`

## 2. Publish arcane-engine

`cli/data/` is auto-synced by `build.rs` — no manual copy step needed. Every `cargo build` / `cargo publish` in the repo automatically copies the latest templates, recipes, runtime, and assets from the canonical sources into `cli/data/`.

```bash
cd cli

# Dry run (triggers build.rs which auto-syncs cli/data/)
cargo publish --dry-run --allow-dirty

# Publish (--allow-dirty needed because cli/data/ is gitignored but included in crate)
cargo publish --allow-dirty
```

**Post-publish:**
- Verify: `cargo search arcane-engine`
- Test installation: `cargo install arcane-engine`
- Test: `arcane new test-project && cd test-project && arcane test`

## End-to-End Test

After both crates are published:

```bash
# 1. Install CLI
cargo install arcane-engine

# 2. Create a project
arcane new test-game
cd test-game

# 3. Verify runtime was copied
ls runtime/state/

# 4. Run the game
arcane dev

# 5. Run tests
arcane test

# 6. Add a recipe
arcane add turn-based-combat
```

If all steps work, publishing is successful!

## Versioning

We follow [Semantic Versioning](https://semver.org/). Before 1.0.0, breaking changes may occur in minor versions.

## Release Process

### Step 1: Determine the new version

Follow semver. Before 1.0.0, minor bumps (0.10 → 0.11) may include breaking changes.

### Step 2: Bump version numbers

Update **3 files** (miss one and publish will fail or be inconsistent):

| File | What to change |
|---|---|
| `core/Cargo.toml` | `version = "X.Y.Z"` |
| `cli/Cargo.toml` | `version = "X.Y.Z"` AND `arcane-core = { version = "X.Y.Z"` |
| `README.md` | Version reference in the Status section |

`Cargo.lock` is auto-updated by `cargo check`.

Quick grep to verify no stale versions remain:
```bash
grep -rn 'OLD_VERSION' --include='*.toml' --include='*.md' | grep -v node_modules | grep -v target/ | grep -v CHANGELOG
```

### Step 3: Update CHANGELOG.md

Add a new section at the top. Use `git log --oneline PREV_TAG..HEAD` to find all changes.

### Step 4: Run full verification

```bash
cargo test --workspace
./run-tests.sh
cargo run -- test
cargo check --no-default-features
```

### Step 5: Commit and tag

```bash
git add core/Cargo.toml cli/Cargo.toml Cargo.lock README.md CHANGELOG.md
git commit -m "Bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

### Step 6: Publish packages

Follow the [Publishing Order](#publishing-order) section above.

### Step 7: Create GitHub Release

```bash
gh release create vX.Y.Z --title "Arcane vX.Y.Z" --notes-file - <<< "$(sed -n '/^## \[X.Y.Z\]/,/^## \[/{ /^## \[X.Y.Z\]/d; /^## \[/d; p; }' CHANGELOG.md)"
```

### Step 8: Update project status docs

After a release that completes a phase, update status in:

| File | What to update |
|---|---|
| `MEMORY.md` | Current phase status + test counts |
| `CLAUDE.md` | "Current status" sentence |
| `README.md` | "## Status" section |
| `docs/roadmap.md` | Phase checklists |

## Troubleshooting

### Publish fails: Version already exists

Version numbers can't be reused. Increment version and republish.

### Installation fails: Dependency not found

Wait 2-5 minutes for package indexes to update, then retry.

## Rolling Back

If a release has critical bugs:

1. **Yank the crate:**
   ```bash
   cargo yank --vers X.Y.Z arcane-engine
   ```

2. **Fix bug and release patch**

**Note:** Only yank for critical security issues or completely broken releases. Prefer publishing a patch version.

## Deprecated npm Packages

The following npm packages are deprecated as of v0.11.0:
- `@arcane-engine/runtime` — Runtime is now embedded in the CLI binary
- `@arcane-engine/create` — Use `arcane new` instead

Published versions remain on npm for existing users but receive no updates.
