# {{PROJECT_NAME}} — Agent Guide

You are an expert game developer helping the user build their game. The user may describe what they want in non-technical terms ("make the character jump higher", "add enemies that chase the player", "I want a health bar"). Translate their intent into the right implementation using the patterns below.

**Before writing code**, read `types/arcane.d.ts` — it contains the complete API with JSDoc documentation. It's the authoritative reference for every function, type, and option available.

## Architecture

Two-file pattern:

- `src/game.ts` — Pure game logic. State in, state out. No rendering imports. Headless-testable.
- `src/visual.ts` — Rendering, input, camera, audio. Entry point for `arcane dev`.

Hot-reload: saving any file restarts the game loop (~200ms). State resets to initial.

Imports use `@arcane/runtime/{module}`:
`state`, `rendering`, `ui`, `physics`, `pathfinding`, `tweening`, `particles`, `systems`, `agent`, `testing`

## Coordinate System

**This is not a web canvas.** The coordinate system is camera-based, not screen-based. The viewport size is **not fixed** — use `getViewportSize()` to get the actual dimensions.

```
  World space (where sprites live):
  VPW = viewport width, VPH = viewport height

  Default camera at (0, 0):
  ┌───────────────────────────────────┐
  │ (-VPW/2, -VPH/2)  (VPW/2, -VPH/2)│
  │                                    │
  │            (0, 0)                  │  ← center of screen, NOT top-left
  │                                    │
  │ (-VPW/2,  VPH/2)  (VPW/2,  VPH/2)│
  └───────────────────────────────────┘

  After setCamera(VPW/2, VPH/2):
  ┌───────────────────────────────────┐
  │ (0, 0)                  (VPW, 0)  │  ← now (0,0) is top-left!
  │                                    │
  │          (VPW/2, VPH/2)           │
  │                                    │
  │ (0, VPH)              (VPW, VPH)  │
  └───────────────────────────────────┘
```

**Key facts:**
- Camera defaults to **(0, 0)** — the **center** of the screen, not the top-left
- `drawSprite({x, y, ...})` positions the sprite's **top-left corner** in world space
- **`drawSprite` is always world-space** — it has no `screenSpace` option. The camera transform is applied automatically by the GPU.
- `screenSpace: true` is only available on `drawText`, `drawRect`, `drawPanel`, `drawBar`, `drawLabel` — these bypass the camera and use screen pixels with (0, 0) at top-left.
- Y increases **downward** (same as web)
- Visible world area: `camera ± viewport / (2 * zoom)` in each axis
- **Viewport size is not fixed** — always use `getViewportSize()`, never hardcode dimensions

**Recommended pattern** — set camera so (0, 0) is top-left (web-like):
```typescript
const { width: VPW, height: VPH } = getViewportSize();
setCamera(VPW / 2, VPH / 2);  // now (0,0) = top-left corner
// drawSprite at (0, 0) appears at top-left, (VPW, VPH) at bottom-right
```

**Scrolling world** — for large worlds (dungeons, tilemaps), center the camera on the player instead. Only the area around the camera is visible; zoom controls how much. See `demos/bfrpg-crawler/` and `demos/roguelike/` for working examples.
```typescript
setCamera(player.x, player.y, 2.0);  // follow player, 2x zoom
```

If you skip `setCamera()`, the camera stays at (0, 0) = screen center, and you must offset all positions by `-viewport/2` to fill the screen. **Always call `setCamera()` early in your frame.**

## The Game Loop

`onFrame()` registers a callback that runs every frame. Draw calls are **not persisted** — you must redraw everything each frame. `getDeltaTime()` returns seconds since last frame.

```typescript
import {
  onFrame, getDeltaTime, clearSprites, drawSprite,
  setCamera, isKeyDown, isKeyPressed, createSolidTexture,
  drawText, getViewportSize,
} from "@arcane/runtime/rendering";
import { drawBar, Colors, HUDLayout } from "@arcane/runtime/ui";

const TEX_PLAYER = createSolidTexture("player", 60, 180, 255);
const TEX_GROUND = createSolidTexture("ground", 80, 80, 80);

const { width: VPW, height: VPH } = getViewportSize();
let state = createGame(VPW, VPH);

onFrame(() => {
  const dt = getDeltaTime();

  // 0. Camera — set so (0, 0) = top-left corner
  setCamera(VPW / 2, VPH / 2);

  // 1. Input
  let dx = 0;
  if (isKeyDown("ArrowLeft")) dx = -1;
  if (isKeyDown("ArrowRight")) dx = 1;
  if (isKeyPressed("Space")) state = jump(state);

  // 2. Update (pure functions from game.ts)
  state = movePlayer(state, dx * SPEED * dt);
  state = stepPhysics(state, dt);

  // 3. Render — (0, 0) is top-left because of setCamera above
  clearSprites();
  drawSprite({ textureId: TEX_GROUND, x: 0, y: 0, w: VPW, h: VPH, layer: 0 });
  drawSprite({ textureId: TEX_PLAYER, x: state.x, y: state.y, w: 32, h: 32, layer: 1 });

  // 4. HUD (screen-space — always top-left origin, ignores camera)
  drawText(`Score: ${state.score}`, 10, 10, { screenSpace: true, layer: 100 });
  drawBar(10, 30, 80, 12, state.hp / state.maxHp, {
    fillColor: Colors.SUCCESS, bgColor: Colors.HUD_BG,
    layer: 100, screenSpace: true,
  });
});
```

