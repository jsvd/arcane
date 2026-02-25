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

**Run `/check` after every code change.** Type errors break hot-reload silently — the game window shows the last working state while errors accumulate. The first few edits to a scaffolded project often introduce type errors (missing exports, wrong property names). Verify proactively; don't wait for the user to notice.

**Visual richness should permeate the development process, this is a game for humans** A game with good mechanics but flat visuals feels unfinished. Add particles, glows, multiple layers, and shape variety as you build.

### The Iteration Cycle

1. **Write a change**
2. **Run `/check`** — catches type errors immediately (hot-reload fails silently on TS errors)
3. **Run `arcane dev`** — verify visually, iterate on look and feel
4. **Write a test** — cover the logic in `*.test.ts`, run `/check` again
5. **Commit** — small, working increments

## Quick Start

```typescript
import { createGame, drawColorSprite, hud } from "@arcane/runtime/game";
import { followTargetWithShake, getViewportSize, setBackgroundColor } from "@arcane/runtime/rendering";
import { shakeCamera } from "@arcane/runtime/tweening";
import { burstParticles, streamParticles, drawAllParticles } from "@arcane/runtime/particles";
import { createInputMap, isActionDown, isActionPressed, WASD_ARROWS } from "@arcane/runtime/input";
import { rgb, drawCircle, withAlpha } from "@arcane/runtime/ui";

// --- Colors (pre-compute at module scope, never inside onFrame) ---
const BG_DARK = rgb(15, 10, 30);
const PLAYER_CORE = rgb(60, 180, 255);
const PLAYER_GLOW = rgb(100, 200, 255);
const STAR_DIM = rgb(80, 80, 100);
const STAR_BRIGHT = rgb(200, 200, 255);
const WHITE = rgb(255, 255, 255);

// --- Pre-generate starfield (don't create arrays in onFrame) ---
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: (i * 97) % 800 - 400,
  y: (i * 53) % 600 - 300,
  r: 1 + (i % 3),
  twinkleOffset: i * 0.7,
}));

const SPEED = 200;
const game = createGame({ name: "my-game", zoom: 1.0 });
const input = createInputMap(WASD_ARROWS);

let state = { x: 0, y: 0, score: 0 };
game.state({ get: () => state, set: (s) => { state = s; } });

game.onFrame((ctx) => {
  // 1. Input
  let dx = 0, dy = 0;
  if (isActionDown("left", input)) dx = -1;
  if (isActionDown("right", input)) dx = 1;
  if (isActionDown("up", input)) dy = -1;
  if (isActionDown("down", input)) dy = 1;

  // 2. Update + spawn trail particles when moving
  const moving = dx !== 0 || dy !== 0;
  if (moving) {
    state = { ...state, x: state.x + dx * SPEED * ctx.dt, y: state.y + dy * SPEED * ctx.dt };
    streamParticles(state.x, state.y, { color: PLAYER_GLOW, count: 1, speed: 20, lifetime: 0.3 });
  }

  // 3. Camera
  followTargetWithShake(state.x, state.y, 2.0, 0.08);

  // 4. Background — deep space with twinkling stars
  setBackgroundColor(BG_DARK.r, BG_DARK.g, BG_DARK.b);
  for (const s of STARS) {
    const twinkle = 0.5 + 0.5 * Math.sin(ctx.elapsed * 2 + s.twinkleOffset);
    const color = twinkle > 0.7 ? STAR_BRIGHT : STAR_DIM;
    drawCircle(s.x, s.y, s.r * twinkle, { color, layer: 0 });
  }

  // 5. Player — layered glow + core for depth
  drawCircle(state.x, state.y, 24, { color: withAlpha(PLAYER_GLOW, 0.3), layer: 1 }); // outer glow
  drawCircle(state.x, state.y, 18, { color: withAlpha(PLAYER_GLOW, 0.5), layer: 1 }); // inner glow
  drawCircle(state.x, state.y, 12, { color: PLAYER_CORE, layer: 2 });                 // core
  drawCircle(state.x - 4, state.y - 4, 4, { color: withAlpha(WHITE, 0.6), layer: 2 }); // highlight

  // 6. Particles (trail from movement)
  drawAllParticles();

  // 7. HUD
  hud.text(`Score: ${state.score}`, 10, 10);
});
```

