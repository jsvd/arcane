# Roadmap

## The Bootstrap Philosophy

Arcane is built by AI agents. The engine is the proof of concept. If an agent-native game engine can't be built by an agent, it's not agent-native enough.

1. Human architect writes design documents
2. Claude builds core runtime (state management, transactions, event loop)
3. Claude builds first renderer
4. Claude builds test framework integration
5. Claude builds core engine features (text, UI, animation, audio)
6. Claude builds game system recipes
7. Claude builds mini-game demos across genres — each validates new capabilities
8. Claude builds showcase game (BFRPG RPG)
9. Claude ships it (open source launch)
10. Demos and showcase surface pain points. Fix. Iterate.

## Demo Games — Genre Validation Strategy

The engine must serve the breadth of 2D games, not just RPGs. Each demo is small (< 500 lines of game logic) but exercises distinct engine capabilities. Demos are built at the phase where their prerequisites land.

| Demo | Phase | Genre | What It Validates |
|---|---|---|---|
| **Sokoban** | 1 | Puzzle | State + transactions, undo/redo via replaceState, win detection |
| **Card Battler** | 1 | Card game | Non-entity state shapes (deck/hand/discard zones), PRNG shuffle |
| **Roguelike** | 2 | Roguelike | Procedural generation, tile rendering, fog of war |
| **Breakout** | 2 | Action | Real-time loop, collision, physics, frame-rate independence |
| **Platformer** | 4 | Platformer | Sprite animation, audio, text/UI rendering, gravity physics |
| **Tower Defense** | 5 | Strategy | Spatial queries, pathfinding, entity waves, spawn/despawn |
| **BFRPG RPG** | 6 | RPG | Full integration: combat, inventory, dialogue, save/load |

### Why These Games

- **Sokoban**: Smallest possible "real game". If the state model can't handle a grid puzzle cleanly, it can't handle anything.
- **Card Battler**: State tree looks nothing like an entity-position game. Proves the state model is generic, not RPG-shaped.
- **Roguelike**: Procedural content generation is the acid test for PRNG determinism and tile map support.
- **Breakout**: The simplest real-time game. If the engine can't do Breakout at 60 FPS, the frame loop is broken.
- **Platformer**: Exercises sprite animation, audio playback, and text/UI rendering together. A new genre that no prior demo covers.
- **Tower Defense**: Exercises spatial queries and pathfinding together under entity churn (constant spawn/despawn).
- **BFRPG RPG**: The capstone. Everything composes into a full game.

---

## Phase 0: Design Documents

**Status: Complete**

Establish the vision, architecture, and design decisions before writing code.

### Deliverables
- [x] README with vision and elevator pitch
- [x] Architecture document (two-layer design)
- [x] Agent protocol specification
- [x] Game state management design
- [x] Systems and recipes framework
- [x] World authoring specification
- [x] Agent tooling specification (Claude Code agents, skills, MCP tools)
- [x] Technical decision log
- [x] This roadmap
- [x] CLAUDE.md for agent instructions

### Success Criteria
- [x] Documents are internally consistent
- [x] Architecture descriptions match across all documents
- [x] A developer (human or AI) can read the docs and understand what to build
- [x] No code yet — just the blueprint

---

## Phase 1: TypeScript Runtime + Headless Game Logic

**Status: Complete**

Build the foundation: a TypeScript game runtime that runs headless. Prove the state model works across game genres, not just RPGs.

### Deliverables
- [x] TypeScript runtime: state management, transactions, queries, diffs
- [x] Observation/subscription system
- [x] Deterministic PRNG
- [x] Headless test harness — game logic runs without rendering
- [x] **Demo: Sokoban** — pure state + transactions, undo via replaceState(), win detection
- [x] **Demo: Card battler** — deck/hand/discard zones, PRNG shuffle, turn phases

### Success Criteria
- [x] State model supports both grid-puzzle and card-zone game shapes
- [x] Sokoban is playable headless with full undo/redo
- [x] Card battler runs deterministic matches from seed
- [x] State transactions produce correct diffs
- [x] Seeded PRNG produces deterministic results
- [x] Tests cover all core modules (160 tests)

---

## Phase 1.5: Rust Skeleton + Bridge

**Status: Complete**

Scaffold the Rust project and wire TypeScript into it.

### Deliverables
- [x] Rust project with Cargo workspace (core, cli crates)
- [x] V8/deno_core embedding — TypeScript runs inside Rust
- [x] `arcane test` CLI command (runs TS tests headless)
- [x] CI pipeline (Rust + TS tests)
- [x] Tests pass in both Node and embedded V8
- [x] Universal test harness (Node + V8 dual-mode)

### Success Criteria
- [x] TS runtime from Phase 1 runs identically inside Rust V8 embedding (160 tests pass in both)
- [x] CI validates both Rust and TS

---

