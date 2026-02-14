/**
 * Isometric tilemap renderer.
 *
 * Creates and draws tilemaps using diamond isometric projection.
 * Renders with correct depth sorting (back-to-front), camera culling,
 * per-tile elevation, and integrates with the existing tile API patterns.
 */

import { drawSprite } from "./sprites.ts";
import { _logDrawCall } from "../testing/visual.ts";
import { isoToWorld, isoDepthLayer } from "./isometric.ts";
import { getViewportSize } from "./input.ts";
import type { IsoConfig } from "./isometric.ts";
import type { CameraState } from "./types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single tile in the isometric tilemap. */
export type IsoTile = {
  /** Tile type / texture identifier. 0 = empty. */
  tileId: number;
  /** Elevation offset in pixels (tile drawn higher). Default: 0. */
  elevation: number;
};

/** Configuration for creating an isometric tilemap. */
export type IsoTilemapConfig = {
  /** Grid width in tiles. */
  width: number;
  /** Grid height in tiles. */
  height: number;
  /** Isometric tile dimensions. */
  tileW: number;
  /** Isometric tile height. */
  tileH: number;
};

/** An isometric tilemap instance. */
export type IsoTilemap = {
  /** Grid width in tiles. */
  width: number;
  /** Grid height in tiles. */
  height: number;
  /** Tile dimensions config. */
  config: IsoConfig;
  /** Flat array of tiles, indexed as [gy * width + gx]. */
  tiles: IsoTile[];
  /** Optional tile-to-textureId mapping for rendering. */
  textureMap: Map<number, number>;
};

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

/**
 * Create an isometric tilemap with the given dimensions.
 * All tiles start empty (tileId = 0, elevation = 0).
 *
 * @param config - Grid dimensions and tile sizes.
 * @returns A new IsoTilemap.
 */
export function createIsoTilemap(config: IsoTilemapConfig): IsoTilemap {
  const count = config.width * config.height;
  const tiles: IsoTile[] = new Array(count);
  for (let i = 0; i < count; i++) {
    tiles[i] = { tileId: 0, elevation: 0 };
  }
  return {
    width: config.width,
    height: config.height,
    config: { tileW: config.tileW, tileH: config.tileH },
    tiles,
    textureMap: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Tile access
// ---------------------------------------------------------------------------

/**
 * Set the tile at grid position (gx, gy).
 *
 * @param tilemap - The isometric tilemap.
 * @param gx - Grid X position.
 * @param gy - Grid Y position.
 * @param tileId - Tile type identifier. 0 = empty.
 * @param elevation - Elevation offset in pixels. Default: 0.
 */
export function setIsoTile(
  tilemap: IsoTilemap,
  gx: number,
  gy: number,
  tileId: number,
  elevation: number = 0,
): void {
  if (gx < 0 || gy < 0 || gx >= tilemap.width || gy >= tilemap.height) return;
  const idx = gy * tilemap.width + gx;
  tilemap.tiles[idx].tileId = tileId;
  tilemap.tiles[idx].elevation = elevation;
}

/**
 * Get the tile at grid position (gx, gy).
 *
 * @returns The tile, or undefined if out of bounds.
 */
export function getIsoTile(
  tilemap: IsoTilemap,
  gx: number,
  gy: number,
): IsoTile | undefined {
  if (gx < 0 || gy < 0 || gx >= tilemap.width || gy >= tilemap.height) return undefined;
  return tilemap.tiles[gy * tilemap.width + gx];
}

/**
 * Get the tile ID at grid position (gx, gy).
 *
 * @returns Tile ID, or 0 if out of bounds or empty.
 */
export function getIsoTileId(
  tilemap: IsoTilemap,
  gx: number,
  gy: number,
): number {
  if (gx < 0 || gy < 0 || gx >= tilemap.width || gy >= tilemap.height) return 0;
  return tilemap.tiles[gy * tilemap.width + gx].tileId;
}

/**
 * Set the elevation for a specific tile.
 */
export function setIsoTileElevation(
  tilemap: IsoTilemap,
  gx: number,
  gy: number,
  elevation: number,
): void {
  if (gx < 0 || gy < 0 || gx >= tilemap.width || gy >= tilemap.height) return;
  tilemap.tiles[gy * tilemap.width + gx].elevation = elevation;
}

/**
 * Fill a rectangular region of the isometric tilemap.
 *
 * @param tilemap - The tilemap.
 * @param startX - Start grid X.
 * @param startY - Start grid Y.
 * @param endX - End grid X (exclusive).
 * @param endY - End grid Y (exclusive).
 * @param tileId - Tile ID to fill.
 * @param elevation - Elevation for filled tiles. Default: 0.
 */
export function fillIsoTiles(
  tilemap: IsoTilemap,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileId: number,
  elevation: number = 0,
): void {
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      setIsoTile(tilemap, gx, gy, tileId, elevation);
    }
  }
}

