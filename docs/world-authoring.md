# World Authoring

## Code-Defined Scenes

Arcane has no visual scene editor. No `.tscn` files. No drag-and-drop. Scenes are TypeScript code:

```typescript
export const DungeonRoom = scene({
  root: TileMap({ size: [60, 40], tileset: 'dungeon' }),
  children: {
    player: Player({ position: [5, 5] }),
    camera: FollowCamera({ target: 'player', lookahead: 2.0 }),
    fog: FogOfWar({ radius: 8 }),
    ui: layer({
      hud: CharacterHUD(),
      combat: CombatOverlay({ visible: false }),
      pause: PauseMenu({ visible: false }),
    }),
  },
})
```

Scenes are data. They're composable, testable, and version-controllable. Diffs are meaningful. An agent can read, write, and reason about scenes without a visual editor.

## Room / World / Dungeon Specs

Worlds are hierarchical data structures — rooms connected by doors, corridors, and transitions:

```typescript
const CryptOfTheGoblinKing = world({
  name: 'Crypt of the Goblin King',

  rooms: {
    entrance: room({
      size: [20, 15],
      description: 'A crumbling stone entrance, torches flickering.',
      tiles: {
        floor: 'stone_cracked',
        walls: 'dungeon_brick',
        features: [
          door('north', { locked: false, connects: 'hallway' }),
          interactable('torch_1', { position: [2, 1], type: 'torch' }),
        ],
      },
      spawns: [
        encounter('goblin_patrol', {
          enemies: [monster('goblin', 2)],
          trigger: 'on_enter',
        }),
      ],
    }),

    hallway: room({
      size: [30, 8],
      connections: { south: 'entrance', north: 'throne_room', east: 'treasury' },
      spawns: [
        encounter('trap', { type: 'pit_trap', position: [15, 4], dc: 14 }),
      ],
    }),

    throne_room: room({
      size: [25, 25],
      spawns: [
        encounter('boss', {
          enemies: [monster('goblin_king', 1), monster('goblin_guard', 4)],
          trigger: 'on_enter',
          dialogue: 'goblin_king_intro',
        }),
      ],
    }),
  },

  progression: sequence([
    'Clear the entrance',
    'Navigate the hallway (avoid or disarm trap)',
    'Defeat the Goblin King',
  ]),
})
```

## Tilemap Authoring

### Code-Based

```typescript
const entrance = tilemap({
  size: [20, 15],
  layers: {
    ground: fill('stone_floor'),
    walls: border('dungeon_wall', { thickness: 1 }),
    objects: place([
      { tile: 'door_north', position: [10, 0] },
      { tile: 'torch', position: [2, 1] },
      { tile: 'torch', position: [18, 1] },
    ]),
  },
})
```

### ASCII Text Format

For quick prototyping, tilemaps can be defined as ASCII:

```typescript
const entrance = tilemapFromAscii(`
  ###########
  #.........#
  #...M.....#
  #.........#
  #....@....#
  #.........#
  ###D#######
`, {
  '#': 'wall',
  '.': 'floor',
  'M': 'monster_spawn',
  '@': 'player_spawn',
  'D': 'door',
})
```

This format is ideal for AI agents — they can "draw" maps in text, reason about spatial layout, and iterate quickly.

### Tile Legend

Games define their own ASCII legend:

```typescript
const legend = tileLegend({
  '#': { tile: 'wall', collision: true },
  '.': { tile: 'floor' },
  '~': { tile: 'water', properties: { swimmable: true, speed: 0.5 } },
  'T': { tile: 'tree', collision: true, layer: 'objects' },
  'D': { tile: 'door', interactable: true },
  'C': { tile: 'chest', interactable: true, loot: 'random' },
  'M': { spawn: 'monster', remove_tile: true },
  '@': { spawn: 'player', remove_tile: true },
})
```

## Entity Placement

Entities are placed in rooms as part of the room definition:

