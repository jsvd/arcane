#!/usr/bin/env bash
set -euo pipefail

# E2E smoke test: simulates the full user experience of
# `arcane new` + `arcane test` + `arcane describe`
#
# Run from repo root: scripts/smoke-test.sh
# Requires: cargo (a built release binary, or builds one)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR=$(mktemp -d)
PROJECT="$TMPDIR/smoke-game"

cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

echo "=== Arcane E2E Smoke Test ==="
echo "Temp dir: $TMPDIR"
echo ""

# 1. Build release binary
echo "[1/5] Building release binary..."
cargo build --release --quiet 2>&1
ARCANE="$ROOT/target/release/arcane"
echo "  OK"

# 2. Scaffold a new project
echo "[2/5] Scaffolding project..."
"$ARCANE" new "$PROJECT"
echo "  OK"

# 3. Verify runtime was copied
echo "[3/5] Verifying runtime..."
if [ ! -d "$PROJECT/runtime/state" ]; then
  echo "  FAIL: runtime/state/ not found in project"
  exit 1
fi
# Verify no test files were copied
TEST_FILES=$(find "$PROJECT/runtime" -name '*.test.ts' 2>/dev/null | head -1)
if [ -n "$TEST_FILES" ]; then
  echo "  FAIL: test files found in runtime: $TEST_FILES"
  exit 1
fi
echo "  OK"

# 4. Run tests
echo "[4/5] Running arcane test..."
(cd "$PROJECT" && ARCANE_SKIP_TYPE_CHECK=1 "$ARCANE" test 2>&1)
echo "  OK"

# 5. Run describe (headless agent protocol)
echo "[5/5] Running arcane describe..."
DESCRIBE_OUT=$(cd "$PROJECT" && ARCANE_SKIP_TYPE_CHECK=1 "$ARCANE" describe src/visual.ts 2>&1)
if echo "$DESCRIBE_OUT" | grep -qi "error\|failed\|panic"; then
  echo "  FAIL: describe returned error:"
  echo "  $DESCRIBE_OUT"
  exit 1
fi
echo "  OK: $DESCRIBE_OUT"

echo ""
echo "=== All smoke tests passed! ==="
