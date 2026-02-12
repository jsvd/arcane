#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/bump-version.sh <new-version>
# Example: scripts/bump-version.sh 0.5.1

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new-version>"
  echo "Example: $0 0.5.1"
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

# 2. cli/Cargo.toml — package version + arcane-engine dependency
sed -i '' "s/^version = \"$OLD\"/version = \"$NEW\"/" "$ROOT/cli/Cargo.toml"
sed -i '' "s/arcane-engine = { version = \"$OLD\"/arcane-engine = { version = \"$NEW\"/" "$ROOT/cli/Cargo.toml"

# 3. packages/create/package.json — version + peerDependencies
sed -i '' "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" "$ROOT/packages/create/package.json"
sed -i '' "s/\"arcane-cli\": \"^$OLD\"/\"arcane-cli\": \"^$NEW\"/" "$ROOT/packages/create/package.json"

# 4. packages/runtime/package.json — version
sed -i '' "s/\"version\": \"$OLD\"/\"version\": \"$NEW\"/" "$ROOT/packages/runtime/package.json"

# 5. templates/default/package.json — runtime dependency
sed -i '' "s/\"@arcane-engine\/runtime\": \"^$OLD\"/\"@arcane-engine\/runtime\": \"^$NEW\"/" "$ROOT/templates/default/package.json"

# 6. README.md — published package links
sed -i '' "s/@$OLD/@$NEW/g" "$ROOT/README.md"

# 7. Regenerate Cargo.lock
echo "Regenerating Cargo.lock..."
(cd "$ROOT" && cargo check --quiet 2>&1)

# Verify no stale references remain in project-owned files
FILES=(
  "$ROOT/core/Cargo.toml"
  "$ROOT/cli/Cargo.toml"
  "$ROOT/packages/create/package.json"
  "$ROOT/packages/runtime/package.json"
  "$ROOT/templates/default/package.json"
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
echo "  git add -p && git commit -m 'Bump to v$NEW'"
echo "  git tag v$NEW"
