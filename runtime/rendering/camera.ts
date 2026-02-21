import type { CameraState } from "./types.ts";
import { tween } from "../tweening/tween.ts";
import { getDeltaTime } from "./loop.ts";
import { getCameraShakeOffset } from "../tweening/helpers.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_set_camera === "function";

/** Camera bounds: world-space limits the camera cannot exceed. */
export type CameraBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Camera deadzone: target can move within this region without camera following. */
export type CameraDeadzone = {
  /** Deadzone width in world units, centered on camera. */
  width: number;
  /** Deadzone height in world units, centered on camera. */
  height: number;
};

// Module-level state for deadzone
let currentDeadzone: CameraDeadzone | null = null;

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
  if (currentDeadzone) {
    const cam = getCamera();
    const halfW = currentDeadzone.width / 2;
    const halfH = currentDeadzone.height / 2;
    let cx = cam.x;
    let cy = cam.y;

    if (targetX < cx - halfW) cx = targetX + halfW;
    else if (targetX > cx + halfW) cx = targetX - halfW;

    if (targetY < cy - halfH) cy = targetY + halfH;
    else if (targetY > cy + halfH) cy = targetY - halfH;

    setCamera(cx, cy, zoom);
  } else {
    setCamera(targetX, targetY, zoom);
  }
}

/**
 * Set world-space bounds that the camera cannot exceed.
 * The camera is clamped so the visible area stays within these bounds.
 * If the visible area is larger than the bounds, the camera centers on the bounds.
 * Bounds are enforced on the Rust/GPU side every frame.
 *
 * @param bounds - World-space limits, or `null` to clear bounds.
 *
 * @example
 * // Restrict camera to a 1600×1200 map starting at origin
 * setCameraBounds({ minX: 0, minY: 0, maxX: 1600, maxY: 1200 });
 *
 * @example
 * // Remove bounds
 * setCameraBounds(null);
 */
export function setCameraBounds(bounds: CameraBounds | null): void {
  if (!hasRenderOps) return;
  if (bounds) {
    (globalThis as any).Deno.core.ops.op_set_camera_bounds(
      bounds.minX, bounds.minY, bounds.maxX, bounds.maxY,
    );
  } else {
    (globalThis as any).Deno.core.ops.op_clear_camera_bounds();
  }
}

/**
 * Get the current camera bounds, or `null` if no bounds are set.
 *
 * @returns Current bounds or null.
 */
export function getCameraBounds(): CameraBounds | null {
  if (!hasRenderOps) return null;
  const arr: number[] = (globalThis as any).Deno.core.ops.op_get_camera_bounds();
  if (arr.length === 0) return null;
  return { minX: arr[0], minY: arr[1], maxX: arr[2], maxY: arr[3] };
}

/**
 * Set a deadzone: an area centered on the camera where the target can move
 * without the camera following. The camera only moves when the target exits
 * the deadzone rectangle.
 *
 * @param deadzone - Deadzone dimensions in world units, or `null` to disable.
 *
 * @example
 * // Player can move 200×150 world units before camera follows
 * setCameraDeadzone({ width: 200, height: 150 });
 */
export function setCameraDeadzone(deadzone: CameraDeadzone | null): void {
  currentDeadzone = deadzone;
}

/**
 * Get the current camera deadzone, or `null` if no deadzone is set.
 */
export function getCameraDeadzone(): CameraDeadzone | null {
  return currentDeadzone;
}

/**
 * Smoothly follow a target position using exponential interpolation.
 * Call every frame. The camera lerps toward the target position at a rate
 * controlled by `smoothness`. Respects deadzone if set.
 *
 * Uses frame-rate independent smoothing: `lerp = 1 - smoothness^dt`.
 * At smoothness=0.1 the camera reaches ~90% of the target in 1 second.
 *
 * @param targetX - Target X position in world units.
 * @param targetY - Target Y position in world units.
 * @param zoom - Zoom level. Default: 1.
 * @param smoothness - Smoothing factor (0..1). Lower = faster follow. Default: 0.1.
 *   - 0.001: very fast (nearly instant)
 *   - 0.1: smooth (default)
 *   - 0.5: slow/cinematic
 *
 * @example
 * onFrame(() => {
 *   followTargetSmooth(player.x, player.y, 1, 0.1);
 * });
 */
