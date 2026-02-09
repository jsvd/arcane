import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { applyRule } from "../../runtime/systems/index.ts";
import {
  createFogState,
  isVisible,
  isExplored,
  getVisibleCells,
  fogOfWarSystem,
} from "./fog.ts";
import { computeFov } from "./fov.ts";
import type { FogParams } from "./types.ts";

function noWalls(_x: number, _y: number): boolean {
  return false;
}

describe("createFogState", () => {
  it("all cells hidden", () => {
    const state = createFogState(5, 5);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        assert.equal(state.visibility[y][x], "hidden");
      }
    }
    assert.equal(state.width, 5);
    assert.equal(state.height, 5);
  });
});

describe("compute-visibility", () => {
  it("marks origin visible", () => {
    const state = createFogState(10, 10);
    const params: FogParams = { blocksVision: noWalls, radius: 3 };
    const result = applyRule(fogOfWarSystem, "compute-visibility", state, {
      x: 5, y: 5, params,
    });
    assert.ok(result.ok);
    assert.ok(isVisible(result.state, 5, 5));
  });

  it("marks cells in radius", () => {
    const state = createFogState(10, 10);
    const params: FogParams = { blocksVision: noWalls, radius: 3 };
    const result = applyRule(fogOfWarSystem, "compute-visibility", state, {
      x: 5, y: 5, params,
    });
    assert.ok(result.ok);
    // Adjacent cells should be visible
    assert.ok(isVisible(result.state, 5, 4));
    assert.ok(isVisible(result.state, 4, 5));
    assert.ok(isVisible(result.state, 6, 5));
    assert.ok(isVisible(result.state, 5, 6));
  });

  it("respects blocksVision", () => {
    const state = createFogState(10, 10);
    // Wall at (5, 3) — blocks vision going north
    const params: FogParams = {
      blocksVision: (x, y) => x === 5 && y === 3,
      radius: 5,
    };
    const result = applyRule(fogOfWarSystem, "compute-visibility", state, {
      x: 5, y: 5, params,
    });
    assert.ok(result.ok);
    // The wall itself should be visible (you can see it)
    assert.ok(isVisible(result.state, 5, 3));
    // Cell behind the wall should not be visible
    assert.equal(isVisible(result.state, 5, 2), false);
  });

  it("preserves explored cells", () => {
    // First compute from one position, then another
    let state = createFogState(10, 10);
    const params1: FogParams = { blocksVision: noWalls, radius: 2 };
    let result = applyRule(fogOfWarSystem, "compute-visibility", state, {
      x: 1, y: 1, params: params1,
    });
    assert.ok(result.ok);
    assert.ok(isVisible(result.state, 1, 1));

    // Now compute from different position — old visible should become explored
    const params2: FogParams = { blocksVision: noWalls, radius: 2 };
    result = applyRule(fogOfWarSystem, "compute-visibility", result.state, {
      x: 8, y: 8, params: params2,
    });
    assert.ok(result.ok);
    // Old position should now be explored, not visible
    assert.equal(isVisible(result.state, 1, 1), false);
    assert.ok(isExplored(result.state, 1, 1));
    // New position should be visible
    assert.ok(isVisible(result.state, 8, 8));
  });

  it("clears previous visible to explored", () => {
    let state = createFogState(10, 10);
    const params: FogParams = { blocksVision: noWalls, radius: 1 };
    let result = applyRule(fogOfWarSystem, "compute-visibility", state, {
      x: 5, y: 5, params,
    });
    assert.ok(result.ok);
    assert.ok(isVisible(result.state, 5, 5));

    // Recompute from different position
    result = applyRule(fogOfWarSystem, "compute-visibility", result.state, {
      x: 0, y: 0, params,
    });
    assert.ok(result.ok);
    // (5,5) was visible, should now be explored
    assert.equal(isVisible(result.state, 5, 5), false);
    assert.ok(isExplored(result.state, 5, 5));
  });
});

