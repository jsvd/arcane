/**
 * Tweening helper functions for common game "juice" effects.
 *
 * Camera shake and screen flash are implemented as global singletons.
 * Only one shake and one flash can be active at a time; starting a new one
 * replaces the previous.
 *
 * Usage: call the effect function, then read the offset/flash state each frame
 * when rendering.
 */

import { tween } from "./tween.ts";
import { easeOutQuad } from "./easing.ts";
import { drawRect } from "../ui/primitives.ts";
import { getViewportSize } from "../rendering/input.ts";

/** Internal camera shake state (global singleton). */
let shakeState = {
  offsetX: 0,
  offsetY: 0,
  active: false,
};

/**
 * Start a camera shake effect that decays over time using easeOutQuad.
 *
 * Each frame, read the offset via {@link getCameraShakeOffset} and add it
 * to your camera position. The offset oscillates randomly and decays to zero.
 *
 * @param intensity - Maximum shake offset in pixels. Higher = more violent. Must be > 0.
 * @param duration - Duration of the shake in seconds. Must be > 0.
 * @param frequency - Unused currently; reserved for future use. Default: 20.
 */
export function shakeCamera(
  intensity: number,
  duration: number,
  frequency: number = 20,
): void {
  shakeState.active = true;

  // Store original intensity for interpolation
  const startIntensity = intensity;

  // Create a decay tween
  const decay = { value: 1.0 };
  tween(decay, { value: 0 }, duration, {
    easing: easeOutQuad,
    onUpdate: (progress) => {
      // Decay intensity over time
      const currentIntensity = startIntensity * (1 - progress);

      // Generate random offsets with current intensity
      // Use a simple pseudo-random pattern based on time
      const angle = Math.random() * Math.PI * 2;
      shakeState.offsetX = Math.cos(angle) * currentIntensity;
      shakeState.offsetY = Math.sin(angle) * currentIntensity;
    },
    onComplete: () => {
      shakeState.active = false;
      shakeState.offsetX = 0;
      shakeState.offsetY = 0;
    },
  });
}

/**
 * Get the current camera shake offset for this frame.
 * Returns {0, 0} when no shake is active.
 *
 * @returns Object with `x` and `y` pixel offsets to add to camera position.
 */
export function getCameraShakeOffset(): { x: number; y: number } {
  return {
    x: shakeState.offsetX,
    y: shakeState.offsetY,
  };
}

/**
 * Check whether a camera shake effect is currently active.
 * @returns True if shake is in progress, false otherwise.
 */
export function isCameraShaking(): boolean {
  return shakeState.active;
}

/**
 * Stop the camera shake immediately, resetting the offset to zero.
 */
export function stopCameraShake(): void {
  shakeState.active = false;
  shakeState.offsetX = 0;
  shakeState.offsetY = 0;
}

/** Internal screen flash state (global singleton). */
let flashState = {
  opacity: 0,
  r: 1,
  g: 1,
  b: 1,
  active: false,
};

/**
 * Flash the screen with a colored overlay that fades out using easeOutQuad.
 *
 * Each frame, read the flash state via {@link getScreenFlash} and render
 * a full-screen rectangle with the returned color and opacity.
 *
 * @param r - Red component, 0.0 (none) to 1.0 (full).
 * @param g - Green component, 0.0 (none) to 1.0 (full).
 * @param b - Blue component, 0.0 (none) to 1.0 (full).
 * @param duration - Fade-out duration in seconds. Must be > 0.
 * @param startOpacity - Initial opacity of the flash overlay. Default: 0.8. Range: 0.0..1.0.
 */
export function flashScreen(
  r: number,
  g: number,
  b: number,
  duration: number,
  startOpacity: number = 0.8,
): void {
  flashState.active = true;
  flashState.r = r;
  flashState.g = g;
  flashState.b = b;
  flashState.opacity = startOpacity;

  // Fade out the flash
  tween(flashState, { opacity: 0 }, duration, {
    easing: easeOutQuad,
    onComplete: () => {
      flashState.active = false;
    },
  });
}

/**
 * Get the current screen flash color and opacity for this frame.
 *
 * @returns Flash state with `r`, `g`, `b` (0..1) and `opacity` (0..1), or `null` if no flash is active.
 */
export function getScreenFlash(): { r: number; g: number; b: number; opacity: number } | null {
  if (!flashState.active) return null;
  return {
    r: flashState.r,
    g: flashState.g,
    b: flashState.b,
    opacity: flashState.opacity,
  };
}

/**
 * Check whether a screen flash effect is currently active.
 * @returns True if flash is in progress, false otherwise.
 */
export function isScreenFlashing(): boolean {
  return flashState.active;
}

/**
 * Stop the screen flash immediately, resetting opacity to zero.
 */
export function stopScreenFlash(): void {
  flashState.active = false;
  flashState.opacity = 0;
}

/**
 * Draw the screen flash overlay if a flash is active. No-op if inactive.
 *
 * Call this each frame after your game rendering (similar to `drawScreenTransition()`).
 * This is the auto-rendering alternative to manually reading {@link getScreenFlash}
 * and drawing a rectangle yourself.
 *
 * @example
 * // In onFrame:
 * updateTweens(dt);
 * // ... render game ...
 * drawScreenFlash();  // auto-renders flash overlay
 */
export function drawScreenFlash(): void {
  if (!flashState.active) return;
  const { width, height } = getViewportSize();
  drawRect(0, 0, width, height, {
    color: { r: flashState.r, g: flashState.g, b: flashState.b, a: flashState.opacity },
    screenSpace: true,
    layer: 200,
  });
}
