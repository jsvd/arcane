import type { Vec2 } from "../../runtime/state/types.ts";

export type CellType = "floor" | "wall" | "water" | "custom";

export type GridCell = {
  type: CellType;
  walkable: boolean;
  movementCost: number;
};

export type GridEntity = {
  id: string;
  pos: Vec2;
  blocksMovement: boolean;
  movementSpeed: number;
};

export type GridState = {
  width: number;
  height: number;
  cells: readonly (readonly GridCell[])[];  // cells[y][x]
  entities: readonly GridEntity[];
  costOverrides: Record<string, number>;  // entity ID → cost override
};
