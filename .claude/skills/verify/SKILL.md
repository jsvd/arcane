---
name: verify
description: Run all tests, regenerate API declarations, and type-check a scaffolded project. The "did I break anything?" button. Use after any code change.
allowed-tools: Bash, Read
---

Full verification of the Arcane engine. Runs all tests, regenerates declarations, and type-checks a scaffolded project.

## Steps

Run these sequentially — each step must pass before proceeding.

### 1. Node TS tests
```bash
./run-tests.sh 2>&1
```
Extract pass/fail from `ℹ tests N` / `ℹ pass N` / `ℹ fail N`.

### 2. V8 TS tests
```bash
cargo run -- test 2>&1
```
Extract from `X passed, Y failed`.

### 3. Rust tests
```bash
cargo test --workspace 2>&1
```
Sum all `N passed` from `test result:` lines.

### 4. Headless compilation
```bash
cargo check --no-default-features 2>&1
```
Pass/fail only.

### 5. Regenerate API declarations
```bash
./scripts/generate-declarations.sh 2>&1
```
Report the module count and total line counts.

### 6. Type-check scaffolded project
```bash
TMPDIR=$(mktemp -d)
cargo run -- new "$TMPDIR/verify-check" 2>&1
cd "$TMPDIR/verify-check" && npx -p typescript tsc --noEmit 2>&1
RESULT=$?
cd - > /dev/null
rm -rf "$TMPDIR"
exit $RESULT
```
This verifies the generated declarations actually compile in a real project.

### 7. Check for declaration drift
```bash
git diff --stat templates/default/types/
```
If files changed, report which modules drifted.

## Output Format

```
## Verify Results

| Check              | Result | Details          |
|--------------------|--------|------------------|
| TS tests (Node)    | ✅     | XXXX passed      |
| TS tests (V8)      | ✅     | XXXX passed      |
| Rust tests         | ✅     | XXX passed       |
| Headless compile   | ✅     | —                |
| API declarations   | ✅     | N modules, M lines |
| Type-check         | ✅     | tsc --noEmit clean |
| Declaration drift  | ⚠️/✅  | N files changed / clean |

**Total: XXXX TS (Node) + XXXX (V8) + XXX Rust tests passing.**
```

If any check fails, show the error output and mark with ❌. Stop at the first failure unless it's declaration drift (which is a warning, not a blocker).
