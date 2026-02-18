import type { TextureId } from "./types.ts";
import type { Color } from "../ui/types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_load_texture === "function";

const hasUploadOp =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_upload_rgba_texture === "function";

/**
 * Load a texture from a PNG file path. Returns an opaque texture handle.
 * Caches by path -- loading the same path twice returns the same handle.
 * Returns 0 (no texture) in headless mode.
 *
 * @param path - File path to a PNG image (relative to game entry file or absolute).
 * @returns Texture handle for use with drawSprite(), createTilemap(), etc.
 *
 * @example
 * const playerTex = loadTexture("assets/player.png");
 * drawSprite({ textureId: playerTex, x: 0, y: 0, w: 32, h: 32 });
 */
export function loadTexture(path: string): TextureId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_load_texture(path);
}

/**
 * Create a 1x1 solid-color texture. Useful for rectangles, placeholder sprites,
 * and UI elements. Cached by name -- creating the same name twice returns the same handle.
 * Returns 0 (no texture) in headless mode.
 *
 * @param name - Unique name for caching (e.g. "red", "health-green").
 * @param color - Color with 0.0-1.0 RGBA components. Use rgb() to create from 0-255 values.
 * @returns Texture handle for use with drawSprite().
 *
 * @example
 * const redTex = createSolidTexture("red", { r: 1, g: 0, b: 0, a: 1 });
 * drawSprite({ textureId: redTex, x: 10, y: 10, w: 50, h: 50 });
 */
export function createSolidTexture(
  name: string,
  color: Color,
): TextureId {
  if (!hasRenderOps) return 0;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round((color.a ?? 1) * 255);
  return (globalThis as any).Deno.core.ops.op_create_solid_texture(name, r, g, b, a);
}

/**
 * Upload a raw RGBA pixel buffer as a texture. Cached by name --
 * uploading the same name twice returns the existing handle.
 * Returns 0 (no texture) in headless mode.
 *
 * @param name - Unique name for caching (e.g. "__circle_64").
 * @param w - Texture width in pixels.
 * @param h - Texture height in pixels.
 * @param pixels - RGBA pixel data (Uint8Array of length w * h * 4).
 * @returns Texture handle for use with drawSprite().
 */
export function uploadRgbaTexture(
  name: string,
  w: number,
  h: number,
  pixels: Uint8Array,
): TextureId {
  if (!hasUploadOp) return 0;
  return (globalThis as any).Deno.core.ops.op_upload_rgba_texture(name, w, h, pixels);
}
