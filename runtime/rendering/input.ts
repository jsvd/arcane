import type { MousePosition } from "./types.ts";
import { getCamera } from "./camera.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_is_key_down === "function";

const hasViewportOp =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_get_viewport_size === "function";

/**
 * Check if a key is currently held down (returns true every frame while held).
 * Returns false in headless mode.
 *
 * Key names follow web KeyboardEvent.key standards:
 * - Arrow keys: `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`
 * - Letters: `"a"` - `"z"` (lowercase)
 * - Digits: `"0"` - `"9"`
 * - Function keys: `"F1"` - `"F12"`
 * - Whitespace: `"Space"`, `"Tab"`, `"Enter"`
 * - Modifiers: `"Shift"`, `"Control"`, `"Alt"`
 * - Navigation: `"Escape"`, `"Backspace"`, `"Delete"`, `"Home"`, `"End"`, `"PageUp"`, `"PageDown"`
 *
 * @param key - Key name string (case-sensitive, web standard).
 * @returns true if the key is currently held down, false otherwise.
 *
 * @example
 * if (isKeyDown("ArrowRight")) {
 *   player.x += speed * dt;
 * }
 */
export function isKeyDown(key: string): boolean {
  if (!hasRenderOps) return false;
  return (globalThis as any).Deno.core.ops.op_is_key_down(key);
}

/**
 * Check if a key was pressed this frame (transitioned from up to down).
 * Unlike {@link isKeyDown}, this returns true only on the first frame the key is pressed.
 * Returns false in headless mode.
 *
 * Valid key names are the same as {@link isKeyDown}:
 * `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`, `"Space"`, `"Enter"`,
 * `"Escape"`, `"Tab"`, `"Shift"`, `"Control"`, `"Alt"`, `"a"`-`"z"`, `"0"`-`"9"`, `"F1"`-`"F12"`,
 * `"Backspace"`, `"Delete"`, `"Home"`, `"End"`, `"PageUp"`, `"PageDown"`.
 *
 * @param key - Key name string (case-sensitive, web standard).
 * @returns true if the key was just pressed this frame, false otherwise.
 */
export function isKeyPressed(key: string): boolean {
  if (!hasRenderOps) return false;
  return (globalThis as any).Deno.core.ops.op_is_key_pressed(key);
}

/**
 * Get the current mouse position in screen/window coordinates (pixels).
 * (0, 0) is the top-left corner of the window.
 * Returns `{ x: 0, y: 0 }` in headless mode.
 * Use {@link getMouseWorldPosition} for world-space coordinates.
 *
 * @returns Mouse position in screen pixels.
 */
export function getMousePosition(): MousePosition {
  if (!hasRenderOps) return { x: 0, y: 0 };
  const [x, y] = (globalThis as any).Deno.core.ops.op_get_mouse_position();
  return { x, y };
}

/**
 * Get the current viewport size in pixels.
 * Returns `{ width: 800, height: 600 }` in headless mode.
 *
 * @returns Viewport dimensions in pixels.
 */
export function getViewportSize(): { width: number; height: number } {
  if (!hasViewportOp) return { width: 800, height: 600 };
  const [w, h] = (globalThis as any).Deno.core.ops.op_get_viewport_size();
  return { width: w, height: h };
}

/**
 * Convert screen/window coordinates to world coordinates using the current camera.
 * Accounts for camera position and zoom.
 *
 * @param screenX - X position in screen pixels (0 = left edge).
 * @param screenY - Y position in screen pixels (0 = top edge).
 * @returns Corresponding world-space position.
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
 * Convenience function combining {@link getMousePosition} and {@link screenToWorld}.
 *
 * @returns Mouse position in world units.
 */
export function getMouseWorldPosition(): MousePosition {
  const screenPos = getMousePosition();
  return screenToWorld(screenPos.x, screenPos.y);
}