## Phase 2a: Window + Sprites + Camera + Dev Command

**Status: Complete**

The first visual layer. Window creation, sprite rendering, camera, and the dev command.

### Deliverables
- [x] wgpu initialization and window creation (winit)
- [x] Sprite renderer (instanced quads, texture atlas support)
- [x] Camera system (position, zoom, follow target)
- [x] Rendering bridge: TypeScript `#[op2]` ops → Rust renderer
- [x] TypeScript rendering API (`runtime/rendering/`)
- [x] `arcane dev` command (opens window, runs game loop, hot-reload via file watching)
- [x] Visual demo: Sokoban rendered with sprites
- [x] Feature-gated renderer (headless tests keep working without GPU)

### Success Criteria
- [x] `cargo check --no-default-features` — headless compiles without GPU deps
- [x] All 163 TS tests pass in both Node and V8
- [x] All Rust tests pass
- [x] `cargo run -- dev demos/sokoban/sokoban-visual.ts` — window opens, Sokoban renders, arrow keys move player, hot-reload works
- [x] CI green (no GPU-dependent tests in CI)

---

## Phase 2b: Tilemap + Lighting + More Demos

**Status: Complete**

Build the remaining visual layer. Tilemap renderer, basic lighting, and more genre demos.

### Deliverables
- [x] Tilemap renderer (atlas UV mapping, camera culling, TilemapStore)
- [x] Basic 2D lighting (ambient + up to 8 point lights, shader uniforms)
- [x] Physics/collision library (`runtime/physics/` — AABB, circle-AABB)
- [x] **Demo: Breakout** — real-time game loop, collision detection, frame-rate-independent physics
- [x] **Demo: Roguelike** — BSP dungeon generation, shadowcasting FOV, tile rendering, fog of war, camera follow, lighting

### Success Criteria
- [x] Roguelike generates and renders tile dungeons with fog of war
- [x] Breakout runs at 60 FPS with real-time collision
- [x] Camera follows the player in roguelike
- [x] Lighting system supports point lights and ambient (shader-based)
- [x] 227 tests passing in both Node and V8
- [x] All Rust tests pass (21 tests: tilemap + lighting + existing)
- [x] Headless build compiles without GPU deps

---

## Phase 3: Agent Protocol + CLI

**Status: Complete**

Make the engine agent-native. This is what differentiates Arcane.

### Deliverables
- [x] TS agent protocol library (`runtime/agent/`): registerAgent(), describe, inspect, actions, simulate, rewind, snapshots
- [x] `arcane describe <entry>` — text description of game state (headless)
- [x] `arcane inspect <entry> <path>` — query specific state paths (headless)
- [x] HTTP inspector API (`--inspector <port>` on `arcane dev`)
  - [x] GET /health, /state, /state/<path>, /describe, /actions, /history
  - [x] POST /action, /rewind, /simulate
  - [x] CORS headers for browser/tool access
- [x] Text description renderer (minimal/normal/detailed verbosity)
- [x] Error snapshots (auto-capture state on frame callback errors)
- [x] Demo integration: Roguelike + Breakout register agent protocol

### Success Criteria
- [x] An AI agent can query game state via HTTP
- [x] Text descriptions accurately represent the game state
- [x] Agent can execute actions and see results without vision
- [x] Error snapshots capture state on errors
- [x] 264 TS tests + 35 Rust tests passing
- [x] Headless build compiles without GPU deps

---

## Phase 4: Text, UI, Animation, Audio

**Status: Complete**

Make the engine capable of producing real games. Every demo so far is sprites-only — no text, no UI, no animation, no sound. These are genre-agnostic features that every game needs.

### Deliverables
- [x] Text rendering (bitmap font atlas, draw text to screen)
  - TS API: `drawText()`, `measureText()`, `loadFont()`, `getDefaultFont()`
  - Rust: CP437 8×8 bitmap font texture, `op_create_font_texture`, `op_get_viewport_size`
  - Screen-space support via camera inverse transform
- [x] UI primitives (`runtime/ui/`)
  - `drawRect()`, `drawPanel()`, `drawBar()`, `drawLabel()`
  - Renders as colored sprite quads with `createSolidTexture()`
- [x] Sprite animation (`runtime/rendering/animation.ts`)
  - `createAnimation()`, `playAnimation()`, `updateAnimation()`, `drawAnimatedSprite()`
  - Pure TS frame cycling with UV sub-rect computation
- [x] A* pathfinding (`runtime/pathfinding/`)
  - `findPath(grid, start, goal, options)` with binary min-heap
  - Manhattan/euclidean/chebyshev heuristics, diagonal movement, custom costs
- [x] Audio (sound effects + background music)
  - Rust: rodio backend on background thread, mpsc command channel
  - TS API: `loadSound()`, `playSound()`, `playMusic()`, `stopSound()`, `setVolume()`
  - Bridge: `#[op2]` ops for audio playback
