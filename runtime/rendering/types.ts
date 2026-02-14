/**
 * Opaque handle to a loaded texture. Returned by {@link loadTexture} or {@link createSolidTexture}.
 * A value of 0 means "no texture" (headless mode fallback).
 */
export type TextureId = number;

/**
 * Options for drawing a sprite via {@link drawSprite}.
 *
 * Positions are in **world space**. The camera determines what's visible:
 * - Default camera (0, 0): screen center = world (0, 0). Top-left = (-vpW/2, -vpH/2).
 * - After `setCamera(vpW/2, vpH/2)`: screen top-left = world (0, 0) — web-like coords.
 *
 * Y increases downward. The sprite's (x, y) is its top-left corner.
 */
export type SpriteOptions = {
  /** Texture handle from loadTexture() or createSolidTexture(). */
  textureId: TextureId;
  /** World X position (top-left corner of sprite). See type docs for coordinate system. */
  x: number;
  /** World Y position (top-left corner of sprite). Y increases downward. */
  y: number;
  /** Width in world units (pixels at zoom 1). */
  w: number;
  /** Height in world units (pixels at zoom 1). */
  h: number;
  /** Draw order layer. Lower values are drawn first (behind). Default: 0. Use 100+ for HUD elements. */
  layer?: number;
  /**
   * UV sub-rectangle for atlas/sprite-sheet textures.
   * All values are normalized 0.0-1.0 (fraction of full texture).
   * Default: full texture `{ x: 0, y: 0, w: 1, h: 1 }`.
   */
  uv?: { x: number; y: number; w: number; h: number };
  /**
   * RGBA tint color multiplied with the texture color.
   * Each channel is 0.0-1.0. Default: white `{ r: 1, g: 1, b: 1, a: 1 }` (no tint).
   */
  tint?: { r: number; g: number; b: number; a: number };
  /** Rotation angle in radians. Default: 0 (no rotation). Positive = clockwise. */
  rotation?: number;
  /** X origin for rotation, 0-1 relative to sprite width. Default: 0.5 (center). */
  originX?: number;
  /** Y origin for rotation, 0-1 relative to sprite height. Default: 0.5 (center). */
  originY?: number;
  /** Mirror the sprite horizontally. Default: false. */
  flipX?: boolean;
  /** Mirror the sprite vertically. Default: false. */
  flipY?: boolean;
  /** Opacity 0-1, multiplied with tint alpha. Default: 1 (fully opaque). */
  opacity?: number;
  /**
   * Blend mode for compositing. Default: "alpha".
   * - "alpha": standard transparency (src * srcA + dst * (1 - srcA))
   * - "additive": glow/fire/particles (src * srcA + dst)
   * - "multiply": shadows/darkening (src * dst)
   * - "screen": highlights/lightening (src + dst * (1 - src))
   */
  blendMode?: "alpha" | "additive" | "multiply" | "screen";
  /** Custom shader handle from createShaderFromSource(). Default: 0 (built-in shader). */
  shaderId?: number;
  /**
   * Simple 2D shadow: draws a squashed, tinted duplicate beneath the sprite.
   * No GPU changes — pure sprite duplication with transform.
   */
  shadow?: {
    /** Horizontal shadow offset in world units. Default: 2. */
    offsetX?: number;
    /** Vertical shadow offset in world units. Default: 4. */
    offsetY?: number;
    /** Shadow tint color. Default: black with 0.3 alpha. */
    color?: { r: number; g: number; b: number; a: number };
    /** Vertical scale for the shadow (0.5 = squashed). Default: 0.5. */
    scaleY?: number;
  };
};

/** Camera state returned by {@link getCamera}. */
export type CameraState = {
  /** Camera center X position in world units. */
  x: number;
  /** Camera center Y position in world units. */
  y: number;
  /** Zoom level. 1.0 = default, >1.0 = zoomed in, <1.0 = zoomed out. */
  zoom: number;
};

/** Mouse position in screen or world coordinates. */
export type MousePosition = {
  /** X position in pixels (screen) or world units (world). */
  x: number;
  /** Y position in pixels (screen) or world units (world). */
  y: number;
};

/**
 * Opaque handle to a tilemap. Returned by {@link createTilemap}.
 * A value of 0 means "no tilemap" (headless mode fallback).
 */
export type TilemapId = number;

/** Options for creating a tilemap via {@link createTilemap}. */
export type TilemapOptions = {
  /** Texture atlas handle from loadTexture(). Must be a valid TextureId. */
  textureId: number;
  /** Grid width in tiles. Must be a positive integer. */
  width: number;
  /** Grid height in tiles. Must be a positive integer. */
  height: number;
  /** Size of each tile in world units (pixels at zoom 1). Must be positive. */
  tileSize: number;
  /** Number of tile columns in the texture atlas. Must be a positive integer. */
  atlasColumns: number;
  /** Number of tile rows in the texture atlas. Must be a positive integer. */
  atlasRows: number;
};
