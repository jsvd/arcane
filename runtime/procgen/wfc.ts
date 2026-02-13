/**
 * Wave Function Collapse (WFC) — tile-based procedural generation.
 *
 * Generates a grid by iteratively collapsing cells with the fewest possibilities,
 * then propagating adjacency constraints. Supports backtracking on contradictions
 * and post-generation constraint validation with retries.
 *
 * Uses the existing seeded PRNG from `runtime/state/prng.ts` for reproducibility.
 */

import { seed as prngSeed, randomFloat, randomInt } from "../state/prng.ts";
import type { PRNGState } from "../state/prng.ts";
import type {
  TileSet,
  WFCConfig,
  WFCGrid,
  WFCResult,
  Direction,
  Constraint,
} from "./types.ts";
import { DIRECTIONS, DIR_OFFSET, OPPOSITE } from "./types.ts";

// ---------------------------------------------------------------------------
// Internal cell state
// ---------------------------------------------------------------------------

/** A cell in the WFC grid, tracking which tiles are still possible. */
type Cell = {
  /** Bitset of possible tile IDs (indices into tileIds array). */
  possible: boolean[];
  /** Number of remaining possibilities. 0 = contradiction, 1 = collapsed. */
  count: number;
  /** The collapsed tile ID, or -1 if not yet collapsed. */
  collapsed: number;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
export function generate(config: WFCConfig): WFCResult {
  const startTime = Date.now();
  const maxRetries = config.maxRetries ?? 100;
  const constraints = config.constraints ?? [];

  for (let retry = 0; retry <= maxRetries; retry++) {
    // Each retry uses a different seed derived from the base seed + retry count
    const rngSeed = config.seed + retry;
    const result = runWFC(config, rngSeed);

    if (result === null) {
      // Contradiction — retry
      continue;
    }

    // Check post-generation constraints
    if (checkConstraints(result, constraints)) {
      return {
        success: true,
        grid: result,
        retries: retry,
        elapsed: Date.now() - startTime,
      };
    }
    // Constraints failed — retry
  }

  return {
    success: false,
    grid: null,
    retries: maxRetries + 1,
    elapsed: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// Core WFC algorithm
// ---------------------------------------------------------------------------

function runWFC(config: WFCConfig, rngSeed: number): WFCGrid | null {
  const { tileset, width, height } = config;
  const maxBacktracks = config.maxBacktracks ?? 1000;

  const tileIds = Object.keys(tileset.tiles).map(Number);
  const numTiles = tileIds.length;

  if (numTiles === 0) return null;

  // Build tile index lookup: tileId -> index in tileIds array
  const tileIndex = new Map<number, number>();
  for (let i = 0; i < numTiles; i++) {
    tileIndex.set(tileIds[i], i);
  }

  // Precompute adjacency as index-based sets for fast lookup
  // allowed[direction][tileIndex] = Set of allowed neighbor tile indices
  const allowed: Map<number, Set<number>>[][] = [];
  for (const dir of DIRECTIONS) {
    const dirMap: Map<number, Set<number>>[] = [];
    for (let ti = 0; ti < numTiles; ti++) {
      const rule = tileset.tiles[tileIds[ti]];
      const neighborSet = new Set<number>();
      for (const neighborId of rule[dir]) {
        const ni = tileIndex.get(neighborId);
        if (ni !== undefined) {
          neighborSet.add(ni);
        }
      }
      dirMap.push(new Map([[ti, neighborSet]]));
    }
    allowed.push(dirMap);
  }

  // Build faster adjacency: for each direction, allowed[dirIdx][tileIdx] = Set<tileIdx>
  const adjSets: Set<number>[][] = [];
  for (let d = 0; d < 4; d++) {
    const dirSets: Set<number>[] = [];
    for (let ti = 0; ti < numTiles; ti++) {
      const rule = tileset.tiles[tileIds[ti]];
      const dir = DIRECTIONS[d];
      const s = new Set<number>();
      for (const neighborId of rule[dir]) {
        const ni = tileIndex.get(neighborId);
        if (ni !== undefined) s.add(ni);
      }
      dirSets.push(s);
    }
    adjSets.push(dirSets);
  }

  // Precompute weights
  const weights: number[] = [];
  for (let ti = 0; ti < numTiles; ti++) {
    weights.push(tileset.weights?.[tileIds[ti]] ?? 1);
  }

  // Initialize grid cells
  const cells: Cell[] = new Array(width * height);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = {
      possible: new Array(numTiles).fill(true),
      count: numTiles,
      collapsed: -1,
    };
  }

  let rng = prngSeed(rngSeed);
  let backtracks = 0;

  // Backtracking stack: stores snapshots before each collapse
  type Snapshot = {
    cellIndex: number;
    cellsBefore: { possible: boolean[]; count: number; collapsed: number }[];
    rngBefore: PRNGState;
    excludeTile: number; // tile index that was tried and failed
  };
  const stack: Snapshot[] = [];

  // Main loop: collapse one cell at a time
  for (let step = 0; step < width * height; step++) {
    // Find uncollapsed cell with minimum entropy (fewest possibilities)
    let minCount = numTiles + 1;
    let minCells: number[] = [];

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.collapsed !== -1) continue;
      if (c.count < minCount) {
        minCount = c.count;
        minCells = [i];
      } else if (c.count === minCount) {
        minCells.push(i);
      }
    }

    if (minCells.length === 0) break; // All collapsed

    if (minCount === 0) {
      // Contradiction — try to backtrack
      if (!backtrack()) return null;
      step--; // Retry this step
      continue;
    }

    // Pick a random cell among those with minimum entropy
    let chosenIdx: number;
    if (minCells.length === 1) {
      chosenIdx = minCells[0];
    } else {
      let ri: number;
      [ri, rng] = randomInt(rng, 0, minCells.length - 1);
      chosenIdx = minCells[ri];
    }

    const cell = cells[chosenIdx];

    // Save snapshot for backtracking
    const snapshot: Snapshot = {
      cellIndex: chosenIdx,
      cellsBefore: cells.map((c) => ({
        possible: [...c.possible],
        count: c.count,
        collapsed: c.collapsed,
      })),
      rngBefore: { ...rng },
      excludeTile: -1,
    };

    // Collapse: pick a tile weighted by weights
    const tileIdx = weightedPick(cell.possible, weights, rng);
    if (tileIdx === -1) {
      // No valid tile — contradiction
      if (!backtrack()) return null;
      step--;
      continue;
    }
    let rf: number;
    [rf, rng] = randomFloat(rng); // Advance RNG after pick

    snapshot.excludeTile = tileIdx;
    stack.push(snapshot);

    // Collapse the cell
    collapseCell(cell, tileIdx, numTiles);

    // Propagate constraints
    if (!propagate(chosenIdx, cells, width, height, numTiles, adjSets)) {
      // Contradiction during propagation — backtrack
      if (!backtrack()) return null;
      step--;
      continue;
    }
  }

  // Check for any uncollapsed cells (shouldn't happen if algorithm is correct)
  for (const cell of cells) {
    if (cell.collapsed === -1) return null;
  }

  // Build output grid
  const tiles: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(tileIds[cells[y * width + x].collapsed]);
    }
    tiles.push(row);
  }

  return { width, height, tiles };

  // --- Backtracking ---
  function backtrack(): boolean {
    while (stack.length > 0) {
      backtracks++;
      if (backtracks > maxBacktracks) return false;

      const snap = stack.pop()!;
      // Restore state
      for (let i = 0; i < cells.length; i++) {
        cells[i].possible = snap.cellsBefore[i].possible;
        cells[i].count = snap.cellsBefore[i].count;
        cells[i].collapsed = snap.cellsBefore[i].collapsed;
      }
      rng = snap.rngBefore;

      // Remove the failed tile from possibilities
      const cell = cells[snap.cellIndex];
      if (cell.possible[snap.excludeTile]) {
        cell.possible[snap.excludeTile] = false;
        cell.count--;
      }

      if (cell.count > 0) {
        // There are still options — retry this cell
        return true;
      }
      // No options left — continue backtracking up the stack
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collapseCell(cell: Cell, tileIdx: number, numTiles: number): void {
  for (let i = 0; i < numTiles; i++) {
    cell.possible[i] = i === tileIdx;
  }
  cell.count = 1;
  cell.collapsed = tileIdx;
}

/**
 * Propagate constraints from a newly collapsed cell.
 * Uses a worklist algorithm to spread changes.
 * Returns false if a contradiction is found.
 */
function propagate(
  startIdx: number,
  cells: Cell[],
  width: number,
  height: number,
  numTiles: number,
  adjSets: Set<number>[][],
): boolean {
  const worklist: number[] = [startIdx];
  const inWorklist = new Uint8Array(width * height);
  inWorklist[startIdx] = 1;

  while (worklist.length > 0) {
    const ci = worklist.pop()!;
    inWorklist[ci] = 0;
    const cx = ci % width;
    const cy = (ci / width) | 0;
    const cell = cells[ci];

    for (let d = 0; d < 4; d++) {
      const dir = DIRECTIONS[d];
      const offset = DIR_OFFSET[dir];
      const nx = cx + offset.dx;
      const ny = cy + offset.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const ni = ny * width + nx;
      const neighbor = cells[ni];
      if (neighbor.collapsed !== -1) continue; // Already collapsed

      let changed = false;

      // For each possible tile in the neighbor, check if at least one
      // tile in the current cell allows it as a neighbor in this direction
      for (let nt = 0; nt < numTiles; nt++) {
        if (!neighbor.possible[nt]) continue;

        // Check: is there any tile in `cell` that allows `nt` in direction `d`?
        let allowed = false;
        for (let ct = 0; ct < numTiles; ct++) {
          if (!cell.possible[ct]) continue;
          if (adjSets[d][ct].has(nt)) {
            allowed = true;
            break;
          }
        }

        if (!allowed) {
          neighbor.possible[nt] = false;
          neighbor.count--;
          changed = true;

          if (neighbor.count === 0) return false; // Contradiction
        }
      }

      if (changed && !inWorklist[ni]) {
        worklist.push(ni);
        inWorklist[ni] = 1;
      }
    }
  }

  return true;
}

/**
 * Pick a tile index weighted by the weights array.
 * Only considers tiles where possible[i] is true.
 */
function weightedPick(
  possible: boolean[],
  weights: number[],
  rng: PRNGState,
): number {
  let totalWeight = 0;
  for (let i = 0; i < possible.length; i++) {
    if (possible[i]) totalWeight += weights[i];
  }

  if (totalWeight <= 0) return -1;

  const [rand] = randomFloat(rng);
  let target = rand * totalWeight;

  for (let i = 0; i < possible.length; i++) {
    if (!possible[i]) continue;
    target -= weights[i];
    if (target <= 0) return i;
  }

  // Fallback: return last possible
  for (let i = possible.length - 1; i >= 0; i--) {
    if (possible[i]) return i;
  }

  return -1;
}

/**
 * Check all post-generation constraints.
 */
function checkConstraints(grid: WFCGrid, constraints: readonly Constraint[]): boolean {
  for (const constraint of constraints) {
    if (!constraint(grid)) return false;
  }
  return true;
}
