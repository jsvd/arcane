/**
 * Standard color palette and layout helpers for consistent UI styling.
 */

import type { Color } from "./types.ts";

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
 * Standard HUD layout positions and spacing for an 800x600 viewport.
 * Provides consistent anchor points for common HUD element placement.
 */
export const HUDLayout = {
  /** Standard padding from screen edges in pixels. */
  PADDING: 10,
  /** Vertical spacing between HUD lines in pixels. */
  LINE_HEIGHT: 25,
  /** Default text scale for main HUD text. */
  TEXT_SCALE: 2,
  /** Smaller text scale for secondary HUD text. */
  SMALL_TEXT_SCALE: 1.5,

  // Standard positions (screen-space pixel coordinates)
  /** Top-left corner position. */
  TOP_LEFT: { x: 10, y: 10 },
  /** Top-right corner position. */
  TOP_RIGHT: { x: 700, y: 10 },
  /** Bottom-left corner position. */
  BOTTOM_LEFT: { x: 10, y: 560 },
  /** Bottom-right corner position. */
  BOTTOM_RIGHT: { x: 700, y: 560 },
  /** Screen center position. */
  CENTER: { x: 400, y: 300 },
} as const;

/**
 * Create a semi-transparent version of a color.
 *
 * @param color - Source color.
 * @param alpha - New alpha value, 0.0 (transparent) to 1.0 (opaque).
 * @returns New Color with the same RGB but the specified alpha.
 */
export function withAlpha(color: Color, alpha: number): Color {
  return { ...color, a: alpha };
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
