---
name: phase-complete
description: Run the phase completion checklist. Runs all tests, discovers new files, and updates status lines in CLAUDE.md, README.md, MEMORY.md, and docs/roadmap.md.
argument-hint: "[phase-number] [phase-name]"
allowed-tools: Bash, Read, Edit, Grep, Glob
disable-model-invocation: true
---

Complete the phase transition for Phase $ARGUMENTS.

## Step 1: Run all test suites

Run all four verification steps and capture exact counts:

```bash
./run-tests.sh 2>&1
cargo run -- test 2>&1
cargo test --workspace 2>&1
cargo check --no-default-features 2>&1
```

Extract: Node TS pass count, V8 TS pass count, Rust pass count. All must pass.

## Step 2: Discover what changed

Find new files added since the last git tag or significant commit:

```bash
git diff --name-status $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD -- runtime/ core/src/ cli/src/ demos/
```

Identify:
- New runtime modules (new directories under `runtime/`)
- New Rust modules (new `.rs` files under `core/src/`)
- New demos (new directories under `demos/`)
- New CLI commands

## Step 3: Regenerate API declarations

```bash
./scripts/generate-declarations.sh
```

Check if `templates/default/types/arcane.d.ts` changed. If so, it needs to be committed.

## Step 4: Update status lines

Update the test counts and phase status in these files. The format for the status line is:

```
XXXX TS (Node) + XXXX (V8) + XXX Rust tests passing
```

Files to update:
1. **CLAUDE.md** — Status line at top (`Current status: ...`), key files section if new modules added
2. **README.md** — Test count badges/status, feature list, demo count
3. **MEMORY.md** (`~/.claude/projects/-Users-arkham-project-arcane/memory/MEMORY.md`) — Current Phase section, test counts, new key files
4. **docs/roadmap.md** — Mark the phase as `Complete`, add deliverable checkmarks

## Step 5: Update CLAUDE.md repository tree

If new directories or key files were added, update the repository structure tree in CLAUDE.md. Keep descriptions concise (one line each).

## Step 6: Summary

Print a summary of everything that was updated:
- Test counts (old -> new)
- Files modified
- New modules/demos discovered
- Any issues found

Do NOT commit — leave that to the user.
