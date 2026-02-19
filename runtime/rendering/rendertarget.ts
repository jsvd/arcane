import type { TextureId } from "./types.ts";

const hasRenderTargetOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_render_target === "function";

/**
 * Opaque handle for an off-screen render target.
 * The same value can be used as a `TextureId` in `drawSprite()`.
 */
export type RenderTargetId = number;

/**
 * Create an off-screen RGBA render target of the given pixel dimensions.
 * Returns an ID that can be used both as a `RenderTargetId` (with `beginRenderTarget`)
 * and as a `TextureId` (with `drawSprite`, `createTilemap`, etc.).
 *
 * The render target is cleared to transparent black before each render pass.
 *
 * Returns 0 in headless mode.
 *
 * @param width  Width in pixels
 * @param height Height in pixels
 * @returns Handle usable as both RenderTargetId and TextureId
 *
 * @example
 * // Draw a minimap into an off-screen texture, then display it
 * const minimap = createRenderTarget(128, 128);
 *
 * onFrame((dt) => {
 *   beginRenderTarget(minimap);
 *     drawSprite({ textureId: mapTex, x: 0, y: 0, w: 128, h: 128 });
 *   endRenderTarget();
 *
 *   // Render minimap in the corner
 *   drawSprite({ textureId: minimap, x: 10, y: 10, w: 128, h: 128 });
 * });
 */
export function createRenderTarget(width: number, height: number): RenderTargetId {
  if (!hasRenderTargetOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_render_target(
    width | 0,
    height | 0,
  );
}

/**
 * Route subsequent `drawSprite()` calls into this render target.
 *
 * Coordinate system inside the target: `(0, 0)` = top-left corner.
 * This differs from the main surface where `(0, 0)` = screen center (after setCamera).
 *
 * Calls must be balanced: every `beginRenderTarget()` needs a matching `endRenderTarget()`.
 * Nesting is not supported.
 *
 * @param id Handle returned by `createRenderTarget()`
 *
 * @example
 * beginRenderTarget(myTarget);
 *   drawSprite({ textureId: tex, x: 0, y: 0, w: 64, h: 64 });
 * endRenderTarget();
 */
export function beginRenderTarget(id: RenderTargetId): void {
  if (!hasRenderTargetOps) return;
  (globalThis as any).Deno.core.ops.op_begin_render_target(id);
}

/**
 * End the current render target pass and return to rendering on the main surface.
 *
 * @example
 * beginRenderTarget(myTarget);
 *   drawSprite({ textureId: tex, x: 0, y: 0, w: 64, h: 64 });
 * endRenderTarget();
 */
export function endRenderTarget(): void {
  if (!hasRenderTargetOps) return;
  (globalThis as any).Deno.core.ops.op_end_render_target();
}

/**
 * Get the `TextureId` for sampling a render target in `drawSprite()`.
 * The returned value is the same as the `RenderTargetId` — they are identical.
 * This function exists for clarity; you can use the ID directly as a `textureId`.
 *
 * @param id Handle returned by `createRenderTarget()`
 * @returns TextureId for use with drawSprite, createTilemap, etc.
 *
 * @example
 * const rt = createRenderTarget(256, 256);
 * // Both are equivalent:
 * drawSprite({ textureId: rt, x: 0, y: 0, w: 256, h: 256 });
 * drawSprite({ textureId: getRenderTargetTextureId(rt), x: 0, y: 0, w: 256, h: 256 });
 */
export function getRenderTargetTextureId(id: RenderTargetId): TextureId {
  return id; // RenderTargetId IS the TextureId
}

/**
 * Free the GPU resources for a render target.
 * After this call, using the ID as a TextureId will produce a transparent sprite.
 * Do not call `beginRenderTarget()` on a destroyed target.
 *
 * @param id Handle returned by `createRenderTarget()`
 */
export function destroyRenderTarget(id: RenderTargetId): void {
  if (!hasRenderTargetOps) return;
  (globalThis as any).Deno.core.ops.op_destroy_render_target(id);
}
