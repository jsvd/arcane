# Publishing Guide

Guide for publishing Arcane packages to npm and crates.io.

## Prerequisites

### npm
- npm account with 2FA enabled
- Access to `@arcane-engine` organization (or create it)
- Logged in: `npm login`

### crates.io
- crates.io account
- API token: `cargo login <token>`
- Verify credentials: `cargo publish --dry-run`

## Pre-publish Checklist

- [ ] All tests passing (`./run-tests.sh`, `cargo test --workspace`)
- [ ] Version numbers updated in all package.json and Cargo.toml files
- [ ] CHANGELOG.md updated with release notes
- [ ] Documentation reviewed and up-to-date
- [ ] Examples tested and working
- [ ] No uncommitted changes (`git status` clean)
- [ ] On main branch with latest code

## Publishing Order

Publish in this order to respect dependencies:

1. **@arcane-engine/runtime** (npm) — Core TypeScript runtime
2. **arcane-engine** (crates.io) — Rust core library
3. **arcane-cli** (crates.io) — CLI binary
4. **@arcane-engine/create** (npm) — Project scaffolding tool

## 1. Publish @arcane-engine/runtime

```bash
cd packages/runtime

# Verify package contents
npm pack --dry-run

# Publish to npm
npm publish --access public

# Verify installation
npm view @arcane-engine/runtime
```

**Post-publish:**
- Test: `npm install @arcane-engine/runtime`
- Verify imports work in a test project

## 2. Publish arcane-engine

```bash
cd core

# Dry run to check for issues
cargo publish --dry-run

# Publish to crates.io
cargo publish

# Wait for indexing (usually 1-2 minutes)
```

**Post-publish:**
- Verify: `cargo search arcane-engine`
- Test: `cargo add arcane-engine` in a test project

## 3. Publish arcane-cli

**Pre-publish: populate `cli/data/`** — the CLI embeds templates, recipes, and asset catalog. These are gitignored and must be copied before publishing:

```bash
# Populate cli/data/ for cargo publish (gitignored, needed for crate packaging)
mkdir -p cli/data/templates
cp -r templates/default cli/data/templates/default
cp -r recipes cli/data/recipes
cp -r assets cli/data/assets   # may already exist
```

```bash
cd cli

# Ensure arcane-engine dependency version is correct in Cargo.toml
# dependencies.arcane-engine version must match the just-published core version

# Dry run (will fail if cli/data/ is not populated)
cargo publish --dry-run --allow-dirty

# Publish (--allow-dirty needed because cli/data/ is gitignored but included in crate)
cargo publish --allow-dirty
```

**Post-publish:**
- Verify: `cargo search arcane-cli`
- Test installation: `cargo install arcane-cli`
- Test command: `arcane --version`

## 4. Publish @arcane-engine/create

```bash
cd packages/create

# Verify package contents
npm pack --dry-run

# Publish
npm publish --access public

# Verify
npm view @arcane-engine/create
```

**Post-publish:**
- Test: `npm create @arcane-engine/game test-project`
- Verify created project structure

## End-to-End Test

After all packages are published, test the complete workflow:

```bash
# 1. Install CLI
cargo install arcane-cli

# 2. Create a project (tests @arcane-engine/create)
npm create @arcane-engine/game test-game
cd test-game

# 3. Install dependencies (tests @arcane-engine/runtime)
npm install

# 4. Run the game (tests CLI + runtime integration)
arcane dev

# 5. Run tests
arcane test

# 6. Add a recipe
arcane add turn-based-combat
```

If all steps work, publishing is successful! ✅

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **0.1.0** — Initial release
- **0.1.x** — Patch releases (bug fixes)
- **0.x.0** — Minor releases (new features, backward compatible)
- **x.0.0** — Major releases (breaking changes)

Before 1.0.0, breaking changes may occur in minor versions.

## Release Process

### Step 1: Determine the new version

Follow semver. Before 1.0.0, minor bumps (0.2 → 0.3) may include breaking changes. Patch bumps (0.2.1 → 0.2.2) are bug fixes only.

### Step 2: Sync `packages/runtime/src/` from `runtime/`

The npm package at `packages/runtime/src/` is a copy of `runtime/`. Sync before every release:

```bash
# Check for content differences (import paths will differ — that's expected)
diff -rq runtime/ packages/runtime/src/

# If files differ, compare ignoring the harness import path:
# runtime/ uses:   ../../runtime/testing/harness.ts
# packages/ uses:  ../testing/harness.ts
# Only sync if there are real content changes beyond this path difference.

# If new modules were added to runtime/, also add them to packages/runtime/package.json exports map.
```

