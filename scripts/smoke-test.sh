#!/usr/bin/env bash
set -euo pipefail

# E2E smoke test: simulates the full user experience of
# `arcane new` + `npm install` + `arcane test` + `arcane describe`
#
# Run from repo root: scripts/smoke-test.sh
# Requires: cargo, npm, a built release binary (or builds one)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR=$(mktemp -d)
PROJECT="$TMPDIR/smoke-game"

cleanup() {
  rm -rf "$TMPDIR"
  # Clean up any tarball left by npm pack
  rm -f "$ROOT/packages/runtime/arcane-engine-runtime-"*.tgz
}
trap cleanup EXIT

echo "=== Arcane E2E Smoke Test ==="
echo "Temp dir: $TMPDIR"
echo ""

# 1. Build release binary
echo "[1/6] Building release binary..."
cargo build --release --quiet 2>&1
ARCANE="$ROOT/target/release/arcane"
echo "  OK"

# 2. Pack the npm runtime (tests that prepack copies src/ correctly)
echo "[2/6] Packing @arcane-engine/runtime..."
(cd "$ROOT/packages/runtime" && npm pack 2>&1 >/dev/null)
TARBALL_PATH=$(ls "$ROOT/packages/runtime"/arcane-engine-runtime-*.tgz 2>/dev/null | head -1)
if [ -z "$TARBALL_PATH" ]; then
  echo "  FAIL: npm pack did not create a tarball"
  exit 1
fi
# Verify the tarball contains src/ files
TAR_FILES=$(tar tzf "$TARBALL_PATH" | head -30)
if ! echo "$TAR_FILES" | grep -q 'src/state'; then
  echo "  FAIL: tarball missing src/ directory"
  exit 1
fi
echo "  OK ($(basename "$TARBALL_PATH"))"

# 3. Scaffold a new project
echo "[3/6] Scaffolding project..."
"$ARCANE" new "$PROJECT"
echo "  OK"

# 4. Install the local tarball (simulates npm install from registry)
echo "[4/6] Installing runtime from tarball..."
(cd "$PROJECT" && npm install "$TARBALL_PATH" --quiet 2>&1)
# Verify src/ exists in installed package
if [ ! -d "$PROJECT/node_modules/@arcane-engine/runtime/src/state" ]; then
  echo "  FAIL: installed package missing src/state/"
  exit 1
fi
echo "  OK"

# 5. Run tests
echo "[5/6] Running arcane test..."
(cd "$PROJECT" && ARCANE_SKIP_TYPE_CHECK=1 "$ARCANE" test 2>&1)
echo "  OK"

# 6. Run describe (headless agent protocol)
echo "[6/6] Running arcane describe..."
DESCRIBE_OUT=$(cd "$PROJECT" && ARCANE_SKIP_TYPE_CHECK=1 "$ARCANE" describe src/visual.ts 2>&1)
if echo "$DESCRIBE_OUT" | grep -qi "error\|failed\|panic"; then
  echo "  FAIL: describe returned error:"
  echo "  $DESCRIBE_OUT"
  exit 1
fi
echo "  OK: $DESCRIBE_OUT"

echo ""
echo "=== All smoke tests passed! ==="
