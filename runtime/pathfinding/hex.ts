/**
 * Hex pathfinding — A* and flood-fill reachability on hex grids.
 *
 * Uses cube coordinates (q, r, s) throughout.
 * Reuses the binary min-heap pattern from astar.ts but adapted for hex neighbors.
 */

import { hex, hexDistance, hexNeighbors, hexEqual } from "../rendering/hex.ts";
import type { HexCoord } from "../rendering/hex.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Binary min-heap (adapted for hex)
// ---------------------------------------------------------------------------

type HeapEntry = { key: string; f: number };

function heapPush(heap: HeapEntry[], entry: HeapEntry): void {
  heap.push(entry);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].f <= heap[i].f) break;
    const tmp = heap[parent];
    heap[parent] = heap[i];
    heap[i] = tmp;
    i = parent;
  }
}

function heapPop(heap: HeapEntry[]): HeapEntry | undefined {
  const len = heap.length;
  if (len === 0) return undefined;
  const top = heap[0];
  const last = heap[len - 1];
  heap.length = len - 1;
  if (len > 1) {
    heap[0] = last;
    let i = 0;
    const half = heap.length >> 1;
    while (i < half) {
      let child = (i << 1) + 1;
      const right = child + 1;
      if (right < heap.length && heap[right].f < heap[child].f) {
        child = right;
      }
      if (heap[child].f >= heap[i].f) break;
      const tmp = heap[child];
      heap[child] = heap[i];
      heap[i] = tmp;
      i = child;
    }
  }
  return top;
}

function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

// ---------------------------------------------------------------------------
// A* on hex grid
// ---------------------------------------------------------------------------

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
export function findHexPath(
  grid: HexPathGrid,
  start: HexCoord,
  goal: HexCoord,
  options?: HexPathOptions,
): HexPathResult {
  const maxIterations = options?.maxIterations ?? 10000;
  const getCost = grid.cost;

  // Trivial case
  if (hexEqual(start, goal)) {
    return { found: true, path: [start], cost: 0, explored: 0 };
  }

  // Check endpoints
  if (!grid.isWalkable(start.q, start.r) || !grid.isWalkable(goal.q, goal.r)) {
    return { found: false, path: [], cost: 0, explored: 0 };
  }

  const gCost = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const closed = new Set<string>();

  const startKey = hexKey(start.q, start.r);
  const goalKey = hexKey(goal.q, goal.r);

  gCost.set(startKey, 0);
  parent.set(startKey, null);

  const heap: HeapEntry[] = [];
  heapPush(heap, { key: startKey, f: hexDistance(start, goal) });

  let iterations = 0;

  while (heap.length > 0) {
    if (iterations >= maxIterations) {
      return { found: false, path: [], cost: 0, explored: iterations };
    }

    const current = heapPop(heap)!;
    const key = current.key;

    if (closed.has(key)) continue;
    closed.add(key);
    iterations++;

    if (key === goalKey) {
      // Reconstruct path
      const path: HexCoord[] = [];
      let k: string | null = goalKey;
      while (k !== null) {
        const [q, r] = k.split(",").map(Number);
        path.push(hex(q, r));
        k = parent.get(k) ?? null;
      }
      path.reverse();
      return { found: true, path, cost: gCost.get(goalKey)!, explored: iterations };
    }

    // Parse current position
    const [cq, cr] = key.split(",").map(Number);
    const currentG = gCost.get(key)!;

    // Expand neighbors
    const neighbors = hexNeighbors(cq, cr);
    for (const n of neighbors) {
      if (!grid.isWalkable(n.q, n.r)) continue;

      const nKey = hexKey(n.q, n.r);
      if (closed.has(nKey)) continue;

      const moveCost = getCost ? getCost(n.q, n.r) : 1;
      const newG = currentG + moveCost;
      const oldG = gCost.get(nKey);

      if (oldG === undefined || newG < oldG) {
        gCost.set(nKey, newG);
        parent.set(nKey, key);
        const h = hexDistance(n, goal);
        heapPush(heap, { key: nKey, f: newG + h });
      }
    }
  }

  return { found: false, path: [], cost: 0, explored: iterations };
}

// ---------------------------------------------------------------------------
// Movement range (BFS flood-fill)
// ---------------------------------------------------------------------------

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
export function hexReachable(
  grid: HexPathGrid,
  start: HexCoord,
  movement: number,
): Map<string, number> {
  const visited = new Map<string, number>();
  const startKey = hexKey(start.q, start.r);
  visited.set(startKey, movement);

  // BFS with cost tracking
  const queue: Array<{ q: number; r: number; remaining: number }> = [
    { q: start.q, r: start.r, remaining: movement },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = hexNeighbors(current.q, current.r);

    for (const n of neighbors) {
      if (!grid.isWalkable(n.q, n.r)) continue;

      const cost = grid.cost ? grid.cost(n.q, n.r) : 1;
      const remaining = current.remaining - cost;
      if (remaining < 0) continue;

      const nKey = hexKey(n.q, n.r);
      const existing = visited.get(nKey);
      if (existing !== undefined && existing >= remaining) continue;

      visited.set(nKey, remaining);
      queue.push({ q: n.q, r: n.r, remaining });
    }
  }

  return visited;
}

/**
 * Convert a reachable map (from hexReachable) to an array of HexCoord.
 *
 * @param reachable - Map from hexReachable().
 * @returns Array of reachable hex coordinates.
 */
export function reachableToArray(reachable: Map<string, number>): HexCoord[] {
  const result: HexCoord[] = [];
  for (const key of reachable.keys()) {
    const [q, r] = key.split(",").map(Number);
    result.push(hex(q, r));
  }
  return result;
}
