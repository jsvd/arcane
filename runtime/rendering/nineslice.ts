/**
 * Nine-slice sprite rendering.
 *
 * Draws a texture as a nine-slice panel: the four corners remain at fixed size,
 * the four edges stretch in one dimension, and the center stretches in both.
 * This allows scalable UI panels without corner distortion.
 *
 * ```
 *  ┌────┬────────┬────┐
 *  │ TL │  Top   │ TR │   Corners: fixed size
 *  ├────┼────────┼────┤   Edges: stretch in one axis
 *  │ L  │ Center │  R │   Center: stretches both axes
 *  ├────┼────────┼────┤
 *  │ BL │ Bottom │ BR │
 *  └────┴────────┴────┘
 * ```
 *
 * @example
 * ```ts
 * drawNineSlice(panelTex, 100, 50, 300, 200, { border: 16 });
 * ```
 */

import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";
import { getCamera } from "./camera.ts";
import { getViewportSize } from "./input.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Border inset configuration for nine-slice. */
export type NineSliceBorder = {
  /** Top border inset in texture pixels. */
  top: number;
  /** Bottom border inset in texture pixels. */
  bottom: number;
  /** Left border inset in texture pixels. */
  left: number;
  /** Right border inset in texture pixels. */
  right: number;
};

/** Options for drawNineSlice. */
export type NineSliceOptions = {
  /**
   * Border insets. Can be a single number (uniform on all sides)
   * or a per-edge object.
   */
  border: number | NineSliceBorder;
  /** Draw order layer. Default: 0. */
  layer?: number;
  /** Tint color. Default: white (no tint). */
  tint?: { r: number; g: number; b: number; a: number };
  /** Opacity 0-1. Default: 1. */
  opacity?: number;
  /** If true, x/y/w/h are in screen pixels. Default: false. */
  screenSpace?: boolean;
  /**
   * Texture dimensions in pixels. Required for correct UV calculation.
   * If not provided, assumes 1:1 mapping (UV border = border / 256).
   */
  textureWidth?: number;
  /** Texture height in pixels. Default: 256. */
  textureHeight?: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeBorder(border: number | NineSliceBorder): NineSliceBorder {
  if (typeof border === "number") {
    return { top: border, bottom: border, left: border, right: border };
  }
  return border;
}

function toWorld(
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  screenSpace: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!screenSpace) return { x: sx, y: sy, w: sw, h: sh };
  const cam = getCamera();
  const { width: vpW, height: vpH } = getViewportSize();
  return {
    x: sx / cam.zoom + cam.x - vpW / (2 * cam.zoom),
    y: sy / cam.zoom + cam.y - vpH / (2 * cam.zoom),
    w: sw / cam.zoom,
    h: sh / cam.zoom,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Draw a nine-slice panel from a texture.
 *
 * The texture is divided into a 3x3 grid based on `border` insets. Corners
 * are drawn at fixed size, edges stretch, and the center fills the remainder.
 *
 * No-op in headless mode (drawSprite is a no-op).
 *
 * @param textureId - Texture handle from loadTexture().
 * @param x - X position (world or screen-space).
 * @param y - Y position (world or screen-space).
 * @param w - Total width of the panel.
 * @param h - Total height of the panel.
 * @param options - Border insets, layer, tint, opacity, screenSpace.
 */
export function drawNineSlice(
  textureId: TextureId,
  x: number,
  y: number,
  w: number,
  h: number,
  options: NineSliceOptions,
): void {
  const border = normalizeBorder(options.border);
  const layerVal = options.layer ?? 0;
  const tint = options.tint ?? { r: 1, g: 1, b: 1, a: 1 };
  const opacity = options.opacity ?? 1;
  const ss = options.screenSpace ?? false;
  const texW = options.textureWidth ?? 256;
  const texH = options.textureHeight ?? 256;

  // UV insets (normalized 0-1)
  const uvLeft = border.left / texW;
  const uvRight = border.right / texW;
  const uvTop = border.top / texH;
  const uvBottom = border.bottom / texH;

  // Sizes of the center region in draw space
  const centerW = Math.max(0, w - border.left - border.right);
  const centerH = Math.max(0, h - border.top - border.bottom);

  // UV center region
  const uvCenterW = Math.max(0, 1 - uvLeft - uvRight);
  const uvCenterH = Math.max(0, 1 - uvTop - uvBottom);

  // 9 slices: [row][col] where row/col = 0(top/left), 1(center), 2(bottom/right)
  const slices: Array<{
    sx: number; sy: number; sw: number; sh: number;
    uvx: number; uvy: number; uvw: number; uvh: number;
  }> = [
    // Row 0 (top)
    { sx: x, sy: y, sw: border.left, sh: border.top,
      uvx: 0, uvy: 0, uvw: uvLeft, uvh: uvTop },
    { sx: x + border.left, sy: y, sw: centerW, sh: border.top,
      uvx: uvLeft, uvy: 0, uvw: uvCenterW, uvh: uvTop },
    { sx: x + border.left + centerW, sy: y, sw: border.right, sh: border.top,
      uvx: 1 - uvRight, uvy: 0, uvw: uvRight, uvh: uvTop },
    // Row 1 (center)
    { sx: x, sy: y + border.top, sw: border.left, sh: centerH,
      uvx: 0, uvy: uvTop, uvw: uvLeft, uvh: uvCenterH },
    { sx: x + border.left, sy: y + border.top, sw: centerW, sh: centerH,
      uvx: uvLeft, uvy: uvTop, uvw: uvCenterW, uvh: uvCenterH },
    { sx: x + border.left + centerW, sy: y + border.top, sw: border.right, sh: centerH,
      uvx: 1 - uvRight, uvy: uvTop, uvw: uvRight, uvh: uvCenterH },
    // Row 2 (bottom)
    { sx: x, sy: y + border.top + centerH, sw: border.left, sh: border.bottom,
      uvx: 0, uvy: 1 - uvBottom, uvw: uvLeft, uvh: uvBottom },
    { sx: x + border.left, sy: y + border.top + centerH, sw: centerW, sh: border.bottom,
      uvx: uvLeft, uvy: 1 - uvBottom, uvw: uvCenterW, uvh: uvBottom },
    { sx: x + border.left + centerW, sy: y + border.top + centerH, sw: border.right, sh: border.bottom,
      uvx: 1 - uvRight, uvy: 1 - uvBottom, uvw: uvRight, uvh: uvBottom },
  ];

  for (const slice of slices) {
    // Skip zero-sized slices
    if (slice.sw <= 0 || slice.sh <= 0 || slice.uvw <= 0 || slice.uvh <= 0) continue;

    const world = toWorld(slice.sx, slice.sy, slice.sw, slice.sh, ss);
    drawSprite({
      textureId,
      x: world.x,
      y: world.y,
      w: world.w,
      h: world.h,
      layer: layerVal,
      uv: { x: slice.uvx, y: slice.uvy, w: slice.uvw, h: slice.uvh },
      tint,
      opacity,
    });
  }
}

/**
 * Compute how many drawSprite calls a nine-slice will emit (for testing).
 * Depends on whether any slices have zero dimensions.
 *
 * @param w - Panel width.
 * @param h - Panel height.
 * @param border - Border insets.
 * @returns Number of sprite draw calls that would be emitted.
 */
export function getNineSliceSpriteCount(
  w: number,
  h: number,
  border: number | NineSliceBorder,
): number {
  const b = normalizeBorder(border);
  const centerW = Math.max(0, w - b.left - b.right);
  const centerH = Math.max(0, h - b.top - b.bottom);
  let count = 0;

  // corners
  if (b.left > 0 && b.top > 0) count++;
  if (b.right > 0 && b.top > 0) count++;
  if (b.left > 0 && b.bottom > 0) count++;
  if (b.right > 0 && b.bottom > 0) count++;

  // top/bottom edges
  if (centerW > 0 && b.top > 0) count++;
  if (centerW > 0 && b.bottom > 0) count++;

  // left/right edges
  if (b.left > 0 && centerH > 0) count++;
  if (b.right > 0 && centerH > 0) count++;

  // center
  if (centerW > 0 && centerH > 0) count++;

  return count;
}
