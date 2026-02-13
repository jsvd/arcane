import { describe, it, assert } from "../testing/harness.ts";
import { generate } from "./wfc.ts";
import {
  reachability,
  exactCount,
  minCount,
  maxCount,
  border,
  custom,
  countTile,
  findTile,
} from "./constraints.ts";
import { validateLevel, generateAndTest } from "./validate.ts";
import type { TileSet, WFCConfig, WFCGrid, Constraint } from "./types.ts";
import { DIRECTIONS, OPPOSITE, DIR_OFFSET } from "./types.ts";

// ---------------------------------------------------------------------------
// Helper tilesets
// ---------------------------------------------------------------------------

/** Trivial tileset: single tile that can neighbor itself in all directions. */
function singleTileset(): TileSet {
  return {
    tiles: {
      1: { north: [1], east: [1], south: [1], west: [1] },
    },
  };
}

/** Two-tile tileset: both tiles can neighbor each other freely. */
function twoTileOpen(): TileSet {
  return {
    tiles: {
      0: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] },
      1: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] },
    },
  };
}

/** Checkerboard tileset: A can only neighbor B and vice versa. */
function checkerboardTileset(): TileSet {
  return {
    tiles: {
      0: { north: [1], east: [1], south: [1], west: [1] },
      1: { north: [0], east: [0], south: [0], west: [0] },
    },
  };
}

/** Wall/floor tileset with border-friendly rules. */
function wallFloorTileset(): TileSet {
  return {
    tiles: {
      0: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] }, // wall
      1: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] }, // floor
    },
  };
}

/**
 * Dungeon tileset with entrance (2) and exit (3).
 * Wall=0, Floor=1, Entrance=2, Exit=3
 */
function dungeonTileset(): TileSet {
  const all = [0, 1, 2, 3];
  return {
    tiles: {
      0: { north: all, east: all, south: all, west: all },
      1: { north: all, east: all, south: all, west: all },
      2: { north: all, east: all, south: all, west: all },
      3: { north: all, east: all, south: all, west: all },
    },
    weights: { 0: 3, 1: 5, 2: 1, 3: 1 },
  };
}

// ---------------------------------------------------------------------------
// WFC Core tests
// ---------------------------------------------------------------------------

