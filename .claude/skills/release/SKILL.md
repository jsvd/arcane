---
name: release
description: Full release workflow — changelog, version bump, test, commit, tag, push, publish, GitHub release. Pass version as argument (e.g., /release 0.12.0) or omit to auto-determine.
allowed-tools: Bash, Read, Edit, Grep
---

Execute the full Arcane release workflow. The argument is an optional semver version string like `0.12.0`. If no version is provided, auto-determine the next version (see step 1).

## Steps

### 1. Determine current and new versions

Read `core/Cargo.toml` to find the current version (MAJOR.MINOR.PATCH).

Run `git log --oneline PREV_TAG..HEAD` (where PREV_TAG is the current version's tag, e.g., `v0.19.1`) to see all changes since the last release.

**If a version argument was provided**, use it as the new version.

**If no version argument was provided**, auto-determine the bump level by analyzing the commits since the last tag:

- **Minor bump** (0.X.0 → 0.X+1.0) if ANY commit introduces:
  - A new user-facing feature (new command, new skill, new API function, new demo)
  - A new runtime module or significant new capability
  - Breaking changes to existing APIs
  - Keywords in commit messages: "Add", "new", "feature", "implement", "introduce"

- **Patch bump** (0.X.Y → 0.X.Y+1) for everything else:
  - Bug fixes, doc updates, scaffold tweaks, refactors
  - Test improvements, CI changes, dependency updates
  - Template/skill improvements that don't add new capabilities
  - Keywords: "Fix", "update", "tweak", "improve", "bump", "clean", "refactor"

Print the determined version and the reasoning (which commits triggered minor vs patch) before proceeding.

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

### 6. Regenerate API declarations

```bash
scripts/generate-declarations.sh
```

If `templates/default/types/` has changes (check with `git diff --stat templates/default/types/`), they must be committed along with the version bump.

### 7. Update Cargo.lock

```bash
cargo check 2>&1 | tail -5
```

### 8. Verify no stale versions

```bash
grep -rn 'OLD_VERSION' --include='*.toml' --include='*.md' | grep -v node_modules | grep -v target/ | grep -v CHANGELOG
```

If any results appear, fix them before proceeding.

### 9. Commit, tag, and push

```bash
git add core/Cargo.toml cli/Cargo.toml Cargo.lock README.md CLAUDE.md CHANGELOG.md templates/default/types/
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

### 10. Publish to crates.io

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

### 11. Create GitHub Release

```bash
gh release create vX.Y.Z --title "Arcane vX.Y.Z" --notes "$(cat <<'RELEASE_EOF'
<paste the CHANGELOG entry here>

---

Install: `cargo install arcane-engine`
RELEASE_EOF
)"
```

Use the CHANGELOG entry as the release body. Add the install command at the bottom.

### 12. Print summary

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