**Key points:**
- **Layer visuals for depth** — outer glow → inner glow → core → highlight. Multiple overlapping shapes with transparency create rich visuals.
- **Pre-generate static data** — starfields, color constants, lookup tables at module scope. Never allocate in onFrame.
- **Particles for feedback** — `streamParticles()` on movement, `burstParticles()` on events. Visual feedback makes games feel alive.
- `createGame()` handles `clearSprites()`, camera, agent registration, subsystem updates. Provides `ctx.dt`/`ctx.elapsed`/`ctx.frame`.
- `autoSubsystems: true` (default) auto-calls `updateTweens(dt)`, `updateParticles(dt)`, `updateScreenTransition(dt)`, etc. No manual calls needed.
- Use `createInputMap(WASD_ARROWS)` for standard WASD+arrows+gamepad, or spread to extend: `{ ...WASD_ARROWS, shoot: ["x"] }`.
- Use `followTargetWithShake()` for camera with built-in shake offset.
- Use `withAlpha(color, alpha)` to create transparent versions of colors for glows and layering.
- Use `drawColorSprite()` for colored rectangles, `hud.text()`/`hud.bar()` for screen-space UI.
- Use `createSpriteGroup()` for multi-part characters, `createRng(seed)` for deterministic randomness.
- Use **SDF** (`sdfEntity()`) for procedural vector graphics — stars, hearts, glowing pickups, gradients. See [docs/sdf.md](docs/sdf.md).

## Coordinate System

**This is not a web canvas.** The coordinate system is camera-based, not screen-based. The viewport size is **not fixed** — use `getViewportSize()` to get actual dimensions. Values are in **logical pixels** (DPI-independent).

```
  World space (where sprites live):
  VPW = viewport width, VPH = viewport height

  Default camera at (0, 0):
  ┌───────────────────────────────────┐
  │ (-VPW/2, -VPH/2)  (VPW/2, -VPH/2) │
  │                                   │
  │            (0, 0)                 │  <- center of screen, NOT top-left
  │                                   │
  │ (-VPW/2,  VPH/2)  (VPW/2,  VPH/2) │
  └───────────────────────────────────┘

  After setCamera(VPW/2, VPH/2):
  ┌───────────────────────────────────┐
  │ (0, 0)                  (VPW, 0)  │  <- now (0,0) is top-left!
  │                                   │
  │          (VPW/2, VPH/2)           │
  │                                   │
  │ (0, VPH)              (VPW, VPH)  │
  └───────────────────────────────────┘
```

**Key facts:**
- Camera defaults to **(0, 0)** — the **center** of the screen, not the top-left
- `drawSprite({x, y, ...})` positions the sprite's **top-left corner** in world space by default
- `drawSprite` supports `screenSpace: true` — converts screen pixels to world coords before sending to GPU
- `screenSpace: true` is available on `drawSprite`, `drawText`, `drawRect`, `drawPanel`, `drawBar`, `drawLabel`, and all shapes — bypasses camera, (0,0) at top-left
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

**3. Drawing HUD in world space** — Use `screenSpace: true` for health bars, scores, menus. All draw functions support `screenSpace`, including `drawSprite`, `drawText`, `drawRect`, `drawBar`, `drawLabel`, and shapes.

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

**19. Using only one shape type** — Combine shapes for visual interest: triangles for pointed objects (ships, crystals), polygons for irregular surfaces (asteroids, terrain), rectangles for structures (buildings, platforms), circles for rounded elements (heads, wheels, glows). See "Visual Composition" section and [docs/ui.md](docs/ui.md).

