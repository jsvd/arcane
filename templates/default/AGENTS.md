# {{PROJECT_NAME}} — Agent Guide

You are an expert game developer helping the user build their game. Translate non-technical requests ("make the character jump higher", "add enemies that chase the player") into working code using the patterns below.

**Before writing code**, check the type declarations in `types/` for the API you need. Use `/api <function>` to look up specific function signatures. For "how do I...?" questions, pattern advice, or choosing between APIs, ask `@arcane-api`. For detailed patterns and examples, see the topic guides in `docs/`.

## Architecture

### File Organization

**One concept = one file.** Split by domain (what the code *does*), not by entity type:

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

- `game.ts` must NOT import rendering modules — keeps it headless-testable.
- `visual.ts` stays thin — just bootstrap, input, frame loop. Delegate rendering to `render.ts`.
- Import constants from `config.ts`, not inline magic numbers.

Hot-reload: saving any file restarts the game loop (~200ms). State resets to initial.

Imports use `@arcane/runtime/{module}`:
`state`, `rendering`, `ui`, `physics`, `pathfinding`, `tweening`, `particles`, `systems`, `scenes`, `persistence`, `input`, `agent`, `testing`, `game`

## Development Workflow

**Run `/check` after every code change.** Type errors break hot-reload silently — the game window shows the last working state while errors accumulate. Verify proactively; don't wait for the user to notice.

**Visual richness should permeate the development process, this is a game for humans.** A game with good mechanics but flat visuals feels unfinished. Add particles, glows, multiple layers, and shape variety as you build.

### The Iteration Cycle

1. **Write a change**
2. **Run `/check`** — catches type errors immediately (hot-reload fails silently on TS errors)
3. **Verify visually** — run `/start` to ensure the game window is open; hot-reload picks up saved files automatically
4. **Write a test** — Arcane games are code-first; test more than a typical game. Each `foo.ts` should have a `foo.test.ts`
5. **Commit** — small, working increments

## Coordinate System

**(0, 0) = top-left corner**, matching web canvas, Unity 2D, and Godot conventions. `drawSprite({x, y})` positions the sprite's **top-left corner** in world space. X increases right, Y increases down. See [docs/coordinates.md](docs/coordinates.md) for full details.

## Common Mistakes

### Engine Gotchas

**0. Using `npx arcane`** — `arcane` is a native Rust binary, not an npm package. Always use `arcane` directly: `arcane dev`, `arcane test`.

**1. Camera setup for scrolling games** — Default camera at (0,0) shows world from top-left. For player-following games, use `followTargetSmooth(player.x, player.y)` every frame.

**2. Hardcoding viewport size** — Never use `800`, `600`. Always: `const { width: VPW, height: VPH } = getViewportSize();`

**4. Missing re-draw every frame** — Draw calls are NOT persisted. Redraw everything in `onFrame()`. (`createGame()` auto-clears.)

**5. Wrong layer ordering** — Lower layers draw behind higher ones. Ground: 0, sprites: 1-10, UI: 90+, text: 100+.

### Color & Drawing

**3. Drawing HUD in world space** — Use `screenSpace: true` for health bars, scores, menus. All draw functions support it.

**10. `setBackgroundColor` range** — Takes 0.0-1.0 floats, NOT 0-255 integers.

**20. Mixing up color ranges** — `rgb(r, g, b)` takes **0-255 integers** and returns a `Color`. All other APIs (`setBackgroundColor`, `flashScreen`, particle colors, `createSolidTexture`) expect a `Color` with **0.0-1.0 float** components. Always use `rgb()` to convert.

**26. `hud.text` uses `tint:` not `color:`** — Write `hud.text("Score", 10, 10, { tint: GOLD })`. There is no `color` option; passing one silently does nothing.

**27. Calling `rgb()` inside onFrame causes GC freezes** — Pre-compute colors at module scope: `const WHITE = rgb(255, 255, 255);`

### Particles & Subsystems

**28. Manual subsystem updates with createGame** — `createGame()` auto-calls `updateTweens(dt)`, `updateParticles(dt)`, `updateScreenTransition(dt)`, etc. via `autoSubsystems: true` (default). You do NOT need to call these manually.

**33. Forgetting `drawAllParticles()`** — `autoSubsystems` updates particles but does NOT draw them. You must call `drawAllParticles()` explicitly.

### TypeScript Traps

**21. Spread + null narrowing** — `let st = { ...s, field: null }` narrows `field` to `null` (not `T | null`). Fix: add explicit type annotation: `let st: GameState = { ...s, field: null };`

**22. Let narrowing from unions** — Inside `if (state.phase === "playing")`, `let phase = state.phase` narrows to `"playing"`. Fix: `let phase: GamePhase = state.phase;`

**29. Adding input fields** — Add fields to the `Input` type in `game.ts`, not as new positional parameters to `tick()`. The `input: Input = {}` default means existing call sites (tests, visual.ts) keep compiling.

