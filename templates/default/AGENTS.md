# {{PROJECT_NAME}} — Agent Guide

You are an expert game developer helping the user build their game. Translate non-technical requests ("make the character jump higher", "add enemies that chase the player") into working code using the patterns below.

**Before writing code**, check the type declarations in `types/` for the API you need. Use `/api <function>` to look up specific function signatures. For detailed patterns and examples, see the topic guides in `docs/`.

## Architecture

### File Organization

Four starter files, each with a clear job:

| File | Responsibility | Imports rendering? |
|------|---------------|-------------------|
| `src/config.ts` | Constants, tuning values, shared types | No |
| `src/game.ts` | Pure game logic — state in, state out | No |
| `src/render.ts` | All draw calls — sprites, shapes, HUD | Yes |
| `src/visual.ts` | Bootstrap + frame loop orchestrator | Yes |

**One concept = one file.** As your game grows, split by domain (what the code *does*), not by entity type:

```
src/
├── config.ts          — constants, tuning, shared types
├── game.ts            — core game logic (stays pure)
├── render.ts          → split into render-world.ts + render-hud.ts
├── visual.ts          — frame loop (stays thin)
├── combat.ts          — damage, attack rolls, turn logic
├── spawning.ts        — wave generation, placement rules
├── levels.ts          — level data, loading, progression
└── game.test.ts       — tests for game logic
```

**Guidelines:**
- `game.ts` and any logic file must NOT import rendering modules — keeps them headless-testable.
- `visual.ts` stays thin — just bootstrap, input, frame loop. Delegate rendering to `render.ts`.
- Import constants and types from `config.ts`, not inline magic numbers.

Hot-reload: saving any file restarts the game loop (~200ms). State resets to initial.

Imports use `@arcane/runtime/{module}`:
`state`, `rendering`, `ui`, `physics`, `pathfinding`, `tweening`, `particles`, `systems`, `scenes`, `persistence`, `input`, `agent`, `testing`, `game`

## Development Workflow

**Think iteratively, not all at once.** Do NOT design the entire game upfront and then implement it in one pass. Instead, start with the simplest possible version and grow it step by step.

### How to Think About It

A game is built in layers, not all at once. Each layer should be **playable** before you add the next:

1. **A thing on screen that moves** — colored rectangle + input. Run `arcane dev`. Done.
2. **The core mechanic** — what makes this game *this game*? Add just that. Verify.
3. **One enemy / obstacle / interaction** — not all of them, just one. Verify.
4. **Scoring / win / lose** — basic game loop is now complete. Verify.
5. **More content** — additional enemies, levels, items. One at a time. Verify each.
6. **Polish** — particles, sound, screen shake, transitions. One at a time.

Each step is a small code change (20-50 lines), verified with `arcane dev` before moving on. **Never write more than ~50 lines without checking that the game still runs.**

### The Iteration Cycle

For each step above:

1. **Write the smallest change** — a single function, entity, or visual element
2. **Run `arcane dev`** — verify it works visually, fix immediately if not
3. **Write a test** — cover the logic in `*.test.ts`, run `arcane test`
4. **Commit** — small, working increments

### File Planning

Before writing code, decide the file structure. Each file should own **one concept**. The natural boundaries are:

- **An algorithm** — dungeon generation, FOV, pathfinding. One algorithm = one file.
- **A game domain** — combat logic, character creation, inventory, spawning. Group the pure functions and constants for one feature together.
- **A constant/type table** — stat tables, level data, shared type definitions. Data that multiple files reference.
- **A rendering scope** — world drawing vs HUD drawing. Render files read state but never call game logic.

Don't split by entity type (no `player.ts`, `enemy.ts`) — entities are data in arrays, not classes. Split by what the code *does*.

Examples by complexity:

- **Simple game** → `visual.ts` + `config.ts`
- **Game with logic** → add `game.ts` for pure state functions
- **Game with multiple domains** → `combat.ts`, `levels.ts`, `spawning.ts`
- **Complex rendering** → split `render.ts` into `render-world.ts` + `render-hud.ts`

