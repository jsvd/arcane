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
│              (Rust)                          │
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

**Phase 9.5 complete (Standalone Install + LLM Dev Experience)!** 🎉

All packages published and ready to use:
- **npm**: [@arcane-engine/runtime@0.3.0](https://www.npmjs.com/package/@arcane-engine/runtime), [@arcane-engine/create@0.3.0](https://www.npmjs.com/package/@arcane-engine/create)
- **crates.io**: [arcane-engine@0.3.0](https://crates.io/crates/arcane-engine), [arcane-cli@0.3.0](https://crates.io/crates/arcane-cli)

**Current features:**
- ✅ Core engine: rendering, physics, audio, text, UI, animation, pathfinding, tweening, particles
- ✅ Recipe framework with 4 recipes (turn-based combat, inventory, grid movement, fog of war)
- ✅ Agent protocol (HTTP inspector, describe/inspect commands)
- ✅ Standalone install: `cargo install arcane-cli` just works
- ✅ Built-in asset discovery: 25 free CC0 packs with search, download, and extraction
- ✅ 1022 TS tests + 79 Rust tests passing
- ✅ Comprehensive documentation (tutorials, API reference, recipe guide)
- ✅ Example projects (Sokoban, Tower Defense, BFRPG dungeon crawler, Juice Showcase)

**Next:** Phase 10 (Scene Management + Save/Load) — Scene system with transitions, save/load with schema migration, menu flow demo.

See [docs/roadmap.md](docs/roadmap.md) for the full development plan.

## Quick Start

### Using cargo install (recommended)

```bash
# Install the Arcane CLI
cargo install arcane-cli

# Create a new game project
arcane new my-game
cd my-game

# Install runtime
npm install

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
git clone https://github.com/anthropics/arcane.git
cd arcane

# Create a new game project
cargo run --release -- new my-game
cd my-game
npm install

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
- TypeScript 5+ (`tsc --version`)

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
- [Agent Protocol](docs/agent-protocol.md) — How AI agents interact with the engine
- [Game State](docs/game-state.md) — State management, transactions, queries
- [Systems & Recipes](docs/systems-and-recipes.md) — Declarative game systems framework
- [World Authoring](docs/world-authoring.md) — Code-defined scenes, worlds, tilemaps
- [Agent Tooling](docs/agent-tooling.md) — Claude Code agents, skills, and MCP tools for development
- [Roadmap](docs/roadmap.md) — Phased development plan
- [Technical Decisions](docs/technical-decisions.md) — ADR-style decision log
- [Development Workflow](docs/development-workflow.md) — Parallel development, model selection, session management
- [Contributing](CONTRIBUTING.md) — How to contribute (humans and agents)

## License

Apache 2.0 — build whatever you want, commercially or otherwise. See [LICENSE](LICENSE) for details.
