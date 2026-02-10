# Arcane Examples

Standalone example projects demonstrating real-world Arcane usage.

Each example is a complete, runnable game that uses `@arcane/runtime` as a dependency (just like your projects will).

## Available Examples

### [Sokoban](./sokoban/) — Grid Movement & Pure Logic

A classic Sokoban puzzle game.

**What it demonstrates:**
- Grid-based movement
- Pure game logic (headless testing)
- Collision detection
- Win condition checking
- Undo system
- Agent protocol

**Complexity:** Beginner
**Run with:** `cd sokoban && arcane dev`

---

### [Tower Defense](./tower-defense/) — Pathfinding & Real-time

A wave-based tower defense game.

**What it demonstrates:**
- A* pathfinding (`@arcane/runtime/pathfinding`)
- Real-time game loop with delta time
- Mouse input and tower placement
- Wave system and resource management
- UI primitives (health bars, labels)
- Dynamic obstacle avoidance

**Complexity:** Intermediate
**Run with:** `cd tower-defense && arcane dev`

---

## How These Examples Work

All examples follow the same structure:

```
example-name/
├── package.json       # @arcane/runtime dependency
├── tsconfig.json      # TypeScript configuration
├── src/
│   ├── game.ts        # Pure game logic (headless)
│   └── visual.ts      # Rendering layer (entry point)
└── README.md          # Usage and extension ideas
```

### Pure Game Logic (`game.ts`)

All game logic is pure functions:

```typescript
export function movePlayer(state: GameState, direction: Direction): GameState {
  // Pure state transformation
  // No rendering, no side effects
  // Fully testable headless
}
```

This means you can test the entire game without the engine:

```typescript
let state = createGame();
state = movePlayer(state, "right");
assert.equal(state.player.x, 1);
```

### Rendering Layer (`visual.ts`)

The visual layer:
1. Calls game logic functions
2. Renders the resulting state
3. Handles input

```typescript
onFrame(() => {
  // Update logic
  state = updateGame(state, getDeltaTime());

  // Handle input
  if (isKeyPressed("Space")) {
    state = jump(state);
  }

  // Render
  drawSprite("player", state.player.x, state.player.y);
});
```

## Running Examples

### From the Engine Repository

If you cloned the Arcane repository:

```bash
cd examples/sokoban
arcane dev
```

The examples use `tsconfig.json` paths to resolve `@arcane/runtime` to `../../runtime/`.

### As Standalone Projects

Once Arcane is published to npm, these examples will work standalone:

1. Copy an example directory
2. Run `npm install`
3. Run `arcane dev`

## Learning Path

We recommend exploring examples in this order:

1. **Sokoban** — Start here. Grid movement, pure logic, testing basics.
2. **Tower Defense** — Pathfinding, real-time gameplay, UI primitives.

Then check out the full demos in `../demos/`:
- **Platformer** — Physics, jumping, collision
- **Roguelike** — Procedural generation, FOV, fog of war
- **BFRPG Crawler** — Full RPG with combat, equipment, AI

## What's Next?

### Tutorials

Step-by-step guides:
- [Build Sokoban in 10 Minutes](../docs/tutorial-sokoban.md)
- [Build an RPG in 30 Minutes](../docs/tutorial-rpg.md)

### Documentation

- [Getting Started](../docs/getting-started.md) — Install and first project
- [API Reference](../docs/api-reference.md) — Complete API docs
- [Recipe Guide](../docs/recipe-guide.md) — Build reusable systems

### Create Your Own

```bash
arcane new my-game
cd my-game
arcane dev
```

---

**Happy game building!** 🎮
