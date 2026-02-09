import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { applyRule } from "../../runtime/systems/index.ts";
import {
  createGridCell,
  createGridState,
  createPathGrid,
  getEntityAt,
  getEntitiesInRange,
  isWalkable,
  manhattanDistance,
  gridMovementSystem,
} from "./grid.ts";
import type { GridEntity, GridState } from "./types.ts";

function makeEntity(id: string, x: number, y: number, blocks = true, speed = 3): GridEntity {
  return { id, pos: { x, y }, blocksMovement: blocks, movementSpeed: speed };
}

function stateWith(entities: GridEntity[], width = 5, height = 5): GridState {
  const state = createGridState(width, height);
  return { ...state, entities };
}

describe("createGridState", () => {
  it("creates correct dimensions", () => {
    const state = createGridState(4, 3);
    assert.equal(state.width, 4);
    assert.equal(state.height, 3);
    assert.equal(state.cells.length, 3);
    assert.equal(state.cells[0].length, 4);
    assert.equal(state.entities.length, 0);
  });

  it("uses default floor cell", () => {
    const state = createGridState(2, 2);
    assert.equal(state.cells[0][0].type, "floor");
    assert.equal(state.cells[0][0].walkable, true);
    assert.equal(state.cells[0][0].movementCost, 1);
  });

  it("accepts custom default cell", () => {
    const cell = createGridCell("water");
    const state = createGridState(2, 2, cell);
    assert.equal(state.cells[0][0].type, "water");
    assert.equal(state.cells[0][0].movementCost, 2);
  });
});

describe("createPathGrid", () => {
  it("produces a valid PathGrid", () => {
    const state = createGridState(5, 5);
    const pg = createPathGrid(state);
    assert.equal(pg.width, 5);
    assert.equal(pg.height, 5);
    assert.ok(pg.isWalkable(0, 0));
    assert.equal(pg.cost!(0, 0), 1);
  });

  it("reports blocked cells from entities", () => {
    const state = stateWith([makeEntity("a", 2, 2)]);
    const pg = createPathGrid(state);
    assert.equal(pg.isWalkable(2, 2), false);
    assert.ok(pg.isWalkable(1, 1));
  });
});

describe("move-entity", () => {
  it("moves to valid target", () => {
    const state = stateWith([makeEntity("p", 0, 0)]);
    const result = applyRule(gridMovementSystem, "move-entity", state, {
      entityId: "p",
      target: { x: 1, y: 0 },
    });
    assert.ok(result.ok);
    assert.equal(result.state.entities[0].pos.x, 1);
    assert.equal(result.state.entities[0].pos.y, 0);
  });

  it("rejects out-of-bounds", () => {
    const state = stateWith([makeEntity("p", 0, 0)]);
    const result = applyRule(gridMovementSystem, "move-entity", state, {
      entityId: "p",
      target: { x: -1, y: 0 },
    });
    assert.equal(result.ok, false);
  });

  it("rejects unwalkable cell", () => {
    const state = stateWith([makeEntity("p", 0, 0)]);
    const cells = state.cells.map((row) => row.map((c) => ({ ...c })));
    cells[0][1] = createGridCell("wall");
    const blocked = { ...state, cells };
    const result = applyRule(gridMovementSystem, "move-entity", blocked, {
      entityId: "p",
      target: { x: 1, y: 0 },
    });
    assert.equal(result.ok, false);
  });

  it("rejects occupied cell", () => {
    const state = stateWith([makeEntity("p", 0, 0), makeEntity("q", 1, 0)]);
    const result = applyRule(gridMovementSystem, "move-entity", state, {
      entityId: "p",
      target: { x: 1, y: 0 },
    });
    assert.equal(result.ok, false);
  });
});

