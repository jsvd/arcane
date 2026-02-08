# Roadmap

## The Bootstrap Philosophy

Arcane is built by AI agents. The engine is the proof of concept. If an agent-native game engine can't be built by an agent, it's not agent-native enough.

1. Human architect writes design documents
2. Claude builds core runtime (state management, transactions, event loop)
3. Claude builds first renderer
4. Claude builds test framework integration
5. Claude builds first game system recipes
6. Claude builds showcase game (BFRPG RPG ported from Godot)
7. Showcase game validates the engine. Gaps surface as pain points. Fix. Iterate.

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

## Phase 1: Rust Skeleton + TypeScript Runtime + Headless Game Logic

Build the foundation: a TypeScript game runtime that runs headless, with the Rust project scaffolded.

### Deliverables
- Rust project with Cargo workspace (core, cli crates)
- V8/deno_core embedding — TypeScript runs inside Rust
- TypeScript runtime: state management, transactions, queries, diffs
- Observation/subscription system
- Deterministic PRNG
- Headless test harness — game logic runs in Node without engine
- First system definition: a minimal turn-based combat
- `arcane test` CLI command (runs TS tests headless)
- CI pipeline (Rust + TS tests)

### Success Criteria
- Can define a combat system in TypeScript
- Can run a full combat encounter headless (no rendering)
- Tests pass in Node and in embedded V8
- State transactions produce correct diffs
- Seeded PRNG produces deterministic results

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

### Success Criteria
- A tilemap dungeon renders on screen
- Sprites animate (walk, attack, idle)
- Camera follows the player
- Lighting creates atmosphere
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

## Phase 4: First Recipes (Combat, Inventory, Movement)

Build the first composable game systems. Prove the recipe pattern works.

### Deliverables
- `@arcane/turn-based-combat` recipe
  - Initiative, turns, actions, targeting, damage
  - The `extend` pattern for customization
- `@arcane/inventory-equipment` recipe
  - Items, stacking, equipment slots
  - Wiring into combat (armor, weapons)
- `@arcane/movement` recipe
  - Grid-based movement
  - Pathfinding integration
  - Collision with tilemap
- `@arcane/fog-of-war` recipe
  - Visibility calculation
  - Explored/unexplored/visible states
- `npx arcane add` CLI command
- Recipe documentation and test patterns

### Success Criteria
- Each recipe works standalone
- Recipes compose without conflicts
- `extend` pattern allows meaningful customization
- Each recipe ships with comprehensive tests
- An agent can install, configure, and customize a recipe

---

## Phase 5: Showcase Game (BFRPG RPG)

Port the existing Godot BFRPG RPG to Arcane. This validates everything.

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
- Tutorial: "Build an RPG in 30 minutes with Claude"
- Recipe contribution guide
- Example projects (RPG, roguelike, tactics)
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
