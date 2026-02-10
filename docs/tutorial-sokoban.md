# Tutorial: Build Sokoban in 10 Minutes

**Goal:** Build a complete Sokoban puzzle game with grid movement, box pushing, and win detection.

**Time:** 10 minutes

**What you'll learn:**
- Grid-based movement
- Collision detection
- Win condition checking
- Keyboard input handling
- State transactions

## Prerequisites

- Completed [Getting Started](getting-started.md)
- Created a new Arcane project (`arcane new sokoban-game`)

## What is Sokoban?

Sokoban is a classic puzzle game:
- Push boxes onto target spots
- Can't pull boxes, only push
- Can't push two boxes at once
- Win when all boxes are on targets

## Step 1: Define the Game State

Open `src/game.ts` and define the state:

```typescript
export type Vec2 = { x: number; y: number };

export type GameState = {
  player: Vec2;
  boxes: Vec2[];
  targets: Vec2[];
  walls: Vec2[];
  gridSize: { width: number; height: number };
  moves: number;
};

export function createLevel1(): GameState {
  return {
    player: { x: 2, y: 2 },
    boxes: [
      { x: 3, y: 2 },
      { x: 4, y: 3 },
    ],
    targets: [
      { x: 5, y: 2 },
      { x: 5, y: 3 },
    ],
    walls: [
      // Top wall
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
      // Bottom wall
      { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
      // Left wall
      { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 },
      // Right wall
      { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 6, y: 4 },
    ],
    gridSize: { width: 8, height: 7 },
    moves: 0,
  };
}
```

## Step 2: Implement Movement Logic

Add helper functions:

```typescript
function vecEquals(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function hasWall(state: GameState, pos: Vec2): boolean {
  return state.walls.some(w => vecEquals(w, pos));
}

function hasBox(state: GameState, pos: Vec2): boolean {
  return state.boxes.some(b => vecEquals(b, pos));
}
```

Now implement the core movement logic:

```typescript
export function movePlayer(
  state: GameState,
  direction: "up" | "down" | "left" | "right"
): GameState {
  const delta: Record<typeof direction, Vec2> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const dir = delta[direction];
  const nextPos = vecAdd(state.player, dir);

  // Can't move into walls
  if (hasWall(state, nextPos)) {
    return state;
  }

  // Check if pushing a box
  if (hasBox(state, nextPos)) {
    const boxPos = nextPos;
    const boxNextPos = vecAdd(boxPos, dir);

    // Can't push box into wall or another box
    if (hasWall(state, boxNextPos) || hasBox(state, boxNextPos)) {
      return state;
    }

    // Push the box
    return {
      ...state,
      player: nextPos,
      boxes: state.boxes.map(b =>
        vecEquals(b, boxPos) ? boxNextPos : b
      ),
      moves: state.moves + 1,
    };
  }

  // Normal move
  return {
    ...state,
    player: nextPos,
    moves: state.moves + 1,
  };
}
```

## Step 3: Check Win Condition

```typescript
export function isLevelComplete(state: GameState): boolean {
  return state.targets.every(target =>
    state.boxes.some(box => vecEquals(box, target))
  );
}
```

## Step 4: Test the Logic

Create `src/game.test.ts`:

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import { createLevel1, movePlayer, isLevelComplete } from "./game.ts";

describe("Sokoban", () => {
  it("player can move to empty space", () => {
    const state = createLevel1();
    const next = movePlayer(state, "up");
    assert.equal(next.player.y, 1);
  });

  it("player cannot move into walls", () => {
    const state = createLevel1();
    const next = movePlayer(state, "left");
    assert.equal(next.player.x, state.player.x); // unchanged
  });

  it("player can push boxes", () => {
    const state = createLevel1();
    const next = movePlayer(state, "right"); // push box at (3,2)
    assert.equal(next.boxes[0].x, 4);
  });

  it("level is complete when all boxes on targets", () => {
    let state = createLevel1();
    // Move boxes onto targets
    state = movePlayer(state, "right");
    state = movePlayer(state, "right");
    state = movePlayer(state, "down");
    state = movePlayer(state, "right");

    assert.equal(isLevelComplete(state), true);
  });
});
```

Run tests:

```bash
arcane test
```

## Step 5: Add Rendering

Open `src/visual.ts`:

```typescript
import {
  onFrame,
  drawSprite,
  createSolidTexture,
  setCamera,
  isKeyPressed,
  getDeltaTime,
} from "@arcane/runtime/rendering";
import { registerAgent } from "@arcane/runtime/agent";
import {
  createLevel1,
  movePlayer,
  isLevelComplete,
  type GameState,
} from "./game.ts";

