import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";
import { getCamera } from "./camera.ts";

// --- Types ---

export type BitmapFont = {
  textureId: TextureId;
  glyphW: number;
  glyphH: number;
  columns: number;
  rows: number;
  firstChar: number;
};

export type TextOptions = {
  font?: BitmapFont;
  scale?: number;
  tint?: { r: number; g: number; b: number; a: number };
  layer?: number;
  screenSpace?: boolean;
};

export type TextMeasurement = {
  width: number;
  height: number;
};

// --- Render ops detection ---

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_draw_sprite === "function";

const hasFontOp =
  typeof (globalThis as any).Deno?.core?.ops?.op_create_font_texture ===
  "function";

const hasViewportOp =
  typeof (globalThis as any).Deno?.core?.ops?.op_get_viewport_size ===
  "function";

function getViewportSize(): [number, number] {
  if (!hasViewportOp) return [800, 600];
  const [w, h] = (globalThis as any).Deno.core.ops.op_get_viewport_size();
  return [w, h];
}

// --- Module state ---

let defaultFont: BitmapFont | null = null;

// --- Functions ---

/**
 * Create a bitmap font descriptor from a texture atlas.
 */
export function loadFont(
  textureId: TextureId,
  glyphW: number,
  glyphH: number,
  columns: number,
  rows: number,
  firstChar: number = 32,
): BitmapFont {
  return { textureId, glyphW, glyphH, columns, rows, firstChar };
}

/**
 * Get the default 8x8 bitmap font, lazily initialized.
 * In headless mode returns a dummy font (textureId 0).
 */
export function getDefaultFont(): BitmapFont {
  if (defaultFont !== null) return defaultFont;

  if (hasFontOp) {
    const textureId: TextureId = (
      globalThis as any
    ).Deno.core.ops.op_create_font_texture();
    defaultFont = {
      textureId,
      glyphW: 8,
      glyphH: 8,
      columns: 16,
      rows: 6,
      firstChar: 32,
    };
  } else {
    defaultFont = {
      textureId: 0,
      glyphW: 8,
      glyphH: 8,
      columns: 16,
      rows: 6,
      firstChar: 32,
    };
  }

  return defaultFont;
}

/**
 * Measure the pixel dimensions of a text string.
 * Pure math — works in headless mode.
 */
export function measureText(
  text: string,
  options?: TextOptions,
): TextMeasurement {
  const font = options?.font ?? getDefaultFont();
  const scale = options?.scale ?? 1;
  return {
    width: text.length * font.glyphW * scale,
    height: font.glyphH * scale,
  };
}

/**
 * Draw a text string using the sprite pipeline.
 * Each character becomes one drawSprite() call.
 * No-op in headless mode.
 */
export function drawText(
  text: string,
  x: number,
  y: number,
  options?: TextOptions,
): void {
  if (!hasRenderOps) return;

  const font = options?.font ?? getDefaultFont();
  const scale = options?.scale ?? 1;
  const layer = options?.layer ?? 100;
  const tint = options?.tint;
  const screenSpace = options?.screenSpace ?? false;

  const maxChar = font.columns * font.rows;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - font.firstChar;
    if (charCode < 0 || charCode >= maxChar) continue;

    const col = charCode % font.columns;
    const row = Math.floor(charCode / font.columns);
    const uv = {
      x: col / font.columns,
      y: row / font.rows,
      w: 1 / font.columns,
      h: 1 / font.rows,
    };

    const drawX = x + i * font.glyphW * scale;

    let worldX: number;
    let worldY: number;
    let spriteW: number;
    let spriteH: number;

    if (screenSpace) {
      const cam = getCamera();
      const [viewportW, viewportH] = getViewportSize();
      worldX = drawX / cam.zoom + cam.x - viewportW / (2 * cam.zoom);
      worldY = y / cam.zoom + cam.y - viewportH / (2 * cam.zoom);
      spriteW = (font.glyphW * scale) / cam.zoom;
      spriteH = (font.glyphH * scale) / cam.zoom;
    } else {
      worldX = drawX;
      worldY = y;
      spriteW = font.glyphW * scale;
      spriteH = font.glyphH * scale;
    }

    drawSprite({
      textureId: font.textureId,
      x: worldX,
      y: worldY,
      w: spriteW,
      h: spriteH,
      layer,
      uv,
      tint,
    });
  }
}