### Patterns

**6. Forgetting `dt` for movement** — `player.x += speed` moves faster on faster machines. Always: `player.x += speed * dt`.

**35. Character flipping with separate if/else blocks** — Use a flip multiplier: `const flip = facingRight ? 1 : -1;` and multiply all X offsets.

## What Should I Draw?

Pick the right function for what you're rendering:

```
"I want to draw..."
├── A textured image -> drawSprite({ textureId, x, y, w, h })
├── A colored rectangle
│   ├── Game world (layer 0) -> drawRectangle(x, y, w, h, { color })
│   ├── HUD / UI (layer 90) -> drawRect(x, y, w, h, { color, screenSpace: true })
│   └── With rotation/blend -> drawSprite({ color, x, y, w, h, rotation })
├── Shapes (see docs/visual-composition.md for examples)
│   ├── Pointed -> drawTriangle() (ships, arrows, crystals)
│   ├── Irregular -> drawPolygon() (asteroids, terrain, shields)
│   ├── Rounded -> drawCircle(), drawEllipse(), drawCapsule()
│   └── Outline -> drawLine(), drawArc(), drawRing()
├── Text
│   ├── HUD text -> hud.text("Score", 10, 10)
│   ├── World text -> drawText("Hello", x, y)
│   └── Note: drawText() auto-uses crisp MSDF font when renderer is available
├── A health / progress bar
│   ├── HUD -> hud.bar(x, y, fillRatio)
│   └── World (above enemy) -> drawBar(x, y, w, h, fillRatio, { screenSpace: false })
├── A panel / dialog box -> drawPanel() or drawNineSlice()
├── A tilemap -> createTilemap() + drawTilemap()
└── Procedural vector graphics (gradients, glows, stars, hearts, mountains)
    └── SDF shapes -> sdfEntity() + circle/star/heart/union/gradient (see docs/sdf.md)
```

## Visual Composition

Shape composition, depth techniques, starfield patterns, and animal drawing guidelines are in [docs/visual-composition.md](docs/visual-composition.md). Read it when building multi-shape game objects.

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

**Platformer:** [game-patterns.md](docs/game-patterns.md) (platformer controller, coyote time, one-way platforms) -> [coordinates.md](docs/coordinates.md) (camera follow + bounds) -> [entities.md](docs/entities.md) (sprite groups for characters) -> [juice.md](docs/juice.md) (impact, shake on land/hit) -> [particles.md](docs/particles.md) (dust, death, fire effects) -> [tweening.md](docs/tweening.md) (animated pickups, screen flash) -> [input.md](docs/input.md) (gamepad support)

**RPG / Roguelike:** [tilemaps.md](docs/tilemaps.md) (grid maps) -> [scenes.md](docs/scenes.md) (menu flow, save/load) -> [procgen.md](docs/procgen.md) (WFC dungeons) -> [juice.md](docs/juice.md) (floating damage text, impact) -> [tweening.md](docs/tweening.md) (menu animations)

**Action / Shooter:** [physics.md](docs/physics.md) (rigid bodies, raycast) -> [particles.md](docs/particles.md) (explosions, muzzle flash) -> [juice.md](docs/juice.md) (hitstop, shake, impact) -> [input.md](docs/input.md) (gamepad + touch) -> [audio.md](docs/audio.md) (spatial audio)

**Top-Down / Simulation:** [coordinates.md](docs/coordinates.md) (camera follow + bounds) -> [entities.md](docs/entities.md) (sprite groups, entity handles) -> [particles.md](docs/particles.md) (weather, ambient effects) -> [tweening.md](docs/tweening.md) (UI animations, popups) -> [tilemaps.md](docs/tilemaps.md) (world maps, auto-tiling) -> [input.md](docs/input.md) (movement, interactions)

**Puzzle:** [rendering.md](docs/rendering.md) (sprites, text) -> [tweening.md](docs/tweening.md) (piece movement, pop effects) -> [scenes.md](docs/scenes.md) (level select, save) -> [ui.md](docs/ui.md) (menus, buttons)

## Workflow

```
arcane dev                        # Opens window, hot-reloads on save (defaults to src/visual.ts)
arcane dev src/visual.ts          # Explicit entry point
arcane check                      # Fast type-check — run after every edit
arcane test                       # Discovers and runs all *.test.ts files headlessly
arcane describe src/visual.ts     # Text description of current game state (agent protocol)
arcane inspect src/visual.ts "player"  # Query a specific state path
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

**IMPORTANT:** `arcane` is a native Rust binary — **never** use `npx arcane`, `node arcane`, or `npm run arcane`.

**MCP / hot_reload:** If `hot_reload` returns `{"ok":false,"error":"Game window is not running..."}`, start the dev server with `arcane dev src/visual.ts` and retry.

**MCP state looks empty?** Likely a TS error preventing `initGame()` from running. Check the `arcane dev` terminal for errors.
