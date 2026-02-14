import { describe, it, assert } from "../testing/harness.ts";
import { findHexPath, hexReachable, reachableToArray } from "./hex.ts";
import type { HexPathGrid } from "./hex.ts";
import { hex, hexEqual, hexDistance, hexNeighbors } from "../rendering/hex.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an open grid (everything walkable). */
function openGrid(): HexPathGrid {
  return { isWalkable: () => true };
}

/** Create a grid with blocked cells. */
function gridWithBlocked(blocked: Set<string>): HexPathGrid {
  return { isWalkable: (q, r) => !blocked.has(`${q},${r}`) };
}

/** Create a grid with cost function. */
function gridWithCost(costs: Map<string, number>): HexPathGrid {
  return {
    isWalkable: (q, r) => {
      const c = costs.get(`${q},${r}`);
      return c !== undefined && c < Infinity;
    },
    cost: (q, r) => costs.get(`${q},${r}`) ?? 1,
  };
}

// ---------------------------------------------------------------------------
// findHexPath — basic cases
// ---------------------------------------------------------------------------

describe("findHexPath basics", () => {
  it("same cell returns trivial path", () => {
    const result = findHexPath(openGrid(), hex(0, 0), hex(0, 0));
    assert.ok(result.found);
    assert.equal(result.path.length, 1);
    assert.equal(result.cost, 0);
    assert.equal(result.explored, 0);
  });

  it("adjacent cells find path of length 2", () => {
    const result = findHexPath(openGrid(), hex(0, 0), hex(1, 0));
    assert.ok(result.found);
    assert.equal(result.path.length, 2);
    assert.equal(result.cost, 1);
  });

  it("path starts and ends at correct cells", () => {
    const result = findHexPath(openGrid(), hex(0, 0), hex(3, -1));
    assert.ok(result.found);
    assert.ok(hexEqual(result.path[0], hex(0, 0)));
    assert.ok(hexEqual(result.path[result.path.length - 1], hex(3, -1)));
  });

  it("each step in path is adjacent", () => {
    const result = findHexPath(openGrid(), hex(0, 0), hex(4, -2));
    assert.ok(result.found);
    for (let i = 1; i < result.path.length; i++) {
      assert.equal(hexDistance(result.path[i - 1], result.path[i]), 1);
    }
  });

  it("path length equals distance + 1 on open grid", () => {
    const start = hex(0, 0);
    const goal = hex(3, -2);
    const result = findHexPath(openGrid(), start, goal);
    assert.ok(result.found);
    assert.equal(result.path.length, hexDistance(start, goal) + 1);
  });

  it("optimal path cost equals distance on uniform-cost grid", () => {
    const start = hex(0, 0);
    const goal = hex(5, -3);
    const result = findHexPath(openGrid(), start, goal);
    assert.ok(result.found);
    assert.equal(result.cost, hexDistance(start, goal));
  });
});

// ---------------------------------------------------------------------------
// findHexPath — blocked cells
// ---------------------------------------------------------------------------

describe("findHexPath with obstacles", () => {
  it("finds path around a single blocked cell", () => {
    // Block the direct neighbor between start and goal
    const blocked = new Set(["1,0"]); // block hex(1, 0)
    const grid = gridWithBlocked(blocked);
    const result = findHexPath(grid, hex(0, 0), hex(2, 0));
    assert.ok(result.found);
    // Path should be longer than direct (distance 2 + 1 = 3 steps)
    assert.ok(result.path.length > 3);
    // Verify the blocked cell is not in path
    for (const h of result.path) {
      assert.ok(!hexEqual(h, hex(1, 0)));
    }
  });

  it("returns not found when completely blocked", () => {
    // Block all neighbors of the start
    const neighbors = hexNeighbors(0, 0);
    const blocked = new Set(neighbors.map((n) => `${n.q},${n.r}`));
    const grid = gridWithBlocked(blocked);
    const result = findHexPath(grid, hex(0, 0), hex(3, 0));
    assert.ok(!result.found);
  });

  it("returns not found when start is unwalkable", () => {
    const blocked = new Set(["0,0"]);
    const grid = gridWithBlocked(blocked);
    const result = findHexPath(grid, hex(0, 0), hex(1, 0));
    assert.ok(!result.found);
  });

  it("returns not found when goal is unwalkable", () => {
    const blocked = new Set(["3,0"]);
    const grid = gridWithBlocked(blocked);
    const result = findHexPath(grid, hex(0, 0), hex(3, 0));
    assert.ok(!result.found);
  });
});

// ---------------------------------------------------------------------------
// findHexPath — terrain costs
// ---------------------------------------------------------------------------

describe("findHexPath with terrain costs", () => {
  it("prefers lower-cost path", () => {
    // Direct path through expensive terrain vs detour through cheap terrain
    // Setup: hex(0,0) -> hex(2,0)
    // Direct: (0,0) -> (1,0) [cost 10] -> (2,0) [cost 1] = 11
    // Detour: (0,0) -> (1,-1) [cost 1] -> (2,-1) [cost 1] -> (2,0) [cost 1] = 3
    const costs = new Map<string, number>();
    // Fill a reasonable area with cost 1
    for (let q = -3; q <= 5; q++) {
      for (let r = -3; r <= 5; r++) {
        costs.set(`${q},${r}`, 1);
      }
    }
    // Make (1,0) very expensive
    costs.set("1,0", 10);

    const grid = gridWithCost(costs);
    const result = findHexPath(grid, hex(0, 0), hex(2, 0));
    assert.ok(result.found);
    // Should avoid (1,0) due to high cost
    const usesExpensive = result.path.some((h) => h.q === 1 && h.r === 0);
    assert.ok(!usesExpensive);
    // Cost should be less than 11
    assert.ok(result.cost < 11);
  });

  it("reports correct total cost", () => {
    const costs = new Map<string, number>();
    for (let q = -2; q <= 4; q++) {
      for (let r = -2; r <= 4; r++) {
        costs.set(`${q},${r}`, 2);
      }
    }
    const grid = gridWithCost(costs);
    const result = findHexPath(grid, hex(0, 0), hex(2, 0));
    assert.ok(result.found);
    // 2 steps, each costs 2 = 4
    assert.equal(result.cost, 4);
  });
});