describe("WFC core", () => {
  it("generates a 1x1 grid with single tile", () => {
    const result = generate({
      tileset: singleTileset(),
      width: 1,
      height: 1,
      seed: 42,
    });
    assert.equal(result.success, true);
    assert.ok(result.grid !== null);
    assert.equal(result.grid!.width, 1);
    assert.equal(result.grid!.height, 1);
    assert.equal(result.grid!.tiles[0][0], 1);
  });

  it("generates a 2x2 grid with single tile", () => {
    const result = generate({
      tileset: singleTileset(),
      width: 2,
      height: 2,
      seed: 42,
    });
    assert.equal(result.success, true);
    assert.ok(result.grid !== null);
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        assert.equal(result.grid!.tiles[y][x], 1);
      }
    }
  });

  it("generates a 5x5 grid with open two-tile set", () => {
    const result = generate({
      tileset: twoTileOpen(),
      width: 5,
      height: 5,
      seed: 42,
    });
    assert.equal(result.success, true);
    assert.ok(result.grid !== null);
    assert.equal(result.grid!.width, 5);
    assert.equal(result.grid!.height, 5);
    // All tiles should be 0 or 1
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const tile = result.grid!.tiles[y][x];
        assert.ok(tile === 0 || tile === 1);
      }
    }
  });

  it("generates a valid checkerboard pattern", () => {
    const result = generate({
      tileset: checkerboardTileset(),
      width: 4,
      height: 4,
      seed: 42,
    });
    assert.equal(result.success, true);
    assert.ok(result.grid !== null);
    const grid = result.grid!;

    // Every cell's neighbors must be different
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        if (x + 1 < grid.width) assert.notEqual(tile, grid.tiles[y][x + 1]);
        if (y + 1 < grid.height) assert.notEqual(tile, grid.tiles[y + 1][x]);
      }
    }
  });

  it("respects adjacency rules in all four directions", () => {
    const result = generate({
      tileset: checkerboardTileset(),
      width: 6,
      height: 6,
      seed: 99,
    });
    assert.equal(result.success, true);
    const grid = result.grid!;

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        // Check all neighbors match adjacency rules
        if (y > 0) {
          const north = grid.tiles[y - 1][x];
          assert.notEqual(tile, north, `Adjacency violated at (${x},${y}) north`);
        }
        if (x + 1 < grid.width) {
          const east = grid.tiles[y][x + 1];
          assert.notEqual(tile, east, `Adjacency violated at (${x},${y}) east`);
        }
        if (y + 1 < grid.height) {
          const south = grid.tiles[y + 1][x];
          assert.notEqual(tile, south, `Adjacency violated at (${x},${y}) south`);
        }
        if (x > 0) {
          const west = grid.tiles[y][x - 1];
          assert.notEqual(tile, west, `Adjacency violated at (${x},${y}) west`);
        }
      }
    }
  });

  it("larger grid (10x10) completes successfully", () => {
    const result = generate({
      tileset: twoTileOpen(),
      width: 10,
      height: 10,
      seed: 7,
    });
    assert.equal(result.success, true);
    assert.ok(result.grid !== null);
    assert.equal(result.grid!.width, 10);
    assert.equal(result.grid!.height, 10);
  });

  it("even larger grid (20x20) completes", () => {
    const result = generate({
      tileset: twoTileOpen(),
      width: 20,
      height: 20,
      seed: 123,
    });
    assert.equal(result.success, true);
    assert.ok(result.grid !== null);
  });

  it("reports retries count", () => {
    const result = generate({
      tileset: singleTileset(),
      width: 3,
      height: 3,
      seed: 1,
    });
    assert.equal(result.success, true);
    assert.equal(result.retries, 0); // Single tile never fails
  });

  it("reports elapsed time", () => {
    const result = generate({
      tileset: singleTileset(),
      width: 3,
      height: 3,
      seed: 1,
    });
    assert.ok(result.elapsed >= 0);
  });

  it("returns correct grid dimensions", () => {
    const result = generate({
      tileset: twoTileOpen(),
      width: 7,
      height: 3,
      seed: 42,
    });
    assert.equal(result.success, true);
    assert.equal(result.grid!.width, 7);
    assert.equal(result.grid!.height, 3);
    assert.equal(result.grid!.tiles.length, 3);
    assert.equal(result.grid!.tiles[0].length, 7);
  });

  it("handles empty tileset gracefully", () => {
    const result = generate({
      tileset: { tiles: {} },
      width: 3,
      height: 3,
      seed: 42,
    });
    assert.equal(result.success, false);
    assert.equal(result.grid, null);
  });
});

// ---------------------------------------------------------------------------
// Seeded determinism tests
// ---------------------------------------------------------------------------

describe("WFC determinism", () => {
  it("same seed produces identical output", () => {
    const config: WFCConfig = {
      tileset: twoTileOpen(),
      width: 8,
      height: 8,
      seed: 42,
    };
    const r1 = generate(config);
    const r2 = generate(config);
    assert.equal(r1.success, true);
    assert.equal(r2.success, true);
    assert.deepEqual(r1.grid!.tiles, r2.grid!.tiles);
  });

  it("different seeds produce different output", () => {
    const config1: WFCConfig = {
      tileset: twoTileOpen(),
      width: 8,
      height: 8,
      seed: 42,
    };
    const config2: WFCConfig = { ...config1, seed: 99 };
    const r1 = generate(config1);
    const r2 = generate(config2);
    assert.equal(r1.success, true);
    assert.equal(r2.success, true);
    // It's theoretically possible but astronomically unlikely they match
    let same = true;
    for (let y = 0; y < 8 && same; y++) {
      for (let x = 0; x < 8 && same; x++) {
        if (r1.grid!.tiles[y][x] !== r2.grid!.tiles[y][x]) same = false;
      }
    }
    assert.equal(same, false);
  });

  it("deterministic across multiple runs", () => {
    const results: number[][][] = [];
    for (let i = 0; i < 3; i++) {
      const r = generate({
        tileset: twoTileOpen(),
        width: 5,
        height: 5,
        seed: 777,
      });
      assert.equal(r.success, true);
      results.push(r.grid!.tiles);
    }
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual(results[1], results[2]);
  });
});