**20. Mixing up color ranges** — `rgb(r, g, b)` takes **0-255 integers** and returns a `Color`. All other APIs (`setBackgroundColor`, `flashScreen`, particle `startColor`/`endColor`, `createSolidTexture`) expect a `Color` with **0.0-1.0 float** components. Always use `rgb()` to convert from 0-255: `rgb(255, 0, 0)` not `{ r: 255, g: 0, b: 0 }`.

**21. TypeScript narrowing with spread + null unions** — When you write `let st = { ...s, field: null }`, TypeScript narrows `field` to `null` (not `T | null`). Later assigning `st = { ...st, field: someValue }` is a type error. Fix: add an explicit type annotation: `let st: GameState = { ...s, field: null };`. This affects any pure-function state pattern where you reset union-typed fields via spreads.

**22. TypeScript narrowing narrows `let` bindings from union types** — Inside `if (state.phase === "playing")`, writing `let phase = state.phase` narrows `phase` to `"playing"` (not `GamePhase`). Reassigning `phase = "dead"` is then a type error. Fix: `let phase: GamePhase = state.phase;`.

**23. Stale closures in transition midpoint callbacks** — `startScreenTransition()` callbacks fire asynchronously. State may change between starting the transition and the midpoint. Capture values at call time: `const level = state.level; startScreenTransition("fade", 0.5, {}, () => { state = loadLevel(level + 1); });`. Don't reference mutable state directly.

**24. Importing shakeCamera/flashScreen from the wrong module** — `shakeCamera()`, `flashScreen()`, and `getCameraShakeOffset()` are defined in `@arcane/runtime/tweening` but also re-exported from `@arcane/runtime/rendering` for convenience. Both imports work. `impact()` (which calls them internally) is in `@arcane/runtime/rendering`.

**25. Using `startColor` with `burstParticles()`/`streamParticles()`** — The convenience functions take `color` (not `startColor`): `burstParticles(x, y, { color: rgb(255, 200, 50) })`. Only the lower-level `createEmitter()` uses `startColor`/`endColor`.

**26. `hud.text` uses `tint:` not `color:`** — Write `hud.text("Score", 10, 10, { tint: GOLD })`. There is no `color` option; passing one silently does nothing.

**27. Calling `rgb()` inside onFrame causes GC freezes** — `rgb()` allocates a new object every call. Pre-compute colors at module scope: `const WHITE = rgb(255, 255, 255);`. Use the constant inside onFrame.

**28. Manual subsystem updates with createGame** — `createGame()` auto-calls `updateTweens(dt)`, `updateParticles(dt)`, `updateScreenTransition(dt)`, `drawScreenTransition()`, and `drawScreenFlash()` via `autoSubsystems: true` (default). You do NOT need to call these manually. Redundant calls are harmless but unnecessary. Only set `autoSubsystems: false` if you need custom update ordering.

**29. Changing function signatures without updating callers** — If you change `tick(state, dt)` to `tick(state, dt, input)`, you must also update `visual.ts` and `game.test.ts` which call `tick()`. Same for changing `GameState` fields — update all files that access them. Run `/check` after each edit to catch these immediately.

**30. Calling `rng.float(min, max)` — float takes no arguments** — `rng.float()` returns a float in [0, 1) with no arguments. For a range, use `rng.float() * (max - min) + min`. For integers in a range, use `rng.int(min, max)`. Check `types/state.d.ts` for the `Rng` interface.

## What Should I Draw?

Pick the right function for what you're rendering:

