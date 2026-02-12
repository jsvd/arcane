import { describe, it, assert } from "../testing/harness.ts";
import {
  NORTH,
  EAST,
  SOUTH,
  WEST,
  NORTHEAST,
  SOUTHEAST,
  SOUTHWEST,
  NORTHWEST,
  computeAutotileBitmask4,
  computeAutotileBitmask8,
  createAutotileMapping4,
  createAutotileMapping8,
  createAutotileRule,
  resolveAutotile,
  applyAutotile,
  BITMASK4_LABELS,
} from "./autotile.ts";

// ---------------------------------------------------------------------------
// Bitmask constants
// ---------------------------------------------------------------------------

describe("autotile bitmask constants", () => {
  it("has correct cardinal bit values", () => {
    assert.equal(NORTH, 1);
    assert.equal(EAST, 2);
    assert.equal(SOUTH, 4);
    assert.equal(WEST, 8);
  });

  it("has correct diagonal bit values", () => {
    assert.equal(NORTHEAST, 16);
    assert.equal(SOUTHEAST, 32);
    assert.equal(SOUTHWEST, 64);
    assert.equal(NORTHWEST, 128);
  });

  it("bitmask labels has 16 entries", () => {
    assert.equal(BITMASK4_LABELS.length, 16);
    assert.equal(BITMASK4_LABELS[0], "isolated");
    assert.equal(BITMASK4_LABELS[15], "N+E+S+W");
  });
});

// ---------------------------------------------------------------------------
// 4-bit bitmask computation
// ---------------------------------------------------------------------------

describe("computeAutotileBitmask4", () => {
  it("returns 0 for isolated tile", () => {
    const check = () => false;
    assert.equal(computeAutotileBitmask4(5, 5, check), 0);
  });

  it("returns NORTH when only north neighbor present", () => {
    const check = (gx: number, gy: number) => gx === 5 && gy === 4;
    assert.equal(computeAutotileBitmask4(5, 5, check), NORTH);
  });

  it("returns EAST when only east neighbor present", () => {
    const check = (gx: number, gy: number) => gx === 6 && gy === 5;
    assert.equal(computeAutotileBitmask4(5, 5, check), EAST);
  });

  it("returns SOUTH when only south neighbor present", () => {
    const check = (gx: number, gy: number) => gx === 5 && gy === 6;
    assert.equal(computeAutotileBitmask4(5, 5, check), SOUTH);
  });

  it("returns WEST when only west neighbor present", () => {
    const check = (gx: number, gy: number) => gx === 4 && gy === 5;
    assert.equal(computeAutotileBitmask4(5, 5, check), WEST);
  });

  it("returns combined mask for multiple neighbors", () => {
    // N and S neighbors
    const check = (gx: number, gy: number) =>
      (gx === 5 && gy === 4) || (gx === 5 && gy === 6);
    assert.equal(computeAutotileBitmask4(5, 5, check), NORTH | SOUTH);
  });

  it("returns 15 when all cardinal neighbors present", () => {
    const check = () => true;
    assert.equal(computeAutotileBitmask4(5, 5, check), 15);
  });

  it("handles edge positions correctly", () => {
    // Tile at (0,0) with check returning false for negative coords
    const check = (gx: number, gy: number) => gx >= 0 && gy >= 0;
    // At (0,0): N=(-1 check? no, y=-1), E=(1,0 yes), S=(0,1 yes), W=(-1,0 no)
    // check(0, -1) = false (gy < 0), check(1, 0) = true, check(0, 1) = true, check(-1, 0) = false
    assert.equal(computeAutotileBitmask4(0, 0, check), EAST | SOUTH);
  });
});

// ---------------------------------------------------------------------------
// 8-bit bitmask computation
// ---------------------------------------------------------------------------

