# Procedural Generation

## Wave Function Collapse

Generate tile-based levels with adjacency and structural constraints.

```typescript
import { generateWFC } from "@arcane/runtime/procgen";
import { reachability, border, minCount, maxCount, exactCount } from "@arcane/runtime/procgen";

const FLOOR = "floor", WALL = "wall", DOOR = "door", CHEST = "chest";

const result = generateWFC({
  width: 30,
  height: 20,
  tiles: [FLOOR, WALL, DOOR, CHEST],
  adjacency: [
    { tile: FLOOR, neighbors: { north: [FLOOR, DOOR, WALL, CHEST], east: [FLOOR, DOOR, WALL, CHEST], south: [FLOOR, DOOR, WALL, CHEST], west: [FLOOR, DOOR, WALL, CHEST] } },
    { tile: WALL,  neighbors: { north: [WALL, FLOOR, DOOR], east: [WALL, FLOOR, DOOR], south: [WALL, FLOOR, DOOR], west: [WALL, FLOOR, DOOR] } },
    { tile: DOOR,  neighbors: { north: [FLOOR], east: [FLOOR], south: [FLOOR], west: [FLOOR] } },
    { tile: CHEST, neighbors: { north: [FLOOR, WALL], east: [FLOOR, WALL], south: [FLOOR, WALL], west: [FLOOR, WALL] } },
  ],
  constraints: [
    border(WALL),
    reachability(FLOOR, DOOR, CHEST),
    minCount(DOOR, 2),
    maxCount(CHEST, 5),
  ],
  seed: 42,
  maxAttempts: 100,
});

if (result.success) {
  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      const tile = result.grid[y][x];
    }
  }
}
```

## Constraints

- `border(tile)` -- edges are always the given tile
- `reachability(...tiles)` -- all instances of given tiles must be connected
- `minCount(tile, n)` -- at least n instances
- `maxCount(tile, n)` -- at most n instances
- `exactCount(tile, n)` -- exactly n instances

## Validation

Run gameplay-specific checks after generation:

```typescript
import { validateLevel, generateAndTest } from "@arcane/runtime/procgen";

const valid = validateLevel(result, [
  (grid) => grid.flat().filter(t => t === DOOR).length >= 2,
  (grid) => { /* check path from entrance to exit */ return true; },
]);

// Keep generating until validation passes
const goodLevel = generateAndTest(wfcOptions, validators, { maxRetries: 50 });
```