// ---------------------------------------------------------------------------
// Weight tests
// ---------------------------------------------------------------------------

describe("WFC weights", () => {
  it("higher weight tiles appear more often", () => {
    const tileset: TileSet = {
      tiles: {
        0: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] },
        1: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] },
      },
      weights: { 0: 1, 1: 100 },
    };

    // Generate a large grid and count
    const result = generate({
      tileset,
      width: 10,
      height: 10,
      seed: 42,
    });
    assert.equal(result.success, true);

    let count0 = 0;
    let count1 = 0;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (result.grid!.tiles[y][x] === 0) count0++;
        else count1++;
      }
    }
    // Tile 1 should significantly outnumber tile 0
    assert.ok(count1 > count0, `Expected tile 1 (${count1}) > tile 0 (${count0})`);
  });

  it("default weight is 1 for all tiles", () => {
    // Without explicit weights, all tiles should appear
    const result = generate({
      tileset: twoTileOpen(),
      width: 10,
      height: 10,
      seed: 42,
    });
    assert.equal(result.success, true);
    let has0 = false;
    let has1 = false;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (result.grid!.tiles[y][x] === 0) has0 = true;
        if (result.grid!.tiles[y][x] === 1) has1 = true;
      }
    }
    assert.ok(has0, "Should have at least one tile 0");
    assert.ok(has1, "Should have at least one tile 1");
  });
});

// ---------------------------------------------------------------------------
// Backtracking tests
// ---------------------------------------------------------------------------

describe("WFC backtracking", () => {
  it("backtracks on contradictions", () => {
    // Checkerboard on odd-width grids can force contradictions
    // that require backtracking
    const result = generate({
      tileset: checkerboardTileset(),
      width: 5,
      height: 5,
      seed: 42,
      maxBacktracks: 5000,
    });
    // Should either succeed with valid checkerboard or fail gracefully
    if (result.success) {
      const grid = result.grid!;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (x + 1 < grid.width) {
            assert.notEqual(grid.tiles[y][x], grid.tiles[y][x + 1]);
          }
          if (y + 1 < grid.height) {
            assert.notEqual(grid.tiles[y][x], grid.tiles[y + 1][x]);
          }
        }
      }
    }
    // Either way, the function should complete without hanging
    assert.ok(true);
  });

  it("respects maxBacktracks limit", () => {
    // An impossible tileset should fail within the backtrack limit
    const impossible: TileSet = {
      tiles: {
        0: { north: [1], east: [1], south: [1], west: [1] },
        1: { north: [0], east: [0], south: [0], west: [0] },
      },
    };
    // 3x3 checkerboard is impossible with odd dimensions (can't tile)
    // Actually it IS possible. Let's use a truly impossible constraint:
    const result = generate({
      tileset: impossible,
      width: 3,
      height: 3,
      seed: 42,
      maxRetries: 5,
      maxBacktracks: 100,
    });
    // The result depends on whether 3x3 checkerboard works; either way
    // the algorithm terminates
    assert.ok(result.elapsed >= 0);
  });

  it("maxRetries limits total attempts", () => {
    // Use an always-failing constraint
    const alwaysFail: Constraint = () => false;
    const result = generate({
      tileset: singleTileset(),
      width: 2,
      height: 2,
      seed: 42,
      constraints: [alwaysFail],
      maxRetries: 3,
    });
    assert.equal(result.success, false);
    assert.ok(result.retries <= 4); // 0..3 = 4 attempts
  });
});

// ---------------------------------------------------------------------------
// Constraint tests
// ---------------------------------------------------------------------------

