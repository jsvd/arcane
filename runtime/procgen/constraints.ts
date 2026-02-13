/**
 * Pre-built constraints for WFC generation.
 *
 * Constraints are functions `(grid: WFCGrid) => boolean` checked after
 * generation. If any constraint fails, the generation retries.
 *
 * Includes reachability (flood fill), tile count bounds, border enforcement,
 * and support for custom constraint functions.
 */

import type { WFCGrid, Constraint } from "./types.ts";

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
export function reachability(walkableFn: (tileId: number) => boolean): Constraint {
  return (grid: WFCGrid): boolean => {
    const { width, height, tiles } = grid;

    // Find the first walkable cell
    let startX = -1;
    let startY = -1;
    let totalWalkable = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (walkableFn(tiles[y][x])) {
          totalWalkable++;
          if (startX === -1) {
            startX = x;
            startY = y;
          }
        }
      }
    }

    if (totalWalkable === 0) return true; // No walkable tiles = vacuously connected

    // Flood fill from the first walkable cell
    const visited = new Uint8Array(width * height);
    const stack: number[] = [startY * width + startX];
    visited[startY * width + startX] = 1;
    let reachCount = 0;

    while (stack.length > 0) {
      const idx = stack.pop()!;
      reachCount++;
      const cx = idx % width;
      const cy = (idx / width) | 0;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const ni = ny * width + nx;
        if (visited[ni]) continue;
        if (!walkableFn(tiles[ny][nx])) continue;
        visited[ni] = 1;
        stack.push(ni);
      }
    }

    return reachCount === totalWalkable;
  };
}

/**
 * Exact count constraint: the grid must contain exactly `n` cells with the given tile ID.
 *
 * @param tileId - The tile ID to count.
 * @param n - The exact count required.
 * @returns A constraint function.
 */
export function exactCount(tileId: number, n: number): Constraint {
  return (grid: WFCGrid): boolean => {
    let count = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.tiles[y][x] === tileId) count++;
      }
    }
    return count === n;
  };
}

/**
 * Minimum count constraint: the grid must contain at least `n` cells with the given tile ID.
 *
 * @param tileId - The tile ID to count.
 * @param n - The minimum count required.
 * @returns A constraint function.
 */
export function minCount(tileId: number, n: number): Constraint {
  return (grid: WFCGrid): boolean => {
    let count = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.tiles[y][x] === tileId) count++;
      }
    }
    return count >= n;
  };
}

/**
 * Maximum count constraint: the grid must contain at most `n` cells with the given tile ID.
 *
 * @param tileId - The tile ID to count.
 * @param n - The maximum count allowed.
 * @returns A constraint function.
 */
export function maxCount(tileId: number, n: number): Constraint {
  return (grid: WFCGrid): boolean => {
    let count = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.tiles[y][x] === tileId) count++;
      }
    }
    return count <= n;
  };
}

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
export function border(tileId: number): Constraint {
  return (grid: WFCGrid): boolean => {
    const { width, height, tiles } = grid;

    // Top and bottom rows
    for (let x = 0; x < width; x++) {
      if (tiles[0][x] !== tileId) return false;
      if (tiles[height - 1][x] !== tileId) return false;
    }
    // Left and right columns (skip corners already checked)
    for (let y = 1; y < height - 1; y++) {
      if (tiles[y][0] !== tileId) return false;
      if (tiles[y][width - 1] !== tileId) return false;
    }

    return true;
  };
}

/**
 * Custom constraint: wraps any `(grid) => boolean` function as a Constraint.
 * This is a convenience identity function that provides type safety.
 *
 * @param fn - A function that takes a WFCGrid and returns true if valid.
 * @returns The same function typed as a Constraint.
 */
export function custom(fn: (grid: WFCGrid) => boolean): Constraint {
  return fn;
}

/**
 * Count occurrences of a tile ID in a grid. Useful in custom constraints.
 *
 * @param grid - The grid to search.
 * @param tileId - The tile ID to count.
 * @returns Number of cells with the given tile ID.
 */
export function countTile(grid: WFCGrid, tileId: number): number {
  let count = 0;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.tiles[y][x] === tileId) count++;
    }
  }
  return count;
}

/**
 * Find all positions of a tile ID in a grid. Useful in custom constraints.
 *
 * @param grid - The grid to search.
 * @param tileId - The tile ID to find.
 * @returns Array of {x, y} positions.
 */
export function findTile(grid: WFCGrid, tileId: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.tiles[y][x] === tileId) {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}
