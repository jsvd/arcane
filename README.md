# Arcane

**A code-first, test-native, agent-native 2D game engine.**

Rust core for performance. TypeScript scripting for game logic — the layer AI agents write.

## The Problem

Every major game engine — Godot, Unity, Unreal — was designed around one assumption: a human sitting in front of a visual editor. AI coding agents invert this. They are code-first, CLI-first, text-first. The mismatch is architectural, not just a tooling gap.

Arcane asks: *"How does an intelligence that thinks in text, operates at superhuman speed, but can't see — build a game?"*

## Core Principles

**Code-is-the-scene.** No visual scene editor. No `.tscn` files. Scenes, worlds, and entities are defined in TypeScript. Code is the source of truth.

**Game-is-a-database.** The entire game state is a queryable, observable, transactional data store. Not objects with properties scattered across a scene tree.

**Testing-first.** Game logic runs headless — pure TypeScript, no engine, no GPU, no window. Tests execute instantly. The engine provides performance, not correctness.

**Agent-native.** A built-in protocol lets AI agents query game state, execute actions, "see" the game as text, and iterate at superhuman speed.

## Architecture

```
┌─────────────────────────────────────────────┐
│           GAME LOGIC LAYER                  │
│            (TypeScript)                     │
│                                             │
│  What the AGENT writes. Pure game logic.    │
│  State, rules, systems, data, tests.        │
│  Runs headless for testing. No rendering.   │
├─────────────────────────────────────────────┤
│           ENGINE CORE                       │
│              (Rust)                         │
│                                             │
│  What the ENGINE provides. Performance.     │
│  Renderer, physics, audio, ECS, spatial,    │
│  pathfinding, networking.                   │
│                                             │
│  Agents rarely touch this. Humans can.      │
└─────────────────────────────────────────────┘
```

The game logic layer is where 90% of development happens. It's pure TypeScript — typed, testable, hot-reloadable. The Rust core handles rendering, physics, audio, and other performance-critical systems. The two communicate through a well-defined bridge.

## What It Looks Like

```typescript
// Define a dungeon room
const entrance = room({
  size: [20, 15],
  tiles: { floor: 'stone_cracked', walls: 'dungeon_brick' },
  spawns: [
    encounter('goblin_patrol', {
      enemies: [monster('goblin', 2)],
      trigger: 'on_enter',
    }),
  ],
})

// Test combat logic — headless, no engine needed
test('fireball damages enemies in radius', () => {
  const state = createState({
    combat: {
      player: character({ class: 'mage', spells: ['fireball'] }),
      enemies: [
        monster('goblin', { position: [3, 3] }),
        monster('goblin', { position: [9, 9] }),
      ],
    },
  })

  const next = castSpell(state, 'fireball', { target: [3, 3], radius: 2 })

  expect(next.combat.enemies[0].hp).toBeLessThan(state.combat.enemies[0].hp)
  expect(next.combat.enemies[1].hp).toBe(state.combat.enemies[1].hp) // out of range
})
```

## Target Games

2D games: RPGs, roguelikes, tactics, adventure, platformers. The sweet spot where agents can author everything except pixel art.

## Target Audience

- Solo devs building with AI agents
- Game jam participants
- Indie teams making 2D/2.5D games
- Developers who code but aren't visual artists
- Educational / hobbyist game dev

## The Analogy

Rails for games. Rails didn't beat Java by being more powerful — it beat it by being opinionated and productive. Convention over configuration. Arcane doesn't beat Unity by being more capable. It beats Unity by being the engine an AI agent can actually use.

## Status

**v0.13.2 — Critical sprite rendering fix (broken since v0.13.0), cross-platform CI fix, MCP hot_reload probe.**