export function followTargetSmooth(
  targetX: number,
  targetY: number,
  zoom: number = 1,
  smoothness: number = 0.1,
): void {
  const cam = getCamera();
  let desiredX = targetX;
  let desiredY = targetY;

  // Apply deadzone logic
  if (currentDeadzone) {
    const halfW = currentDeadzone.width / 2;
    const halfH = currentDeadzone.height / 2;
    desiredX = cam.x;
    desiredY = cam.y;

    if (targetX < cam.x - halfW) desiredX = targetX + halfW;
    else if (targetX > cam.x + halfW) desiredX = targetX - halfW;

    if (targetY < cam.y - halfH) desiredY = targetY + halfH;
    else if (targetY > cam.y + halfH) desiredY = targetY - halfH;
  }

  // Frame-rate independent exponential smoothing
  const dt = getDeltaTime();
  const clampedSmoothness = Math.max(0.001, Math.min(smoothness, 0.999));
  const lerpFactor = 1 - Math.pow(clampedSmoothness, dt);

  const newX = cam.x + (desiredX - cam.x) * lerpFactor;
  const newY = cam.y + (desiredY - cam.y) * lerpFactor;

  // Prevent tiny movements that cause jitter - if movement is less than threshold, don't move
  const threshold = 0.01;
  const deltaX = newX - cam.x;
  const deltaY = newY - cam.y;

  const finalX = Math.abs(deltaX) < threshold ? cam.x : newX;
  const finalY = Math.abs(deltaY) < threshold ? cam.y : newY;

  setCamera(finalX, finalY, zoom);
}

/**
 * Smoothly animate the camera zoom to a target level over a duration.
 * Uses the tweening system for frame-rate independent animation.
 *
 * @param targetZoom - Target zoom level.
 * @param duration - Animation duration in seconds.
 * @param easing - Optional easing function. Default: linear.
 *
 * @example
 * // Zoom in to 2x over 0.5 seconds
 * zoomTo(2.0, 0.5, easeOutQuad);
 */
export function zoomTo(
  targetZoom: number,
  duration: number,
  easing?: (t: number) => number,
): void {
  const cam = getCamera();
  const state = { zoom: cam.zoom };
  tween(state, { zoom: targetZoom }, duration, {
    easing,
    onUpdate: () => {
      const current = getCamera();
      setCamera(current.x, current.y, state.zoom);
    },
    onComplete: () => {
      const current = getCamera();
      setCamera(current.x, current.y, targetZoom);
    },
  });
}

/**
 * Smoothly animate the camera zoom while keeping a world point stationary on screen.
 * Useful for zooming into/out of a specific location (e.g., mouse cursor position).
 *
 * @param targetZoom - Target zoom level.
 * @param worldX - World X coordinate to keep fixed on screen.
 * @param worldY - World Y coordinate to keep fixed on screen.
 * @param duration - Animation duration in seconds.
 * @param easing - Optional easing function. Default: linear.
 *
 * @example
 * // Zoom into the point under the mouse
 * const mouse = getMouseWorldPosition();
 * zoomToPoint(3.0, mouse.x, mouse.y, 0.3, easeOutCubic);
 */
export function zoomToPoint(
  targetZoom: number,
  worldX: number,
  worldY: number,
  duration: number,
  easing?: (t: number) => number,
): void {
  const cam = getCamera();
  const startZoom = cam.zoom;
  const startCamX = cam.x;
  const startCamY = cam.y;
  const state = { t: 0 };
  tween(state, { t: 1 }, duration, {
    easing,
    onUpdate: () => {
      const currentZoom = startZoom + (targetZoom - startZoom) * state.t;
      // Keep worldX,worldY at the same screen position
      const newCamX = worldX - (worldX - startCamX) * startZoom / currentZoom;
      const newCamY = worldY - (worldY - startCamY) * startZoom / currentZoom;
      setCamera(newCamX, newCamY, currentZoom);
    },
    onComplete: () => {
      const finalCamX = worldX - (worldX - startCamX) * startZoom / targetZoom;
      const finalCamY = worldY - (worldY - startCamY) * startZoom / targetZoom;
      setCamera(finalCamX, finalCamY, targetZoom);
    },
  });
}

/**
 * Follow a target with smooth interpolation and automatic camera shake offset.
 * Wraps {@link followTargetSmooth} + {@link getCameraShakeOffset} into one call.
 *
 * Equivalent to:
 * ```ts
 * const shake = getCameraShakeOffset();
 * followTargetSmooth(targetX + shake.x, targetY + shake.y, zoom, smoothness);
 * ```
 *
 * @param targetX - Target X position in world units.
 * @param targetY - Target Y position in world units.
 * @param zoom - Zoom level. Default: 1.
 * @param smoothness - Smoothing factor (0..1). Lower = faster follow. Default: 0.1.
 *
 * @example
 * onFrame(() => {
 *   followTargetWithShake(player.x, player.y, 2.0, 0.08);
 * });
 */
export function followTargetWithShake(
  targetX: number,
  targetY: number,
  zoom: number = 1,
  smoothness: number = 0.1,
): void {
  const shake = getCameraShakeOffset();
  followTargetSmooth(targetX + shake.x, targetY + shake.y, zoom, smoothness);
}
