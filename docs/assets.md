# Asset Management

Guide to loading and using art assets in Arcane.

## Overview

Arcane supports loading external assets (images, sounds) from the filesystem. Assets are loaded on-demand and cached by path. All asset loading is currently synchronous.

## Asset Organization

### Recommended Structure

```
your-game/
├── game.ts           # Entry point
├── assets/           # Game assets
│   ├── sprites/
│   │   ├── player.png
│   │   └── enemies.png
│   ├── sounds/
│   │   ├── jump.wav
│   │   └── music.ogg
│   └── fonts/
│       └── custom.png
```

For demos, assets live in `demos/<demo-name>/assets/`.

### Path Resolution

All asset paths are resolved **relative to the directory containing the entry script**.

```typescript
// If running: cargo run -- dev game/main.ts
// This resolves to: game/assets/player.png
const sprite = loadTexture("assets/player.png");

// Absolute paths also work
const sprite2 = loadTexture("/Users/you/project/assets/player.png");
```

## Image Assets

### Supported Formats

PNG, JPG, BMP, GIF, and other formats supported by the Rust `image` crate.

**Recommendation**: Use PNG with transparency for sprites.

### Loading Textures

```typescript
import { loadTexture } from "runtime/rendering/index.ts";

const playerSprite = loadTexture("assets/player.png");
const tileAtlas = loadTexture("assets/tileset.png");
```

**Caching**: Loading the same path multiple times returns the same texture ID. Assets are loaded once and reused.

### Texture Filtering

All textures use **nearest-neighbor filtering** (no smoothing). This is ideal for pixel art but will show hard edges on high-resolution art.

### Using Textures

```typescript
import { drawSprite } from "runtime/rendering/index.ts";

// Draw full texture
drawSprite({
  textureId: playerSprite,
  x: 100,
  y: 100,
  w: 32,
  h: 32,
  layer: 1,
});

// Draw sub-rectangle using UV coordinates (0..1)
drawSprite({
  textureId: tileAtlas,
  x: 100,
  y: 100,
  w: 16,
  h: 16,
  uv: { x: 0.0, y: 0.0, w: 0.25, h: 0.25 }, // Top-left quarter
  layer: 1,
});
```

### Placeholder Textures

For prototyping, you can create solid-color 1×1 textures:

```typescript
import { createSolidTexture } from "runtime/rendering/index.ts";

const red = createSolidTexture("red", 200, 50, 50);     // RGB 0-255
const blue = createSolidTexture("blue", 50, 100, 200, 128); // RGBA with alpha
```

## Sprite Sheets

### Horizontal Strip Layout

The animation system currently supports **horizontal sprite sheets** (single row of frames):

```
+-------+-------+-------+-------+
| Frame | Frame | Frame | Frame |
|   0   |   1   |   2   |   3   |
+-------+-------+-------+-------+
```

### Creating Animations

```typescript
import { loadTexture, createAnimation } from "runtime/rendering/index.ts";

const spriteSheet = loadTexture("assets/walk.png");

// 4 frames, each 32×32 pixels, playing at 10 FPS
const walkAnim = createAnimation(
  spriteSheet,
  32,        // Frame width
  32,        // Frame height
  4,         // Frame count
  10,        // FPS
  { loop: true }
);
```

### Playing Animations

```typescript
import {
  playAnimation,
  updateAnimation,
  drawAnimatedSprite,
} from "runtime/rendering/index.ts";
import { getDeltaTime } from "runtime/rendering/index.ts";

// Start animation
let anim = playAnimation(walkAnim);

// In game loop
onFrame(() => {
  const dt = getDeltaTime();

  // Update animation
  anim = updateAnimation(anim, dt);

  // Draw current frame
  drawAnimatedSprite(anim, x, y, 32, 32, {
    layer: 1,
    flipX: false,  // Mirror horizontally
    flipY: false,  // Mirror vertically
  });
});
```

### Limitations

- Only horizontal strips supported (frames in a single row)
- No multi-row grids
- No packed texture atlases (Aseprite JSON, TexturePacker, etc.)
- No per-frame timing (all frames use same duration)

## Audio Assets

