#!/usr/bin/env bash
set -euo pipefail

echo "Running GPU-accelerated renderer tests..."
echo "These tests require a GPU and are skipped in CI."
echo ""

cargo test -p arcane-core -- --ignored --test-threads=1 "$@"