**Do NOT blindly copy files** — test imports use different relative paths in each location. If a test file has real content changes (not just the import path), manually update the packages copy preserving its import path.

### Step 3: Bump version numbers

Update **all 7 files** (miss one and publish will fail or be inconsistent):

| File | What to change |
|---|---|
| `core/Cargo.toml` | `version = "X.Y.Z"` |
| `cli/Cargo.toml` | `version = "X.Y.Z"` AND `arcane-engine = { version = "X.Y.Z"` |
| `packages/runtime/package.json` | `"version": "X.Y.Z"` |
| `packages/create/package.json` | `"version": "X.Y.Z"` AND `"arcane-cli": "^X.Y.0"` peerDep |
| `templates/default/package.json` | `"@arcane-engine/runtime": "^X.Y.0"` |
| `README.md` | Version references in the Status section (4 package links) |
| `Cargo.lock` | Auto-updated by `cargo check` — just commit the result |

Quick grep to verify no stale versions remain:
```bash
grep -rn '0\.OLD\.VERSION' --include='*.toml' --include='*.json' --include='*.md' | grep -v node_modules | grep -v mcp/
```

### Step 4: Update CHANGELOG.md

Add a new section at the top under the `# Changelog` header:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...
```

Use `git log --oneline PREV_TAG..HEAD` (or since last version bump commit) to find all changes. Group by Added/Changed/Fixed/Removed.

### Step 5: Run full verification

All of these must pass before committing:

```bash
# Rust tests (includes unit + integration)
cargo test --workspace

# TypeScript tests in Node
./run-tests.sh

# Headless build (no GPU deps)
cargo check --no-default-features

# Type checking
cargo check
```

### Step 6: Commit and tag

```bash
git add core/Cargo.toml cli/Cargo.toml Cargo.lock \
  packages/runtime/package.json packages/create/package.json \
  templates/default/package.json README.md CHANGELOG.md

git commit -m "Bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

### Step 7: Publish packages

Follow the [Publishing Order](#publishing-order) section above.

### Step 8: Create GitHub Release

```bash
gh release create vX.Y.Z --title "Arcane vX.Y.Z" --notes-file - <<< "$(sed -n '/^## \[X.Y.Z\]/,/^## \[/{ /^## \[X.Y.Z\]/d; /^## \[/d; p; }' CHANGELOG.md)"
```

Or manually:
1. Go to GitHub Releases → "Draft a new release"
2. Select tag `vX.Y.Z`
3. Title: `Arcane vX.Y.Z — <one-line summary>`
4. Copy the CHANGELOG entry into the description

### Step 9: Update project status docs

After a release that completes a phase, update status in **all four places**:

| File | What to update |
|---|---|
| `MEMORY.md` | Line 4: current phase status + test counts |
| `CLAUDE.md` | Line 7: "Current status" sentence |
| `README.md` | "## Status" section |
| `docs/roadmap.md` | Phase checklists (mark items `[x]`) |

## Troubleshooting

### npm: Package name taken

If `@arcane-engine` org doesn't exist:
1. Create org: https://www.npmjs.com/org/create
2. Add collaborators with publish permissions
3. Retry publish

### crates.io: Name conflict

If package name is taken:
- Choose alternative: `arcane-game-engine`, `arcane2d`
- Update all references in code and docs

### Publish fails: Version already exists

Version numbers can't be reused. Increment version and republish:
```bash
# In package.json or Cargo.toml
version = "0.1.1"

# Commit and publish
git commit -am "Bump version to 0.1.1"
cargo publish
```

### Installation fails: Dependency not found

Wait 2-5 minutes for package indexes to update, then retry.

## Post-Release

- [ ] Announce on GitHub Discussions
- [ ] Update documentation links if needed
- [ ] Monitor issues for installation problems
- [ ] Update website/landing page (if applicable)

## Rolling Back

If a release has critical bugs:

1. **Yank the npm package:**
   ```bash
   npm unpublish @arcane-engine/runtime@0.1.0
   ```

2. **Yank the crate:**
   ```bash
   cargo yank --vers 0.1.0 arcane-cli
   ```

3. **Fix bug and release patch:**
   ```bash
   # Fix bug, update version to 0.1.1
   git commit -am "Fix critical bug"
   git tag v0.1.1
   # Republish
   ```

**Note:** Only yank in case of critical security issues or completely broken releases. Prefer publishing a patch version.

## CI/CD (Future)

Set up GitHub Actions for automated publishing:

```yaml
# .github/workflows/publish.yml
name: Publish
on:
  push:
    tags:
      - 'v*'
jobs:
  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  publish-crates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
      - run: cargo publish --token ${{ secrets.CARGO_TOKEN }}
```

---

**Happy publishing!** 📦