/**
 * Map a tile ID to a texture ID for rendering.
 * When drawIsoTilemap() encounters this tile ID, it uses the mapped texture.
 *
 * @param tilemap - The tilemap.
 * @param tileId - The tile type identifier.
 * @param textureId - The texture/sprite handle to render.
 */
export function setIsoTileTexture(
  tilemap: IsoTilemap,
  tileId: number,
  textureId: number,
): void {
  tilemap.textureMap.set(tileId, textureId);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Draw the isometric tilemap with correct depth sorting and camera culling.
 *
 * Iterates tiles in back-to-front order (increasing gy, then gx).
 * Skips tiles that are off-screen based on the camera viewport.
 * Each tile is rendered as a sprite positioned at its isometric world coordinates,
 * offset by elevation.
 *
 * @param tilemap - The isometric tilemap to draw.
 * @param camera - Current camera state for culling. If omitted, draws all tiles.
 * @param baseLayer - Base draw layer. Default: 0.
 * @param offsetX - World X offset for the tilemap origin. Default: 0.
 * @param offsetY - World Y offset for the tilemap origin. Default: 0.
 */
export function drawIsoTilemap(
  tilemap: IsoTilemap,
  camera?: CameraState,
  baseLayer: number = 0,
  offsetX: number = 0,
  offsetY: number = 0,
): void {
  _logDrawCall({ type: "tilemap", tilemapId: 0, x: offsetX, y: offsetY, layer: baseLayer } as any);

  const { width, height, config, tiles, textureMap } = tilemap;
  const halfW = config.tileW / 2;
  const halfH = config.tileH / 2;

  // Camera culling bounds (world space)
  let cullMinX = -Infinity;
  let cullMinY = -Infinity;
  let cullMaxX = Infinity;
  let cullMaxY = Infinity;

  if (camera) {
    const vp = getViewportSize();
    const scale = 1 / camera.zoom;
    const hw = (vp.width / 2) * scale;
    const hh = (vp.height / 2) * scale;
    // Add margin for tile dimensions
    const margin = Math.max(config.tileW, config.tileH) * 2;
    cullMinX = camera.x - hw - margin;
    cullMinY = camera.y - hh - margin;
    cullMaxX = camera.x + hw + margin;
    cullMaxY = camera.y + hh + margin;
  }

  // Back-to-front: iterate gy ascending, gx ascending
  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      const tile = tiles[gy * width + gx];
      if (tile.tileId === 0) continue;

      const textureId = textureMap.get(tile.tileId);
      if (textureId === undefined) continue;

      const world = isoToWorld(gx, gy, config);
      const wx = world.x + offsetX;
      const wy = world.y + offsetY - tile.elevation;

      // Camera culling
      if (wx + halfW < cullMinX || wx - halfW > cullMaxX) continue;
      if (wy + halfH < cullMinY || wy - halfH > cullMaxY) continue;

      const layer = baseLayer + isoDepthLayer(gy);
      drawSprite({
        textureId,
        x: wx - halfW,
        y: wy - halfH,
        w: config.tileW,
        h: config.tileH,
        layer,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 4-bit iso auto-tiling
// ---------------------------------------------------------------------------

/**
 * Compute a 4-bit auto-tile bitmask for an isometric tile.
 * Checks 4 cardinal neighbors in grid space (N=up, E=right, S=down, W=left).
 *
 * @param tilemap - The isometric tilemap.
 * @param gx - Grid X.
 * @param gy - Grid Y.
 * @param matchFn - Returns true if the neighbor tile should be considered "same".
 *                  Receives the tile ID of the neighbor. Default: tileId > 0.
 * @returns Bitmask 0-15. Bit layout: N=1, E=2, S=4, W=8.
 */
export function computeIsoAutotile4(
  tilemap: IsoTilemap,
  gx: number,
  gy: number,
  matchFn?: (tileId: number) => boolean,
): number {
  const match = matchFn ?? ((id: number) => id > 0);
  let mask = 0;
  // N = gy-1
  if (match(getIsoTileId(tilemap, gx, gy - 1))) mask |= 1;
  // E = gx+1
  if (match(getIsoTileId(tilemap, gx + 1, gy))) mask |= 2;
  // S = gy+1
  if (match(getIsoTileId(tilemap, gx, gy + 1))) mask |= 4;
  // W = gx-1
  if (match(getIsoTileId(tilemap, gx - 1, gy))) mask |= 8;
  return mask;
}
