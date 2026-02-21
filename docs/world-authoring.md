# World Authoring

## Code-Defined Scenes

Arcane has no visual scene editor. No `.tscn` files. No drag-and-drop. Scenes are TypeScript code.

**Implemented APIs today:**
- **Tilemaps**: `createTilemap()`, `setTile()`, `drawTilemap()` from `@arcane/runtime/rendering`
- **Scene manager**: `createScene()`, `pushScene()`, `popScene()` from `@arcane/runtime/scenes`
- **Procedural generation**: Wave Function Collapse (WFC) from `@arcane/runtime/procgen`

> **Future direction:** Higher-level world/room/encounter DSLs (`scene()`, `world()`, `room()`, `encounter()`, etc.) are planned but not yet implemented. The patterns below use today's working APIs.

## Procedural Generation (Wave Function Collapse)

Arcane provides a Wave Function Collapse (WFC) algorithm for tile-based level generation. WFC takes a tileset with adjacency rules and collapses a grid of possibilities into a valid layout.

### Defining a Tileset

A tileset declares which tiles can be neighbors in each direction. The `TileSet` type has two properties:
- `tiles`: Map of tile ID to adjacency rules (required)
- `weights`: Map of tile ID to selection weight (optional, defaults to 1)

```typescript
import { generate, reachability, exactCount, border } from "@arcane/runtime/procgen";
import type { TileSet } from "@arcane/runtime/procgen";

const FLOOR = 0, WALL = 1, DOOR = 2, WATER = 3;

const tileset: TileSet = {
  tiles: {
    [FLOOR]: { north: [FLOOR, WALL, DOOR], east: [FLOOR, WALL, DOOR], south: [FLOOR, WALL, DOOR], west: [FLOOR, WALL, DOOR] },
    [WALL]:  { north: [FLOOR, WALL, WATER], east: [FLOOR, WALL, WATER], south: [FLOOR, WALL, WATER], west: [FLOOR, WALL, WATER] },
    [DOOR]:  { north: [FLOOR], east: [FLOOR], south: [FLOOR], west: [FLOOR] },
    [WATER]: { north: [FLOOR, WATER], east: [FLOOR, WATER], south: [FLOOR, WATER], west: [FLOOR, WATER] },
  },
  weights: {
    [FLOOR]: 10,  // More common
    [WALL]: 3,
    [DOOR]: 1,    // Rare
    [WATER]: 2,
  },
};
```

Each tile's adjacency rule specifies which tile IDs are valid neighbors in each cardinal direction. Higher weights make tiles more likely to be chosen during collapse.

### Generating a Level

```typescript
const result = generate({
  tileset,
  width: 20,
  height: 15,
  seed: 42,             // Deterministic via PRNG seed
  constraints: [
    reachability((id) => id === FLOOR || id === DOOR),  // Walkable tiles must be connected
    exactCount(DOOR, 2),                                 // Exactly 2 door tiles
    border(WALL),                                        // Walls around the border
  ],
  maxRetries: 100,      // Retry on contradiction or constraint failure (default: 100)
  maxBacktracks: 1000,  // Max backtrack steps per WFC run (default: 1000)
});

if (result.success && result.grid) {
  // result.grid.tiles is a 2D array: number[][] (tile IDs), accessed as tiles[y][x]
  for (let y = 0; y < result.grid.height; y++) {
    for (let x = 0; x < result.grid.width; x++) {
      setTile(tilemapId, x, y, result.grid.tiles[y][x]);
    }
  }
  console.log(`Generated in ${result.retries} retries, ${result.elapsed}ms`);
}
```

### Constraints

Constraints validate a generated grid and reject invalid ones:

| Constraint | Description |
|---|---|
| `reachability(predicate)` | All cells matching `(tileId) => boolean` must be flood-fill connected |
| `exactCount(tileId, n)` | Exactly `n` cells must contain this tile |
| `minCount(tileId, n)` | At least `n` cells must contain this tile |
| `maxCount(tileId, n)` | At most `n` cells may contain this tile |
| `border(tileId)` | All border cells must be this tile |
| `custom(fn)` | Arbitrary validation function `(grid: WFCGrid) => boolean` |

Additional helpers:
- `countTile(grid, tileId)` - Count occurrences of a tile
- `findTile(grid, tileId)` - Get all `{x, y}` positions of a tile

### Batch Generation and Testing

For quality assurance, use `generateAndTest()` to batch-generate levels and run a test function on each:

```typescript
import { generateAndTest, reachability, minCount, findTile } from "@arcane/runtime/procgen";

const result = generateAndTest({
  wfc: {
    tileset,
    width: 30,
    height: 20,
    seed: 123,
    constraints: [reachability((id) => id === FLOOR), minCount(DOOR, 3)],
  },
  iterations: 100,    // Generate 100 levels
  testFn: (grid) => {
    // Custom test: exactly one entrance
    const entrances = findTile(grid, ENTRANCE);
    return entrances.length === 1;
  },
});

console.log(`${result.passed}/${result.total} levels passed`);
// result.failed = passed test function but failed
// result.generationFailures = WFC contradiction or constraint failure
```

### Validation

You can also validate a hand-authored or modified grid:

```typescript
import { validateLevel, reachability, exactCount } from "@arcane/runtime/procgen";

const isValid = validateLevel(myGrid, [
  reachability((id) => id !== WALL),
  exactCount(ENTRANCE, 1),
]);
```

Procedural and hand-authored content use the same grid format. You can generate a dungeon, then hand-tweak specific cells, then re-validate.

## Testing Worlds

Worlds are data, so they're testable. Arcane provides three testing strategies:

### Unit Tests with the Test Harness

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import { generate, reachability } from "@arcane/runtime/procgen";

describe("dungeon generation", () => {
  it("all floor tiles are connected", () => {
    const result = generate({
      tileset,
      width: 20,
      height: 15,
      seed: 42,
      constraints: [reachability((id) => id === FLOOR)],
    });
    assert.ok(result.success);
  });
});
```

### Replay Testing — Record and Replay Game Sessions

Record a sequence of inputs and replay them to verify determinism:

```typescript
import { startRecording, stopRecording, replay, diffReplays } from "@arcane/runtime/testing";

// Record a gameplay session
const recording = startRecording();
recording.addFrame({ keys: ["ArrowRight"] });
recording.addFrame({ keys: ["ArrowRight", "Space"] });
const session = stopRecording(recording);

// Replay and verify deterministic outcome
const result1 = replay(session, myGameStepFn, initialState);
const result2 = replay(session, myGameStepFn, initialState);

// Compare — should be identical (deterministic)
const diff = diffReplays(result1, result2);
assert.equal(diff.divergenceFrame, -1); // -1 = no divergence
```

### Property-Based Testing — Test Invariants Across Random Inputs

Verify that game invariants hold across many random input sequences:

```typescript
import { checkProperty, assertProperty, randomKeys } from "@arcane/runtime/testing";

// Test: player HP never goes below 0, no matter what buttons are pressed
assertProperty({
  generator: randomKeys(100),  // 100 random key sequences
  runs: 50,                    // Test 50 different sequences
  property: (inputs) => {
    let state = initialState;
    for (const frame of inputs) {
      state = gameStep(state, frame);
      if (state.player.hp < 0) return false;  // Invariant violated
    }
    return true;
  },
});
// On failure: automatically shrinks to minimal failing input sequence
```
