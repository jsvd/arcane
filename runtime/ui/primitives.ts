import type { Color, RectOptions, PanelOptions, BarOptions, LabelOptions } from "./types.ts";
import { drawSprite } from "../rendering/sprites.ts";
import { createSolidTexture } from "../rendering/texture.ts";
import { drawText, measureText } from "../rendering/text.ts";
import { getCamera } from "../rendering/camera.ts";
import { getViewportSize } from "../rendering/input.ts";
import { _logDrawCall } from "../testing/visual.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_draw_sprite === "function";

/** Cache solid textures by color key to avoid re-creating them every frame. */
const textureCache = new Map<string, number>();

function getColorTexture(color: Color): number {
  const key = `${color.r}_${color.g}_${color.b}_${color.a}`;
  let tex = textureCache.get(key);
  if (tex !== undefined) return tex;
  tex = createSolidTexture(key, color);
  textureCache.set(key, tex);
  return tex;
}

/** Default colors. */
const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };
const DARK: Color = { r: 0.1, g: 0.1, b: 0.15, a: 0.9 };
const GRAY: Color = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
const GREEN: Color = { r: 0.2, g: 0.8, b: 0.2, a: 1 };
const RED: Color = { r: 0.3, g: 0.1, b: 0.1, a: 0.8 };

function toWorld(
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  screenSpace: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!screenSpace) return { x: sx, y: sy, w: sw, h: sh };
  const cam = getCamera();
  const { width: vpW, height: vpH } = getViewportSize();
  return {
    x: sx / cam.zoom + cam.x - vpW / (2 * cam.zoom),
    y: sy / cam.zoom + cam.y - vpH / (2 * cam.zoom),
    w: sw / cam.zoom,
    h: sh / cam.zoom,
  };
}

/**
 * Draw a filled rectangle.
 * No-op in headless mode.
 *
 * @param x - X position (screen pixels if screenSpace, world units otherwise).
 * @param y - Y position (screen pixels if screenSpace, world units otherwise).
 * @param w - Width in pixels (screenSpace) or world units.
 * @param h - Height in pixels (screenSpace) or world units.
 * @param options - Color, layer, and screenSpace options.
 *
 * @example
 * // Draw a red rectangle in screen space (HUD)
 * drawRect(10, 10, 200, 30, {
 *   color: { r: 1, g: 0, b: 0, a: 0.8 },
 *   screenSpace: true,
 * });
 */
export function drawRect(
  x: number,
  y: number,
  w: number,
  h: number,
  options?: RectOptions,
): void {
  _logDrawCall({
    type: "rect",
    x, y, w, h,
    layer: options?.layer ?? 90,
    screenSpace: options?.screenSpace ?? false,
  });
  if (!hasRenderOps) return;
  const color = options?.color ?? WHITE;
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;
  const tex = getColorTexture(color);
  const pos = toWorld(x, y, w, h, ss);
  const posX = pos.x;
  const posY = pos.y;
  const posW = pos.w;
  const posH = pos.h;
  drawSprite({ textureId: tex, x: posX, y: posY, w: posW, h: posH, layer });
}

/**
 * Draw a panel with border and fill (5 sprites: 4 border edges + 1 fill).
 * No-op in headless mode.
 *
 * @param x - X position (screen pixels if screenSpace, world units otherwise).
 * @param y - Y position (screen pixels if screenSpace, world units otherwise).
 * @param w - Total width including border.
 * @param h - Total height including border.
 * @param options - Fill color, border color, border width, layer, and screenSpace options.
 *
 * @example
 * // Draw a HUD panel
 * drawPanel(10, 10, 200, 100, {
 *   fillColor: { r: 0.1, g: 0.1, b: 0.2, a: 0.9 },
 *   borderColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
 *   borderWidth: 2,
 *   screenSpace: true,
 * });
 */
export function drawPanel(
  x: number,
  y: number,
  w: number,
  h: number,
  options?: PanelOptions,
): void {
  _logDrawCall({
    type: "panel",
    x, y, w, h,
    layer: options?.layer ?? 90,
    screenSpace: options?.screenSpace ?? false,
    borderWidth: options?.borderWidth ?? 2,
  });
  if (!hasRenderOps) return;
  const fillColor = options?.fillColor ?? DARK;
  const borderColor = options?.borderColor ?? GRAY;
  const bw = options?.borderWidth ?? 2;
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;

  const fillTex = getColorTexture(fillColor);
  const borderTex = getColorTexture(borderColor);

  // Fill (inset by border width)
  const fill = toWorld(x + bw, y + bw, w - 2 * bw, h - 2 * bw, ss);
  const fillX = fill.x;
  const fillY = fill.y;
  const fillW = fill.w;
  const fillH = fill.h;
  drawSprite({ textureId: fillTex, x: fillX, y: fillY, w: fillW, h: fillH, layer });

  // Top border
  const top = toWorld(x, y, w, bw, ss);
  const topX = top.x;
  const topY = top.y;
  const topW = top.w;
  const topH = top.h;
  drawSprite({ textureId: borderTex, x: topX, y: topY, w: topW, h: topH, layer: layer + 1 });

  // Bottom border
  const bot = toWorld(x, y + h - bw, w, bw, ss);
  const botX = bot.x;
  const botY = bot.y;
  const botW = bot.w;
  const botH = bot.h;
  drawSprite({ textureId: borderTex, x: botX, y: botY, w: botW, h: botH, layer: layer + 1 });

  // Left border
  const left = toWorld(x, y + bw, bw, h - 2 * bw, ss);
  const leftX = left.x;
  const leftY = left.y;
  const leftW = left.w;
  const leftH = left.h;
  drawSprite({ textureId: borderTex, x: leftX, y: leftY, w: leftW, h: leftH, layer: layer + 1 });

  // Right border
  const right = toWorld(x + w - bw, y + bw, bw, h - 2 * bw, ss);
  const rightX = right.x;
  const rightY = right.y;
  const rightW = right.w;
  const rightH = right.h;
  drawSprite({ textureId: borderTex, x: rightX, y: rightY, w: rightW, h: rightH, layer: layer + 1 });
}

