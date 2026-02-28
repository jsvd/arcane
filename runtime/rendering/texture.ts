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
 * @param path - File path to a PNG image (relative to project root).
 * @param options - Optional texture loading options.
 * @param options.filtering - Texture filtering mode. Default: "nearest" (crisp pixels).
 * @returns Texture handle for use with drawSprite(), createTilemap(), etc.
 *
 * **Filtering modes:**
 * - `"nearest"` (default) — Crisp, pixel-perfect. Use for pixel art, retro games, UI.
 * - `"linear"` — Smooth, blended. Use for gradients, photos, pre-rendered 3D sprites.
 *
 * @example Pixel art (crisp edges, default)
 * const heroTex = loadTexture("assets/hero.png");
 * drawSprite({ textureId: heroTex, x: 0, y: 0, w: 32, h: 32 });
 *
 * @example Smooth gradient
 * const skyTex = loadTexture("assets/sky-gradient.png", { filtering: "linear" });
 * drawSprite({ textureId: skyTex, x: 0, y: 0, w: 800, h: 600 });
 */
export function loadTexture(
  path: string,
  options?: { filtering?: "nearest" | "linear" }
): TextureId {
  if (!hasRenderOps) return 0;
  const filtering = options?.filtering ?? "nearest";
  if (filtering === "linear") {
    return (globalThis as any).Deno.core.ops.op_load_texture_linear(path);
  }
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

// --- Async preloading ---

/** Set of paths that have been successfully loaded via loadTexture(). */
const loadedPaths = new Set<string>();

/** Loading progress (0.0-1.0) for the most recent preloadAssets call. */
let loadingProgress = 1.0;

/**
 * Preload multiple texture assets. Calls loadTexture() for each path and
 * tracks progress. The API is async for forward compatibility with a
 * truly async backend; the current implementation loads synchronously.
 *
 * @param paths - Array of texture file paths to preload.
 * @returns Promise that resolves when all textures are loaded.
 *
 * @example
 * await preloadAssets(["assets/player.png", "assets/enemy.png", "assets/tileset.png"]);
 * // All textures are now cached and ready for drawSprite()
 */
export async function preloadAssets(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    loadingProgress = 1.0;
    return;
  }

  loadingProgress = 0;
  for (let i = 0; i < paths.length; i++) {
    loadTexture(paths[i]);
    loadedPaths.add(paths[i]);
    loadingProgress = (i + 1) / paths.length;
  }
}

/**
 * Check if a texture at the given path has been loaded via loadTexture() or preloadAssets().
 *
 * @param path - File path to check.
 * @returns True if the texture has been loaded.
 */
export function isTextureLoaded(path: string): boolean {
  return loadedPaths.has(path);
}

/**
 * Get the loading progress (0.0-1.0) of the most recent preloadAssets() call.
 * Returns 1.0 if no preload is in progress or the last preload has completed.
 *
 * @returns Progress ratio between 0.0 and 1.0.
 */
export function getLoadingProgress(): number {
  return loadingProgress;
}