## Quick Start

```typescript
import { createGame, drawColorSprite, hud } from "@arcane/runtime/game";
import { followTargetWithShake } from "@arcane/runtime/rendering";
import { shakeCamera } from "@arcane/runtime/tweening";
// Particles: prefer burstParticles()/streamParticles() for quick effects,
// createEmitter() for fine-grained control.
import { burstParticles, streamParticles, createEmitter, drawAllParticles } from "@arcane/runtime/particles";
import { createInputMap, isActionDown, isActionPressed, WASD_ARROWS } from "@arcane/runtime/input";
import { rgb } from "@arcane/runtime/ui";

const SPEED = 200;
const game = createGame({ name: "my-game", zoom: 1.0 });

// Input actions — WASD_ARROWS preset gives left/right/up/down/action with keyboard+gamepad
const input = createInputMap(WASD_ARROWS);

let state = { x: 100, y: 100, score: 0 };

game.state({ get: () => state, set: (s) => { state = s; } });

game.onFrame((ctx) => {
  // 1. Input — use action map, not raw keys
  let dx = 0;
  if (isActionDown("left", input)) dx = -1;
  if (isActionDown("right", input)) dx = 1;

  // 2. Update
  state = { ...state, x: state.x + dx * SPEED * ctx.dt };

  // 3. Camera — smooth follow (auto-reads shake offset)
  followTargetWithShake(state.x, state.y, 2.0, 0.08);

  // 4. Render — no clearSprites() needed (autoClear: true by default)
  drawColorSprite({ color: rgb(60, 180, 255), x: state.x - 16, y: state.y - 16, w: 32, h: 32, layer: 1 });

  // 5. Render all particles as circles (auto-reads particle colors/positions)
  drawAllParticles();

  // 6. HUD — hud.text/bar/label are screen-space by default
  hud.text(`Score: ${state.score}`, 10, 10);

  // Subsystem updates (tweens, particles, transitions, flash) are automatic
  // via autoSubsystems (default: true). No manual calls needed.
});
```

**Key points:**
- `createGame()` handles `clearSprites()`, initial camera, agent registration, subsystem updates, and provides `ctx.dt`/`ctx.viewport`/`ctx.elapsed`/`ctx.frame`.
- `autoSubsystems: true` (default) auto-calls `updateTweens(dt)`, `updateParticles(dt)`, `updateScreenTransition(dt)`, `drawScreenTransition()`, and `drawScreenFlash()`. No manual calls needed.
- Use `createInputMap(WASD_ARROWS)` for standard WASD+arrows+gamepad, or spread to extend: `{ ...WASD_ARROWS, shoot: ["x"] }`.
- Use `followTargetWithShake()` instead of manual `getCameraShakeOffset()` + `followTargetSmooth()`.
- Use `drawAllParticles()` instead of manually looping `getAllParticles()` + `drawCircle()`.
- Use `drawColorSprite()` for colored rectangles without pre-creating textures.
- Use `hud.text()`/`hud.bar()`/`hud.label()` for HUD without manually passing `screenSpace: true`. Use `hud.overlay()` for full-screen effects (pause, damage flash).
- Use `createSpriteGroup()` for multi-part characters instead of multiple manual `drawSprite()` calls.
- Use `createRng(seed)` for ergonomic deterministic randomness instead of threading `PRNGState` through every call.
- Use `drawCircle()`/`drawLine()`/`drawTriangle()` for shape primitives instead of manual sprite hacks.

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

**Which camera pattern?**

| Pattern | Camera call | World (0,0) is | Best for |
|---------|-------------|----------------|----------|
| Centered-world (default) | `followTargetSmooth(state.x, state.y, ...)` | Screen center | Most games |
| Web-like | `followTargetSmooth(vpW/2, vpH/2, ...)` | Top-left | Fixed-viewport |

**Centered-world** (default scaffold pattern):
```typescript
followTargetSmooth(state.x + shake.x, state.y + shake.y, ZOOM, 0.08);
```

