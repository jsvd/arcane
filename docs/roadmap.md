# Roadmap

## The Bootstrap Philosophy

Arcane is built by AI agents. The engine is the proof of concept. If an agent-native game engine can't be built by an agent, it's not agent-native enough.

1. Human architect writes design documents
2. Claude builds core runtime (state management, transactions, event loop)
3. Claude builds first renderer
4. Claude builds test framework integration
5. Claude builds game system recipes
6. Claude builds mini-game demos across genres — each validates new capabilities
7. Claude builds showcase game (BFRPG RPG ported from Godot)
8. Demos and showcase surface pain points. Fix. Iterate.

## Demo Games — Genre Validation Strategy

The engine must serve the breadth of 2D games, not just RPGs. Each demo is small (< 500 lines of game logic) but exercises distinct engine capabilities. Demos are built at the phase where their prerequisites land.

| Demo | Phase | Genre | What It Validates |
|---|---|---|---|
| **Sokoban** | 1 | Puzzle | State + transactions, undo/redo via replaceState, win detection |
| **Card Battler** | 1 | Card game | Non-entity state shapes (deck/hand/discard zones), PRNG shuffle |
| **Roguelike** | 2 | Roguelike | Procedural generation, tile rendering, fog of war |
| **Breakout** | 2 | Action | Real-time loop, collision, physics, frame-rate independence |
| **Tower Defense** | 4 | Strategy | Spatial queries, pathfinding, entity waves, spawn/despawn |
| **BFRPG RPG** | 5 | RPG | Full integration: combat, inventory, dialogue, save/load |

### Why These Games

- **Sokoban**: Smallest possible "real game". If the state model can't handle a grid puzzle cleanly, it can't handle anything.
- **Card Battler**: State tree looks nothing like an entity-position game. Proves the state model is generic, not RPG-shaped.
- **Roguelike**: Procedural content generation is the acid test for PRNG determinism and tile map support.
- **Breakout**: The simplest real-time game. If the engine can't do Breakout at 60 FPS, the frame loop is broken.
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

## Phase 2: Renderer (Tilemap + Sprites + Basic Lighting)

Build the visual layer. The game should look like a game.

### Deliverables
- wgpu initialization and window creation
- Tilemap renderer (multiple layers, autotiling)
- Sprite renderer (atlases, basic animation)
- Camera system (follow, pan, zoom)
- Basic 2D lighting (point lights, ambient)
- Rendering bridge: TypeScript issues render commands, Rust executes them
- `arcane dev` command (launches game with hot-reload)
- **Demo: Roguelike** — procedural dungeon generation + tile rendering + fog of war
- **Demo: Breakout** — real-time game loop, collision detection, physics

### Success Criteria
- Roguelike generates and renders tile dungeons
- Breakout runs at 60 FPS with real-time collision
- Camera follows the player
- Hot-reload works: change TS → see result in < 1 second

---

## Phase 3: Agent Protocol + CLI

Make the engine agent-native. This is what differentiates Arcane.

### Deliverables
- `arcane describe` — text description of game state
- `arcane inspect <path>` — query specific state paths
- `arcane screenshot` — capture rendered frame
- HTTP inspector API (localhost:4321)
  - GET /state/* — query state
  - POST /action — execute action
  - GET /describe — text description
  - POST /rewind — time travel
  - POST /simulate — what-if queries
- Text description renderer (configurable verbosity)
- Error snapshots (auto-capture state on errors)
- REPL mode for direct agent interaction

### Success Criteria
- An AI agent can query game state via HTTP
- Text descriptions accurately represent the game state
- Agent can execute actions and see results without vision
- Error snapshots contain enough info to reproduce bugs
- The agent workflow loop (write → reload → query → test → fix) works end-to-end

---

## Phase 4: First Recipes (Combat, Inventory, Movement, Pathfinding)

Build the first composable game systems. Prove the recipe pattern works across genres.

### Deliverables
- `@arcane/turn-based-combat` recipe
  - Initiative, turns, actions, targeting, damage
  - The `extend` pattern for customization
- `@arcane/inventory-equipment` recipe
  - Items, stacking, equipment slots
  - Wiring into combat (armor, weapons)
- `@arcane/grid-movement` recipe
  - Grid-based movement
  - Pathfinding integration
  - Collision with tilemap
- `@arcane/fog-of-war` recipe
  - Visibility calculation
  - Explored/unexplored/visible states
- `@arcane/pathfinding` recipe
  - A* over grid maps, reusable across genres
- `npx arcane add` CLI command
- Recipe documentation and test patterns
- **Demo: Tower defense** — spatial queries, pathfinding, entity waves, spawn/despawn lifecycle

### Success Criteria
- Each recipe works standalone
- Recipes compose without conflicts
- Tower defense demo uses pathfinding + spatial query recipes together
- `extend` pattern allows meaningful customization
- Each recipe ships with comprehensive tests
- An agent can install, configure, and customize a recipe

---

## Phase 5: Showcase Game (BFRPG RPG)

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

## Phase 6: Open Source Launch

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
