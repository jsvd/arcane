import type { CameraState } from "./types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_set_camera === "function";

/**
 * Set the camera position and zoom level.
 * The camera determines which part of the world is visible on screen.
 * The camera center appears at the center of the viewport.
 * No-op in headless mode.
 *
 * **Default camera is (0, 0)** — world origin is at screen center, NOT top-left.
 * For web-like coordinates where (0, 0) is top-left:
 * `setCamera(vpW / 2, vpH / 2)` (use getViewportSize() for vpW/vpH).
 *
 * @param x - Camera center X in world units.
 * @param y - Camera center Y in world units.
 * @param zoom - Zoom level. 1.0 = default, >1.0 = zoomed in, <1.0 = zoomed out. Default: 1.
 *
 * @example
 * // Web-like coords: (0, 0) at top-left
 * const { width, height } = getViewportSize();
 * setCamera(width / 2, height / 2);
 *
 * @example
 * // Center camera on the player (scrolling game)
 * setCamera(player.x, player.y);
 *
 * @example
 * // Zoomed-in camera
 * setCamera(player.x, player.y, 2.0);
 */
export function setCamera(x: number, y: number, zoom: number = 1): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_camera(x, y, zoom);
}

/**
 * Get the current camera state (position and zoom).
 * Returns `{ x: 0, y: 0, zoom: 1 }` in headless mode.
 *
 * @returns Current camera position and zoom level.
 */
export function getCamera(): CameraState {
  if (!hasRenderOps) return { x: 0, y: 0, zoom: 1 };
  const [x, y, zoom] = (globalThis as any).Deno.core.ops.op_get_camera();
  return { x, y, zoom };
}

/**
 * Center the camera on a target position. Convenience wrapper around {@link setCamera}.
 * Call every frame to follow a moving target.
 *
 * @param targetX - Target X position in world units to center on.
 * @param targetY - Target Y position in world units to center on.
 * @param zoom - Zoom level. Default: 1.
 *
 * @example
 * // Follow the player each frame
 * followTarget(player.x, player.y);
 */
export function followTarget(
  targetX: number,
  targetY: number,
  zoom: number = 1,
): void {
  setCamera(targetX, targetY, zoom);
}