- [x] **Demo: Platformer** — gravity physics, platform collision, coin collection, text HUD, lives bar, agent protocol

### Success Criteria
- [x] Text renders on screen at arbitrary positions with configurable size/color
- [x] UI elements (bars, panels, labels) render as sprite quads
- [x] Sprite animations cycle at correct frame rate
- [x] A* finds shortest path on grid maps (15 tests)
- [x] Audio system compiles and runs (headless no-ops)
- [x] Platformer demo exercises all new features together
- [x] 327 TS tests + 38 Rust tests passing
- [x] Headless build compiles without GPU/audio deps

---

## Phase 5: Recipes + Tower Defense

**Status: Complete**

Build composable game system recipes. Now that the engine has text, UI, animation, and audio, recipes can produce complete game experiences.

### Deliverables
- [x] Recipe framework (`runtime/systems/`): `system()`, `rule()`, `applyRule()`, `extend()`, `getApplicableRules()`
- [x] `turn-based-combat` recipe — initiative, turns, attack/defend/skip, victory detection, PRNG dice rolls
- [x] `inventory-equipment` recipe — items, stacking, weight limits, equipment slots, stat bonuses
- [x] `grid-movement` recipe — grid entity movement, pathfinding integration via `createPathGrid()`, spatial queries
- [x] `fog-of-war` recipe — 8-octant recursive shadowcasting FOV, visibility states (hidden/explored/visible)
- [x] `arcane add` CLI command — copy recipe source into project, list available recipes
- [x] **Demo: Tower Defense** — tower placement, enemy waves, pre-computed pathfinding, splash/slow towers, HUD with gold/lives/score

### Success Criteria
- [x] Each recipe works standalone (32 + 26 + 21 + 15 = 94 recipe tests)
- [x] Tower defense demo uses pathfinding + UI + text rendering
- [x] `extend` pattern allows meaningful customization (tested)
- [x] Each recipe ships with comprehensive tests
- [x] 472 TS tests + 38 Rust tests passing
- [x] Headless build compiles without GPU deps

---

## Phase 5.5: Asset Validation

**Status: Complete**

Validate that real asset loading works end-to-end with actual sprite sheets and sounds.

### Deliverables
- [x] `demos/sprite-demo/` — Character with walk animation and sound effect
- [x] `docs/assets.md` — Asset workflow documentation
- [x] Example of loading PNG sprite sheets
- [x] Example of loading audio files
- [x] Fallback to placeholders when assets missing
- [x] Path resolution and caching verified

### Success Criteria
- [x] Demo loads and displays sprite sheets (or placeholders)
- [x] Animation system works with real horizontal sprite strips
- [x] Audio loading and playback works
- [x] Asset workflow is documented with examples
- [x] Free asset sources documented
- [x] 472 TS tests + 38 Rust tests passing

---

## Phase 6: Showcase Game (BFRPG RPG)

**Status: Complete**

Simplified dungeon crawler based on BFRPG v4 mechanics. Proves that all systems (recipes, rendering, agent protocol, state management) compose into a full, playable RPG.

### Deliverables
- [x] Character creation (4 classes, 4 races) with BFRPG ability scores and racial modifiers
- [x] BFRPG v4 combat system (extending turn-based-combat recipe)
  - [x] d20 + BAB + ability mod vs AC to-hit mechanics
  - [x] Damage dice parsing and rolling ("1d8+2")
  - [x] Dodge action (+2 AC)
- [x] BSP dungeon generation (60×40 tiles, variable room sizes)
- [x] Monster spawning with floor scaling (5 monster types)
- [x] Monster AI with A* pathfinding and random walk
- [x] Equipment system with loot tables
- [x] Fog of war (using fog-of-war recipe)
- [x] Full rendering with camera, lighting, and UI
- [x] Victory/death conditions (reach floor 5 / HP ≤ 0)
- [x] Agent protocol with describe and actions
- [x] Comprehensive integration tests

### Success Criteria
- [x] The game is playable end-to-end (creation → explore → combat → victory)
- [x] Combat follows BFRPG v4 rules correctly
- [x] An agent can query state and perform actions (describe, move, rest, descend)
- [x] Performance is acceptable (60 FPS capability)
- [x] 657 TS tests + 38 Rust tests passing
- [x] All tests pass in both Node and V8
- [x] Headless build compiles without GPU deps

---

## Phase 7: Open Source Launch

**Status: Complete** ✅

Ship it.

### Deliverables
- [x] Package structure and scaffolding
- [x] Import map support (`@arcane-engine/runtime`)
- [x] `arcane init` command
- [x] Optional entry points (defaults to `src/visual.ts`)
- [x] Documentation suite
  - [x] Getting started guide
  - [x] Tutorials: "Build a Sokoban in 10 minutes", "Build an RPG in 30 minutes"
  - [x] API reference (complete runtime API)
  - [x] Recipe guide (building custom systems)
