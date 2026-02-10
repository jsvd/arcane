import { describe, it, assert } from "../testing/harness.ts";
import { findPath } from "./astar.ts";
import type { PathGrid } from "./types.ts";

/** Create a grid from string rows: '#' = wall, '.' = walkable */
function gridFromStrings(rows: string[]): PathGrid {
  const height = rows.length;
  const width = rows[0].length;
  return {
    width,
    height,
    isWalkable: (x, y) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      return rows[y][x] !== "#";
    },
  };
}

describe("pathfinding", () => {
  it("start equals goal returns trivial path", () => {
    const grid = gridFromStrings(["..."]);
    const result = findPath(grid, { x: 1, y: 0 }, { x: 1, y: 0 });
    assert.equal(result.found, true);
    assert.equal(result.path.length, 1);
    assert.deepEqual(result.path[0], { x: 1, y: 0 });
    assert.equal(result.cost, 0);
    assert.equal(result.explored, 0);
  });

  it("straight line path (no obstacles)", () => {
    const grid = gridFromStrings([".....", ".....", "....."]);
    const result = findPath(grid, { x: 0, y: 1 }, { x: 4, y: 1 });
    assert.equal(result.found, true);
    assert.equal(result.path.length, 5);
    assert.deepEqual(result.path[0], { x: 0, y: 1 });
    assert.deepEqual(result.path[4], { x: 4, y: 1 });
    assert.equal(result.cost, 4);
  });

  it("path around single obstacle", () => {
    const grid = gridFromStrings([
      ".....",
      "..#..",
      ".....",
    ]);
    const result = findPath(grid, { x: 1, y: 1 }, { x: 3, y: 1 });
    assert.equal(result.found, true);
    // Must go around the wall — path length > 3
    assert.ok(result.path.length > 3);
    assert.deepEqual(result.path[0], { x: 1, y: 1 });
    assert.deepEqual(result.path[result.path.length - 1], { x: 3, y: 1 });
  });

  it("no path found (completely blocked)", () => {
    const grid = gridFromStrings([
      "..#..",
      "..#..",
      "..#..",
    ]);
    const result = findPath(grid, { x: 0, y: 1 }, { x: 4, y: 1 });
    assert.equal(result.found, false);
    assert.equal(result.path.length, 0);
  });

  it("diagonal movement finds shorter path", () => {
    const grid = gridFromStrings([
      "...",
      "...",
      "...",
    ]);
    const cardinal = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 });
    const diag = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 }, { diagonal: true });
    assert.equal(cardinal.found, true);
    assert.equal(diag.found, true);
    assert.ok(diag.cost < cardinal.cost);
    assert.ok(diag.path.length <= cardinal.path.length);
  });

  it("diagonal disabled doesn't use diagonals", () => {
    const grid = gridFromStrings([
      "...",
      "...",
      "...",
    ]);
    const result = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 }, { diagonal: false });
    assert.equal(result.found, true);
    // Without diagonals, each step moves exactly 1 in x or y
    for (let i = 1; i < result.path.length; i++) {
      const dx = Math.abs(result.path[i].x - result.path[i - 1].x);
      const dy = Math.abs(result.path[i].y - result.path[i - 1].y);
      assert.equal(dx + dy, 1);
    }
  });

  it("custom cost function (weighted cells)", () => {
    const grid: PathGrid = {
      width: 5,
      height: 1,
      isWalkable: () => true,
      cost: (x, _y) => (x === 2 ? 10 : 1),
    };
    // With high cost at x=2, the 1D path must still go through it
    const result = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 });
    assert.equal(result.found, true);
    assert.equal(result.cost, 4 + 9); // cells 1,2,3,4 — cost(2)=10, others=1 → 1+10+1+1=13
  });

  it("max iterations limit reached", () => {
    const grid = gridFromStrings([
      "...........",
      "...........",
      "...........",
      "...........",
      "...........",
    ]);
    const result = findPath(grid, { x: 0, y: 0 }, { x: 10, y: 4 }, { maxIterations: 5 });
    assert.equal(result.found, false);
    assert.equal(result.explored, 5);
  });

  it("manhattan heuristic gives correct result", () => {
    const grid = gridFromStrings([".....", ".....", "....."]);
    const result = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 2 }, { heuristic: "manhattan" });
    assert.equal(result.found, true);
    assert.equal(result.cost, 6);
  });

  it("euclidean heuristic gives correct result", () => {
    const grid = gridFromStrings([".....", ".....", "....."]);
    const result = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 2 }, {
      heuristic: "euclidean",
      diagonal: true,
    });
    assert.equal(result.found, true);
    // Diagonal path should be shorter than 6
    assert.ok(result.cost < 6);
  });

  it("chebyshev heuristic gives correct result", () => {
    const grid = gridFromStrings([".....", ".....", "....."]);
    const result = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 2 }, {
      heuristic: "chebyshev",
      diagonal: true,
    });
    assert.equal(result.found, true);
    assert.ok(result.cost < 6);
  });

  it("large grid (50x50) with obstacles", () => {
    const row = ".".repeat(50);
    const rows: string[] = [];
    for (let y = 0; y < 50; y++) {
      rows.push(row);
    }
    // Add a wall across the middle with a gap
    const wallRow = "#".repeat(25) + "." + "#".repeat(24);
    rows[25] = wallRow;

    const grid = gridFromStrings(rows);
    const result = findPath(grid, { x: 0, y: 0 }, { x: 49, y: 49 });
    assert.equal(result.found, true);
    assert.ok(result.path.length > 0);
    assert.deepEqual(result.path[0], { x: 0, y: 0 });
    assert.deepEqual(result.path[result.path.length - 1], { x: 49, y: 49 });
  });

  it("path along corridor", () => {
    const grid = gridFromStrings([
      "#####",
      "#...#",
      "###.#",
      "#...#",
      "#####",
    ]);
    const result = findPath(grid, { x: 1, y: 1 }, { x: 1, y: 3 });
    assert.equal(result.found, true);
    // Must go right, down through gap, then left
    assert.deepEqual(result.path[0], { x: 1, y: 1 });
    assert.deepEqual(result.path[result.path.length - 1], { x: 1, y: 3 });
    assert.ok(result.path.length >= 5);
  });

  it("multiple valid paths (finds one)", () => {
    const grid = gridFromStrings([
      "...",
      ".#.",
      "...",
    ]);
    const result = findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 });
    assert.equal(result.found, true);
    assert.deepEqual(result.path[0], { x: 0, y: 0 });
    assert.deepEqual(result.path[result.path.length - 1], { x: 2, y: 2 });
    // Cardinal-only path around obstacle is length 5
    assert.equal(result.path.length, 5);
  });

  it("out of bounds handled gracefully", () => {
    const grid = gridFromStrings(["..."]);
    const r1 = findPath(grid, { x: -1, y: 0 }, { x: 2, y: 0 });
    assert.equal(r1.found, false);

    const r2 = findPath(grid, { x: 0, y: 0 }, { x: 5, y: 0 });
    assert.equal(r2.found, false);

    const r3 = findPath(grid, { x: 0, y: -1 }, { x: 2, y: 0 });
    assert.equal(r3.found, false);
  });
});