Install: [`cargo install arcane-engine`](https://crates.io/crates/arcane-engine)

One binary. No npm required. The CLI embeds the TypeScript runtime and copies it into your project.

**Current features:**
- ✅ Core engine: rendering, audio, text, UI, animation, pathfinding, tweening, particles
- ✅ GPU geometry pipeline: circles, lines, triangles, polygons, arcs, ellipses, rings, capsules via dedicated colored-triangle pass
- ✅ Rust-native particle simulation: emitter lifecycle and physics in Rust with packed float array readback
- ✅ Sprite transforms: rotation, origin point, flip, opacity, blend modes (additive, multiply, screen)
- ✅ Custom WGSL shaders: user-defined fragment shaders with 16 vec4 uniform slots
- ✅ Post-processing pipeline: offscreen render targets, effect chaining, built-in bloom/blur/vignette/CRT
- ✅ Camera polish: bounds/limits, deadzone, smooth follow, smooth zoom, parallax scrolling
- ✅ Tilemap polish: multiple layers, animated tiles, auto-tiling (4-bit/8-bit bitmask), tile properties
- ✅ Animation polish: state machine (states, transitions, conditions), crossfade blending, frame events
- ✅ Interactive UI: buttons, checkboxes, radio groups, sliders, text input, layout helpers, focus/tab navigation
- ✅ Rust physics engine: rigid bodies, circle/AABB shapes, spatial hash broadphase, SAT narrowphase, sequential impulse solver, distance + revolute joints, sleep system, raycast, AABB queries
- ✅ Scene node transform hierarchy: parent-child relationships, world transforms, `applyToSprite()`
- ✅ Text layout: `wrapText()`, `drawTextWrapped()`, `drawTextAligned()` with alignment options
- ✅ Bulk data submission: `op_submit_sprite_batch` (sprites) and `getAllBodyStates()` (physics) for reduced op overhead
- ✅ Async asset loading: `preloadAssets()`, `isTextureLoaded()`, `getLoadingProgress()`
- ✅ Scene management: scene stack, transitions, lifecycle hooks
- ✅ Save/load: serialization, schema migrations, auto-save, file I/O ops
- ✅ Recipe framework with 5 recipes (turn-based combat, inventory, grid movement, fog of war, actor patrol)
- ✅ Agent protocol (HTTP inspector, describe/inspect commands)
- ✅ MCP server: JSON-RPC 2.0 with 10 tools for AI agent interaction
- ✅ Snapshot-replay testing: deterministic physics recording, world snapshots, replay diffing
- ✅ Property-based testing: generators, shrinking, configurable iterations
- ✅ Procedural generation: Wave Function Collapse with constraints (reachability, count, border)
- ✅ Audio polish: instance-based playback, spatial audio, bus mixing, crossfade, sound pooling, pitch variation
- ✅ Radiance Cascades 2D global illumination: emissives, occluders, spot lights, HDR scene texture
- ✅ MSDF text rendering: resolution-independent text with outline and shadow support
- ✅ Screen transitions: fade, wipe, circle iris, diamond, pixelate with mid-transition callbacks
- ✅ Visual polish: nine-slice sprites, trail/ribbon renderer, sprite shadows
- ✅ Game feel / juice: impact combinator (hitstop + shake + flash), floating text / damage numbers, typewriter text
- ✅ Isometric & hex grids: coordinate systems, tilemaps, depth sorting, hex pathfinding
- ✅ Input systems: gamepad support (gilrs), multi-touch, action mapping with remapping & buffering
- ✅ MCP-first DX: zero-config MCP auto-discovery for Claude Code, Cursor, VS Code
- ✅ Single binary distribution: `cargo install arcane-engine` embeds runtime + recipes, no npm required
- ✅ Built-in asset discovery: 25 free CC0 packs with search, download, and extraction
- ✅ Unified Color API: all public APIs accept `Color` objects (0-1 floats)
- ✅ Particle presets: `burstParticles()`, `streamParticles()` with 4 built-in presets
- ✅ Platformer knockback: `platformerApplyImpulse()` with auto-decaying external velocity
- ✅ UI palette system: `setPalette()`, `paletteColor()` for consistent theming
- ✅ API cheatsheet: auto-generated compact reference for all 500+ exported functions
- ✅ 5 recipes (turn-based combat, inventory, grid movement, fog of war, actor patrol)
- ✅ 2227 TS (Node) + 2351 (V8) + 295 Rust tests passing
- ✅ Comprehensive documentation (tutorials, API reference, recipe guide)
- ✅ 27 example projects (Hello World, Card Battler, Sokoban, Breakout, Roguelike, Platformer, Tower Defense, Sprite Demo, BFRPG RPG, Asteroids, Juice Showcase, Menu Flow, Physics Playground, Parallax Scroller, Tilemap Showcase, Character Controller, UI Showcase, Agent Testing, WFC Dungeon, Lighting Showcase, MSDF Text Showcase, Isometric Dungeon, Audio Showcase, Visual Polish, Hex Strategy, Gamepad Platformer)

**Next:** Phase 26 (Atmosphere).

See [docs/roadmap.md](docs/roadmap.md) for the full development plan.

### Quick Start

```bash
# Install the Arcane CLI
cargo install arcane-engine

# Create a new game project
arcane new my-game
cd my-game

# Run with hot-reload
arcane dev

# Run tests
arcane test

# Add a recipe (e.g., turn-based combat)
arcane add turn-based-combat

# Find and download free game assets
arcane assets search "dungeon"
arcane assets download tiny-dungeon
```

### From source

```bash
# Clone the repository
git clone https://github.com/jsvd/arcane.git
cd arcane

# Create a new game project
cargo run --release -- new my-game
cd my-game

# Run with hot-reload
cargo run --release -- dev
```

## Features

### Hot-Reload
Edit TypeScript files while the game is running and see changes instantly (typically 50-200ms). The engine:
- Detects `.ts` file changes via file watcher
- Creates a fresh V8 isolate with your updated code
- Preserves texture/sound IDs to prevent flickering
- **Note**: Game state is reset on reload (intentional for rapid iteration)

### Agent Protocol
AI agents can interact with your game via:
- `arcane describe` - Text description of game state (headless)
- `arcane inspect <path>` - Query specific state paths (headless)
- `--inspector <port>` - HTTP API for querying state, executing actions, time travel

### Headless Testing
All game logic runs headless - no GPU required for tests:
```bash
arcane test              # Run all *.test.ts files in V8
./run-tests.sh           # Run tests in Node.js
```

### Recipe System
Composable game systems with pure functions:
```bash
arcane add --list                  # List available recipes
arcane add turn-based-combat       # Add recipe to project
```

Available recipes: turn-based-combat, inventory-equipment, grid-movement, fog-of-war

### Game Assets
Built-in catalog of 25 free CC0 asset packs from Kenney.nl:
```bash
arcane assets list                    # Browse all packs
arcane assets search "dungeon"        # Search with synonym expansion
arcane assets download tiny-dungeon   # Download and extract
arcane assets list --type audio       # Filter by type
```

## Development

### Prerequisites
- Rust 1.75+ (`cargo --version`)
- Node.js 18+ (for TypeScript testing)

### Build & Test
```bash
# Build release binary
cargo build --release

# Run all tests (Node + V8 + Rust)
./run-tests.sh                    # TypeScript tests in Node
cargo run --release -- test       # TypeScript tests in V8
cargo test --workspace            # Rust unit tests

# Type checking (IMPORTANT: Run before commits!)
./check-types.sh                  # or: tsc --noEmit

# Verify headless mode
cargo check --no-default-features
```

### Running Demos
```bash
# Visual demos (with window)
cargo run --release -- dev demos/platformer/platformer-visual.ts
cargo run --release -- dev demos/roguelike/roguelike-visual.ts
cargo run --release -- dev demos/bfrpg-crawler/bfrpg-visual.ts
cargo run --release -- dev demos/isometric-dungeon/isometric-dungeon.ts

# With hot-reload (edit .ts files while running)
cargo run --release -- dev demos/platformer/platformer-visual.ts

# With HTTP inspector (query state from browser)
cargo run --release -- dev demos/roguelike/roguelike-visual.ts --inspector 4321
# Then: http://localhost:4321/describe
```

### Agent Protocol
```bash
# Text description of game state
cargo run --release -- describe demos/roguelike/roguelike-visual.ts

# Query specific state paths
cargo run --release -- inspect demos/roguelike/roguelike-visual.ts "player"
cargo run --release -- inspect demos/roguelike/roguelike-visual.ts "dungeon.tiles"
```

## Documentation

- [Engineering Philosophy](docs/engineering-philosophy.md) — The Three Laws, development principles, verification framework
- [API Design](docs/api-design.md) — LLM-friendly API rules, error design, naming conventions
- [Glossary](docs/glossary.md) — Canonical definitions for all project terminology
- [Architecture](docs/architecture.md) — Two-layer design, Rust core, TypeScript runtime
- [World Authoring](docs/world-authoring.md) — Code-defined scenes, worlds, tilemaps
- [Agent Tooling](docs/agent-tooling.md) — Claude Code agents, skills, and MCP tools for development
- [Roadmap](docs/roadmap.md) — Phased development plan
- [Technical Decisions](docs/technical-decisions.md) — ADR-style decision log
- [Development Workflow](docs/development-workflow.md) — Parallel development, model selection, session management
- [Contributing](CONTRIBUTING.md) — How to contribute (humans and agents)

## License

Apache 2.0 — build whatever you want, commercially or otherwise. See [LICENSE](LICENSE) for details.
