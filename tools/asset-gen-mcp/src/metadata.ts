/**
 * Output metadata builders for generated assets.
 *
 * These structured types describe generated sprites, tilesets, and sprite sheets
 * so that MCP tool callers can integrate the assets into their Arcane projects.
 */

/** Metadata for a single generated sprite image. */
export interface SpriteMetadata {
  /** Asset name (e.g. "player_idle"). */
  name: string;
  /** File path where the image was written. */
  path: string;
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
}

/** Metadata for a generated tileset image. */
export interface TilesetMetadata {
  /** Asset name (e.g. "dungeon_walls"). */
  name: string;
  /** File path where the image was written. */
  path: string;
  /** Size of each tile in pixels (tiles are square). */
  tileSize: number;
  /** Number of tile columns in the sheet. */
  columns: number;
  /** Number of tile rows in the sheet. */
  rows: number;
  /** Total number of tiles (columns * rows). */
  totalTiles: number;
}

/** Metadata for a generated sprite sheet (animation frames). */
export interface SpriteSheetMetadata {
  /** Asset name (e.g. "player_walk"). */
  name: string;
  /** File path where the image was written. */
  path: string;
  /** Number of animation frames. */
  frames: number;
  /** Animation name for use with createAnimation(). */
  animation: string;
  /** Width of each frame in pixels. */
  frameWidth: number;
  /** Height of each frame in pixels. */
  frameHeight: number;
  /** Total sheet width in pixels (frames * frameWidth). */
  sheetWidth: number;
  /** Total sheet height in pixels. */
  sheetHeight: number;
}

/**
 * Build metadata for a single sprite asset.
 *
 * @param name - Asset name.
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @param path - File path where the image was written.
 * @returns Structured sprite metadata.
 */
export function buildSpriteMetadata(
  name: string,
  width: number,
  height: number,
  path: string,
): SpriteMetadata {
  return { name, path, width, height };
}

/**
 * Build metadata for a tileset asset.
 *
 * @param name - Asset name.
 * @param tileSize - Size of each tile in pixels.
 * @param columns - Number of tile columns.
 * @param rows - Number of tile rows.
 * @param path - File path where the image was written.
 * @returns Structured tileset metadata with computed totalTiles.
 */
export function buildTilesetMetadata(
  name: string,
  tileSize: number,
  columns: number,
  rows: number,
  path: string,
): TilesetMetadata {
  return { name, path, tileSize, columns, rows, totalTiles: columns * rows };
}

/**
 * Build metadata for a sprite sheet (animation frames).
 *
 * @param name - Asset name.
 * @param frames - Number of animation frames.
 * @param animation - Animation name for use with createAnimation().
 * @param frameWidth - Width of each frame in pixels.
 * @param frameHeight - Height of each frame in pixels.
 * @param path - File path where the image was written.
 * @returns Structured sprite sheet metadata with computed sheet dimensions.
 */
export function buildSpriteSheetMetadata(
  name: string,
  frames: number,
  animation: string,
  frameWidth: number,
  frameHeight: number,
  path: string,
): SpriteSheetMetadata {
  return {
    name,
    path,
    frames,
    animation,
    frameWidth,
    frameHeight,
    sheetWidth: frames * frameWidth,
    sheetHeight: frameHeight,
  };
}
