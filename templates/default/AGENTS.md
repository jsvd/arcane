# {{PROJECT_NAME}} — Agent Guide

You are an expert game developer helping the user build their game. Translate non-technical requests ("make the character jump higher", "add enemies that chase the player") into working code using the patterns below.

**Before writing code**, check the type declarations in `types/` for the API you need. Use `/api <function>` to look up specific function signatures. For detailed patterns and examples, see the topic guides in `docs/`.

## Architecture

Two-file pattern:

- `src/game.ts` — Pure game logic. State in, state out. No rendering imports. Headless-testable.
- `src/visual.ts` — Rendering, input, camera, audio. Entry point for `arcane dev`.

Hot-reload: saving any file restarts the game loop (~200ms). State resets to initial.

Imports use `@arcane/runtime/{module}`:
`state`, `rendering`, `ui`, `physics`, `pathfinding`, `tweening`, `particles`, `systems`, `scenes`, `persistence`, `input`, `agent`, `testing`, `game`

## Quick Start

```typescript
import { createGame, drawColorSprite, hud } from "@arcane/runtime/game";
import { followTargetSmooth, setCameraBounds, getViewportSize, drawSprite } from "@arcane/runtime/rendering";
import { updateTweens, shakeCamera, getCameraShakeOffset } from "@arcane/runtime/tweening";
import { createEmitter, updateParticles, getAllParticles } from "@arcane/runtime/particles";
import { createInputMap, isActionDown, isActionPressed } from "@arcane/runtime/input";
import {
  updateScreenTransition, drawScreenTransition,
} from "@arcane/runtime/rendering";
import { rgb } from "@arcane/runtime/ui";

const game = createGame({ name: "my-game", zoom: 2.0 });

// Input actions — supports keyboard + gamepad + touch in one place
const input = createInputMap({
  left:  ["ArrowLeft", "a", { type: "gamepadAxis", axis: "LeftStickX", direction: -1 }],
  right: ["ArrowRight", "d", { type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
  jump:  ["Space", "ArrowUp", "w", "GamepadA"],
});

let state = newGame();

game.state({ get: () => state, set: (s) => { state = s; } });

game.onFrame((ctx) => {
  // 1. Input — use action map, not raw keys
  let dx = 0;
  if (isActionDown("left", input)) dx = -1;
  if (isActionDown("right", input)) dx = 1;
  if (isActionPressed("jump", input)) state = jump(state);

  // 2. Update (pure functions from game.ts)
  state = movePlayer(state, dx * SPEED * ctx.dt);

  // 3. Camera — smooth follow with bounds, not raw setCamera()
  setCameraBounds({ minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H });
  const shake = getCameraShakeOffset();
  followTargetSmooth(state.x + shake.x, state.y + shake.y, 2.0, 0.08);

  // 4. Update subsystems — ALWAYS call these
  updateTweens(ctx.dt);
  updateParticles(ctx.dt);
  updateScreenTransition(ctx.dt);

  // 5. Render — no clearSprites() needed (autoClear: true by default)
  drawColorSprite({ color: rgb(80, 80, 80), x: 0, y: 0, w: 800, h: 600, layer: 0 });
  drawColorSprite({ color: rgb(60, 180, 255), x: state.x - 16, y: state.y - 16, w: 32, h: 32, layer: 1 });

  // 6. Render particles from engine particle system
  for (const p of getAllParticles()) {
    drawSprite({
      textureId: p.textureId, x: p.x - 2, y: p.y - 2,
      w: 4 * p.scale, h: 4 * p.scale,
      opacity: p.lifetime / p.maxLifetime,
      blendMode: "additive", layer: 5,
    });
  }

  // 7. Transitions overlay (no-op if inactive)
  drawScreenTransition();

  // 8. HUD — hud.text/bar/label are screen-space by default
  hud.text(`Score: ${state.score}`, 10, 10);
  hud.bar(10, 30, state.hp / state.maxHp);
});
```

