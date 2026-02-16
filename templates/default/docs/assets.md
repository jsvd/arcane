# Assets

## Built-in Asset Catalog

25 free CC0 packs from Kenney.nl (sprites, tilesets, UI, audio, fonts, VFX):

```bash
arcane assets list                    # Show all available packs
arcane assets list --type audio       # Filter: audio, 2d-sprites, ui, tilesets, fonts, vfx
arcane assets search "dungeon"        # Search by keyword (supports synonyms)
arcane assets download tiny-dungeon   # Download and extract to ./assets/tiny-dungeon/
arcane assets download tiny-dungeon assets/kenney  # Custom destination
arcane assets list --json             # JSON output for programmatic use
```

## OpenGameArt.org (CC0)

Search and download from the full OGA catalog:

```bash
arcane assets search-oga "dungeon"              # Search for CC0 assets
arcane assets search-oga "platformer" --type 2d  # Filter: 2d, 3d, music, sound, texture
arcane assets info-oga dungeon-tileset           # Details about a specific asset
arcane assets download-oga dungeon-tileset       # Download to ./assets/oga/
arcane assets download-oga dungeon-tileset assets/custom  # Custom destination
```

## Using Downloaded Assets

```typescript
import { loadTexture, loadSound } from "@arcane/runtime/rendering";

const atlas = loadTexture("assets/tiny-dungeon/Tilemap/tilemap_packed.png");
const sfx = loadSound("assets/digital-audio/powerUp1.ogg");
```

Both `loadTexture()` and `loadSound()` cache by path -- calling twice returns the same handle.
