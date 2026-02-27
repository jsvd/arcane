---
name: sprite
description: Open visual sprite selector to browse and pick sprites from CC0 asset packs. User selects in browser, you generate code.
allowed-tools: Read, Bash, Write, Edit
---

# /sprite - Visual Sprite Selector

Opens Asset Palace's visual UI for the user to browse and select sprites. You generate code from their selection.

## Workflow

### Step 1: Find Asset Palace

Check for Asset Palace in common locations:

```bash
# Check if ASSET_PALACE_PATH is set
echo "${ASSET_PALACE_PATH:-not set}"

# Check common sibling locations
test -f ../asset_palace/package.json && echo "Found at ../asset_palace"
test -f ../../asset_palace/package.json && echo "Found at ../../asset_palace"
```

If not found, tell user:
> Asset Palace not found. Clone it from https://github.com/jsvd/asset_palace and set ASSET_PALETTE_PATH or place it as a sibling directory.

### Step 2: Launch Sprite Selector

Run the catalog server. It opens a browser and waits for user selection:

```bash
# If at sibling path:
npm --prefix ../asset_palace run catalog

# Or with specific pack:
npm --prefix ../asset_palette run catalog tiny-dungeon
```

**Tell the user:**
> Opening sprite selector in your browser. Browse packs, click to download, select the sprites you need, name them, then click "Copy & Close" to return. You can select from multiple packs — the cart persists across pages. Use the file dropdown in sheet view to switch between PNG files in the pack.

### Step 3: Capture Selection

The catalog uses a persistent cart — users can select sprites from multiple packs before clicking "Copy & Close". The server outputs JSON to stdout:

**Single pack selected:**
```json
{
  "packId": "tiny-dungeon",
  "packName": "Tiny Dungeon",
  "source": "kenney",
  "type": "sheet",
  "sheetPath": "Tilemap/tilemap_packed.png",
  "sheetWidth": 192,
  "sheetHeight": 176,
  "tileSize": 16,
  "spacing": 0,
  "gridOffset": { "x": 0, "y": 0 },
  "sprites": {
    "hero-knight": { "x": 16, "y": 96, "w": 16, "h": 16 },
    "skeleton": { "x": 32, "y": 96, "w": 16, "h": 16 }
  },
  "cachePath": "/Users/you/.cache/arcane/packs/tiny-dungeon"
}
```

**Multiple packs selected (array):**
```json
[
  {
    "packId": "tiny-dungeon",
    "packName": "Tiny Dungeon",
    "source": "kenney",
    "type": "sheet",
    "sheetPath": "Tilemap/tilemap_packed.png",
    "sprites": { "hero": { "x": 0, "y": 96, "w": 16, "h": 16 } },
    "cachePath": "..."
  },
  {
    "packId": "rpg-urban",
    "packName": "RPG Urban Kit",
    "source": "kenney",
    "type": "gallery",
    "sprites": { "barrel": { "path": "Sprites/barrel.png" } },
    "cachePath": "..."
  }
]
```

When the output is an array, generate code for each pack entry separately. The `type` field indicates whether sprites use sheet coordinates (`x`/`y`/`w`/`h`) or individual file paths (`path`).

### Step 4: Copy Assets to Project

Copy the downloaded pack to the project's assets directory:

```bash
mkdir -p assets
cp -r "/path/from/cachePath" "assets/tiny-dungeon"
```

### Step 5: Generate Code

Generate `loadAtlasFromDef()` code from the selection:

```typescript
import { loadAtlasFromDef } from "@arcane/runtime/rendering";

// Sprites from Tiny Dungeon (kenney.nl, CC0)
const dungeonAtlas = loadAtlasFromDef({
  id: "tiny-dungeon",
  primarySheet: "Tilemap/tilemap.png",
  sheetWidth: 192,
  sheetHeight: 176,
  sprites: {
    "hero-knight": { x: 16, y: 96, w: 16, h: 16 },
    "skeleton": { x: 32, y: 96, w: 16, h: 16 },
  },
}, { basePath: "assets/tiny-dungeon/" });

// Usage:
// dungeonAtlas.draw("hero-knight", { x: 100, y: 100 });
// dungeonAtlas.draw("skeleton", { x: 200, y: 100, scale: 2 });
```

## Field Mapping (type: "sheet")

| Selection JSON | loadAtlasFromDef field |
|----------------|------------------------|
| `packId` | `id` |
| `sheetPath` | `primarySheet` |
| `sheetWidth` | `sheetWidth` |
| `sheetHeight` | `sheetHeight` |
| `sprites` | `sprites` (copy verbatim — `{x, y, w, h}`) |
| `cachePath` | source for `cp -r` |
| `packId` | `basePath: "assets/{packId}/"` |

For `type: "gallery"` entries, sprites have `{ path }` instead of `{x, y, w, h}`. Use `loadTexture()` for each individual sprite file.

## Atlas API Quick Reference

```typescript
// Draw sprite centered at position
atlas.draw("sprite-name", { x, y, scale?, rotation?, flipX?, opacity?, tint?, layer? });

// Get SpriteOptions for manual drawSprite()
const opts = atlas.sprite("sprite-name", { x, y });

// Check existence
atlas.has("sprite-name");

// Get dimensions
atlas.info("sprite-name"); // { w, h, frames? }

// Get by tag (if defined)
atlas.getByTag("enemy");
```

## Example Session

**User:** `/sprite`

**You:** Opening sprite selector in your browser...

```bash
npm --prefix ../asset_palace run catalog
```

> Browse packs, select sprites, name them, click "Copy & Close" when done.

*[User selects sprites, server outputs JSON]*

**You:** Got your selection! Setting up the assets...

```bash
mkdir -p assets
cp -r "/Users/you/asset_palace/.cache/tiny-dungeon" "assets/tiny-dungeon"
```

Here's the code to use your sprites:

```typescript
import { loadAtlasFromDef } from "@arcane/runtime/rendering";

const dungeonAtlas = loadAtlasFromDef({
  id: "tiny-dungeon",
  primarySheet: "Tilemap/tilemap.png",
  sheetWidth: 192,
  sheetHeight: 176,
  sprites: {
    "hero-knight": { x: 16, y: 96, w: 16, h: 16 },
    "skeleton": { x: 32, y: 96, w: 16, h: 16 },
  },
}, { basePath: "assets/tiny-dungeon/" });
```

**Sprites available:**
- `hero-knight` (16x16)
- `skeleton` (16x16)

## Notes

- Asset paths are relative to your entry file. Adjust `basePath` if entry is in a subdirectory.
- The `draw()` method centers sprites at the position. Use `atlas.sprite()` + `drawSprite()` for top-left positioning.
- For animations, use `frame` option: `atlas.draw("walk", { x, y, frame: idx })`
