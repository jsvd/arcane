/**
 * Custom shader support for user-defined WGSL fragment shaders.
 *
 * Three tiers of shader usage:
 *
 * 1. **Effect presets** — One-liner factories in `effects.ts` (outline, flash, dissolve, etc.)
 * 2. **Named uniform API** — `createShader()` + `setShaderUniform()` for custom WGSL with ergonomic names
 * 3. **Raw WGSL** — `createShaderFromSource()` + `setShaderParam()` for full control
 *
 * Built-in uniforms are auto-injected into every custom shader:
 * - `shader_params.time` — elapsed seconds
 * - `shader_params.delta` — frame delta time
 * - `shader_params.resolution` — viewport size (logical pixels)
 * - `shader_params.mouse` — mouse position (screen pixels)
 *
 * User uniforms: `shader_params.values[0..13]` (14 vec4 slots).
 *
 * @example
 * // Named uniform API (recommended)
 * const fx = createShader("dissolve", dissolveWgsl, { threshold: "float", edgeColor: "vec3" });
 * setShaderUniform(fx, "threshold", 0.5);
 *
 * @example
 * // Raw WGSL (full control)
 * const crt = createShaderFromSource("crt", `
 *   @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
 *     let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
 *     let scanline = sin(in.tex_coords.y * shader_params.values[0].x) * 0.5 + 0.5;
 *     return vec4<f32>(tex.rgb * in.tint.rgb * scanline, tex.a * in.tint.a);
 *   }
 * `);
 * setShaderParam(crt, 0, 800.0);
 */

/** Opaque handle to a custom shader. Returned by {@link createShaderFromSource}. */
export type ShaderId = number;

/** Uniform type for named shader uniforms. */
export type UniformType = "float" | "vec2" | "vec3" | "vec4";

/** Uniform layout definition for {@link createShader}. */
export type UniformDef = Record<string, UniformType>;

/** Maximum number of named uniform slots (14 user slots, 2 reserved for built-ins). */
const MAX_UNIFORM_SLOTS = 14;

// Detect if we're running inside the Arcane renderer (V8 with render ops).
const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_shader === "function";

// Named uniform registry: shaderId → Map<name, { slot, type }>
const uniformRegistry = new Map<
  ShaderId,
  Map<string, { slot: number; type: UniformType }>
>();

// Headless counter for unique IDs when GPU ops are unavailable (Node testing).
let headlessIdCounter = 0;

/**
 * Create a custom fragment shader from WGSL source.
 * The source must contain a `@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32>`.
 *
 * Standard declarations are prepended automatically:
 * - `camera` (group 0), `t_diffuse`/`s_diffuse` (group 1), `lighting` (group 2)
 * - `VertexOutput` struct with `tex_coords`, `tint`, `world_position`
 * - Standard vertex shader (`vs_main`)
 *
 * Built-in uniforms: `shader_params.time`, `.delta`, `.resolution`, `.mouse` (auto-injected).
 * User uniforms: `shader_params.values[0..13]` (group 3, 14 vec4 slots).
 *
 * @param name - Shader name (for debugging).
 * @param wgslSource - WGSL fragment shader source.
 * @returns ShaderId for use in {@link drawSprite}'s `shaderId` option.
 */
export function createShaderFromSource(
  name: string,
  wgslSource: string,
): ShaderId {
  if (!hasRenderOps) return headlessIdCounter++;
  return (globalThis as any).Deno.core.ops.op_create_shader(name, wgslSource);
}

/**
 * Set a vec4 parameter slot on a custom shader.
 * Values are accessible in the shader as `shader_params.values[index]`.
 *
 * @param shaderId - Shader handle from {@link createShaderFromSource}.
 * @param index - Slot index (0-13).
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

/**
 * Create a custom fragment shader with named uniforms.
 * Wraps {@link createShaderFromSource} with a name→slot registry for ergonomic uniform access.
 *
 * @param name - Shader name (for debugging).
 * @param source - WGSL fragment shader source.
 * @param uniforms - Optional named uniform definitions. Slots allocated sequentially (max 14).
 * @returns ShaderId for use in drawSprite's `shaderId` option.
 *
 * @example
 * const fx = createShader("dissolve", wgslCode, {
 *   threshold: "float",
 *   edgeColor: "vec3",
 *   edgeWidth: "float",
 * });
 */
export function createShader(
  name: string,
  source: string,
  uniforms?: UniformDef,
): ShaderId {
  const id = createShaderFromSource(name, source);
  if (uniforms) {
    const map = new Map<string, { slot: number; type: UniformType }>();
    let slot = 0;
    for (const [uname, utype] of Object.entries(uniforms)) {
      if (slot >= MAX_UNIFORM_SLOTS) break;
      map.set(uname, { slot, type: utype });
      slot++;
    }
    uniformRegistry.set(id, map);
  }
  return id;
}

/**
 * Set a named uniform on a custom shader.
 * The uniform name must match one declared in {@link createShader}'s `uniforms` parameter.
 *
 * @param id - Shader handle from {@link createShader}.
 * @param name - Uniform name.
 * @param values - 1-4 float values depending on uniform type.
 */
export function setShaderUniform(
  id: ShaderId,
  name: string,
  ...values: number[]
): void {
  const reg = uniformRegistry.get(id);
  if (!reg) return;
  const entry = reg.get(name);
  if (!entry) return;
  setShaderParam(
    id,
    entry.slot,
    values[0] ?? 0,
    values[1] ?? 0,
    values[2] ?? 0,
    values[3] ?? 0,
  );
}

/**
 * Get the names of all named uniforms registered for a shader.
 * Useful for agent introspection and debugging.
 *
 * @param id - Shader handle from {@link createShader}.
 * @returns Array of uniform names, or empty array if not a named-uniform shader.
 */
export function getShaderUniformNames(id: ShaderId): string[] {
  const reg = uniformRegistry.get(id);
  if (!reg) return [];
  return Array.from(reg.keys());
}
