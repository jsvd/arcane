# Sokoban Example

A classic Sokoban puzzle game built with Arcane.

## What is Sokoban?

Sokoban is a puzzle game where you push boxes onto goal positions. You can only push (not pull) boxes, and you can't push two boxes at once.

## Features

- Grid-based movement
- Box pushing mechanics
- Win detection
- Undo system (press Z)
- Reset level (press R)
- Agent protocol support

## How to Run

### Prerequisites

- Arcane CLI installed (see main README)
- Node.js 18+ for TypeScript

### Run the Game

```bash
# From the examples/sokoban directory
arcane dev
```

The game will open in a window.

### Controls

- **Arrow keys** or **WASD** — Move player
- **Z** — Undo last move
- **R** — Reset level

### Goal

Push all 5 boxes (brown squares) onto the goal positions (red squares). When a box is on a goal, it turns green.

## Project Structure

```
sokoban/
├── package.json       # Dependencies (@arcane/runtime)
├── tsconfig.json      # TypeScript configuration
├── src/
│   ├── game.ts        # Pure game logic (headless)
│   └── visual.ts      # Rendering layer (entry point)
└── README.md
```

## Code Overview

### `src/game.ts` — Pure Game Logic

All game logic is pure functions that work without rendering:

```typescript
export function movePlayer(
  state: SokobanState,
  direction: Direction
): SokobanState {
  // Pure state transformation
  // No rendering, no side effects
}
```

This means you can test the entire game headless:

```typescript
let state = parseLevel(LEVEL);
state = movePlayer(state, "right");
assert.equal(state.player.x, 3);
```

### `src/visual.ts` — Rendering Layer

The visual layer:
1. Calls game logic functions
2. Renders the resulting state
3. Handles input

```typescript
onFrame(() => {
  const state = game.store.getState();

  // Handle input
  if (isKeyPressed("ArrowRight")) {
    game.move("right");
  }

  // Render state
  drawSprite("player", state.player.x * 32, state.player.y * 32);
});
```

## Agent Protocol

Query the game state from the command line:

```bash
# Get a text description
arcane describe src/visual.ts

# Query specific state
arcane inspect src/visual.ts "moves"
arcane inspect src/visual.ts "won"

# HTTP inspector (in another terminal)
arcane dev --inspector 4321
curl http://localhost:4321/describe
```

## Extending the Game

### Add More Levels

Edit `src/visual.ts` and add more level strings:

```typescript
const LEVELS = [
  `
  #######
  #     #
  # .$. #
  # $.$ #
  # .$. #
  #  @  #
  #######
  `,
  `
  ########
  #   .  #
  # $$$  #
  # @..  #
  ########
  `,
];
```

### Add Move Counter UI

Use the UI primitives:

```typescript
import { drawLabel, rgb } from "@arcane/runtime/ui";

drawLabel(`Moves: ${state.moves}`, 10, 10, {
  textColor: rgb(255, 255, 255),
  scale: 2.0,
});
```

### Add Victory Screen

Check for win condition and show a message:

```typescript
if (state.won) {
  drawLabel(`Victory in ${state.moves} moves!`, 100, 100, {
    textColor: rgb(0, 255, 0),
    scale: 3.0,
  });
}
```

## What You Can Learn

This example demonstrates:

- ✅ Pure game logic separation
- ✅ Grid-based movement
- ✅ Collision detection
- ✅ Win condition checking
- ✅ Undo/redo system
- ✅ Agent protocol integration
- ✅ Solid-color placeholder textures

## Next Steps

- Try the [Tower Defense example](../tower-defense/) for pathfinding and recipes
- Read the [Sokoban Tutorial](../../docs/tutorial-sokoban.md) for a step-by-step guide
- Check out the [API Reference](../../docs/api-reference.md)

---

**Have fun pushing boxes!** 📦
