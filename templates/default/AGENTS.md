# {{PROJECT_NAME}} — Agent Guide

You are an expert game developer helping the user build their game. The user may describe what they want in non-technical terms ("make the character jump higher", "add enemies that chase the player", "I want a health bar"). Translate their intent into the right implementation using the patterns below.

**Before writing code**, read `types/arcane.d.ts` — it contains the complete API with JSDoc documentation. It's the authoritative reference for every function, type, and option available.

## Architecture

Two-file pattern:

- `src/game.ts` — Pure game logic. State in, state out. No rendering imports. Headless-testable.
- `src/visual.ts` — Rendering, input, camera, audio. Entry point for `arcane dev`.

Hot-reload: saving any file restarts the game loop (~200ms). State resets to initial.

Imports use `@arcane/runtime/{module}`:
`state`, `rendering`, `ui`, `physics`, `pathfinding`, `tweening`, `particles`, `systems`, `scenes`, `persistence`, `agent`, `testing`

## Coordinate System

**This is not a web canvas.** The coordinate system is camera-based, not screen-based. The viewport size is **not fixed** — use `getViewportSize()` to get the actual dimensions. Viewport values are in **logical pixels** (DPI-independent) — a 2x Retina display with an 800×600 window still returns 800×600, not 1600×1200.

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

Key input: `isKeyDown(key)` for held keys, `isKeyPressed(key)` for single-frame press. Keys use DOM-like names: `"ArrowLeft"`, `"ArrowRight"`, `"ArrowUp"`, `"ArrowDown"`, `"Space"`, `"Enter"`, `"Escape"`, `"ShiftLeft"`, `"KeyA"` through `"KeyZ"`, `"Digit0"` through `"Digit9"`. **Important:** Space is `"Space"`, not `" "` (literal space character).

## Composition Patterns

**Textures** — Create once at module scope, reuse the returned `TextureId` in the loop:
```typescript
const TEX = createSolidTexture("name", r, g, b);           // solid color (0-255)
const TEX2 = loadTexture("assets/sprite.png");              // image file
```

**Screen-space HUD** — `drawText`, `drawBar`, `drawLabel`, `drawRect`, `drawPanel` all accept `screenSpace: true` to render fixed to the viewport (ignores camera).

**Camera** — `setCamera(x, y, zoom)` sets position and zoom. `followTarget(x, y)` is a convenience wrapper. Call every frame.

**Collision (simple)** — Import from `@arcane/runtime/physics`:
```typescript
import { aabbOverlap, circleAABBResolve } from "@arcane/runtime/physics";
if (aabbOverlap(a, b)) { /* AABB vs AABB overlap test */ }
const normal = circleAABBResolve(cx, cy, radius, box); // returns {nx, ny} or null
```

**Physics Engine (rigid body)** — For games that need real physics (platformers, breakout, stacking puzzles):
```typescript
import {
  createPhysicsWorld, stepPhysics, destroyPhysicsWorld,
  createBody, removeBody, getBodyState,
  setBodyVelocity, applyForce, applyImpulse,
  createDistanceJoint, createRevoluteJoint,
  getContacts, queryAABB, raycast,
} from "@arcane/runtime/physics";

// 1. Create world with gravity (call once at init)
createPhysicsWorld({ gravityX: 0, gravityY: 400 });

// 2. Create bodies — shape types: circle, aabb
const ground = createBody({
  type: "static",
  shape: { type: "aabb", halfW: 400, halfH: 20 },
  x: 400, y: 580,  // position = center of body
  material: { restitution: 0.3, friction: 0.8 },
});
const ball = createBody({
  type: "dynamic",
  shape: { type: "circle", radius: 10 },
  x: 400, y: 100,
  mass: 1.0,
  material: { restitution: 0.8, friction: 0.3 },
});

// 3. In onFrame: step physics, read state, render
stepPhysics(dt);
const state = getBodyState(ball); // { x, y, angle, vx, vy, angularVelocity }
drawSprite({ textureId: TEX, x: state.x - 10, y: state.y - 10, w: 20, h: 20, layer: 1 });

// 4. Apply forces/impulses
applyImpulse(ball, 0, -200);     // instant velocity change (jump)
applyForce(ball, 100, 0);         // continuous push (wind)
setBodyVelocity(ball, 0, 0);      // directly set velocity

// 5. Constraints (joints)
const joint = createDistanceJoint(bodyA, bodyB, 50); // fixed distance
const hinge = createRevoluteJoint(bodyA, bodyB, pivotX, pivotY);

// 6. Query contacts for game logic
for (const c of getContacts()) {
  if (c.bodyA === ball || c.bodyB === ball) { /* ball hit something */ }
}
```

Body types: `"static"` (walls, ground — immovable), `"dynamic"` (affected by forces/gravity), `"kinematic"` (moved by code, pushes dynamic bodies).