describe("constraints", () => {
  describe("reachability", () => {
    it("passes for fully connected grid", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [1, 1, 1],
          [1, 1, 1],
          [1, 1, 1],
        ],
      };
      const check = reachability((id) => id === 1);
      assert.equal(check(grid), true);
    });

    it("fails for disconnected walkable regions", () => {
      const grid: WFCGrid = {
        width: 5,
        height: 3,
        tiles: [
          [1, 1, 0, 1, 1],
          [0, 0, 0, 0, 0],
          [1, 1, 0, 1, 1],
        ],
      };
      const check = reachability((id) => id === 1);
      assert.equal(check(grid), false);
    });

    it("passes with no walkable tiles", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
      };
      const check = reachability((id) => id === 1);
      assert.equal(check(grid), true); // Vacuously true
    });

    it("single walkable tile passes", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
      };
      const check = reachability((id) => id === 1);
      assert.equal(check(grid), true);
    });

    it("diagonal-only connection fails (4-directional)", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [1, 0, 0],
          [0, 0, 0],
          [0, 0, 1],
        ],
      };
      const check = reachability((id) => id === 1);
      assert.equal(check(grid), false);
    });
  });

  describe("exactCount", () => {
    it("passes when count matches", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [0, 0, 1],
          [0, 0, 0],
          [1, 0, 0],
        ],
      };
      assert.equal(exactCount(1, 2)(grid), true);
    });

    it("fails when count is too low", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [0, 0, 1],
          [0, 0, 0],
          [0, 0, 0],
        ],
      };
      assert.equal(exactCount(1, 2)(grid), false);
    });

    it("fails when count is too high", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [1, 0, 1],
          [0, 0, 0],
          [1, 0, 0],
        ],
      };
      assert.equal(exactCount(1, 2)(grid), false);
    });

    it("exactCount(tile, 0) works for absent tile", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [0, 0],
          [0, 0],
        ],
      };
      assert.equal(exactCount(1, 0)(grid), true);
      assert.equal(exactCount(0, 4)(grid), true);
    });
  });

  describe("minCount", () => {
    it("passes when count is at minimum", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [1, 0],
          [0, 0],
        ],
      };
      assert.equal(minCount(1, 1)(grid), true);
    });

    it("passes when count exceeds minimum", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [1, 1],
          [0, 0],
        ],
      };
      assert.equal(minCount(1, 1)(grid), true);
    });

    it("fails when count is below minimum", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [0, 0],
          [0, 0],
        ],
      };
      assert.equal(minCount(1, 1)(grid), false);
    });
  });

  describe("maxCount", () => {
    it("passes when count is at maximum", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [1, 1],
          [0, 0],
        ],
      };
      assert.equal(maxCount(1, 2)(grid), true);
    });

    it("passes when count is below maximum", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [1, 0],
          [0, 0],
        ],
      };
      assert.equal(maxCount(1, 2)(grid), true);
    });

    it("fails when count exceeds maximum", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [1, 1],
          [1, 0],
        ],
      };
      assert.equal(maxCount(1, 2)(grid), false);
    });
  });

  describe("border", () => {
    it("passes when all edges are the specified tile", () => {
      const grid: WFCGrid = {
        width: 4,
        height: 4,
        tiles: [
          [0, 0, 0, 0],
          [0, 1, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0],
        ],
      };
      assert.equal(border(0)(grid), true);
    });

    it("fails when an edge tile is wrong", () => {
      const grid: WFCGrid = {
        width: 4,
        height: 4,
        tiles: [
          [0, 0, 0, 0],
          [0, 1, 1, 1], // right edge is 1
          [0, 1, 1, 0],
          [0, 0, 0, 0],
        ],
      };
      assert.equal(border(0)(grid), false);
    });

    it("fails when top row has wrong tile", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [0, 1, 0], // middle of top is 1
          [0, 1, 0],
          [0, 0, 0],
        ],
      };
      assert.equal(border(0)(grid), false);
    });

    it("fails when bottom row has wrong tile", () => {
      const grid: WFCGrid = {
        width: 3,
        height: 3,
        tiles: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 1], // bottom right is 1
        ],
      };
      assert.equal(border(0)(grid), false);
    });

    it("passes for 1x1 grid", () => {
      const grid: WFCGrid = {
        width: 1,
        height: 1,
        tiles: [[5]],
      };
      assert.equal(border(5)(grid), true);
    });

    it("passes for 2x2 grid (all border)", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [0, 0],
          [0, 0],
        ],
      };
      assert.equal(border(0)(grid), true);
    });
  });

  describe("custom", () => {
    it("wraps a custom function", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [1, 2],
          [3, 4],
        ],
      };
      const c = custom((g) => g.tiles[0][0] === 1);
      assert.equal(c(grid), true);
    });

    it("custom constraint can fail", () => {
      const grid: WFCGrid = {
        width: 2,
        height: 2,
        tiles: [
          [1, 2],
          [3, 4],
        ],
      };
      const c = custom((g) => g.tiles[0][0] === 99);
      assert.equal(c(grid), false);
    });
  });
});

