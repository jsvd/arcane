import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";
import { getCamera } from "./camera.ts";
import { getViewportSize } from "./input.ts";

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

/** RGBA color (0.0-1.0 per channel). */
type Color = { r: number; g: number; b: number; a: number };

/** Outline configuration for MSDF text. */
export type TextOutline = {
  /** Outline width in SDF distance units (0.5 = thin, 2.0 = thick). */
  width: number;
  /** Outline color. */
  color: Color;
};

/** Shadow configuration for MSDF text. */
export type TextShadow = {
  /** Horizontal shadow offset in pixels. */
  offsetX: number;
  /** Vertical shadow offset in pixels. */
  offsetY: number;
  /** Shadow color. */
  color: Color;
  /** Shadow blur/softness (1.0 = sharp, 3.0 = soft). Default: 1.0. */
  softness?: number;
};

/** Glyph metrics from an MSDF font atlas. */
export type MSDFGlyph = {
  /** Unicode codepoint. */
  char: number;
  /** UV rectangle in the atlas [x, y, w, h] (normalized 0-1). */
  uv: [number, number, number, number];
  /** Advance width in pixels (at the font's native size). */
  advance: number;
  /** Glyph pixel width at native size. */
  width: number;
  /** Glyph pixel height at native size. */
  height: number;
  /** Horizontal offset from cursor. */
  offsetX: number;
  /** Vertical offset from baseline. */
  offsetY: number;
};

/**
 * Descriptor for an MSDF (signed distance field) font.
 *
 * MSDF fonts render text as resolution-independent signed distance fields,
 * supporting outline and shadow effects. Each font owns a pool of shader
 * instances so that multiple `drawText()` calls in the same frame can use
 * different outline/shadow parameters without overwriting each other.
 */
export type MSDFFont = {
  /** Internal font ID (from the Rust MSDF font store). */
  fontId: number;
  /** Texture handle for the MSDF atlas. */
  textureId: TextureId;
  /** Shader ID for the MSDF rendering pipeline (first slot in the pool). Backward-compatible shorthand for `shaderPool[0]`. */
  shaderId: number;
  /**
   * Pool of shader IDs (same WGSL, separate uniform buffers).
   * Each unique outline/shadow/scale combo in a frame claims a pool slot.
   * The pool resets every frame. With 8 slots, up to 8 distinct param combos
   * can coexist. Beyond 8, slots wrap around (last params win for that slot).
   */
  shaderPool: number[];
  /** Font size the atlas was generated at. */
  fontSize: number;
  /** Line height in pixels at the native font size. */
  lineHeight: number;
  /** SDF distance range in pixels. */
  distanceRange: number;
};

