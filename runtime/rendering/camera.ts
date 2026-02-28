import type { CameraState } from "./types.ts";
import { tween } from "../tweening/tween.ts";
import { getDeltaTime } from "./loop.ts";
import { getCameraShakeOffset } from "../tweening/helpers.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_set_camera === "function";

const hasViewportOp =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_get_viewport_size === "function";

/** Get viewport size for internal use (avoids circular import with input.ts). */
function getViewportInternal(): { width: number; height: number } {
  if (!hasViewportOp) return { width: 800, height: 600 };
  const [w, h] = (globalThis as any).Deno.core.ops.op_get_viewport_size();
  return { width: w, height: h };
}

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

// Module-level state for deadzone and bounds
let currentDeadzone: CameraDeadzone | null = null;
let currentBounds: CameraBounds | null = null;

/**
 * Set the camera position and zoom level.
 * The camera position is the world coordinate that appears at the viewport top-left corner.
 * No-op in headless mode.
 *
 * **Default camera is (0, 0)** — world origin at the top-left of the screen.
 * `setCamera(0, 0)` gives standard web-like coordinates.
 *
 * @param x - Camera top-left X in world units.
 * @param y - Camera top-left Y in world units.
 * @param zoom - Zoom level. 1.0 = default, >1.0 = zoomed in, <1.0 = zoomed out. Default: 1.
 *
 * @example
 * // Default: (0, 0) at top-left
 * setCamera(0, 0);
 *
 * @example
 * // Scroll to show a region starting at (500, 300)
 * setCamera(500, 300);
 *
 * @example
 * // Zoomed-in camera
 * setCamera(player.x, player.y, 2.0);
 */
export function setCamera(x: number, y: number, zoom: number = 1): void {
  if (!hasRenderOps) return;

  // Round to pixel boundaries to prevent sub-pixel jitter.
  let finalX = Math.round(x);
  let finalY = Math.round(y);

  // Apply bounds clamping on the TS side to match what the GPU will use.
  // Without this, getCamera() would return the unclamped value while the GPU
  // uses the clamped value, causing screenSpace/parallax sprites to jitter.
  if (currentBounds !== null) {
    const vp = getViewportInternal();
    const visW = vp.width / zoom;
    const visH = vp.height / zoom;

    const boundsW = currentBounds.maxX - currentBounds.minX;
    const boundsH = currentBounds.maxY - currentBounds.minY;

    // If visible area wider than bounds, center on bounds
    if (visW >= boundsW) {
      finalX = Math.round(currentBounds.minX + (boundsW - visW) / 2);
    } else {
      finalX = Math.round(Math.max(currentBounds.minX, Math.min(currentBounds.maxX - visW, finalX)));
    }

    // If visible area taller than bounds, center on bounds
    if (visH >= boundsH) {
      finalY = Math.round(currentBounds.minY + (boundsH - visH) / 2);
    } else {
      finalY = Math.round(Math.max(currentBounds.minY, Math.min(currentBounds.maxY - visH, finalY)));
    }
  }

  (globalThis as any).Deno.core.ops.op_set_camera(finalX, finalY, zoom);
}

/**
 * Get the current camera state (position and zoom).
 * Returns the viewport top-left position and zoom.
 * Returns `{ x: 0, y: 0, zoom: 1 }` in headless mode.
 *
 * @returns Current camera top-left position and zoom level.
 */
export function getCamera(): CameraState {
  if (!hasRenderOps) return { x: 0, y: 0, zoom: 1 };
  const [x, y, zoom] = (globalThis as any).Deno.core.ops.op_get_camera();
  // Round to ensure pixel-aligned values (guards against f32/f64 precision drift)
  return { x: Math.round(x), y: Math.round(y), zoom };
}

