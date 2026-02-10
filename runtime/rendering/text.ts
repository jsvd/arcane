import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";
import { getCamera } from "./camera.ts";

// --- Types ---

/** Descriptor for a bitmap font backed by a texture atlas. */
export type BitmapFont = {
  /** Texture handle containing the font glyph atlas. */
  textureId: TextureId;
  /** Width of each glyph cell in pixels. */
  glyphW: number;
  /** Height of each glyph cell in pixels. */
  glyphH: number;
  /** Number of glyph columns in the atlas. */
  columns: number;
  /** Number of glyph rows in the atlas. */
  rows: number;
  /** ASCII code of the first glyph in the atlas. Default: 32 (space). */
  firstChar: number;
};

/** Options for {@link drawText} and {@link measureText}. */
export type TextOptions = {
  /** Font to use. Default: built-in 8x8 CP437 bitmap font via getDefaultFont(). */
  font?: BitmapFont;
  /** Scale multiplier for glyph size. Default: 1. A value of 2 draws at 16x16. */
  scale?: number;
  /** RGBA tint color for the text (0.0-1.0 per channel). Default: white. */
  tint?: { r: number; g: number; b: number; a: number };
  /** Draw order layer. Default: 100 (above most game sprites). */
  layer?: number;
  /** If true, position is in screen pixels (HUD). If false, position is in world units. Default: false. */
  screenSpace?: boolean;
};

/** Result of {@link measureText}. Dimensions in pixels (before camera transform). */
export type TextMeasurement = {
  /** Total width in pixels (text.length * glyphW * scale). */
  width: number;
  /** Total height in pixels (glyphH * scale). */
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
 * The atlas should contain a grid of equally-sized glyphs in ASCII order.
 *
 * @param textureId - Texture handle of the font atlas (from loadTexture()).
 * @param glyphW - Width of each glyph cell in pixels.
 * @param glyphH - Height of each glyph cell in pixels.
 * @param columns - Number of glyph columns in the atlas.
 * @param rows - Number of glyph rows in the atlas.
 * @param firstChar - ASCII code of the first glyph in the atlas. Default: 32 (space).
 * @returns BitmapFont descriptor for use with drawText().
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
 * Get the default built-in 8x8 CP437 bitmap font, lazily initialized.
 * In headless mode returns a dummy font (textureId 0).
 *
 * @returns The built-in BitmapFont (8x8 glyphs, 16 columns, 6 rows, ASCII 32-127).
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
 * Measure the pixel dimensions of a text string without drawing it.
 * Pure math -- works in headless mode.
 *
 * @param text - The string to measure.
 * @param options - Font and scale options. Default font and scale 1 if omitted.
 * @returns Width and height in pixels.
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
 * Draw a text string using the sprite pipeline (one sprite per character).
 * Must be called every frame. No-op in headless mode.
 *
 * @param text - The string to draw.
 * @param x - X position (screen pixels if screenSpace, world units otherwise).
 * @param y - Y position (screen pixels if screenSpace, world units otherwise).
 * @param options - Font, scale, tint, layer, and screenSpace options.
 *
 * @example
 * // Draw HUD text at the top-left of the screen
 * drawText("HP: 100", 10, 10, { scale: 2, screenSpace: true });
 *
 * @example
 * // Draw world-space text above an entity
 * drawText("Enemy", enemy.x, enemy.y - 12, {
 *   tint: { r: 1, g: 0.3, b: 0.3, a: 1 },
 *   layer: 50,
 * });
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