Key input: `isKeyDown(key)` for held keys, `isKeyPressed(key)` for single-frame press. Keys use DOM names: `"ArrowLeft"`, `"a"`, `"Space"`, etc.

## Composition Patterns

**Textures** — Create once at module scope, reuse the returned `TextureId` in the loop:
```typescript
const TEX = createSolidTexture("name", r, g, b);           // solid color (0-255)
const TEX2 = loadTexture("assets/sprite.png");              // image file
```

**Screen-space HUD** — `drawText`, `drawBar`, `drawLabel`, `drawRect`, `drawPanel` all accept `screenSpace: true` to render fixed to the viewport (ignores camera).

**Camera** — `setCamera(x, y, zoom)` sets position and zoom. `followTarget(x, y)` is a convenience wrapper. Call every frame.

**Collision** — Import from `@arcane/runtime/physics`:
```typescript
import { aabbOverlap, circleAABBResolve } from "@arcane/runtime/physics";
if (aabbOverlap(a, b)) { /* AABB vs AABB overlap test */ }
const normal = circleAABBResolve(cx, cy, radius, box); // returns {nx, ny} or null
```

**Entities** — State is immutable. Return new state from update functions:
```typescript
function spawnEnemy(state: GameState): GameState {
  return { ...state, enemies: [...state.enemies, newEnemy] };
}
function removeDeadEnemies(state: GameState): GameState {
  return { ...state, enemies: state.enemies.filter(e => e.hp > 0) };
}
```

**Tilemap** — Create once, set tiles, draw each frame:
```typescript
const map = createTilemap({ textureId: atlas, width: 20, height: 15, tileSize: 16, atlasColumns: 8, atlasRows: 8 });
setTile(map, x, y, tileIndex);
// In onFrame:
drawTilemap(map, 0, 0, 0); // id, x, y, layer
```

**Animation** — Create definition once, update state each frame:
```typescript
const walkAnim = createAnimation(spriteSheet, 32, 32, 4, 10); // textureId, frameW, frameH, frameCount, fps
let animState = playAnimation(walkAnim);
// In onFrame:
animState = updateAnimation(animState, dt);
drawAnimatedSprite(animState, x, y, 32, 32, { layer: 1 });
```

**Audio** — Load once, play in response to events:
```typescript
const SFX_JUMP = loadSound("assets/jump.wav");
const music = playMusic("assets/bgm.ogg", 0.5); // returns SoundId, loops
// In game logic:
playSound(SFX_JUMP);
stopSound(music);
```

**Tweening** — Animate values over time (mutates target object directly):
```typescript
import { tween, updateTweens, easeOutBounce } from "@arcane/runtime/tweening";
const pos = { x: 0, y: 0 };
tween(pos, { x: 100, y: 200 }, 0.5, { easing: easeOutBounce, onComplete: () => { /* done */ } });
// In onFrame: call updateTweens(dt) to advance all active tweens
updateTweens(dt);
drawSprite({ textureId: TEX, x: pos.x, y: pos.y, w: 32, h: 32, layer: 1 }); // pos updates automatically
```

**Particles** — Create emitter, update and draw each frame:
```typescript
import { createEmitter, updateParticles, getAllParticles } from "@arcane/runtime/particles";
createEmitter({
  shape: "point", x: 100, y: 100, mode: "continuous", rate: 20,
  lifetime: [0.5, 1.0], velocityX: [-50, 50], velocityY: [-100, -50],
  startColor: { r: 1, g: 0.8, b: 0.2, a: 1 }, endColor: { r: 1, g: 0.2, b: 0, a: 0 },
  textureId: TEX_PARTICLE,
});
// In onFrame:
updateParticles(dt);
for (const p of getAllParticles()) {
  drawSprite({ textureId: p.textureId, x: p.x, y: p.y, w: 4 * p.scale, h: 4 * p.scale, layer: 5, tint: p.color });
}
```

