# Arcane Assets MCP Server

MCP server for discovering and downloading game assets for the Arcane game engine.

## Features

### Kenney.nl Integration ✅

- **25+ curated asset packs** covering platformers, RPGs, shooters, puzzles, UI, audio, animals, and more
- **CC0 (public domain)** - no attribution required, use in any project
- **6 MCP tools** for browsing, searching, and downloading assets
- **60,000+ total assets** across all packs
- **Smart search** with synonym support (e.g., "kitty" finds cat assets, "unicorn" finds horse assets)
- **Content-aware search** - searches inside packs for specific sprites (cat, dog, wizard, etc.)
- **Helpful suggestions** when searches return no results

### Coming Soon

- Freesound.org integration (sound effects with API)
- itch.io integration (community assets)

## Installation

From the `mcp/arcane-assets` directory:

```bash
npm install
npm run build
```

## Configuration

Add to your Claude Code MCP settings (`~/.claude/mcp.json` or project-specific `.claude/mcp.json`):

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

Replace `/absolute/path/to/arcane` with the actual path to your Arcane repository.

## Available Tools

### `list_kenney_assets`

List all available Kenney.nl asset packs.

**Returns:** Array of asset packs with metadata (name, description, type, license, download URL, tags)

**Example:**
```typescript
// Lists all 24 curated packs
list_kenney_assets()
```

### `search_kenney_assets`

Search Kenney.nl asset packs by keyword.

**Parameters:**
- `query` (string, required): Search query
- `type` (string, optional): Filter by asset type (`2d-sprites`, `ui`, `audio`, `fonts`, `vfx`, `tilesets`, `textures`)

**Returns:** Search results with matching packs

**Examples:**
```typescript
// Find platformer assets
search_kenney_assets({ query: "platformer" })

// Find UI elements
search_kenney_assets({ query: "button", type: "ui" })

// Find audio
search_kenney_assets({ query: "impact", type: "audio" })
```

### `get_kenney_asset`

Get detailed information about a specific asset pack.

**Parameters:**
- `id` (string, required): Asset pack ID

**Returns:** Asset pack metadata

**Example:**
```typescript
get_kenney_asset({ id: "tiny-dungeon" })
```

### `download_kenney_asset`

Download an asset pack to a local directory.

**Parameters:**
- `id` (string, required): Asset pack ID
- `destination` (string, required): Destination directory path

**Returns:** Download result with success status and file path

**Example:**
```typescript
// Download to project assets directory
download_kenney_asset({
  id: "platformer-pack-redux",
  destination: "./assets"
})
```

### `get_asset_types`

Get all asset types available in the catalog.

**Returns:** Array of asset type strings

### `get_tags`

Get all tags used in the catalog (useful for discovering search keywords).

**Returns:** Array of tag strings

## Search Features

### Smart Synonym Search

The search automatically understands related terms:

```typescript
// These all find the same Animal Pack Redux:
search_kenney_assets({ query: "cat" })
search_kenney_assets({ query: "kitty" })
search_kenney_assets({ query: "kitten" })

// These find packs with horses:
search_kenney_assets({ query: "horse" })
search_kenney_assets({ query: "pony" })
search_kenney_assets({ query: "unicorn" })
```

### Content-Aware Search

The server knows what's inside each pack:

```typescript
// Finds packs containing wizard sprites
search_kenney_assets({ query: "wizard" })
// Returns: Tiny Battle, Roguelike RPG Pack

// Finds packs containing explosions
search_kenney_assets({ query: "explosion" })
// Returns: Space Shooter Redux, Particle Pack
```

### Helpful Suggestions

When no results are found, get suggestions for:
- Related search terms
- Available asset types
- Popular packs

```typescript
search_kenney_assets({ query: "xyz123" })
// Returns suggestions: "Try browsing by type: 2d-sprites, ui, audio..."
```

## Asset Pack Highlights

### Animals & Creatures
- **animal-pack-redux** - 160 assets, cute cartoon animals (cats, dogs, farm animals)
- **creature-mixer** - 100 assets, mix-and-match monster parts
- **tiny-battle** - 234 assets, knights, wizards, dragons
- **fish-pack** - 48 assets, underwater creatures

### Platformers
- **platformer-pack-redux** - 360 assets, complete platformer art
- **pixel-platformer** - 220 assets, retro pixel art style
- **abstract-platformer** - 250 assets, colorful abstract shapes

### RPG / Roguelike
- **tiny-dungeon** - 234 assets, micro roguelike tileset
- **roguelike-rpg-pack** - 1366 assets, massive dungeon crawler pack
- **tiny-town** - 239 assets, medieval town tileset

### Shooters
- **space-shooter-redux** - 384 assets, space shmup pack
- **topdown-shooter** - 496 assets, top-down spacecraft
- **topdown-tanks-redux** - 506 assets, tank warfare

### UI
- **ui-pack** - 322 assets, complete UI kit
- **ui-pack-rpg-expansion** - 250 assets, fantasy RPG styling
- **ui-pack-space-expansion** - 250 assets, sci-fi styling

### Audio
- **digital-audio** - 626 sounds, digital SFX
- **impact-sounds** - 50 sounds, hits and punches
- **music-jingles** - 35 tracks, short musical loops

### Other
- **particle-pack** - 284 assets, VFX particles
- **kenney-fonts** - 11 fonts, pixel game fonts
- **1-bit-pack** - 292 assets, monochrome tileset

## Usage Examples

### Agent-Driven Asset Discovery

```typescript
// Agent searches for assets based on game requirements
const result = await search_kenney_assets({
  query: "dungeon",
  type: "tilesets"
});

// Agent reviews results and downloads selected pack
const download = await download_kenney_asset({
  id: "tiny-dungeon",
  destination: "./demos/roguelike/assets"
});

// Agent extracts and integrates into game code
```

### Skill Integration

Create a `/add-asset` skill that uses these MCP tools:

```bash
# User invokes skill
/add-asset platformer sprites

# Skill searches, presents options, downloads on selection
```

## License

Apache 2.0 - See LICENSE file

All Kenney.nl assets are CC0 (public domain) and require no attribution.
