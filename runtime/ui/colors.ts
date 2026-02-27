/**
 * Standard color palette and layout helpers for consistent UI styling.
 */

import type { Color } from "./types.ts";

// --- Color validation ---

/** Set of already-warned call sites to avoid log spam. */
const _colorWarnings = new Set<string>();

/**
 * Validate a Color object in debug mode.
 * Logs a warning (once per unique caller) if any channel exceeds 1.0,
 * which usually means the developer passed 0-255 integers instead of
 * 0.0-1.0 floats. Use `rgb(r, g, b)` to convert from 0-255.
 *
 * @param color - The color to validate.
 * @param caller - Name of the calling function (for the warning message).
 */
export function _warnColor(color: Color | undefined, caller: string): void {
  if (!color) return;
  if (color.r <= 1.0 && color.g <= 1.0 && color.b <= 1.0 && (color.a === undefined || color.a <= 1.0)) return;
  if (_colorWarnings.has(caller)) return;
  _colorWarnings.add(caller);
  console.warn(
    `[arcane] ${caller}(): color channel > 1.0 detected (r=${color.r}, g=${color.g}, b=${color.b}). ` +
    `Colors use 0.0-1.0 floats, not 0-255. Use rgb(r, g, b) to convert from 0-255 values.`
  );
}

/**
 * Arcane UI Color Palette.
 * Pre-defined colors (0.0-1.0 RGBA) for consistent visual style across all demos.
 */
export const Colors = {
  // Primary UI Colors
  /** Bright blue. */
  PRIMARY: { r: 0.2, g: 0.6, b: 1.0, a: 1.0 },
  /** Green (success state). */
  SUCCESS: { r: 0.2, g: 0.8, b: 0.3, a: 1.0 },
  /** Orange/Yellow (warning state). */
  WARNING: { r: 1.0, g: 0.7, b: 0.0, a: 1.0 },
  /** Red (danger/error state). */
  DANGER: { r: 1.0, g: 0.3, b: 0.3, a: 1.0 },
  /** Cyan (informational). */
  INFO: { r: 0.4, g: 0.8, b: 0.9, a: 1.0 },

  // Grayscale
  /** Pure white. */
  WHITE: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
  /** Light gray. */
  LIGHT_GRAY: { r: 0.8, g: 0.8, b: 0.8, a: 1.0 },
  /** Medium gray. */
  GRAY: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
  /** Dark gray. */
  DARK_GRAY: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
  /** Pure black. */
  BLACK: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },

  // HUD backgrounds (semi-transparent)
  /** Dark semi-transparent background for HUD panels. */
  HUD_BG: { r: 0.1, g: 0.1, b: 0.15, a: 0.85 },
  /** Lighter semi-transparent background for HUD panels. */
  HUD_BG_LIGHT: { r: 0.2, g: 0.2, b: 0.25, a: 0.75 },

  // Common game colors
  /** Gold color for scores, coins, rewards. */
  GOLD: { r: 1.0, g: 0.84, b: 0.0, a: 1.0 },
  /** Silver color for secondary rewards. */
  SILVER: { r: 0.75, g: 0.75, b: 0.75, a: 1.0 },
  /** Bronze color for tertiary rewards. */
  BRONZE: { r: 0.8, g: 0.5, b: 0.2, a: 1.0 },

  // Game state colors
  /** Bright green for victory/win state. */
  WIN: { r: 0.2, g: 1.0, b: 0.4, a: 1.0 },
  /** Bright red for defeat/lose state. */
  LOSE: { r: 1.0, g: 0.2, b: 0.2, a: 1.0 },
  /** Yellow for paused state. */
  PAUSED: { r: 0.9, g: 0.9, b: 0.2, a: 1.0 },
} as const;

/**
 * Standard HUD layout constants. All values use **logical pixels** (DPI-independent).
 * Spacing values (PADDING, LINE_HEIGHT, TEXT_SCALE) work at any resolution.
 * **Position values assume 800×600** — for other viewports, compute positions
 * from `getViewportSize()` instead (e.g. `{ x: vpW - 100, y: 10 }` for top-right).
 */
