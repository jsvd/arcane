import type { TilemapId, TilemapOptions } from "./types.ts";
import { _logDrawCall } from "../testing/visual.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_tilemap === "function";

// ---------------------------------------------------------------------------
// Animated tile registry (module-level, shared across all tilemaps)
// ---------------------------------------------------------------------------

/** Definition for an animated tile: cycles through a sequence of tile IDs. */
export type AnimatedTileDef = {
  /** Ordered list of tile IDs to cycle through. Must have at least 2 entries. */
  frames: number[];
  /** Duration of each frame in seconds. */
  frameDuration: number;
};

/**
 * Registry of animated tile definitions.
 * Key = the "base" tile ID used in setTile/setLayerTile; value = animation def.
 * When drawing, the engine substitutes the current frame's tile ID.
 */
const animatedTileDefs: Map<number, AnimatedTileDef> = new Map();

/** Accumulated time for animated tile cycling (seconds). */
let animatedTileTime = 0;

/**
 * Register a tile ID as animated. When this tile ID appears in any tilemap,
 * it will cycle through the given frames at the given speed.
 *
 * @param baseTileId - The tile ID that triggers animation (the one you place).
 * @param frames - Array of tile IDs to cycle through (atlas indices, 1-based).
 * @param frameDuration - Duration of each frame in seconds.
 */
export function registerAnimatedTile(
  baseTileId: number,
  frames: number[],
  frameDuration: number,
): void {
  if (frames.length < 2) {
    throw new Error("registerAnimatedTile: frames must have at least 2 entries");
  }
  if (frameDuration <= 0) {
    throw new Error("registerAnimatedTile: frameDuration must be positive");
  }
  animatedTileDefs.set(baseTileId, { frames, frameDuration });
}

/**
 * Remove an animated tile registration.
 */
export function unregisterAnimatedTile(baseTileId: number): void {
  animatedTileDefs.delete(baseTileId);
}

/**
 * Clear all animated tile registrations.
 */
export function clearAnimatedTiles(): void {
  animatedTileDefs.clear();
  animatedTileTime = 0;
}

/**
 * Update animated tile timer. Call once per frame with delta time.
 * This advances all animated tiles globally.
 *
 * @param dt - Delta time in seconds since last frame.
 */
export function updateAnimatedTiles(dt: number): void {
  animatedTileTime += dt;
}

/**
 * Resolve a tile ID to its current animation frame.
 * If the tile is not animated, returns the original ID.
 */
export function resolveAnimatedTile(tileId: number): number {
  const def = animatedTileDefs.get(tileId);
  if (!def) return tileId;
  const frameIndex = Math.floor(animatedTileTime / def.frameDuration) % def.frames.length;
  return def.frames[frameIndex];
}

/**
 * Get all registered animated tile definitions.
 * Returns a read-only copy.
 */
export function getAnimatedTileDefs(): ReadonlyMap<number, AnimatedTileDef> {
  return animatedTileDefs;
}

// ---------------------------------------------------------------------------
// Tile properties registry (module-level)
// ---------------------------------------------------------------------------

/** Custom properties for a tile type (indexed by tile ID). */
export type TileProperties = Record<string, unknown>;

/** Map from tile ID to custom properties. */
const tilePropertiesMap: Map<number, TileProperties> = new Map();

/**
 * Define custom properties for a tile ID. Properties are metadata like
 * "walkable", "damage", "friction", etc. Queryable at runtime.
 *
 * @param tileId - The tile ID (atlas index, 1-based).
 * @param properties - Key-value pairs of custom metadata.
 */
export function defineTileProperties(
  tileId: number,
  properties: TileProperties,
): void {
  tilePropertiesMap.set(tileId, { ...properties });
}

/**
 * Get the custom properties for a tile ID.
 * Returns undefined if no properties are defined for this tile.
 */
export function getTileProperties(tileId: number): TileProperties | undefined {
  const props = tilePropertiesMap.get(tileId);
  return props ? { ...props } : undefined;
}

