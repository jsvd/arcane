const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_get_delta_time === "function";

/**
 * Register a callback to be called every frame by the Arcane renderer.
 * Only one callback can be active -- calling onFrame() again replaces the previous one.
 * The callback is invoked by the Rust game loop (not by requestAnimationFrame).
 * No-op in headless mode (the callback is stored but never invoked).
 *
 * @param callback - Function to call each frame. Use {@link getDeltaTime} inside for timing.
 *
 * @example
 * onFrame(() => {
 *   const dt = getDeltaTime();
 *   player.x += speed * dt;
 *   drawSprite({ textureId: tex, x: player.x, y: player.y, w: 32, h: 32 });
 * });
 */
export function onFrame(callback: () => void): void {
  (globalThis as any).__frameCallback = () => {
    // Reset MSDF shader param cache at the start of each frame
    // so pool slots can be reused for different param combos.
    if (typeof (globalThis as any).__arcane_reset_msdf_cache === "function") {
      (globalThis as any).__arcane_reset_msdf_cache();
    }
    callback();
  };
}

/**
 * Get the time elapsed since the last frame, in seconds.
 * Typical values: ~0.016 at 60fps, ~0.033 at 30fps.
 * Returns 0 in headless mode.
 *
 * @returns Delta time in seconds (fractional).
 */
export function getDeltaTime(): number {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_get_delta_time();
}