export const HUDLayout = {
  /** Standard padding from screen edges in pixels. Works at any resolution. */
  PADDING: 10,
  /** Vertical spacing between HUD lines in pixels. Works at any resolution. */
  LINE_HEIGHT: 25,
  /** Default text scale for main HUD text. Works at any resolution. */
  TEXT_SCALE: 2,
  /** Smaller text scale for secondary HUD text. Works at any resolution. */
  SMALL_TEXT_SCALE: 1.5,

  // Standard positions (screen-space pixel coordinates, assumes 800×600)
  /** Top-left corner position. Works at any resolution. */
  TOP_LEFT: { x: 10, y: 10 },
  /** Top-right corner position. **Assumes 800px width** — use `getViewportSize()` for other sizes. */
  TOP_RIGHT: { x: 700, y: 10 },
  /** Bottom-left corner position. **Assumes 600px height** — use `getViewportSize()` for other sizes. */
  BOTTOM_LEFT: { x: 10, y: 560 },
  /** Bottom-right corner position. **Assumes 800×600** — use `getViewportSize()` for other sizes. */
  BOTTOM_RIGHT: { x: 700, y: 560 },
  /** Screen center position. **Assumes 800×600** — use `getViewportSize()` for other sizes. */
  CENTER: { x: 400, y: 300 },
} as const;

/**
 * Create a semi-transparent version of a color.
 *
 * **Performance note:** Creates a new object each call. In hot loops,
 * pre-compute colors or use {@link setAlpha} to mutate in place.
 *
 * @param color - Source color.
 * @param alpha - New alpha value, 0.0 (transparent) to 1.0 (opaque).
 * @returns New Color with the same RGB but the specified alpha.
 */
export function withAlpha(color: Color, alpha: number): Color {
  return { ...color, a: alpha };
}

/**
 * Mutate a color's alpha channel in place. Returns the same object for chaining.
 *
 * Zero-allocation alternative to {@link withAlpha} for hot loops.
 *
 * @param color - Color to mutate.
 * @param a - New alpha value, 0.0 (transparent) to 1.0 (opaque).
 * @returns The same Color object (mutated).
 */
export function setAlpha(color: Color, a: number): Color {
  color.a = a;
  return color;
}

/**
 * Mutate a color's RGB channels in place. Returns the same object for chaining.
 *
 * Zero-allocation alternative to creating a new Color for hot loops.
 *
 * @param color - Color to mutate.
 * @param r - New red channel, 0.0-1.0.
 * @param g - New green channel, 0.0-1.0.
 * @param b - New blue channel, 0.0-1.0.
 * @returns The same Color object (mutated).
 */
export function setRgb(color: Color, r: number, g: number, b: number): Color {
  color.r = r;
  color.g = g;
  color.b = b;
  return color;
}

/**
 * Linearly interpolate between two colors, writing the result into `target`.
 *
 * Zero-allocation alternative to creating a new Color for per-particle color lerp.
 *
 * @param target - Color object to write the result into.
 * @param start - Start color (t=0).
 * @param end - End color (t=1).
 * @param t - Interpolation factor, 0.0-1.0.
 * @returns The same `target` object (mutated).
 */
export function lerpColorInto(target: Color, start: Color, end: Color, t: number): Color {
  target.r = start.r + (end.r - start.r) * t;
  target.g = start.g + (end.g - start.g) * t;
  target.b = start.b + (end.b - start.b) * t;
  target.a = start.a + (end.a - start.a) * t;
  return target;
}

/**
 * Lighten a color by adding a fixed amount to each RGB channel (clamped to 1.0).
 * Useful for hover effects and highlights.
 *
 * @param color - Source color.
 * @param amount - Amount to add to each RGB channel, 0.0-1.0. Default: 0.2.
 * @returns New lightened Color (alpha unchanged).
 */
export function lighten(color: Color, amount: number = 0.2): Color {
  return {
    r: Math.min(1.0, color.r + amount),
    g: Math.min(1.0, color.g + amount),
    b: Math.min(1.0, color.b + amount),
    a: color.a,
  };
}

/**
 * Darken a color by subtracting a fixed amount from each RGB channel (clamped to 0.0).
 * Useful for pressed states and shadows.
 *
 * @param color - Source color.
 * @param amount - Amount to subtract from each RGB channel, 0.0-1.0. Default: 0.2.
 * @returns New darkened Color (alpha unchanged).
 */
export function darken(color: Color, amount: number = 0.2): Color {
  return {
    r: Math.max(0.0, color.r - amount),
    g: Math.max(0.0, color.g - amount),
    b: Math.max(0.0, color.b - amount),
    a: color.a,
  };
}