/**
 * Get a specific property value for a tile ID.
 * Returns undefined if the tile has no properties or lacks the given key.
 */
export function getTileProperty(tileId: number, key: string): unknown {
  const props = tilePropertiesMap.get(tileId);
  return props ? props[key] : undefined;
}

/**
 * Query tile properties at a specific grid position in a layered tilemap.
 * Returns properties of the tile at (gx, gy) on the given layer,
 * or undefined if the tile has no properties or position is empty.
 */
export function getTilePropertiesAt(
  tilemap: LayeredTilemap,
  layerName: string,
  gx: number,
  gy: number,
): TileProperties | undefined {
  const layer = tilemap.layers.get(layerName);
  if (!layer) return undefined;
  const tileId = getLayerTile(tilemap, layerName, gx, gy);
  if (tileId === 0) return undefined;
  return getTileProperties(tileId);
}

/**
 * Query a specific property at a grid position.
 */
export function getTilePropertyAt(
  tilemap: LayeredTilemap,
  layerName: string,
  gx: number,
  gy: number,
  key: string,
): unknown {
  const props = getTilePropertiesAt(tilemap, layerName, gx, gy);
  return props ? props[key] : undefined;
}

/**
 * Clear all tile property definitions.
 */
export function clearTileProperties(): void {
  tilePropertiesMap.clear();
}

// ---------------------------------------------------------------------------
// Layered tilemap
// ---------------------------------------------------------------------------

/** A single layer in a layered tilemap. */
export type TilemapLayer = {
  /** Layer name (unique within the tilemap). */
  name: string;
  /** Underlying Rust tilemap handle. */
  tilemapId: TilemapId;
  /** Draw order (lower = drawn first / behind). */
  zOrder: number;
  /** Whether this layer is visible. Default: true. */
  visible: boolean;
  /** Opacity for this layer (0-1). Default: 1. */
  opacity: number;
  /** Parallax depth factor (0 = fixed/HUD, 0.5 = half speed, 1 = normal). Default: 1. */
  parallaxFactor: number;
};

/** Options for creating a layer. */
export type LayerOptions = {
  /** Draw order. Lower = behind. Default: 0. */
  zOrder?: number;
  /** Whether the layer is visible. Default: true. */
  visible?: boolean;
  /** Layer opacity (0-1). Default: 1. */
  opacity?: number;
  /** Parallax depth factor. Default: 1. */
  parallaxFactor?: number;
};

/** A multi-layer tilemap that manages multiple Rust tilemap instances. */
export type LayeredTilemap = {
  /** Base configuration shared across all layers. */
  config: TilemapOptions;
  /** Map of layer name to layer data. */
  layers: Map<string, TilemapLayer>;
  /** Grid width in tiles. */
  width: number;
  /** Grid height in tiles. */
  height: number;
  /** Size of each tile in world units. */
  tileSize: number;
};

/**
 * Create a multi-layer tilemap. All layers share the same grid dimensions
 * and texture atlas. Each layer is a separate Rust tilemap handle.
 *
 * @param opts - Base tilemap configuration (atlas, grid size, tile size).
 * @param layerDefs - Array of [name, options?] pairs defining the layers.
 * @returns A LayeredTilemap that manages all layers.
 *
 * @example
 * ```ts
 * const map = createLayeredTilemap(
 *   { textureId: atlas, width: 40, height: 30, tileSize: 16, atlasColumns: 8, atlasRows: 8 },
 *   [
 *     ["ground", { zOrder: 0 }],
 *     ["walls", { zOrder: 10 }],
 *     ["decoration", { zOrder: 20 }],
 *     ["collision", { zOrder: -1, visible: false }],
 *   ],
 * );
 * ```
 */
