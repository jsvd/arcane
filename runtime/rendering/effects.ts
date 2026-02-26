/**
 * Effect presets: common 2D shader effects as one-liner factories.
 * Each factory returns a {@link ShaderEffect} with named uniforms and sensible defaults.
 *
 * Built-in uniforms (`shader_params.time`, `.delta`, `.resolution`, `.mouse`) are
 * auto-injected by the engine — no per-frame boilerplate needed for time-based effects.
 *
 * @example
 * import { outlineEffect, dissolveEffect } from "@arcane/runtime/rendering";
 * const fx = outlineEffect({ color: [1, 0, 0, 1], width: 2 });
 * drawSprite({ textureId: tex, x, y, w: 64, h: 64, shaderId: fx.shaderId });
 * fx.set("outlineWidth", 3.0); // update at runtime
 */

import { createShader, setShaderUniform } from "./shader.ts";
import type { ShaderId, UniformDef } from "./shader.ts";

/** A shader effect with named uniform accessors. */
export interface ShaderEffect {
  /** The underlying shader ID for use in `drawSprite({ shaderId })`. */
  shaderId: ShaderId;
  /** Set a named uniform on this effect. */
  set(name: string, ...values: number[]): void;
}

/** Internal helper: create shader, apply defaults, return ShaderEffect. */
function makeEffect(
  name: string,
  source: string,
  uniforms: UniformDef,
  defaults: Record<string, number[]>,
): ShaderEffect {
  const id = createShader(name, source, uniforms);
  for (const [uname, vals] of Object.entries(defaults)) {
    setShaderUniform(id, uname, ...vals);
  }
  return {
    shaderId: id,
    set(uname: string, ...values: number[]) {
      setShaderUniform(id, uname, ...values);
    },
  };
}

// ── Outline ────────────────────────────────────────────────────────────

export interface OutlineOptions {
  /** Outline color [r, g, b, a] in 0-1 range. Default: white. */
  color?: [number, number, number, number];
  /** Outline width in pixels. Default: 1. */
  width?: number;
}

/** Sprite outline via 4-neighbor alpha sampling. */
export function outlineEffect(opts: OutlineOptions = {}): ShaderEffect {
  const color = opts.color ?? [1, 1, 1, 1];
  const width = opts.width ?? 1.0;
  return makeEffect(
    "outline",
    `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    let oc = shader_params.values[0];
    let ow = shader_params.values[1].x;
    let ts = vec2<f32>(textureDimensions(t_diffuse, 0));
    let px = vec2<f32>(ow) / ts;
    let a_up = textureSample(t_diffuse, s_diffuse, in.tex_coords + vec2<f32>(0.0, -px.y)).a;
    let a_dn = textureSample(t_diffuse, s_diffuse, in.tex_coords + vec2<f32>(0.0, px.y)).a;
    let a_lt = textureSample(t_diffuse, s_diffuse, in.tex_coords + vec2<f32>(-px.x, 0.0)).a;
    let a_rt = textureSample(t_diffuse, s_diffuse, in.tex_coords + vec2<f32>(px.x, 0.0)).a;
    let neighbors = max(max(a_up, a_dn), max(a_lt, a_rt));
    let outline_mask = neighbors * (1.0 - tex.a);
    let outline_col = vec4<f32>(oc.rgb, oc.a * outline_mask);
    return mix(outline_col, tex * in.tint, tex.a);
}
`,
    { outlineColor: "vec4", outlineWidth: "float" },
    { outlineColor: color, outlineWidth: [width] },
  );
}

// ── Flash ──────────────────────────────────────────────────────────────

export interface FlashOptions {
  /** Flash color [r, g, b] in 0-1 range. Default: white. */
  color?: [number, number, number];
  /** Flash intensity 0-1. Default: 0 (no flash). */
  intensity?: number;
}

