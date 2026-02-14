/**
 * Hexagonal coordinate system.
 *
 * Uses cube coordinates (q, r, s) as the canonical representation,
 * with conversions to/from offset coordinates and world (pixel) space.
 * Supports both pointy-top and flat-top orientations.
 *
 * Reference: Red Blob Games hex grid guide.
 *
 * Invariant: q + r + s = 0 always.
 */

import type { CameraState } from "./types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cube coordinates for a hex cell. Invariant: q + r + s = 0. */
export type HexCoord = {
  readonly q: number;
  readonly r: number;
  readonly s: number;
};

/** Hex grid orientation. */
export type HexOrientation = "pointy" | "flat";

/** Offset coordinate scheme for rectangular grid storage. */
export type OffsetType = "odd-r" | "even-r" | "odd-q" | "even-q";

/** Configuration for hex grid layout. */
export type HexConfig = {
  /** Hex cell size (distance from center to corner). */
  hexSize: number;
  /** Orientation: "pointy" (pointy-top) or "flat" (flat-top). */
  orientation: HexOrientation;
};

// ---------------------------------------------------------------------------
// Cube coordinate creation / validation
// ---------------------------------------------------------------------------

/**
 * Create a hex cube coordinate. Computes s = -q - r automatically.
 *
 * @param q - Cube q coordinate.
 * @param r - Cube r coordinate.
 * @returns HexCoord with s = -q - r.
 */
export function hex(q: number, r: number): HexCoord {
  return { q, r, s: -q - r };
}

/**
 * Create a hex coordinate from all three cube components.
 * Validates the q + r + s = 0 constraint (allows small floating-point error).
 *
 * @param q - Cube q.
 * @param r - Cube r.
 * @param s - Cube s.
 * @returns HexCoord.
 * @throws If q + r + s is not approximately 0.
 */
export function hexFromCube(q: number, r: number, s: number): HexCoord {
  if (Math.abs(q + r + s) > 0.01) {
    throw new Error(`Invalid cube coordinates: q=${q}, r=${r}, s=${s} (q+r+s must equal 0)`);
  }
  return { q, r, s };
}

/**
 * Check equality of two hex coordinates.
 */
export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}

/**
 * Add two hex coordinates.
 */
export function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}

/**
 * Subtract hex coordinate b from a.
 */
export function hexSubtract(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q - b.q, r: a.r - b.r, s: a.s - b.s };
}

/**
 * Multiply a hex coordinate by a scalar.
 */
export function hexScale(h: HexCoord, k: number): HexCoord {
  return { q: h.q * k, r: h.r * k, s: h.s * k };
}

// ---------------------------------------------------------------------------
// Neighbors
// ---------------------------------------------------------------------------

/** The 6 hex direction vectors in cube coordinates. */
const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0, s: -1 },   // 0: east
  { q: 1, r: -1, s: 0 },   // 1: northeast
  { q: 0, r: -1, s: 1 },   // 2: northwest
  { q: -1, r: 0, s: 1 },   // 3: west
  { q: -1, r: 1, s: 0 },   // 4: southwest
  { q: 0, r: 1, s: -1 },   // 5: southeast
];

/**
 * Get the hex direction vector for a direction index (0-5).
 *
 * Directions (pointy-top): 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE.
 */
export function hexDirection(dir: number): HexCoord {
  return HEX_DIRECTIONS[((dir % 6) + 6) % 6];
}

/**
 * Get the neighbor of a hex in the given direction (0-5).
 */
export function hexNeighbor(h: HexCoord, dir: number): HexCoord {
  const d = hexDirection(dir);
  return hexAdd(h, d);
}

/**
 * Get all 6 neighbors of a hex cell.
 *
 * @param q - Cube q coordinate.
 * @param r - Cube r coordinate.
 * @returns Array of 6 HexCoord neighbors.
 */
export function hexNeighbors(q: number, r: number): HexCoord[] {
  const h = hex(q, r);
  return HEX_DIRECTIONS.map((d) => hexAdd(h, d));
}

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

/**
 * Manhattan distance between two hex cells in cube coordinates.
 * This equals the minimum number of hex steps to travel between them.
 *
 * @param a - First hex coordinate.
 * @param b - Second hex coordinate.
 * @returns Hex distance (non-negative integer for integer coords).
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

// ---------------------------------------------------------------------------
// Ring and spiral
// ---------------------------------------------------------------------------

/**
 * Get all hex cells at exactly `radius` steps from center.
 * Returns cells in ring order (clockwise starting from the east-northeast direction).
 *
 * @param center - Center hex.
 * @param radius - Ring radius. Must be >= 0. Radius 0 returns [center].
 * @returns Array of hex coordinates forming the ring.
 */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center];

  const results: HexCoord[] = [];
  // Start at center + direction[4] * radius (southwest corner)
  let current = hexAdd(center, hexScale(hexDirection(4), radius));

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      results.push(current);
      current = hexNeighbor(current, side);
    }
  }

  return results;
}