**Key points:**
- `createGame()` handles `clearSprites()`, initial camera, agent registration, and provides `ctx.dt`/`ctx.viewport`/`ctx.elapsed`/`ctx.frame`.
- Use `createInputMap()` instead of raw `isKeyDown()` — gets you gamepad and touch for free.
- Use `followTargetSmooth()` instead of raw `setCamera()` — smooth follow with deadzone support.
- Always call `updateTweens(dt)`, `updateParticles(dt)`, and `updateScreenTransition(dt)` in your frame loop, even if you're not using them yet. They're no-ops when idle and ready when you need them.
- Use `drawColorSprite()` for colored rectangles without pre-creating textures.
- Use `hud.text()`/`hud.bar()`/`hud.label()` for HUD without manually passing `screenSpace: true`.

## Coordinate System

**This is not a web canvas.** The coordinate system is camera-based, not screen-based. The viewport size is **not fixed** — use `getViewportSize()` to get actual dimensions. Values are in **logical pixels** (DPI-independent).

```
  World space (where sprites live):
  VPW = viewport width, VPH = viewport height

  Default camera at (0, 0):
  ┌───────────────────────────────────┐
  │ (-VPW/2, -VPH/2)  (VPW/2, -VPH/2)│
  │                                    │
  │            (0, 0)                  │  <- center of screen, NOT top-left
  │                                    │
  │ (-VPW/2,  VPH/2)  (VPW/2,  VPH/2)│
  └───────────────────────────────────┘

  After setCamera(VPW/2, VPH/2):
  ┌───────────────────────────────────┐
  │ (0, 0)                  (VPW, 0)  │  <- now (0,0) is top-left!
  │                                    │
  │          (VPW/2, VPH/2)           │
  │                                    │
  │ (0, VPH)              (VPW, VPH)  │
  └───────────────────────────────────┘
```

**Key facts:**
- Camera defaults to **(0, 0)** — the **center** of the screen, not the top-left
- `drawSprite({x, y, ...})` positions the sprite's **top-left corner** in world space
- **`drawSprite` is always world-space** — no `screenSpace` option. Camera transform is applied by the GPU.
- `screenSpace: true` is only on `drawText`, `drawRect`, `drawPanel`, `drawBar`, `drawLabel` — bypasses camera, (0,0) at top-left
- Y increases **downward** (same as web)
- Visible world area: `camera +/- viewport / (2 * zoom)` in each axis
- **Viewport is not fixed** — always use `getViewportSize()`, never hardcode dimensions

**Recommended pattern** — set camera so (0, 0) is top-left (web-like):
```typescript
const { width: VPW, height: VPH } = getViewportSize();
setCamera(VPW / 2, VPH / 2);  // now (0,0) = top-left corner
```

**Scrolling world** — smooth camera follow with bounds:
```typescript
setCameraBounds({ minX: 0, minY: 0, maxX: worldWidth, maxY: worldHeight });
setCameraDeadzone({ width: 60, height: 40 });
followTargetSmooth(player.x, player.y, 2.0, 0.08);
```

## Common Mistakes

**1. Forgetting `setCamera()`** — Without it, camera is at (0,0) = screen center. Fix: call `setCamera(VPW/2, VPH/2)` every frame for web-like coordinates, or use `followTargetSmooth()`.

**2. Hardcoding viewport size** — Never use `800`, `600`. Always: `const { width: VPW, height: VPH } = getViewportSize();`

**3. Drawing HUD in world space** — Use `screenSpace: true` for health bars, scores, menus. `drawSprite` does NOT support `screenSpace` — use `drawText`/`drawRect`/`drawBar`/`drawLabel`.

**4. Missing `clearSprites()` / re-drawing every frame** — Draw calls are NOT persisted. Redraw everything in `onFrame()`. (`createGame()` auto-clears.)

**5. Wrong layer ordering** — Lower layers draw behind higher ones. Ground: 0, sprites: 1-10, UI: 90+, text: 100+.

**6. Forgetting `dt` for movement** — `player.x += speed` moves faster on faster machines. Always: `player.x += speed * dt`.

