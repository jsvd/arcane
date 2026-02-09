# Asset Management

How to discover, download, and integrate game assets in Arcane.

## Overview

Arcane provides agent-native tools for working with freely available game assets. Instead of manually browsing websites and downloading files, you can use MCP tools to search, discover, and integrate assets directly into your game.

## Architecture

```
┌─────────────────────┐
│   Claude Code       │
│   (Agent)           │
└──────────┬──────────┘
           │
           │ uses MCP tools
           ▼
┌─────────────────────┐
│ arcane-assets MCP   │
│ Server              │
└──────────┬──────────┘
           │
           │ fetches from
           ▼
┌─────────────────────┐
│ Asset Sources:      │
│ - Kenney.nl (CC0)   │
│ - Freesound.org     │
│ - itch.io           │
└─────────────────────┘
```

## Asset Sources

### Kenney.nl (Implemented) ✅

- **License**: CC0 (public domain), no attribution required
- **Quality**: Professionally made, consistent style
- **Quantity**: 60,000+ assets across 24+ curated packs
- **Categories**: 2D sprites, tilesets, UI, audio, fonts, VFX
- **Integration**: Direct download via MCP tools

**Popular Packs:**
- Platformer Pack Redux (360 assets)
- Roguelike RPG Pack (1366 assets)
- Tiny Dungeon (234 assets)
- UI Pack (322 assets)
- Digital Audio (626 sounds)

### Freesound.org (Planned)

- **License**: Creative Commons (various)
- **API**: Full REST API with search and download
- **Quantity**: Massive library of sound effects
- **Integration**: MCP tools with user API key

### itch.io (Planned)

- **License**: Various (check per-asset)
- **API**: Download API available
- **Quantity**: 60,000+ community-contributed assets
- **Integration**: MCP tools with user API key

## MCP Server Setup

The `arcane-assets` MCP server provides tools for asset discovery and download.

### Installation

1. Navigate to the MCP server directory:
   ```bash
   cd mcp/arcane-assets
   npm install
   npm run build
   ```

2. Add to your MCP configuration (`~/.claude/mcp.json`):
   ```json
   {
     "mcpServers": {
       "arcane-assets": {
         "command": "node",
         "args": ["/absolute/path/to/arcane/mcp/arcane-assets/dist/index.js"],
         "disabled": false
       }
     }
   }
   ```

3. Restart Claude Code to load the MCP server.

### Available Tools

#### `list_kenney_assets`

List all available Kenney.nl asset packs.

**Returns:** Complete catalog with metadata (name, description, type, license, download URL, tags)

#### `search_kenney_assets`

Search Kenney.nl asset packs by keyword.

**Parameters:**
- `query` (string): Search term (e.g., "platformer", "dungeon", "ui")
- `type` (optional): Filter by type (`2d-sprites`, `ui`, `audio`, `fonts`, `vfx`, `tilesets`)

**Example:**
```typescript
search_kenney_assets({ query: "platformer", type: "2d-sprites" })
```

#### `get_kenney_asset`

Get detailed information about a specific pack.

**Parameters:**
- `id` (string): Asset pack ID (e.g., "tiny-dungeon")

#### `download_kenney_asset`

Download an asset pack to a local directory.

**Parameters:**
- `id` (string): Asset pack ID
- `destination` (string): Destination directory path

**Returns:** Download result with success status and file path

**Example:**
```typescript
download_kenney_asset({
  id: "platformer-pack-redux",
  destination: "./assets"
})
```

#### `get_asset_types`

Get all asset types available in the catalog.

#### `get_tags`

Get all tags used in the catalog (useful for discovering keywords).

## Agent Workflow

### Discovery

1. **Agent analyzes game requirements**
   - Identifies needed asset types (sprites, sounds, UI, etc.)
   - Determines art style preferences (pixel art, abstract, realistic)

2. **Agent searches for assets**
   ```typescript
   // Search for dungeon tilesets
   const results = search_kenney_assets({
     query: "dungeon",
     type: "tilesets"
   });

   // Review results: tiny-dungeon, roguelike-rpg-pack, 1-bit-pack
   ```

3. **Agent evaluates options**
   - Reviews pack metadata (asset count, description, tags)
   - Gets detailed info with `get_kenney_asset()`
   - Considers license, style, completeness

### Download

4. **Agent downloads selected pack**
   ```typescript
   const result = download_kenney_asset({
     id: "tiny-dungeon",
     destination: "./demos/roguelike/assets"
   });
   // Returns: { success: true, path: "./demos/roguelike/assets/tinydungeon.zip" }
   ```

### Integration

5. **Agent extracts and organizes**
   - Unzips downloaded file
   - Organizes into project structure
   - Documents asset attribution (if required)

6. **Agent writes integration code**
   ```typescript
   import { loadTexture } from "../../runtime/rendering/texture.ts";

   // Load dungeon tileset
   const dungeonTiles = loadTexture("./assets/tinydungeon/Tilemap/tilemap_packed.png");
   ```

## Best Practices

### Asset Organization

Organize assets by source and type:

```
project/
├── assets/
│   ├── kenney/
│   │   ├── tiny-dungeon/          # Extracted pack
│   │   ├── ui-pack/               # Extracted pack
│   │   └── digital-audio/         # Extracted pack
│   ├── custom/                     # Custom-made assets
│   └── LICENSE.txt                 # Attribution file
```

### License Tracking

Even for CC0 assets, maintain a `LICENSE.txt` file documenting asset sources:

```
# Asset Licenses

## Kenney.nl Assets
All Kenney.nl assets are CC0 (public domain).
No attribution required, but appreciated.
Source: https://kenney.nl

Used packs:
- Tiny Dungeon
- UI Pack
- Digital Audio

## Custom Assets
Created by [Your Team]
Licensed under [License]
```

### Asset Resolution

Follow Arcane's asset resolution system:

1. Load textures via `loadTexture(path)` - cached automatically
2. Use relative paths from game entry point
3. Keep asset paths in constants:
   ```typescript
   const ASSETS = {
     DUNGEON_TILES: "./assets/kenney/tiny-dungeon/Tilemap/tilemap_packed.png",
     UI_BUTTON: "./assets/kenney/ui-pack/PNG/blue_button00.png",
   };
   ```

### Prototyping Strategy

1. **Start with placeholders**
   - Use Kenney's abstract/simple packs for rapid prototyping
   - Focus on gameplay mechanics first

2. **Iterate with real assets**
   - Once mechanics work, upgrade to thematic assets
   - Test with different art styles

3. **Optimize later**
   - Don't optimize asset loading during prototyping
   - Defer atlasing, compression, preloading to later phases

## Future Enhancements

### Phase 6+

- **Freesound.org integration** - Search and download sound effects with API
- **itch.io integration** - Access community asset marketplace
- **Asset hot-reload** - Auto-reload on asset file changes
- **Asset preprocessing** - Automatic sprite sheet packing, format conversion
- **Asset preloading** - Background loading with progress reporting
- **Multi-row animation support** - Enhanced sprite sheet parsing

### CLI Skill: `/add-asset`

Future skill for interactive asset management:

```bash
# Search and download interactively
/add-asset platformer sprites

# Agent presents options, downloads on selection, integrates into project
```

### Asset Catalog Browser

Future MCP resource for browsing assets directly in Claude Code UI.

## See Also

- [MCP Server README](../mcp/arcane-assets/README.md) - Detailed MCP server documentation
- [Agent Tooling](agent-tooling.md) - Agent workflow and tool usage
- [World Authoring](world-authoring.md) - Scene and world creation
- [API Design](api-design.md) - Asset loading API design principles
