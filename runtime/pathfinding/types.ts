import type { Vec2 } from "../state/types.ts";

/**
 * A grid abstraction for pathfinding.
 *
 * Provides dimensions and callbacks for walkability and movement cost.
 * Tiles are addressed by integer (x, y) coordinates where (0,0) is the top-left.
 */
export type PathGrid = {
  /** Grid width in tiles. Must be > 0. */
  width: number;
  /** Grid height in tiles. Must be > 0. */
  height: number;
  /**
   * Returns whether the tile at (x, y) can be traversed.
   * @param x - Tile X coordinate, 0..width-1.
   * @param y - Tile Y coordinate, 0..height-1.
   * @returns True if the tile is walkable.
   */
  isWalkable: (x: number, y: number) => boolean;
  /**
   * Optional movement cost for entering the tile at (x, y).
   * If omitted, cardinal moves cost 1 and diagonal moves cost sqrt(2).
   * @param x - Tile X coordinate.
   * @param y - Tile Y coordinate.
   * @returns Movement cost. Must be > 0. Higher values = harder to traverse.
   */
  cost?: (x: number, y: number) => number;
};

/**
 * Options for {@link findPath}.
 */
export type PathOptions = {
  /** Allow diagonal movement (8-directional). Default: false (4-directional). */
  diagonal?: boolean;
  /** Maximum A* iterations before giving up. Default: 10000. Prevents runaway on large grids. */
  maxIterations?: number;
  /**
   * Heuristic function for distance estimation.
   * - `"manhattan"` — sum of axis distances. Best for 4-directional movement. (Default)
   * - `"euclidean"` — straight-line distance. Best for any-angle movement.
   * - `"chebyshev"` — max of axis distances. Best for 8-directional movement.
   */
  heuristic?: "manhattan" | "euclidean" | "chebyshev";
};

/**
 * Result returned by {@link findPath}.
 */
export type PathResult = {
  /** Whether a path from start to goal was found. */
  found: boolean;
  /** Ordered array of tile positions from start to goal (inclusive). Empty if not found. */
  path: Vec2[];
  /** Total movement cost of the path. 0 if not found. */
  cost: number;
  /** Number of tiles explored during the search. Useful for profiling. */
  explored: number;
};
