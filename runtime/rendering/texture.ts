import type { TextureId } from "./types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_load_texture === "function";

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
 * @param r - Red channel, 0-255.
 * @param g - Green channel, 0-255.
 * @param b - Blue channel, 0-255.
 * @param a - Alpha channel, 0-255. Default: 255 (fully opaque).
 * @returns Texture handle for use with drawSprite().
 *
 * @example
 * const redTex = createSolidTexture("red", 255, 0, 0);
 * drawSprite({ textureId: redTex, x: 10, y: 10, w: 50, h: 50 });
 */
export function createSolidTexture(
  name: string,
  r: number,
  g: number,
  b: number,
  a: number = 255,
): TextureId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_solid_texture(name, r, g, b, a);
}
