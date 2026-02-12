/**
 * Post-processing pipeline: fullscreen effects applied after sprite rendering.
 *
 * When effects are active, sprites render to an offscreen texture, then each
 * effect is applied in order (ping-pong between two offscreen textures),
 * with the final result output to the screen.
 *
 * Built-in effects and their param slots (set via setEffectParam index 0):
 *
 * **bloom** — Bright-pass glow.
 *   - x: threshold (0-1, default 0.7) — luminance cutoff for "bright"
 *   - y: intensity (0-1, default 0.5) — bloom strength
 *   - z: radius (pixels, default 3.0) — blur spread
 *
 * **blur** — Gaussian blur.
 *   - x: strength (default 1.0) — texel offset multiplier
 *
 * **vignette** — Darken screen edges.
 *   - x: intensity (0-1, default 0.5) — edge darkness
 *   - y: radius (0-1, default 0.8) — vignette size
 *
 * **crt** — CRT monitor simulation.
 *   - x: scanlineFrequency (default 800) — scanline count
 *   - y: distortion (default 0.1) — barrel distortion amount
 *   - z: brightness (default 1.1) — overall brightness boost
 *
 * @example
 * const crt = addPostProcessEffect("crt");
 * setEffectParam(crt, 0, 600, 0.15, 1.2); // fewer scanlines, more distortion
 *
 * @example
 * const bloom = addPostProcessEffect("bloom");
 * const vignette = addPostProcessEffect("vignette");
 * // Effects applied in order: bloom first, then vignette
 */

/** Opaque handle to a post-process effect. */
export type EffectId = number;

// Detect if we're running inside the Arcane renderer (V8 with render ops).
const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_add_effect === "function";

/**
 * Add a post-process effect. Effects are applied in the order they are added.
 *
 * @param effect - Built-in effect type.
 * @returns EffectId for use with setEffectParam and removeEffect.
 */
export function addPostProcessEffect(
  effect: "bloom" | "blur" | "vignette" | "crt",
): EffectId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_add_effect(effect);
}

/**
 * Set a vec4 parameter slot on a post-process effect.
 * See module docs for what each index/component means per effect type.
 *
 * @param effectId - Effect handle from addPostProcessEffect.
 * @param index - Param slot (0-3). Most effects use only slot 0.
 * @param x - First component.
 * @param y - Second component. Default: 0.
 * @param z - Third component. Default: 0.
 * @param w - Fourth component. Default: 0.
 */
export function setEffectParam(
  effectId: EffectId,
  index: number,
  x: number,
  y: number = 0,
  z: number = 0,
  w: number = 0,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_effect_param(
    effectId,
    index,
    x,
    y,
    z,
    w,
  );
}

/**
 * Remove a single post-process effect.
 *
 * @param effectId - Effect handle to remove.
 */
export function removeEffect(effectId: EffectId): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_remove_effect(effectId);
}

/**
 * Remove all post-process effects, restoring direct-to-screen rendering.
 */
export function clearEffects(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_effects();
}
