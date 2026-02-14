/**
 * Hexagonal tilemap renderer.
 *
 * Creates and draws tilemaps using hex grids with either pointy-top
 * or flat-top orientation. Supports camera culling and 6-neighbor auto-tiling.
 * Tiles are stored in offset coordinates (odd-r for pointy-top, odd-q for flat-top).
 */

import { drawSprite } from "./sprites.ts";
import { _logDrawCall } from "../testing/visual.ts";
import {
  hex,
  hexToWorld,
  hexDistance,
  hexNeighbors,
  offsetToCube,
  cubeToOffset,
  computeHexAutotileBitmask,
} from "./hex.ts";
import { getViewportSize } from "./input.ts";
import type { HexConfig, HexCoord, HexOrientation, OffsetType } from "./hex.ts";
import type { CameraState } from "./types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single hex tile. */
export type HexTile = {
  /** Tile type identifier. 0 = empty. */
  tileId: number;
};

/** Configuration for creating a hex tilemap. */
export type HexTilemapConfig = {
  /** Grid width in columns. */
  width: number;
  /** Grid height in rows. */
  height: number;
  /** Hex cell size (center to corner). */
  hexSize: number;
  /** Hex orientation: "pointy" or "flat". */
  orientation: HexOrientation;
};

/** A hex tilemap instance. */
export type HexTilemap = {
  /** Grid width in columns (offset coords). */
  width: number;
  /** Grid height in rows (offset coords). */
  height: number;
  /** Hex layout config. */
  config: HexConfig;
  /** Offset coordinate type used for storage. */
  offsetType: OffsetType;
  /** Flat array of tiles, indexed as [row * width + col]. */
  tiles: HexTile[];
  /** Optional tile-to-textureId mapping for rendering. */
  textureMap: Map<number, number>;
};

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

/**
 * Create a hex tilemap with the given dimensions.
 * All tiles start empty (tileId = 0).
 *
 * Uses odd-r offset for pointy-top, odd-q offset for flat-top.
 *
 * @param config - Grid dimensions and hex size/orientation.
 * @returns A new HexTilemap.
 */
export function createHexTilemap(config: HexTilemapConfig): HexTilemap {
  const count = config.width * config.height;
  const tiles: HexTile[] = new Array(count);
  for (let i = 0; i < count; i++) {
    tiles[i] = { tileId: 0 };
  }
  const offsetType: OffsetType = config.orientation === "pointy" ? "odd-r" : "odd-q";
  return {
    width: config.width,
    height: config.height,
    config: { hexSize: config.hexSize, orientation: config.orientation },
    offsetType,
    tiles,
    textureMap: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Tile access (offset coordinates: col, row)
// ---------------------------------------------------------------------------

/**
 * Set the tile at offset position (col, row).
 *
 * @param tilemap - The hex tilemap.
 * @param col - Column in offset grid.
 * @param row - Row in offset grid.
 * @param tileId - Tile type identifier. 0 = empty.
 */
export function setHexTile(
  tilemap: HexTilemap,
  col: number,
  row: number,
  tileId: number,
): void {
  if (col < 0 || row < 0 || col >= tilemap.width || row >= tilemap.height) return;
  tilemap.tiles[row * tilemap.width + col].tileId = tileId;
}

/**
 * Get the tile at offset position (col, row).
 *
 * @returns The tile, or undefined if out of bounds.
 */
export function getHexTile(
  tilemap: HexTilemap,
  col: number,
  row: number,
): HexTile | undefined {
  if (col < 0 || row < 0 || col >= tilemap.width || row >= tilemap.height) return undefined;
  return tilemap.tiles[row * tilemap.width + col];
}

/**
 * Get the tile ID at offset position (col, row).
 *
 * @returns Tile ID, or 0 if out of bounds/empty.
 */
export function getHexTileId(
  tilemap: HexTilemap,
  col: number,
  row: number,
): number {
  if (col < 0 || row < 0 || col >= tilemap.width || row >= tilemap.height) return 0;
  return tilemap.tiles[row * tilemap.width + col].tileId;
}

/**
 * Fill a rectangular region of the hex tilemap (in offset coordinates).
 */
export function fillHexTiles(
  tilemap: HexTilemap,
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  tileId: number,
): void {
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      setHexTile(tilemap, col, row, tileId);
    }
  }
}

/**
 * Map a tile ID to a texture ID for rendering.
 */
export function setHexTileTexture(
  tilemap: HexTilemap,
  tileId: number,
  textureId: number,
): void {
  tilemap.textureMap.set(tileId, textureId);
}

// ---------------------------------------------------------------------------
// Cube coordinate helpers
// ---------------------------------------------------------------------------

/**
 * Convert an offset position (col, row) in this tilemap to cube coordinates.
 */
export function hexTilemapToCube(tilemap: HexTilemap, col: number, row: number): HexCoord {
  return offsetToCube(col, row, tilemap.offsetType);
}