describe("computeAutotileBitmask8", () => {
  it("returns 0 for isolated tile", () => {
    const check = () => false;
    assert.equal(computeAutotileBitmask8(5, 5, check), 0);
  });

  it("returns only cardinal bits when no adjacent corners", () => {
    // N and E present, but NE not present
    const check = (gx: number, gy: number) =>
      (gx === 5 && gy === 4) || (gx === 6 && gy === 5);
    assert.equal(
      computeAutotileBitmask8(5, 5, check),
      NORTH | EAST,
    );
  });

  it("includes diagonal only when both adjacent cardinals present", () => {
    // N, E, and NE all present
    const check = (gx: number, gy: number) =>
      (gx === 5 && gy === 4) ||  // N
      (gx === 6 && gy === 5) ||  // E
      (gx === 6 && gy === 4);    // NE
    assert.equal(
      computeAutotileBitmask8(5, 5, check),
      NORTH | EAST | NORTHEAST,
    );
  });

  it("excludes diagonal when only one adjacent cardinal present", () => {
    // N and NE present but E not present => NORTHEAST should NOT be set
    const check = (gx: number, gy: number) =>
      (gx === 5 && gy === 4) || (gx === 6 && gy === 4);
    assert.equal(computeAutotileBitmask8(5, 5, check), NORTH);
  });

  it("handles all four corners correctly", () => {
    // All neighbors present
    const check = () => true;
    const mask = computeAutotileBitmask8(5, 5, check);
    assert.equal(
      mask,
      NORTH | EAST | SOUTH | WEST | NORTHEAST | SOUTHEAST | SOUTHWEST | NORTHWEST,
    );
    assert.equal(mask, 255);
  });

  it("SE corner only with S and E", () => {
    const check = (gx: number, gy: number) =>
      (gx === 6 && gy === 5) ||  // E
      (gx === 5 && gy === 6) ||  // S
      (gx === 6 && gy === 6);    // SE
    assert.equal(
      computeAutotileBitmask8(5, 5, check),
      EAST | SOUTH | SOUTHEAST,
    );
  });

  it("SW corner only with S and W", () => {
    const check = (gx: number, gy: number) =>
      (gx === 4 && gy === 5) ||  // W
      (gx === 5 && gy === 6) ||  // S
      (gx === 4 && gy === 6);    // SW
    assert.equal(
      computeAutotileBitmask8(5, 5, check),
      SOUTH | WEST | SOUTHWEST,
    );
  });

  it("NW corner only with N and W", () => {
    const check = (gx: number, gy: number) =>
      (gx === 5 && gy === 4) ||  // N
      (gx === 4 && gy === 5) ||  // W
      (gx === 4 && gy === 4);    // NW
    assert.equal(
      computeAutotileBitmask8(5, 5, check),
      NORTH | WEST | NORTHWEST,
    );
  });
});

// ---------------------------------------------------------------------------
// Autotile mapping creation
// ---------------------------------------------------------------------------

describe("createAutotileMapping4", () => {
  it("creates mapping from 16 tile IDs", () => {
    const tileIds = Array.from({ length: 16 }, (_, i) => i + 1);
    const mapping = createAutotileMapping4(tileIds);
    assert.equal(mapping.size, 16);
    assert.equal(mapping.get(0), 1);
    assert.equal(mapping.get(15), 16);
  });

  it("throws if not exactly 16 entries", () => {
    assert.throws(
      () => createAutotileMapping4([1, 2, 3]),
      /expected 16/,
    );
    assert.throws(
      () => createAutotileMapping4(Array.from({ length: 17 }, (_, i) => i)),
      /expected 16/,
    );
  });
});

describe("createAutotileMapping8", () => {
  it("creates mapping from lookup object", () => {
    const mapping = createAutotileMapping8({
      0: 1,
      [NORTH | EAST]: 5,
      255: 47,
    });
    assert.equal(mapping.get(0), 1);
    assert.equal(mapping.get(NORTH | EAST), 5);
    assert.equal(mapping.get(255), 47);
  });
});

// ---------------------------------------------------------------------------
// Autotile rule + resolution
// ---------------------------------------------------------------------------

describe("createAutotileRule", () => {
  it("creates a rule with member set", () => {
    const mapping = createAutotileMapping4(Array.from({ length: 16 }, (_, i) => i + 100));
    const rule = createAutotileRule([1, 2, 3], 4, mapping, 99);
    assert.ok(rule.memberTileIds.has(1));
    assert.ok(rule.memberTileIds.has(2));
    assert.ok(rule.memberTileIds.has(3));
    assert.ok(!rule.memberTileIds.has(4));
    assert.equal(rule.mode, 4);
    assert.equal(rule.fallbackTileId, 99);
  });
});

