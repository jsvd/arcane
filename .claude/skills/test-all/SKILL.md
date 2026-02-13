---
name: test-all
description: Run all Arcane test suites (Node TS, V8 TS, Rust) and the headless compilation check. Reports a unified summary with pass counts.
allowed-tools: Bash
---

Run all four Arcane verification steps and report a unified summary.

## Steps

Run these commands **sequentially** (each depends on the previous to give a clear report):

### 1. Node TS tests
```bash
./run-tests.sh 2>&1
```
Extract the total pass/fail count from the output. Node's test runner prints a summary like `# tests N` / `# pass N` / `# fail N`.

### 2. V8 TS tests
```bash
cargo run -- test 2>&1
```
Extract the pass/fail count. The V8 runner prints `X passed, Y failed` at the end.

### 3. Rust tests
```bash
cargo test --workspace 2>&1
```
Extract the summary line (`test result: ok. N passed; 0 failed`).

### 4. Headless compilation check
```bash
cargo check --no-default-features 2>&1
```
This verifies the engine compiles without the `renderer` feature (headless mode). Report pass/fail.

## Output Format

After all four complete, print a summary table:

```
## Test Results

| Suite            | Passed | Failed | Status |
|------------------|--------|--------|--------|
| TS (Node)        |   XXXX |      0 | pass   |
| TS (V8)          |   XXXX |      0 | pass   |
| Rust             |    XXX |      0 | pass   |
| Headless check   |      — |      — | pass   |

**Total: XXXX TS (Node) + XXXX (V8) + XXX Rust tests passing.**
```

If any suite fails, show the failure output and mark the status as **FAIL**.

The "Total" line format matters — it's copy-pasted into CLAUDE.md, README.md, and MEMORY.md status lines.
