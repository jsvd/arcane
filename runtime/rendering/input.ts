import type { MousePosition } from "./types.ts";
import { getCamera } from "./camera.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_is_key_down === "function";

const hasViewportOp =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_get_viewport_size === "function";

/**
 * Check if a key is currently held down.
 * Key names match web standards: "ArrowUp", "ArrowDown", "a", "Space", etc.
 * Returns false in headless mode.
 */
export function isKeyDown(key: string): boolean {
  if (!hasRenderOps) return false;
  return (globalThis as any).Deno.core.ops.op_is_key_down(key);
}

/**
 * Check if a key was pressed this frame (just went down).
 * Returns false in headless mode.
 */
export function isKeyPressed(key: string): boolean {
  if (!hasRenderOps) return false;
  return (globalThis as any).Deno.core.ops.op_is_key_pressed(key);
}

/**
 * Get the current mouse position in window/screen coordinates.
 * Returns (0, 0) in headless mode.
 */
export function getMousePosition(): MousePosition {
  if (!hasRenderOps) return { x: 0, y: 0 };
  const [x, y] = (globalThis as any).Deno.core.ops.op_get_mouse_position();
  return { x, y };
}

/**
 * Get the current viewport size in pixels.
 * Returns [800, 600] in headless mode.
 */
export function getViewportSize(): { width: number; height: number } {
  if (!hasViewportOp) return { width: 800, height: 600 };
  const [w, h] = (globalThis as any).Deno.core.ops.op_get_viewport_size();
  return { width: w, height: h };
}

/**
 * Convert screen/window coordinates to world coordinates using the current camera.
 * Screen coordinates: (0, 0) = top-left, (viewport_width, viewport_height) = bottom-right
 * World coordinates: transformed by camera position and zoom
 */
export function screenToWorld(screenX: number, screenY: number): MousePosition {
  const viewport = getViewportSize();
  const camera = getCamera();

  // Calculate the world space bounds visible on screen
  const halfW = viewport.width / (2.0 * camera.zoom);
  const halfH = viewport.height / (2.0 * camera.zoom);

  // Normalize screen position to 0..1
  const normX = screenX / viewport.width;
  const normY = screenY / viewport.height;

  // Map to world space
  const worldX = (camera.x - halfW) + normX * (2 * halfW);
  const worldY = (camera.y - halfH) + normY * (2 * halfH);

  return { x: worldX, y: worldY };
}

/**
 * Get the mouse position in world coordinates (accounting for camera transform).
 * This is a convenience function that combines getMousePosition() and screenToWorld().
 */
export function getMouseWorldPosition(): MousePosition {
  const screenPos = getMousePosition();
  return screenToWorld(screenPos.x, screenPos.y);
}
