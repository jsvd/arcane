const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_set_ambient_light ===
    "function";

/**
 * Set the ambient light color applied to all sprites.
 * (1, 1, 1) = full white (no darkening, the default).
 * (0, 0, 0) = complete darkness (only point lights visible).
 * No-op in headless mode.
 *
 * @param r - Red channel, 0.0-1.0.
 * @param g - Green channel, 0.0-1.0.
 * @param b - Blue channel, 0.0-1.0.
 */
export function setAmbientLight(r: number, g: number, b: number): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_ambient_light(r, g, b);
}

/**
 * Add a point light at a world position.
 * Point lights illuminate sprites within their radius, blending with the ambient light.
 * Must be called every frame (lights are cleared at frame start).
 * No-op in headless mode.
 *
 * @param x - Light center X in world units.
 * @param y - Light center Y in world units.
 * @param radius - Light radius in world units. Falloff is smooth to the edge.
 * @param r - Light color red channel, 0.0-1.0. Default: 1.
 * @param g - Light color green channel, 0.0-1.0. Default: 1.
 * @param b - Light color blue channel, 0.0-1.0. Default: 1.
 * @param intensity - Light brightness multiplier, 0.0+. Default: 1.
 */
export function addPointLight(
  x: number,
  y: number,
  radius: number,
  r: number = 1,
  g: number = 1,
  b: number = 1,
  intensity: number = 1,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_add_point_light(
    x,
    y,
    radius,
    r,
    g,
    b,
    intensity,
  );
}

/**
 * Clear all point lights for this frame.
 * Called automatically at frame start by the renderer; manual use is rarely needed.
 * No-op in headless mode.
 */
export function clearLights(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_lights();
}
