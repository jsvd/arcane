# Asset Management

How to discover, download, and integrate game assets in Arcane.

## Overview

Arcane includes built-in CLI commands for discovering and downloading free game assets. No configuration, no MCP servers, no extra dependencies — asset discovery ships in the binary.

## Architecture

```
┌─────────────────────┐
│   Developer / Agent  │
└──────────┬──────────┘
           │
           │ arcane assets list/search/download
           ▼
┌─────────────────────┐
│ arcane CLI           │
│ (embedded catalog)   │
└──────────┬──────────┘
           │
           │ downloads from
           ▼
┌─────────────────────┐
│ Asset Sources:       │
│ - Kenney.nl (CC0)    │
└─────────────────────┘
```

## Asset Sources

### Kenney.nl (Built-in)

- **License**: CC0 (public domain), no attribution required
- **Quality**: Professionally made, consistent style
- **Quantity**: 25 curated packs across all game asset types
- **Categories**: 2D sprites, tilesets, UI, audio, fonts, VFX
- **Integration**: Direct download via `arcane assets download`

**Popular Packs:**
- Platformer Pack Redux (360 assets)
- Roguelike RPG Pack (1366 assets)
- Tiny Dungeon (234 assets)
- UI Pack (322 assets)
- Digital Audio (626 sounds)

## CLI Commands

### `arcane assets list`

List all available asset packs.

```bash
arcane assets list                    # Show all 25 packs
arcane assets list --type audio       # Filter by type
arcane assets list --type 2d-sprites  # Only sprite packs
arcane assets list --json             # Structured JSON output
```

**Available types:** `2d-sprites`, `audio`, `fonts`, `tilesets`, `ui`, `vfx`

### `arcane assets search`

Search packs by keyword with synonym expansion.

```bash
arcane assets search "dungeon"        # Finds tiny-dungeon, roguelike-rpg-pack, 1-bit-pack
arcane assets search "kitty"          # Synonym expansion: kitty → cat → animal-pack-redux
arcane assets search "platformer" --type tilesets  # Combined search + filter
arcane assets search "mage"           # Expands to wizard, sorcerer, magician
arcane assets search "dungeon" --json # JSON output for programmatic use
```

Search checks pack names (highest priority), contents, tags, and descriptions. Synonyms expand automatically — searching for "kitty" also searches for "cat", "kitten", and "feline".

When no results are found, suggestions are provided (available types, related terms, popular packs).

### `arcane assets download`

Download and extract an asset pack.

```bash
arcane assets download tiny-dungeon              # Extract to ./assets/tiny-dungeon/
arcane assets download tiny-dungeon assets/kenney # Custom destination
arcane assets download tiny-dungeon --json        # JSON status output
```

Downloads the ZIP from kenney.nl and extracts it to the destination directory.

## Agent Workflow

### Discovery

1. **Agent analyzes game requirements**
   - Identifies needed asset types (sprites, sounds, UI, etc.)
   - Determines art style preferences (pixel art, abstract, realistic)

2. **Agent searches for assets**
   ```bash
   arcane assets search "dungeon" --type tilesets
   # Found 2 packs matching "dungeon":
   #   tiny-dungeon       Micro roguelike dungeon tileset [2d-sprites, tilesets]
   #   roguelike-rpg-pack Massive RPG pack [2d-sprites, tilesets, ui]
   ```

3. **Agent evaluates options**
   - Reviews pack metadata (asset count, description, contents, tags)
   - Uses `--json` for structured comparison

### Download & Integration

4. **Agent downloads selected pack**
   ```bash
   arcane assets download tiny-dungeon assets/kenney
   # Extracted to assets/kenney/tiny-dungeon
   ```

5. **Agent writes integration code**
   ```typescript
   import { loadTexture } from "@arcane/runtime/rendering";

   const dungeonTiles = loadTexture("assets/kenney/tiny-dungeon/Tilemap/tilemap_packed.png");
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

1. Load textures via `loadTexture(path)` — cached automatically
2. Use relative paths from game entry point
3. Keep asset paths in constants:
   ```typescript
   const ASSETS = {
     DUNGEON_TILES: "assets/kenney/tiny-dungeon/Tilemap/tilemap_packed.png",
     UI_BUTTON: "assets/kenney/ui-pack/PNG/blue_button00.png",
   };
   ```

### Prototyping Strategy

1. **Start with placeholders**
   - Use `createSolidTexture()` for rapid prototyping
   - Focus on gameplay mechanics first

2. **Iterate with real assets**
   - Once mechanics work, download packs: `arcane assets download`
   - Test with different art styles

3. **Optimize later**
   - Don't optimize asset loading during prototyping
   - Defer atlasing, compression, preloading to later phases

## Future Enhancements

- **Additional sources** — Freesound.org, itch.io integration
- **Asset hot-reload** — Auto-reload on asset file changes
- **Asset preprocessing** — Automatic sprite sheet packing, format conversion
- **Multi-row animation support** — Enhanced sprite sheet parsing

> **Note:** Asset preloading is already implemented via `preloadAssets()`, `isTextureLoaded()`, and `getLoadingProgress()` in `runtime/rendering/texture.ts`.

## See Also

- [Agent Tooling](agent-tooling.md) — Agent workflow and tool usage
- [World Authoring](world-authoring.md) — Scene and world creation
- [API Design](api-design.md) — Asset loading API design principles
