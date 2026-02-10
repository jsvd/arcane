import type { Vec2 } from "../state/types.ts";
import type { PathGrid, PathOptions, PathResult } from "./types.ts";

// Cardinal directions: right, down, left, up
const CARDINAL_DX = [1, 0, -1, 0];
const CARDINAL_DY = [0, 1, 0, -1];

// Diagonal directions (appended after cardinal)
const DIAGONAL_DX = [1, 1, -1, -1];
const DIAGONAL_DY = [1, -1, 1, -1];

const SQRT2 = Math.SQRT2;

// --- Binary min-heap ---

type HeapEntry = { index: number; f: number };

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

// --- Heuristics ---

function manhattan(dx: number, dy: number): number {
  return Math.abs(dx) + Math.abs(dy);
}

function euclidean(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

function chebyshev(dx: number, dy: number): number {
  return Math.max(Math.abs(dx), Math.abs(dy));
}

function selectHeuristic(name: string): (dx: number, dy: number) => number {
  if (name === "euclidean") return euclidean;
  if (name === "chebyshev") return chebyshev;
  return manhattan;
}

// --- A* ---

export function findPath(
  grid: PathGrid,
  start: Vec2,
  goal: Vec2,
  options?: PathOptions,
): PathResult {
  const diagonal = options?.diagonal ?? false;
  const maxIterations = options?.maxIterations ?? 10000;
  const heuristic = selectHeuristic(options?.heuristic ?? "manhattan");

  const { width, height, isWalkable } = grid;
  const getCost = grid.cost;

  const sx = start.x | 0;
  const sy = start.y | 0;
  const gx = goal.x | 0;
  const gy = goal.y | 0;

  // Trivial case
  if (sx === gx && sy === gy) {
    return { found: true, path: [{ x: sx, y: sy }], cost: 0, explored: 0 };
  }

  // Out of bounds or unwalkable endpoints
  if (
    sx < 0 || sx >= width || sy < 0 || sy >= height ||
    gx < 0 || gx >= width || gy < 0 || gy >= height ||
    !isWalkable(sx, sy) || !isWalkable(gx, gy)
  ) {
    return { found: false, path: [], cost: 0, explored: 0 };
  }

  const size = width * height;
  const gCost = new Float64Array(size);
  const parentIdx = new Int32Array(size);
  const closed = new Uint8Array(size);

  // Initialize g-costs to infinity
  gCost.fill(Infinity);

  const startIdx = sy * width + sx;
  const goalIdx = gy * width + gx;
  gCost[startIdx] = 0;
  parentIdx[startIdx] = -1;

  const heap: HeapEntry[] = [];
  heapPush(heap, { index: startIdx, f: heuristic(gx - sx, gy - sy) });

  const numCardinal = 4;
  const numDirs = diagonal ? 8 : 4;

  let iterations = 0;

  while (heap.length > 0) {
    if (iterations >= maxIterations) {
      return { found: false, path: [], cost: 0, explored: iterations };
    }

    const current = heapPop(heap)!;
    const ci = current.index;

    if (closed[ci]) continue;
    closed[ci] = 1;
    iterations++;

    if (ci === goalIdx) {
      // Reconstruct path
      const path: Vec2[] = [];
      let idx = goalIdx;
      while (idx !== -1) {
        path.push({ x: idx % width, y: (idx / width) | 0 });
        idx = parentIdx[idx];
      }
      path.reverse();
      return { found: true, path, cost: gCost[goalIdx], explored: iterations };
    }

    const cx = ci % width;
    const cy = (ci / width) | 0;

    for (let d = 0; d < numDirs; d++) {
      let nx: number, ny: number;
      let isDiag: boolean;
      if (d < numCardinal) {
        nx = cx + CARDINAL_DX[d];
        ny = cy + CARDINAL_DY[d];
        isDiag = false;
      } else {
        nx = cx + DIAGONAL_DX[d - numCardinal];
        ny = cy + DIAGONAL_DY[d - numCardinal];
        isDiag = true;
      }

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (!isWalkable(nx, ny)) continue;

      const ni = ny * width + nx;
      if (closed[ni]) continue;

      const moveCost = getCost
        ? getCost(nx, ny)
        : (isDiag ? SQRT2 : 1);

      const newG = gCost[ci] + moveCost;
      if (newG < gCost[ni]) {
        gCost[ni] = newG;
        parentIdx[ni] = ci;
        const h = heuristic(gx - nx, gy - ny);
        heapPush(heap, { index: ni, f: newG + h });
      }
    }
  }

  return { found: false, path: [], cost: 0, explored: iterations };
}
