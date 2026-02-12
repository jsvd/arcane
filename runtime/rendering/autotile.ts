/**
 * Auto-tiling: bitmask-based automatic tile selection.
 *
 * Supports two tile set sizes:
 * - **4-bit (16 tiles)**: Checks cardinal neighbors (N, E, S, W).
 * - **8-bit (47 tiles)**: Checks all 8 neighbors (N, NE, E, SE, S, SW, W, NW).
 *   Corner bits are only set when both adjacent cardinal neighbors are present
 *   (Wang blob tile convention).
 *
 * Usage:
 * 1. Define an auto-tile rule with computeAutotileBitmask4 or computeAutotileBitmask8.
 * 2. Map bitmask values to atlas tile IDs with an AutotileMapping.
 * 3. Call applyAutotile() on a tilemap to resolve all auto-tiles.
 */

// ---------------------------------------------------------------------------
// Bitmask computation
// ---------------------------------------------------------------------------

/** Cardinal direction bits for 4-bit auto-tiling. */
export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

/** All 8 direction bits for 8-bit auto-tiling. */
export const NORTHEAST = 16;
export const SOUTHEAST = 32;
export const SOUTHWEST = 64;
export const NORTHWEST = 128;

/**
 * Callback to check if a tile at (gx, gy) is considered "same" as the
 * auto-tiled group. Return true if the neighbor should be considered connected.
 */
export type NeighborCheck = (gx: number, gy: number) => boolean;

/**
 * Compute a 4-bit bitmask from cardinal neighbors.
 * Bit layout: N=1, E=2, S=4, W=8.
 * Results in values 0-15 (16 possible tiles).
 *
 * @param gx - Grid X position of the tile being computed.
 * @param gy - Grid Y position of the tile being computed.
 * @param check - Function that returns true if a neighbor is "same".
 * @returns Bitmask value 0-15.
 */
export function computeAutotileBitmask4(
  gx: number,
  gy: number,
  check: NeighborCheck,
): number {
  let mask = 0;
  if (check(gx, gy - 1)) mask |= NORTH;
  if (check(gx + 1, gy)) mask |= EAST;
  if (check(gx, gy + 1)) mask |= SOUTH;
  if (check(gx - 1, gy)) mask |= WEST;
  return mask;
}

/**
 * Compute an 8-bit bitmask from all 8 neighbors.
 * Cardinal bits: N=1, E=2, S=4, W=8.
 * Diagonal bits (Wang blob convention): NE=16, SE=32, SW=64, NW=128.
 *
 * Diagonal bits are only set when BOTH adjacent cardinal neighbors are present.
 * Example: NE is only set if both N and E are present.
 * This reduces 256 combinations to 47 unique tiles (standard blob tileset).
 *
 * @param gx - Grid X position of the tile being computed.
 * @param gy - Grid Y position of the tile being computed.
 * @param check - Function that returns true if a neighbor is "same".
 * @returns Bitmask value 0-255 (but only 47 unique meaningful values).
 */
export function computeAutotileBitmask8(
  gx: number,
  gy: number,
  check: NeighborCheck,
): number {
  const n = check(gx, gy - 1);
  const e = check(gx + 1, gy);
  const s = check(gx, gy + 1);
  const w = check(gx - 1, gy);

  let mask = 0;
  if (n) mask |= NORTH;
  if (e) mask |= EAST;
  if (s) mask |= SOUTH;
  if (w) mask |= WEST;

  // Corners only count if both adjacent cardinals are present
  if (n && e && check(gx + 1, gy - 1)) mask |= NORTHEAST;
  if (s && e && check(gx + 1, gy + 1)) mask |= SOUTHEAST;
  if (s && w && check(gx - 1, gy + 1)) mask |= SOUTHWEST;
  if (n && w && check(gx - 1, gy - 1)) mask |= NORTHWEST;

  return mask;
}

// ---------------------------------------------------------------------------
// Autotile mapping + application
// ---------------------------------------------------------------------------

/**
 * Maps bitmask values to atlas tile IDs.
 * Key = bitmask, value = tile ID in the atlas (1-based).
 */
export type AutotileMapping = Map<number, number>;

/**
 * Create a simple 4-bit autotile mapping from an array of 16 tile IDs.
 * Index in the array corresponds to the bitmask value (0-15).
 *
 * @param tileIds - Array of exactly 16 tile IDs, indexed by bitmask.
 * @returns AutotileMapping for use with applyAutotile().
 */
export function createAutotileMapping4(tileIds: number[]): AutotileMapping {
  if (tileIds.length !== 16) {
    throw new Error(`createAutotileMapping4: expected 16 tile IDs, got ${tileIds.length}`);
  }
  const mapping: AutotileMapping = new Map();
  for (let i = 0; i < 16; i++) {
    mapping.set(i, tileIds[i]);
  }
  return mapping;
}

/**
 * Create an 8-bit autotile mapping from a lookup object.
 * Keys are bitmask values, values are tile IDs.
 *
 * @param lookup - Object mapping bitmask values to tile IDs.
 * @returns AutotileMapping for use with applyAutotile().
 */
