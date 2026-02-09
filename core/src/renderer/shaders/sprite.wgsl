// Sprite instanced quad shader with lighting support
//
// Bind groups:
// @group(0) — Camera uniform (vertex)
// @group(1) — Texture + sampler (fragment)
// @group(2) — Lighting uniform (fragment)

struct CameraUniform {
    view_proj: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

@group(1) @binding(0)
var t_diffuse: texture_2d<f32>;

@group(1) @binding(1)
var s_diffuse: sampler;

struct LightData {
    pos_radius: vec4<f32>,      // xy = position, z = radius, w = padding
    color_intensity: vec4<f32>, // rgb = color, a = intensity
};

struct LightingUniform {
    ambient: vec3<f32>,
    light_count: u32,
    lights: array<LightData, 8>,
};

@group(2) @binding(0)
var<uniform> lighting: LightingUniform;

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

    let world_xy = vec2<f32>(
        vertex.position.x * instance.size.x + instance.world_pos.x,
        vertex.position.y * instance.size.y + instance.world_pos.y,
    );

    let world = vec4<f32>(world_xy.x, world_xy.y, 0.0, 1.0);
    out.clip_position = camera.view_proj * world;
    out.tex_coords = instance.uv_offset + vertex.uv * instance.uv_size;
    out.tint = instance.tint;
    out.world_position = world_xy;

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex_color = textureSample(t_diffuse, s_diffuse, in.tex_coords);

    // Accumulate lighting
    var light_color = lighting.ambient;

    for (var i = 0u; i < lighting.light_count; i = i + 1u) {
        let light = lighting.lights[i];
        let light_pos = light.pos_radius.xy;
        let radius = light.pos_radius.z;
        let color = light.color_intensity.rgb;
        let intensity = light.color_intensity.a;

        let dist = length(in.world_position - light_pos);
        let atten = smoothstep(radius, 0.0, dist) * intensity;
        light_color = light_color + color * atten;
    }

    // Clamp light contribution to [0, 1] per channel
    light_color = clamp(light_color, vec3<f32>(0.0), vec3<f32>(1.0));

    return vec4<f32>(tex_color.rgb * in.tint.rgb * light_color, tex_color.a * in.tint.a);
}