```typescript
const room = room({
  size: [20, 15],
  entities: [
    npc('merchant', {
      position: [10, 5],
      dialogue: 'merchant_greeting',
      inventory: shopInventory('weapons'),
    }),
    chest({
      position: [15, 12],
      locked: true,
      lockDC: 15,
      loot: [item('potion_of_healing', 2), gold(50)],
    }),
    sign({
      position: [5, 7],
      text: 'Beware: goblins ahead.',
    }),
  ],
})
```

## Encounter Definitions

Encounters are data, not code:

```typescript
const goblinAmbush = encounter({
  name: 'Goblin Ambush',
  trigger: 'on_enter',
  enemies: [
    monster('goblin_archer', { count: 2, position: 'flanking' }),
    monster('goblin_warrior', { count: 1, position: 'blocking' }),
  ],
  conditions: {
    surprise: { check: 'perception', dc: 14 },
    avoidable: { check: 'stealth', dc: 12 },
  },
  rewards: {
    xp: 150,
    loot: randomLoot('goblin_standard', { rolls: 3 }),
  },
})
```

## Procedural Generation (Wave Function Collapse)

Arcane provides a Wave Function Collapse (WFC) algorithm for tile-based level generation. WFC takes a tileset with adjacency rules and collapses a grid of possibilities into a valid layout.

### Defining a Tileset

A tileset declares which tiles can be neighbors in each direction:

```typescript
import { generate, reachability, exactCount, border } from "@arcane/runtime/procgen";

const tileset = {
  // tile ID → adjacency rules
  0: { name: "floor", weight: 10, north: [0, 1, 2], east: [0, 1, 2], south: [0, 1, 2], west: [0, 1, 2] },
  1: { name: "wall",  weight: 3,  north: [0, 1, 3], east: [0, 1, 3], south: [0, 1, 3], west: [0, 1, 3] },
  2: { name: "door",  weight: 1,  north: [0], east: [0], south: [0], west: [0] },
  3: { name: "water", weight: 2,  north: [0, 3], east: [0, 3], south: [0, 3], west: [0, 3] },
};
```

Each tile has a `weight` (higher = more likely to be placed) and four adjacency lists specifying which tile IDs are valid neighbors.

### Generating a Level

```typescript
const result = generate({
  tileset,
  width: 20,
  height: 15,
  seed: 42,             // Deterministic via PRNG seed
  constraints: [
    reachability(0),     // All floor tiles must be connected
    exactCount(2, 2),    // Exactly 2 door tiles
    border(1),           // Walls around the border
  ],
});

if (result.success) {
  // result.grid is a 2D array: number[][] (tile IDs)
  for (let y = 0; y < result.grid.length; y++) {
    for (let x = 0; x < result.grid[y].length; x++) {
      setTile(tilemapId, x, y, result.grid[y][x]);
    }
  }
}
```

### Constraints

Constraints validate a generated grid and reject invalid ones:

| Constraint | Description |
|---|---|
| `reachability(tileId)` | All cells with this tile ID must be flood-fill connected |
| `exactCount(tileId, n)` | Exactly `n` cells must contain this tile |
| `minCount(tileId, n)` | At least `n` cells must contain this tile |
| `maxCount(tileId, n)` | At most `n` cells may contain this tile |
| `border(tileId)` | All border cells must be this tile |
| `custom(fn)` | Arbitrary validation function `(grid) => boolean` |

### Generate-and-Test

For constraint-heavy generation, use `generateAndTest()` which retries until constraints pass:

```typescript
import { generateAndTest, reachability, minCount } from "@arcane/runtime/procgen";

const result = generateAndTest({
  tileset,
  width: 30,
  height: 20,
  seed: 123,
  constraints: [reachability(0), minCount(2, 3)],
  maxAttempts: 50,    // Retry up to 50 times
});

if (result.success) {
  // result.grid is valid, result.attempts shows how many tries it took
}
```

### Validation

You can also validate a hand-authored or modified grid:

```typescript
import { validateLevel, reachability } from "@arcane/runtime/procgen";

const isValid = validateLevel(myGrid, [reachability(0)]);
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
    const result = generate({ tileset, width: 20, height: 15, seed: 42,
      constraints: [reachability(0)] });
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