export function createAutotileMapping8(
  lookup: Record<number, number>,
): AutotileMapping {
  const mapping: AutotileMapping = new Map();
  for (const [key, value] of Object.entries(lookup)) {
    mapping.set(Number(key), value);
  }
  return mapping;
}

/** An auto-tile rule: which tiles trigger auto-tiling and how to map them. */
export type AutotileRule = {
  /** Tile IDs that belong to this auto-tile group. */
  memberTileIds: Set<number>;
  /** Bitmask mode: 4 (cardinal only) or 8 (with diagonals). */
  mode: 4 | 8;
  /** Mapping from bitmask to atlas tile ID. */
  mapping: AutotileMapping;
  /** Fallback tile ID if the bitmask has no mapping entry. */
  fallbackTileId: number;
};

/**
 * Create an auto-tile rule.
 *
 * @param memberTileIds - Array of tile IDs that belong to this group.
 * @param mode - 4 for cardinal-only, 8 for full 8-directional.
 * @param mapping - Bitmask-to-tile-ID mapping.
 * @param fallbackTileId - Tile ID to use when bitmask has no mapping entry.
 */
export function createAutotileRule(
  memberTileIds: number[],
  mode: 4 | 8,
  mapping: AutotileMapping,
  fallbackTileId: number,
): AutotileRule {
  return {
    memberTileIds: new Set(memberTileIds),
    mode,
    mapping,
    fallbackTileId,
  };
}

/**
 * Resolve a single position's auto-tile. Returns the tile ID that should
 * be placed based on the bitmask of neighbors.
 *
 * @param gx - Grid X position.
 * @param gy - Grid Y position.
 * @param rule - The auto-tile rule to apply.
 * @param check - Function that returns true if the tile at (gx, gy) is in the same group.
 * @returns The resolved tile ID from the mapping.
 */
export function resolveAutotile(
  gx: number,
  gy: number,
  rule: AutotileRule,
  check: NeighborCheck,
): number {
  const mask =
    rule.mode === 4
      ? computeAutotileBitmask4(gx, gy, check)
      : computeAutotileBitmask8(gx, gy, check);

  return rule.mapping.get(mask) ?? rule.fallbackTileId;
}

/**
 * Apply auto-tiling to a grid region. For each position, if the tile is a
 * member of the rule's group, compute its bitmask and replace with the
 * mapped tile ID.
 *
 * @param width - Grid width.
 * @param height - Grid height.
 * @param getTileFn - Function to get tile ID at (gx, gy).
 * @param setTileFn - Function to set tile ID at (gx, gy).
 * @param rule - The auto-tile rule to apply.
 * @param startX - Region start X (default 0).
 * @param startY - Region start Y (default 0).
 * @param endX - Region end X exclusive (default width).
 * @param endY - Region end Y exclusive (default height).
 */
export function applyAutotile(
  width: number,
  height: number,
  getTileFn: (gx: number, gy: number) => number,
  setTileFn: (gx: number, gy: number, tileId: number) => void,
  rule: AutotileRule,
  startX: number = 0,
  startY: number = 0,
  endX?: number,
  endY?: number,
): void {
  const ex = endX ?? width;
  const ey = endY ?? height;

  // Build a snapshot of which cells are members (to avoid feedback during resolution)
  const isMember = (gx: number, gy: number): boolean => {
    if (gx < 0 || gy < 0 || gx >= width || gy >= height) return false;
    return rule.memberTileIds.has(getTileFn(gx, gy));
  };

  // First pass: compute all bitmasks
  const resolved: Array<{ gx: number; gy: number; tileId: number }> = [];

  for (let gy = startY; gy < ey; gy++) {
    for (let gx = startX; gx < ex; gx++) {
      const currentTile = getTileFn(gx, gy);
      if (!rule.memberTileIds.has(currentTile)) continue;

      const tileId = resolveAutotile(gx, gy, rule, isMember);
      resolved.push({ gx, gy, tileId });
    }
  }

  // Second pass: apply resolved tiles
  for (const { gx, gy, tileId } of resolved) {
    setTileFn(gx, gy, tileId);
  }
}

// ---------------------------------------------------------------------------
// Convenience: 4-bit tile set preset indices
// ---------------------------------------------------------------------------

/**
 * Standard 4-bit autotile bitmask layout (for reference).
 * Each value describes which cardinal neighbors are present.
 *
 * ```
 *  0 = isolated       (no neighbors)
 *  1 = N only
 *  2 = E only
 *  3 = N+E  (inner corner)
 *  4 = S only
 *  5 = N+S  (vertical)
 *  6 = E+S  (inner corner)
 *  7 = N+E+S
 *  8 = W only
 *  9 = N+W  (inner corner)
 * 10 = E+W  (horizontal)
 * 11 = N+E+W
 * 12 = S+W  (inner corner)
 * 13 = N+S+W
 * 14 = E+S+W
 * 15 = all  (center)
 * ```
 */
export const BITMASK4_LABELS: ReadonlyArray<string> = [
  "isolated",
  "N",
  "E",
  "N+E",
  "S",
  "N+S",
  "E+S",
  "N+E+S",
  "W",
  "N+W",
  "E+W",
  "N+E+W",
  "S+W",
  "N+S+W",
  "E+S+W",
  "N+E+S+W",
];
