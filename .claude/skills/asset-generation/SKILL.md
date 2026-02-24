---
name: asset-generation
description: Generate sprite assets, tilesets, and sprite sheets for an Arcane game project using AI image generation backends. Guides you through SDF-first decisions, MCP tool calls, and post-processing.
argument-hint: "[description of asset needed]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, WebFetch
---

Generate game assets for an Arcane project. Before generating a sprite, always consider whether an SDF shape would work instead (see Step 1).

Asset description: $ARGUMENTS

## Step 1: SDF or Sprite?

Before generating any image asset, evaluate whether the request can be fulfilled with an SDF shape. Check `docs/sdf-shapes.md` for existing recipes.

**Use SDF (skip image generation) when the asset is:**
- A platform, terrain piece, or ground tile
- A simple collectible (coin, gem, star, heart, key)
- A background element (cloud, mountain, tree, rock, bush)
- A UI element (button shape, indicator, icon)
- An effect (glow, particle, halo)

**Generate a sprite when the asset is:**
- A player character or NPC
- A creature or enemy with distinct features
- An item that needs artistic detail (ornate armor, magical weapon)
- A tileset with specific art style (pixel art dungeon, hand-painted terrain)
- An animation sequence (walk cycle, attack frames)

If SDF is appropriate, provide the SDF recipe from `docs/sdf-shapes.md` or compose a new one. Do NOT proceed to image generation.

## Step 2: Check Project Palette

Before generating, read the project's color palette to ensure visual consistency.

Look for palette definitions in:
1. `manifest.json` (palette section)
2. `src/palette.ts` or `src/constants.ts`
3. Existing sprite assets in `assets/` (inspect dominant colors)

If no palette exists, suggest establishing one based on the game's mood:

```ts
// Example palettes
const FANTASY = { bg: "#1a1a2e", primary: "#3366cc", accent: "#ffdd44", danger: "#cc4444" };
const NATURE  = { bg: "#2a3a2a", ground: "#5a4a3a", grass: "#3a7a2a", sky: "#6aaace" };
const DUNGEON = { bg: "#0a0a14", stone: "#4a4a5a", torch: "#ff8822", blood: "#880022" };
```

## Step 3: Determine Asset Specifications

For the requested asset, determine:

- **Size**: Standard sizes are 16x16, 24x24, 32x32, 48x48, 64x64, 128x128
- **Style**: Match existing assets (pixel art, painterly, flat, outlined)
- **Transparency**: Almost always yes (transparent background)
- **Format**: PNG with alpha channel
- **Count**: Single sprite, or sprite sheet with multiple frames?

For sprite sheets, determine:
- Frame count and layout (e.g., 4x1 walk cycle, 4x4 full character sheet)
- Frame size and total sheet dimensions

## Step 4: Generate Using MCP Backend

### Draw Things (macOS, recommended)

```bash
# Check if Draw Things is running
curl -s http://127.0.0.1:7888/sdapi/v1/options | head -c 100
```

MCP tool call format:
```json
{
  "prompt": "pixel art knight idle pose, 32x48, transparent background, game sprite",
  "negative_prompt": "blurry, realistic, photo, background, border, frame",
  "width": 32,
  "height": 48,
  "steps": 20,
  "cfg_scale": 7.0,
  "sampler": "euler_a"
}
```

### ComfyUI (cross-platform)

```bash
# Check if ComfyUI is running
curl -s http://127.0.0.1:8188/history | head -c 100
```

### DiffusionKit (Apple Silicon)

```bash
# Check if DiffusionKit CLI is available
which diffusionkit 2>/dev/null
```

### Prompt Engineering Tips

For game sprites:
- Always include: art style, size, "transparent background", "game sprite"
- For pixel art: "pixel art, low resolution, sharp pixels, no anti-aliasing"
- For painterly: "digital painting, game asset, clean edges"
- Negative prompt should always include: "blurry, realistic, photo, border, frame, watermark"
- Include palette colors in prompt when possible: "using colors #3366cc and #ffdd44"

## Step 5: Post-Processing

After generation, process the image:

### Background Removal (if needed)

```bash
# Using ImageMagick (convert white background to transparent)
convert input.png -fuzz 10% -transparent white output.png

# Or using sharp (Node.js)
npx sharp-cli --input input.png --flatten false --output output.png
```

### Size Normalization

```bash
# Resize to exact game dimensions
convert input.png -resize 32x48! -filter Point output.png  # pixel art (nearest neighbor)
convert input.png -resize 32x48! output.png                 # painterly (bilinear)
```

### Sprite Sheet Assembly

```bash
# Combine individual frames into a horizontal strip
convert frame1.png frame2.png frame3.png frame4.png +append spritesheet.png
```

## Step 6: Register in Project

### Save the Asset

```bash
# Standard directory structure
mkdir -p assets/sprites
mkdir -p assets/tilesets
mkdir -p assets/ui
```

Save to the appropriate directory based on asset type.

### Update Manifest (if exists)

Add the new asset to `manifest.json`:

```json
{
  "sprites": {
    "new-asset-name": {
      "path": "assets/sprites/new-asset.png",
      "size": [32, 48],
      "tags": ["character", "player"],
      "generated": true,
      "prompt": "the prompt used to generate this"
    }
  }
}
```

### Write Loading Code

```ts
import { loadTexture } from "@arcane/runtime/rendering";

// In preload/init:
const tex = loadTexture("assets/sprites/new-asset.png");

// In render:
drawSprite({ textureId: tex, x: 100, y: 200, w: 32, h: 48, layer: 5 });
```

For sprite sheets, use the atlas API:

```ts
import { loadAtlasFromDef } from "@arcane/runtime/rendering";

const atlas = await loadAtlasFromDef({
  id: "player",
  primarySheet: "assets/sprites/player-sheet.png",
  sheetWidth: 128,
  sheetHeight: 48,
  sprites: {
    "idle":  { x: 0,  y: 0, w: 32, h: 48 },
    "walk1": { x: 32, y: 0, w: 32, h: 48 },
    "walk2": { x: 64, y: 0, w: 32, h: 48 },
    "walk3": { x: 96, y: 0, w: 32, h: 48 },
  },
});
```

## Step 7: Verify

After asset integration:

1. Confirm the texture loads without errors in `arcane dev`
2. Verify the asset matches the project's visual style
3. Check that SDF shapes and sprites use consistent colors
4. Update any documentation or README with the new asset

## Quick Reference: SDF vs Generate Decision Tree

```
Need a visual asset?
  |
  +-- Is it a simple shape? (platform, coin, tree, cloud)
  |     YES --> Use SDF recipe from docs/sdf-shapes.md
  |
  +-- Is it a character, creature, or detailed item?
  |     YES --> Generate sprite (continue to Step 2)
  |
  +-- Is it a tileset or repeating pattern?
  |     YES --> Generate sprite sheet (continue to Step 2)
  |
  +-- Is it an effect? (glow, particle, explosion)
        YES --> Use SDF with glow fill, or geometry pipeline shapes
```
