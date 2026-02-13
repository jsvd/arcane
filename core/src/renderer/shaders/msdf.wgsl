// MSDF (Multi-channel Signed Distance Field) text shader.
//
// Uses the same vertex shader, camera, texture, and lighting bind groups as sprite.wgsl.
// The fragment shader computes median(R, G, B) from the MSDF atlas, then uses
// smoothstep for crisp anti-aliased edges at any scale.
//
// Supports:
// - Resolution-independent text rendering
// - Configurable outline (width + color via uniform)
// - Configurable shadow (offset + color + softness via uniform)
//
// Bind groups:
// @group(0) — Camera uniform (vertex)
// @group(1) — MSDF atlas texture + sampler (fragment)
// @group(2) — Lighting uniform (fragment) — same as sprite
// @group(3) — MSDF params uniform (fragment)

struct CameraUniform {
    view_proj: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

@group(1) @binding(0)
var t_msdf: texture_2d<f32>;

@group(1) @binding(1)
var s_msdf: sampler;

struct LightData {
    pos_radius: vec4<f32>,
    color_intensity: vec4<f32>,
};

struct LightingUniform {
    ambient: vec3<f32>,
    light_count: u32,
    lights: array<LightData, 8>,
};

@group(2) @binding(0)
var<uniform> lighting: LightingUniform;

// MSDF rendering parameters.
// Slot 0: [distance_range, font_size_px, screen_px_range, _pad]
// Slot 1: outline [width, r, g, b]
// Slot 2: outline [a, _, _, _]
// Slot 3: shadow [offset_x, offset_y, softness, _]
// Slot 4: shadow [r, g, b, a]
struct MsdfParams {
    values: array<vec4<f32>, 16>,
};

@group(3) @binding(0)
var<uniform> msdf_params: MsdfParams;

struct VertexInput {
    @location(0) position: vec2<f32>,
    @location(1) uv: vec2<f32>,
};

struct InstanceInput {
    @location(2) world_pos: vec2<f32>,
    @location(3) size: vec2<f32>,
    @location(4) uv_offset: vec2<f32>,
    @location(5) uv_size: vec2<f32>,
    @location(6) tint: vec4<f32>,
    @location(7) rotation_origin: vec4<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
    @location(1) tint: vec4<f32>,
    @location(2) world_position: vec2<f32>,
};

@vertex
fn vs_main(vertex: VertexInput, instance: InstanceInput) -> VertexOutput {
    var out: VertexOutput;

    let rotation = instance.rotation_origin.x;
    let origin = vec2<f32>(instance.rotation_origin.y, instance.rotation_origin.z);

    var pos = vertex.position * instance.size;

    let pivot = origin * instance.size;
    pos = pos - pivot;

    let cos_r = cos(rotation);
    let sin_r = sin(rotation);
    let rotated = vec2<f32>(
        pos.x * cos_r - pos.y * sin_r,
        pos.x * sin_r + pos.y * cos_r,
    );

    pos = rotated + pivot;

    let world_xy = pos + instance.world_pos;
    let world = vec4<f32>(world_xy.x, world_xy.y, 0.0, 1.0);
    out.clip_position = camera.view_proj * world;
    out.tex_coords = instance.uv_offset + vertex.uv * instance.uv_size;
    out.tint = instance.tint;
    out.world_position = world_xy;

    return out;
}

/// Compute median of three values (the core MSDF operation).
fn median(r: f32, g: f32, b: f32) -> f32 {
    return max(min(r, g), min(max(r, g), b));
}

/// Sample the MSDF and return the screen-space distance.
fn msdf_distance(uv: vec2<f32>, screen_px_range: f32) -> f32 {
    let msd = textureSample(t_msdf, s_msdf, uv);
    let sd = median(msd.r, msd.g, msd.b);
    return (sd - 0.5) * screen_px_range;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let screen_px_range = msdf_params.values[0].z;

    // --- Shadow pass ---
    let shadow_offset = msdf_params.values[3].xy;
    let shadow_softness = msdf_params.values[3].z;
    let shadow_color = msdf_params.values[4];
    var shadow_alpha = 0.0;

    if (shadow_color.a > 0.0) {
        // Compute texel size from atlas dimensions for shadow offset
        let tex_size = vec2<f32>(textureDimensions(t_msdf, 0));
        let shadow_uv = in.tex_coords + shadow_offset / tex_size;
        let shadow_dist = msdf_distance(shadow_uv, screen_px_range);
        let softness_factor = max(shadow_softness, 1.0);
        shadow_alpha = smoothstep(-softness_factor, softness_factor, shadow_dist) * shadow_color.a;
    }

    // --- Outline pass ---
    let outline_width = msdf_params.values[1].x;
    let outline_rgb = msdf_params.values[1].yzw;
    let outline_a = msdf_params.values[2].x;

    let dist = msdf_distance(in.tex_coords, screen_px_range);

    var outline_alpha = 0.0;
    if (outline_width > 0.0 && outline_a > 0.0) {
        // Outline extends outward from the glyph edge
        outline_alpha = smoothstep(-outline_width - 0.5, -outline_width + 0.5, dist) * outline_a;
    }

    // --- Fill pass ---
    let fill_alpha = smoothstep(-0.5, 0.5, dist);

    // Composite: shadow behind outline behind fill
    var color = vec4<f32>(0.0);

    // Shadow layer
    if (shadow_alpha > 0.0) {
        color = vec4<f32>(shadow_color.rgb, shadow_alpha);
    }

    // Outline layer (over shadow)
    if (outline_alpha > 0.0) {
        let oa = outline_alpha * (1.0 - fill_alpha); // Only show outline where fill isn't
        color = vec4<f32>(
            mix(color.rgb, outline_rgb, oa),
            max(color.a, oa),
        );
    }

    // Fill layer (over outline and shadow)
    let fill_color = in.tint;
    if (fill_alpha > 0.0) {
        let fa = fill_alpha * fill_color.a;
        color = vec4<f32>(
            mix(color.rgb, fill_color.rgb, fa),
            max(color.a, fa),
        );
    }

    // Apply lighting
    var light_color = lighting.ambient;
    for (var i = 0u; i < lighting.light_count; i = i + 1u) {
        let light = lighting.lights[i];
        let light_pos = light.pos_radius.xy;
        let radius = light.pos_radius.z;
        let lcolor = light.color_intensity.rgb;
        let intensity = light.color_intensity.a;

        let d = length(in.world_position - light_pos);
        let atten = smoothstep(radius, 0.0, d) * intensity;
        light_color = light_color + lcolor * atten;
    }
    light_color = clamp(light_color, vec3<f32>(0.0), vec3<f32>(1.0));

    return vec4<f32>(color.rgb * light_color, color.a);
}
