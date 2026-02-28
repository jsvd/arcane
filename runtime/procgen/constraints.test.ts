import { describe, it, assert } from "../testing/harness.ts";
import { reachability, exactCount, minCount, maxCount, border, custom, countTile, findTile } from "./constraints.ts";
import type { WFCGrid } from "./types.ts";

function makeGrid(width: number, height: number, tiles: number[][]): WFCGrid {
  return { width, height, tiles };
}

describe("reachability", () => {
  it("returns a function", () => {
    const fn = reachability((id) => id === 0);
    assert.equal(typeof fn, "function");
  });

  it("passes for fully connected grid", () => {
    const grid = makeGrid(3, 3, [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    assert.equal(reachability((id) => id === 0)(grid), true);
  });

  it("fails for disconnected grid", () => {
    const grid = makeGrid(3, 3, [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ]);
    assert.equal(reachability((id) => id === 0)(grid), false);
  });

  it("passes for no walkable tiles", () => {
    const grid = makeGrid(2, 2, [[1, 1], [1, 1]]);
    assert.equal(reachability((id) => id === 0)(grid), true);
  });

  it("works on 1x1 grid", () => {
    const grid = makeGrid(1, 1, [[0]]);
    assert.equal(reachability((id) => id === 0)(grid), true);
  });

  it("passes for L-shaped path", () => {
    const grid = makeGrid(3, 3, [
      [0, 1, 1],
      [0, 1, 1],
      [0, 0, 0],
    ]);
    assert.equal(reachability((id) => id === 0)(grid), true);
  });
});

describe("exactCount", () => {
  it("passes when count matches", () => {
    const grid = makeGrid(2, 2, [[0, 1], [1, 0]]);
    assert.equal(exactCount(0, 2)(grid), true);
  });

  it("fails when count does not match", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    assert.equal(exactCount(0, 2)(grid), false);
  });
});

describe("minCount", () => {
  it("passes when count >= n", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 1]]);
    assert.equal(minCount(0, 3)(grid), true);
  });

  it("fails when count < n", () => {
    const grid = makeGrid(2, 2, [[0, 1], [1, 1]]);
    assert.equal(minCount(0, 2)(grid), false);
  });
});

describe("maxCount", () => {
  it("passes when count <= n", () => {
    const grid = makeGrid(2, 2, [[0, 1], [1, 1]]);
    assert.equal(maxCount(0, 1)(grid), true);
  });

  it("fails when count > n", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 1]]);
    assert.equal(maxCount(0, 2)(grid), false);
  });
});

describe("border", () => {
  it("passes when all edges match", () => {
    const grid = makeGrid(3, 3, [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ]);
    assert.equal(border(1)(grid), true);
  });

  it("fails when one edge differs", () => {
    const grid = makeGrid(3, 3, [
      [1, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
    ]);
    assert.equal(border(1)(grid), false);
  });

  it("works on 1x1 grid", () => {
    const grid = makeGrid(1, 1, [[5]]);
    assert.equal(border(5)(grid), true);
  });
});

describe("custom", () => {
  it("wraps function and returns it", () => {
    const fn = custom((grid) => grid.width > 0);
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    assert.equal(fn(grid), true);
  });
});

describe("countTile", () => {
  it("counts occurrences correctly", () => {
    const grid = makeGrid(3, 2, [[0, 1, 0], [1, 0, 0]]);
    assert.equal(countTile(grid, 0), 4);
    assert.equal(countTile(grid, 1), 2);
    assert.equal(countTile(grid, 2), 0);
  });
});

describe("findTile", () => {
  it("returns correct positions", () => {
    const grid = makeGrid(3, 2, [[0, 1, 0], [1, 0, 1]]);
    const positions = findTile(grid, 1);
    assert.equal(positions.length, 3);
    assert.deepEqual(positions[0], { x: 1, y: 0 });
    assert.deepEqual(positions[1], { x: 0, y: 1 });
    assert.deepEqual(positions[2], { x: 2, y: 1 });
  });

  it("returns empty when tile not found", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    assert.deepEqual(findTile(grid, 5), []);
  });
});
