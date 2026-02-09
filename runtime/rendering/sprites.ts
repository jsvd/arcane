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
