/**
 * Isometric coordinate system.
 *
 * Provides diamond-projection transforms between grid space,
 * world/pixel space, and screen space. Configurable tile dimensions.
 * Also supports staggered (offset-row) isometric for rectangular maps.
 *
 * Conventions:
 * - Grid space: integer (gx, gy) tile coordinates.
 * - World space: pixel coordinates where drawSprite() operates.
 * - Screen space: viewport-relative pixel coordinates (before camera transform).
 */

import type { CameraState } from "./types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for isometric tile dimensions. */
export type IsoConfig = {
  /** Diamond width in pixels (full tile width). */
  tileW: number;
  /** Diamond height in pixels (full tile height, typically tileW / 2). */
  tileH: number;
};

/** Staggered isometric configuration (offset rows). */
export type StaggeredIsoConfig = {
  /** Diamond width in pixels. */
  tileW: number;
  /** Diamond height in pixels. */
  tileH: number;
  /** Which rows are offset: "odd" or "even". Default: "odd". */
  staggerIndex?: "odd" | "even";
};

// ---------------------------------------------------------------------------
// Diamond isometric transforms
// ---------------------------------------------------------------------------

/**
 * Convert grid coordinates to world (pixel) coordinates using diamond projection.
 *
 * The diamond projection places tiles in a rotated-45-degree diamond pattern.
 * Grid (0,0) maps to world (0,0). Moving +gx goes down-right, +gy goes down-left.
 *
 * @param gx - Grid X coordinate.
 * @param gy - Grid Y coordinate.
 * @param config - Tile dimensions.
 * @returns World position { x, y }.
 */
export function isoToWorld(gx: number, gy: number, config: IsoConfig): { x: number; y: number } {
  const halfW = config.tileW / 2;
  const halfH = config.tileH / 2;
  return {
    x: (gx - gy) * halfW,
    y: (gx + gy) * halfH,
  };
}

/**
 * Convert world (pixel) coordinates to fractional grid coordinates.
 *
 * The inverse of isoToWorld. Returns fractional values — use Math.floor()
 * on both x and y to get the grid cell, or Math.round() for nearest-tile snapping.
 *
 * @param wx - World X position in pixels.
 * @param wy - World Y position in pixels.
 * @param config - Tile dimensions.
 * @returns Fractional grid position { x, y }.
 */
export function worldToIso(wx: number, wy: number, config: IsoConfig): { x: number; y: number } {
  const halfW = config.tileW / 2;
  const halfH = config.tileH / 2;
  return {
    x: (wx / halfW + wy / halfH) / 2,
    y: (wy / halfH - wx / halfW) / 2,
  };
}

/**
 * Convert world coordinates to an integer grid cell.
 *
 * Applies a half-tile-height offset before flooring so that clicking
 * the center of a diamond tile returns that tile's coordinates.
 *
 * @param wx - World X position.
 * @param wy - World Y position.
 * @param config - Tile dimensions.
 * @returns Integer grid cell { x, y }.
 */
export function worldToGrid(wx: number, wy: number, config: IsoConfig): { x: number; y: number } {
  const iso = worldToIso(wx, wy + config.tileH / 2, config);
  return { x: Math.floor(iso.x), y: Math.floor(iso.y) };
}

/**
 * Convert screen-space coordinates to grid coordinates, accounting for camera.
 *
 * Screen space is viewport-relative (0,0 = top-left of screen).
 * This unprojects through the camera to world space, then converts to grid.
 *
 * @param sx - Screen X position.
 * @param sy - Screen Y position.
 * @param camera - Current camera state (position, zoom).
 * @param config - Tile dimensions.
 * @param viewportWidth - Viewport width in pixels. Use getViewportSize().width.
 * @param viewportHeight - Viewport height in pixels. Use getViewportSize().height.
 * @returns Integer grid cell { x, y }.
 */
export function screenToIso(
  sx: number,
  sy: number,
  camera: CameraState,
  config: IsoConfig,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  // Unproject screen to world: camera position = top-left
  const scale = 1 / camera.zoom;
  const wx = camera.x + sx * scale;
  const wy = camera.y + sy * scale;
  return worldToGrid(wx, wy, config);
}

/**
 * Compute a depth layer value for sprite sorting in isometric view.
 *
 * Tiles further down the screen (higher gy) should draw in front of tiles
 * above them. Multiplies by 10 to leave room for sub-layers (e.g., floor,
 * objects, walls within one tile row).
 *
 * @param gy - Grid Y coordinate.
 * @returns Integer depth layer value.
 */
export function isoDepthLayer(gy: number): number {
  return Math.floor(gy * 10);
}

// ---------------------------------------------------------------------------
// Staggered isometric transforms
// ---------------------------------------------------------------------------

