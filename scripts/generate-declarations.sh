#!/usr/bin/env bash
# Generate per-module .d.ts files — API declarations for scaffolded projects.
#
# Usage: ./scripts/generate-declarations.sh
#
# This script:
# 1. Runs tsc to generate individual .d.ts files from runtime source
# 2. Writes one declaration file per module to templates/default/types/
# 3. Removes old bundled arcane.d.ts if present

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist-types"
OUT_DIR="$ROOT_DIR/templates/default/types"

cd "$ROOT_DIR"

# Step 1: Generate .d.ts files
echo "Generating declarations..."
npx -p typescript tsc -p tsconfig.declarations.json

# Step 2: Write per-module declaration files
echo "Writing per-module declaration files..."
mkdir -p "$OUT_DIR"

# Remove old bundled file if present
if [ -f "$OUT_DIR/arcane.d.ts" ]; then
  rm "$OUT_DIR/arcane.d.ts"
  echo "Removed old arcane.d.ts"
fi

# Module order matches documentation priority
MODULES=(
  "rendering:Rendering"
  "game:Game"
  "input:Input"
  "ui:UI"
  "state:State"
  "physics:Physics"
  "tweening:Tweening"
  "particles:Particles"
  "pathfinding:Pathfinding"
  "systems:Systems"
  "scenes:Scenes"
  "persistence:Persistence"
  "procgen:Procedural Generation"
  "agent:Agent"
  "testing:Testing"
)

for entry in "${MODULES[@]}"; do
  dir="${entry%%:*}"
  label="${entry##*:}"

  module_dir="$DIST_DIR/$dir"
  if [ ! -d "$module_dir" ]; then
    echo "WARNING: Module $dir not found, skipping"
    continue
  fi

  out_file="$OUT_DIR/$dir.d.ts"

  {
    echo "// Arcane Engine — $label Module Declarations"
    echo "// Generated from runtime source. Do not edit manually."
    echo "// Regenerate with: ./scripts/generate-declarations.sh"
    echo "//"
    echo "// Import from: @arcane/runtime/$dir"
    echo ""
    echo "declare module \"@arcane/runtime/$dir\" {"

    # Collect all .d.ts files in the module (except index.d.ts)
    # Process types.d.ts first so type definitions appear before usage
    dts_files=()
    if [ -f "$module_dir/types.d.ts" ]; then
      dts_files+=("$module_dir/types.d.ts")
    fi
    for f in "$module_dir"/*.d.ts; do
      bn=$(basename "$f")
      if [ "$bn" = "index.d.ts" ] || [ "$bn" = "types.d.ts" ]; then
        continue
      fi
      dts_files+=("$f")
    done

    for dts_file in "${dts_files[@]}"; do
      # Read the file and indent, removing import/export from statements,
      # converting exports to plain declarations
      while IFS= read -r line; do
        # Skip empty import lines (import type { ... } from "./...")
        if [[ "$line" =~ ^import ]]; then
          continue
        fi
        # Skip re-export lines (export { ... } from "./...")
        if [[ "$line" =~ ^export\ \{.*\}\ from ]]; then
          continue
        fi
        # Skip export type re-exports
        if [[ "$line" =~ ^export\ type\ \{.*\}\ from ]]; then
          continue
        fi
        # Convert "export function" to "  export function"
        if [[ "$line" =~ ^export ]]; then
          echo "  $line"
        # Convert "declare " to "  export "
        elif [[ "$line" =~ ^declare\  ]]; then
          echo "  export ${line#declare }"
        # Pass through JSDoc and other lines with indentation
        elif [ -n "$line" ]; then
          echo "  $line"
        else
          echo ""
        fi
      done < "$dts_file"
      echo ""
    done

    echo "}"
  } > "$out_file"

  lines=$(wc -l < "$out_file")
  echo "  $dir.d.ts ($lines lines)"
done

# Step 3: Generate cheatsheet (compact one-liner signatures from all modules)
# Output is .txt (not .d.ts) so it never gets type-checked — it's a reference doc.
echo "Generating cheatsheet..."
CHEATSHEET="$OUT_DIR/cheatsheet.txt"
{
  echo "Arcane Engine — API Cheatsheet"
  echo "Generated from runtime source. Do not edit manually."
  echo "Regenerate with: ./scripts/generate-declarations.sh"
  echo ""
  echo "One-liner signatures for every exported function, grouped by module."
  echo "For full JSDoc, argument types, and examples, see the per-module .d.ts files in types/."
  echo ""

  for entry in "${MODULES[@]}"; do
    dir="${entry%%:*}"
    label="${entry##*:}"
    module_file="$OUT_DIR/$dir.d.ts"
    if [ ! -f "$module_file" ]; then
      continue
    fi

    echo "=== $dir (@arcane/runtime/$dir) ==="

    # Extract type names (one-liner summary)
    type_names=$(grep -E '^\s+export type \w+ ' "$module_file" 2>/dev/null | sed 's/.*export type \([A-Za-z_][A-Za-z0-9_]*\).*/\1/' | LC_ALL=C sort -u | tr '\n' ', ' | sed 's/, $//') || true
    if [ -n "$type_names" ]; then
      echo "Types: $type_names"
    fi

    # Extract function and const signatures, collapsing multi-line ones.
    # Tracks brace depth so "loop?: boolean;" inside {…} doesn't end the sig.
    # Inserts a separator before const declarations so read-only data (presets)
    # is visually distinct from callable functions.
    awk '
      BEGIN { buf = ""; depth = 0; lastKind = "" }
      /^[[:space:]]+export declare (function|const) / {
        sub(/^[[:space:]]+/, "")
        sub(/^export /, "")
        if ($0 ~ /^declare const / && lastKind != "const") {
          print "-- Constants (read-only data, not function parameters) --"
        }
        if ($0 ~ /^declare function / && lastKind == "const") {
          print "-- Functions --"
        }
        if ($0 ~ /^declare const /) lastKind = "const"
        else lastKind = "function"
        buf = $0
        depth = 0
        for (i = 1; i <= length($0); i++) {
          c = substr($0, i, 1)
          if (c == "{") depth++
          else if (c == "}") depth--
        }
        if (depth <= 0 && buf ~ /;[[:space:]]*$/) { print buf; buf = ""; depth = 0 }
        next
      }
      { if (buf != "") {
          sub(/^[[:space:]]+/, "")
          buf = buf " " $0
          for (i = 1; i <= length($0); i++) {
            c = substr($0, i, 1)
            if (c == "{") depth++
            else if (c == "}") depth--
          }
          if (depth <= 0 && buf ~ /;[[:space:]]*$/) { print buf; buf = ""; depth = 0 }
        }
      }
    ' "$module_file" || true

    echo ""
  done
} > "$CHEATSHEET"
cheatsheet_lines=$(wc -l < "$CHEATSHEET")
echo "  cheatsheet.txt ($cheatsheet_lines lines)"

# Step 4: Clean up
rm -rf "$DIST_DIR"

echo ""
echo "Done. Per-module declarations written to $OUT_DIR/"