## Resolution-Adaptive Design

**Never hardcode pixel dimensions.** The window is resizable, so always use `getViewportSize()`:

```typescript
// src/game.ts — pure logic, accepts viewport dimensions
export function createGame(viewportW: number, viewportH: number) {
  const groundY = viewportH - 50;  // derive from viewport
  return { viewportW, viewportH, playerX: viewportW / 2, playerY: groundY - 32, groundY };
}

// src/visual.ts — provides actual viewport
const { width, height } = getViewportSize();
let state = createGame(width, height);
```

**Common patterns:**
- **World bounds:** Derive from `state.viewportW` / `state.viewportH` in game logic
- **HUD positioning:** Use `screenSpace: true` with fixed pixel offsets (10px from edge works at any resolution)
- **Backgrounds:** Size to `viewportW × viewportH` to fill screen
- **Camera:** `setCamera(VPW / 2, VPH / 2)` for top-left origin, or `followTarget(player.x, player.y)` for scrolling

## Assets

Arcane includes a built-in asset catalog with 25 free CC0 packs from Kenney.nl (sprites, tilesets, UI, audio, fonts, VFX). No configuration needed.

```bash
arcane assets list                    # Show all available packs
arcane assets list --type audio       # Filter by type (audio, 2d-sprites, ui, tilesets, fonts, vfx)
arcane assets search "dungeon"        # Search by keyword (supports synonyms)
arcane assets search "kitty"          # Finds animal-pack-redux via synonym expansion
arcane assets download tiny-dungeon   # Download and extract to ./assets/tiny-dungeon/
arcane assets download tiny-dungeon assets/kenney  # Custom destination
arcane assets list --json             # Structured JSON output for programmatic use
```

**OpenGameArt.org (CC0)** — search and download from the full OGA catalog:
```bash
arcane assets search-oga "dungeon"              # Search OGA for CC0 assets
arcane assets search-oga "platformer" --type 2d  # Filter: 2d, 3d, music, sound, texture
arcane assets info-oga dungeon-tileset           # Get details about a specific asset
arcane assets download-oga dungeon-tileset       # Download to ./assets/oga/
arcane assets download-oga dungeon-tileset assets/custom  # Custom destination
```

After downloading, use assets in your game:
```typescript
const atlas = loadTexture("assets/tiny-dungeon/Tilemap/tilemap_packed.png");
const sfx = loadSound("assets/digital-audio/powerUp1.ogg");
```

## Workflow

```
arcane dev                        # Opens window, hot-reloads on save (defaults to src/visual.ts)
arcane dev src/visual.ts          # Explicit entry point
arcane test                       # Discovers and runs all *.test.ts files headlessly
arcane describe src/visual.ts     # Text description of current game state (agent protocol)
arcane inspect src/visual.ts "player"  # Query a specific state path
arcane add turn-based-combat      # Copy a pre-built recipe into your project
arcane add --list                 # List available recipes
arcane assets search "platformer" # Find game assets to download
arcane assets download tiny-dungeon   # Download asset pack
```

File organization: `src/game.ts` (logic), `src/visual.ts` (rendering), `src/*.test.ts` (tests).

## API Reference

Read `types/arcane.d.ts` for the complete API with JSDoc documentation. Always check it before using an unfamiliar function.

All module imports: `@arcane/runtime/state`, `@arcane/runtime/rendering`, `@arcane/runtime/ui`, `@arcane/runtime/physics`, `@arcane/runtime/pathfinding`, `@arcane/runtime/tweening`, `@arcane/runtime/particles`, `@arcane/runtime/systems`, `@arcane/runtime/agent`, `@arcane/runtime/testing`.

## Tips

- Always multiply velocities/movement by `dt` for frame-rate independence.
- State functions are pure: state in, state out. Never mutate state directly.
- `loadTexture()` and `loadSound()` cache by path — calling twice returns the same handle.
- Layer ordering: 0 = background, 1-10 = game objects, 100+ = HUD.
- Use `createSolidTexture(name, r, g, b)` for quick colored rectangles without image assets.
- Test game logic in `*.test.ts` files using `describe`, `it`, `assert` from `@arcane/runtime/testing`.
- Tests run in both Node.js and V8 — avoid Node-specific APIs in test files.
- Call `clearSprites()` at the start of your `onFrame` to ensure a clean slate each frame.
