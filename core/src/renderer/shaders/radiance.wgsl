// Radiance Cascades 2D Global Illumination — Compute Shader
//
// Implementation of Alexander Sannikov's Radiance Cascades algorithm.
// Uses hierarchical probe-based sampling:
//   - Each cascade: N probes with R rays each
//   - Next cascade: N/4 probes with R*4 rays (same total memory)
//   - Rays march through an occupancy texture (SDF-like)
//   - Cascades merge top-down (coarse -> fine)
//   - Final radiance texture modulates sprite rendering
//
// Three compute passes:
//   1. Ray-march pass: cast rays for a single cascade level
//   2. Merge pass: merge upper cascade radiance into lower cascade
//   3. Finalize pass: sum rays per probe in cascade 0, write to light texture

// --- Shared types ---

struct RadianceParams {
    // [scene_width, scene_height, cascade_index, cascade_count]
    scene_dims: vec4<f32>,
    // [probe_spacing, ray_count, interval_length, gi_intensity]
    cascade_params: vec4<f32>,
    // [camera_x, camera_y, viewport_w, viewport_h]
    camera: vec4<f32>,
    // [ambient_r, ambient_g, ambient_b, _pad]
    ambient: vec4<f32>,
};

@group(0) @binding(0) var<uniform> params: RadianceParams;

// Scene texture: rgba8unorm
//   RGB = emissive color (0 if non-emissive)
//   A = 1.0 if occluder, 0.0 if empty
@group(0) @binding(1) var scene_tex: texture_2d<f32>;

// Cascade texture: read (for merge pass, this is the upper cascade)
@group(0) @binding(2) var cascade_in: texture_2d<f32>;

// Output: storage texture (write)
@group(0) @binding(3) var cascade_out: texture_storage_2d<rgba16float, write>;

const PI: f32 = 3.14159265359;
const TAU: f32 = 6.28318530718;

// --- Ray-march pass ---
// Workgroup: 8x8 threads, each handles one ray of one probe.
// Dispatch: ceil(tex_width/8) x ceil(tex_height/8) x 1

