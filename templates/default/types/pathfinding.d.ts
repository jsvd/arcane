// Arcane Engine — Pathfinding Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/pathfinding

declare module "@arcane/runtime/pathfinding" {
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

  /**
   * Find the shortest path between two tiles on a grid using A* search
   * with a binary min-heap for the open set.
   *
   * Returns immediately if start equals goal, or if either endpoint is
   * out of bounds / unwalkable. Stops early if `maxIterations` is exceeded.
   *
   * @param grid - The pathfinding grid with dimensions, walkability, and optional cost function.
   * @param start - Starting tile position (integer coordinates).
   * @param goal - Goal tile position (integer coordinates).
   * @param options - Optional search parameters: diagonal movement, max iterations, heuristic.
   * @returns A {@link PathResult} with `found`, `path`, `cost`, and `explored` count.
   *
   * @example
   * ```ts
   * const grid: PathGrid = {
   *   width: 10, height: 10,
   *   isWalkable: (x, y) => map[y][x] !== "wall",
   * };
   * const result = findPath(grid, { x: 0, y: 0 }, { x: 9, y: 9 }, { diagonal: true });
   * if (result.found) {
   *   for (const step of result.path) {
   *     console.log(`Move to (${step.x}, ${step.y})`);
   *   }
   * }
   * ```
   */
  export declare function findPath(grid: PathGrid, start: Vec2, goal: Vec2, options?: PathOptions): PathResult;

  /**
   * Hex pathfinding — A* and flood-fill reachability on hex grids.
   *
   * Uses cube coordinates (q, r, s) throughout.
   * Reuses the binary min-heap pattern from astar.ts but adapted for hex neighbors.
   */
  /** Grid abstraction for hex pathfinding. */
  export type HexPathGrid = {
      /**
       * Returns whether a hex cell is walkable.
       * @param q - Cube q coordinate.
       * @param r - Cube r coordinate.
       */
      isWalkable: (q: number, r: number) => boolean;
      /**
       * Optional movement cost for entering a hex cell.
       * If omitted, all moves cost 1.
       * @param q - Cube q coordinate.
       * @param r - Cube r coordinate.
       * @returns Movement cost. Must be > 0.
       */
      cost?: (q: number, r: number) => number;
  };
  /** Options for hex pathfinding. */
  export type HexPathOptions = {
      /** Maximum iterations before giving up. Default: 10000. */
      maxIterations?: number;
  };
  /** Result of a hex pathfinding search. */
  export type HexPathResult = {
      /** Whether a path was found. */
      found: boolean;
      /** Ordered array of hex coordinates from start to goal (inclusive). */
      path: HexCoord[];
      /** Total movement cost of the path. */
      cost: number;
      /** Number of cells explored during search. */
      explored: number;
  };
  /**
   * Find the shortest path between two hex cells using A* with hex distance heuristic.
   *
   * Uses the standard hex cube-coordinate distance as an admissible heuristic.
   *
   * @param grid - Hex pathfinding grid (walkability + optional cost).
   * @param start - Starting hex coordinate.
   * @param goal - Goal hex coordinate.
   * @param options - Optional max iterations.
   * @returns HexPathResult with found, path, cost, and explored count.
   *
   * @example
   * ```ts
   * const grid: HexPathGrid = {
   *   isWalkable: (q, r) => terrain.get(`${q},${r}`) !== "water",
   *   cost: (q, r) => terrain.get(`${q},${r}`) === "forest" ? 2 : 1,
   * };
   * const result = findHexPath(grid, hex(0, 0), hex(5, -3));
   * ```
   */
  export declare function findHexPath(grid: HexPathGrid, start: HexCoord, goal: HexCoord, options?: HexPathOptions): HexPathResult;
  /**
   * Find all hex cells reachable from a starting position within a movement budget.
   * Uses breadth-first flood-fill, respecting movement costs.
   *
   * @param grid - Hex pathfinding grid.
   * @param start - Starting hex coordinate.
   * @param movement - Maximum movement budget.
   * @returns Map from hex key ("q,r") to remaining movement at that cell.
   *          Includes the start cell (with full movement budget).
   *
   * @example
   * ```ts
   * const reachable = hexReachable(grid, hex(0, 0), 3);
   * for (const [key, remaining] of reachable) {
   *   const [q, r] = key.split(",").map(Number);
   *   highlightHex(q, r, remaining / 3); // opacity = remaining/max
   * }
   * ```
   */
  export declare function hexReachable(grid: HexPathGrid, start: HexCoord, movement: number): Map<string, number>;
  /**
   * Convert a reachable map (from hexReachable) to an array of HexCoord.
   *
   * @param reachable - Map from hexReachable().
   * @returns Array of reachable hex coordinates.
   */
  export declare function reachableToArray(reachable: Map<string, number>): HexCoord[];

}
