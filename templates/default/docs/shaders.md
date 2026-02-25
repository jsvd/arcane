# Shaders

Custom fragment shaders for per-sprite visual effects. Three tiers from zero-WGSL to full control.

## Effect Presets (Tier 1 — recommended)

One-liner factories that return a `ShaderEffect` with named uniform accessors. No WGSL needed.

```typescript
import { outline, flash, dissolve, pixelate, hologram, water, glow, grayscale } from "@arcane/runtime/rendering/effects";

// Create an effect with options
const fx = outline({ color: [1, 0, 0, 1], width: 2 });

// Apply to a sprite
drawSprite({ textureId: tex, x, y, w: 64, h: 64, shaderId: fx.shaderId });

// Update uniforms at runtime
fx.set("outlineWidth", 3.0);
```

### Available Presets

| Preset | Uniforms | Description |
|--------|----------|-------------|
| `outline({ color?, width? })` | `outlineColor` (vec4), `outlineWidth` (float) | 4-neighbor edge detection outline |
| `flash({ color?, intensity? })` | `flashColor` (vec3), `intensity` (float) | Mix with solid color (hit feedback) |
| `dissolve({ edgeColor?, edgeWidth? })` | `threshold` (float), `edgeColor` (vec3), `edgeWidth` (float) | Hash noise dissolve with glowing edge |
| `pixelate({ pixelSize? })` | `pixelSize` (float) | UV grid-snapping pixelation |
| `hologram({ speed?, lineSpacing?, aberration? })` | `speed` (float), `lineSpacing` (float), `aberration` (float) | Scanlines + chromatic aberration |
| `water({ amplitude?, frequency?, speed? })` | `amplitude` (float), `frequency` (float), `speed` (float) | Sine-wave UV distortion |
| `glow({ color?, radius?, intensity? })` | `glowColor` (vec3), `glowRadius` (float), `glowIntensity` (float) | Multi-sample outer glow |
| `grayscale({ amount? })` | `amount` (float) | Luminance-weighted desaturation |

Time-based presets (dissolve, hologram, water) use `shader_params.time` automatically — no per-frame boilerplate.

### Animating Presets

```typescript
const fx = dissolve();

onFrame((dt) => {
  const t = Math.sin(elapsed * 0.8) * 0.5 + 0.5;
  fx.set("threshold", t); // ping-pong dissolve
  drawSprite({ textureId: tex, x, y, w: 64, h: 64, shaderId: fx.shaderId });
});
```

## Named Uniform API (Tier 2)

Custom WGSL with named uniforms instead of indexed slots.

```typescript
import { createShader, setShaderUniform, getShaderUniformNames } from "@arcane/runtime/rendering";

const fx = createShader("tint", `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    let color = shader_params.values[0].rgb;
    let intensity = shader_params.values[1].x;
    return vec4<f32>(mix(tex.rgb, color, intensity) * in.tint.rgb, tex.a * in.tint.a);
}
`, {
  color: "vec3",
  intensity: "float",
});

setShaderUniform(fx, "color", 1.0, 0.5, 0.0);
setShaderUniform(fx, "intensity", 0.8);

// Agent introspection
getShaderUniformNames(fx); // ["color", "intensity"]
```

Uniform types: `"float"`, `"vec2"`, `"vec3"`, `"vec4"`. Max 14 named uniforms per shader.

## Raw WGSL (Tier 3)

Direct slot-indexed access for full control.

```typescript
import { createShaderFromSource, setShaderParam } from "@arcane/runtime/rendering";

const fx = createShaderFromSource("custom", `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    let param = shader_params.values[0];
    return vec4<f32>(tex.rgb * param.rgb, tex.a * in.tint.a);
}
`);

setShaderParam(fx, 0, 1.0, 0.5, 0.0, 1.0); // slot 0, vec4
```

14 user vec4 slots: `shader_params.values[0]` through `shader_params.values[13]`.

## Built-in Uniforms

Every custom shader (all tiers) has these auto-injected:

| WGSL name | Type | Description |
|-----------|------|-------------|
| `shader_params.time` | `f32` | Elapsed seconds since start |
| `shader_params.delta` | `f32` | Frame delta time in seconds |
| `shader_params.resolution` | `vec2<f32>` | Viewport size (logical pixels) |
| `shader_params.mouse` | `vec2<f32>` | Mouse position (screen pixels) |

```wgsl
// Example: time-animated scanlines
let scanline = sin(in.tex_coords.y * 100.0 + shader_params.time * 2.0) * 0.5 + 0.5;
```

## WGSL Reference

### Available in Fragment Shader

Your `@fragment fn fs_main(in: VertexOutput)` has access to:

```wgsl
// Vertex output (from vertex shader)
struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
    @location(1) tint: vec4<f32>,
    @location(2) world_position: vec2<f32>,
};

// Texture (group 1)
@group(1) @binding(0) var t_diffuse: texture_2d<f32>;
@group(1) @binding(1) var s_diffuse: sampler;

// Shader params (group 3)
@group(3) @binding(0) var<uniform> shader_params: ShaderParams;
```

### Combining with Post-Processing

Shaders and post-processing are independent. A sprite can have a custom shader AND the scene can have post-process effects:

```typescript
const fx = hologram();
addPostProcessEffect("bloom");
addPostProcessEffect("vignette");
// Hologram shader applied per-sprite, bloom/vignette applied to the whole frame
```
