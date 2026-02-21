/**
 * Draw sprites with inline color — no manual createSolidTexture() needed.
 *
 * Internally caches solid textures by RGBA value so repeated calls
 * with the same color reuse the same GPU texture.
 */

import type { SpriteOptions } from "../rendering/types.ts";
import type { Color } from "../ui/types.ts";
import type { ColorSpriteOptions } from "./types.ts";
import { drawSprite } from "../rendering/sprites.ts";
import { createSolidTexture } from "../rendering/texture.ts";
import { warnColor } from "../ui/colors.ts";

/** @internal Color texture cache. Keyed by "r_g_b_a" string. */
const _colorTexCache = new Map<string, number>();

/** @internal Get or create a cached solid texture for a color. */
function getColorTex(color: Color): number {
  const key = `${color.r}_${color.g}_${color.b}_${color.a ?? 1}`;
  let tex = _colorTexCache.get(key);
  if (tex !== undefined) return tex;
  tex = createSolidTexture(`_color_${key}`, { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 });
  _colorTexCache.set(key, tex);
  return tex;
}

/**
 * Draw a sprite using an inline color instead of a pre-created texture.
 * Textures are cached by color value — safe to call every frame.
 *
 * @param opts - Sprite options with `color` instead of `textureId`.
 *
 * @example
 * drawColorSprite({
 *   color: rgb(255, 0, 0),
 *   x: 100, y: 200, w: 32, h: 32,
 *   layer: 1,
 * });
 */
export function drawColorSprite(opts: ColorSpriteOptions): void {
  warnColor(opts.color, "drawColorSprite");
  const textureId = opts.textureId ?? getColorTex(opts.color);

  const spriteOpts: SpriteOptions = {
    textureId,
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    layer: opts.layer,
    uv: opts.uv,
    tint: opts.tint,
    rotation: opts.rotation,
    originX: opts.originX,
    originY: opts.originY,
    flipX: opts.flipX,
    flipY: opts.flipY,
    opacity: opts.opacity,
    blendMode: opts.blendMode,
    shaderId: opts.shaderId,
    shadow: opts.shadow,
  };
  drawSprite(spriteOpts);
}

/** @internal Reset color texture cache (for tests). */
export function _resetColorTexCache(): void {
  _colorTexCache.clear();
}
