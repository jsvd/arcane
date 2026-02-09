# Usage Example

This document demonstrates how an agent would use the `arcane-assets` MCP server to discover and download game assets.

## Scenario: Building a Platformer Game

An agent is tasked with creating a platformer demo and needs assets.

### Step 1: Discover Available Assets

**Agent searches for platformer assets:**

```typescript
// MCP Tool Call
search_kenney_assets({
  query: "platformer",
  type: "2d-sprites"
})
```

**Result:**
```json
{
  "packs": [
    {
      "id": "platformer-pack-redux",
      "name": "Platformer Pack Redux (360 assets)",
      "description": "Complete platformer art pack with characters, tiles, items, and enemies",
      "type": ["2d-sprites", "tilesets"],
      "license": "CC0",
      "tags": ["platformer", "character", "tiles", "pixel-art"]
    },
    {
      "id": "pixel-platformer",
      "name": "Pixel Platformer (220 assets)",
      "description": "Pixel art platformer pack with characters, tiles, and decorations",
      "type": ["2d-sprites", "tilesets"],
      "license": "CC0",
      "tags": ["platformer", "pixel-art", "retro"]
    },
    {
      "id": "abstract-platformer",
      "name": "Abstract Platformer (250 assets)",
      "description": "Colorful abstract shapes for platformer games",
      "type": ["2d-sprites"],
      "license": "CC0",
      "tags": ["platformer", "abstract", "shapes"]
    }
  ],
  "total": 3
}
```

### Step 2: Get Detailed Information

**Agent examines the top result:**

```typescript
// MCP Tool Call
get_kenney_asset({
  id: "platformer-pack-redux"
})
```

**Result:**
```json
{
  "id": "platformer-pack-redux",
  "name": "Platformer Pack Redux (360 assets)",
  "description": "Complete platformer art pack with characters, tiles, items, and enemies",
  "source": "kenney",
  "type": ["2d-sprites", "tilesets"],
  "license": "CC0",
  "url": "https://kenney.nl/assets/platformer-pack-redux",
  "downloadUrl": "https://kenney.nl/content/3-assets/145-platformer-pack-redux/platformerpackredux.zip",
  "tags": ["platformer", "character", "tiles", "pixel-art"]
}
```

### Step 3: Download the Asset Pack

**Agent downloads to project assets directory:**

```typescript
// MCP Tool Call
download_kenney_asset({
  id: "platformer-pack-redux",
  destination: "./demos/platformer/assets"
})
```

**Result:**
```json
{
  "success": true,
  "path": "./demos/platformer/assets/platformerpackredux.zip"
}
```

### Step 4: Extract and Organize

**Agent extracts the downloaded archive:**

```bash
# Agent runs bash command
cd demos/platformer/assets
unzip platformerpackredux.zip
rm platformerpackredux.zip
```

**Result structure:**
```
demos/platformer/assets/
└── platformerpackredux/
    ├── PNG/
    │   ├── Players/
    │   ├── Tiles/
    │   ├── Items/
    │   └── Enemies/
    ├── Spritesheet/
    │   └── spritesheet.png
    └── License.txt
```

### Step 5: Integrate into Game Code

**Agent updates the platformer demo to use the assets:**

```typescript
// demos/platformer/platformer-visual.ts
import { loadTexture } from "../../runtime/rendering/texture.ts";
import { drawSprite } from "../../runtime/rendering/sprites.ts";

// Load sprite sheet
const spriteSheet = loadTexture("./assets/platformerpackredux/Spritesheet/spritesheet.png");

// Use in game
function renderPlayer(state: GameState) {
  const player = state.entities.player;

  drawSprite({
    textureId: spriteSheet,
    x: player.position.x,
    y: player.position.y,
    width: 32,
    height: 32,
    // Calculate UV coordinates for player sprite in sheet
    uvX: 0,
    uvY: 0,
    uvWidth: 32,
    uvHeight: 32,
  });
}
```

### Step 6: Add UI Assets

**Agent searches for UI elements:**

```typescript
// MCP Tool Call
search_kenney_assets({
  query: "ui",
  type: "ui"
})
```

**Agent downloads UI pack:**

```typescript
// MCP Tool Call
download_kenney_asset({
  id: "ui-pack",
  destination: "./demos/platformer/assets"
})
```

### Step 7: Add Sound Effects

**Agent searches for audio:**

```typescript
// MCP Tool Call
search_kenney_assets({
  query: "impact",
  type: "audio"
})
```

**Agent downloads sound pack:**

```typescript
// MCP Tool Call
download_kenney_asset({
  id: "impact-sounds",
  destination: "./demos/platformer/assets"
})
```

## Scenario: Building a Roguelike

An agent needs dungeon assets for a roguelike game.

### Quick Search and Download

```typescript
// Search for dungeon assets
search_kenney_assets({ query: "dungeon", type: "tilesets" })

// Results: tiny-dungeon, roguelike-rpg-pack, 1-bit-pack

// Download tiny-dungeon for minimal pixel art style
download_kenney_asset({
  id: "tiny-dungeon",
  destination: "./demos/roguelike/assets"
})
```

## Benefits for Agent Workflow

1. **No manual browsing** - Agent searches programmatically
2. **Metadata-driven decisions** - Agent evaluates options based on structured data
3. **Automated downloads** - No copy-paste of URLs or manual clicks
4. **Consistent organization** - Assets downloaded to specified directories
5. **License-safe** - All Kenney assets are CC0, no attribution concerns

## Interactive Discovery

**Agent can explore the catalog systematically:**

```typescript
// List all available types
get_asset_types()
// Returns: ["2d-sprites", "3d-models", "audio", "fonts", "tilesets", "ui", "vfx"]

// List all searchable tags
get_tags()
// Returns: ["1-bit", "abstract", "audio", "blocks", "button", "dungeon", ...]

// Browse full catalog
list_kenney_assets()
// Returns: All 24 curated packs with metadata
```

## Error Handling

**If asset not found:**

```typescript
get_kenney_asset({ id: "nonexistent-pack" })
```

**Result:**
```json
{
  "content": [{ "type": "text", "text": "Asset pack 'nonexistent-pack' not found" }],
  "isError": true
}
```

**If download fails:**

```typescript
download_kenney_asset({
  id: "platformer-pack-redux",
  destination: "/invalid/path"
})
```

**Result:**
```json
{
  "success": false,
  "error": "EACCES: permission denied, mkdir '/invalid/path'"
}
```

## Next Steps

1. **Test the MCP server** - Use Claude Code to interact with the tools
2. **Extend catalog** - Add more Kenney packs as needed
3. **Add Freesound.org** - Integrate sound effects API
4. **Add itch.io** - Connect to community asset marketplace
5. **Create `/add-asset` skill** - Build interactive CLI skill using MCP tools