**7. Using wrong key names** — Space is `"Space"` (not `" "`), Enter is `"Enter"` (not `"Return"`). Letters are lowercase: `"a"`, `"b"`. Arrows: `"ArrowLeft"`, `"ArrowRight"`.

**8. Importing from wrong module** — State logic in `game.ts` with no rendering imports. Visual code in `visual.ts`.

**9. Forgetting gamepad deadzone** — Always apply ~0.15 deadzone: `const move = Math.abs(raw) > 0.15 ? raw : 0;`

**10. `setBackgroundColor` range** — Takes 0.0-1.0 floats, NOT 0-255 integers.

**11. Writing your own particle system** — Use `createEmitter()` + `updateParticles(dt)` + `getAllParticles()`. The engine handles pooling, lifetime, color interpolation, burst/continuous modes. See [docs/particles.md](docs/particles.md).

**12. Using raw `Math.sin()` for animation** — Use `tween()` + `updateTweens(dt)` with 30 built-in easing functions. Tweens handle timing, completion callbacks, and chaining. See [docs/tweening.md](docs/tweening.md).

**13. Hand-rolling screen transitions** — Use `startScreenTransition("fade", 0.5, opts, onMidpoint)`. Five built-in patterns (fade, wipe, circleIris, diamond, pixelate). See [docs/transitions.md](docs/transitions.md).

**14. Polling raw `isKeyDown()` for all input** — Use `createInputMap()` + `isActionDown()`/`isActionPressed()`. Maps named actions to keyboard + gamepad + touch. See [docs/input.md](docs/input.md).

**15. Using raw `setCamera()` each frame** — Use `followTargetSmooth()` with `setCameraBounds()` and `setCameraDeadzone()`. Handles smooth interpolation and clamping. See [docs/coordinates.md](docs/coordinates.md).

## Recommended Reading by Genre

Read the **Essential** guides first, then the genre-specific guides for your game type.

**Platformer:** [coordinates.md](docs/coordinates.md) (camera follow + bounds) → [physics.md](docs/physics.md) (AABB collision) → [juice.md](docs/juice.md) (impact, shake on land/hit) → [particles.md](docs/particles.md) (dust, death, fire effects) → [tweening.md](docs/tweening.md) (animated pickups, screen flash) → [input.md](docs/input.md) (gamepad support)

**RPG / Roguelike:** [tilemaps.md](docs/tilemaps.md) (grid maps) → [scenes.md](docs/scenes.md) (menu flow, save/load) → [procgen.md](docs/procgen.md) (WFC dungeons) → [juice.md](docs/juice.md) (floating damage text, impact) → [tweening.md](docs/tweening.md) (menu animations)

**Action / Shooter:** [physics.md](docs/physics.md) (rigid bodies, raycast) → [particles.md](docs/particles.md) (explosions, muzzle flash) → [juice.md](docs/juice.md) (hitstop, shake, impact) → [input.md](docs/input.md) (gamepad + touch) → [audio.md](docs/audio.md) (spatial audio)

**Puzzle:** [rendering.md](docs/rendering.md) (sprites, text) → [tweening.md](docs/tweening.md) (piece movement, pop effects) → [scenes.md](docs/scenes.md) (level select, save) → [ui.md](docs/ui.md) (menus, buttons)

## Topic Guides

### Essential — read before writing game code

| Guide | Contents |
|-------|----------|
| [docs/rendering.md](docs/rendering.md) | Sprites, textures, drawColorSprite, text/MSDF, nine-slice, post-processing, shaders, lighting |
| [docs/coordinates.md](docs/coordinates.md) | Camera follow, smooth follow, bounds, deadzone, parallax, zoom |
| [docs/tweening.md](docs/tweening.md) | `tween()`, 30 easing functions, `sequence()`/`parallel()`/`stagger()`, camera shake, screen flash |
| [docs/particles.md](docs/particles.md) | `createEmitter()`, burst/continuous modes, rendering particles, floating text |
| [docs/juice.md](docs/juice.md) | `impact()` combinator (shake + hitstop + flash + particles), trails/ribbons, typewriter text |
| [docs/transitions.md](docs/transitions.md) | Screen transitions: fade, wipe, circleIris, diamond, pixelate |
| [docs/input.md](docs/input.md) | `createInputMap()`, keyboard, gamepad, touch, action mapping, combos |
| [docs/entities.md](docs/entities.md) | Entity handles, collision registry, createGame patterns, immutable state |

