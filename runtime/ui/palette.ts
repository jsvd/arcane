/**
 * Color palette system for consistent theming.
 *
 * Provides a module-level palette that games can customize with setPalette().
 * Not magic — users explicitly call paletteColor("primary") in draw calls.
 *
 * @example
 * ```ts
 * import { setPalette, paletteColor } from "@arcane/runtime/ui";
 *
 * setPalette({ primary: { r: 0.2, g: 0.6, b: 1, a: 1 } });
 * drawRect(10, 10, 100, 50, { color: paletteColor("primary") });
 * ```
 */

import type { Color } from "./types.ts";

/** Named color palette. Standard keys have known semantics; custom keys allowed. */
export type Palette = {
  bg: Color;
  fg: Color;
  primary: Color;
  secondary: Color;
  accent: Color;
  danger: Color;
  success: Color;
  warning: Color;
  [key: string]: Color;
};

const defaultPalette: Palette = {
  bg: { r: 0.1, g: 0.1, b: 0.12, a: 1 },
  fg: { r: 0.93, g: 0.93, b: 0.93, a: 1 },
  primary: { r: 0.3, g: 0.6, b: 1, a: 1 },
  secondary: { r: 0.5, g: 0.5, b: 0.55, a: 1 },
  accent: { r: 1, g: 0.75, b: 0.2, a: 1 },
  danger: { r: 0.9, g: 0.2, b: 0.2, a: 1 },
  success: { r: 0.2, g: 0.8, b: 0.3, a: 1 },
  warning: { r: 1, g: 0.7, b: 0.1, a: 1 },
};

let currentPalette: Palette = { ...defaultPalette };

/**
 * Set or update the current palette. Merges with existing — only override
 * the colors you want to change.
 */
export function setPalette(palette: Record<string, Color>): void {
  currentPalette = { ...currentPalette, ...palette };
}

/**
 * Get the full current palette object.
 */
export function getPalette(): Readonly<Palette> {
  return currentPalette;
}

/**
 * Get a palette color by name. Returns white if the name is not found.
 */
export function paletteColor(name: string): Color {
  return currentPalette[name] ?? { r: 1, g: 1, b: 1, a: 1 };
}

/**
 * Reset the palette to defaults.
 */
export function resetPalette(): void {
  currentPalette = { ...defaultPalette };
}