/**
 * Get all hex cells within `radius` steps from center (inclusive).
 * Returns cells in spiral order: center first, then ring 1, ring 2, etc.
 *
 * @param center - Center hex.
 * @param radius - Maximum ring radius. Must be >= 0.
 * @returns Array of hex coordinates in spiral order.
 */
export function hexSpiral(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [center];
  for (let r = 1; r <= radius; r++) {
    const ring = hexRing(center, r);
    for (const h of ring) {
      results.push(h);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Line drawing
// ---------------------------------------------------------------------------

/**
 * Round fractional cube coordinates to the nearest hex cell.
 * Uses the standard cube-rounding algorithm.
 */
export function hexRound(q: number, r: number, s: number): HexCoord {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

/**
 * Draw a line between two hex cells using linear interpolation.
 * Returns all hex cells the line passes through, in order from a to b.
 *
 * @param a - Starting hex.
 * @param b - Ending hex.
 * @returns Array of hex coordinates from a to b inclusive.
 */
export function hexLineDraw(a: HexCoord, b: HexCoord): HexCoord[] {
  const dist = hexDistance(a, b);
  if (dist === 0) return [a];

  const results: HexCoord[] = [];
  // Nudge to avoid landing exactly on hex boundaries
  const aq = a.q + 1e-6;
  const ar = a.r + 1e-6;
  const as_ = a.s - 2e-6;

  for (let i = 0; i <= dist; i++) {
    const t = i / dist;
    const q = aq + (b.q - a.q) * t;
    const r = ar + (b.r - a.r) * t;
    const s = as_ + (b.s - a.s) * t;
    results.push(hexRound(q, r, s));
  }

  return results;
}

// ---------------------------------------------------------------------------
// World (pixel) coordinate conversions
// ---------------------------------------------------------------------------

/**
 * Convert hex cube coordinates to world (pixel) coordinates.
 *
 * For pointy-top:
 *   x = size * (sqrt(3) * q + sqrt(3)/2 * r)
 *   y = size * (3/2 * r)
 *
 * For flat-top:
 *   x = size * (3/2 * q)
 *   y = size * (sqrt(3)/2 * q + sqrt(3) * r)
 *
 * @param h - Hex coordinate.
 * @param config - Hex layout configuration.
 * @returns World position { x, y }.
 */
export function hexToWorld(h: HexCoord, config: HexConfig): { x: number; y: number } {
  const s = config.hexSize;
  const sqrt3 = Math.sqrt(3);

  if (config.orientation === "pointy") {
    return {
      x: s * (sqrt3 * h.q + (sqrt3 / 2) * h.r),
      y: s * (1.5 * h.r),
    };
  } else {
    return {
      x: s * (1.5 * h.q),
      y: s * ((sqrt3 / 2) * h.q + sqrt3 * h.r),
    };
  }
}

/**
 * Convert world (pixel) coordinates to fractional hex cube coordinates,
 * then round to the nearest hex cell.
 *
 * @param wx - World X position.
 * @param wy - World Y position.
 * @param config - Hex layout configuration.
 * @returns Nearest hex cube coordinate.
 */
export function worldToHex(wx: number, wy: number, config: HexConfig): HexCoord {
  const s = config.hexSize;
  const sqrt3 = Math.sqrt(3);

  let q: number, r: number;

  if (config.orientation === "pointy") {
    q = ((sqrt3 / 3) * wx - (1 / 3) * wy) / s;
    r = ((2 / 3) * wy) / s;
  } else {
    q = ((2 / 3) * wx) / s;
    r = ((-1 / 3) * wx + (sqrt3 / 3) * wy) / s;
  }

  return hexRound(q, r, -q - r);
}

/**
 * Convert screen coordinates to the nearest hex cell, accounting for camera.
 *
 * @param sx - Screen X position.
 * @param sy - Screen Y position.
 * @param camera - Current camera state.
 * @param config - Hex layout configuration.
 * @param viewportWidth - Viewport width in pixels. Use getViewportSize().width.
 * @param viewportHeight - Viewport height in pixels. Use getViewportSize().height.
 * @returns Nearest hex cube coordinate.
 */
export function screenToHex(
  sx: number,
  sy: number,
  camera: CameraState,
  config: HexConfig,
  viewportWidth: number,
  viewportHeight: number,
): HexCoord {
  const scale = 1 / camera.zoom;
  const wx = camera.x + (sx - viewportWidth / 2) * scale;
  const wy = camera.y + (sy - viewportHeight / 2) * scale;
  return worldToHex(wx, wy, config);
}

// ---------------------------------------------------------------------------
// Offset coordinate conversions
// ---------------------------------------------------------------------------

/**
 * Convert cube coordinates to offset coordinates.
 *
 * Offset types:
 * - "odd-r": odd rows shifted right (pointy-top)
 * - "even-r": even rows shifted right (pointy-top)
 * - "odd-q": odd columns shifted down (flat-top)
 * - "even-q": even columns shifted down (flat-top)
 *
 * @param h - Hex cube coordinate.
 * @param type - Offset scheme.
 * @returns Offset grid position { col, row }.
 */
export function cubeToOffset(h: HexCoord, type: OffsetType): { col: number; row: number } {
  switch (type) {
    case "odd-r":
      return {
        col: h.q + (h.r - (h.r & 1)) / 2,
        row: h.r,
      };
    case "even-r":
      return {
        col: h.q + (h.r + (h.r & 1)) / 2,
        row: h.r,
      };
    case "odd-q":
      return {
        col: h.q,
        row: h.r + (h.q - (h.q & 1)) / 2,
      };
    case "even-q":
      return {
        col: h.q,
        row: h.r + (h.q + (h.q & 1)) / 2,
      };
  }
}

/**
 * Convert offset coordinates to cube coordinates.
 *
 * @param col - Offset column.
 * @param row - Offset row.
 * @param type - Offset scheme.
 * @returns Hex cube coordinate.
 */
export function offsetToCube(col: number, row: number, type: OffsetType): HexCoord {
  let q: number, r: number;
  switch (type) {
    case "odd-r":
      q = col - (row - (row & 1)) / 2;
      r = row;
      break;
    case "even-r":
      q = col - (row + (row & 1)) / 2;
      r = row;
      break;
    case "odd-q":
      q = col;
      r = row - (col - (col & 1)) / 2;
      break;
    case "even-q":
      q = col;
      r = row - (col + (col & 1)) / 2;
      break;
  }
  return { q, r, s: -q - r };
}

// ---------------------------------------------------------------------------
// Area / range queries
// ---------------------------------------------------------------------------

/**
 * Get all hex cells within a given range from center (inclusive).
 * Returns cells as an array (not in any particular order).
 * This is equivalent to hexSpiral but generated differently.
 *
 * @param center - Center hex coordinate.
 * @param range - Maximum distance from center.
 * @returns Array of hex coordinates within range.
 */
export function hexRange(center: HexCoord, range: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -range; q <= range; q++) {
    const rMin = Math.max(-range, -q - range);
    const rMax = Math.min(range, -q + range);
    for (let r = rMin; r <= rMax; r++) {
      results.push({
        q: center.q + q,
        r: center.r + r,
        s: center.s - q - r,
      });
    }
  }
  return results;
}

/**
 * Compute the area (number of cells) of a hex range with given radius.
 * Formula: 3 * radius^2 + 3 * radius + 1
 */
export function hexArea(radius: number): number {
  return 3 * radius * radius + 3 * radius + 1;
}

// ---------------------------------------------------------------------------
// Hex auto-tiling bitmask (6-neighbor)
// ---------------------------------------------------------------------------

/** 6-neighbor direction bits for hex auto-tiling. */
export const HEX_DIR_E = 1;
export const HEX_DIR_NE = 2;
export const HEX_DIR_NW = 4;
export const HEX_DIR_W = 8;
export const HEX_DIR_SW = 16;
export const HEX_DIR_SE = 32;

/**
 * Compute a 6-bit auto-tile bitmask for a hex cell.
 * Each bit represents one of the 6 hex neighbors (E, NE, NW, W, SW, SE).
 * Results in 0-63 (64 possible tile variants).
 *
 * @param q - Cube q coordinate of the tile.
 * @param r - Cube r coordinate of the tile.
 * @param check - Returns true if a neighbor hex is "same" (connected).
 * @returns Bitmask value 0-63.
 */
export function computeHexAutotileBitmask(
  q: number,
  r: number,
  check: (q: number, r: number) => boolean,
): number {
  let mask = 0;
  const neighbors = hexNeighbors(q, r);
  if (check(neighbors[0].q, neighbors[0].r)) mask |= HEX_DIR_E;
  if (check(neighbors[1].q, neighbors[1].r)) mask |= HEX_DIR_NE;
  if (check(neighbors[2].q, neighbors[2].r)) mask |= HEX_DIR_NW;
  if (check(neighbors[3].q, neighbors[3].r)) mask |= HEX_DIR_W;
  if (check(neighbors[4].q, neighbors[4].r)) mask |= HEX_DIR_SW;
  if (check(neighbors[5].q, neighbors[5].r)) mask |= HEX_DIR_SE;
  return mask;
}