**Web-like** — makes (0, 0) the top-left corner:
```typescript
const { width: VPW, height: VPH } = getViewportSize();
followTargetSmooth(VPW / 2 + shake.x, VPH / 2 + shake.y, ZOOM, 0.08);
```

**Scrolling world** — smooth camera follow with bounds:
```typescript
setCameraBounds({ minX: 0, minY: 0, maxX: worldWidth, maxY: worldHeight });
setCameraDeadzone({ width: 60, height: 40 });
followTargetSmooth(player.x, player.y, 2.0, 0.08);
```

## Common Mistakes

**0. Using `npx arcane` or `npm run arcane`** — `arcane` is a native Rust binary, not an npm package. Always use `arcane` directly: `arcane dev`, `arcane test`, etc. Never `npx arcane`.

**1. Forgetting `setCamera()`** — Without it, camera is at (0,0) = screen center. Fix: call `setCamera(VPW/2, VPH/2)` every frame for web-like coordinates, or use `followTargetSmooth()`.

**2. Hardcoding viewport size** — Never use `800`, `600`. Always: `const { width: VPW, height: VPH } = getViewportSize();`

**3. Drawing HUD in world space** — Use `screenSpace: true` for health bars, scores, menus. `drawSprite` does NOT support `screenSpace` — use `drawText`/`drawRect`/`drawBar`/`drawLabel`.

**4. Missing `clearSprites()` / re-drawing every frame** — Draw calls are NOT persisted. Redraw everything in `onFrame()`. (`createGame()` auto-clears.)

**5. Wrong layer ordering** — Lower layers draw behind higher ones. Ground: 0, sprites: 1-10, UI: 90+, text: 100+.

**6. Forgetting `dt` for movement** — `player.x += speed` moves faster on faster machines. Always: `player.x += speed * dt`.

**7. Using wrong key names** — Space is `"Space"` (not `" "`), Enter is `"Enter"` (not `"Return"`). Letters are lowercase: `"a"`, `"b"`. Arrows: `"ArrowLeft"`, `"ArrowRight"`.

**8. Importing from wrong module** — State logic in `game.ts`/`config.ts` with no rendering imports. Draw calls in `render.ts`. Visual orchestration in `visual.ts`.

**9. Forgetting gamepad deadzone** — Always apply ~0.15 deadzone: `const move = Math.abs(raw) > 0.15 ? raw : 0;`

**10. `setBackgroundColor` range** — Takes 0.0-1.0 floats, NOT 0-255 integers.

**11. Writing your own particle system** — Use `createEmitter()` + `updateParticles(dt)` + `getAllParticles()`. The engine handles pooling, lifetime, color interpolation, burst/continuous modes. See [docs/particles.md](docs/particles.md).

**12. Using raw `Math.sin()` for animation** — Use `tween()` + `updateTweens(dt)` with 30 built-in easing functions. Tweens handle timing, completion callbacks, and chaining. See [docs/tweening.md](docs/tweening.md).

**13. Hand-rolling screen transitions** — Use `startScreenTransition("fade", 0.5, opts, onMidpoint)`. Five built-in patterns (fade, wipe, circleIris, diamond, pixelate). See [docs/transitions.md](docs/transitions.md).

**14. Polling raw `isKeyDown()` for all input** — Use `createInputMap()` + `isActionDown()`/`isActionPressed()`. Maps named actions to keyboard + gamepad + touch. See [docs/input.md](docs/input.md).

**15. Using raw `setCamera()` each frame** — Use `followTargetSmooth()` with `setCameraBounds()` and `setCameraDeadzone()`. Handles smooth interpolation and clamping. See [docs/coordinates.md](docs/coordinates.md).

**16. Hand-rolling platformer physics** — Use `createPlatformerState()` + `platformerMove()` + `platformerJump()` + `platformerStep()`. Handles gravity, coyote time, jump buffer, one-way platforms. See [docs/game-patterns.md](docs/game-patterns.md).