@compute @workgroup_size(8, 8, 1)
fn ray_march(@builtin(global_invocation_id) gid: vec3<u32>) {
    let scene_w = u32(params.scene_dims.x);
    let scene_h = u32(params.scene_dims.y);
    let cascade_idx = u32(params.scene_dims.z);

    let probe_spacing = params.cascade_params.x;
    let base_ray_count = u32(params.cascade_params.y);

    // Cascade scaling: probes get 2x spacing, rays get 4x count per level
    let level_probe_spacing = probe_spacing * f32(1u << cascade_idx);
    let level_ray_count = base_ray_count * (1u << (2u * cascade_idx));

    // Output texture dimensions (same for all cascades due to memory layout)
    let out_dims = textureDimensions(cascade_out);
    if gid.x >= out_dims.x || gid.y >= out_dims.y {
        return;
    }

    // Determine probe grid dimensions for this cascade
    let probes_x = u32(ceil(f32(scene_w) / level_probe_spacing));
    let probes_y = u32(ceil(f32(scene_h) / level_probe_spacing));
    if probes_x == 0u || probes_y == 0u {
        textureStore(cascade_out, gid.xy, vec4<f32>(0.0));
        return;
    }

    // Number of rays per probe stored as a square block
    let rays_per_side = u32(ceil(sqrt(f32(level_ray_count))));
    if rays_per_side == 0u {
        textureStore(cascade_out, gid.xy, vec4<f32>(0.0));
        return;
    }

    // Map pixel (gid.x, gid.y) to (probe_index, ray_index)
    // Layout: probes arranged in a grid, each probe owns a rays_per_side x rays_per_side block
    let block_x = gid.x / rays_per_side;
    let block_y = gid.y / rays_per_side;
    let ray_local_x = gid.x % rays_per_side;
    let ray_local_y = gid.y % rays_per_side;

    if block_x >= probes_x || block_y >= probes_y {
        textureStore(cascade_out, gid.xy, vec4<f32>(0.0));
        return;
    }

    let ray_idx = ray_local_y * rays_per_side + ray_local_x;
    if ray_idx >= level_ray_count {
        textureStore(cascade_out, gid.xy, vec4<f32>(0.0));
        return;
    }

    // Probe center in scene-space
    let probe_x = (f32(block_x) + 0.5) * level_probe_spacing;
    let probe_y = (f32(block_y) + 0.5) * level_probe_spacing;

    // Ray angle
    let angle = (f32(ray_idx) + 0.5) / f32(level_ray_count) * TAU;
    let dir = vec2<f32>(cos(angle), sin(angle));

    // Ray interval: geometric progression per cascade
    let interval = params.cascade_params.z;
    let origin_dist = interval * (1.0 - pow(4.0, f32(cascade_idx))) / (1.0 - 4.0);
    let ray_length = interval * pow(4.0, f32(cascade_idx));

    // March the ray through the scene texture
    let steps = u32(max(ray_length, 1.0));
    var accumulated_color = vec3<f32>(0.0);
    var visibility = 1.0;

    for (var s = 0u; s < steps; s = s + 1u) {
        let t = origin_dist + f32(s) + 0.5;
        let sample_pos = vec2<f32>(probe_x, probe_y) + dir * t;

        // Bounds check
        let sx = i32(sample_pos.x);
        let sy = i32(sample_pos.y);
        if sx < 0 || sy < 0 || sx >= i32(scene_w) || sy >= i32(scene_h) {
            break;
        }

        let scene_sample = textureLoad(scene_tex, vec2<i32>(sx, sy), 0);
        let emissive = scene_sample.rgb;
        let is_occluder = scene_sample.a;

        // If we hit an emissive surface, accumulate its contribution
        if emissive.r > 0.0 || emissive.g > 0.0 || emissive.b > 0.0 {
            accumulated_color = accumulated_color + emissive * visibility;
        }

        // If we hit an occluder, block further light
        if is_occluder > 0.5 {
            visibility = 0.0;
            break;
        }
    }

    textureStore(cascade_out, gid.xy, vec4<f32>(accumulated_color, visibility));
}

// --- Merge pass ---
// Merges upper cascade (cascade_in) into lower cascade (cascade_out).
// For each ray in the lower cascade, find matching direction rays in the
// 4 nearest upper-cascade probes, interpolate, and combine.