### As needed

| Guide | Contents |
|-------|----------|
| [docs/physics.md](docs/physics.md) | Rigid bodies, AABB helpers, collision layers, constraints, queries |
| [docs/animation.md](docs/animation.md) | Basic animation, FSM, blending |
| [docs/audio.md](docs/audio.md) | Sound, music, spatial audio, crossfade, bus mixing |
| [docs/ui.md](docs/ui.md) | HUD, buttons, sliders, toggles, text input, layout, focus, widget auto-input |
| [docs/tilemaps.md](docs/tilemaps.md) | Basic + layered, auto-tiling, animated tiles, tile properties |
| [docs/grids.md](docs/grids.md) | Isometric, hex, grid + hex pathfinding |
| [docs/scenes.md](docs/scenes.md) | Scene manager, save/load, persistence, migrations |
| [docs/procgen.md](docs/procgen.md) | WFC, constraints, validation |
| [docs/testing.md](docs/testing.md) | Harness, property testing, visual testing / draw call capture |
| [docs/game-patterns.md](docs/game-patterns.md) | Angular movement, screen wrapping, cooldowns, entity lifecycle |
| [docs/assets.md](docs/assets.md) | Asset catalog, download commands, OpenGameArt.org |

## Type Declarations

Per-module type files with JSDoc documentation. Check these before using unfamiliar functions.

| File | Module |
|------|--------|
| `types/rendering.d.ts` | `@arcane/runtime/rendering` |
| `types/ui.d.ts` | `@arcane/runtime/ui` |
| `types/physics.d.ts` | `@arcane/runtime/physics` |
| `types/pathfinding.d.ts` | `@arcane/runtime/pathfinding` |
| `types/tweening.d.ts` | `@arcane/runtime/tweening` |
| `types/particles.d.ts` | `@arcane/runtime/particles` |
| `types/scenes.d.ts` | `@arcane/runtime/scenes` |
| `types/persistence.d.ts` | `@arcane/runtime/persistence` |
| `types/input.d.ts` | `@arcane/runtime/input` |
| `types/procgen.d.ts` | `@arcane/runtime/procgen` |
| `types/state.d.ts` | `@arcane/runtime/state` |
| `types/systems.d.ts` | `@arcane/runtime/systems` |
| `types/testing.d.ts` | `@arcane/runtime/testing` |
| `types/agent.d.ts` | `@arcane/runtime/agent` |
| `types/game.d.ts` | `@arcane/runtime/game` |

Use `/api <function>` to look up specific function signatures without reading the full file.

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

## Tips

- Always multiply velocities/movement by `dt` for frame-rate independence.
- State functions are pure: state in, state out. Never mutate state directly.
- `loadTexture()` and `loadSound()` cache by path — calling twice returns the same handle.
- Layer ordering: 0 = background, 1-10 = game objects, 100+ = HUD.
- Use `createSolidTexture(name, r, g, b)` for quick colored rectangles without image assets.
- Test game logic in `*.test.ts` files using `describe`, `it`, `assert` from `@arcane/runtime/testing`.
- Tests run in both Node.js and V8 — avoid Node-specific APIs in test files.
- Key names: `"Space"` not `" "`, `"Enter"` not `"\n"`. Check type declarations if unsure.
- For rotation, `0` = no rotation, positive = clockwise. Ship sprites facing "up" need `angle - Math.PI/2` offset.
- Use `blendMode: "additive"` for glowing effects (exhaust, fire, magic).
- Use `impact()` or `impactLight()` when something hits — one call gives you shake + flash + particles.
- Use `createEmitter()` for any visual effect that spawns many short-lived objects (fire, dust, sparks, explosions).
- Use `startScreenTransition()` for level changes — don't hand-roll fade overlays.
