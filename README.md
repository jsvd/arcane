# Arcane

**A code-first, test-native, agent-native 2D game engine.**

Rust core for performance. TypeScript scripting for game logic — the layer AI agents write.

## The Problem

Every major game engine — Godot, Unity, Unreal — was designed around one assumption: a human sitting in front of a visual editor. AI coding agents invert this. They are code-first, CLI-first, text-first. The mismatch is architectural, not just a tooling gap.

Arcane asks: *"What would a game engine look like if it was built for an intelligence that thinks in text, operates at superhuman speed, but can't see?"*

## Core Principles

**Code-is-the-scene.** No visual editor. No `.tscn` files. Scenes, worlds, and entities are defined in TypeScript. Code is the source of truth.

**Game-is-a-database.** The entire game state is a queryable, observable, transactional data store. Not objects scattered across a scene tree.

**Testing-first.** Game logic runs headless — pure TypeScript, no GPU, no window. Tests execute instantly. The engine provides performance, not correctness.

**Agent-native.** A built-in protocol lets AI agents query game state, execute actions, "see" the game as text, and iterate at superhuman speed.

## The Analogy

Rails for games. Rails didn't beat Java by being more powerful — it beat it by being opinionated and productive. Arcane doesn't beat Unity by being more capable. It beats Unity by being the engine an AI agent can actually use.

## What It Looks Like

```typescript
import { createGame, hud } from "@arcane/runtime/game";
import { drawSprite } from "@arcane/runtime/rendering";
import { rgb } from "@arcane/runtime/ui";
import { isActionDown, createInputMap, WASD_ARROWS } from "@arcane/runtime/input";

const game = createGame({ name: "my-game" });
const input = createInputMap(WASD_ARROWS);
let player = { x: 100, y: 100, score: 0 };

game.onFrame((ctx) => {
  // Input — action map handles keyboard + gamepad
  if (isActionDown("left", input)) player.x -= 200 * ctx.dt;
  if (isActionDown("right", input)) player.x += 200 * ctx.dt;

  // Render — sprites, shapes, text
  drawSprite({ color: rgb(60, 180, 255), x: player.x, y: player.y, w: 32, h: 32 });
  hud.text(`Score: ${player.score}`, 10, 10);
});
```

```typescript
// game.ts — pure logic, no rendering, 100% testable
export function takeDamage(state: GameState, amount: number): GameState {
  return { ...state, hp: Math.max(0, state.hp - amount) };
}

// game.test.ts — runs headless, instant, no GPU
import { describe, it, assert } from "@arcane/runtime/testing";
describe("combat", () => {
  it("damage reduces hp", () => {
    const result = takeDamage({ hp: 10 }, 3);
    assert.equal(result.hp, 7);
  });
});
```

## Target Games

2D games: RPGs, roguelikes, tactics, adventure, platformers. The sweet spot where agents can author everything except pixel art.

## Target Audience

- Solo devs building with AI agents
- Game jam participants
- Indie teams making 2D/2.5D games
- Developers who code but aren't visual artists
- Educational / hobbyist game dev

## Quick Start

```bash
cargo install arcane-engine
arcane new my-game && cd my-game
arcane dev
```

Edit `src/visual.ts`, save, see changes in ~100ms. No restart needed.

## Features

**Rendering**: Sprites, shapes, tilemaps, parallax, MSDF text, post-processing (bloom, CRT), custom WGSL shaders, 2D global illumination

**Animation**: Sprite sheets, state machines, transitions, blending, frame events

**Physics**: Rigid bodies, circle/AABB collision, joints, raycasts, sleep system (Rust-native)

**Audio**: Spatial audio, crossfade, bus mixing, pooling, pitch variation

**UI**: Buttons, sliders, checkboxes, text input, focus management, nine-slice panels

**Input**: Keyboard, mouse, gamepad, multi-touch, action mapping with buffering

**Grids**: Cartesian, isometric, hexagonal coordinate systems with pathfinding

**Procgen**: Wave Function Collapse with constraints (reachability, count, border)

**Scenes**: Scene stack, transitions (fade, wipe, iris), lifecycle hooks, save/load

**Testing**: Headless execution, snapshot replay, property-based testing, shrinking

**Agent Protocol**: MCP server (10 tools), HTTP inspector, `describe`/`inspect` CLI

## CLI Commands

```bash
arcane new <name>        # Create project from template
arcane dev [entry.ts]    # Run with hot-reload + MCP server
arcane test              # Run all *.test.ts files
arcane check             # Type-check project
```

## 31 Demo Projects

Platformer, Roguelike, Breakout, Tower Defense, Card Battler, Sokoban, Asteroids, Physics Playground, Isometric Dungeon, Hex Strategy, and more.

```bash
arcane dev demos/platformer/platformer-visual.ts
arcane dev demos/roguelike/roguelike-visual.ts
```

## For AI Agents

Arcane includes an MCP server that works with Claude Code, Cursor, and VS Code. Tools: `get_state`, `execute_action`, `step_frames`, `describe_game`, `run_tests`, and more.

Scaffolded projects include:
- `AGENTS.md` — Full development guide with working code patterns
- `types/*.d.ts` — Per-module API declarations with JSDoc

## Status

**v0.23.1** — 2346 TS (Node) + 2349 (V8) + 387 Rust tests passing.

**Next:** See [roadmap](docs/roadmap.md) backlog.

## Development

```bash
# Prerequisites: Rust 1.75+, Node.js 24+

cargo build --release           # Build
./run-tests.sh                  # TS tests in Node
cargo run -- test               # TS tests in V8
cargo test --workspace          # Rust tests
cargo check --no-default-features  # Verify headless
```

## Documentation

- [Architecture](docs/architecture.md) — Two-layer design, Rust core, TypeScript runtime
- [API Design](docs/api-design.md) — Naming conventions, error handling
- [Glossary](docs/glossary.md) — Canonical definitions for all terms
- [Roadmap](docs/roadmap.md) — Development plan and backlog
- [Contributing](CONTRIBUTING.md) — How to contribute (humans and agents)

## License

Apache 2.0 — build whatever you want, commercially or otherwise. See [LICENSE](LICENSE).