export function createLayeredTilemap(
  opts: TilemapOptions,
  layerDefs: Array<[string, LayerOptions?]>,
): LayeredTilemap {
  const layers = new Map<string, TilemapLayer>();

  for (const [name, layerOpts] of layerDefs) {
    if (layers.has(name)) {
      throw new Error(`createLayeredTilemap: duplicate layer name "${name}"`);
    }

    const tilemapId = createTilemap(opts);
    layers.set(name, {
      name,
      tilemapId,
      zOrder: layerOpts?.zOrder ?? 0,
      visible: layerOpts?.visible ?? true,
      opacity: layerOpts?.opacity ?? 1,
      parallaxFactor: layerOpts?.parallaxFactor ?? 1,
    });
  }

  return {
    config: { ...opts },
    layers,
    width: opts.width,
    height: opts.height,
    tileSize: opts.tileSize,
  };
}

/**
 * Set a tile on a specific layer.
 *
 * @param tilemap - The layered tilemap.
 * @param layerName - Which layer to modify.
 * @param gx - Grid X position.
 * @param gy - Grid Y position.
 * @param tileId - Tile index in the atlas (1-based). 0 = empty.
 */
export function setLayerTile(
  tilemap: LayeredTilemap,
  layerName: string,
  gx: number,
  gy: number,
  tileId: number,
): void {
  const layer = tilemap.layers.get(layerName);
  if (!layer) return;
  setTile(layer.tilemapId, gx, gy, tileId);
}

/**
 * Get a tile from a specific layer.
 *
 * @returns Tile ID at the given position, or 0 if empty/out of bounds/layer not found.
 */
export function getLayerTile(
  tilemap: LayeredTilemap,
  layerName: string,
  gx: number,
  gy: number,
): number {
  const layer = tilemap.layers.get(layerName);
  if (!layer) return 0;
  return getTile(layer.tilemapId, gx, gy);
}

/**
 * Set the visibility of a layer.
 */
export function setLayerVisible(
  tilemap: LayeredTilemap,
  layerName: string,
  visible: boolean,
): void {
  const layer = tilemap.layers.get(layerName);
  if (layer) layer.visible = visible;
}

/**
 * Set the opacity of a layer (0-1).
 */
export function setLayerOpacity(
  tilemap: LayeredTilemap,
  layerName: string,
  opacity: number,
): void {
  const layer = tilemap.layers.get(layerName);
  if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));
}

/**
 * Get layer names in z-order (front to back).
 */
export function getLayerNames(tilemap: LayeredTilemap): string[] {
  return Array.from(tilemap.layers.values())
    .sort((a, b) => a.zOrder - b.zOrder)
    .map((l) => l.name);
}

/**
 * Draw all visible layers of a layered tilemap, sorted by z-order.
 * Supports animated tiles (call updateAnimatedTiles(dt) before this each frame).
 * Supports per-layer parallax scrolling relative to a camera position.
 *
 * @param tilemap - The layered tilemap to draw.
 * @param x - World X offset for the tilemap origin.
 * @param y - World Y offset for the tilemap origin.
 * @param baseLayer - Base draw order layer. Each tilemap layer adds its zOrder.
 * @param cameraX - Camera X for parallax calculation. Default: 0.
 * @param cameraY - Camera Y for parallax calculation. Default: 0.
 */
export function drawLayeredTilemap(
  tilemap: LayeredTilemap,
  x: number = 0,
  y: number = 0,
  baseLayer: number = 0,
  cameraX: number = 0,
  cameraY: number = 0,
): void {
  // Apply animated tiles before drawing: update each layer's tile data
  if (animatedTileDefs.size > 0) {
    applyAnimatedTilesToLayers(tilemap);
  }

  // Sort layers by z-order for correct draw ordering
  const sorted = Array.from(tilemap.layers.values())
    .filter((l) => l.visible)
    .sort((a, b) => a.zOrder - b.zOrder);

  for (const layer of sorted) {
    // Calculate parallax offset
    const parallaxOffsetX = cameraX * (1 - layer.parallaxFactor);
    const parallaxOffsetY = cameraY * (1 - layer.parallaxFactor);

    const drawX = x + parallaxOffsetX;
    const drawY = y + parallaxOffsetY;

    drawTilemap(layer.tilemapId, drawX, drawY, baseLayer + layer.zOrder);
  }
}

