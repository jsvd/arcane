#!/bin/bash
# Sync embedded data into cli/data/ for crate publishing.
# Source of truth: templates/, assets/ at repo root.
# Recipes are distributed via npm, not embedded in the crate.
# Run this before: cargo publish -p arcane-cli --allow-dirty

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$REPO_ROOT/cli/data"

echo "Syncing embedded data for arcane-cli..."

rm -rf "$DATA_DIR"
mkdir -p "$DATA_DIR/templates"

cp -r "$REPO_ROOT/templates/default" "$DATA_DIR/templates/default"
cp -r "$REPO_ROOT/assets" "$DATA_DIR/assets"

echo "Done. cli/data/ is up to date."
echo "Now run: cargo publish -p arcane-cli --allow-dirty"
