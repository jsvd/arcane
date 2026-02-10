import type { TextureId } from "./types.ts";

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_load_texture === "function";

/**
 * Load a texture from a PNG file path. Returns a texture handle.
 * Caches by path — loading the same path twice returns the same handle.
 * Returns 0 (no texture) in headless mode.
 */
export function loadTexture(path: string): TextureId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_load_texture(path);
}

/**
 * Create a solid-color 1x1 texture. Useful for placeholder sprites.
 * Colors are 0-255 RGBA.
 * Returns 0 (no texture) in headless mode.
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
