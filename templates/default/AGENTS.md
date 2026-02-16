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
import { isKeyDown, isKeyPressed, setCamera } from "@arcane/runtime/rendering";
import { rgb } from "@arcane/runtime/ui";

const game = createGame({ name: "my-game", zoom: 2.0 });

let state = newGame();

game.state({ get: () => state, set: (s) => { state = s; } });

game.onFrame((ctx) => {
  // 1. Input
  let dx = 0;
  if (isKeyDown("ArrowLeft")) dx = -1;
  if (isKeyDown("ArrowRight")) dx = 1;
  if (isKeyPressed("Space")) state = jump(state);

  // 2. Update (pure functions from game.ts)
  state = movePlayer(state, dx * SPEED * ctx.dt);

  // 3. Camera (override auto-camera when following player)
  setCamera(state.x, state.y, 2.0);

  // 4. Render — no clearSprites() needed (autoClear: true by default)
  drawColorSprite({ color: rgb(80, 80, 80), x: 0, y: 0, w: 800, h: 600, layer: 0 });
  drawColorSprite({ color: rgb(60, 180, 255), x: state.x - 16, y: state.y - 16, w: 32, h: 32, layer: 1 });

  // 5. HUD — hud.text/bar/label are screen-space by default
  hud.text(`Score: ${state.score}`, 10, 10);
  hud.bar(10, 30, state.hp / state.maxHp);
});
```

`createGame()` handles `clearSprites()`, `setCamera()`, agent registration, and provides `ctx.dt`/`ctx.viewport`/`ctx.elapsed`/`ctx.frame`. Use `drawColorSprite()` for colored rectangles without pre-creating textures. Use `hud.text()`/`hud.bar()`/`hud.label()` for HUD without manually passing `screenSpace: true`.

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

**Scrolling world** — center camera on the player:
```typescript
setCamera(player.x, player.y, 2.0);  // follow player, 2x zoom
```

## Common Mistakes

**1. Forgetting `setCamera()`** — Without it, camera is at (0,0) = screen center. Fix: call `setCamera(VPW/2, VPH/2)` every frame for web-like coordinates.

**2. Hardcoding viewport size** — Never use `800`, `600`. Always: `const { width: VPW, height: VPH } = getViewportSize();`

**3. Drawing HUD in world space** — Use `screenSpace: true` for health bars, scores, menus. `drawSprite` does NOT support `screenSpace` — use `drawText`/`drawRect`/`drawBar`/`drawLabel`.

**4. Missing `clearSprites()` / re-drawing every frame** — Draw calls are NOT persisted. Redraw everything in `onFrame()`. (`createGame()` auto-clears.)

**5. Wrong layer ordering** — Lower layers draw behind higher ones. Ground: 0, sprites: 1-10, UI: 90+, text: 100+.

**6. Forgetting `dt` for movement** — `player.x += speed` moves faster on faster machines. Always: `player.x += speed * dt`.

**7. Using wrong key names** — Space is `"Space"` (not `" "`), Enter is `"Enter"` (not `"Return"`). Letters are lowercase: `"a"`, `"b"`. Arrows: `"ArrowLeft"`, `"ArrowRight"`.

**8. Importing from wrong module** — State logic in `game.ts` with no rendering imports. Visual code in `visual.ts`.

**9. Forgetting gamepad deadzone** — Always apply ~0.15 deadzone: `const move = Math.abs(raw) > 0.15 ? raw : 0;`

**10. `setBackgroundColor` range** — Takes 0.0-1.0 floats, NOT 0-255 integers.

## Topic Guides

| Guide | Contents |
|-------|----------|
| [docs/coordinates.md](docs/coordinates.md) | Camera, viewport, resolution-adaptive, parallax, zoom |
| [docs/rendering.md](docs/rendering.md) | Sprites, textures, drawColorSprite, text/MSDF, post-processing, shaders, nine-slice, lighting, GI |
| [docs/animation.md](docs/animation.md) | Basic animation, FSM, blending |
| [docs/physics.md](docs/physics.md) | Rigid bodies, AABB helpers, collision layers |
| [docs/audio.md](docs/audio.md) | Sound, music, spatial audio, crossfade, bus mixing |
| [docs/ui.md](docs/ui.md) | HUD, buttons, sliders, toggles, text input, layout, focus, widget auto-input |
| [docs/tilemaps.md](docs/tilemaps.md) | Basic + layered, auto-tiling, animated tiles, tile properties |
| [docs/game-feel.md](docs/game-feel.md) | Tweening, chains, shake, particles, impact/juice, floating text, typewriter, trails, transitions |
| [docs/input.md](docs/input.md) | Keyboard, gamepad, touch, input actions, combos |
| [docs/grids.md](docs/grids.md) | Isometric, hex, grid + hex pathfinding |
| [docs/scenes.md](docs/scenes.md) | Scene manager, save/load, persistence, migrations |
| [docs/procgen.md](docs/procgen.md) | WFC, constraints, validation |
| [docs/testing.md](docs/testing.md) | Harness, property testing, visual testing / draw call capture |
| [docs/entities.md](docs/entities.md) | Entity handles, collision registry, createGame patterns, immutable state |
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