/**
 * Convert grid coordinates to world coordinates for staggered isometric layout.
 *
 * Staggered iso places tiles in offset rows, creating a rectangular map
 * that still looks isometric. Odd or even rows are offset by half a tile width.
 *
 * @param gx - Grid column.
 * @param gy - Grid row.
 * @param config - Staggered iso configuration.
 * @returns World position { x, y }.
 */
export function staggeredIsoToWorld(
  gx: number,
  gy: number,
  config: StaggeredIsoConfig,
): { x: number; y: number } {
  const stagger = config.staggerIndex ?? "odd";
  const isOffset = stagger === "odd" ? (gy & 1) === 1 : (gy & 1) === 0;
  const offsetX = isOffset ? config.tileW / 2 : 0;
  return {
    x: gx * config.tileW + offsetX,
    y: gy * (config.tileH / 2),
  };
}

/**
 * Convert world coordinates to grid cell for staggered isometric layout.
 *
 * Uses the standard approach: determine the row from Y, then adjust column
 * based on whether the row is offset.
 *
 * @param wx - World X position.
 * @param wy - World Y position.
 * @param config - Staggered iso configuration.
 * @returns Integer grid cell { x, y }.
 */
export function worldToStaggeredIso(
  wx: number,
  wy: number,
  config: StaggeredIsoConfig,
): { x: number; y: number } {
  const stagger = config.staggerIndex ?? "odd";
  const halfH = config.tileH / 2;

  // Rough row estimate
  const gy = Math.floor(wy / halfH);
  const isOffset = stagger === "odd" ? (gy & 1) === 1 : (gy & 1) === 0;
  const offsetX = isOffset ? config.tileW / 2 : 0;
  const gx = Math.floor((wx - offsetX) / config.tileW);

  return { x: gx, y: gy };
}

/**
 * Convert screen coordinates to grid cell for staggered isometric layout.
 *
 * @param sx - Screen X position.
 * @param sy - Screen Y position.
 * @param camera - Current camera state.
 * @param config - Staggered iso configuration.
 * @param viewportWidth - Viewport width in pixels. Use getViewportSize().width.
 * @param viewportHeight - Viewport height in pixels. Use getViewportSize().height.
 * @returns Integer grid cell { x, y }.
 */
export function screenToStaggeredIso(
  sx: number,
  sy: number,
  camera: CameraState,
  config: StaggeredIsoConfig,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } {
  const scale = 1 / camera.zoom;
  const wx = camera.x + sx * scale;
  const wy = camera.y + sy * scale;
  return worldToStaggeredIso(wx, wy, config);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Get the bounding box of an isometric map in world coordinates.
 * Useful for setting camera bounds.
 *
 * @param mapW - Map width in tiles.
 * @param mapH - Map height in tiles.
 * @param config - Tile dimensions.
 * @returns Bounding box { minX, minY, maxX, maxY } in world coordinates.
 */
export function isoMapBounds(
  mapW: number,
  mapH: number,
  config: IsoConfig,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const topCorner = isoToWorld(0, 0, config);
  const rightCorner = isoToWorld(mapW, 0, config);
  const bottomCorner = isoToWorld(mapW, mapH, config);
  const leftCorner = isoToWorld(0, mapH, config);
  return {
    minX: leftCorner.x,
    minY: topCorner.y,
    maxX: rightCorner.x,
    maxY: bottomCorner.y,
  };
}

/**
 * Iterate tiles in back-to-front order for correct isometric depth sorting.
 * Calls the callback for each (gx, gy) in draw order.
 *
 * @param mapW - Map width in tiles.
 * @param mapH - Map height in tiles.
 * @param callback - Called with (gx, gy) for each tile.
 */
export function isoIterateBackToFront(
  mapW: number,
  mapH: number,
  callback: (gx: number, gy: number) => void,
): void {
  for (let gy = 0; gy < mapH; gy++) {
    for (let gx = 0; gx < mapW; gx++) {
      callback(gx, gy);
    }
  }
}

/**
 * Get the four isometric neighbor positions for a grid cell.
 *
 * @param gx - Grid X.
 * @param gy - Grid Y.
 * @returns Array of 4 neighbor positions [right, down, left, up].
 */
export function isoNeighbors(gx: number, gy: number): Array<{ x: number; y: number }> {
  return [
    { x: gx + 1, y: gy },     // right (down-right in screen)
    { x: gx, y: gy + 1 },     // down (down-left in screen)
    { x: gx - 1, y: gy },     // left (up-left in screen)
    { x: gx, y: gy - 1 },     // up (up-right in screen)
  ];
}

/**
 * Manhattan distance between two grid cells in isometric space.
 *
 * @param ax - First cell X.
 * @param ay - First cell Y.
 * @param bx - Second cell X.
 * @param by - Second cell Y.
 * @returns Manhattan distance.
 */
export function isoDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}
