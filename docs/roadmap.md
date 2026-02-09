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
8. Claude builds showcase game (BFRPG RPG ported from Godot)
9. Demos and showcase surface pain points. Fix. Iterate.

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

**Status: Current**

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
- Documents are internally consistent
- Architecture descriptions match across all documents
- A developer (human or AI) can read the docs and understand what to build
- No code yet — just the blueprint

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
- [ ] `arcane screenshot` — capture rendered frame (deferred: needs headless rendering)
- [ ] REPL mode for direct agent interaction (deferred)

### Success Criteria
- [x] An AI agent can query game state via HTTP
- [x] Text descriptions accurately represent the game state
- [x] Agent can execute actions and see results without vision
- [x] Error snapshots capture state on errors
- [x] 264 TS tests + 35 Rust tests passing
- [x] Headless build compiles without GPU deps

---

## Phase 4: Text, UI, Animation, Audio

Make the engine capable of producing real games. Every demo so far is sprites-only — no text, no UI, no animation, no sound. These are genre-agnostic features that every game needs.

### Deliverables
- Text rendering (bitmap font atlas, draw text to screen)
  - TS API: `drawText(text, x, y, options)`, `loadFont(path)`
  - Rust: bitmap font texture atlas, glyph layout, instanced quad rendering
- UI primitives (`runtime/ui/`)
  - Rectangles, panels, labels, health bars
  - TS API: `drawRect()`, `drawPanel()`, `drawLabel()`, `drawBar()`
  - Renders as colored quads (no textures needed)
- Sprite animation (`runtime/rendering/animation.ts`)
  - Spritesheet frame cycling with configurable FPS
  - TS API: `createAnimation(spritesheet, frames, fps)`, `playAnimation()`, `drawAnimatedSprite()`
- A* pathfinding (`runtime/pathfinding/`)
  - Grid-based A* with configurable cost functions
  - TS API: `findPath(grid, start, goal, options)`, `PathGrid` type
  - Genre-agnostic: roguelike, tower defense, strategy all use it
- Audio (sound effects + background music)
  - Rust: platform audio backend (rodio or cpal)
  - TS API: `loadSound(path)`, `playSound(id)`, `playMusic(path)`, `setVolume()`
  - Bridge: `#[op2]` ops for audio playback
- **Demo: Platformer** — sprite animation (run/jump cycles), audio (jump SFX, music), text (score/lives HUD), gravity physics

### Success Criteria
- Text renders on screen at arbitrary positions with configurable size/color
- UI elements (bars, panels, labels) render without textures
- Sprite animations play at correct frame rate
- A* finds shortest path on grid maps
- Audio plays sound effects and music
- Platformer demo exercises all new features together
- All existing tests still pass + new tests for each feature
- Headless build compiles without GPU/audio deps

---

## Phase 5: Recipes + Tower Defense

Build composable game system recipes. Now that the engine has text, UI, animation, and audio, recipes can produce complete game experiences.

### Deliverables
- `@arcane/turn-based-combat` recipe
  - Initiative, turns, actions, targeting, damage
  - The `extend` pattern for customization
- `@arcane/inventory-equipment` recipe
  - Items, stacking, equipment slots
  - Wiring into combat (armor, weapons)
- `@arcane/grid-movement` recipe
  - Grid-based movement with tilemap collision
  - Integration with pathfinding from Phase 4
- `@arcane/fog-of-war` recipe
  - Visibility calculation (builds on roguelike FOV)
  - Explored/unexplored/visible states
- `npx arcane add` CLI command
- Recipe documentation and test patterns
- **Demo: Tower Defense** — pathfinding, entity waves, spawn/despawn, tower placement UI, wave counter text

### Success Criteria
- Each recipe works standalone
- Recipes compose without conflicts
- Tower defense demo uses pathfinding + UI + text rendering
- `extend` pattern allows meaningful customization
- Each recipe ships with comprehensive tests
- An agent can install, configure, and customize a recipe

---

## Phase 6: Showcase Game (BFRPG RPG)

Port the existing Godot BFRPG RPG to Arcane. This is the capstone, not the only validation — the mini-game demos proved individual capabilities; this proves they compose into a full game.

### Deliverables
- BFRPG combat system (extending turn-based-combat recipe)
- Character creation and progression
- Dungeon exploration with fog of war
- NPC dialogue
- Inventory and equipment
- Save/load
- At least one complete dungeon with boss encounter
- Session recording and replay

### Success Criteria
- The game is playable end-to-end
- Combat follows BFRPG rules correctly
- An agent can modify game systems and see results
- Performance is acceptable (60 FPS on modest hardware)
- The development experience validates the "agent-native" thesis

---

## Phase 7: Open Source Launch

Ship it.

### Deliverables
- Public GitHub repository
- Documentation site
- Getting started guide
- Tutorials: "Build a Sokoban in 10 minutes", "Build an RPG in 30 minutes with Claude"
- Recipe contribution guide
- Example projects spanning genres (puzzle, card game, roguelike, platformer, tower defense, RPG)
- npm packages published
- Crates.io packages published

### Success Criteria
- A developer can `npx arcane create my-game` and have a working project
- Documentation is comprehensive enough for AI agents to use without guidance
- At least 3 example projects demonstrate different game types
- Community can contribute recipes
- The engine is actually used to build games

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
