import type { SpriteOptions } from "./types.ts";
import { getCamera } from "./camera.ts";
import { getViewportSize } from "./input.ts";
import { _logDrawCall } from "../testing/visual.ts";

// Detect if we're running inside the Arcane renderer (V8 with render ops).
const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_draw_sprite === "function";

// Detect if the bulk sprite batch op is available (Phase 26+).
const hasBatchOp =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_submit_sprite_batch === "function";

// --- Batch sprite buffer ---
// Pre-allocate a Float32Array for batching sprites (22 f32s per sprite, max 16384 sprites).
const SPRITE_STRIDE = 22;
const MAX_BATCH_SPRITES = 16384;
const _batchBuffer = new Float32Array(MAX_BATCH_SPRITES * SPRITE_STRIDE);
let _batchCount = 0;

const blendModeMap: Record<string, number> = {
  alpha: 0,
  additive: 1,
  multiply: 2,
  screen: 3,
};

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
  const texId = opts.textureId;
  let x = opts.x;
  let y = opts.y;
  let w = opts.w;
  let h = opts.h;
  const layer = opts.layer ?? 0;

  // Screen-space conversion: transform screen pixels to world coordinates
  if (opts.screenSpace) {
    const cam = getCamera();
    const { width: vpW, height: vpH } = getViewportSize();
    x = x / cam.zoom + cam.x - vpW / (2 * cam.zoom);
    y = y / cam.zoom + cam.y - vpH / (2 * cam.zoom);
    w = w / cam.zoom;
    h = h / cam.zoom;
  }
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
  const blendMode = blendModeMap[opts.blendMode ?? "alpha"] ?? 0;
  const shaderId = opts.shaderId ?? 0;

  // If batch op available, write into the batch buffer
  if (hasBatchOp) {
    if (_batchCount >= MAX_BATCH_SPRITES) {
      // Buffer full — flush before writing more
      _flushSpriteBatch();
    }
    const base = _batchCount * SPRITE_STRIDE;
    // texture_id and layer are stored as f32 bit patterns of their u32/i32 values
    // This matches the Rust side which reads them with f32::to_bits()
    const view = new DataView(_batchBuffer.buffer);
    view.setUint32(base * 4, texId, true); // texture_id as u32 bits in f32 slot
    _batchBuffer[base + 1] = x;
    _batchBuffer[base + 2] = y;
    _batchBuffer[base + 3] = w;
    _batchBuffer[base + 4] = h;
    view.setInt32((base + 5) * 4, layer, true); // layer as i32 bits in f32 slot
    _batchBuffer[base + 6] = uvX;
    _batchBuffer[base + 7] = uvY;
    _batchBuffer[base + 8] = uvW;
    _batchBuffer[base + 9] = uvH;
    _batchBuffer[base + 10] = tintR;
    _batchBuffer[base + 11] = tintG;
    _batchBuffer[base + 12] = tintB;
    _batchBuffer[base + 13] = tintA;
    _batchBuffer[base + 14] = rotation;
    _batchBuffer[base + 15] = originX;
    _batchBuffer[base + 16] = originY;
    _batchBuffer[base + 17] = flipX;
    _batchBuffer[base + 18] = flipY;
    _batchBuffer[base + 19] = opacity;
    _batchBuffer[base + 20] = blendMode;
    view.setUint32((base + 21) * 4, shaderId, true); // shader_id as u32 bits in f32 slot
    _batchCount++;
    return;
  }

  // Fallback: individual op call
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
 * Flush the sprite batch buffer to the Rust renderer.
 * Called automatically by clearSprites() at the frame boundary.
 * Can also be called manually if needed (e.g., mid-frame flush).
 */
export function _flushSpriteBatch(): void {
  if (_batchCount === 0) return;
  if (!hasBatchOp) return;

  // Submit only the used portion of the buffer as raw bytes
  const byteLen = _batchCount * SPRITE_STRIDE * 4;
  const slice = new Uint8Array(_batchBuffer.buffer, 0, byteLen);
  (globalThis as any).Deno.core.ops.op_submit_sprite_batch(slice);
  _batchCount = 0;
}

/**
 * Clear all queued sprites for this frame.
 * Normally not needed -- the renderer clears automatically at frame start.
 * No-op in headless mode.
 *
 * When batch mode is active, flushes the accumulated batch to Rust first,
 * then clears the Rust-side sprite command list.
 */
export function clearSprites(): void {
  if (!hasRenderOps) return;

  // Flush any pending batched sprites before clearing
  _flushSpriteBatch();

  (globalThis as any).Deno.core.ops.op_clear_sprites();
}