- [x] Standalone example projects
  - [x] Sokoban (puzzle)
  - [x] Tower Defense (strategy)
- [x] Publishing infrastructure
  - [x] `@arcane-engine/create` package
  - [x] Publishing guide
- [x] Community setup
  - [x] CODE_OF_CONDUCT.md
  - [x] Issue templates (bug, feature, documentation)
  - [x] PR template
- [x] Published packages
  - [x] npm: `@arcane-engine/runtime@0.2.1`, `@arcane-engine/create@0.2.1`
  - [x] crates.io: `arcane-engine@0.2.1`, `arcane-cli@0.2.1`

### Success Criteria
- [x] A developer can `npm create @arcane-engine/game my-game` and have a working project
- [x] Documentation is comprehensive enough for AI agents to use without guidance
- [x] Example projects demonstrate different game types
- [x] Community can contribute recipes
- [x] All 895 TS tests + 38 Rust tests passing

---

## Phase 8: Polish & Stability

**Status: Deferred**

Fix critical issues and technical debt. Deferred in favor of feature development (Phase 9 completed first).

### Deliverables
- [ ] Fix hot-reload architecture (see `docs/testing-hot-reload.md`)
  - [ ] Refactor runtime lifecycle to support reload outside frame callback
  - [ ] Or use Rc<RefCell<>> wrapper pattern
  - [ ] Test with all existing demos
- [ ] Fix TypeScript type errors
  - [ ] Run `tsc --noEmit` to get current count
  - [ ] Pathfinding API type consistency (PathResult vs array)
  - [ ] BFRPG combat type narrowing
  - [ ] Equipment test null checks
  - [ ] Console/dom lib configuration
- [ ] Document hot-reload limitation and workarounds in README
- [ ] Add more Rust unit tests (target: 60+ tests)
- [ ] Polish existing demos (consistent styling, better feedback)

### Success Criteria
- [ ] Hot-reload works without crashes
- [ ] `tsc --noEmit` passes with zero errors
- [ ] 60+ Rust tests passing
- [ ] All demos use consistent visual styling
- [ ] README documents all known limitations

---

## Phase 9: Tweening + Particles

**Status: Complete** ✅

Add visual polish systems. Both are pure TypeScript, headless-testable, and provide massive "juice" improvements.

### Deliverables
- [x] **Tweening system** (`runtime/tweening/`)
  - [x] Core API: `tween(target, props, duration, options)`
  - [x] Easing functions: linear, quad, cubic, elastic, bounce, back, expo (30 total across 10 families)
  - [x] Tween control: start, stop, pause, resume, reverse
  - [x] Chaining: `sequence()`, `parallel()`, `stagger()`
  - [x] Callbacks: onStart, onUpdate, onComplete, onRepeat
  - [x] Camera shake helper: `shakeCamera(intensity, duration)`
  - [x] Screen flash helper: `flashScreen(color, duration)`
- [x] **Particle system** (`runtime/particles/`)
  - [x] Emitter types: point, line, area, ring
  - [x] Particle properties: position, velocity, acceleration, lifetime, rotation, scale, color
  - [x] Color interpolation over lifetime (start color → end color)
  - [x] Emission control: rate (particles/sec), burst(count), one-shot, continuous
  - [x] Affectors: gravity, wind, attractor, repulsor, turbulence
  - [x] Particle pooling for performance
  - [x] Integration with sprite renderer (particles are sprites)
- [x] **Demo: Juice Showcase** (`demos/juice-showcase/`)
  - [x] Button effects with easing (bounce, elastic, back)
  - [x] Explosion particle system (burst, fading)
  - [x] Trail effects (continuous emission)
  - [x] Camera shake on impact
  - [x] Screen flash on events
  - [x] Toggle juice on/off to compare before/after

### Success Criteria
- [x] Tween any numeric property with any easing function
- [x] Camera shake feels impactful but not nauseating
- [x] Particle explosions look convincing (50+ particles per burst)
- [x] Trail effects follow mouse smoothly
- [x] All systems tested headless (132 new tests: 18 tween, 82 easing, 8 chain, 13 helpers, 11 particles)
- [x] Juice demo showcases all features interactively
- [x] Zero performance regression on existing demos

---

## Phase 9.5: LLM-Assisted Game Dev + Standalone Install

**Status: Complete** ✅

Make the engine installable and usable without cloning the repo. Improve the LLM development experience for scaffolded projects.

### Deliverables
- [x] **Standalone install** (`cargo install arcane-cli`)
  - [x] Templates and recipes embedded in binary via `include_dir` + `build.rs`
  - [x] Runtime resolved from `node_modules/@arcane-engine/runtime/src/` in standalone projects
  - [x] Filesystem fallback for dev-from-repo (edits to templates/recipes take effect without recompiling)
  - [x] `arcane new`, `arcane init`, `arcane add` all work from standalone binary