/**
 * Convert cube coordinates to offset position (col, row) in this tilemap.
 */
export function hexTilemapFromCube(tilemap: HexTilemap, h: HexCoord): { col: number; row: number } {
  return cubeToOffset(h, tilemap.offsetType);
}

/**
 * Get the tile ID at a cube coordinate position.
 * Converts cube coords to offset coords, then looks up the tile.
 *
 * @returns Tile ID, or 0 if out of bounds/empty.
 */
export function getHexTileAtCube(tilemap: HexTilemap, h: HexCoord): number {
  const off = cubeToOffset(h, tilemap.offsetType);
  return getHexTileId(tilemap, off.col, off.row);
}

/**
 * Set a tile at cube coordinate position.
 */
export function setHexTileAtCube(tilemap: HexTilemap, h: HexCoord, tileId: number): void {
  const off = cubeToOffset(h, tilemap.offsetType);
  setHexTile(tilemap, off.col, off.row, tileId);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Draw the hex tilemap with camera culling.
 *
 * Each tile is rendered as a sprite centered at its hex world position.
 * Sprite size is 2 * hexSize wide, sqrt(3) * hexSize tall (pointy-top) or
 * sqrt(3) * hexSize wide, 2 * hexSize tall (flat-top).
 *
 * @param tilemap - The hex tilemap to draw.
 * @param camera - Current camera state for culling. If omitted, draws all tiles.
 * @param baseLayer - Base draw layer. Default: 0.
 * @param offsetX - World X offset. Default: 0.
 * @param offsetY - World Y offset. Default: 0.
 */
export function drawHexTilemap(
  tilemap: HexTilemap,
  camera?: CameraState,
  baseLayer: number = 0,
  offsetX: number = 0,
  offsetY: number = 0,
): void {
  _logDrawCall({ type: "tilemap", tilemapId: 0, x: offsetX, y: offsetY, layer: baseLayer } as any);

  const { width, height, config, tiles, textureMap, offsetType } = tilemap;
  const sqrt3 = Math.sqrt(3);

  // Tile sprite dimensions
  let sprW: number, sprH: number;
  if (config.orientation === "pointy") {
    sprW = sqrt3 * config.hexSize;
    sprH = 2 * config.hexSize;
  } else {
    sprW = 2 * config.hexSize;
    sprH = sqrt3 * config.hexSize;
  }

  // Camera culling bounds
  let cullMinX = -Infinity;
  let cullMinY = -Infinity;
  let cullMaxX = Infinity;
  let cullMaxY = Infinity;

  if (camera) {
    const vp = getViewportSize();
    const scale = 1 / camera.zoom;
    const hw = (vp.width / 2) * scale;
    const hh = (vp.height / 2) * scale;
    const margin = Math.max(sprW, sprH) * 2;
    cullMinX = camera.x - hw - margin;
    cullMinY = camera.y - hh - margin;
    cullMaxX = camera.x + hw + margin;
    cullMaxY = camera.y + hh + margin;
  }

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const tile = tiles[row * width + col];
      if (tile.tileId === 0) continue;

      const textureId = textureMap.get(tile.tileId);
      if (textureId === undefined) continue;

      // Convert offset to cube, then to world
      const cube = offsetToCube(col, row, offsetType);
      const world = hexToWorld(cube, config);
      const wx = world.x + offsetX;
      const wy = world.y + offsetY;

      // Culling
      if (wx + sprW / 2 < cullMinX || wx - sprW / 2 > cullMaxX) continue;
      if (wy + sprH / 2 < cullMinY || wy - sprH / 2 > cullMaxY) continue;

      // Draw sprite centered at hex position
      // Layer: use row for depth sorting
      const layer = baseLayer + row;
      drawSprite({
        textureId,
        x: wx - sprW / 2,
        y: wy - sprH / 2,
        w: sprW,
        h: sprH,
        layer,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Hex auto-tiling
// ---------------------------------------------------------------------------

/**
 * Compute a 6-bit auto-tile bitmask for a hex tile in offset coordinates.
 * Converts to cube coordinates to check the 6 hex neighbors.
 *
 * @param tilemap - The hex tilemap.
 * @param col - Offset column.
 * @param row - Offset row.
 * @param matchFn - Returns true if a neighbor tile is "same". Default: tileId > 0.
 * @returns Bitmask 0-63. Bits: E=1, NE=2, NW=4, W=8, SW=16, SE=32.
 */
export function computeHexTilemapAutotile(
  tilemap: HexTilemap,
  col: number,
  row: number,
  matchFn?: (tileId: number) => boolean,
): number {
  const match = matchFn ?? ((id: number) => id > 0);
  const cube = offsetToCube(col, row, tilemap.offsetType);
  return computeHexAutotileBitmask(cube.q, cube.r, (nq, nr) => {
    const off = cubeToOffset(hex(nq, nr), tilemap.offsetType);
    return match(getHexTileId(tilemap, off.col, off.row));
  });
}