@compute @workgroup_size(8, 8, 1)
fn merge_cascades(@builtin(global_invocation_id) gid: vec3<u32>) {
    let scene_w = u32(params.scene_dims.x);
    let scene_h = u32(params.scene_dims.y);
    let cascade_idx = u32(params.scene_dims.z); // current (lower) cascade

    let probe_spacing = params.cascade_params.x;
    let base_ray_count = u32(params.cascade_params.y);

    // Lower cascade parameters
    let lower_probe_spacing = probe_spacing * f32(1u << cascade_idx);
    let lower_ray_count = base_ray_count * (1u << (2u * cascade_idx));
    let lower_probes_x = u32(ceil(f32(scene_w) / lower_probe_spacing));
    let lower_probes_y = u32(ceil(f32(scene_h) / lower_probe_spacing));
    let lower_rays_per_side = u32(ceil(sqrt(f32(lower_ray_count))));

    // Upper cascade parameters
    let upper_cascade = cascade_idx + 1u;
    let upper_probe_spacing = probe_spacing * f32(1u << upper_cascade);
    let upper_ray_count = base_ray_count * (1u << (2u * upper_cascade));
    let upper_probes_x = u32(ceil(f32(scene_w) / upper_probe_spacing));
    let upper_probes_y = u32(ceil(f32(scene_h) / upper_probe_spacing));
    let upper_rays_per_side = u32(ceil(sqrt(f32(upper_ray_count))));

    let out_dims = textureDimensions(cascade_out);
    if gid.x >= out_dims.x || gid.y >= out_dims.y {
        return;
    }

    // Decode lower cascade pixel -> probe + ray
    let block_x = gid.x / lower_rays_per_side;
    let block_y = gid.y / lower_rays_per_side;
    let ray_local_x = gid.x % lower_rays_per_side;
    let ray_local_y = gid.y % lower_rays_per_side;

    if block_x >= lower_probes_x || block_y >= lower_probes_y {
        return; // keep existing value
    }

    let ray_idx = ray_local_y * lower_rays_per_side + ray_local_x;
    if ray_idx >= lower_ray_count {
        return;
    }

    // Read the current lower cascade value (from ray_march pass)
    let current = textureLoad(cascade_in, vec2<i32>(gid.xy), 0);
    let current_color = current.rgb;
    let current_vis = current.a;

    // If this ray was blocked (visibility=0), no upper cascade contribution
    if current_vis < 0.01 {
        textureStore(cascade_out, gid.xy, current);
        return;
    }

    // Lower probe position in scene space
    let probe_x = (f32(block_x) + 0.5) * lower_probe_spacing;
    let probe_y = (f32(block_y) + 0.5) * lower_probe_spacing;

    // Ray angle for this lower cascade ray
    let angle = (f32(ray_idx) + 0.5) / f32(lower_ray_count) * TAU;

    // Find the 4 nearest upper-cascade probes (bilinear)
    let upper_fx = probe_x / upper_probe_spacing - 0.5;
    let upper_fy = probe_y / upper_probe_spacing - 0.5;
    let ux0 = u32(max(floor(upper_fx), 0.0));
    let uy0 = u32(max(floor(upper_fy), 0.0));
    let ux1 = min(ux0 + 1u, upper_probes_x - 1u);
    let uy1 = min(uy0 + 1u, upper_probes_y - 1u);
    let fx = fract(upper_fx);
    let fy = fract(upper_fy);

    // Find the matching ray direction in the upper cascade
    // Upper has 4x rays, so 4 rays map to this direction
    let upper_ray_base = ray_idx * 4u;

    // Sample 4 upper cascade probes, averaging their matching-direction rays
    var upper_radiance = vec3<f32>(0.0);
    var upper_vis = 0.0;

    let probes = array<vec2<u32>, 4>(
        vec2<u32>(ux0, uy0),
        vec2<u32>(ux1, uy0),
        vec2<u32>(ux0, uy1),
        vec2<u32>(ux1, uy1),
    );
    let weights = array<f32, 4>(
        (1.0 - fx) * (1.0 - fy),
        fx * (1.0 - fy),
        (1.0 - fx) * fy,
        fx * fy,
    );

    for (var p = 0u; p < 4u; p = p + 1u) {
        let up_bx = probes[p].x;
        let up_by = probes[p].y;
        let w = weights[p];

        if up_bx >= upper_probes_x || up_by >= upper_probes_y {
            continue;
        }

        // Average the 4 matching upper rays
        var probe_rad = vec3<f32>(0.0);
        var probe_vis = 0.0;

        for (var r = 0u; r < 4u; r = r + 1u) {
            let upper_ray = upper_ray_base + r;
            if upper_ray >= upper_ray_count {
                break;
            }
            let ury = upper_ray / upper_rays_per_side;
            let urx = upper_ray % upper_rays_per_side;
            let px = i32(up_bx * upper_rays_per_side + urx);
            let py = i32(up_by * upper_rays_per_side + ury);

            let in_dims = textureDimensions(cascade_in);
            if u32(px) < in_dims.x && u32(py) < in_dims.y {
                let sample = textureLoad(cascade_in, vec2<i32>(px, py), 0);
                probe_rad = probe_rad + sample.rgb;
                probe_vis = probe_vis + sample.a;
            }
        }

        probe_rad = probe_rad / 4.0;
        probe_vis = probe_vis / 4.0;

        upper_radiance = upper_radiance + probe_rad * w;
        upper_vis = upper_vis + probe_vis * w;
    }

    // Combine: current ray's local contribution + upper cascade's far-field contribution
    let merged_color = current_color + upper_radiance * current_vis;
    let merged_vis = current_vis * upper_vis;

    textureStore(cascade_out, gid.xy, vec4<f32>(merged_color, merged_vis));
}

