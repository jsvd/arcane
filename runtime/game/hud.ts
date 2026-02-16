/**
 * HUD convenience helpers. All functions default to screenSpace: true
 * with sensible layer, scale, and color defaults.
 *
 * These wrappers reduce the boilerplate of passing `screenSpace: true`,
 * layer numbers, and default colors for every HUD draw call. The raw
 * `drawText`, `drawBar`, and `drawLabel` functions are still available
 * for full control.
 *
 * @example
 * ```ts
 * import { hud } from "@arcane/runtime/game";
 *
 * hud.text("Score: 100", 10, 10);
 * hud.bar(10, 30, health / maxHealth);
 * hud.label("Game Over", 300, 250);
 * ```
 */

import { drawText } from "../rendering/text.ts";
import { drawBar, drawLabel } from "../ui/primitives.ts";
import { Colors, HUDLayout } from "../ui/colors.ts";
import type { HUDTextOptions, HUDBarOptions, HUDLabelOptions } from "./types.ts";

export const hud = {
  /**
   * Draw HUD text with sensible defaults.
   * screenSpace: true, layer: 100, scale: HUDLayout.TEXT_SCALE, tint: white.
   *
   * @param content - The text string to display.
   * @param x - X position in screen pixels.
   * @param y - Y position in screen pixels.
   * @param opts - Optional overrides for scale, tint, and layer.
   */
  text(content: string, x: number, y: number, opts?: HUDTextOptions): void {
    drawText(content, x, y, {
      scale: opts?.scale ?? HUDLayout.TEXT_SCALE,
      tint: opts?.tint ?? { r: 1, g: 1, b: 1, a: 1 },
      layer: opts?.layer ?? 100,
      screenSpace: true,
    });
  },

  /**
   * Draw a HUD progress/health bar with sensible defaults.
   * screenSpace: true, layer: 100, green fill on dark background.
   *
   * @param x - X position in screen pixels.
   * @param y - Y position in screen pixels.
   * @param fillRatio - Fill amount, 0.0 (empty) to 1.0 (full). Clamped internally by drawBar.
   * @param opts - Optional overrides for dimensions, colors, border, and layer.
   */
  bar(x: number, y: number, fillRatio: number, opts?: HUDBarOptions): void {
    drawBar(x, y, opts?.width ?? 80, opts?.height ?? 12, fillRatio, {
      fillColor: opts?.fillColor ?? Colors.SUCCESS,
      bgColor: opts?.bgColor ?? Colors.HUD_BG,
      borderColor: opts?.borderColor ?? Colors.LIGHT_GRAY,
      borderWidth: opts?.borderWidth ?? 1,
      layer: opts?.layer ?? 100,
      screenSpace: true,
    });
  },

  /**
   * Draw a HUD label (text with background panel).
   * screenSpace: true, layer: 110, white text on dark background.
   *
   * @param content - The text string to display.
   * @param x - X position in screen pixels.
   * @param y - Y position in screen pixels.
   * @param opts - Optional overrides for colors, padding, scale, and layer.
   */
  label(content: string, x: number, y: number, opts?: HUDLabelOptions): void {
    drawLabel(content, x, y, {
      textColor: opts?.textColor ?? Colors.WHITE,
      bgColor: opts?.bgColor ?? Colors.HUD_BG,
      padding: opts?.padding ?? 8,
      scale: opts?.scale ?? HUDLayout.TEXT_SCALE,
      layer: opts?.layer ?? 110,
      screenSpace: true,
    });
  },
};