**17. Threading PRNGState through every random call** — Use `createRng(seed)` for a mutable wrapper: `rng.int()`, `rng.pick()`, `rng.roll("2d6+3")`, `rng.shuffle()`. Same deterministic output, less boilerplate.

**18. Multiple drawSprite() calls for multi-part characters** — Use `createSpriteGroup()` + `drawSpriteGroup()`. Handles offsets, flip mirroring, opacity, per-part visibility. See [docs/entities.md](docs/entities.md).

**19. Using drawRect() for circles/lines/arcs** — Use `drawCircle()`, `drawEllipse()`, `drawRing()`, `drawLine()`, `drawTriangle()`, `drawArc()`, `drawSector()`, `drawCapsule()`, `drawPolygon()` from `@arcane/runtime/ui`. See [docs/ui.md](docs/ui.md).

**20. Mixing up color ranges** — `rgb(r, g, b)` takes **0-255 integers** and returns a `Color`. All other APIs (`setBackgroundColor`, `flashScreen`, particle `startColor`/`endColor`, `createSolidTexture`) expect a `Color` with **0.0-1.0 float** components. Always use `rgb()` to convert from 0-255: `rgb(255, 0, 0)` not `{ r: 255, g: 0, b: 0 }`.

**21. TypeScript narrowing with spread + null unions** — When you write `let st = { ...s, field: null }`, TypeScript narrows `field` to `null` (not `T | null`). Later assigning `st = { ...st, field: someValue }` is a type error. Fix: add an explicit type annotation: `let st: GameState = { ...s, field: null };`. This affects any pure-function state pattern where you reset union-typed fields via spreads.

**22. TypeScript narrowing narrows `let` bindings from union types** — Inside `if (state.phase === "playing")`, writing `let phase = state.phase` narrows `phase` to `"playing"` (not `GamePhase`). Reassigning `phase = "dead"` is then a type error. Fix: `let phase: GamePhase = state.phase;`.

**23. Stale closures in transition midpoint callbacks** — `startScreenTransition()` callbacks fire asynchronously. State may change between starting the transition and the midpoint. Capture values at call time: `const level = state.level; startScreenTransition("fade", 0.5, {}, () => { state = loadLevel(level + 1); });`. Don't reference mutable state directly.

**24. Importing shakeCamera/flashScreen from the wrong module** — `shakeCamera()`, `flashScreen()`, and `getCameraShakeOffset()` are defined in `@arcane/runtime/tweening` but also re-exported from `@arcane/runtime/rendering` for convenience. Both imports work. `impact()` (which calls them internally) is in `@arcane/runtime/rendering`.

**25. Using `startColor` with `burstParticles()`/`streamParticles()`** — The convenience functions take `color` (not `startColor`): `burstParticles(x, y, { color: rgb(255, 200, 50) })`. Only the lower-level `createEmitter()` uses `startColor`/`endColor`.

**26. `hud.text` uses `tint:` not `color:`** — Write `hud.text("Score", 10, 10, { tint: GOLD })`. There is no `color` option; passing one silently does nothing.

**27. Calling `rgb()` inside onFrame causes GC freezes** — `rgb()` allocates a new object every call. Pre-compute colors at module scope: `const WHITE = rgb(255, 255, 255);`. Use the constant inside onFrame.

**28. Manual subsystem updates with createGame** — `createGame()` auto-calls `updateTweens(dt)`, `updateParticles(dt)`, `updateScreenTransition(dt)`, `drawScreenTransition()`, and `drawScreenFlash()` via `autoSubsystems: true` (default). You do NOT need to call these manually. Redundant calls are harmless but unnecessary. Only set `autoSubsystems: false` if you need custom update ordering.

## Recommended Reading by Genre

Read the **Essential** guides first, then the genre-specific guides for your game type.

**Platformer:** [game-patterns.md](docs/game-patterns.md) (platformer controller, coyote time, one-way platforms) → [coordinates.md](docs/coordinates.md) (camera follow + bounds) → [entities.md](docs/entities.md) (sprite groups for characters) → [juice.md](docs/juice.md) (impact, shake on land/hit) → [particles.md](docs/particles.md) (dust, death, fire effects) → [tweening.md](docs/tweening.md) (animated pickups, screen flash) → [input.md](docs/input.md) (gamepad support)