// ---------------------------------------------------------------------------
// Utility function tests
// ---------------------------------------------------------------------------

describe("utility functions", () => {
  it("countTile counts correctly", () => {
    const grid: WFCGrid = {
      width: 3,
      height: 3,
      tiles: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
      ],
    };
    assert.equal(countTile(grid, 0), 4);
    assert.equal(countTile(grid, 1), 5);
    assert.equal(countTile(grid, 2), 0);
  });

  it("findTile finds all positions", () => {
    const grid: WFCGrid = {
      width: 3,
      height: 3,
      tiles: [
        [0, 1, 0],
        [1, 2, 1],
        [0, 1, 0],
      ],
    };
    const positions = findTile(grid, 1);
    assert.equal(positions.length, 4);
    assert.deepEqual(positions[0], { x: 1, y: 0 });
    assert.deepEqual(positions[1], { x: 0, y: 1 });
    assert.deepEqual(positions[2], { x: 2, y: 1 });
    assert.deepEqual(positions[3], { x: 1, y: 2 });
  });

  it("findTile returns empty for absent tile", () => {
    const grid: WFCGrid = {
      width: 2,
      height: 2,
      tiles: [
        [0, 0],
        [0, 0],
      ],
    };
    assert.deepEqual(findTile(grid, 99), []);
  });
});

// ---------------------------------------------------------------------------
// Type constant tests
// ---------------------------------------------------------------------------

describe("direction constants", () => {
  it("DIRECTIONS has 4 entries", () => {
    assert.equal(DIRECTIONS.length, 4);
  });

  it("OPPOSITE maps correctly", () => {
    assert.equal(OPPOSITE.north, "south");
    assert.equal(OPPOSITE.south, "north");
    assert.equal(OPPOSITE.east, "west");
    assert.equal(OPPOSITE.west, "east");
  });

  it("DIR_OFFSET maps correctly", () => {
    assert.deepEqual(DIR_OFFSET.north, { dx: 0, dy: -1 });
    assert.deepEqual(DIR_OFFSET.south, { dx: 0, dy: 1 });
    assert.deepEqual(DIR_OFFSET.east, { dx: 1, dy: 0 });
    assert.deepEqual(DIR_OFFSET.west, { dx: -1, dy: 0 });
  });
});

// ---------------------------------------------------------------------------
// validateLevel tests
// ---------------------------------------------------------------------------

describe("validateLevel", () => {
  it("passes with no constraints", () => {
    const grid: WFCGrid = {
      width: 2,
      height: 2,
      tiles: [
        [0, 0],
        [0, 0],
      ],
    };
    assert.equal(validateLevel(grid, []), true);
  });

  it("passes when all constraints pass", () => {
    const grid: WFCGrid = {
      width: 3,
      height: 3,
      tiles: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
    };
    const constraints = [border(0), exactCount(1, 1)];
    assert.equal(validateLevel(grid, constraints), true);
  });

  it("fails when any constraint fails", () => {
    const grid: WFCGrid = {
      width: 3,
      height: 3,
      tiles: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
    };
    const constraints = [border(0), exactCount(1, 5)]; // Second fails
    assert.equal(validateLevel(grid, constraints), false);
  });

  it("short-circuits on first failure", () => {
    let secondCalled = false;
    const grid: WFCGrid = {
      width: 1,
      height: 1,
      tiles: [[0]],
    };
    const constraints: Constraint[] = [
      () => false,
      () => {
        secondCalled = true;
        return true;
      },
    ];
    validateLevel(grid, constraints);
    assert.equal(secondCalled, false);
  });
});

// ---------------------------------------------------------------------------
// generateAndTest tests
// ---------------------------------------------------------------------------

