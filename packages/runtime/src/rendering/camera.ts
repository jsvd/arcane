import type { CameraState } from "./types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_set_camera === "function";

/**
 * Set the camera position and zoom.
 * No-op in headless mode.
 */
export function setCamera(x: number, y: number, zoom: number = 1): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_camera(x, y, zoom);
}

/**
 * Get the current camera state.
 * Returns default values in headless mode.
 */
export function getCamera(): CameraState {
  if (!hasRenderOps) return { x: 0, y: 0, zoom: 1 };
  const [x, y, zoom] = (globalThis as any).Deno.core.ops.op_get_camera();
  return { x, y, zoom };
}

/**
 * Center the camera on a target position.
 */
export function followTarget(
  targetX: number,
  targetY: number,
  zoom: number = 1,
): void {
  setCamera(targetX, targetY, zoom);
}