- [x] **LLM development guide** (`templates/default/AGENTS.md`)
  - [x] Scaffolded projects include agent-friendly development instructions
  - [x] API declarations (`types/arcane.d.ts`) generated from runtime source
- [x] **Type declarations generation** (`scripts/generate-declarations.sh`)
  - [x] Auto-generates `arcane.d.ts` from runtime JSDoc annotations
  - [x] Ships with scaffolded projects as primary LLM API reference
- [x] Published packages: v0.2.1 on crates.io and npm
- [x] **`arcane assets` CLI** — built-in asset discovery and download
  - [x] `arcane assets list` — browse 25 Kenney.nl packs with type filter
  - [x] `arcane assets search` — keyword search with synonym expansion and relevance scoring
  - [x] `arcane assets download` — download and extract ZIP packs
  - [x] `--json` flag for structured output on all commands
  - [x] Embedded catalog via `include_dir` with filesystem fallback
  - [x] 19 Rust tests for catalog, search, synonyms, filtering

### Success Criteria
- [x] `cargo install arcane-cli && arcane new my-game && cd my-game && npm install && arcane dev` works end-to-end
- [x] Dev-from-repo workflow unchanged (`cargo run -- dev demos/...` still works)
- [x] 1022 TS tests + 79 Rust tests passing

---

## Phase 10: Scene Management + Save/Load

**Status: Complete** ✅

Architectural features that unlock "real game" structure.

### Deliverables
- [x] **Scene system** (`runtime/scenes/`)
  - [x] Scene definition with typed state: `createScene<S>(def)`
  - [x] Scene lifecycle hooks: onEnter, onUpdate, onRender, onPause, onResume, onExit
  - [x] Scene stack: pushScene, popScene, replaceScene
  - [x] Scene transitions: fade with configurable duration/color, "none" for instant
  - [x] Scene-local state (each instance has independent typed state)
  - [x] SceneContext for navigation from within callbacks
  - [x] Data passing between scenes via `createSceneInstance(def, data)`
  - [x] `startSceneManager` takes ownership of onFrame, user onUpdate callback
- [x] **Save/Load system** (`runtime/persistence/`)
  - [x] State serialization to JSON with `__arcane` envelope
  - [x] State deserialization with validation and error handling
  - [x] Save slots (multiple save files per game)
  - [x] Auto-save support (periodic timer with `updateAutoSave(dt)`)
  - [x] Schema migration helpers (`registerMigration`, `applyMigrations`)
  - [x] Save metadata (timestamp, playtime, label, version)
  - [x] Storage backends: memory (tests), file system (Rust ops for `arcane dev`)
  - [x] Rust file I/O ops: `op_save_file`, `op_load_file`, `op_delete_file`, `op_list_save_files`
- [x] **Demo: Menu Flow** (`demos/menu-flow/`)
  - [x] Title screen (blinking "Press SPACE" text)
  - [x] Main menu (New Game, Continue if save exists)
  - [x] Gameplay screen (timed click-target game with scoring)
  - [x] Pause menu overlay (Resume, Quit to Menu)
  - [x] Game over screen (score + high score, Play Again, Menu)
  - [x] Fade transitions between screens
  - [x] Auto-save during gameplay, "Continue" loads from save
  - [x] All scene operations demonstrated: push, pop, replace

### Success Criteria
- [x] Navigate between scenes without manual state machines
- [x] Scene transitions fade smoothly
- [x] Can save mid-game and restore from save
- [x] Save files are human-readable JSON with envelope
- [x] Schema migration works (load old saves in new versions)
- [x] Menu demo exercises full game lifecycle
- [x] 110 new tests for scene management and persistence (50 scene + 60 persistence)
- [x] 1262 TS tests + 98 Rust tests passing

---

## Phase 11: Physics System

**Status: COMPLETE ✅**

Homebrew Rust physics engine — no external physics dependencies. See ADR-015 for the decision rationale.

### Architecture

Physics lives in Rust (`core/src/physics/`), exposed to TS via `#[op2]` ops, with a thin TS API (`runtime/physics/`). Same pattern as rendering, audio, and file I/O. Fixed timestep accumulator for frame-rate independence. NOT feature-gated — compiles in headless mode.

```
TS game code → op_create_body, op_step_physics, op_get_body_state → Rust physics world
```