```
"I want to draw..."
├── A textured image → drawSprite({ textureId, x, y, w, h })
├── A colored rectangle
│   ├── Game world (layer 0) → drawRectangle(x, y, w, h, { color })
│   ├── HUD / UI (layer 90) → drawRect(x, y, w, h, { color, screenSpace: true })
│   └── With rotation/blend → drawColorSprite({ color, x, y, w, h, rotation })
├── Shapes (see Visual Composition below for examples)
│   ├── Pointed → drawTriangle() (ships, arrows, crystals)
│   ├── Irregular → drawPolygon() (asteroids, terrain, shields)
│   ├── Rounded → drawCircle(), drawEllipse(), drawCapsule()
│   └── Outline → drawLine(), drawArc(), drawRing()
├── Text
│   ├── HUD text → hud.text("Score", 10, 10)
│   ├── World text → drawText("Hello", x, y)
│   └── Note: drawText() auto-uses crisp MSDF font when renderer is available
├── A health / progress bar
│   ├── HUD → hud.bar(x, y, fillRatio)
│   └── World (above enemy) → drawBar(x, y, w, h, fillRatio, { screenSpace: false })
├── A panel / dialog box → drawPanel() or drawNineSlice()
├── A tilemap → createTilemap() + drawTilemap()
└── Procedural vector graphics (gradients, glows, stars, hearts, mountains)
    └── SDF shapes → sdfEntity() + circle/star/heart/union/gradient (see docs/sdf.md)
```

## Visual Composition

Build game objects by combining different shapes. Each example mixes primitives for visual interest:

```typescript
// Spaceship — triangle body + rectangle wings + circle cockpit
function drawShip(x: number, y: number, angle: number) {
  drawTriangle(x, y - 20, x - 12, y + 10, x + 12, y + 10, { color: HULL, rotation: angle });
  drawRect(x - 18, y - 2, 8, 12, { color: WING });   // left wing
  drawRect(x + 10, y - 2, 8, 12, { color: WING });   // right wing
  drawCircle(x, y - 8, 5, { color: COCKPIT });       // cockpit
  drawCircle(x, y + 8, 3, { color: ENGINE_GLOW });   // engine
}

// Crystal — stacked triangles with glow
function drawCrystal(x: number, y: number, h: number) {
  drawTriangle(x, y - h, x - 8, y, x + 8, y, { color: CRYSTAL_BRIGHT });
  drawTriangle(x - 4, y - h * 0.6, x - 10, y, x + 2, y, { color: CRYSTAL_DARK });
  drawTriangle(x + 4, y - h * 0.6, x - 2, y, x + 10, y, { color: CRYSTAL_MID });
}

// Character — ellipse body + circle head + rect limbs
function drawCharacter(x: number, y: number) {
  drawEllipse(x, y + 8, 10, 14, { color: BODY });    // torso
  drawCircle(x, y - 10, 8, { color: SKIN });         // head
  drawRect(x - 14, y + 2, 4, 12, { color: BODY });   // left arm
  drawRect(x + 10, y + 2, 4, 12, { color: BODY });   // right arm
  drawRect(x - 6, y + 20, 5, 10, { color: LEGS });   // left leg
  drawRect(x + 1, y + 20, 5, 10, { color: LEGS });   // right leg
}

// Tree — trapezoid trunk + layered triangles for foliage
function drawTree(x: number, y: number) {
  drawRect(x - 6, y, 12, 30, { color: BARK });       // trunk
  drawTriangle(x, y - 40, x - 25, y, x + 25, y, { color: LEAVES_DARK });
  drawTriangle(x, y - 55, x - 20, y - 20, x + 20, y - 20, { color: LEAVES_MID });
  drawTriangle(x, y - 65, x - 15, y - 35, x + 15, y - 35, { color: LEAVES_BRIGHT });
}

// Asteroid — polygon base + circle craters
function drawAsteroid(x: number, y: number, r: number) {
  drawPolygon([/* irregular 8-point polygon coords */], { color: ROCK });
  drawCircle(x - r * 0.3, y - r * 0.2, r * 0.15, { color: SHADOW }); // crater
  drawCircle(x + r * 0.4, y + r * 0.3, r * 0.1, { color: SHADOW });  // crater
}
```

