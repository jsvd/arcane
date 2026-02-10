# Publishing Guide

Guide for publishing Arcane packages to npm and crates.io.

## Prerequisites

### npm
- npm account with 2FA enabled
- Access to `@arcane` organization (or create it)
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

1. **@arcane/runtime** (npm) — Core TypeScript runtime
2. **arcane-engine** (crates.io) — Rust core library
3. **arcane-cli** (crates.io) — CLI binary
4. **@arcane/create** (npm) — Project scaffolding tool

## 1. Publish @arcane/runtime

```bash
cd packages/runtime

# Verify package contents
npm pack --dry-run

# Publish to npm
npm publish --access public

# Verify installation
npm view @arcane/runtime
```

**Post-publish:**
- Test: `npm install @arcane/runtime`
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

```bash
cd cli

# Ensure arcane-engine dependency version is correct in Cargo.toml
# dependencies.arcane-engine = "0.1.0" (exact published version)

# Dry run
cargo publish --dry-run

# Publish
cargo publish
```

**Post-publish:**
- Verify: `cargo search arcane-cli`
- Test installation: `cargo install arcane-cli`
- Test command: `arcane --version`

## 4. Publish @arcane/create

```bash
cd packages/create

# Verify package contents
npm pack --dry-run

# Publish
npm publish --access public

# Verify
npm view @arcane/create
```

**Post-publish:**
- Test: `npm create @arcane/game test-project`
- Verify created project structure

## End-to-End Test

After all packages are published, test the complete workflow:

```bash
# 1. Install CLI
cargo install arcane-cli

# 2. Create a project (tests @arcane/create)
npm create @arcane/game test-game
cd test-game

# 3. Install dependencies (tests @arcane/runtime)
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

### 1. Update Version Numbers

Update version in all package files:
- `packages/runtime/package.json`
- `packages/create/package.json`
- `core/Cargo.toml`
- `cli/Cargo.toml`

### 2. Update CHANGELOG.md

Add release notes under `## [0.x.0] - YYYY-MM-DD`:

```markdown
## [0.1.0] - 2026-02-10

### Added
- Initial public release
- Core rendering, physics, audio, text, UI, animation
- Pathfinding with A* implementation
- Recipe framework with 4 built-in recipes
- Agent protocol for AI interaction
- Comprehensive documentation and tutorials
- Example projects (Sokoban, Tower Defense)

### Changed
- None (initial release)

### Fixed
- None (initial release)
```

### 3. Commit and Tag

```bash
git add .
git commit -m "Release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

### 4. Publish Packages

Follow the publishing order above.

### 5. Create GitHub Release

1. Go to https://github.com/anthropics/arcane/releases
2. Click "Draft a new release"
3. Select tag `v0.1.0`
4. Title: "Arcane v0.1.0 — Initial Release"
5. Copy CHANGELOG entry into description
6. Attach binary builds (optional)
7. Publish release

## Troubleshooting

### npm: Package name taken

If `@arcane` org doesn't exist:
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
   npm unpublish @arcane/runtime@0.1.0
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