describe("resolveAutotile", () => {
  it("resolves 4-bit bitmask to correct tile", () => {
    const tileIds = Array.from({ length: 16 }, (_, i) => i + 100);
    const mapping = createAutotileMapping4(tileIds);
    const rule = createAutotileRule([1], 4, mapping, 99);

    // Isolated tile (no neighbors)
    const check = () => false;
    assert.equal(resolveAutotile(5, 5, rule, check), 100); // bitmask 0 -> tileIds[0]
  });

  it("returns fallback for unmapped bitmask", () => {
    const mapping = new Map<number, number>();
    mapping.set(0, 100);
    // No mapping for bitmask 1 (NORTH)
    const rule = createAutotileRule([1], 4, mapping, 99);

    const check = (gx: number, gy: number) => gx === 5 && gy === 4; // NORTH
    assert.equal(resolveAutotile(5, 5, rule, check), 99); // fallback
  });
});

// ---------------------------------------------------------------------------
// applyAutotile (full grid resolution)
// ---------------------------------------------------------------------------

describe("applyAutotile", () => {
  it("resolves a simple 3x3 grid with 4-bit autotiling", () => {
    // 3x3 grid, all cells are tile 1 (member)
    const grid = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];

    const getTileFn = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= 3 || gy >= 3) return 0;
      return grid[gy][gx];
    };

    const setTileFn = (gx: number, gy: number, tileId: number) => {
      grid[gy][gx] = tileId;
    };

    // Create mapping: bitmask value -> tile ID (100 + bitmask)
    const tileIds = Array.from({ length: 16 }, (_, i) => 100 + i);
    const mapping = createAutotileMapping4(tileIds);
    const rule = createAutotileRule([1], 4, mapping, 99);

    applyAutotile(3, 3, getTileFn, setTileFn, rule);

    // Center (1,1): all 4 neighbors present -> bitmask 15 -> tile 115
    assert.equal(grid[1][1], 115);

    // Corner (0,0): E and S neighbors -> bitmask EAST|SOUTH = 6 -> tile 106
    assert.equal(grid[0][0], 106);

    // Corner (2,2): N and W neighbors -> bitmask NORTH|WEST = 9 -> tile 109
    assert.equal(grid[2][2], 109);

    // Top edge (1,0): E, S, W neighbors -> bitmask 14 -> tile 114
    assert.equal(grid[0][1], 114);

    // Left edge (0,1): N, E, S neighbors -> bitmask 7 -> tile 107
    assert.equal(grid[1][0], 107);
  });

  it("only resolves member tiles", () => {
    const grid = [
      [1, 0, 1],
      [0, 1, 0],
      [1, 0, 1],
    ];

    const getTileFn = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= 3 || gy >= 3) return 0;
      return grid[gy][gx];
    };

    const setTileFn = (gx: number, gy: number, tileId: number) => {
      grid[gy][gx] = tileId;
    };

    const tileIds = Array.from({ length: 16 }, (_, i) => 100 + i);
    const mapping = createAutotileMapping4(tileIds);
    const rule = createAutotileRule([1], 4, mapping, 99);

    applyAutotile(3, 3, getTileFn, setTileFn, rule);

    // Non-member tiles (0) should remain 0
    assert.equal(grid[0][1], 0);
    assert.equal(grid[1][0], 0);
    assert.equal(grid[1][2], 0);
    assert.equal(grid[2][1], 0);

    // Center (1,1): isolated (no cardinal neighbors are members) -> bitmask 0 -> tile 100
    assert.equal(grid[1][1], 100);
  });

  it("handles partial region application", () => {
    const grid = [
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ];

    const getTileFn = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= 4 || gy >= 4) return 0;
      return grid[gy][gx];
    };

    const setTileFn = (gx: number, gy: number, tileId: number) => {
      grid[gy][gx] = tileId;
    };

    const tileIds = Array.from({ length: 16 }, (_, i) => 100 + i);
    const mapping = createAutotileMapping4(tileIds);
    const rule = createAutotileRule([1], 4, mapping, 99);

    // Only apply to region (1,1) to (3,3)
    applyAutotile(4, 4, getTileFn, setTileFn, rule, 1, 1, 3, 3);

    // (0,0) should be untouched since it's outside the region
    assert.equal(grid[0][0], 1);
    // (1,1) is inside the region: all neighbors present -> 115
    assert.equal(grid[1][1], 115);
  });

  it("resolves using snapshot (no feedback during resolution)", () => {
    // This tests that the two-pass approach works correctly:
    // computed bitmasks should be based on original tile data, not
    // partially-resolved data.
    const grid = [
      [1, 1],
      [1, 1],
    ];

    const originalGrid = grid.map((row) => [...row]);
    const getTileFn = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= 2 || gy >= 2) return 0;
      return originalGrid[gy][gx];
    };

    const setTileFn = (gx: number, gy: number, tileId: number) => {
      grid[gy][gx] = tileId;
    };

    const tileIds = Array.from({ length: 16 }, (_, i) => 100 + i);
    const mapping = createAutotileMapping4(tileIds);
    const rule = createAutotileRule([1], 4, mapping, 99);

    applyAutotile(2, 2, getTileFn, setTileFn, rule);

    // (0,0): E and S present -> bitmask 6 -> 106
    assert.equal(grid[0][0], 106);
    // (1,0): S and W present -> bitmask 12 -> 112
    assert.equal(grid[0][1], 112);
    // (0,1): N and E present -> bitmask 3 -> 103
    assert.equal(grid[1][0], 103);
    // (1,1): N and W present -> bitmask 9 -> 109
    assert.equal(grid[1][1], 109);
  });
});