**Shape selection guide:**
| Shape | Best for |
|-------|----------|
| `drawTriangle()` | Ships, arrows, crystals, roofs, trees |
| `drawRect()` | Buildings, platforms, limbs, bars, UI panels |
| `drawPolygon()` | Irregular terrain, asteroids, shields, explosions |
| `drawCircle()` | Heads, wheels, projectiles, glows, joints |
| `drawEllipse()` | Bodies, clouds, shadows, stretched elements |
| `drawLine()` | Lasers, connections, grid lines, trajectories |
| `drawCapsule()` | Pills, rounded platforms, characters |
| `drawArc()` / `drawRing()` | Health rings, radar sweeps, partial circles |

**For complex procedural graphics** (gradients, glows, stars, hearts, mountains), use **SDF shapes** instead. SDF creates resolution-independent vector graphics entirely in code — no image assets needed. See [docs/sdf.md](docs/sdf.md).

### Visual Depth Techniques

Rich visuals come from **layering**, not complexity. These patterns make flat shapes feel alive:

```typescript
// Glow effect — larger transparent shape behind solid core
drawCircle(x, y, r + 8, { color: withAlpha(GLOW_COLOR, 0.3), layer: 1 });  // outer glow
drawCircle(x, y, r + 4, { color: withAlpha(GLOW_COLOR, 0.5), layer: 1 });  // inner glow
drawCircle(x, y, r, { color: CORE_COLOR, layer: 2 });                       // solid core

// Highlight/shine — small bright spot offset toward light source
drawCircle(x - r * 0.3, y - r * 0.3, r * 0.25, { color: withAlpha(WHITE, 0.6), layer: 3 });

// Shadow/depth — darker shape offset down-right
drawCircle(x + 2, y + 2, r, { color: withAlpha(BLACK, 0.3), layer: 0 });   // shadow
drawCircle(x, y, r, { color: MAIN_COLOR, layer: 1 });                       // main shape

// Rim lighting — thin bright edge
drawCircle(x, y, r, { color: DARK_COLOR, layer: 1 });                       // base
drawCircle(x, y, r - 2, { color: MAIN_COLOR, layer: 1 });                   // inset creates rim

// Pulsing glow (animated) — use elapsed time
const pulse = 0.7 + 0.3 * Math.sin(elapsed * 3);
drawCircle(x, y, r * (1 + pulse * 0.2), { color: withAlpha(GLOW, 0.3 * pulse), layer: 1 });
```

**Starfield / background particles** — pre-generate at module scope, animate with `elapsed`:
```typescript
const STARS = Array.from({ length: 100 }, (_, i) => ({
  x: (i * 97) % 1000 - 500, y: (i * 53) % 800 - 400,
  size: 1 + (i % 3), twinkle: i * 0.5,
}));

// In onFrame:
for (const s of STARS) {
  const brightness = 0.4 + 0.6 * Math.sin(elapsed * 2 + s.twinkle);
  drawCircle(s.x, s.y, s.size * brightness, { color: withAlpha(WHITE, brightness), layer: 0 });
}
```

## Layer Map

Lower layers render first (behind). Higher layers render on top.

```
Layer 0-10:   Game world — tilemap (0), props (1-3), characters (5), projectiles (8)
Layer 10-50:  World overlays — selection highlights, debug visualization
Layer 90-99:  UI primitives — drawRect (default 90), drawPanel (default 90)
Layer 100:    Text — drawText (default 100)
Layer 110:    Labels — hud.label (default 110)
Layer 200+:   Overlays — pause screens, full-screen fades
Layer 250:    Screen transitions — startScreenTransition
```

**Always pass explicit `layer` values.** Don't rely on defaults — they differ between function families (sprites=0, UI=90, text=100).

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
| [docs/rendering.md](docs/rendering.md) | Sprites, textures, drawColorSprite, text/MSDF, nine-slice, post-processing, lighting |
| [docs/shaders.md](docs/shaders.md) | Effect presets (outline, flash, dissolve...), named shader uniforms, custom WGSL, built-in time/resolution |
| [docs/sdf.md](docs/sdf.md) | SDF procedural graphics: shapes, fills, gradients, code organization |
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
| [docs/assets.md](docs/assets.md) | Asset skills (`/sprite`, `/sound`), atlas loader, preloading |

