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
 * Check if a mouse button is currently held down (returns true every frame while held).
 * Returns false in headless mode.
 *
 * Button numbers:
 * - 0 = Left mouse button
 * - 1 = Right mouse button
 * - 2 = Middle mouse button (wheel click)
 *
 * @param button - Mouse button number (0 = left, 1 = right, 2 = middle).
 * @returns true if the button is currently held down, false otherwise.
 *
 * @example
 * if (isMouseButtonDown(0)) {
 *   // Left mouse button is held
 * }
 */
export function isMouseButtonDown(button: number): boolean {
  if (!hasRenderOps) return false;
  return (globalThis as any).Deno.core.ops.op_is_mouse_button_down(button);
}

/**
 * Check if a mouse button was pressed this frame (transitioned from up to down).
 * Unlike {@link isMouseButtonDown}, this returns true only on the first frame the button is pressed.
 * Returns false in headless mode.
 *
 * Button numbers:
 * - 0 = Left mouse button
 * - 1 = Right mouse button
 * - 2 = Middle mouse button (wheel click)
 *
 * @param button - Mouse button number (0 = left, 1 = right, 2 = middle).
 * @returns true if the button was just pressed this frame, false otherwise.
 *
 * @example
 * if (isMouseButtonPressed(0)) {
 *   // Left mouse button was just clicked
 * }
 */
export function isMouseButtonPressed(button: number): boolean {
  if (!hasRenderOps) return false;
  return (globalThis as any).Deno.core.ops.op_is_mouse_button_pressed(button);
}

/**
 * Get the current viewport size in logical pixels (DPI-independent).
 * On a 2x Retina display with an 800x600 window, this returns `{ width: 800, height: 600 }`,
 * not the physical pixel dimensions.
 * Returns `{ width: 800, height: 600 }` in headless mode.
 *
 * @returns Viewport dimensions in logical pixels.
 */
export function getViewportSize(): { width: number; height: number } {
  if (!hasViewportOp) return { width: 800, height: 600 };
  const [w, h] = (globalThis as any).Deno.core.ops.op_get_viewport_size();
  return { width: w, height: h };
}

/**
 * Get the display scale factor (e.g. 2.0 on Retina/HiDPI, 1.0 on standard displays).
 * Returns 1.0 in headless mode.
 */
export function getScaleFactor(): number {
  if (!hasViewportOp) return 1.0;
  return (globalThis as any).Deno.core.ops.op_get_scale_factor();
}

/**
 * Set the background/clear color for the render pass.
 * Values are in 0.0-1.0 range. Default is dark blue-gray (0.1, 0.1, 0.15).
 * No-op in headless mode.
 *
 * @param r - Red channel (0.0 to 1.0).
 * @param g - Green channel (0.0 to 1.0).
 * @param b - Blue channel (0.0 to 1.0).
 */
export function setBackgroundColor(r: number, g: number, b: number): void {
  if (!hasViewportOp) return;
  (globalThis as any).Deno.core.ops.op_set_background_color(r, g, b);
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
