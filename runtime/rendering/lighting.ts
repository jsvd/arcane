const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_set_ambient_light ===
    "function";

/** Set the ambient light color (0-1 per channel). Default is (1,1,1) = full white. */
export function setAmbientLight(r: number, g: number, b: number): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_ambient_light(r, g, b);
}

/** Add a point light at world position (x,y) with the given radius, color, and intensity. */
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

/** Clear all point lights for this frame. Called automatically at frame start. */
export function clearLights(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_lights();
}
