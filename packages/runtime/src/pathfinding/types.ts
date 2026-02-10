import type { Vec2 } from "../state/types.ts";

export type PathGrid = {
  width: number;
  height: number;
  isWalkable: (x: number, y: number) => boolean;
  cost?: (x: number, y: number) => number;
};

export type PathOptions = {
  diagonal?: boolean;
  maxIterations?: number;
  heuristic?: "manhattan" | "euclidean" | "chebyshev";
};

export type PathResult = {
  found: boolean;
  path: Vec2[];
  cost: number;
  explored: number;
};