// ---------------------------------------------------------------------------
// findHexPath — max iterations
// ---------------------------------------------------------------------------

describe("findHexPath max iterations", () => {
  it("respects maxIterations", () => {
    const result = findHexPath(openGrid(), hex(0, 0), hex(100, -50), { maxIterations: 5 });
    assert.ok(!result.found);
    assert.equal(result.explored, 5);
  });
});

// ---------------------------------------------------------------------------
// hexReachable — basic cases
// ---------------------------------------------------------------------------

describe("hexReachable", () => {
  it("movement 0 returns only start", () => {
    const reachable = hexReachable(openGrid(), hex(0, 0), 0);
    assert.equal(reachable.size, 1);
    assert.ok(reachable.has("0,0"));
  });

  it("movement 1 returns start + 6 neighbors", () => {
    const reachable = hexReachable(openGrid(), hex(0, 0), 1);
    assert.equal(reachable.size, 7);
  });

  it("movement 2 returns 19 cells on open grid", () => {
    const reachable = hexReachable(openGrid(), hex(0, 0), 2);
    assert.equal(reachable.size, 19);
  });

  it("all reachable cells are within movement distance", () => {
    const center = hex(2, -1);
    const reachable = hexReachable(openGrid(), center, 3);
    for (const key of reachable.keys()) {
      const [q, r] = key.split(",").map(Number);
      assert.ok(hexDistance(center, hex(q, r)) <= 3);
    }
  });

  it("start cell has full remaining movement", () => {
    const reachable = hexReachable(openGrid(), hex(0, 0), 5);
    assert.equal(reachable.get("0,0"), 5);
  });

  it("adjacent cells have movement - 1 remaining", () => {
    const reachable = hexReachable(openGrid(), hex(0, 0), 3);
    const neighbors = hexNeighbors(0, 0);
    for (const n of neighbors) {
      assert.equal(reachable.get(`${n.q},${n.r}`), 2);
    }
  });
});

// ---------------------------------------------------------------------------
// hexReachable — obstacles
// ---------------------------------------------------------------------------

describe("hexReachable with obstacles", () => {
  it("blocked cells are not reachable", () => {
    const blocked = new Set(["1,0"]);
    const grid = gridWithBlocked(blocked);
    const reachable = hexReachable(grid, hex(0, 0), 1);
    assert.ok(!reachable.has("1,0"));
    // Should have start + 5 unblocked neighbors
    assert.equal(reachable.size, 6);
  });

  it("cells behind blocked wall are unreachable with low movement", () => {
    // Block all cells at distance 1 except one
    const allNeighbors = hexNeighbors(0, 0);
    const blocked = new Set(allNeighbors.map((n) => `${n.q},${n.r}`));
    const grid = gridWithBlocked(blocked);
    const reachable = hexReachable(grid, hex(0, 0), 2);
    // Only start is reachable (all neighbors blocked)
    assert.equal(reachable.size, 1);
  });
});

// ---------------------------------------------------------------------------
// hexReachable — terrain costs
// ---------------------------------------------------------------------------

describe("hexReachable with costs", () => {
  it("expensive terrain limits range", () => {
    const costs = new Map<string, number>();
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        costs.set(`${q},${r}`, 2);
      }
    }
    const grid = gridWithCost(costs);
    const reachable = hexReachable(grid, hex(0, 0), 2);
    // With cost 2, movement 2 should only reach immediate neighbors (1 step)
    assert.equal(reachable.size, 7); // start + 6 neighbors at cost 2 each = exactly 1 step
  });

  it("mixed terrain: cheaper paths reach farther", () => {
    const costs = new Map<string, number>();
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        costs.set(`${q},${r}`, 3); // expensive default
      }
    }
    // Cheap corridor along q axis
    costs.set("1,0", 1);
    costs.set("2,0", 1);
    costs.set("3,0", 1);

    const grid = gridWithCost(costs);
    const reachable = hexReachable(grid, hex(0, 0), 3);
    // Can reach (3,0) via cheap corridor (cost 1+1+1 = 3)
    assert.ok(reachable.has("3,0"));
    // But cannot reach (0,3) because that requires 3 expensive moves (cost 3*3 = 9)
    assert.ok(!reachable.has("0,3"));
  });
});

// ---------------------------------------------------------------------------
// reachableToArray
// ---------------------------------------------------------------------------

describe("reachableToArray", () => {
  it("converts reachable map to hex array", () => {
    const reachable = hexReachable(openGrid(), hex(0, 0), 1);
    const arr = reachableToArray(reachable);
    assert.equal(arr.length, 7);
    // All elements should satisfy q + r + s = 0
    for (const h of arr) {
      assert.equal(h.q + h.r + h.s, 0);
    }
  });

  it("empty map returns empty array", () => {
    const arr = reachableToArray(new Map());
    assert.equal(arr.length, 0);
  });
});