/**
 * Center the camera on a target position. Convenience wrapper around {@link setCamera}.
 * Computes the top-left camera position that places the target at viewport center.
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
  const vp = getViewportInternal();
  const halfVisW = vp.width / (2 * zoom);
  const halfVisH = vp.height / (2 * zoom);

  if (currentDeadzone) {
    const cam = getCamera();
    // Viewport center in world space
    const viewCenterX = cam.x + halfVisW;
    const viewCenterY = cam.y + halfVisH;

    const halfW = currentDeadzone.width / 2;
    const halfH = currentDeadzone.height / 2;
    let cx = viewCenterX;
    let cy = viewCenterY;

    if (targetX < cx - halfW) cx = targetX + halfW;
    else if (targetX > cx + halfW) cx = targetX - halfW;

    if (targetY < cy - halfH) cy = targetY + halfH;
    else if (targetY > cy + halfH) cy = targetY - halfH;

    // Convert viewport center back to top-left for setCamera
    setCamera(Math.round(cx - halfVisW), Math.round(cy - halfVisH), zoom);
  } else {
    // Center target on screen: top-left = target - half visible area
    setCamera(targetX - halfVisW, targetY - halfVisH, zoom);
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
  // Cache bounds locally for TS-side clamping in setCamera()
  currentBounds = bounds;

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
  const vp = getViewportInternal();
  const halfVisW = vp.width / (2 * zoom);
  const halfVisH = vp.height / (2 * zoom);

  // Desired camera top-left that centers the target
  let desiredX = targetX - halfVisW;
  let desiredY = targetY - halfVisH;

  // Apply deadzone logic
  if (currentDeadzone) {
    // Viewport center in world space
    const viewCenterX = cam.x + halfVisW;
    const viewCenterY = cam.y + halfVisH;

    const halfW = currentDeadzone.width / 2;
    const halfH = currentDeadzone.height / 2;
    let cx = viewCenterX;
    let cy = viewCenterY;

    if (targetX < cx - halfW) cx = targetX + halfW;
    else if (targetX > cx + halfW) cx = targetX - halfW;

    if (targetY < cy - halfH) cy = targetY + halfH;
    else if (targetY > cy + halfH) cy = targetY - halfH;

    // Convert viewport center back to top-left
    desiredX = cx - halfVisW;
    desiredY = cy - halfVisH;
  }

  // Round the desired position to prevent chasing sub-pixel targets
  const roundedDesiredX = Math.round(desiredX);
  const roundedDesiredY = Math.round(desiredY);

  // If already at the rounded target, don't move at all
  if (cam.x === roundedDesiredX && cam.y === roundedDesiredY) {
    // Already there - don't change anything (prevents micro-oscillation)
    return;
  }

  // Frame-rate independent exponential smoothing
  const dt = getDeltaTime();
  const clampedSmoothness = Math.max(0.001, Math.min(smoothness, 0.999));
  const lerpFactor = 1 - Math.pow(clampedSmoothness, dt);

  const newX = cam.x + (roundedDesiredX - cam.x) * lerpFactor;
  const newY = cam.y + (roundedDesiredY - cam.y) * lerpFactor;

  // Snap to target when within 1 pixel to prevent infinite approaching
  const distToTargetX = Math.abs(newX - roundedDesiredX);
  const distToTargetY = Math.abs(newY - roundedDesiredY);
  const snapThreshold = 1.0;

  const finalX = distToTargetX < snapThreshold ? roundedDesiredX : Math.round(newX);
  const finalY = distToTargetY < snapThreshold ? roundedDesiredY : Math.round(newY);

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

// --- Declarative camera tracking ---

/** Module-level state for trackTarget(). */
let _trackingTarget: (() => { x: number; y: number }) | null = null;
let _trackingZoom: number | (() => number) = 1;
let _trackingSmoothness = 0.1;

/**
 * Set up declarative camera tracking. The camera will automatically follow
 * the target returned by `getTarget()` each frame using smooth interpolation.
 *
 * Call once during setup — no need to call every frame. The tracking runs
 * inside the game loop via {@link updateCameraTracking}.
 *
 * @param getTarget - Getter returning the target position `{ x, y }`.
 * @param opts - Optional zoom (number or getter) and smoothness.
 *
 * @example
 * trackTarget(() => ({ x: player.x, y: player.y }), { zoom: 1, smoothness: 0.1 });
 */
export function trackTarget(
  getTarget: () => { x: number; y: number },
  opts?: { zoom?: number | (() => number); smoothness?: number },
): void {
  _trackingTarget = getTarget;
  _trackingZoom = opts?.zoom ?? 1;
  _trackingSmoothness = opts?.smoothness ?? 0.1;
}

/**
 * Stop declarative camera tracking. The camera will remain at its
 * current position.
 */
export function stopTracking(): void {
  _trackingTarget = null;
}

/**
 * Check whether declarative camera tracking is active.
 *
 * @returns `true` if {@link trackTarget} has been called and not yet stopped.
 */
export function isTracking(): boolean {
  return _trackingTarget !== null;
}

/**
 * Advance declarative camera tracking by one frame.
 * Calls {@link followTargetSmooth} with the stored target and options.
 *
 * @internal Called automatically by createGame() after the user callback.
 */
export function updateCameraTracking(): void {
  if (_trackingTarget === null) return;
  const target = _trackingTarget();
  const zoom = typeof _trackingZoom === "function" ? _trackingZoom() : _trackingZoom;
  followTargetSmooth(target.x, target.y, zoom, _trackingSmoothness);
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