describe("move-along-path", () => {
  it("follows path", () => {
    const state = stateWith([makeEntity("p", 0, 0, true, 5)]);
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    const result = applyRule(gridMovementSystem, "move-along-path", state, {
      entityId: "p",
      path,
    });
    assert.ok(result.ok);
    assert.equal(result.state.entities[0].pos.x, 3);
    assert.equal(result.state.entities[0].pos.y, 0);
  });

  it("respects movementSpeed", () => {
    const state = stateWith([makeEntity("p", 0, 0, true, 2)]);
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }];
    const result = applyRule(gridMovementSystem, "move-along-path", state, {
      entityId: "p",
      path,
    });
    assert.ok(result.ok);
    // Speed 2, cost 1 per cell = can move 2 cells
    assert.equal(result.state.entities[0].pos.x, 2);
  });

  it("respects movement costs", () => {
    const state = stateWith([makeEntity("p", 0, 0, true, 3)]);
    // Make cell (1,0) cost 2 (water)
    const cells = state.cells.map((row) => row.map((c) => ({ ...c })));
    cells[0][1] = createGridCell("water"); // cost 2
    const expensive = { ...state, cells };
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    const result = applyRule(gridMovementSystem, "move-along-path", expensive, {
      entityId: "p",
      path,
    });
    assert.ok(result.ok);
    // Water costs 2, then floor costs 1 = 3 total, speed 3, so reach (2,0)
    assert.equal(result.state.entities[0].pos.x, 2);
  });
});

describe("spawn-entity", () => {
  it("adds entity", () => {
    const state = createGridState(5, 5);
    const entity = makeEntity("new", 2, 2);
    const result = applyRule(gridMovementSystem, "spawn-entity", state, { entity });
    assert.ok(result.ok);
    assert.equal(result.state.entities.length, 1);
    assert.equal(result.state.entities[0].id, "new");
  });

  it("rejects invalid position", () => {
    const state = createGridState(5, 5);
    const entity = makeEntity("new", 10, 10);
    const result = applyRule(gridMovementSystem, "spawn-entity", state, { entity });
    assert.equal(result.ok, false);
  });
});

describe("despawn-entity", () => {
  it("removes entity", () => {
    const state = stateWith([makeEntity("p", 0, 0)]);
    const result = applyRule(gridMovementSystem, "despawn-entity", state, { entityId: "p" });
    assert.ok(result.ok);
    assert.equal(result.state.entities.length, 0);
  });

  it("fails for unknown entity", () => {
    const state = stateWith([makeEntity("p", 0, 0)]);
    const result = applyRule(gridMovementSystem, "despawn-entity", state, { entityId: "ghost" });
    assert.equal(result.ok, false);
  });
});

describe("query functions", () => {
  it("getEntityAt finds entity", () => {
    const state = stateWith([makeEntity("p", 2, 3)]);
    const e = getEntityAt(state, { x: 2, y: 3 });
    assert.ok(e);
    assert.equal(e!.id, "p");
  });

  it("getEntityAt returns undefined for empty cell", () => {
    const state = stateWith([makeEntity("p", 2, 3)]);
    const e = getEntityAt(state, { x: 0, y: 0 });
    assert.equal(e, undefined);
  });

  it("getEntitiesInRange finds nearby entities", () => {
    const state = stateWith([
      makeEntity("a", 2, 2),
      makeEntity("b", 3, 2),
      makeEntity("c", 0, 0),
    ]);
    const nearby = getEntitiesInRange(state, { x: 2, y: 2 }, 1);
    assert.equal(nearby.length, 2);
    const ids = nearby.map((e) => e.id).sort();
    assert.deepEqual(ids, ["a", "b"]);
  });

  it("isWalkable checks cell type", () => {
    const state = createGridState(5, 5);
    assert.ok(isWalkable(state, 0, 0));
    assert.equal(isWalkable(state, -1, 0), false);
    assert.equal(isWalkable(state, 5, 0), false);
  });

  it("manhattanDistance computes correctly", () => {
    assert.equal(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 7);
    assert.equal(manhattanDistance({ x: 1, y: 1 }, { x: 1, y: 1 }), 0);
    assert.equal(manhattanDistance({ x: 5, y: 0 }, { x: 0, y: 5 }), 10);
  });
});