### Deliverables
- [x] **Rust physics core** (`core/src/physics/`)
  - [x] `types.rs` — RigidBody (static/dynamic/kinematic), Shape (Circle, AABB, Polygon), Material (restitution, friction)
  - [x] `world.rs` — PhysicsWorld: body storage, step(dt), fixed timestep accumulator
  - [x] `integrate.rs` — Semi-implicit Euler integration (velocity then position)
  - [x] `broadphase.rs` — Spatial hash grid for O(n) collision pair culling
  - [x] `narrowphase.rs` — SAT collision detection for all shape pairs (circle-circle, circle-AABB, AABB-AABB, polygon-polygon, mixed)
  - [x] `resolve.rs` — Sequential impulse solver with restitution + friction
  - [x] `constraints.rs` — Distance joint (rope/spring), revolute joint (hinge)
  - [x] `sleep.rs` — Velocity threshold + timer, wake on contact
- [x] **Rust ops** (`core/src/scripting/physics_ops.rs`) — 18 ops
- [x] **TS API** (`runtime/physics/`) — types, world, body, constraints, query, index
- [x] **Demo: Physics Playground** (`demos/physics-playground/physics-playground.ts`)
  - [x] Falling blocks that stack and come to rest
  - [x] Seesaw (revolute joint)
  - [x] Rope (chain of distance joints)
  - [x] Bouncing balls (high restitution)
  - [x] Interactive: click to spawn, keyboard mode selection
- [x] **Retrofit Breakout** — ball, paddle, walls, bricks as physics bodies

### Success Criteria
- [x] 77 Rust tests for physics core (shapes, broadphase, solver, constraints, sleep, ops)
- [x] 40 TS tests for physics API (headless no-ops, type shapes, API ergonomics)
- [x] Breakout retrofitted with Rust physics
- [x] Headless build compiles (`cargo check --no-default-features`)
- [x] Agent can query physics state (positions, velocities, contacts)

---

## Phase 12: Sprite Transforms + Rendering Polish

**Status: Planned**

Complete the sprite rendering system with rotation, advanced blending, and custom shaders.

### Deliverables
- [ ] **Sprite transforms** (`core/src/renderer/sprite.rs`, `runtime/rendering/sprites.ts`)
  - [ ] Rotation: arbitrary angles in radians
  - [ ] Pivot/origin point: center, corner, or custom (affects rotation/scale)
  - [ ] Flip: horizontal/vertical flip without separate atlas frames
  - [ ] Opacity: per-sprite alpha channel
  - [ ] Shader update: sprite.wgsl supports rotation matrix in vertex shader
- [ ] **Blend modes** (`core/src/renderer/blend.rs`)
  - [ ] Additive blending (for glowing particles)
  - [ ] Multiply blending (for shadows, tinting)
  - [ ] Screen blending (for highlights)
  - [ ] Per-sprite blend mode setting
- [ ] **Custom shader support** (`core/src/renderer/shader.rs`, `runtime/rendering/shader.ts`)
  - [ ] User-defined WGSL fragment/vertex shaders
  - [ ] Shader uniforms (pass data to shaders)
  - [ ] Material system: assign shaders to sprites
  - [ ] Shader hot-reload (reload WGSL on file change)
- [ ] **Post-processing pipeline** (`core/src/renderer/postprocess.rs`)
  - [ ] Render-to-texture (offscreen rendering)
  - [ ] Full-screen quad for post-processing pass
  - [ ] Built-in effects: bloom, blur, vignette, chromatic aberration
  - [ ] Effect chaining (apply multiple effects in sequence)
- [ ] **Demo: Asteroids Clone** (`demos/asteroids/`)
  - [ ] Rotating spaceship sprite (arrow keys rotate, thrust moves forward)
  - [ ] Rotating asteroid sprites (random angular velocity)
  - [ ] Particle trails with additive blending
  - [ ] Screen flash on death (post-processing)
  - [ ] Bloom effect on explosions
  - [ ] Custom CRT shader (scanlines, barrel distortion)

### Success Criteria
- [ ] Ship rotates smoothly (60 FPS with 100+ rotating sprites)
- [ ] Additive particles glow convincingly
- [ ] Custom shaders work (CRT effect looks retro)
- [ ] Post-processing effects don't tank frame rate
- [ ] Shader compilation errors reported clearly
- [ ] Tests validate transform math (headless unit tests for rotation matrix)
- [ ] Existing demos can opt-in to new features (backward compatible)

---

## Phase 13: Advanced Input + Interactive UI

**Status: Planned**

Expand platform reach and make UI interactive (not just draw-only).

### Deliverables
- [ ] **Gamepad support** (`core/src/platform/gamepad.rs`, `runtime/rendering/input.ts`)
  - [ ] Detect connected gamepads
  - [ ] Analog stick input (deadzone handling)
  - [ ] Trigger input (analog triggers)
  - [ ] Button mapping (Xbox, PlayStation, Switch layouts)
  - [ ] Vibration/haptics
- [ ] **Touch input** (`core/src/platform/touch.rs`)
  - [ ] Tap, press, release
  - [ ] Swipe gesture detection
  - [ ] Multi-touch (pinch-to-zoom)
  - [ ] Touch position in world space
