import type { Vec2 } from "../../runtime/state/types.ts";
import type { PathGrid } from "../../runtime/pathfinding/types.ts";
import { system, rule } from "../../runtime/systems/index.ts";
import type { GridCell, GridEntity, GridState, CellType } from "./types.ts";

// --- Factory functions ---

export function createGridCell(
  type: CellType,
  walkable?: boolean,
  movementCost?: number,
): GridCell {
  const defaults: Record<CellType, { walkable: boolean; movementCost: number }> = {
    floor: { walkable: true, movementCost: 1 },
    wall: { walkable: false, movementCost: Infinity },
    water: { walkable: true, movementCost: 2 },
    custom: { walkable: true, movementCost: 1 },
  };
  const d = defaults[type];
  return {
    type,
    walkable: walkable ?? d.walkable,
    movementCost: movementCost ?? d.movementCost,
  };
}

export function createGridState(
  width: number,
  height: number,
  defaultCell?: GridCell,
): GridState {
  const cell = defaultCell ?? createGridCell("floor");
  const row = Array.from({ length: width }, () => ({ ...cell }));
  const cells = Array.from({ length: height }, () => [...row.map((c) => ({ ...c }))]);
  return {
    width,
    height,
    cells,
    entities: [],
    costOverrides: {},
  };
}

// --- PathGrid adapter ---

export function createPathGrid(state: GridState): PathGrid {
  return {
    width: state.width,
    height: state.height,
    isWalkable(x: number, y: number): boolean {
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
      if (!state.cells[y][x].walkable) return false;
      return !state.entities.some(
        (e) => e.pos.x === x && e.pos.y === y && e.blocksMovement,
      );
    },
    cost(x: number, y: number): number {
      return state.cells[y][x].movementCost;
    },
  };
}

// --- Query functions ---

export function getEntityAt(
  state: GridState,
  pos: Vec2,
): GridEntity | undefined {
  return state.entities.find((e) => e.pos.x === pos.x && e.pos.y === pos.y);
}

export function getEntitiesInRange(
  state: GridState,
  center: Vec2,
  range: number,
): GridEntity[] {
  return state.entities.filter(
    (e) => manhattanDistance(e.pos, center) <= range,
  );
}

export function isWalkable(state: GridState, x: number, y: number): boolean {
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
  return state.cells[y][x].walkable;
}

export function manhattanDistance(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// --- Helper: in-bounds check ---

function inBounds(state: GridState, x: number, y: number): boolean {
  return x >= 0 && x < state.width && y >= 0 && y < state.height;
}

// --- Rules ---

const moveEntity = rule<GridState>("move-entity")
  .when((state, args) => {
    const target = args.target as Vec2;
    const entityId = args.entityId as string;
    if (!inBounds(state, target.x, target.y)) return false;
    if (!state.cells[target.y][target.x].walkable) return false;
    // Target must be unoccupied (except by the entity itself)
    const occupant = state.entities.find(
      (e) => e.pos.x === target.x && e.pos.y === target.y && e.blocksMovement,
    );
    if (occupant && occupant.id !== entityId) return false;
    // Entity must exist
    return state.entities.some((e) => e.id === entityId);
  })
  .then((state, args) => {
    const target = args.target as Vec2;
    const entityId = args.entityId as string;
    return {
      ...state,
      entities: state.entities.map((e) =>
        e.id === entityId ? { ...e, pos: { x: target.x, y: target.y } } : e,
      ),
    };
  });

const moveAlongPath = rule<GridState>("move-along-path")
  .when((state, args) => {
    const entityId = args.entityId as string;
    const path = args.path as Vec2[];
    if (!path || path.length === 0) return false;
    return state.entities.some((e) => e.id === entityId);
  })
  .then((state, args) => {
    const entityId = args.entityId as string;
    const path = args.path as Vec2[];
    const entity = state.entities.find((e) => e.id === entityId)!;
    const speed = state.costOverrides[entityId] ?? entity.movementSpeed;

    let costSpent = 0;
    let lastReachable = entity.pos;

    for (const step of path) {
      if (!inBounds(state, step.x, step.y)) break;
      if (!state.cells[step.y][step.x].walkable) break;
      const stepCost = state.cells[step.y][step.x].movementCost;
      if (costSpent + stepCost > speed) break;
      costSpent += stepCost;
      lastReachable = step;
    }

    return {
      ...state,
      entities: state.entities.map((e) =>
        e.id === entityId
          ? { ...e, pos: { x: lastReachable.x, y: lastReachable.y } }
          : e,
      ),
    };
  });

const spawnEntity = rule<GridState>("spawn-entity")
  .when((state, args) => {
    const entity = args.entity as GridEntity;
    if (!inBounds(state, entity.pos.x, entity.pos.y)) return false;
    return state.cells[entity.pos.y][entity.pos.x].walkable;
  })
  .then((state, args) => {
    const entity = args.entity as GridEntity;
    return {
      ...state,
      entities: [...state.entities, entity],
    };
  });

const despawnEntity = rule<GridState>("despawn-entity")
  .when((state, args) => {
    const entityId = args.entityId as string;
    return state.entities.some((e) => e.id === entityId);
  })
  .then((state, args) => {
    const entityId = args.entityId as string;
    return {
      ...state,
      entities: state.entities.filter((e) => e.id !== entityId),
    };
  });

// --- System ---

export const gridMovementSystem = system<GridState>("grid-movement", [
  moveEntity,
  moveAlongPath,
  spawnEntity,
  despawnEntity,
]);