## API Quick Reference

See [`types/cheatsheet.txt`](types/cheatsheet.txt) for every exported function as a one-liner, grouped by module. The 20 most common functions:

| Function | Module | What it does |
|----------|--------|-------------|
| `createGame(config?)` | game | Bootstrap game loop, auto-clear, agent registration |
| `drawSprite(opts)` | rendering | Draw a textured quad (supports screenSpace) |
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
| `drawRect(x, y, w, h, opts?)` | ui | Draw a UI rectangle (default layer 90, screenSpace option) |
| `drawRectangle(x, y, w, h, opts?)` | ui | Draw a game-world rectangle (default layer 0, geometry pipeline) |
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
arcane check                      # Fast type-check — run after every edit (catches silent hot-reload failures)
arcane test                       # Discovers and runs all *.test.ts files headlessly
arcane describe src/visual.ts     # Text description of current game state (agent protocol)
arcane inspect src/visual.ts "player"  # Query a specific state path
arcane add turn-based-combat      # Copy a pre-built recipe into your project
arcane add --list                 # List available recipes
```

### Asset Skills

Use `/sprite` and `/sound` to find and setup game assets:

```
/sprite player spaceship          # Find sprite packs, download, generate atlas code
/sprite dungeon tiles enemies     # Search by theme or category
/sound explosion laser            # Find sound effects
/sound background music loops     # Find music tracks
```

The skills search Asset Palace, download packs to `assets/`, and generate ready-to-use TypeScript code.

**IMPORTANT:** `arcane` is a native Rust binary — **never** use `npx arcane`, `node arcane`, or `npm run arcane`. It is not an npm package. Just `arcane`.

**MCP / hot_reload:** If `hot_reload` returns `{"ok":false,"error":"Game window is not running..."}`, the dev server has stopped. Start it with `arcane dev src/visual.ts` and then retry.

**MCP state looks empty?** Likely a TS error preventing `initGame()` from running. Check the `arcane dev` terminal for errors. Fix the TypeScript issue and hot-reload will re-run the game.

File organization: see **Architecture** section above. Start with the 4 files (`config.ts`, `game.ts`, `render.ts`, `visual.ts`), split as you grow.

## Tips

- State functions are pure: state in, state out. Never mutate state directly.
- `loadTexture()` and `loadSound()` cache by path — calling twice returns the same handle.
- `drawColorSprite()` auto-caches solid-color textures. Use for quick colored rectangles without image assets.
- See [docs/game-patterns.md](docs/game-patterns.md) for state architecture and platformer helpers.
- Test game logic in `*.test.ts` files using `describe`, `it`, `assert` from `@arcane/runtime/testing`. Tests run in both Node.js and V8 — avoid Node-specific APIs.
- For rotation, `0` = no rotation, positive = clockwise. Ship sprites facing "up" need `angle - Math.PI/2` offset.
- Use `blendMode: "additive"` for glowing effects (exhaust, fire, magic).
- Use `impact()` or `impactLight()` when something hits — one call gives you shake + flash + particles.
- Use `wrapText()` / `drawTextWrapped()` for multi-line text with word wrapping. Use `drawTextAligned()` for horizontal alignment.
- Use `createNode()` / `setNodeTransform()` / `getWorldTransform()` / `applyToSprite()` from `@arcane/runtime/game` for parent-child transform hierarchies.
- Use `preloadAssets()` to batch-load textures upfront. Check progress with `getLoadingProgress()` for loading screens.
- Use `/sprite` and `/sound` skills to find game assets. They search Asset Palace, download packs, and generate ready-to-use code.
- Use `loadAtlasFromDef()` for sprite sheets — it handles UV normalization and provides `atlas.draw()` which centers sprites.
- Use **SDF** for procedural backgrounds, glowing pickups, and UI without image assets. See [docs/sdf.md](docs/sdf.md).
