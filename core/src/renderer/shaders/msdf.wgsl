// MSDF (Multi-channel Signed Distance Field) text fragment shader.
//
// This is a standalone fragment shader intended for use with the custom shader system
// (ShaderStore). The standard preamble (camera, texture, lighting, vertex shader) and
// ShaderParams uniform are prepended automatically by ShaderStore::create().
//
// The fragment shader computes median(R, G, B) from the MSDF atlas, then uses
// smoothstep for crisp anti-aliased edges at any scale.
//
// Uniform slots (shader_params.values[]):
//   [0]: [distance_range, font_size_px, screen_px_range, _pad]
//   [1]: outline [width, r, g, b]
//   [2]: outline [a, _, _, _]
//   [3]: shadow [offset_x, offset_y, softness, _]
//   [4]: shadow [r, g, b, a]
//
// Supports:
// - Resolution-independent text rendering
// - Configurable outline (width + color)
// - Configurable shadow (offset + color + softness)

/// Compute median of three values (the core MSDF operation).
fn median3(r: f32, g: f32, b: f32) -> f32 {
    return max(min(r, g), min(max(r, g), b));
}

/// Sample the MSDF atlas and return the screen-space distance.
fn msdf_sample_distance(uv: vec2<f32>, screen_px_range: f32) -> f32 {
    let msd = textureSample(t_diffuse, s_diffuse, uv);
    let sd = median3(msd.r, msd.g, msd.b);
    return (sd - 0.5) * screen_px_range;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let screen_px_range = shader_params.values[0].z;

    // --- Shadow pass ---
    let shadow_offset = shader_params.values[3].xy;
    let shadow_softness = shader_params.values[3].z;
    let shadow_color = shader_params.values[4];
    var shadow_alpha = 0.0;

    if (shadow_color.a > 0.0) {
        // Convert shadow offset from screen pixels to UV space.
        // shadow_offset is in screen pixels. To show shadow at +offset, we sample SDF at -offset.
        // scale = screen_px_range / (2 * distance_range)
        // 1 screen pixel = 1/scale atlas pixels = 2 * distance_range / screen_px_range atlas pixels
        // 1 atlas pixel = 1/tex_size in UV
        // So 1 screen pixel = 2 * distance_range / (screen_px_range * tex_size) in UV
        let distance_range = shader_params.values[0].x;
        let tex_size = vec2<f32>(textureDimensions(t_diffuse, 0));
        let screen_to_uv = 2.0 * distance_range / (screen_px_range * tex_size);
        let shadow_uv = in.tex_coords - shadow_offset * screen_to_uv;
        let shadow_dist = msdf_sample_distance(shadow_uv, screen_px_range);
        let softness_factor = max(shadow_softness, 1.0);
        shadow_alpha = smoothstep(-softness_factor, softness_factor, shadow_dist) * shadow_color.a;
    }

    // --- Outline pass ---
    let outline_width = shader_params.values[1].x;
    let outline_rgb = shader_params.values[1].yzw;
    let outline_a = shader_params.values[2].x;

    let dist = msdf_sample_distance(in.tex_coords, screen_px_range);

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
