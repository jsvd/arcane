import type { TilemapId, TilemapOptions } from "./types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_tilemap === "function";

/** Create a tilemap backed by a texture atlas. Returns a TilemapId handle. */
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

/** Set a tile at grid position (gx, gy). Tile ID 0 = empty. */
export function setTile(
  id: TilemapId,
  gx: number,
  gy: number,
  tileId: number,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_tile(id, gx, gy, tileId);
}

/** Get the tile ID at grid position (gx, gy). Returns 0 if out of bounds. */
export function getTile(id: TilemapId, gx: number, gy: number): number {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_get_tile(id, gx, gy);
}

/** Draw all visible tiles as sprites (camera-culled). */
export function drawTilemap(
  id: TilemapId,
  x: number = 0,
  y: number = 0,
  layer: number = 0,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_draw_tilemap(id, x, y, layer);
}