- [ ] **Input mapping system** (`runtime/input/actions.ts`)
  - [ ] Named actions ("jump", "attack", "menu")
  - [ ] Map actions to physical inputs (keyboard, gamepad, touch)
  - [ ] Remappable controls (user can rebind)
  - [ ] Input buffering (queue inputs for combos)
- [ ] **Interactive UI** (`runtime/ui/interactive.ts`)
  - [ ] Button: hover, pressed, released states
  - [ ] Text input field (capture keyboard, cursor blink)
  - [ ] Checkbox, radio button, slider
  - [ ] Scroll container (overflow with scrollbar)
  - [ ] Drag-and-drop (for inventory management)
  - [ ] Focus system (tab navigation, gamepad navigation)
  - [ ] Modal dialogs (confirm, cancel, text input)
- [ ] **Layout system** (`runtime/ui/layout.ts`)
  - [ ] Flexbox-style auto-layout (horizontal, vertical, grid)
  - [ ] Anchoring (attach to screen edges/corners with margins)
  - [ ] Responsive sizing (fill, fit-content, fixed)
- [ ] **Demo: Gamepad Platformer + UI** (`demos/gamepad-ui/`)
  - [ ] Platformer controlled via gamepad (analog stick movement)
  - [ ] Menu with button hover states
  - [ ] Settings screen (volume sliders, control remapping UI)
  - [ ] Touch controls overlay for mobile

### Success Criteria
- [ ] Gamepad input works on Windows, macOS, Linux
- [ ] Touch input works (test on mobile browser)
- [ ] UI buttons respond to mouse, touch, and gamepad
- [ ] Text input captures keyboard correctly
- [ ] Drag-and-drop feels natural (inventory management)
- [ ] Layout system handles screen resize gracefully
- [ ] Tests validate input mapping and UI state (80+ tests)

---

## Phase 14: Audio + Camera Polish

**Status: Planned**

Complete the audio and camera systems with features expected in a modern 2D engine.

### Deliverables
- [ ] **Spatial/Positional audio** (`runtime/rendering/audio.ts`, `core/src/audio/spatial.rs`)
  - [ ] Volume based on distance from listener
  - [ ] Panning based on left/right position
  - [ ] Set listener position (usually camera or player)
- [ ] **Audio mixer** (`runtime/rendering/audio.ts`)
  - [ ] Audio buses: SFX, music, ambient, voice
  - [ ] Per-bus volume control
  - [ ] Master volume
- [ ] **Audio polish**
  - [ ] Crossfade between music tracks
  - [ ] Audio pooling (limit concurrent instances of same sound)
  - [ ] Pitch variation (randomize pitch for repeated sounds)
  - [ ] Audio effects: reverb, echo, low-pass filter
- [ ] **Camera features** (`runtime/rendering/camera.ts`)
  - [ ] Camera bounds/limits (clamp to map edges)
  - [ ] Camera deadzone (target can move without camera following)
  - [ ] Smooth zoom (animated zoom transitions using Phase 9 tweens)
  - [ ] Parallax scrolling (multi-layer backgrounds at different speeds)
  - [ ] Multiple viewports (split-screen support)
- [ ] **Demo: Parallax Scroller + Audio** (`demos/parallax-audio/`)
  - [ ] Side-scrolling platformer with 3-layer parallax background
  - [ ] Spatial audio (enemies make sound based on position)
  - [ ] Music crossfade between areas
  - [ ] Camera deadzone (player can move in center without camera moving)
  - [ ] Camera bounds (stops at map edges)

### Success Criteria
- [ ] Spatial audio feels natural (volume/panning based on position)
- [ ] Music crossfade is smooth (no pops or clicks)
- [ ] Parallax layers scroll at correct speeds (depth illusion)
- [ ] Camera deadzone makes movement feel better
- [ ] Split-screen works (two viewports on same game state)
- [ ] 40+ tests for audio and camera features

---

## Phase 15: Tilemap + Animation Polish

**Status: Planned**

Complete the tilemap and animation systems with advanced features.

### Deliverables
- [ ] **Multiple tilemap layers** (`runtime/rendering/tilemap.ts`)
  - [ ] Background, midground, foreground layers
  - [ ] Per-layer parallax scrolling
  - [ ] Collision layer (separate from visual layers)
  - [ ] Layer visibility toggle
- [ ] **Auto-tiling** (`runtime/rendering/autotile.ts`)
  - [ ] Bitmask auto-tiling (Wang tiles, blob tiles)
  - [ ] Automatic tile selection based on neighbors
  - [ ] Support for 47-tile and 16-tile sets
- [ ] **Animated tiles** (`runtime/rendering/tilemap.ts`)
  - [ ] Per-tile animation (water, lava, torches)
  - [ ] Frame cycling independent of sprite animations