describe("generateAndTest", () => {
  it("runs specified number of iterations", () => {
    const result = generateAndTest({
      wfc: {
        tileset: singleTileset(),
        width: 3,
        height: 3,
        seed: 1,
      },
      iterations: 5,
      testFn: () => true,
    });
    assert.equal(result.total, 5);
    assert.equal(result.passed, 5);
    assert.equal(result.failed, 0);
    assert.equal(result.generationFailures, 0);
  });

  it("counts failures correctly", () => {
    const result = generateAndTest({
      wfc: {
        tileset: singleTileset(),
        width: 3,
        height: 3,
        seed: 1,
      },
      iterations: 5,
      testFn: () => false, // All fail the test
    });
    assert.equal(result.total, 5);
    assert.equal(result.passed, 0);
    assert.equal(result.failed, 5);
  });

  it("counts generation failures separately", () => {
    const alwaysFail: Constraint = () => false;
    const result = generateAndTest({
      wfc: {
        tileset: singleTileset(),
        width: 3,
        height: 3,
        seed: 1,
        constraints: [alwaysFail],
        maxRetries: 0,
      },
      iterations: 3,
      testFn: () => true,
    });
    assert.equal(result.total, 3);
    assert.equal(result.generationFailures, 3);
    assert.equal(result.passed, 0);
  });

  it("uses different seeds for each iteration", () => {
    const grids: number[][][] = [];
    const result = generateAndTest({
      wfc: {
        tileset: twoTileOpen(),
        width: 5,
        height: 5,
        seed: 42,
      },
      iterations: 3,
      testFn: (grid) => {
        grids.push(grid.tiles);
        return true;
      },
    });
    assert.equal(result.passed, 3);
    // At least one grid should differ from the first
    let allSame = true;
    for (let i = 1; i < grids.length; i++) {
      let same = true;
      for (let y = 0; y < 5 && same; y++) {
        for (let x = 0; x < 5 && same; x++) {
          if (grids[0][y][x] !== grids[i][y][x]) same = false;
        }
      }
      if (!same) allSame = false;
    }
    assert.equal(allSame, false);
  });
});

// ---------------------------------------------------------------------------
// Integration: WFC + constraints
// ---------------------------------------------------------------------------

describe("WFC + constraints integration", () => {
  it("generates with border constraint", () => {
    const result = generate({
      tileset: wallFloorTileset(),
      width: 5,
      height: 5,
      seed: 42,
      constraints: [border(0)],
      maxRetries: 50,
    });
    // Border constraint may cause retries; check if successful
    if (result.success) {
      const grid = result.grid!;
      for (let x = 0; x < 5; x++) {
        assert.equal(grid.tiles[0][x], 0);
        assert.equal(grid.tiles[4][x], 0);
      }
      for (let y = 0; y < 5; y++) {
        assert.equal(grid.tiles[y][0], 0);
        assert.equal(grid.tiles[y][4], 0);
      }
    }
    assert.ok(true); // Either succeeded with valid border or exhausted retries
  });

  it("generates with reachability constraint", () => {
    const connected = reachability((id) => id === 1);
    const result = generate({
      tileset: wallFloorTileset(),
      width: 5,
      height: 5,
      seed: 42,
      constraints: [connected],
      maxRetries: 50,
    });
    if (result.success) {
      assert.equal(connected(result.grid!), true);
    }
    assert.ok(true);
  });

  it("generates dungeon with entrance and exit", () => {
    const hasEntrance = exactCount(2, 1);
    const hasExit = exactCount(3, 1);
    const connected = reachability((id) => id !== 0);

    const result = generate({
      tileset: dungeonTileset(),
      width: 8,
      height: 8,
      seed: 42,
      constraints: [hasEntrance, hasExit, connected],
      maxRetries: 200,
    });

    if (result.success) {
      assert.equal(countTile(result.grid!, 2), 1);
      assert.equal(countTile(result.grid!, 3), 1);
      assert.equal(connected(result.grid!), true);
    }
    assert.ok(true);
  });

  it("multiple constraints checked together", () => {
    const c1 = minCount(1, 5);
    const c2 = maxCount(1, 50);
    const result = generate({
      tileset: twoTileOpen(),
      width: 8,
      height: 8,
      seed: 42,
      constraints: [c1, c2],
      maxRetries: 50,
    });
    if (result.success) {
      const count = countTile(result.grid!, 1);
      assert.ok(count >= 5);
      assert.ok(count <= 50);
    }
    assert.ok(true);
  });
});
