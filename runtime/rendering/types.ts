/** Opaque handle to a loaded texture. */
export type TextureId = number;

/** Options for drawing a sprite. */
export type SpriteOptions = {
  /** Texture handle from loadTexture() or createSolidTexture(). */
  textureId: TextureId;
  /** World X position (top-left corner). */
  x: number;
  /** World Y position (top-left corner). */
  y: number;
  /** Width in world units. */
  w: number;
  /** Height in world units. */
  h: number;
  /** Draw order layer (lower = drawn first / behind). Default: 0. */
  layer?: number;
  /** UV sub-rect for atlas sprites. Default: full texture. */
  uv?: { x: number; y: number; w: number; h: number };
  /** RGBA tint color (0-1 range). Default: white (1,1,1,1). */
  tint?: { r: number; g: number; b: number; a: number };
};

/** Camera state. */
export type CameraState = {
  x: number;
  y: number;
  zoom: number;
};

/** Mouse position. */
export type MousePosition = {
  x: number;
  y: number;
};