- [ ] **Isometric/Hexagonal grids** (`runtime/rendering/tilemap-iso.ts`)
  - [ ] Isometric grid (diamond layout, 2:1 ratio)
  - [ ] Hexagonal grid (pointy-top, flat-top)
  - [ ] Screen-to-tile coordinate conversion
- [ ] **Tile properties** (`runtime/rendering/tilemap.ts`)
  - [ ] Custom metadata per tile (walkable, damage, friction, etc.)
  - [ ] Query tile properties by position
- [ ] **Animation state machine** (`runtime/rendering/animation-fsm.ts`)
  - [ ] States: idle, walk, run, jump, attack
  - [ ] Transitions with conditions
  - [ ] Animation blending (smooth transitions)
  - [ ] Animation events (trigger callbacks on specific frames)
- [ ] **Multi-row sprite sheets** (`runtime/rendering/animation.ts`)
  - [ ] Support sprite sheets with multiple rows (each row = one animation)
  - [ ] Auto-detect grid layout
- [ ] **Demo: Isometric RPG Town** (`demos/iso-town/`)
  - [ ] Isometric tilemap (buildings, roads, trees)
  - [ ] Multiple layers (ground, buildings, roofs)
  - [ ] Animated water tiles
  - [ ] Character with animation state machine (idle, walk transitions)
  - [ ] Auto-tiling for roads

### Success Criteria
- [ ] Multiple layers render correctly (z-ordering)
- [ ] Auto-tiling works (place one tile, neighbors update automatically)
- [ ] Animated tiles cycle correctly (water ripples)
- [ ] Isometric rendering looks correct (depth sorting)
- [ ] Animation state machine handles transitions smoothly
- [ ] 60+ tests for tilemap and animation features

---

## Phase 16: Community Building

**Status: Planned**

Now that packages are published, focus on adoption and ecosystem growth.

### Deliverables
- [ ] **Announcements**
  - [ ] Show HN post with demo links
  - [ ] Reddit posts (r/gamedev, r/programming, r/rust, r/typescript)
  - [ ] Twitter/X thread with feature highlights
  - [ ] Blog post: "Building an AI-Native Game Engine"
- [ ] **Community Channels**
  - [ ] Discord server setup (channels: general, showcase, recipes, support)
  - [ ] GitHub Discussions enabled
  - [ ] Community guidelines and moderation
- [ ] **Content Creation**
  - [ ] Video walkthrough: "Build Your First Game with Arcane"
  - [ ] Blog series: deep dives into architecture decisions
  - [ ] Tutorial videos for each recipe
  - [ ] Showcase community-built games
- [ ] **Community Engagement**
  - [ ] Respond to GitHub issues within 48h
  - [ ] Review and merge community PRs
  - [ ] Featured game of the week on Discord
  - [ ] Monthly community calls (share roadmap, demo new features)
- [ ] **Documentation Improvements**
  - [ ] FAQ based on common questions
  - [ ] Troubleshooting guide
  - [ ] Migration guides (version upgrades)
  - [ ] Performance optimization guide

### Success Criteria
- [ ] 100+ GitHub stars in first month
- [ ] 10+ community members in Discord
- [ ] 3+ community-contributed recipes
- [ ] 5+ games built by community (not just demos)
- [ ] Active discussion on GitHub/Discord
- [ ] Positive sentiment in announcements (upvotes, comments)

---

## Performance Optimization (When Triggered)

Not a phase — a standing item. All computationally non-trivial algorithms currently live in TypeScript and perform well within budget through Phase 7. V8 JITs typed arrays to near-native speed, and algorithmic improvements (spatial hashing) should always precede language migration.

**Migration triggers** (profile first, then act):

| Algorithm | Trigger | Action |
|---|---|---|
| A* pathfinding | Single call > 2ms | Move to `op_find_path` Rust op |
| AABB collision | Per-frame checks > 1ms at >2k entities | Spatial hash grid (TS) first, then Rust broad-phase |
| FOV shadowcasting | Radius >20, > 2ms | Move to Rust op |
| State diffing | >50k leaf nodes, > 3ms | Move `computeDiff` to Rust |

The migration strategy preserves existing TS function signatures — game code never changes. Rust ops are transparent fast-paths guarded by `hasRenderOps`, with TS as headless fallback. See detailed analysis and Rust op API designs in project memory (`performance-migration.md`).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TS↔Rust bridge is too slow | Medium | High | deno_core has solved most of this; profile early |
| "Good enough" with Phaser + existing tools | Medium | High | Focus on agent DX that no existing tool provides |
| Godot/Unity add first-class agent support | Low | High | Move fast; the architecture advantage is structural |
| Vision-capable agents close the gap | Medium | Medium | Text interaction will always be faster than visual |
| Recipe ecosystem doesn't materialize | Medium | Medium | Build enough first-party recipes to be self-sufficient |
| Scope creep into 3D | High | Medium | Resist. 2D only. The constraint is the feature. |
