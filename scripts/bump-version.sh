#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/bump-version.sh <new-version>
# Example: scripts/bump-version.sh 0.12.0

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new-version>"
  echo "Example: $0 0.12.0"
  exit 1
fi

NEW="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Detect current version from core/Cargo.toml
OLD=$(grep '^version = ' "$ROOT/core/Cargo.toml" | head -1 | sed 's/version = "\(.*\)"/\1/')

if [ "$OLD" = "$NEW" ]; then
  echo "Already at version $NEW"
  exit 0
fi

echo "Bumping $OLD → $NEW"

# 1. core/Cargo.toml — package version
sed -i '' "s/^version = \"$OLD\"/version = \"$NEW\"/" "$ROOT/core/Cargo.toml"

# 2. cli/Cargo.toml — package version + arcane-core dependency
sed -i '' "s/^version = \"$OLD\"/version = \"$NEW\"/" "$ROOT/cli/Cargo.toml"
sed -i '' "s/arcane-core = { version = \"$OLD\"/arcane-core = { version = \"$NEW\"/" "$ROOT/cli/Cargo.toml"

# 3. Regenerate Cargo.lock
echo "Regenerating Cargo.lock..."
(cd "$ROOT" && cargo check --quiet 2>&1)

# Verify no stale references remain in project-owned files
FILES=(
  "$ROOT/core/Cargo.toml"
  "$ROOT/cli/Cargo.toml"
)
STALE=$(grep -n "$OLD" "${FILES[@]}" 2>/dev/null || true)
if [ -n "$STALE" ]; then
  echo ""
  echo "WARNING: Stale references to $OLD found:"
  echo "$STALE"
  exit 1
fi

echo ""
echo "Done! Files updated:"
git -C "$ROOT" diff --stat
echo ""
echo "Next steps:"
echo "  # Update README.md status section version"
echo "  git add -p && git commit -m 'Bump to v$NEW'"
echo "  git tag v$NEW"
echo "  git push && git push --tags"
echo ""
echo "Publish:"
echo "  cargo publish -p arcane-core"
echo "  cargo publish -p arcane-engine --allow-dirty"