/** Mix sprite with a flat color. Useful for hit feedback. */
export function flashEffect(opts: FlashOptions = {}): ShaderEffect {
  const color = opts.color ?? [1, 1, 1];
  const intensity = opts.intensity ?? 0.0;
  return makeEffect(
    "flash",
    `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    let fc = shader_params.values[0].rgb;
    let fi = shader_params.values[1].x;
    let col = mix(tex.rgb, fc, fi);
    return vec4<f32>(col * in.tint.rgb, tex.a * in.tint.a);
}
`,
    { flashColor: "vec3", intensity: "float" },
    { flashColor: color, intensity: [intensity] },
  );
}

// ── Dissolve ───────────────────────────────────────────────────────────

export interface DissolveOptions {
  /** Edge glow color [r, g, b]. Default: orange. */
  edgeColor?: [number, number, number];
  /** Edge glow width (0-1). Default: 0.05. */
  edgeWidth?: number;
}

/** Hash-noise dissolve with glowing edges. Animate `threshold` from 0→1. */
export function dissolveEffect(opts: DissolveOptions = {}): ShaderEffect {
  const edgeColor = opts.edgeColor ?? [1, 0.5, 0];
  const edgeWidth = opts.edgeWidth ?? 0.05;
  return makeEffect(
    "dissolve",
    `
fn hash21(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.1031);
    p3 = p3 + dot(p3, vec3<f32>(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
    return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    let threshold = shader_params.values[0].x;
    let ec = shader_params.values[1].rgb;
    let ew = shader_params.values[2].x;
    let noise = hash21(in.tex_coords * 100.0);
    if noise < threshold {
        discard;
    }
    let edge = smoothstep(threshold, threshold + ew, noise);
    let col = mix(ec, tex.rgb * in.tint.rgb, edge);
    return vec4<f32>(col, tex.a * in.tint.a);
}
`,
    { threshold: "float", edgeColor: "vec3", edgeWidth: "float" },
    { threshold: [0.0], edgeColor: edgeColor, edgeWidth: [edgeWidth] },
  );
}

// ── Pixelate ───────────────────────────────────────────────────────────

export interface PixelateOptions {
  /** Pixel block size. Default: 8. */
  pixelSize?: number;
}

/** UV grid-snapping pixelation. */
export function pixelateEffect(opts: PixelateOptions = {}): ShaderEffect {
  const pixelSize = opts.pixelSize ?? 8.0;
  return makeEffect(
    "pixelate",
    `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let ps = shader_params.values[0].x;
    let ts = vec2<f32>(textureDimensions(t_diffuse, 0));
    let grid = floor(in.tex_coords * ts / ps) * ps / ts;
    let tex = textureSample(t_diffuse, s_diffuse, grid);
    return tex * in.tint;
}
`,
    { pixelSize: "float" },
    { pixelSize: [pixelSize] },
  );
}

// ── Hologram ───────────────────────────────────────────────────────────

export interface HologramOptions {
  /** Scanline scroll speed. Default: 2. */
  speed?: number;
  /** Scanline spacing in UV units. Default: 100. */
  lineSpacing?: number;
  /** Chromatic aberration offset. Default: 0.005. */
  aberration?: number;
}

/** Scanlines + chromatic aberration + time flicker. Uses `shader_params.time`. */
export function hologramEffect(opts: HologramOptions = {}): ShaderEffect {
  const speed = opts.speed ?? 2.0;
  const lineSpacing = opts.lineSpacing ?? 100.0;
  const aberration = opts.aberration ?? 0.005;
  return makeEffect(
    "hologram",
    `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let spd = shader_params.values[0].x;
    let ls = shader_params.values[1].x;
    let ab = shader_params.values[2].x;
    let t = shader_params.time;
    let scanline = sin((in.tex_coords.y * ls) + t * spd) * 0.5 + 0.5;
    let r = textureSample(t_diffuse, s_diffuse, in.tex_coords + vec2<f32>(ab, 0.0)).r;
    let g = textureSample(t_diffuse, s_diffuse, in.tex_coords).g;
    let b = textureSample(t_diffuse, s_diffuse, in.tex_coords - vec2<f32>(ab, 0.0)).b;
    let a = textureSample(t_diffuse, s_diffuse, in.tex_coords).a;
    let flicker = 0.95 + 0.05 * sin(t * 15.0);
    let col = vec3<f32>(r, g, b) * scanline * flicker * in.tint.rgb;
    return vec4<f32>(col, a * in.tint.a);
}
`,
    { speed: "float", lineSpacing: "float", aberration: "float" },
    { speed: [speed], lineSpacing: [lineSpacing], aberration: [aberration] },
  );
}

