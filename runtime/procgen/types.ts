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
export const DIRECTIONS: readonly Direction[] = ["north", "east", "south", "west"] as const;

/** Map a direction to its opposite. */
export const OPPOSITE: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

/** Offsets for each direction: [dx, dy]. North is -y, south is +y. */
export const DIR_OFFSET: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

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
