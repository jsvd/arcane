import type { MousePosition } from "./types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_is_key_down === "function";

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
 * Get the current mouse position in window coordinates.
 * Returns (0, 0) in headless mode.
 */
export function getMousePosition(): MousePosition {
  if (!hasRenderOps) return { x: 0, y: 0 };
  const [x, y] = (globalThis as any).Deno.core.ops.op_get_mouse_position();
  return { x, y };
}