### Supported Formats

WAV, MP3, OGG, FLAC via the `rodio` audio library.

**Recommendation**: Use OGG for music (good compression), WAV for short sound effects (instant decode).

### Loading Sounds

```typescript
import { loadSound } from "runtime/rendering/index.ts";

const jumpSfx = loadSound("assets/jump.wav");
const bgMusic = loadSound("assets/music.ogg");
```

**Caching**: Like textures, sounds are cached by path.

### Playing Sounds

```typescript
import { playSound, playMusic } from "runtime/rendering/index.ts";

// Play a sound effect
playSound(jumpSfx, { volume: 0.8, loop: false });

// Play looping background music (convenience function)
const musicHandle = playMusic("assets/music.ogg", 0.5);

// Stop a specific sound
stopSound(musicHandle);

// Stop all sounds
stopAll();

// Set master volume
setVolume(0.7); // 0.0 = mute, 1.0 = full
```

### Audio Threading

Audio playback happens on a background thread. The main game loop queues audio commands and continues immediately without blocking.

## Asset Pipeline

Currently there is **no asset build step**. Assets are loaded directly from source files at runtime.

### Missing Features

- No asset preloading (all loads are synchronous on first use)
- No asset hot-reload (must restart to see changed assets)
- No asset compression or packing
- No integration with art tools (Aseprite, Tiled, TexturePacker)

These may be added in future phases based on need.

## Finding Free Assets

### Art

- **[Kenney.nl](https://kenney.nl/assets)** — Thousands of CC0 game assets (sprites, tilesets, UI)
- **[OpenGameArt.org](https://opengameart.org/)** — Community-contributed assets (check licenses)
- **[itch.io](https://itch.io/game-assets/free)** — Free and paid asset packs

### Sounds

- **[freesound.org](https://freesound.org/)** — CC0 and CC-BY sound effects
- **[Kenney.nl Audio](https://kenney.nl/assets?q=audio)** — Free sound packs
- **[sfxr / jsfxr](https://sfxr.me/)** — Generate retro sound effects

### Fonts

Arcane includes a built-in CP437 8×8 bitmap font. Custom bitmap fonts can be loaded as textures and rendered as sprites.

## Example: Complete Asset Loading

```typescript
import {
  loadTexture,
  loadSound,
  createAnimation,
  playAnimation,
  updateAnimation,
  drawAnimatedSprite,
  playSound,
  onFrame,
  getDeltaTime,
} from "runtime/rendering/index.ts";

// Load assets
const spriteSheet = loadTexture("assets/player.png");
const jumpSound = loadSound("assets/jump.wav");

// Create animation (8 frames, 32×32 each, 10 FPS)
const walkAnim = createAnimation(spriteSheet, 32, 32, 8, 10, { loop: true });

// Game state
let anim = playAnimation(walkAnim);
let x = 100;
let y = 100;

// Game loop
onFrame(() => {
  const dt = getDeltaTime();

  // Update animation
  anim = updateAnimation(anim, dt);

  // Draw animated sprite
  drawAnimatedSprite(anim, x, y, 32, 32, { layer: 1 });

  // Play sound on space
  if (isKeyPressed("Space")) {
    playSound(jumpSound, { volume: 0.5 });
  }
});
```

## Troubleshooting

### "Failed to read texture" error

- Check the path is correct relative to your entry script
- Verify the file exists and is a valid image format
- Try an absolute path to rule out path resolution issues

### Texture appears black or wrong

- Check PNG has correct color space (sRGB recommended)
- Verify texture isn't corrupt (open in image viewer)
- Check UV coordinates if using sub-rectangles

### Sound doesn't play

- Verify audio format is supported (WAV, OGG, MP3, FLAC)
- Check file isn't corrupt (play in media player)
- Verify volume isn't set to 0
- Check master volume with `setVolume(1.0)`

### Animation plays too fast/slow

- Adjust FPS in `createAnimation()`
- Verify `getDeltaTime()` is being used correctly
- Check frame rate is stable (should be ~60 FPS)

## Next Steps

See `demos/sprite-demo/` for a working example of asset loading with sprites and sounds.