/** Options for {@link drawText} and {@link measureText}. */
export type TextOptions = {
  /** Font to use. Default: built-in 8x8 CP437 bitmap font via getDefaultFont(). */
  font?: BitmapFont;
  /** MSDF font to use. When set, uses resolution-independent SDF rendering. Overrides `font`. */
  msdfFont?: MSDFFont;
  /** Scale multiplier for glyph size. Default: 1. A value of 2 draws at 16x16. */
  scale?: number;
  /** RGBA tint color for the text (0.0-1.0 per channel). Default: white. */
  tint?: Color;
  /** Draw order layer. Default: 100 (above most game sprites). */
  layer?: number;
  /** If true, position is in screen pixels (HUD). If false, position is in world units. Default: false. */
  screenSpace?: boolean;
  /**
   * Outline effect (MSDF fonts only). Ignored for bitmap fonts.
   * Renders a colored outline around the text at the specified width.
   */
  outline?: TextOutline;
  /**
   * Shadow effect (MSDF fonts only). Ignored for bitmap fonts.
   * Renders a colored shadow behind the text at the specified offset.
   */
  shadow?: TextShadow;
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

const hasMsdfOps =
  typeof (globalThis as any).Deno?.core?.ops?.op_create_msdf_builtin_font ===
  "function";

// --- Module state ---

let defaultFont: BitmapFont | null = null;
let defaultMsdfFont: MSDFFont | null = null;

// Cache for MSDF glyph metrics per font
const msdfGlyphCache: Map<string, MSDFGlyph> = new Map();

// --- MSDF shader pool state ---

/** Pool of MSDF shader IDs (populated from first font creation). */
let msdfShaderPool: number[] = [];

/** Per-frame allocation counter into the pool. */
let msdfNextPoolSlot = 0;

/** Per-frame cache: param key → pool index. */
const msdfParamCache: Map<string, number> = new Map();

/** Build a cache key from MSDF shader params (2 decimal precision). */
function msdfParamKey(
  screenPxRange: number,
  outline: TextOutline | undefined,
  shadow: TextShadow | undefined,
): string {
  const spr = screenPxRange.toFixed(2);
  if (!outline && !shadow) return spr;
  const ow = outline ? outline.width.toFixed(2) : "0";
  const or = outline ? outline.color.r.toFixed(2) : "0";
  const og = outline ? outline.color.g.toFixed(2) : "0";
  const ob = outline ? outline.color.b.toFixed(2) : "0";
  const oa = outline ? outline.color.a.toFixed(2) : "0";
  const sx = shadow ? shadow.offsetX.toFixed(2) : "0";
  const sy = shadow ? shadow.offsetY.toFixed(2) : "0";
  const ss = shadow ? (shadow.softness ?? 1).toFixed(2) : "0";
  const sr = shadow ? shadow.color.r.toFixed(2) : "0";
  const sg = shadow ? shadow.color.g.toFixed(2) : "0";
  const sb = shadow ? shadow.color.b.toFixed(2) : "0";
  const sa = shadow ? shadow.color.a.toFixed(2) : "0";
  return `${spr}|${ow},${or},${og},${ob},${oa}|${sx},${sy},${ss},${sr},${sg},${sb},${sa}`;
}

/** Reset the per-frame MSDF param cache. Called at frame start. */
function resetMSDFParamCache(): void {
  msdfParamCache.clear();
  msdfNextPoolSlot = 0;
}

// Register reset callback on globalThis so loop.ts can call it without circular imports
(globalThis as any).__arcane_reset_msdf_cache = resetMSDFParamCache;

// --- Bitmap font functions ---

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

// --- MSDF font functions ---

/**
 * Get the default built-in MSDF font, lazily initialized.
 * This is a signed distance field version of the CP437 bitmap font,
 * providing resolution-independent text with support for outlines and shadows.
 * In headless mode returns a dummy font.
 *
 * @returns The built-in MSDFFont.
 *
 * @example
 * const font = getDefaultMSDFFont();
 * drawText("Crisp at any size!", 10, 10, {
 *   msdfFont: font,
 *   scale: 4,
 *   screenSpace: true,
 * });
 */
export function getDefaultMSDFFont(): MSDFFont {
  if (defaultMsdfFont !== null) return defaultMsdfFont;

  if (hasMsdfOps) {
    const resultJson: string = (
      globalThis as any
    ).Deno.core.ops.op_create_msdf_builtin_font();
    const result = JSON.parse(resultJson);

    // Get font info for additional metadata
    const infoJson: string = (
      globalThis as any
    ).Deno.core.ops.op_get_msdf_font_info(result.fontId);
    const info = JSON.parse(infoJson);

    const pool: number[] = result.shaderPool ?? [result.shaderId];
    if (msdfShaderPool.length === 0) msdfShaderPool = pool;

    defaultMsdfFont = {
      fontId: result.fontId,
      textureId: result.textureId,
      shaderId: result.shaderId,
      shaderPool: pool,
      fontSize: info.fontSize,
      lineHeight: info.lineHeight,
      distanceRange: info.distanceRange,
    };
  } else {
    // Headless dummy
    defaultMsdfFont = {
      fontId: 0,
      textureId: 0,
      shaderId: 0,
      shaderPool: [0],
      fontSize: 8,
      lineHeight: 8,
      distanceRange: 4,
    };
  }

  return defaultMsdfFont;
}

/**
 * Load an MSDF font from a pre-generated atlas image and metrics JSON file.
 * The atlas should be generated with msdf-atlas-gen or a compatible tool.
 *
 * The atlas texture is uploaded in linear format (not sRGB) so that the SDF
 * distance field values are sampled correctly by the MSDF shader.
 *
 * @param atlasPath - Path to the MSDF atlas PNG image.
 * @param metricsJson - JSON string containing glyph metrics (msdf-atlas-gen format).
 * @returns MSDFFont descriptor for use with drawText(). Includes a `shaderPool` for
 *   per-draw-call outline/shadow parameters.
 *
 * @example
 * const metrics = await fetch("fonts/roboto-msdf.json").then(r => r.text());
 * const font = loadMSDFFont("fonts/roboto-msdf.png", metrics);
 * drawText("Custom font!", 10, 10, { msdfFont: font, scale: 2, screenSpace: true });
 */
export function loadMSDFFont(
  atlasPath: string,
  metricsJson: string,
): MSDFFont {
  if (!hasMsdfOps) {
    // Headless dummy
    return {
      fontId: 0,
      textureId: 0,
      shaderId: 0,
      shaderPool: [0],
      fontSize: 32,
      lineHeight: 38,
      distanceRange: 4,
    };
  }

  const resultJson: string = (
    globalThis as any
  ).Deno.core.ops.op_load_msdf_font(atlasPath, metricsJson);
  const result = JSON.parse(resultJson);

  if (result.error) {
    throw new Error(`Failed to load MSDF font: ${result.error}`);
  }

  // Get font info
  const infoJson: string = (
    globalThis as any
  ).Deno.core.ops.op_get_msdf_font_info(result.fontId);
  const info = JSON.parse(infoJson);

  const pool: number[] = result.shaderPool ?? [result.shaderId];
  if (msdfShaderPool.length === 0) msdfShaderPool = pool;

  return {
    fontId: result.fontId,
    textureId: result.textureId,
    shaderId: result.shaderId,
    shaderPool: pool,
    fontSize: info.fontSize,
    lineHeight: info.lineHeight,
    distanceRange: info.distanceRange,
  };
}

/**
 * Get MSDF glyph metrics for a character from a loaded MSDF font.
 * Results are cached for performance.
 */
function getMSDFGlyphs(font: MSDFFont, text: string): MSDFGlyph[] {
  if (!hasMsdfOps) {
    // Headless: return dummy glyphs
    return text.split("").map((ch) => ({
      char: ch.charCodeAt(0),
      uv: [0, 0, 1, 1] as [number, number, number, number],
      advance: font.fontSize,
      width: font.fontSize,
      height: font.fontSize,
      offsetX: 0,
      offsetY: 0,
    }));
  }

  // Check cache for each character
  const glyphs: MSDFGlyph[] = [];
  const uncachedChars: string[] = [];

  for (const ch of text) {
    const cacheKey = `${font.fontId}:${ch.charCodeAt(0)}`;
    const cached = msdfGlyphCache.get(cacheKey);
    if (cached) {
      glyphs.push(cached);
    } else {
      uncachedChars.push(ch);
    }
  }

  // Fetch any uncached glyphs in batch
  if (uncachedChars.length > 0) {
    const uniqueChars = [...new Set(uncachedChars)].join("");
    const resultJson: string = (
      globalThis as any
    ).Deno.core.ops.op_get_msdf_glyphs(font.fontId, uniqueChars);
    const fetchedGlyphs: MSDFGlyph[] = JSON.parse(resultJson);

    // Cache them
    for (const g of fetchedGlyphs) {
      const cacheKey = `${font.fontId}:${g.char}`;
      msdfGlyphCache.set(cacheKey, g);
    }

    // Rebuild result with all glyphs in order
    glyphs.length = 0;
    for (const ch of text) {
      const cacheKey = `${font.fontId}:${ch.charCodeAt(0)}`;
      const glyph = msdfGlyphCache.get(cacheKey);
      if (glyph) {
        glyphs.push(glyph);
      }
    }
  }

  return glyphs;
}

/**
 * Measure the pixel dimensions of text rendered with an MSDF font.
 * Pure math with cached glyph data -- works in headless mode.
 */
function measureMSDFTextInternal(
  text: string,
  font: MSDFFont,
  scale: number,
): TextMeasurement {
  const glyphs = getMSDFGlyphs(font, text);
  const fontScale = scale * (font.fontSize / font.fontSize); // Always 1 here, but scale is applied
  let width = 0;
  for (const g of glyphs) {
    width += g.advance * scale;
  }
  return {
    width,
    height: font.lineHeight * scale,
  };
}

// --- Combined text functions ---

/**
 * Measure the pixel dimensions of a text string without drawing it.
 * Works with both bitmap fonts and MSDF fonts.
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
  // MSDF path
  if (options?.msdfFont) {
    const scale = options?.scale ?? 1;
    return measureMSDFTextInternal(text, options.msdfFont, scale);
  }

  // Bitmap path (original)
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
 * When `msdfFont` is specified in options, uses MSDF rendering for
 * resolution-independent text with optional outline and shadow effects.
 * When only `font` or no font is specified, uses the classic bitmap renderer.
 *
 * @param text - The string to draw.
 * @param x - X position (screen pixels if screenSpace, world units otherwise).
 * @param y - Y position (screen pixels if screenSpace, world units otherwise).
 * @param options - Font, scale, tint, layer, screenSpace, outline, and shadow options.
 *
 * @example
 * // Draw HUD text at the top-left of the screen
 * drawText("HP: 100", 10, 10, { scale: 2, screenSpace: true });
 *
 * @example
 * // Draw MSDF text with outline and shadow
 * const font = getDefaultMSDFFont();
 * drawText("Sharp Text!", 100, 100, {
 *   msdfFont: font,
 *   scale: 3,
 *   screenSpace: true,
 *   outline: { width: 1.0, color: { r: 0, g: 0, b: 0, a: 1 } },
 *   shadow: { offsetX: 2, offsetY: 2, color: { r: 0, g: 0, b: 0, a: 0.5 } },
 * });
 *
 * @example
 * // Multiple drawText calls with different params in the same frame work correctly.
 * // Each unique outline/shadow combo gets its own shader slot from the pool.
 * drawText("Red outline", 10, 10, { msdfFont: font, outline: { width: 1, color: { r: 1, g: 0, b: 0, a: 1 } } });
 * drawText("Blue outline", 10, 40, { msdfFont: font, outline: { width: 2, color: { r: 0, g: 0, b: 1, a: 1 } } });
 * drawText("No effects", 10, 70, { msdfFont: font });
 */
export function drawText(
  text: string,
  x: number,
  y: number,
  options?: TextOptions,
): void {
  if (!hasRenderOps) return;

  // MSDF path
  if (options?.msdfFont) {
    drawMSDFTextInternal(text, x, y, options);
    return;
  }

  // Bitmap path (original, unchanged)
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
      const { width: viewportW, height: viewportH } = getViewportSize();
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

// --- MSDF internal drawing ---

/**
 * Internal: draw text using MSDF rendering.
 * Allocates a shader from the pool based on param combo, sets uniforms, emits sprites.
 */
function drawMSDFTextInternal(
  text: string,
  x: number,
  y: number,
  options: TextOptions,
): void {
  const msdfFont = options.msdfFont!;
  const scale = options.scale ?? 1;
  const layer = options.layer ?? 100;
  const tint = options.tint ?? { r: 1, g: 1, b: 1, a: 1 };
  const screenSpace = options.screenSpace ?? false;
  const outline = options.outline;
  const shadow = options.shadow;

  // Compute screen pixel range for SDF rendering.
  const glyphScreenSize = msdfFont.fontSize * scale;
  const atlasGlyphSize = msdfFont.fontSize + 2 * msdfFont.distanceRange;
  const screenPxRange = (glyphScreenSize / atlasGlyphSize) * msdfFont.distanceRange;

  // Resolve which shader to use from the pool
  const pool = msdfFont.shaderPool.length > 0 ? msdfFont.shaderPool : [msdfFont.shaderId];
  const key = msdfParamKey(screenPxRange, outline, shadow);
  let poolIndex = msdfParamCache.get(key);
  if (poolIndex === undefined) {
    poolIndex = msdfNextPoolSlot % pool.length;
    msdfNextPoolSlot++;
    msdfParamCache.set(key, poolIndex);
  }
  const sid = pool[poolIndex];

  // Set MSDF shader parameters
  const hasShaderParamOp =
    typeof (globalThis as any).Deno?.core?.ops?.op_set_shader_param ===
    "function";

  if (hasShaderParamOp) {
    const setParam = (
      globalThis as any
    ).Deno.core.ops.op_set_shader_param;

    // Slot 0: [distance_range, font_size_px, screen_px_range, _pad]
    setParam(sid, 0, msdfFont.distanceRange, msdfFont.fontSize, Math.max(screenPxRange, 1.0), 0);

    // Slot 1: outline [width, r, g, b]
    if (outline) {
      setParam(sid, 1, outline.width, outline.color.r, outline.color.g, outline.color.b);
      // Slot 2: outline [a, _, _, _]
      setParam(sid, 2, outline.color.a, 0, 0, 0);
    } else {
      setParam(sid, 1, 0, 0, 0, 0);
      setParam(sid, 2, 0, 0, 0, 0);
    }

    // Slot 3: shadow [offset_x, offset_y, softness, _]
    if (shadow) {
      setParam(sid, 3, shadow.offsetX, shadow.offsetY, shadow.softness ?? 1.0, 0);
      // Slot 4: shadow [r, g, b, a]
      setParam(sid, 4, shadow.color.r, shadow.color.g, shadow.color.b, shadow.color.a);
    } else {
      setParam(sid, 3, 0, 0, 0, 0);
      setParam(sid, 4, 0, 0, 0, 0);
    }
  }

  // Get glyph metrics
  const glyphs = getMSDFGlyphs(msdfFont, text);

  // Draw each glyph as a sprite with the allocated MSDF shader
  let cursorX = x;

  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];

    // The glyph sprite size includes the SDF padding
    // Atlas cell size = fontSize + 2 * distanceRange
    const cellScale = (msdfFont.fontSize + 2 * msdfFont.distanceRange) / msdfFont.fontSize;
    const spriteW = msdfFont.fontSize * scale * cellScale;
    const spriteH = msdfFont.fontSize * scale * cellScale;

    // Offset to center the glyph within the padded cell
    const padOffset = msdfFont.distanceRange * scale;

    const drawX = cursorX - padOffset + g.offsetX * scale;
    const drawY = y - padOffset + g.offsetY * scale;

    let worldX: number;
    let worldY: number;
    let wW: number;
    let wH: number;

    if (screenSpace) {
      const cam = getCamera();
      const { width: viewportW, height: viewportH } = getViewportSize();
      worldX = drawX / cam.zoom + cam.x - viewportW / (2 * cam.zoom);
      worldY = drawY / cam.zoom + cam.y - viewportH / (2 * cam.zoom);
      wW = spriteW / cam.zoom;
      wH = spriteH / cam.zoom;
    } else {
      worldX = drawX;
      worldY = drawY;
      wW = spriteW;
      wH = spriteH;
    }

    drawSprite({
      textureId: msdfFont.textureId,
      x: worldX,
      y: worldY,
      w: wW,
      h: wH,
      layer,
      uv: { x: g.uv[0], y: g.uv[1], w: g.uv[2], h: g.uv[3] },
      tint,
      shaderId: sid,
    });

    cursorX += g.advance * scale;
  }
}
