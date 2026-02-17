#!/bin/bash
# Sync embedded data into cli/data/ for crate publishing.
# build.rs auto-syncs when building from the repo, but this script
# can be run manually to verify cli/data/ is fresh before publishing.
#
# Run this before: cargo publish -p arcane-engine --allow-dirty

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Triggering build.rs auto-sync via cargo check..."
(cd "$REPO_ROOT" && cargo check -p arcane-engine --quiet 2>&1)

echo "Done. cli/data/ is up to date."
echo "Now run: cargo publish -p arcane-engine --allow-dirty"
