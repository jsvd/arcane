// Arcane Engine — Procedural Generation Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/procgen

declare module "@arcane/runtime/procgen" {
  /**
   * Types for the procedural generation module.
   *
   * Wave Function Collapse (WFC) generates grids by propagating adjacency
   * constraints. A tileset defines which tiles can neighbor each other in
   * each cardinal direction. Constraints are checked post-generation and
   * can trigger retries.
   */
  /** Cardinal directions for adjacency rules. */
  export type Direction = "north" | "east" | "south" | "west";
  /** All four cardinal directions, ordered for iteration. */
  export declare const DIRECTIONS: readonly Direction[];
  /** Map a direction to its opposite. */
  export declare const OPPOSITE: Record<Direction, Direction>;
  /** Offsets for each direction: [dx, dy]. North is -y, south is +y. */
  export declare const DIR_OFFSET: Record<Direction, {
      dx: number;
      dy: number;
  }>;
  /**
   * Adjacency rules for a single tile type.
   * Maps each direction to the set of tile IDs that are allowed neighbors.
   */
  export type AdjacencyRule = {
      [dir in Direction]: readonly number[];
  };
  /**
   * A tileset for WFC generation.
   * Maps tile IDs to their adjacency rules and optional weights.
   */
  export type TileSet = {
      /**
       * Map of tile ID to adjacency rules.
       * Each tile defines which other tiles can appear next to it in each direction.
       */
      tiles: Record<number, AdjacencyRule>;
      /**
       * Optional weights for tile selection during collapse.
       * Higher weight = more likely to be chosen. Defaults to 1 for all tiles.
       */
      weights?: Record<number, number>;
  };
  /**
   * A constraint checked after generation. Returns true if the grid is valid.
   * If a constraint returns false, the generation is retried (up to maxRetries).
   */
  export type Constraint = (grid: WFCGrid) => boolean;
  /**
   * Configuration for a WFC generation run.
   */
  export type WFCConfig = {
      /** The tileset defining tile adjacency rules. */
      tileset: TileSet;
      /** Grid width in tiles. Must be > 0. */
      width: number;
      /** Grid height in tiles. Must be > 0. */
      height: number;
      /** PRNG seed for reproducible generation. */
      seed: number;
      /** Post-generation constraints. All must return true. Default: []. */
      constraints?: readonly Constraint[];
      /** Maximum retries if constraints fail or WFC hits a contradiction. Default: 100. */
      maxRetries?: number;
      /** Maximum backtrack steps during a single WFC run before giving up. Default: 1000. */
      maxBacktracks?: number;
  };
  /**
   * The output grid from a WFC generation.
   * A 2D array stored in row-major order (grid[y][x]).
   */
  export type WFCGrid = {
      /** Grid width in tiles. */
      width: number;
      /** Grid height in tiles. */
      height: number;
      /** 2D tile data. Access as tiles[y][x]. Each value is a tile ID from the tileset. */
      tiles: number[][];
  };
  /**
   * Result of a WFC generation attempt.
   */
  export type WFCResult = {
      /** Whether generation succeeded (no contradictions, all constraints met). */
      success: boolean;
      /** The generated grid, or null if generation failed. */
      grid: WFCGrid | null;
      /** Number of retries used before success (or exhaustion). */
      retries: number;
      /** Total time in milliseconds (approximate, using Date.now). */
      elapsed: number;
  };
  /**
   * Configuration for batch generation and testing.
   */
  export type GenerateAndTestConfig = {
      /** WFC configuration (constraints included here apply to every run). */
      wfc: WFCConfig;
      /** Number of levels to generate. */
      iterations: number;
      /** Test function run on each successful generation. Return true if the level passes. */
      testFn: (grid: WFCGrid) => boolean;
  };
  /**
   * Result of a batch generate-and-test run.
   */
  export type GenerateAndTestResult = {
      /** Number of levels that generated and passed the test function. */
      passed: number;
      /** Number of levels that generated but failed the test function. */
      failed: number;
      /** Number of levels that failed to generate (WFC contradiction or constraint failure). */
      generationFailures: number;
      /** Total iterations attempted. */
      total: number;
  };

