#!/usr/bin/env bash
# Generate arcane.d.ts — the bundled API declaration file for scaffolded projects.
#
# Usage: ./scripts/generate-declarations.sh
#
# This script:
# 1. Runs tsc to generate individual .d.ts files from runtime source
# 2. Bundles them into a single file organized by module
# 3. Outputs to templates/default/types/arcane.d.ts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist-types"
OUT_DIR="$ROOT_DIR/templates/default/types"
OUT_FILE="$OUT_DIR/arcane.d.ts"

cd "$ROOT_DIR"

# Step 1: Generate .d.ts files
echo "Generating declarations..."
npx -p typescript tsc -p tsconfig.declarations.json

# Step 2: Bundle into a single file
echo "Bundling into arcane.d.ts..."
mkdir -p "$OUT_DIR"

# Module order matches documentation priority
MODULES=(
  "rendering:Rendering"
  "ui:UI"
  "state:State"
  "physics:Physics"
  "tweening:Tweening"
  "particles:Particles"
  "pathfinding:Pathfinding"
  "systems:Systems"
  "agent:Agent"
  "testing:Testing"
)

{
  echo "// Arcane Engine — TypeScript API Declarations"
  echo "// Generated from runtime source. Do not edit manually."
  echo "// Regenerate with: ./scripts/generate-declarations.sh"
  echo "//"
  echo "// Import from: @arcane/runtime/{module}"
  echo "// Modules: rendering, ui, state, physics, tweening, particles, pathfinding, systems, agent, testing"
  echo ""

  for entry in "${MODULES[@]}"; do
    dir="${entry%%:*}"
    label="${entry##*:}"

    module_dir="$DIST_DIR/$dir"
    if [ ! -d "$module_dir" ]; then
      echo "// WARNING: Module $dir not found, skipping"
      continue
    fi

    echo "// ============================================================================"
    echo "// Module: @arcane/runtime/$dir ($label)"
    echo "// ============================================================================"
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
      basename=$(basename "$dts_file")

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
    echo ""
  done
} > "$OUT_FILE"

# Step 3: Clean up
rm -rf "$DIST_DIR"

# Count output
LINES=$(wc -l < "$OUT_FILE")
echo "Generated $OUT_FILE ($LINES lines)"