// --- Finalize pass ---
// Reads cascade 0 and produces the final light texture.
// For each output pixel, find the nearest probes in cascade 0,
// bilinearly interpolate summed ray radiance, write to light texture.
//
// cascade_out here is the final light texture (scene resolution).

@compute @workgroup_size(8, 8, 1)
fn finalize(@builtin(global_invocation_id) gid: vec3<u32>) {
    let scene_w = u32(params.scene_dims.x);
    let scene_h = u32(params.scene_dims.y);

    if gid.x >= scene_w || gid.y >= scene_h {
        return;
    }

    let probe_spacing = params.cascade_params.x;
    let base_ray_count = u32(params.cascade_params.y);
    let gi_intensity = params.cascade_params.w;

    // Cascade 0 parameters
    let probes_x = u32(ceil(f32(scene_w) / probe_spacing));
    let probes_y = u32(ceil(f32(scene_h) / probe_spacing));
    let rays_per_side = u32(ceil(sqrt(f32(base_ray_count))));

    // Current pixel position in scene space
    let px = f32(gid.x) + 0.5;
    let py = f32(gid.y) + 0.5;

    // Bilinear interpolation between 4 nearest probes
    let probe_fx = px / probe_spacing - 0.5;
    let probe_fy = py / probe_spacing - 0.5;
    let p0x = u32(max(floor(probe_fx), 0.0));
    let p0y = u32(max(floor(probe_fy), 0.0));
    let p1x = min(p0x + 1u, max(probes_x, 1u) - 1u);
    let p1y = min(p0y + 1u, max(probes_y, 1u) - 1u);
    let fx = fract(probe_fx);
    let fy = fract(probe_fy);

    let probes = array<vec2<u32>, 4>(
        vec2<u32>(p0x, p0y),
        vec2<u32>(p1x, p0y),
        vec2<u32>(p0x, p1y),
        vec2<u32>(p1x, p1y),
    );
    let weights = array<f32, 4>(
        (1.0 - fx) * (1.0 - fy),
        fx * (1.0 - fy),
        (1.0 - fx) * fy,
        fx * fy,
    );

    var total_radiance = vec3<f32>(0.0);

    for (var p = 0u; p < 4u; p = p + 1u) {
        let bx = probes[p].x;
        let by = probes[p].y;
        let w = weights[p];

        if bx >= probes_x || by >= probes_y {
            continue;
        }

        // Sum all rays of this probe
        var probe_sum = vec3<f32>(0.0);
        var valid_rays = 0u;

        for (var ry = 0u; ry < rays_per_side; ry = ry + 1u) {
            for (var rx = 0u; rx < rays_per_side; rx = rx + 1u) {
                let ray_idx = ry * rays_per_side + rx;
                if ray_idx >= base_ray_count {
                    break;
                }
                let tex_x = i32(bx * rays_per_side + rx);
                let tex_y = i32(by * rays_per_side + ry);
                let in_dims = textureDimensions(cascade_in);
                if u32(tex_x) < in_dims.x && u32(tex_y) < in_dims.y {
                    let sample = textureLoad(cascade_in, vec2<i32>(tex_x, tex_y), 0);
                    probe_sum = probe_sum + sample.rgb;
                    valid_rays = valid_rays + 1u;
                }
            }
        }

        if valid_rays > 0u {
            probe_sum = probe_sum / f32(valid_rays);
        }

        total_radiance = total_radiance + probe_sum * w;
    }

    // GI radiance only (ambient is handled by sprite shader)
    let final_color = total_radiance * gi_intensity;

    // Clamp to [0, 1]
    let clamped = clamp(final_color, vec3<f32>(0.0), vec3<f32>(1.0));

    textureStore(cascade_out, gid.xy, vec4<f32>(clamped, 1.0));
}