// ---------------------------------------------------------------------------
// 8-bit autotile application
// ---------------------------------------------------------------------------

describe("applyAutotile 8-bit", () => {
  it("resolves with diagonal awareness", () => {
    // 3x3 grid, all filled
    const grid = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ];

    const getTileFn = (gx: number, gy: number) => {
      if (gx < 0 || gy < 0 || gx >= 3 || gy >= 3) return 0;
      return grid[gy][gx];
    };

    const setTileFn = (gx: number, gy: number, tileId: number) => {
      grid[gy][gx] = tileId;
    };

    const mapping = createAutotileMapping8({
      // All 8 neighbors present
      255: 200,
      // E+S+SE
      [EAST | SOUTH | SOUTHEAST]: 201,
      // Some other combinations
      [NORTH | EAST | SOUTH | WEST | NORTHEAST | SOUTHEAST]: 202,
    });
    const rule = createAutotileRule([1], 8, mapping, 99);

    applyAutotile(3, 3, getTileFn, setTileFn, rule);

    // Center (1,1): all 8 neighbors -> 255 -> tile 200
    assert.equal(grid[1][1], 200);

    // Corner (0,0): E, S present + SE -> bitmask = EAST|SOUTH|SOUTHEAST = 2+4+32 = 38 -> tile 201
    assert.equal(grid[0][0], 201);
  });
});

// ---------------------------------------------------------------------------
// Export verification
// ---------------------------------------------------------------------------

describe("autotile exports", () => {
  it("exports all public functions", async () => {
    const mod = await import("./autotile.ts");
    assert.equal(typeof mod.computeAutotileBitmask4, "function");
    assert.equal(typeof mod.computeAutotileBitmask8, "function");
    assert.equal(typeof mod.createAutotileMapping4, "function");
    assert.equal(typeof mod.createAutotileMapping8, "function");
    assert.equal(typeof mod.createAutotileRule, "function");
    assert.equal(typeof mod.resolveAutotile, "function");
    assert.equal(typeof mod.applyAutotile, "function");
  });

  it("exports bitmask constants", async () => {
    const mod = await import("./autotile.ts");
    assert.equal(typeof mod.NORTH, "number");
    assert.equal(typeof mod.EAST, "number");
    assert.equal(typeof mod.SOUTH, "number");
    assert.equal(typeof mod.WEST, "number");
    assert.equal(typeof mod.NORTHEAST, "number");
    assert.equal(typeof mod.SOUTHEAST, "number");
    assert.equal(typeof mod.SOUTHWEST, "number");
    assert.equal(typeof mod.NORTHWEST, "number");
  });
});