// ── Water ──────────────────────────────────────────────────────────────

export interface WaterOptions {
  /** Wave amplitude (UV offset). Default: 0.02. */
  amplitude?: number;
  /** Wave frequency. Default: 10. */
  frequency?: number;
  /** Animation speed. Default: 2. */
  speed?: number;
}

/** Sine-wave UV distortion. Uses `shader_params.time`. */
export function waterEffect(opts: WaterOptions = {}): ShaderEffect {
  const amplitude = opts.amplitude ?? 0.02;
  const frequency = opts.frequency ?? 10.0;
  const speed = opts.speed ?? 2.0;
  return makeEffect(
    "water",
    `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let amp = shader_params.values[0].x;
    let freq = shader_params.values[1].x;
    let spd = shader_params.values[2].x;
    let t = shader_params.time;
    let uv_offset = vec2<f32>(
        sin(in.tex_coords.y * freq + t * spd) * amp,
        cos(in.tex_coords.x * freq + t * spd) * amp
    );
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords + uv_offset);
    return tex * in.tint;
}
`,
    { amplitude: "float", frequency: "float", speed: "float" },
    { amplitude: [amplitude], frequency: [frequency], speed: [speed] },
  );
}

// ── Glow ───────────────────────────────────────────────────────────────

export interface GlowOptions {
  /** Glow color [r, g, b]. Default: white. */
  color?: [number, number, number];
  /** Glow radius in pixels. Default: 3. */
  radius?: number;
  /** Glow intensity multiplier. Default: 1. */
  intensity?: number;
}

/** Multi-sample outer glow around sprite edges. */
export function glowEffect(opts: GlowOptions = {}): ShaderEffect {
  const color = opts.color ?? [1, 1, 1];
  const radius = opts.radius ?? 3.0;
  const intensity = opts.intensity ?? 1.0;
  return makeEffect(
    "glow",
    `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let gc = shader_params.values[0].rgb;
    let gr = shader_params.values[1].x;
    let gi = shader_params.values[2].x;
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    let ts = vec2<f32>(textureDimensions(t_diffuse, 0));
    let px = vec2<f32>(gr) / ts;
    var glow_alpha = 0.0;
    for (var y = -2; y <= 2; y++) {
        for (var x = -2; x <= 2; x++) {
            let offset = vec2<f32>(f32(x), f32(y)) * px;
            glow_alpha += textureSample(t_diffuse, s_diffuse, in.tex_coords + offset).a;
        }
    }
    glow_alpha = glow_alpha / 25.0;
    let glow_mask = glow_alpha * (1.0 - tex.a) * gi;
    let glow_col = vec4<f32>(gc * glow_mask, glow_mask);
    return mix(glow_col, tex * in.tint, tex.a);
}
`,
    { glowColor: "vec3", glowRadius: "float", glowIntensity: "float" },
    { glowColor: color, glowRadius: [radius], glowIntensity: [intensity] },
  );
}

// ── Grayscale ──────────────────────────────────────────────────────────

export interface GrayscaleOptions {
  /** Desaturation amount 0-1. Default: 1 (fully grayscale). */
  amount?: number;
}

/** Luminance-weighted desaturation. */
export function grayscaleEffect(opts: GrayscaleOptions = {}): ShaderEffect {
  const amount = opts.amount ?? 1.0;
  return makeEffect(
    "grayscale",
    `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    let amt = shader_params.values[0].x;
    let lum = dot(tex.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let col = mix(tex.rgb, vec3<f32>(lum), amt);
    return vec4<f32>(col * in.tint.rgb, tex.a * in.tint.a);
}
`,
    { amount: "float" },
    { amount: [amount] },
  );
}