/**
 * Draw a progress/health bar with background, fill, and optional border.
 * No-op in headless mode.
 *
 * @param x - X position (screen pixels if screenSpace, world units otherwise).
 * @param y - Y position (screen pixels if screenSpace, world units otherwise).
 * @param w - Total width.
 * @param h - Total height.
 * @param fillRatio - Fill amount, 0.0 (empty) to 1.0 (full). Clamped to this range.
 * @param options - Colors, border, layer, and screenSpace options.
 */
export function drawBar(
  x: number,
  y: number,
  w: number,
  h: number,
  fillRatio: number,
  options?: BarOptions,
): void {
  _logDrawCall({
    type: "bar",
    x, y, w, h,
    fillRatio: Math.max(0, Math.min(1, fillRatio)),
    layer: options?.layer ?? 90,
    screenSpace: options?.screenSpace ?? false,
  });
  if (!hasRenderOps) return;
  const ratio = Math.max(0, Math.min(1, fillRatio));
  const bgColor = options?.bgColor ?? RED;
  const fillColor = options?.fillColor ?? GREEN;
  const borderColor = options?.borderColor;
  const bw = options?.borderWidth ?? 0;
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;

  // Background
  const bg = toWorld(x, y, w, h, ss);
  const bgTex = getColorTexture(bgColor);
  const bgX = bg.x;
  const bgY = bg.y;
  const bgW = bg.w;
  const bgH = bg.h;
  drawSprite({ textureId: bgTex, x: bgX, y: bgY, w: bgW, h: bgH, layer });

  // Fill (inset by border if present)
  const inset = bw;
  const fillW = (w - 2 * inset) * ratio;
  if (fillW > 0) {
    const fill = toWorld(x + inset, y + inset, fillW, h - 2 * inset, ss);
    const fillTex = getColorTexture(fillColor);
    const fillX = fill.x;
    const fillY = fill.y;
    const fillW2 = fill.w;
    const fillH = fill.h;
    drawSprite({ textureId: fillTex, x: fillX, y: fillY, w: fillW2, h: fillH, layer: layer + 1 });
  }

  // Optional border
  if (borderColor && bw > 0) {
    const borderTex = getColorTexture(borderColor);
    const top = toWorld(x, y, w, bw, ss);
    const topX = top.x;
    const topY = top.y;
    const topW = top.w;
    const topH = top.h;
    drawSprite({ textureId: borderTex, x: topX, y: topY, w: topW, h: topH, layer: layer + 2 });
    const bot = toWorld(x, y + h - bw, w, bw, ss);
    const botX = bot.x;
    const botY = bot.y;
    const botW = bot.w;
    const botH = bot.h;
    drawSprite({ textureId: borderTex, x: botX, y: botY, w: botW, h: botH, layer: layer + 2 });
    const left = toWorld(x, y + bw, bw, h - 2 * bw, ss);
    const leftX = left.x;
    const leftY = left.y;
    const leftW = left.w;
    const leftH = left.h;
    drawSprite({ textureId: borderTex, x: leftX, y: leftY, w: leftW, h: leftH, layer: layer + 2 });
    const right = toWorld(x + w - bw, y + bw, bw, h - 2 * bw, ss);
    const rightX = right.x;
    const rightY = right.y;
    const rightW = right.w;
    const rightH = right.h;
    drawSprite({ textureId: borderTex, x: rightX, y: rightY, w: rightW, h: rightH, layer: layer + 2 });
  }
}

/**
 * Draw a text label with an automatic background panel.
 * Panel size is computed from the text measurement + padding.
 * No-op in headless mode.
 *
 * @param text - The text string to display.
 * @param x - X position (screen pixels if screenSpace, world units otherwise).
 * @param y - Y position (screen pixels if screenSpace, world units otherwise).
 * @param options - Text color, background, border, padding, scale, layer, and screenSpace.
 */
export function drawLabel(
  text: string,
  x: number,
  y: number,
  options?: LabelOptions,
): void {
  _logDrawCall({
    type: "label",
    content: text,
    x, y,
    scale: options?.scale ?? 1,
    layer: options?.layer ?? 90,
    screenSpace: options?.screenSpace ?? false,
  });
  if (!hasRenderOps) return;
  const padding = options?.padding ?? 4;
  const scale = options?.scale ?? 1;
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;

  const measurement = measureText(text, { scale });
  const panelW = measurement.width + padding * 2;
  const panelH = measurement.height + padding * 2;

  // Background panel
  drawPanel(x, y, panelW, panelH, {
    fillColor: options?.bgColor ?? DARK,
    borderColor: options?.borderColor ?? GRAY,
    borderWidth: options?.borderWidth ?? 1,
    layer,
    screenSpace: ss,
  });

  // Text
  drawText(text, x + padding, y + padding, {
    scale,
    tint: options?.textColor ?? WHITE,
    layer: layer + 3,
    screenSpace: ss,
  });
}
