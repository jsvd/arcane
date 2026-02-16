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

# Step 3: Clean up
rm -rf "$DIST_DIR"

echo ""
echo "Done. Per-module declarations written to $OUT_DIR/"
