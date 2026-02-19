# Procedural Generation

## Wave Function Collapse

Generate tile-based levels with adjacency and structural constraints.

```typescript
import { generate } from "@arcane/runtime/procgen";
import { reachability, border, minCount, maxCount, exactCount } from "@arcane/runtime/procgen";

// Tile IDs (numeric)
const FLOOR = 0, WALL = 1, DOOR = 2, CHEST = 3;

const result = generate({
  tileset: {
    tiles: {
      [FLOOR]: { north: [FLOOR, DOOR, WALL, CHEST], east: [FLOOR, DOOR, WALL, CHEST], south: [FLOOR, DOOR, WALL, CHEST], west: [FLOOR, DOOR, WALL, CHEST] },
      [WALL]:  { north: [WALL, FLOOR, DOOR], east: [WALL, FLOOR, DOOR], south: [WALL, FLOOR, DOOR], west: [WALL, FLOOR, DOOR] },
      [DOOR]:  { north: [FLOOR], east: [FLOOR], south: [FLOOR], west: [FLOOR] },
      [CHEST]: { north: [FLOOR, WALL], east: [FLOOR, WALL], south: [FLOOR, WALL], west: [FLOOR, WALL] },
    },
  },
  width: 30,
  height: 20,
  constraints: [
    border(WALL),
    reachability((tileId) => tileId !== WALL),  // all non-wall tiles must be connected
    minCount(DOOR, 2),
    maxCount(CHEST, 5),
  ],
  seed: 42,
  maxRetries: 100,
});

if (result.success && result.grid) {
  for (let y = 0; y < result.grid.height; y++) {
    for (let x = 0; x < result.grid.width; x++) {
      const tileId = result.grid.tiles[y][x];
    }
  }
}
```

## Constraints

- `border(tile)` -- edges are always the given tile
- `reachability(walkableFn)` -- all cells matching predicate must be connected via flood fill
- `minCount(tile, n)` -- at least n instances
- `maxCount(tile, n)` -- at most n instances
- `exactCount(tile, n)` -- exactly n instances

## Validation

Run gameplay-specific checks after generation:

```typescript
import { validateLevel, generateAndTest } from "@arcane/runtime/procgen";

// validateLevel checks constraints against a generated grid
const valid = validateLevel(result.grid!, [
  (grid) => {
    let doors = 0;
    for (const row of grid.tiles) for (const t of row) if (t === DOOR) doors++;
    return doors >= 2;
  },
]);

// generateAndTest runs multiple generations and tests each one
const testResult = generateAndTest({
  wfc: { tileset: { tiles: { /* ... */ } }, width: 30, height: 20, seed: 42 },
  iterations: 50,
  testFn: (grid) => { /* return true if level passes */ return true; },
});
// testResult.passed, testResult.failed, testResult.generationFailures
```
