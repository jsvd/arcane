# Architecture

## The Two-Layer Cake

Arcane has two layers with a hard boundary between them:

1. **Game Logic Layer** (TypeScript) — what the agent writes
2. **Engine Core** (Rust) — what the engine provides

This isn't just a language split. It's a design philosophy: game logic must be testable without the engine. If your combat system needs a GPU to validate, something is wrong.

## Engine Core (Rust)

The Rust core owns everything performance-critical and platform-specific:

### Renderer (`core/renderer/`)
- wgpu-based 2D renderer
- Tile-based rendering with multiple layers, autotiling, animated tiles
- Sprite system with atlases, animation state machines, blend trees
- 2D dynamic lighting, shadows, ambient occlusion
- Data-driven particle system (defined in code, not a visual editor)
- Custom shaders in WGSL, hot-reloadable, with typed parameter binding
- Post-processing: bloom, chromatic aberration, screen shake, palette effects
- Native UI renderer (no DOM overhead)

### Physics (`core/physics/`)
- 2D only: AABB collision, raycasts, overlap queries
- Simple and fast — not a full physics simulation
- Sufficient for tile-based and action games

### Audio (`core/audio/`)
- Spatial audio, mixing, streaming
- Built on symphonia

### ECS (`core/ecs/`)
- Entity storage, component arrays, archetype queries
- The Rust side of entity management (TS side has the game-facing API)

### Spatial (`core/spatial/`)
- Spatial indexing (grid, quadtree)
- Pathfinding: A*, flow fields
- Range queries, line-of-sight

### Scripting (`core/scripting/`)
- V8 embedding via deno_core
- Script hot-reload with state preservation
- FFI bridge between TS game logic and Rust systems

### Platform (`core/platform/`)
- Windowing (winit)
- Input handling, gamepad support (gilrs)
- File I/O per platform

## TypeScript Runtime

The TypeScript runtime is where games are built. It runs in two modes:

1. **Hosted** — inside the Rust engine, with rendering and platform access
2. **Headless** — standalone in Node/Deno, no engine, for testing and tooling

### State (`runtime/state/`)
- State tree with typed schemas
- Transactions with diffs
- Query API for filtering and selecting entities
- Observation/subscription system

### Systems (`runtime/systems/`)
- Declarative system/rule definitions
- Composable recipes
- The `extend` pattern for customization

### World (`runtime/world/`)
- Code-defined scenes and rooms
- World/dungeon specifications as data
- Tilemap authoring

### Entities (`runtime/entities/`)
- Entity archetypes and component schemas
- Character, monster, item, interactable definitions

### Events (`runtime/events/`)
- Event bus
- Observers and listeners

### Rendering Bridge (`runtime/rendering/`)
- Sprite control from game logic
- Visual effect triggers
- Camera control
- UI component tree

The bridge translates high-level TypeScript commands into renderer instructions:

```typescript
// Game logic says what to show (TS)
setSprite(entity, 'warrior_attack', { frame: 3 })
addParticleEffect('slash', { position: entity.position })

// Engine core handles how to show it (Rust)
// Batched draw calls, GPU upload, shader execution — all invisible to game logic
```

### Testing (`runtime/testing/`)
- Mock renderer that captures render commands as assertions
- Fluent state builder for test setup
- Text description renderer (game state → natural language)

## Directory Structure

```
arcane/
├── core/                    # Rust engine core
│   ├── renderer/            # wgpu-based 2D renderer
│   │   ├── tilemap.rs
│   │   ├── sprites.rs
│   │   ├── lighting.rs
│   │   ├── particles.rs
│   │   ├── shaders/
│   │   └── ui.rs
│   ├── audio/
│   ├── physics/
│   ├── spatial/
│   ├── ecs/
│   ├── scripting/           # V8 embedding, hot-reload
│   └── platform/            # Windowing, input, file I/O
│
├── runtime/                 # TypeScript game runtime
│   ├── state/
│   ├── systems/
│   ├── world/
│   ├── entities/
│   ├── events/
│   ├── rendering/           # TS → Rust renderer bridge
│   │   ├── sprites.ts
│   │   ├── effects.ts
│   │   ├── camera.ts
│   │   └── ui.ts
│   └── testing/
│       ├── mock-renderer.ts
│       ├── state-builder.ts
│       └── describe.ts
│
├── recipes/                 # Composable game system modules
│   ├── turn-based-combat/
│   ├── inventory-equipment/
│   ├── dialogue-branching/
│   ├── dungeon-generation/
│   ├── fog-of-war/
│   ├── save-load/
│   └── character-progression/
│
├── cli/                     # The arcane CLI
│   ├── create.rs
│   ├── dev.rs
│   ├── test.rs
│   ├── build.rs
│   └── agent.rs
│
└── editor/                  # Optional web-based inspector
```

## The Rendering Bridge

Game logic never talks to the GPU directly. Instead, it issues high-level rendering commands that the Rust core translates into efficient draw calls.

```
TypeScript                          Rust
─────────                          ────
setSprite(id, 'warrior')    →      Batch sprite draw
moveCamera(5, 3)            →      Update view matrix
addLight(pos, radius)       →      Update light uniform
showDamageNumber(7, pos)    →      Spawn UI element
```

This separation means:
- Game logic is testable without a GPU
- The renderer can be optimized without changing game code
- Visual effects don't leak into game state

## Headless Mode

The critical design constraint: **everything the agent writes must be testable headless**, without the Rust engine running.

```typescript
import { createGame, step, query } from '@arcane/runtime'
import { TacticalCombat } from './systems/combat'

// No engine. No GPU. No window. Just logic.
const game = createGame({
  systems: [TacticalCombat],
  state: {
    party: [createCharacter({ class: 'fighter', level: 3 })],
    dungeon: loadDungeon('crypt_of_the_goblin_king'),
  },
})

const next = step(game, { action: 'move', direction: 'north' })
const enemies = query(next, 'entities.hostile.alive')
```

Game logic is pure functions over state. The engine core provides performance, not correctness.

## Dependency Choices

| Dependency | Purpose | Why |
|---|---|---|
| wgpu | GPU rendering | Cross-platform (Vulkan, Metal, DX12, WebGPU), compiles to native and WASM |
| deno_core | V8 embedding | Solved Rust↔V8 FFI, performant data bridge |
| winit | Windowing | Standard Rust windowing, cross-platform |
| gilrs | Gamepad input | Unified gamepad API |
| symphonia | Audio | Pure Rust audio decoding |
| rapier | Physics | 2D physics (if needed beyond AABB) |

See [Technical Decisions](technical-decisions.md) for detailed rationale.
