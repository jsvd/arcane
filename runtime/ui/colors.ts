/**
 * Standard color palette for consistent UI styling across demos
 */

import type { Color } from "./types.ts";

/**
 * Arcane UI Color Palette
 *
 * Use these colors for consistent visual style across all demos.
 */
export const Colors = {
  // Primary UI Colors
  PRIMARY: { r: 0.2, g: 0.6, b: 1.0, a: 1.0 },      // Bright blue
  SUCCESS: { r: 0.2, g: 0.8, b: 0.3, a: 1.0 },      // Green
  WARNING: { r: 1.0, g: 0.7, b: 0.0, a: 1.0 },      // Orange/Yellow
  DANGER: { r: 1.0, g: 0.3, b: 0.3, a: 1.0 },       // Red
  INFO: { r: 0.4, g: 0.8, b: 0.9, a: 1.0 },         // Cyan

  // Grayscale
  WHITE: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
  LIGHT_GRAY: { r: 0.8, g: 0.8, b: 0.8, a: 1.0 },
  GRAY: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
  DARK_GRAY: { r: 0.3, g: 0.3, b: 0.3, a: 1.0 },
  BLACK: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },

  // HUD backgrounds (semi-transparent)
  HUD_BG: { r: 0.1, g: 0.1, b: 0.15, a: 0.85 },
  HUD_BG_LIGHT: { r: 0.2, g: 0.2, b: 0.25, a: 0.75 },

  // Common game colors
  GOLD: { r: 1.0, g: 0.84, b: 0.0, a: 1.0 },
  SILVER: { r: 0.75, g: 0.75, b: 0.75, a: 1.0 },
  BRONZE: { r: 0.8, g: 0.5, b: 0.2, a: 1.0 },

  // Game state colors
  WIN: { r: 0.2, g: 1.0, b: 0.4, a: 1.0 },
  LOSE: { r: 1.0, g: 0.2, b: 0.2, a: 1.0 },
  PAUSED: { r: 0.9, g: 0.9, b: 0.2, a: 1.0 },
} as const;

/**
 * Standard HUD layout positions (for 800x600 viewport)
 */
export const HUDLayout = {
  PADDING: 10,
  LINE_HEIGHT: 25,
  TEXT_SCALE: 2,
  SMALL_TEXT_SCALE: 1.5,

  // Standard positions
  TOP_LEFT: { x: 10, y: 10 },
  TOP_RIGHT: { x: 700, y: 10 },
  BOTTOM_LEFT: { x: 10, y: 560 },
  BOTTOM_RIGHT: { x: 700, y: 560 },
  CENTER: { x: 400, y: 300 },
} as const;

/**
 * Helper to create semi-transparent version of a color
 */
export function withAlpha(color: Color, alpha: number): Color {
  return { ...color, a: alpha };
}

/**
 * Helper to lighten a color (for hover effects)
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
 * Helper to darken a color
 */
export function darken(color: Color, amount: number = 0.2): Color {
  return {
    r: Math.max(0.0, color.r - amount),
    g: Math.max(0.0, color.g - amount),
    b: Math.max(0.0, color.b - amount),
    a: color.a,
  };
}
