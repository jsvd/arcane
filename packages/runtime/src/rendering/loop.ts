const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_get_delta_time === "function";

/**
 * Register a callback to be called each frame.
 * Only one callback can be active at a time (last one wins).
 * No-op in headless mode.
 */
export function onFrame(callback: () => void): void {
  (globalThis as any).__frameCallback = callback;
}

/**
 * Get the time elapsed since the last frame, in seconds.
 * Returns 0 in headless mode.
 */
export function getDeltaTime(): number {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_get_delta_time();
}
