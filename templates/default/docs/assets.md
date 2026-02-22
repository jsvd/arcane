# Assets

## Finding Assets with Skills

Use the built-in skills to find and setup game assets:

```
/sprite player spaceship        # Find sprite packs with spaceships
/sprite dungeon tiles enemies   # Find dungeon-themed sprites
/sound explosion laser          # Find explosion and laser sound effects
/sound background music         # Find music tracks
```

The skills will:
1. Search Asset Palace for matching packs
2. Download the pack if not already present
3. Generate ready-to-use TypeScript code

## Asset Palace

[Asset Palace](https://github.com/anthropics/asset_palace) is a metadata catalog of CC0 game assets. It contains JSON definitions mapping sprite names to pixel coordinates and sound names to file paths.

Supported sources:
- **Kenney.nl** — High-quality 2D assets (most common)
- **OpenGameArt** — Community-contributed assets
- **itch.io** — Indie game assets

All assets are CC0 (public domain) — use freely in any project.

## Manual Asset Setup

If you prefer to set up assets manually:

### Sprites with Atlas Loader

```typescript
import { loadAtlasFromDef } from "@arcane/runtime/rendering";

// Define sprites (coordinates from Asset Palace JSON or measured manually)
const atlas = loadAtlasFromDef({
  id: "my-sprites",
  primarySheet: "spritesheet.png",
  sheetWidth: 512,
  sheetHeight: 512,
  sprites: {
    "player": { x: 0, y: 0, w: 32, h: 32 },
    "enemy": { x: 32, y: 0, w: 32, h: 32 },
    "coin": { x: 64, y: 0, w: 16, h: 16 },
  },
}, { basePath: "assets/" });

// Draw sprites (centered at position)
atlas.draw("player", { x: 100, y: 200, scale: 2 });
atlas.draw("enemy", { x: 300, y: 200 });
atlas.draw("coin", { x: 150, y: 180, layer: 5 });
```

### Individual Textures

```typescript
import { loadTexture, drawSprite } from "@arcane/runtime/rendering";

const playerTex = loadTexture("assets/player.png");

drawSprite({
  textureId: playerTex,
  x: 100, y: 200,
  w: 32, h: 32,
  layer: 1,
});
```

### Sounds

```typescript
import { loadSound, playSound, playMusic } from "@arcane/runtime/rendering";

const jumpSfx = loadSound("assets/sounds/jump.wav");
const bgMusic = loadSound("assets/music/theme.ogg");

playSound(jumpSfx, { volume: 0.8 });
playMusic(bgMusic, { loop: true, volume: 0.5 });
```

## Path Resolution

Asset paths are resolved relative to your entry file:

```
my-game/
├── src/
│   └── visual.ts      # Entry file
├── assets/
│   ├── sprites/
│   └── sounds/
```

From `src/visual.ts`, use `../assets/sprites/player.png` or use absolute paths.

## Caching

Both `loadTexture()` and `loadSound()` cache by path. Calling them multiple times with the same path returns the same handle — no duplicate loading.

```typescript
// These return the same handle
const tex1 = loadTexture("assets/player.png");
const tex2 = loadTexture("assets/player.png");
// tex1 === tex2
```

## Preloading

For loading screens, preload assets and track progress:

```typescript
import { preloadAssets, getLoadingProgress, isTextureLoaded } from "@arcane/runtime/rendering";

// Start preloading
await preloadAssets([
  "assets/player.png",
  "assets/enemy.png",
  "assets/tileset.png",
]);

// Or check progress during loading
const progress = getLoadingProgress(); // 0.0 to 1.0
```