describe("reveal-all", () => {
  it("sets everything to visible", () => {
    const state = createFogState(5, 5);
    const result = applyRule(fogOfWarSystem, "reveal-all", state, {});
    assert.ok(result.ok);
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        assert.ok(isVisible(result.state, x, y));
      }
    }
  });
});

describe("query functions", () => {
  it("isVisible returns correct value", () => {
    const state = createFogState(5, 5);
    assert.equal(isVisible(state, 0, 0), false);
    const result = applyRule(fogOfWarSystem, "reveal-all", state, {});
    assert.ok(isVisible(result.state, 0, 0));
  });

  it("isExplored for explored cells", () => {
    let state = createFogState(10, 10);
    const params: FogParams = { blocksVision: noWalls, radius: 1 };
    let result = applyRule(fogOfWarSystem, "compute-visibility", state, {
      x: 5, y: 5, params,
    });
    // Move away — old cells become explored
    result = applyRule(fogOfWarSystem, "compute-visibility", result.state, {
      x: 0, y: 0, params,
    });
    assert.ok(result.ok);
    assert.ok(isExplored(result.state, 5, 5));
    assert.equal(isVisible(result.state, 5, 5), false);
  });

  it("getVisibleCells returns all visible positions", () => {
    const state = createFogState(5, 5);
    const params: FogParams = { blocksVision: noWalls, radius: 0 };
    const result = applyRule(fogOfWarSystem, "compute-visibility", state, {
      x: 2, y: 2, params,
    });
    assert.ok(result.ok);
    const cells = getVisibleCells(result.state);
    assert.equal(cells.length, 1);
    assert.equal(cells[0].x, 2);
    assert.equal(cells[0].y, 2);
  });
});

describe("shadowcasting", () => {
  it("wall blocks vision behind it", () => {
    const visible = new Set<string>();
    computeFov(5, 5, 5, 10, 10,
      (x, y) => x === 5 && y === 3,
      (x, y) => visible.add(`${x},${y}`),
    );
    assert.ok(visible.has("5,3")); // wall itself visible
    assert.equal(visible.has("5,2"), false); // behind wall
  });

  it("open room is fully visible", () => {
    const visible = new Set<string>();
    computeFov(5, 5, 3, 10, 10, noWalls, (x, y) => visible.add(`${x},${y}`));
    // Origin and all adjacent should be visible
    assert.ok(visible.has("5,5"));
    assert.ok(visible.has("5,4"));
    assert.ok(visible.has("5,6"));
    assert.ok(visible.has("4,5"));
    assert.ok(visible.has("6,5"));
    // Should have many visible cells in a radius of 3
    assert.ok(visible.size > 20);
  });

  it("corridor with walls limits vision", () => {
    // Walls on left and right of a vertical corridor at x=5
    const wallSet = new Set<string>();
    for (let y = 0; y < 10; y++) {
      wallSet.add(`4,${y}`);
      wallSet.add(`6,${y}`);
    }
    const visible = new Set<string>();
    computeFov(5, 5, 5, 10, 10,
      (x, y) => wallSet.has(`${x},${y}`),
      (x, y) => visible.add(`${x},${y}`),
    );
    // Can see along corridor
    assert.ok(visible.has("5,3"));
    assert.ok(visible.has("5,7"));
    // Should not see through walls
    assert.equal(visible.has("3,5"), false);
    assert.equal(visible.has("7,5"), false);
  });

  it("radius limits distance", () => {
    const visible = new Set<string>();
    computeFov(5, 5, 2, 20, 20, noWalls, (x, y) => visible.add(`${x},${y}`));
    // Far away cells should not be visible
    assert.equal(visible.has("5,0"), false);
    assert.equal(visible.has("0,5"), false);
    assert.equal(visible.has("10,5"), false);
  });

  it("0 radius only sees origin", () => {
    const visible = new Set<string>();
    computeFov(5, 5, 0, 10, 10, noWalls, (x, y) => visible.add(`${x},${y}`));
    assert.equal(visible.size, 1);
    assert.ok(visible.has("5,5"));
  });
});
