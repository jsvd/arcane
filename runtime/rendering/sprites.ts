import type { SpriteOptions } from "./types.ts";

// Detect if we're running inside the Arcane renderer (V8 with render ops).
const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_draw_sprite === "function";

/**
 * Queue a sprite to be drawn this frame.
 * No-op in headless mode (Node or V8 test runner).
 */
export function drawSprite(opts: SpriteOptions): void {
  if (!hasRenderOps) return;

  const uv = opts.uv ?? { x: 0, y: 0, w: 1, h: 1 };
  const tint = opts.tint ?? { r: 1, g: 1, b: 1, a: 1 };

  (globalThis as any).Deno.core.ops.op_draw_sprite(
    opts.textureId,
    opts.x,
    opts.y,
    opts.w,
    opts.h,
    opts.layer ?? 0,
    uv.x,
    uv.y,
    uv.w,
    uv.h,
    tint.r,
    tint.g,
    tint.b,
    tint.a,
  );
}

/**
 * Clear all queued sprites for this frame.
 * No-op in headless mode.
 */
export function clearSprites(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_sprites();
}