// ---------------------------------------------------------------------------
// Internal: animated tile application
// ---------------------------------------------------------------------------

/** Track the original tile data so we can resolve animated tiles each frame. */
const originalTileData: Map<TilemapId, Map<string, number>> = new Map();

/**
 * Internal: record original tile ID when setting tiles, so we know which
 * tiles are animated and need frame resolution each draw call.
 */
function recordOriginalTile(tilemapId: TilemapId, gx: number, gy: number, tileId: number): void {
  if (!animatedTileDefs.has(tileId) && tileId !== 0) {
    // Not animated, clean up any old record
    const tmData = originalTileData.get(tilemapId);
    if (tmData) tmData.delete(`${gx},${gy}`);
    return;
  }

  if (tileId === 0) {
    const tmData = originalTileData.get(tilemapId);
    if (tmData) tmData.delete(`${gx},${gy}`);
    return;
  }

  let tmData = originalTileData.get(tilemapId);
  if (!tmData) {
    tmData = new Map();
    originalTileData.set(tilemapId, tmData);
  }
  tmData.set(`${gx},${gy}`, tileId);
}

/**
 * Apply animated tile resolution to all layers before drawing.
 * This updates the underlying Rust tilemap with the current animation frame.
 */
function applyAnimatedTilesToLayers(tilemap: LayeredTilemap): void {
  for (const layer of tilemap.layers.values()) {
    const tmData = originalTileData.get(layer.tilemapId);
    if (!tmData || tmData.size === 0) continue;

    for (const [key, baseTileId] of tmData) {
      const resolved = resolveAnimatedTile(baseTileId);
      const [gxStr, gyStr] = key.split(",");
      const gx = parseInt(gxStr, 10);
      const gy = parseInt(gyStr, 10);
      // Update the underlying Rust tilemap with resolved frame
      setTileRaw(layer.tilemapId, gx, gy, resolved);
    }
  }
}

// ---------------------------------------------------------------------------
// Original single-tilemap API (backward compatible)
// ---------------------------------------------------------------------------

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
 * If the tile ID is registered as animated (via registerAnimatedTile), the tile
 * will automatically cycle through its frames when drawn.
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
  // Track animated tiles
  recordOriginalTile(id, gx, gy, tileId);
  setTileRaw(id, gx, gy, tileId);
}

/** Internal: set tile without recording for animation tracking. */
function setTileRaw(
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
 * Returns the original tile ID (not the animated frame).
 * Returns 0 if out of bounds or in headless mode.
 *
 * @param id - Tilemap handle from createTilemap().
 * @param gx - Grid X position (column).
 * @param gy - Grid Y position (row).
 * @returns Tile ID at the given position, or 0 if empty/out of bounds.
 */
export function getTile(id: TilemapId, gx: number, gy: number): number {
  // Return original tile ID if it's an animated tile
  const tmData = originalTileData.get(id);
  if (tmData) {
    const original = tmData.get(`${gx},${gy}`);
    if (original !== undefined) return original;
  }

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
  _logDrawCall({ type: "tilemap", tilemapId: id, x, y, layer });
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_draw_tilemap(id, x, y, layer);
}

/**
 * Fill a rectangular region of a tilemap with a single tile ID.
 * Convenient for bulk tile placement.
 *
 * @param id - Tilemap handle.
 * @param startX - Starting grid X.
 * @param startY - Starting grid Y.
 * @param endX - Ending grid X (exclusive).
 * @param endY - Ending grid Y (exclusive).
 * @param tileId - Tile ID to fill with.
 */
export function fillTiles(
  id: TilemapId,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileId: number,
): void {
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      setTile(id, gx, gy, tileId);
    }
  }
}

/**
 * Fill a rectangular region of a layered tilemap with a single tile ID.
 */
export function fillLayerTiles(
  tilemap: LayeredTilemap,
  layerName: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tileId: number,
): void {
  const layer = tilemap.layers.get(layerName);
  if (!layer) return;
  fillTiles(layer.tilemapId, startX, startY, endX, endY, tileId);
}