// Create textures
createSolidTexture("floor", 0.8, 0.8, 0.7, 1.0);    // Light gray
createSolidTexture("wall", 0.3, 0.3, 0.3, 1.0);     // Dark gray
createSolidTexture("box", 0.6, 0.4, 0.2, 1.0);      // Brown
createSolidTexture("target", 0.2, 0.8, 0.2, 0.3);   // Green (transparent)
createSolidTexture("player", 0.2, 0.5, 1.0, 1.0);   // Blue

let state = createLevel1();
let complete = false;

// Agent protocol
registerAgent({
  name: "sokoban",
  getState: () => state,
  setState: (s) => { state = s; },
  describe: () => {
    const boxesOnTargets = state.targets.filter(t =>
      state.boxes.some(b => b.x === t.x && b.y === t.y)
    ).length;
    return `Sokoban - Moves: ${state.moves}, Boxes on targets: ${boxesOnTargets}/${state.targets.length}`;
  },
});

const TILE_SIZE = 32;

onFrame(() => {
  // Handle input
  if (!complete) {
    if (isKeyPressed("ArrowUp") || isKeyPressed("w")) {
      state = movePlayer(state, "up");
    }
    if (isKeyPressed("ArrowDown") || isKeyPressed("s")) {
      state = movePlayer(state, "down");
    }
    if (isKeyPressed("ArrowLeft") || isKeyPressed("a")) {
      state = movePlayer(state, "left");
    }
    if (isKeyPressed("ArrowRight") || isKeyPressed("d")) {
      state = movePlayer(state, "right");
    }

    complete = isLevelComplete(state);
  }

  // Reset with R key
  if (isKeyPressed("r")) {
    state = createLevel1();
    complete = false;
  }

  // Set camera to center on player
  setCamera(
    state.player.x * TILE_SIZE,
    state.player.y * TILE_SIZE,
    2.0
  );

  // Draw floor
  for (let y = 0; y < state.gridSize.height; y++) {
    for (let x = 0; x < state.gridSize.width; x++) {
      drawSprite("floor", x * TILE_SIZE, y * TILE_SIZE, {
        width: TILE_SIZE,
        height: TILE_SIZE,
      });
    }
  }

  // Draw targets
  for (const target of state.targets) {
    drawSprite("target", target.x * TILE_SIZE, target.y * TILE_SIZE, {
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Draw walls
  for (const wall of state.walls) {
    drawSprite("wall", wall.x * TILE_SIZE, wall.y * TILE_SIZE, {
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Draw boxes
  for (const box of state.boxes) {
    drawSprite("box", box.x * TILE_SIZE, box.y * TILE_SIZE, {
      width: TILE_SIZE,
      height: TILE_SIZE,
    });
  }

  // Draw player
  drawSprite("player", state.player.x * TILE_SIZE, state.player.y * TILE_SIZE, {
    width: TILE_SIZE,
    height: TILE_SIZE,
  });

  // Victory message
  if (complete) {
    // Draw victory text (simplified, actual text rendering TBD)
    console.log(`Victory! Completed in ${state.moves} moves`);
  }
});
```

## Step 6: Run It!

```bash
arcane dev
```

**Controls:**
- Arrow keys or WASD to move
- R to reset

**Goal:** Push both boxes onto the green targets!

## Next Steps

### Add More Levels

```typescript
export function createLevel2(): GameState {
  return {
    player: { x: 2, y: 2 },
    boxes: [
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ],
    targets: [
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 4 },
    ],
    // ... more walls
    gridSize: { width: 10, height: 8 },
    moves: 0,
  };
}
```

### Add Undo

Store move history and implement undo:

```typescript
type GameHistory = {
  current: GameState;
  history: GameState[];
};

export function undo(history: GameHistory): GameHistory {
  if (history.history.length === 0) return history;

  const previous = history.history[history.history.length - 1];
  return {
    current: previous,
    history: history.history.slice(0, -1),
  };
}
```

### Use the Grid Movement Recipe

```bash
arcane add grid-movement
```

This provides a complete grid movement system with pathfinding!

## What You Learned

- ✅ Grid-based game logic
- ✅ Pure function state updates
- ✅ Collision detection
- ✅ Win conditions
- ✅ Testing game logic
- ✅ Rendering with sprites
- ✅ Keyboard input
- ✅ Agent protocol

## Next Tutorial

Ready for something more complex? Try the [RPG Tutorial](tutorial-rpg.md) which covers:
- Turn-based combat with recipes
- Inventory and equipment systems
- Procedural dungeon generation
- Fog of war

---

**Congratulations!** You built a complete Sokoban game in Arcane. 🎮
