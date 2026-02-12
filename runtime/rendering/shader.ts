/**
 * Custom shader support for user-defined WGSL fragment shaders.
 *
 * Custom shaders replace the fragment stage while keeping the standard
 * vertex shader (rotation, transforms, camera projection). The standard
 * declarations (camera, texture, lighting, VertexOutput) are prepended
 * automatically — you only write the @fragment function.
 *
 * Custom uniforms are available via `shader_params.values[0..15]` (16 vec4 slots).
 *
 * @example
 * const crt = createShaderFromSource("crt", `
 *   @fragment
 *   fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
 *     let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
 *     let scanline = sin(in.tex_coords.y * shader_params.values[0].x) * 0.5 + 0.5;
 *     return vec4<f32>(tex.rgb * in.tint.rgb * scanline, tex.a * in.tint.a);
 *   }
 * `);
 * setShaderParam(crt, 0, 800.0); // scanline frequency
 * drawSprite({ textureId: tex, x: 0, y: 0, w: 800, h: 600, shaderId: crt });
 */

/** Opaque handle to a custom shader. Returned by {@link createShaderFromSource}. */
export type ShaderId = number;

// Detect if we're running inside the Arcane renderer (V8 with render ops).
const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_shader === "function";

/**
 * Create a custom fragment shader from WGSL source.
 * The source must contain a `@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32>`.
 *
 * Standard declarations are prepended automatically:
 * - `camera` (group 0), `t_diffuse`/`s_diffuse` (group 1), `lighting` (group 2)
 * - `VertexOutput` struct with `tex_coords`, `tint`, `world_position`
 * - Standard vertex shader (`vs_main`)
 *
 * Custom uniforms: `shader_params.values[0..15]` (group 3, 16 vec4 slots).
 *
 * @param name - Shader name (for debugging).
 * @param wgslSource - WGSL fragment shader source.
 * @returns ShaderId for use in {@link drawSprite}'s `shaderId` option.
 */
export function createShaderFromSource(
  name: string,
  wgslSource: string,
): ShaderId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_shader(name, wgslSource);
}

/**
 * Set a vec4 parameter slot on a custom shader.
 * Values are accessible in the shader as `shader_params.values[index]`.
 *
 * @param shaderId - Shader handle from {@link createShaderFromSource}.
 * @param index - Slot index (0-15).
 * @param x - First component (or the only value for scalar params).
 * @param y - Second component. Default: 0.
 * @param z - Third component. Default: 0.
 * @param w - Fourth component. Default: 0.
 */
export function setShaderParam(
  shaderId: ShaderId,
  index: number,
  x: number,
  y: number = 0,
  z: number = 0,
  w: number = 0,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_shader_param(
    shaderId,
    index,
    x,
    y,
    z,
    w,
  );
}
