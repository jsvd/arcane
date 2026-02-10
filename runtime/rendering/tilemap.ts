import type { TilemapId, TilemapOptions } from "./types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_tilemap === "function";

/**
 * Create a tilemap backed by a texture atlas. Returns an opaque TilemapId handle.
 * The tilemap stores a grid of tile IDs that map to sub-regions of the atlas texture.
 * Returns 0 in headless mode.
 *
 * @param opts - Tilemap configuration (atlas texture, grid size, tile size, atlas layout).
 * @returns Tilemap handle for use with setTile(), getTile(), drawTilemap().
 */
export function createTilemap(opts: TilemapOptions): TilemapId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_tilemap(
    opts.textureId,
    opts.width,
    opts.height,
    opts.tileSize,
    opts.atlasColumns,
    opts.atlasRows,
  );
}

/**
 * Set a tile at grid position (gx, gy).
 * Tile IDs correspond to positions in the texture atlas (left-to-right, top-to-bottom).
 * Tile ID 0 = empty (not drawn). No-op in headless mode.
 *
 * @param id - Tilemap handle from createTilemap().
 * @param gx - Grid X position (column). 0 = leftmost.
 * @param gy - Grid Y position (row). 0 = topmost.
 * @param tileId - Tile index in the atlas (1-based). 0 = empty/clear.
 */
export function setTile(
  id: TilemapId,
  gx: number,
  gy: number,
  tileId: number,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_tile(id, gx, gy, tileId);
}

/**
 * Get the tile ID at grid position (gx, gy).
 * Returns 0 if out of bounds or in headless mode.
 *
 * @param id - Tilemap handle from createTilemap().
 * @param gx - Grid X position (column).
 * @param gy - Grid Y position (row).
 * @returns Tile ID at the given position, or 0 if empty/out of bounds.
 */
export function getTile(id: TilemapId, gx: number, gy: number): number {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_get_tile(id, gx, gy);
}

/**
 * Draw all visible tiles as sprites. Only draws tiles within the camera viewport (culled).
 * Must be called every frame. No-op in headless mode.
 *
 * @param id - Tilemap handle from createTilemap().
 * @param x - World X offset for the tilemap origin. Default: 0.
 * @param y - World Y offset for the tilemap origin. Default: 0.
 * @param layer - Draw order layer. Default: 0.
 */
export function drawTilemap(
  id: TilemapId,
  x: number = 0,
  y: number = 0,
  layer: number = 0,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_draw_tilemap(id, x, y, layer);
}
