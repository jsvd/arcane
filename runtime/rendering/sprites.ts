import type { SpriteOptions } from "./types.ts";
import { _logDrawCall } from "../testing/visual.ts";

// Detect if we're running inside the Arcane renderer (V8 with render ops).
const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_draw_sprite === "function";

/**
 * Queue a sprite to be drawn this frame.
 * Must be called every frame -- sprites are not persisted between frames.
 * No-op in headless mode (safe to import in game logic).
 *
 * @param opts - Sprite rendering options (position, size, texture, layer, UV, tint).
 *
 * @example
 * drawSprite({
 *   textureId: playerTex,
 *   x: player.x, y: player.y,
 *   w: 32, h: 32,
 *   layer: 1,
 * });
 *
 * @example
 * // Draw a tinted, atlas-based sprite
 * drawSprite({
 *   textureId: atlas,
 *   x: 100, y: 200,
 *   w: 16, h: 16,
 *   uv: { x: 0.25, y: 0, w: 0.25, h: 0.5 },
 *   tint: { r: 1, g: 0.5, b: 0.5, a: 1 },
 *   layer: 5,
 * });
 */
export function drawSprite(opts: SpriteOptions): void {
  // Draw shadow first (behind the main sprite) if requested
  if (opts.shadow) {
    const s = opts.shadow;
    const shadowOffsetX = s.offsetX ?? 2;
    const shadowOffsetY = s.offsetY ?? 4;
    const shadowColor = s.color ?? { r: 0, g: 0, b: 0, a: 0.3 };
    const shadowScaleY = s.scaleY ?? 0.5;
    const shadowLayer = (opts.layer ?? 0) - 1;
    const shadowH = opts.h * shadowScaleY;
    const shadowY = opts.y + opts.h - shadowH + shadowOffsetY;

    // Recursively call drawSprite without shadow to avoid infinite loop
    drawSprite({
      textureId: opts.textureId,
      x: opts.x + shadowOffsetX,
      y: shadowY,
      w: opts.w,
      h: shadowH,
      layer: shadowLayer,
      uv: opts.uv,
      tint: shadowColor,
      rotation: opts.rotation,
      originX: opts.originX,
      originY: opts.originY,
      flipX: opts.flipX,
      flipY: opts.flipY,
      opacity: shadowColor.a,
      blendMode: opts.blendMode,
      shaderId: opts.shaderId,
    });
  }

  _logDrawCall({
    type: "sprite",
    textureId: opts.textureId,
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    layer: opts.layer ?? 0,
    rotation: opts.rotation ?? 0,
    flipX: opts.flipX ?? false,
    flipY: opts.flipY ?? false,
    opacity: opts.opacity ?? 1,
    blendMode: opts.blendMode ?? "alpha",
    shaderId: opts.shaderId ?? 0,
  });
  if (!hasRenderOps) return;

  const uv = opts.uv ?? { x: 0, y: 0, w: 1, h: 1 };
  const tint = opts.tint ?? { r: 1, g: 1, b: 1, a: 1 };

  // Extract ALL properties to temp variables to work around V8 object literal property access bug
  // Bug: accessing multiple properties from same object in function args causes all to evaluate to parent
  const texId = opts.textureId;
  const x = opts.x;
  const y = opts.y;
  const w = opts.w;
  const h = opts.h;
  const layer = opts.layer ?? 0;
  const uvX = uv.x;
  const uvY = uv.y;
  const uvW = uv.w;
  const uvH = uv.h;
  const tintR = tint.r;
  const tintG = tint.g;
  const tintB = tint.b;
  const tintA = tint.a;
  const rotation = opts.rotation ?? 0;
  const originX = opts.originX ?? 0.5;
  const originY = opts.originY ?? 0.5;
  const flipX = opts.flipX ? 1 : 0;
  const flipY = opts.flipY ? 1 : 0;
  const opacity = opts.opacity ?? 1;
  const blendModeMap: Record<string, number> = {
    alpha: 0,
    additive: 1,
    multiply: 2,
    screen: 3,
  };
  const blendMode = blendModeMap[opts.blendMode ?? "alpha"] ?? 0;
  const shaderId = opts.shaderId ?? 0;

  (globalThis as any).Deno.core.ops.op_draw_sprite(
    texId,
    x,
    y,
    w,
    h,
    layer,
    uvX,
    uvY,
    uvW,
    uvH,
    tintR,
    tintG,
    tintB,
    tintA,
    rotation,
    originX,
    originY,
    flipX,
    flipY,
    opacity,
    blendMode,
    shaderId,
  );
}

/**
 * Clear all queued sprites for this frame.
 * Normally not needed -- the renderer clears automatically at frame start.
 * No-op in headless mode.
 */
export function clearSprites(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_sprites();
}
