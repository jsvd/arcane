/**
 * Tweening helper functions for common game effects
 *
 * Provides high-level utilities like camera shake and screen flash.
 */

import { tween } from "./tween.ts";
import { easeOutQuad } from "./easing.ts";

/**
 * Camera shake state (for tracking active shake)
 */
let shakeState = {
  offsetX: 0,
  offsetY: 0,
  active: false,
};

/**
 * Apply camera shake effect
 * @param intensity - Maximum offset in pixels
 * @param duration - Duration in seconds
 * @param frequency - Number of shakes per second (default: 20)
 * @returns Camera offset that should be added to camera position
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
 * Get current camera shake offset
 * @returns {x, y} offset in pixels to add to camera position
 */
export function getCameraShakeOffset(): { x: number; y: number } {
  return {
    x: shakeState.offsetX,
    y: shakeState.offsetY,
  };
}

/**
 * Check if camera shake is active
 */
export function isCameraShaking(): boolean {
  return shakeState.active;
}

/**
 * Stop camera shake immediately
 */
export function stopCameraShake(): void {
  shakeState.active = false;
  shakeState.offsetX = 0;
  shakeState.offsetY = 0;
}

/**
 * Screen flash state (for tracking active flash)
 */
let flashState = {
  opacity: 0,
  r: 1,
  g: 1,
  b: 1,
  active: false,
};

/**
 * Flash the screen with a color
 * @param r - Red component (0-1)
 * @param g - Green component (0-1)
 * @param b - Blue component (0-1)
 * @param duration - Duration in seconds
 * @param startOpacity - Initial opacity (default: 0.8)
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
 * Get current screen flash state
 * @returns Flash color and opacity, or null if no flash active
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
 * Check if screen flash is active
 */
export function isScreenFlashing(): boolean {
  return flashState.active;
}

/**
 * Stop screen flash immediately
 */
export function stopScreenFlash(): void {
  flashState.active = false;
  flashState.opacity = 0;
}
