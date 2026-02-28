import { describe, it, assert } from "../testing/harness.ts";
import { validateLevel, generateAndTest } from "./validate.ts";
import type { WFCGrid, TileSet } from "./types.ts";

function makeGrid(width: number, height: number, tiles: number[][]): WFCGrid {
  return { width, height, tiles };
}

describe("validateLevel", () => {
  it("returns true with empty constraints", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    assert.equal(validateLevel(grid, []), true);
  });

  it("returns true when all constraints pass", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    assert.equal(validateLevel(grid, [() => true, () => true]), true);
  });

  it("returns false when first constraint fails", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    assert.equal(validateLevel(grid, [() => false, () => true]), false);
  });

  it("returns false when last constraint fails", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    assert.equal(validateLevel(grid, [() => true, () => false]), false);
  });

  it("short-circuits on first failure", () => {
    const grid = makeGrid(2, 2, [[0, 0], [0, 0]]);
    let secondCalled = false;
    validateLevel(grid, [() => false, () => { secondCalled = true; return true; }]);
    assert.equal(secondCalled, false);
  });
});

describe("generateAndTest", () => {
  const simpleTileset: TileSet = {
    tiles: {
      0: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] },
      1: { north: [0, 1], east: [0, 1], south: [0, 1], west: [0, 1] },
    },
  };

  it("counts sum to total", () => {
    const result = generateAndTest({
      wfc: { tileset: simpleTileset, width: 3, height: 3, seed: 42 },
      iterations: 5,
      testFn: () => true,
    });
    assert.equal(result.passed + result.failed + result.generationFailures, result.total);
    assert.equal(result.total, 5);
  });

  it("all pass when testFn returns true", () => {
    const result = generateAndTest({
      wfc: { tileset: simpleTileset, width: 3, height: 3, seed: 1 },
      iterations: 3,
      testFn: () => true,
    });
    assert.equal(result.failed, 0);
    assert.equal(result.passed + result.generationFailures, result.total);
  });

  it("all fail when testFn returns false", () => {
    const result = generateAndTest({
      wfc: { tileset: simpleTileset, width: 3, height: 3, seed: 1 },
      iterations: 3,
      testFn: () => false,
    });
    assert.equal(result.passed, 0);
  });
});
