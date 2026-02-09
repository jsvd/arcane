import type { Color, RectOptions, PanelOptions, BarOptions, LabelOptions } from "./types.ts";
import { drawSprite } from "../rendering/sprites.ts";
import { createSolidTexture } from "../rendering/texture.ts";
import { drawText, measureText } from "../rendering/text.ts";
import { getCamera } from "../rendering/camera.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_draw_sprite === "function";

const hasViewportOp =
  typeof (globalThis as any).Deno?.core?.ops?.op_get_viewport_size === "function";

function getViewportSize(): [number, number] {
  if (!hasViewportOp) return [800, 600];
  const [w, h] = (globalThis as any).Deno.core.ops.op_get_viewport_size();
  return [w, h];
}

/** Cache solid textures by color key to avoid re-creating them every frame. */
const textureCache = new Map<string, number>();

function getColorTexture(color: Color): number {
  const key = `${color.r}_${color.g}_${color.b}_${color.a}`;
  let tex = textureCache.get(key);
  if (tex !== undefined) return tex;
  tex = createSolidTexture(
    key,
    Math.round(color.r * 255),
    Math.round(color.g * 255),
    Math.round(color.b * 255),
    Math.round(color.a * 255),
  );
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
  const [vpW, vpH] = getViewportSize();
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
 */
export function drawRect(
  x: number,
  y: number,
  w: number,
  h: number,
  options?: RectOptions,
): void {
  if (!hasRenderOps) return;
  const color = options?.color ?? WHITE;
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;
  const tex = getColorTexture(color);
  const pos = toWorld(x, y, w, h, ss);
  drawSprite({ textureId: tex, x: pos.x, y: pos.y, w: pos.w, h: pos.h, layer });
}

/**
 * Draw a panel with border and fill.
 * Uses 5 sprites: 4 border edges + 1 fill.
 * No-op in headless mode.
 */
export function drawPanel(
  x: number,
  y: number,
  w: number,
  h: number,
  options?: PanelOptions,
): void {
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
  drawSprite({ textureId: fillTex, x: fill.x, y: fill.y, w: fill.w, h: fill.h, layer });

  // Top border
  const top = toWorld(x, y, w, bw, ss);
  drawSprite({ textureId: borderTex, x: top.x, y: top.y, w: top.w, h: top.h, layer: layer + 1 });

  // Bottom border
  const bot = toWorld(x, y + h - bw, w, bw, ss);
  drawSprite({ textureId: borderTex, x: bot.x, y: bot.y, w: bot.w, h: bot.h, layer: layer + 1 });

  // Left border
  const left = toWorld(x, y + bw, bw, h - 2 * bw, ss);
  drawSprite({ textureId: borderTex, x: left.x, y: left.y, w: left.w, h: left.h, layer: layer + 1 });

  // Right border
  const right = toWorld(x + w - bw, y + bw, bw, h - 2 * bw, ss);
  drawSprite({ textureId: borderTex, x: right.x, y: right.y, w: right.w, h: right.h, layer: layer + 1 });
}

/**
 * Draw a progress/health bar.
 * fillRatio is 0.0 to 1.0 (clamped).
 * No-op in headless mode.
 */
export function drawBar(
  x: number,
  y: number,
  w: number,
  h: number,
  fillRatio: number,
  options?: BarOptions,
): void {
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
  drawSprite({ textureId: bgTex, x: bg.x, y: bg.y, w: bg.w, h: bg.h, layer });

  // Fill (inset by border if present)
  const inset = bw;
  const fillW = (w - 2 * inset) * ratio;
  if (fillW > 0) {
    const fill = toWorld(x + inset, y + inset, fillW, h - 2 * inset, ss);
    const fillTex = getColorTexture(fillColor);
    drawSprite({ textureId: fillTex, x: fill.x, y: fill.y, w: fill.w, h: fill.h, layer: layer + 1 });
  }

  // Optional border
  if (borderColor && bw > 0) {
    const borderTex = getColorTexture(borderColor);
    const top = toWorld(x, y, w, bw, ss);
    drawSprite({ textureId: borderTex, x: top.x, y: top.y, w: top.w, h: top.h, layer: layer + 2 });
    const bot = toWorld(x, y + h - bw, w, bw, ss);
    drawSprite({ textureId: borderTex, x: bot.x, y: bot.y, w: bot.w, h: bot.h, layer: layer + 2 });
    const left = toWorld(x, y + bw, bw, h - 2 * bw, ss);
    drawSprite({ textureId: borderTex, x: left.x, y: left.y, w: left.w, h: left.h, layer: layer + 2 });
    const right = toWorld(x + w - bw, y + bw, bw, h - 2 * bw, ss);
    drawSprite({ textureId: borderTex, x: right.x, y: right.y, w: right.w, h: right.h, layer: layer + 2 });
  }
}

/**
 * Draw a text label with optional background panel.
 * No-op in headless mode.
 */
export function drawLabel(
  text: string,
  x: number,
  y: number,
  options?: LabelOptions,
): void {
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