Shape types: `{ type: "circle", radius }` or `{ type: "aabb", halfW, halfH }`. Position is always the center of the shape.

Collision layers: `layer` (what this body is) and `mask` (what it collides with). Two bodies collide if `(a.layer & b.mask) != 0 && (b.layer & a.mask) != 0`. Default: layer=0x0001, mask=0xFFFF (collide with everything).

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

**Sprite Transforms** — Rotation, flip, opacity, and blend modes are all `SpriteOptions` fields:
```typescript
// Rotation (radians, positive = clockwise, around center by default)
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, rotation: angle, layer: 1 });

// Rotation around custom origin (0-1 relative to sprite size)
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, rotation: angle, originX: 0.5, originY: 1.0, layer: 1 }); // rotate around bottom-center

// Flip + opacity
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, flipX: facingLeft, opacity: 0.5, layer: 1 });

// Blend modes: "alpha" (default), "additive" (glow/fire), "multiply" (shadows), "screen" (highlights)
drawSprite({ textureId: TEX, x, y, w: 8, h: 8, blendMode: "additive", layer: 5 }); // glowing particle
```

**Post-Processing** — Screen-wide effects applied after all sprites are drawn:
```typescript
import { addPostProcessEffect, setEffectParam, removeEffect, clearEffects } from "@arcane/runtime/rendering";

const crt = addPostProcessEffect("crt");       // scanlines + barrel distortion
const bloom = addPostProcessEffect("bloom");    // glow around bright areas
const blur = addPostProcessEffect("blur");      // gaussian blur
const vig = addPostProcessEffect("vignette");   // darkened edges

setEffectParam(crt, "intensity", 0.3);          // customize effect parameters
removeEffect(bloom);                            // remove a single effect
clearEffects();                                 // remove all effects
```

**Custom Shaders** — User-defined WGSL fragment shaders with uniform parameters:
```typescript
import { createShaderFromSource, setShaderParam } from "@arcane/runtime/rendering";

const shader = createShaderFromSource("dissolve", `
  @fragment fn main(@location(0) uv: vec2<f32>, @location(1) color: vec4<f32>) -> @location(0) vec4<f32> {
    let threshold = params[0].x;
    // ... WGSL fragment shader code
    return color;
  }
`);
setShaderParam(shader, 0, 0.5, 0, 0, 0);  // set uniform slot 0 (16 vec4 slots available)
drawSprite({ textureId: TEX, x, y, w: 32, h: 32, shaderId: shader, layer: 1 });
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

All module imports: `@arcane/runtime/state`, `@arcane/runtime/rendering`, `@arcane/runtime/ui`, `@arcane/runtime/physics`, `@arcane/runtime/pathfinding`, `@arcane/runtime/tweening`, `@arcane/runtime/particles`, `@arcane/runtime/systems`, `@arcane/runtime/scenes`, `@arcane/runtime/persistence`, `@arcane/runtime/agent`, `@arcane/runtime/testing`.

## Scenes

Use the scene manager for multi-screen games (title, menu, gameplay, pause, game over). Import from `@arcane/runtime/scenes`.

```typescript
import {
  createScene, createSceneInstance, startSceneManager,
  pushScene, popScene, replaceScene, getActiveScene,
} from "@arcane/runtime/scenes";

// Define a scene with typed state
const GameScene = createScene<{ score: number }>({
  name: "game",
  create: () => ({ score: 0 }),
  onEnter: (state, ctx) => state,           // called once when pushed/replaced
  onUpdate: (state, dt, ctx) => state,      // called every frame (return new state)
  onRender: (state, ctx) => { /* draw */ },  // called every frame after update
  onPause: (state) => state,                 // called when another scene pushes on top
  onResume: (state, ctx) => state,           // called when the scene above pops
  onExit: (state) => {},                     // called when popped/replaced
});

// Start the scene manager (takes ownership of onFrame)
startSceneManager(createSceneInstance(GameScene), {
  onUpdate: (dt) => { updateTweens(dt); updateParticles(dt); },
});

// Navigate between scenes from within callbacks via ctx:
// ctx.push(instance, transition?)  — push on top (current pauses)
// ctx.pop(transition?)             — pop current (previous resumes)
// ctx.replace(instance, transition?) — swap current for new
// ctx.getData<T>()                 — get data passed to createSceneInstance

// Transitions: { type: "fade", duration: 0.3, color: { r: 0, g: 0, b: 0 } }
// Use { type: "none" } for instant transitions (e.g., pause overlay)
```

**Scene stack**: push adds on top (current pauses), pop removes top (previous resumes), replace swaps top. Pause overlays use push + pop with `{ type: "none" }` transition.

**Data passing**: `createSceneInstance(SceneDef, data)` — access via `ctx.getData<T>()` inside callbacks. Use for passing scores, loaded state, etc. between scenes.

## Save/Load

Persist game state with schema migration support. Import from `@arcane/runtime/persistence`.

```typescript
import {
  configureSaveSystem, saveGame, loadGame, hasSave, deleteSave, listSaves,
  enableAutoSave, disableAutoSave, updateAutoSave,
} from "@arcane/runtime/persistence";
import { createFileStorage } from "@arcane/runtime/persistence/storage";

