---
name: sprite
description: Find and setup sprites from Asset Palace. Downloads packs, generates atlas code. Usage: /sprite player spaceship, /sprite dungeon tiles
allowed-tools: Read, Grep, Glob, Bash, WebFetch
---

# /sprite - Find and setup sprites from Asset Palace

You are helping a game developer find and use sprites in their Arcane game.

## What You Do

1. **Search** Asset Palace for sprite packs matching the user's needs
2. **Download** the pack if not already present in `assets/`
3. **Generate** TypeScript code to load and draw the sprites

## Asset Palace Location

Asset Palace repository: https://github.com/anthropics/asset_palace

```
sprites/
  kenney/              # Kenney.nl packs (most common)
    space-shooter-redux.json
    tiny-dungeon.json
    ...
  opengameart/         # OpenGameArt packs
  itch/                # itch.io packs
  _index.json          # Pack catalog
```

## Workflow

### Step 1: Check if pack already downloaded

Before downloading, check if the pack exists:

```bash
ls assets/ 2>/dev/null
test -d assets/<pack-id> && test -f assets/<pack-id>.json && echo "EXISTS"
```

If exists, skip download and use existing files.

### Step 2: Search for packs

Fetch and search Asset Palace for matching packs:

```bash
# Get pack index
curl -s "https://raw.githubusercontent.com/anthropics/asset_palace/main/sprites/kenney/_index.json"

# Or fetch a specific pack definition
curl -s "https://raw.githubusercontent.com/anthropics/asset_palace/main/sprites/kenney/space-shooter-redux.json"
```

Look at:
- Pack names and descriptions
- `sprites` object keys (sprite names)
- `tags` object for categories like "player", "enemy", "terrain", "ui"

### Step 3: Download if needed

```bash
# Create assets directory
mkdir -p assets

# Get the pack definition
curl -o assets/space-shooter-redux.json \
  "https://raw.githubusercontent.com/anthropics/asset_palace/main/sprites/kenney/space-shooter-redux.json"

# Read downloadUrl from JSON and fetch the pack
DOWNLOAD_URL=$(cat assets/space-shooter-redux.json | grep -o '"downloadUrl"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
curl -L -o /tmp/pack.zip "$DOWNLOAD_URL"
unzip -o /tmp/pack.zip -d assets/space-shooter-redux/
rm /tmp/pack.zip
```

### Step 4: Find matching sprites

Read the pack JSON and find sprites matching the user's request:

```json
{
  "sprites": {
    "player-ship-blue": { "x": 211, "y": 941, "w": 99, "h": 75 },
    "ufo-red": { "x": 444, "y": 0, "w": 91, "h": 91 }
  },
  "tags": {
    "player": ["player-ship-blue", "player-ship-green"],
    "enemy": ["ufo-red", "ufo-green"]
  }
}
```

### Step 5: Generate code

Provide ready-to-use TypeScript using `loadAtlasFromDef()`:

```typescript
import { loadAtlasFromDef } from "@arcane/runtime/rendering";

// Sprite definitions from space-shooter-redux
const spaceAtlas = loadAtlasFromDef({
  id: "space-shooter-redux",
  primarySheet: "Spritesheet/sheet.png",
  sheetWidth: 1024,
  sheetHeight: 1024,
  sprites: {
    "player-ship-blue": { x: 211, y: 941, w: 99, h: 75 },
    "ufo-red": { x: 444, y: 0, w: 91, h: 91 },
  },
}, { basePath: "assets/space-shooter-redux/" });

// In your render function:
spaceAtlas.draw("player-ship-blue", { x: player.x, y: player.y, scale: 0.5 });
spaceAtlas.draw("ufo-red", { x: enemy.x, y: enemy.y });
```

## Output Format

Always provide:

1. **Pack name** and what it contains
2. **Sprite names** matching the request (with pixel dimensions)
3. **Download commands** (only if pack not already present)
4. **Complete TypeScript code** ready to copy-paste

## Example Interaction

**User:** `/sprite I need a player spaceship and some enemy UFOs`

**Response:**

Found **space-shooter-redux** (Kenney) with matching sprites:

**Player ships:**
- `player-ship-blue` (99×75 px)
- `player-ship-green` (99×75 px)
- `player-ship-orange` (99×75 px)

**Enemy UFOs:**
- `ufo-red` (91×91 px)
- `ufo-green` (91×91 px)
- `ufo-blue` (91×91 px)

```bash
# Download (run once)
mkdir -p assets
curl -o assets/space-shooter-redux.json "https://raw.githubusercontent.com/anthropics/asset_palace/main/sprites/kenney/space-shooter-redux.json"
curl -L -o /tmp/space.zip "https://kenney.nl/media/pages/assets/space-shooter-redux/..."
unzip -o /tmp/space.zip -d assets/space-shooter-redux/
```

```typescript
import { loadAtlasFromDef } from "@arcane/runtime/rendering";

const spaceAtlas = loadAtlasFromDef({
  id: "space-shooter-redux",
  primarySheet: "Spritesheet/sheet.png",
  sheetWidth: 1024,
  sheetHeight: 1024,
  sprites: {
    "player-ship-blue": { x: 211, y: 941, w: 99, h: 75 },
    "ufo-red": { x: 444, y: 0, w: 91, h: 91 },
    "ufo-green": { x: 434, y: 234, w: 91, h: 91 },
  },
}, { basePath: "assets/space-shooter-redux/" });

// Draw sprites (centered at position)
spaceAtlas.draw("player-ship-blue", { x: player.x, y: player.y, scale: 0.5 });
spaceAtlas.draw("ufo-red", { x: enemy.x, y: enemy.y });
```

## Atlas API Reference

```typescript
// Load atlas from definition
const atlas = loadAtlasFromDef(packDef, { basePath: "assets/pack-name/" });

// Draw a sprite (centered at x, y)
atlas.draw("sprite-name", { x, y, scale?, rotation?, layer?, flipX?, opacity?, tint? });

// Get SpriteOptions for manual drawSprite() call
const opts = atlas.sprite("sprite-name", { x, y, scale: 2 });
drawSprite(opts);

// Check if sprite exists
atlas.has("sprite-name");

// Get sprite dimensions
atlas.info("sprite-name"); // { w, h, frames }

// Get sprites by tag
atlas.getByTag("enemy"); // ["ufo-red", "ufo-green", ...]
```

## Important Notes

- Paths are relative to entry file. If entry is `src/visual.ts`, use `../assets/` or absolute paths.
- Atlas `draw()` centers sprites at the given position (unlike raw `drawSprite()` which uses top-left).
- For animated sprites, pass `frame` option: `atlas.draw("hero-walk", { x, y, frame: frameIndex })`.
- Sheet dimensions (`sheetWidth`, `sheetHeight`) are required for UV normalization.