**RPG / Roguelike:** [tilemaps.md](docs/tilemaps.md) (grid maps) → [scenes.md](docs/scenes.md) (menu flow, save/load) → [procgen.md](docs/procgen.md) (WFC dungeons) → [juice.md](docs/juice.md) (floating damage text, impact) → [tweening.md](docs/tweening.md) (menu animations)

**Action / Shooter:** [physics.md](docs/physics.md) (rigid bodies, raycast) → [particles.md](docs/particles.md) (explosions, muzzle flash) → [juice.md](docs/juice.md) (hitstop, shake, impact) → [input.md](docs/input.md) (gamepad + touch) → [audio.md](docs/audio.md) (spatial audio)

**Top-Down / Simulation:** [coordinates.md](docs/coordinates.md) (camera follow + bounds) → [entities.md](docs/entities.md) (sprite groups, entity handles) → [particles.md](docs/particles.md) (weather, ambient effects) → [tweening.md](docs/tweening.md) (UI animations, popups) → [tilemaps.md](docs/tilemaps.md) (world maps, auto-tiling) → [input.md](docs/input.md) (movement, interactions)

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
| [docs/entities.md](docs/entities.md) | Entity handles, sprite groups, collision registry, createGame patterns, immutable state |

### As needed

| Guide | Contents |
|-------|----------|
| [docs/physics.md](docs/physics.md) | Rigid bodies, AABB helpers, collision layers, constraints, queries |
| [docs/animation.md](docs/animation.md) | Basic animation, FSM, blending |
| [docs/audio.md](docs/audio.md) | Sound, music, spatial audio, crossfade, bus mixing |
| [docs/ui.md](docs/ui.md) | HUD, hud.overlay, shape primitives, buttons, sliders, toggles, text input, layout, focus |
| [docs/tilemaps.md](docs/tilemaps.md) | Basic + layered, auto-tiling, animated tiles, tile properties |
| [docs/grids.md](docs/grids.md) | Isometric, hex, grid + hex pathfinding |
| [docs/scenes.md](docs/scenes.md) | Scene manager, save/load, persistence, migrations |
| [docs/procgen.md](docs/procgen.md) | WFC, constraints, validation |
| [docs/testing.md](docs/testing.md) | Harness, property testing, visual testing / draw call capture |
| [docs/game-patterns.md](docs/game-patterns.md) | Angular movement, screen wrapping, cooldowns, entity lifecycle, platformer controller, seeded RNG |
| [docs/assets.md](docs/assets.md) | Asset catalog, download commands, OpenGameArt.org |

## API Quick Reference

See [`types/cheatsheet.txt`](types/cheatsheet.txt) for every exported function as a one-liner, grouped by module. The 20 most common functions:

| Function | Module | What it does |
|----------|--------|-------------|
| `createGame(config?)` | game | Bootstrap game loop, auto-clear, agent registration |
| `drawSprite(opts)` | rendering | Draw a textured quad in world space |
| `drawColorSprite(opts)` | game | Draw a colored rectangle (auto-caches texture) |
| `drawText(text, x, y, opts?)` | rendering | Draw text (bitmap or MSDF font) |
| `loadTexture(path)` | rendering | Load image file, returns TextureId handle |
| `setCamera(x, y, zoom?)` | rendering | Set camera position and zoom |
| `followTargetSmooth(x, y, zoom?, smooth?)` | rendering | Smooth camera follow with deadzone |
| `followTargetWithShake(x, y, zoom?, smooth?)` | rendering | Smooth follow + auto camera shake offset |
| `getViewportSize()` | rendering | Returns `{ width, height }` of viewport |
| `isKeyDown(key)` / `isKeyPressed(key)` | rendering | Check keyboard state (held / just pressed) |
| `createInputMap(def)` | input | Map named actions to keyboard+gamepad+touch |
| `WASD_ARROWS` | input | Preset: WASD+arrows+gamepad sticks+action |
| `isActionDown(action, map)` | input | Check action state (abstracts input device) |
| `rgb(r, g, b, a?)` | ui | Create Color from 0-255 integers |
| `drawRect(x, y, w, h, opts?)` | ui | Draw a filled rectangle (screenSpace option) |
| `hud.text(content, x, y, opts?)` | game | Screen-space text shortcut for HUD |
| `hud.bar(x, y, fillRatio, opts?)` | game | Screen-space health/progress bar |
| `tween(target, props, dur, opts?)` | tweening | Animate object properties with easing |
| `updateTweens(dt)` | tweening | Advance all active tweens (call every frame) |
| `createEmitter(config)` | particles | Create a particle emitter |
| `updateParticles(dt)` | particles | Advance all particles (call every frame) |
| `drawAllParticles(opts?)` | particles | Render all TS particles as circles |
| `shakeCamera(intensity, dur, freq?)` | tweening | Trigger camera shake effect |