  /**
   * Pre-built constraints for WFC generation.
   *
   * Constraints are functions `(grid: WFCGrid) => boolean` checked after
   * generation. If any constraint fails, the generation retries.
   *
   * Includes reachability (flood fill), tile count bounds, border enforcement,
   * and support for custom constraint functions.
   */
  /**
   * Reachability constraint: all cells matching `walkableFn` must be connected
   * via flood fill (4-directional adjacency).
   *
   * Useful for ensuring dungeons have no isolated rooms.
   *
   * @param walkableFn - Returns true for tiles that should be reachable.
   * @returns A constraint function.
   *
   * @example
   * ```ts
   * const connected = reachability((tileId) => tileId !== WALL);
   * const result = generate({ ...config, constraints: [connected] });
   * ```
   */
  export declare function reachability(walkableFn: (tileId: number) => boolean): Constraint;
  /**
   * Exact count constraint: the grid must contain exactly `n` cells with the given tile ID.
   *
   * @param tileId - The tile ID to count.
   * @param n - The exact count required.
   * @returns A constraint function.
   */
  export declare function exactCount(tileId: number, n: number): Constraint;
  /**
   * Minimum count constraint: the grid must contain at least `n` cells with the given tile ID.
   *
   * @param tileId - The tile ID to count.
   * @param n - The minimum count required.
   * @returns A constraint function.
   */
  export declare function minCount(tileId: number, n: number): Constraint;
  /**
   * Maximum count constraint: the grid must contain at most `n` cells with the given tile ID.
   *
   * @param tileId - The tile ID to count.
   * @param n - The maximum count allowed.
   * @returns A constraint function.
   */
  export declare function maxCount(tileId: number, n: number): Constraint;
  /**
   * Border constraint: all edge cells must be the given tile ID.
   *
   * @param tileId - The tile ID required on all edges.
   * @returns A constraint function.
   *
   * @example
   * ```ts
   * const wallBorder = border(WALL);
   * const result = generate({ ...config, constraints: [wallBorder] });
   * ```
   */
  export declare function border(tileId: number): Constraint;
  /**
   * Custom constraint: wraps any `(grid) => boolean` function as a Constraint.
   * This is a convenience identity function that provides type safety.
   *
   * @param fn - A function that takes a WFCGrid and returns true if valid.
   * @returns The same function typed as a Constraint.
   */
  export declare function custom(fn: (grid: WFCGrid) => boolean): Constraint;
  /**
   * Count occurrences of a tile ID in a grid. Useful in custom constraints.
   *
   * @param grid - The grid to search.
   * @param tileId - The tile ID to count.
   * @returns Number of cells with the given tile ID.
   */
  export declare function countTile(grid: WFCGrid, tileId: number): number;
  /**
   * Find all positions of a tile ID in a grid. Useful in custom constraints.
   *
   * @param grid - The grid to search.
   * @param tileId - The tile ID to find.
   * @returns Array of {x, y} positions.
   */
  export declare function findTile(grid: WFCGrid, tileId: number): {
      x: number;
      y: number;
  }[];

  /**
   * Validation and batch generation testing for procedural generation.
   *
   * `validateLevel` checks all constraints on a grid.
   * `generateAndTest` runs batch generation with a test function for quality assurance.
   */
  /**
   * Validate a grid against a list of constraints.
   * Returns true if all constraints pass.
   *
   * @param grid - The grid to validate.
   * @param constraints - Array of constraint functions.
   * @returns True if all constraints are satisfied.
   *
   * @example
   * ```ts
   * const valid = validateLevel(grid, [
   *   reachability((id) => id !== WALL),
   *   exactCount(ENTRANCE, 1),
   * ]);
   * ```
   */
  export declare function validateLevel(grid: WFCGrid, constraints: readonly Constraint[]): boolean;
  /**
   * Batch generate levels and run a test function on each.
   * Reports how many generated successfully, passed, and failed.
   *
   * Each iteration uses a different seed: `config.wfc.seed + i`.
   *
   * @param config - Batch generation configuration.
   * @returns Summary of passed, failed, and generation failures.
   *
   * @example
   * ```ts
   * const result = generateAndTest({
   *   wfc: { tileset, width: 20, height: 20, seed: 1, constraints: [connected] },
   *   iterations: 100,
   *   testFn: (grid) => {
   *     const entrances = findTile(grid, ENTRANCE);
   *     return entrances.length === 1;
   *   },
   * });
   * console.log(`${result.passed}/${result.total} levels passed`);
   * ```
   */
  export declare function generateAndTest(config: GenerateAndTestConfig): GenerateAndTestResult;

  /**
   * Wave Function Collapse (WFC) — tile-based procedural generation.
   *
   * Generates a grid by iteratively collapsing cells with the fewest possibilities,
   * then propagating adjacency constraints. Supports backtracking on contradictions
   * and post-generation constraint validation with retries.
   *
   * Uses the existing seeded PRNG from `runtime/state/prng.ts` for reproducibility.
   */
  /**
   * Generate a grid using Wave Function Collapse.
   *
   * The algorithm:
   * 1. Initialize all cells with all tile possibilities.
   * 2. Select the cell with minimum entropy (fewest possibilities).
   * 3. Collapse it to a single tile (weighted random).
   * 4. Propagate constraints to neighbors (remove impossible tiles).
   * 5. If a contradiction is found, backtrack.
   * 6. Repeat until all cells are collapsed.
   * 7. Validate post-generation constraints; retry if needed.
   *
   * @param config - WFC generation configuration.
   * @returns A WFCResult with the generated grid or failure info.
   *
   * @example
   * ```ts
   * const result = generate({
   *   tileset: {
   *     tiles: {
   *       0: { north: [0,1], east: [0,1], south: [0,1], west: [0,1] },
   *       1: { north: [0,1], east: [0,1], south: [0,1], west: [0,1] },
   *     },
   *   },
   *   width: 10,
   *   height: 10,
   *   seed: 42,
   * });
   * if (result.success && result.grid) {
   *   // result.grid.tiles[y][x] contains tile IDs
   * }
   * ```
   */
  export declare function generate(config: WFCConfig): WFCResult;

}
