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

**Phase 2a complete.** Window creation, sprite rendering, camera system, `arcane dev` command with hot-reload. 163 tests passing in both Node and V8.

See [docs/roadmap.md](docs/roadmap.md) for the full development plan.

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
