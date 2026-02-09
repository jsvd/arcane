// Sprite instanced quad shader
//
// Each sprite instance provides: position (x,y), size (w,h), UV rect, layer, and color tint.
// The vertex shader positions a unit quad per instance.
// The fragment shader samples the bound texture atlas.

struct CameraUniform {
    view_proj: mat4x4<f32>,
};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

@group(1) @binding(0)
var t_diffuse: texture_2d<f32>;

@group(1) @binding(1)
var s_diffuse: sampler;

struct VertexInput {
    // Per-vertex: unit quad corners
    @location(0) position: vec2<f32>,
    @location(1) uv: vec2<f32>,
};

struct InstanceInput {
    // Per-instance: world position, size, UV sub-rect, tint color
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
};

@vertex
fn vs_main(vertex: VertexInput, instance: InstanceInput) -> VertexOutput {
    var out: VertexOutput;

    // Scale unit quad by sprite size, offset by world position
    let world = vec4<f32>(
        vertex.position.x * instance.size.x + instance.world_pos.x,
        vertex.position.y * instance.size.y + instance.world_pos.y,
        0.0,
        1.0,
    );

    out.clip_position = camera.view_proj * world;

    // Map unit UV to atlas sub-rect
    out.tex_coords = instance.uv_offset + vertex.uv * instance.uv_size;
    out.tint = instance.tint;

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex_color = textureSample(t_diffuse, s_diffuse, in.tex_coords);
    return tex_color * in.tint;
}