## Type Declarations

Per-module type files with JSDoc documentation. Check these before using unfamiliar functions.

| File | Module |
|------|--------|
| `types/cheatsheet.txt` | **All modules** — compact one-liner signatures |
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

**IMPORTANT:** `arcane` is a native Rust binary — **never** use `npx arcane`, `node arcane`, or `npm run arcane`. It is not an npm package. Just `arcane`.

**MCP / hot_reload:** If `hot_reload` returns `{"ok":false,"error":"Game window is not running..."}`, the dev server has stopped. Start it with `arcane dev src/visual.ts` and then retry.

**MCP state looks empty?** Likely a TS error preventing `initGame()` from running. Check the `arcane dev` terminal for errors. Fix the TypeScript issue and hot-reload will re-run the game.

File organization: see **Architecture** section above. Start with the 4 files (`config.ts`, `game.ts`, `render.ts`, `visual.ts`), split as you grow.

## Tips

- Always multiply velocities/movement by `dt` for frame-rate independence.
- State functions are pure: state in, state out. Never mutate state directly.
- `loadTexture()` and `loadSound()` cache by path — calling twice returns the same handle.
- Layer ordering: 0 = background, 1-10 = game objects, 100+ = HUD.
- Use `createSolidTexture(name, color)` or `drawColorSprite()` for quick colored rectangles without image assets. Colors use 0-1 float components; use `rgb(r, g, b)` to convert from 0-255.
- See [docs/game-patterns.md](docs/game-patterns.md) for state architecture: how to integrate PlatformerState with your game state, and how to use knockback with `platformerApplyImpulse()`.
- Test game logic in `*.test.ts` files using `describe`, `it`, `assert` from `@arcane/runtime/testing`.
- Tests run in both Node.js and V8 — avoid Node-specific APIs in test files.
- Key names: `"Space"` not `" "`, `"Enter"` not `"\n"`. Check type declarations if unsure.
- For rotation, `0` = no rotation, positive = clockwise. Ship sprites facing "up" need `angle - Math.PI/2` offset.
- Use `blendMode: "additive"` for glowing effects (exhaust, fire, magic).
- Use `impact()` or `impactLight()` when something hits — one call gives you shake + flash + particles.
- Use `burstParticles(x, y, opts)` or `streamParticles(x, y, opts)` for quick effects (explosions, fire, dust). They take `color` (not `startColor`). Use `createEmitter()` only when you need full control over every parameter.
- Use `startScreenTransition()` for level changes — don't hand-roll fade overlays.
- Use `wrapText()` / `drawTextWrapped()` for multi-line text with word wrapping. Use `drawTextAligned()` for horizontal alignment within a fixed-width area.
- Use `createNode()` / `setNodeTransform()` / `getWorldTransform()` / `applyToSprite()` from `@arcane/runtime/game` for parent-child transform hierarchies (weapons on characters, UI grouping).
- Use `preloadAssets()` to batch-load textures upfront. Check progress with `getLoadingProgress()` for loading screens.