// Configure (call once at startup)
configureSaveSystem({ storage: createFileStorage(), version: 1 });

// Save
saveGame(gameState, { slot: "save1", label: "Level 3" });

// Load
const result = loadGame<GameState>("save1");
if (result.ok) {
  gameState = result.state!;
}

// Check / list / delete
if (hasSave("save1")) { /* ... */ }
const saves = listSaves();  // SaveMetadata[] sorted by timestamp desc
deleteSave("save1");

// Auto-save (call updateAutoSave(dt) each frame)
enableAutoSave({ getState: () => gameState, interval: 30, options: { slot: "autosave" } });
// In onFrame or scene manager onUpdate:
updateAutoSave(dt);
```

**Schema migrations** — handle save format changes between versions:
```typescript
configureSaveSystem({ version: 2 });
registerMigration({
  version: 2, description: "Add inventory",
  up: (data: any) => ({ ...data, inventory: [] }),
});
// Old v1 saves are automatically migrated to v2 on load
```

## Common Game Patterns

**Angular movement** (ships, top-down vehicles) — use `cos`/`sin` with a rotation angle:
```typescript
// Rotate the entity
entity.angle += turnSpeed * dt * (isKeyDown("ArrowRight") ? 1 : isKeyDown("ArrowLeft") ? -1 : 0);

// Thrust in facing direction
if (isKeyDown("ArrowUp")) {
  entity.vx += Math.cos(entity.angle - Math.PI / 2) * thrust * dt;
  entity.vy += Math.sin(entity.angle - Math.PI / 2) * thrust * dt;
}

// Render with rotation
drawSprite({ textureId: TEX, x: entity.x - 16, y: entity.y - 16, w: 32, h: 32, rotation: entity.angle, layer: 1 });
```
Note: `angle - Math.PI/2` because rotation 0 = pointing right, but "up" sprites typically face up.

**Screen wrapping** (asteroids, pac-man):
```typescript
function wrapPosition(x: number, y: number, w: number, h: number, vpW: number, vpH: number) {
  return {
    x: x < -w ? vpW : x > vpW ? -w : x,
    y: y < -h ? vpH : y > vpH ? -h : y,
  };
}
```

**Cooldown timers** — decrement by dt, allow action when <= 0:
```typescript
entity.shootCooldown -= dt;
if (isKeyPressed("Space") && entity.shootCooldown <= 0) {
  spawnBullet(entity);
  entity.shootCooldown = 0.15; // seconds between shots
}
```

**Entity lifecycle** — spawn, update, despawn with array filtering:
```typescript
// Spawn
bullets.push({ x, y, vx, vy, lifetime: 1.5 });

// Update + despawn in one pass
bullets = bullets
  .map(b => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt, lifetime: b.lifetime - dt }))
  .filter(b => b.lifetime > 0);
```

**Particle effects for game feel** — use additive blending for fire/explosions:
```typescript
for (const p of particles) {
  drawSprite({
    textureId: TEX_PARTICLE, x: p.x - 2, y: p.y - 2, w: 4 * p.scale, h: 4 * p.scale,
    opacity: p.lifetime / p.maxLifetime,  // fade out
    blendMode: "additive",                // glow effect
    layer: 5,
  });
}
```

## Tips

- Always multiply velocities/movement by `dt` for frame-rate independence.
- State functions are pure: state in, state out. Never mutate state directly.
- `loadTexture()` and `loadSound()` cache by path — calling twice returns the same handle.
- Layer ordering: 0 = background, 1-10 = game objects, 100+ = HUD.
- Use `createSolidTexture(name, r, g, b)` for quick colored rectangles without image assets.
- Use `setBackgroundColor(r, g, b)` (0.0-1.0 range) to change the window background color. Default is dark blue-gray.
- Test game logic in `*.test.ts` files using `describe`, `it`, `assert` from `@arcane/runtime/testing`.
- Tests run in both Node.js and V8 — avoid Node-specific APIs in test files.
- Call `clearSprites()` at the start of your `onFrame` to ensure a clean slate each frame.
- Key names: `"Space"` not `" "`, `"Enter"` not `"\n"`, `"Escape"` not `"Esc"`. Check `types/arcane.d.ts` if unsure.
- For rotation, `0` = no rotation, positive = clockwise. Ship sprites that face "up" need `angle - Math.PI/2` offset.
- Use `blendMode: "additive"` for glowing effects (exhaust, fire, magic). It adds light instead of covering pixels.
