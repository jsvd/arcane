/// SDF (Signed Distance Function) rendering pipeline.
///
/// Compiles SDF shape expressions + fill modes into standalone WGSL shaders,
/// caches the resulting GPU pipelines keyed by (expression, fill) hash, and
/// renders SDF entities as instanced screen-aligned quads.
///
/// ## How it works
///
/// 1. TypeScript calls `drawSdf(expr, fill, x, y, bounds, ...)` which queues
///    an `SdfCommand`.
/// 2. Before rendering, each unique (sdf_expr, fill) pair is compiled into a
///    complete WGSL shader via `generate_sdf_shader`. The shader includes:
///    - A library of SDF primitive functions (`sd_circle`, `sd_box`, etc.)
///    - Composition operations (`op_union`, `op_subtract`, etc.)
///    - A vertex stage that transforms instanced quads through the camera
///    - A fragment stage that evaluates the SDF expression, applies the fill,
///      and anti-aliases shape edges via smoothstep.
/// 3. The compiled pipeline is cached in a `HashMap<u64, wgpu::RenderPipeline>`
///    so repeated frames with the same shapes skip recompilation.
/// 4. Commands are sorted by layer, then batched by pipeline key. Each batch
///    uploads per-instance data and issues a single instanced draw call.
///
/// ## Bind groups
///
/// - Group 0, binding 0: Camera uniform (`mat4x4<f32>` view-projection).
///   Same layout as the sprite pipeline, so the camera bind group can be shared.
/// - Group 1, binding 0: Time uniform (`f32`) for animated SDF effects.
///
/// ## Per-instance vertex data (step_mode = Instance)
///
/// | Field    | Format      | Description                              |
/// |----------|-------------|------------------------------------------|
/// | position | Float32x2   | World-space center of the quad            |
/// | bounds   | Float32     | Half-size of the quad in world units      |
/// | rotation | Float32     | Rotation in radians                       |
/// | scale    | Float32     | Uniform scale multiplier                  |
/// | opacity  | Float32     | Alpha multiplier (0..1)                   |
/// | _pad     | Float32x2   | Padding for alignment                     |
/// | color    | Float32x4   | Primary color from fill (passed to shader)|

use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};

use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

use super::gpu::GpuContext;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// How to color an SDF shape.
#[derive(Debug, Clone, PartialEq)]
pub enum SdfFill {
    /// Flat color inside the shape.
    Solid { color: [f32; 4] },
    /// Stroke along the zero-isoline only.
    Outline { color: [f32; 4], thickness: f32 },
    /// Filled interior with a differently-colored stroke.
    SolidWithOutline { fill: [f32; 4], outline: [f32; 4], thickness: f32 },
    /// Linear gradient mapped through a rotation angle (radians).
    /// Scale > 1.0 makes the gradient span a smaller region (tighter fit to shape).
    Gradient { from: [f32; 4], to: [f32; 4], angle: f32, scale: f32 },
    /// Exponential glow falloff outside the shape.
    Glow { color: [f32; 4], intensity: f32 },
    /// Cosine palette: `a + b * cos(2pi * (c * t + d))` where `t` = distance.
    CosinePalette { a: [f32; 3], b: [f32; 3], c: [f32; 3], d: [f32; 3] },
}

/// A queued SDF draw command (parallels `SpriteCommand` for the sprite pipeline).
#[derive(Debug, Clone)]
pub struct SdfCommand {
    /// The SDF expression string (WGSL code that evaluates to `f32` given `p: vec2<f32>`).
    pub sdf_expr: String,
    /// How to fill/color the shape.
    pub fill: SdfFill,
    /// World-space X center of the rendering quad.
    pub x: f32,
    /// World-space Y center of the rendering quad.
    pub y: f32,
    /// Half-size of the rendering quad in world units.
    pub bounds: f32,
    /// Render layer (for sorting with sprites and geometry).
    pub layer: i32,
    /// Rotation in radians.
    pub rotation: f32,
    /// Uniform scale.
    pub scale: f32,
    /// Opacity (0..1).
    pub opacity: f32,
}

// ---------------------------------------------------------------------------
// GPU data layouts
// ---------------------------------------------------------------------------

/// Per-vertex data for the unit quad (centered at origin, spans -1..1).
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct SdfQuadVertex {
    position: [f32; 2],
    uv: [f32; 2],
}

/// Quad vertices: centered unit quad from (-1,-1) to (1,1).
/// UV maps from (0,0) top-left to (1,1) bottom-right.
const SDF_QUAD_VERTICES: &[SdfQuadVertex] = &[
    SdfQuadVertex { position: [-1.0, -1.0], uv: [0.0, 0.0] },
    SdfQuadVertex { position: [ 1.0, -1.0], uv: [1.0, 0.0] },
    SdfQuadVertex { position: [ 1.0,  1.0], uv: [1.0, 1.0] },
    SdfQuadVertex { position: [-1.0,  1.0], uv: [0.0, 1.0] },
];

const SDF_QUAD_INDICES: &[u16] = &[0, 1, 2, 0, 2, 3];

/// Per-instance data uploaded to the GPU for each SDF entity.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
struct SdfInstance {
    /// World-space center position.
    position: [f32; 2],
    /// Half-extent of the quad in world units.
    bounds: f32,
    /// Rotation in radians.
    rotation: f32,
    /// Uniform scale multiplier.
    scale: f32,
    /// Alpha multiplier.
    opacity: f32,
    /// Padding for 16-byte alignment before color vec4.
    _pad: [f32; 2],
    /// Primary color from the fill (interpretation varies by fill type).
    color: [f32; 4],
}

// ---------------------------------------------------------------------------
// Pipeline cache key
// ---------------------------------------------------------------------------

/// Compute a deterministic hash from the SDF expression and fill parameters.
/// Used to key the pipeline cache so identical (expr, fill) pairs share a pipeline.
pub fn compute_pipeline_key(sdf_expr: &str, fill: &SdfFill) -> u64 {
    let mut hasher = DefaultHasher::new();
    sdf_expr.hash(&mut hasher);
    compute_fill_hash_into(fill, &mut hasher);
    hasher.finish()
}

/// Compute a hash of the fill parameters alone.
pub fn compute_fill_hash(fill: &SdfFill) -> u64 {
    let mut hasher = DefaultHasher::new();
    compute_fill_hash_into(fill, &mut hasher);
    hasher.finish()
}

/// Hash the fill discriminant and payload into the given hasher.
fn compute_fill_hash_into(fill: &SdfFill, hasher: &mut DefaultHasher) {
    // Hash discriminant
    std::mem::discriminant(fill).hash(hasher);
    // Hash payload (convert f32 to bits for deterministic hashing)
    match fill {
        SdfFill::Solid { color } => {
            hash_f32_array(color, hasher);
        }
        SdfFill::Outline { color, thickness } => {
            hash_f32_array(color, hasher);
            thickness.to_bits().hash(hasher);
        }
        SdfFill::SolidWithOutline { fill, outline, thickness } => {
            hash_f32_array(fill, hasher);
            hash_f32_array(outline, hasher);
            thickness.to_bits().hash(hasher);
        }
        SdfFill::Gradient { from, to, angle, scale } => {
            hash_f32_array(from, hasher);
            hash_f32_array(to, hasher);
            angle.to_bits().hash(hasher);
            scale.to_bits().hash(hasher);
        }
        SdfFill::Glow { color, intensity } => {
            hash_f32_array(color, hasher);
            intensity.to_bits().hash(hasher);
        }
        SdfFill::CosinePalette { a, b, c, d } => {
            hash_f32_array(a, hasher);
            hash_f32_array(b, hasher);
            hash_f32_array(c, hasher);
            hash_f32_array(d, hasher);
        }
    }
}

fn hash_f32_array(arr: &[f32], hasher: &mut DefaultHasher) {
    for v in arr {
        v.to_bits().hash(hasher);
    }
}

// ---------------------------------------------------------------------------
// WGSL shader generation
// ---------------------------------------------------------------------------

/// SDF primitive functions included in every generated shader.
/// WGSL has no `#import`, so these are inlined. The compiler strips unused functions.
const SDF_PRIMITIVES_WGSL: &str = r#"
// ---- SDF Primitives ----

fn sd_circle(p: vec2<f32>, r: f32) -> f32 {
    return length(p) - r;
}

fn sd_box(p: vec2<f32>, b: vec2<f32>) -> f32 {
    let d = abs(p) - b;
    return length(max(d, vec2<f32>(0.0))) + min(max(d.x, d.y), 0.0);
}

fn sd_rounded_box(p: vec2<f32>, b: vec2<f32>, r: vec4<f32>) -> f32 {
    // r.x = top-left, r.y = top-right, r.z = bottom-right, r.w = bottom-left
    var radius = r.x;
    if (p.x > 0.0 && p.y > 0.0) { radius = r.y; }  // top-right
    else if (p.x > 0.0 && p.y < 0.0) { radius = r.z; }  // bottom-right
    else if (p.x < 0.0 && p.y < 0.0) { radius = r.w; }  // bottom-left
    let q = abs(p) - b + vec2<f32>(radius);
    return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - radius;
}

fn sd_segment(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

fn sd_capsule(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
    return sd_segment(p, a, b) - r;
}

fn sd_equilateral_triangle(p_in: vec2<f32>, r: f32) -> f32 {
    let k = sqrt(3.0);
    var p = p_in;
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) {
        p = vec2<f32>(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    }
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

fn sd_ring(p: vec2<f32>, r: f32, thickness: f32) -> f32 {
    return abs(length(p) - r) - thickness;
}

fn sd_ellipse(p: vec2<f32>, ab: vec2<f32>) -> f32 {
    // Approximate ellipse SDF via scaling
    let scaled = p / ab;
    let d = length(scaled) - 1.0;
    return d * min(ab.x, ab.y);
}

fn sd_hexagon(p_in: vec2<f32>, r: f32) -> f32 {
    let k = vec3<f32>(-0.866025404, 0.5, 0.577350269);
    var p = abs(p_in);
    p = p - 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p = p - vec2<f32>(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}

fn sd_star5(p_in: vec2<f32>, r: f32, rf: f32) -> f32 {
    let k1 = vec2<f32>(0.809016994, -0.587785252);
    let k2 = vec2<f32>(-k1.x, k1.y);
    var p = vec2<f32>(abs(p_in.x), p_in.y);
    p = p - 2.0 * max(dot(k1, p), 0.0) * k1;
    p = p - 2.0 * max(dot(k2, p), 0.0) * k2;
    p = vec2<f32>(abs(p.x), p.y - r);
    let ba = rf * vec2<f32>(-k1.y, k1.x) - vec2<f32>(0.0, 1.0);
    let h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
    return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

fn sd_cross(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
    var pp = abs(p);
    if (pp.y > pp.x) { pp = pp.yx; }
    let q = pp - b;
    let k = max(q.y, q.x);
    let w = select(vec2<f32>(b.y - pp.x, -k), q, k > 0.0);
    return sign(k) * length(max(w, vec2<f32>(0.0))) + r;
}

fn sd_triangle(p: vec2<f32>, p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>) -> f32 {
    let e0 = p1 - p0;
    let e1 = p2 - p1;
    let e2 = p0 - p2;
    let v0 = p - p0;
    let v1 = p - p1;
    let v2 = p - p2;
    let pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    let pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    let pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    let s = sign(e0.x * e2.y - e0.y * e2.x);
    let d0 = vec2<f32>(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x));
    let d1 = vec2<f32>(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x));
    let d2 = vec2<f32>(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x));
    let d = min(min(d0, d1), d2);
    return -sqrt(d.x) * sign(d.y);
}

fn sd_egg(p_in: vec2<f32>, ra: f32, rb: f32) -> f32 {
    // Egg shape: ra is the main radius, rb is the bulge factor
    let k = sqrt(3.0);
    var p = vec2<f32>(abs(p_in.x), -p_in.y);  // flip Y for our coordinate system
    let r = ra - rb;
    if (p.y < 0.0) {
        return length(p) - r - rb;
    } else if (k * (p.x + r) < p.y) {
        return length(vec2<f32>(p.x, p.y - k * r)) - rb;
    } else {
        return length(vec2<f32>(p.x + r, p.y)) - 2.0 * r - rb;
    }
}

fn sd_heart(p_in: vec2<f32>, size: f32) -> f32 {
    // Normalize to unit heart, flip Y so point is at bottom
    var p = vec2<f32>(abs(p_in.x), p_in.y) / size;
    // IQ's heart SDF (modified for our coordinate system)
    if (p.y + p.x > 1.0) {
        return (sqrt(dot(p - vec2<f32>(0.25, 0.75), p - vec2<f32>(0.25, 0.75))) - sqrt(2.0) / 4.0) * size;
    }
    return sqrt(min(
        dot(p - vec2<f32>(0.0, 1.0), p - vec2<f32>(0.0, 1.0)),
        dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
    )) * sign(p.x - p.y) * size;
}

fn sd_moon(p_in: vec2<f32>, d: f32, ra: f32, rb: f32) -> f32 {
    var p = vec2<f32>(p_in.x, abs(p_in.y));
    let a = (ra * ra - rb * rb + d * d) / (2.0 * d);
    let b = sqrt(max(ra * ra - a * a, 0.0));
    if (d * (p.x * b - p.y * a) > d * d * max(b - p.y, 0.0)) {
        return length(p - vec2<f32>(a, b));
    }
    return max(length(p) - ra, -(length(p - vec2<f32>(d, 0.0)) - rb));
}

fn sd_pentagon(p_in: vec2<f32>, r: f32) -> f32 {
    // Regular pentagon SDF
    let k = vec3<f32>(0.809016994, 0.587785252, 0.726542528);
    var p = vec2<f32>(abs(p_in.x), -p_in.y);  // flip Y for our coordinate system
    p = p - 2.0 * min(dot(vec2<f32>(-k.x, k.y), p), 0.0) * vec2<f32>(-k.x, k.y);
    p = p - 2.0 * min(dot(vec2<f32>(k.x, k.y), p), 0.0) * vec2<f32>(k.x, k.y);
    p = p - vec2<f32>(clamp(p.x, -r * k.z, r * k.z), r);
    return length(p) * sign(p.y);
}

fn sd_star(p_in: vec2<f32>, r: f32, n: f32, inner_ratio: f32) -> f32 {
    // n-pointed star with inner radius = r * inner_ratio
    // Based on IQ's approach but with inner_ratio parameter
    let pi = 3.141592653;
    let an = pi / n;  // half angle between points

    // Map to first sector using polar coordinates
    let angle = atan2(p_in.y, p_in.x);
    // Use fract-based modulo for correct handling of negative angles
    let sector = (angle / (2.0 * an));
    let sector_fract = sector - floor(sector);
    let bn = sector_fract * 2.0 * an - an;

    // Transform point to first sector
    let radius = length(p_in);
    var p = vec2<f32>(radius * cos(bn), abs(radius * sin(bn)));

    // Outer tip at (r, 0), inner valley at angle an
    let inner_r = r * inner_ratio;

    // Vector from outer tip to inner valley
    let tip = vec2<f32>(r, 0.0);
    let valley = vec2<f32>(inner_r * cos(an), inner_r * sin(an));

    // Distance to the edge line segment
    p = p - tip;
    let edge = valley - tip;
    let h = clamp(dot(p, edge) / dot(edge, edge), 0.0, 1.0);
    p = p - edge * h;

    // Sign: negative inside, positive outside
    // p.x < 0 means we're past the edge toward center (inside)
    return length(p) * sign(p.x);
}

// ---- Transform Operations ----

fn rotate_rad(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

fn op_symmetry_x(p: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(abs(p.x), p.y);
}

// ---- Composition Operations ----

fn op_union(d1: f32, d2: f32) -> f32 {
    return min(d1, d2);
}

fn op_subtract(d1: f32, d2: f32) -> f32 {
    return max(d1, -d2);
}

fn op_intersect(d1: f32, d2: f32) -> f32 {
    return max(d1, d2);
}

fn op_smooth_union(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

fn op_smooth_subtract(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 - 0.5 * (d1 + d2) / k, 0.0, 1.0);
    return mix(d1, -d2, h) + k * h * (1.0 - h);
}

fn op_smooth_intersect(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) + k * h * (1.0 - h);
}

fn op_round(d: f32, r: f32) -> f32 {
    return d - r;
}

fn op_annular(d: f32, r: f32) -> f32 {
    return abs(d) - r;
}

fn op_repeat(p: vec2<f32>, spacing: vec2<f32>) -> vec2<f32> {
    return p - spacing * round(p / spacing);
}

fn op_translate(p: vec2<f32>, offset: vec2<f32>) -> vec2<f32> {
    return p - offset;
}

fn op_rotate(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(p.x * c + p.y * s, -p.x * s + p.y * c);
}

fn op_scale(p: vec2<f32>, s: f32) -> vec2<f32> {
    return p / s;
}
"#;

/// Generate the WGSL code for the fill logic in the fragment shader.
///
/// The generated code expects these variables to be in scope:
/// - `d: f32` — the SDF distance value
/// - `p: vec2<f32>` — the local-space coordinate
/// - `in_bounds: f32` — the instance bounds value
/// - `in_opacity: f32` — the instance opacity
/// - `in_color: vec4<f32>` — the primary color from the instance
///
/// The code must assign to `var out_color: vec4<f32>`.
pub fn generate_fill_wgsl(fill: &SdfFill) -> String {
    match fill {
        SdfFill::Solid { color } => {
            format!(
                r#"    // Solid fill with adaptive AA (fwidth-based)
    let fill_color = vec4<f32>({:.6}, {:.6}, {:.6}, {:.6});
    let aa_width = fwidth(d) * 0.5;
    let aa = 1.0 - smoothstep(-aa_width, aa_width, d);
    out_color = vec4<f32>(fill_color.rgb, fill_color.a * aa * in_opacity);"#,
                color[0], color[1], color[2], color[3]
            )
        }
        SdfFill::Outline { color, thickness } => {
            format!(
                r#"    // Outline fill with adaptive AA (fwidth-based)
    let outline_color = vec4<f32>({:.6}, {:.6}, {:.6}, {:.6});
    let half_t = {:.6};
    let aa_width = fwidth(d) * 0.5;
    let aa_outer = 1.0 - smoothstep(-aa_width, aa_width, abs(d) - half_t);
    out_color = vec4<f32>(outline_color.rgb, outline_color.a * aa_outer * in_opacity);"#,
                color[0], color[1], color[2], color[3], thickness
            )
        }
        SdfFill::SolidWithOutline { fill, outline, thickness } => {
            format!(
                r#"    // Solid + outline fill with adaptive AA (fwidth-based)
    let fill_color = vec4<f32>({:.6}, {:.6}, {:.6}, {:.6});
    let outline_color = vec4<f32>({:.6}, {:.6}, {:.6}, {:.6});
    let outline_t = {:.6};
    let aa_width = fwidth(d) * 0.5;
    let aa_fill = 1.0 - smoothstep(-aa_width, aa_width, d);
    let aa_outline = 1.0 - smoothstep(-aa_width, aa_width, abs(d) - outline_t);
    // Inside the shape: fill color. On the edge: outline color.
    let is_inside = smoothstep(aa_width, -aa_width, d + outline_t);
    let base = mix(outline_color, fill_color, is_inside);
    let alpha = max(aa_fill, aa_outline);
    out_color = vec4<f32>(base.rgb, base.a * alpha * in_opacity);"#,
                fill[0], fill[1], fill[2], fill[3],
                outline[0], outline[1], outline[2], outline[3],
                thickness
            )
        }
        SdfFill::Gradient { from, to, angle, scale } => {
            format!(
                r#"    // Gradient fill with adaptive AA (fwidth-based)
    let grad_from = vec4<f32>({:.6}, {:.6}, {:.6}, {:.6});
    let grad_to = vec4<f32>({:.6}, {:.6}, {:.6}, {:.6});
    let grad_angle = {:.6};
    let grad_scale = {:.6};
    let grad_dir = vec2<f32>(cos(grad_angle), sin(grad_angle));
    // Map local-space p through the gradient direction, normalized to 0..1
    // Scale > 1 makes the gradient span a smaller region (tighter fit to shape)
    let grad_t = clamp(dot(p / in_bounds, grad_dir) * grad_scale * 0.5 + 0.5, 0.0, 1.0);
    let grad_color = mix(grad_from, grad_to, grad_t);
    let aa_width = fwidth(d) * 0.5;
    let aa = 1.0 - smoothstep(-aa_width, aa_width, d);
    out_color = vec4<f32>(grad_color.rgb, grad_color.a * aa * in_opacity);"#,
                from[0], from[1], from[2], from[3],
                to[0], to[1], to[2], to[3],
                angle,
                scale
            )
        }
        SdfFill::Glow { color, intensity } => {
            format!(
                r#"    // Glow fill
    let glow_color = vec4<f32>({:.6}, {:.6}, {:.6}, {:.6});
    let glow_intensity = {:.6};
    // Exponential falloff outside the shape; full brightness inside
    let glow = exp(-max(d, 0.0) * glow_intensity);
    out_color = vec4<f32>(glow_color.rgb, glow_color.a * glow * in_opacity);"#,
                color[0], color[1], color[2], color[3],
                intensity
            )
        }
        SdfFill::CosinePalette { a, b, c, d: d_param } => {
            format!(
                r#"    // Cosine palette fill with adaptive AA (fwidth-based)
    let pal_a = vec3<f32>({:.6}, {:.6}, {:.6});
    let pal_b = vec3<f32>({:.6}, {:.6}, {:.6});
    let pal_c = vec3<f32>({:.6}, {:.6}, {:.6});
    let pal_d = vec3<f32>({:.6}, {:.6}, {:.6});
    // t derived from distance, normalized by bounds
    let pal_t = d / in_bounds;
    let pal_color = pal_a + pal_b * cos(6.283185 * (pal_c * pal_t + pal_d));
    let aa_width = fwidth(d) * 0.5;
    let aa = 1.0 - smoothstep(-aa_width, aa_width, d);
    out_color = vec4<f32>(clamp(pal_color, vec3<f32>(0.0), vec3<f32>(1.0)), aa * in_opacity);"#,
                a[0], a[1], a[2],
                b[0], b[1], b[2],
                c[0], c[1], c[2],
                d_param[0], d_param[1], d_param[2]
            )
        }
    }
}

/// Generate a complete, self-contained WGSL shader module for the given SDF
/// expression and fill mode.
///
/// The output can be compiled directly by `wgpu::Device::create_shader_module`.
///
/// # Arguments
///
/// * `sdf_expr` - A WGSL expression that evaluates to `f32` given a variable
///   `p: vec2<f32>` in local space (coordinates range roughly -bounds..bounds).
///   Example: `"sd_circle(p, 50.0)"`
/// * `fill` - Determines how the distance field is colored.
pub fn generate_sdf_shader(sdf_expr: &str, fill: &SdfFill) -> String {
    let fill_code = generate_fill_wgsl(fill);

    format!(
        r#"// Auto-generated SDF shader
// Expression: {sdf_expr}

{SDF_PRIMITIVES_WGSL}

// ---- Bindings ----

struct CameraUniform {{
    view_proj: mat4x4<f32>,
}};

@group(0) @binding(0)
var<uniform> camera: CameraUniform;

struct TimeUniform {{
    time: f32,
}};

@group(1) @binding(0)
var<uniform> time_data: TimeUniform;

// ---- Vertex stage ----

struct VertexInput {{
    @location(0) position: vec2<f32>,
    @location(1) uv: vec2<f32>,
}};

struct InstanceInput {{
    @location(2) inst_position: vec2<f32>,
    @location(3) inst_bounds: f32,
    @location(4) inst_rotation: f32,
    @location(5) inst_scale: f32,
    @location(6) inst_opacity: f32,
    @location(7) inst_pad: vec2<f32>,
    @location(8) inst_color: vec4<f32>,
}};

struct VertexOutput {{
    @builtin(position) clip_position: vec4<f32>,
    @location(0) local_pos: vec2<f32>,
    @location(1) v_opacity: f32,
    @location(2) v_bounds: f32,
    @location(3) v_color: vec4<f32>,
    @location(4) v_scale: f32,
}};

@vertex
fn vs_main(vertex: VertexInput, instance: InstanceInput) -> VertexOutput {{
    var out: VertexOutput;

    let scaled_bounds = instance.inst_bounds * instance.inst_scale;

    // Quad vertex in local space: vertex.position is in [-1, 1]
    // Scale the quad for visual scaling
    var pos = vertex.position * scaled_bounds;

    // Apply instance rotation around center
    let cos_r = cos(instance.inst_rotation);
    let sin_r = sin(instance.inst_rotation);
    let rotated = vec2<f32>(
        pos.x * cos_r - pos.y * sin_r,
        pos.x * sin_r + pos.y * cos_r,
    );

    // Translate to world position
    let world_xy = rotated + instance.inst_position;
    let world = vec4<f32>(world_xy.x, world_xy.y, 0.0, 1.0);
    out.clip_position = camera.view_proj * world;

    // Pass local-space coordinate to fragment WITHOUT scale
    // This ensures SDF is evaluated in original coordinate space
    // Flip Y to match Arcane's screen coordinate system (Y=0 at top, Y increases down)
    out.local_pos = vec2<f32>(vertex.position.x, -vertex.position.y) * instance.inst_bounds;
    out.v_opacity = instance.inst_opacity;
    out.v_bounds = instance.inst_bounds;
    out.v_scale = instance.inst_scale;
    out.v_color = instance.inst_color;

    return out;
}}

// ---- Fragment stage ----

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {{
    let p = in.local_pos;
    let in_bounds = in.v_bounds;
    let in_opacity = in.v_opacity;
    let in_color = in.v_color;
    let in_scale = in.v_scale;
    let time = time_data.time;

    // Evaluate the SDF expression, then scale the distance for proper anti-aliasing
    let d = {sdf_expr} * in_scale;

    // Apply fill
    var out_color: vec4<f32>;
{fill_code}

    return out_color;
}}
"#,
        sdf_expr = sdf_expr,
        SDF_PRIMITIVES_WGSL = SDF_PRIMITIVES_WGSL,
        fill_code = fill_code,
    )
}

// ---------------------------------------------------------------------------
// SDF pipeline store
// ---------------------------------------------------------------------------

/// Camera uniform buffer data (matches sprite pipeline).
#[repr(C)]
#[derive(Copy, Clone, bytemuck::Pod, bytemuck::Zeroable)]
struct CameraUniform {
    view_proj: [f32; 16],
}

/// Manages cached SDF pipelines and renders SDF commands.
pub struct SdfPipelineStore {
    /// Cached render pipelines keyed by `compute_pipeline_key(expr, fill)`.
    pipelines: HashMap<u64, wgpu::RenderPipeline>,
    /// Shared pipeline layout (all SDF pipelines use the same bind group layout).
    pipeline_layout: wgpu::PipelineLayout,
    /// Camera bind group layout (group 0).
    #[allow(dead_code)]
    camera_bind_group_layout: wgpu::BindGroupLayout,
    /// Camera uniform buffer.
    camera_buffer: wgpu::Buffer,
    /// Camera bind group.
    camera_bind_group: wgpu::BindGroup,
    /// Time uniform bind group layout (group 1).
    /// Retained so the layout stays alive for the pipeline layout's internal reference.
    #[allow(dead_code)]
    time_bind_group_layout: wgpu::BindGroupLayout,
    /// Time uniform buffer.
    time_buffer: wgpu::Buffer,
    /// Time uniform bind group.
    time_bind_group: wgpu::BindGroup,
    /// Static quad vertex buffer (shared across all SDF draws).
    vertex_buffer: wgpu::Buffer,
    /// Static quad index buffer.
    index_buffer: wgpu::Buffer,
    /// Surface texture format (needed when creating new pipelines).
    surface_format: wgpu::TextureFormat,
}

impl SdfPipelineStore {
    /// Create a new SDF pipeline store.
    pub fn new(gpu: &GpuContext) -> Self {
        Self::new_internal(&gpu.device, gpu.config.format)
    }

    /// Create for headless testing (no surface required).
    pub fn new_headless(device: &wgpu::Device, format: wgpu::TextureFormat) -> Self {
        Self::new_internal(device, format)
    }

    fn new_internal(device: &wgpu::Device, surface_format: wgpu::TextureFormat) -> Self {
        // Camera uniform bind group layout (group 0)
        let camera_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("sdf_camera_bgl"),
                entries: &[wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                }],
            });

        // Time uniform bind group layout (group 1)
        let time_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("sdf_time_bgl"),
                entries: &[wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                }],
            });

        let pipeline_layout =
            device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                label: Some("sdf_pipeline_layout"),
                bind_group_layouts: &[&camera_bind_group_layout, &time_bind_group_layout],
                push_constant_ranges: &[],
            });

        // Time uniform buffer (single f32, padded to 4 bytes minimum)
        let time_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sdf_time_buffer"),
            contents: bytemuck::cast_slice(&[0.0f32]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let time_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("sdf_time_bind_group"),
            layout: &time_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: time_buffer.as_entire_binding(),
            }],
        });

        // Camera uniform buffer
        let camera_uniform = CameraUniform {
            view_proj: [
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ],
        };
        let camera_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sdf_camera_buffer"),
            contents: bytemuck::cast_slice(&[camera_uniform]),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        let camera_bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("sdf_camera_bind_group"),
            layout: &camera_bind_group_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera_buffer.as_entire_binding(),
            }],
        });

        // Static quad geometry
        let vertex_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sdf_quad_vertex_buffer"),
            contents: bytemuck::cast_slice(SDF_QUAD_VERTICES),
            usage: wgpu::BufferUsages::VERTEX,
        });

        let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("sdf_quad_index_buffer"),
            contents: bytemuck::cast_slice(SDF_QUAD_INDICES),
            usage: wgpu::BufferUsages::INDEX,
        });

        Self {
            pipelines: HashMap::new(),
            pipeline_layout,
            camera_bind_group_layout,
            camera_buffer,
            camera_bind_group,
            time_bind_group_layout,
            time_buffer,
            time_bind_group,
            vertex_buffer,
            index_buffer,
            surface_format,
        }
    }

    /// Update the camera and time uniforms. Call once per frame before rendering.
    pub fn prepare(&self, queue: &wgpu::Queue, camera: &super::Camera2D, time: f32) {
        let camera_uniform = CameraUniform {
            view_proj: camera.view_proj(),
        };
        queue.write_buffer(
            &self.camera_buffer,
            0,
            bytemuck::cast_slice(&[camera_uniform]),
        );
        queue.write_buffer(&self.time_buffer, 0, bytemuck::cast_slice(&[time]));
    }

    /// Update the time uniform. Call once per frame before rendering.
    pub fn set_time(&self, queue: &wgpu::Queue, time: f32) {
        queue.write_buffer(&self.time_buffer, 0, bytemuck::cast_slice(&[time]));
    }

    /// Get or create the render pipeline for the given SDF expression + fill.
    /// Returns a reference to the cached pipeline.
    pub fn get_or_create_pipeline(
        &mut self,
        device: &wgpu::Device,
        sdf_expr: &str,
        fill: &SdfFill,
    ) -> u64 {
        let key = compute_pipeline_key(sdf_expr, fill);
        if self.pipelines.contains_key(&key) {
            return key;
        }

        let wgsl = generate_sdf_shader(sdf_expr, fill);
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("sdf_shader"),
            source: wgpu::ShaderSource::Wgsl(wgsl.into()),
        });

        // Vertex buffer layout: per-vertex quad data
        let vertex_layout = wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<SdfQuadVertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 0,
                    format: wgpu::VertexFormat::Float32x2, // position
                },
                wgpu::VertexAttribute {
                    offset: 8,
                    shader_location: 1,
                    format: wgpu::VertexFormat::Float32x2, // uv
                },
            ],
        };

        // Instance buffer layout: per-instance SDF entity data
        let instance_layout = wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<SdfInstance>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &[
                wgpu::VertexAttribute {
                    offset: 0,
                    shader_location: 2,
                    format: wgpu::VertexFormat::Float32x2, // position
                },
                wgpu::VertexAttribute {
                    offset: 8,
                    shader_location: 3,
                    format: wgpu::VertexFormat::Float32, // bounds
                },
                wgpu::VertexAttribute {
                    offset: 12,
                    shader_location: 4,
                    format: wgpu::VertexFormat::Float32, // rotation
                },
                wgpu::VertexAttribute {
                    offset: 16,
                    shader_location: 5,
                    format: wgpu::VertexFormat::Float32, // scale
                },
                wgpu::VertexAttribute {
                    offset: 20,
                    shader_location: 6,
                    format: wgpu::VertexFormat::Float32, // opacity
                },
                wgpu::VertexAttribute {
                    offset: 24,
                    shader_location: 7,
                    format: wgpu::VertexFormat::Float32x2, // _pad
                },
                wgpu::VertexAttribute {
                    offset: 32,
                    shader_location: 8,
                    format: wgpu::VertexFormat::Float32x4, // color
                },
            ],
        };

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("sdf_render_pipeline"),
            layout: Some(&self.pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: Some("vs_main"),
                buffers: &[vertex_layout, instance_layout],
                compilation_options: Default::default(),
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: Some("fs_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: self.surface_format,
                    blend: Some(wgpu::BlendState::ALPHA_BLENDING),
                    write_mask: wgpu::ColorWrites::ALL,
                })],
                compilation_options: Default::default(),
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None,
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState::default(),
            multiview: None,
            cache: None,
        });

        self.pipelines.insert(key, pipeline);
        key
    }

    /// Return the camera bind group layout for sharing with the sprite pipeline.
    pub fn camera_bind_group_layout(&self) -> &wgpu::BindGroupLayout {
        &self.camera_bind_group_layout
    }

    /// Render a sorted slice of SDF commands.
    ///
    /// Commands should be pre-sorted by layer. Within each pipeline key, instances
    /// are batched into a single instanced draw call.
    ///
    /// Call `prepare()` once per frame before calling `render()`.
    /// `clear_color`: `Some(color)` -> `LoadOp::Clear`, `None` -> `LoadOp::Load`.
    pub fn render(
        &mut self,
        device: &wgpu::Device,
        encoder: &mut wgpu::CommandEncoder,
        target: &wgpu::TextureView,
        commands: &[SdfCommand],
        clear_color: Option<wgpu::Color>,
    ) {
        if commands.is_empty() {
            return;
        }

        // Ensure all pipelines are compiled
        for cmd in commands {
            self.get_or_create_pipeline(device, &cmd.sdf_expr, &cmd.fill);
        }

        let load_op = match clear_color {
            Some(color) => wgpu::LoadOp::Clear(color),
            None => wgpu::LoadOp::Load,
        };

        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("sdf_render_pass"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: target,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: load_op,
                    store: wgpu::StoreOp::Store,
                },
            })],
            depth_stencil_attachment: None,
            timestamp_writes: None,
            occlusion_query_set: None,
        });

        render_pass.set_bind_group(0, &self.camera_bind_group, &[]);
        render_pass.set_bind_group(1, &self.time_bind_group, &[]);
        render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
        render_pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint16);

        // Batch commands by pipeline key (commands are pre-sorted by layer;
        // within the same key, gather all instances for one draw call).
        let mut i = 0;
        while i < commands.len() {
            let key = compute_pipeline_key(&commands[i].sdf_expr, &commands[i].fill);
            let batch_start = i;

            // Gather contiguous commands with the same pipeline key
            while i < commands.len()
                && compute_pipeline_key(&commands[i].sdf_expr, &commands[i].fill) == key
            {
                i += 1;
            }

            let batch = &commands[batch_start..i];
            let pipeline = match self.pipelines.get(&key) {
                Some(p) => p,
                None => continue, // should not happen after ensure step
            };

            // Build instance data for this batch
            let instances: Vec<SdfInstance> = batch
                .iter()
                .map(|cmd| {
                    let primary_color = primary_color_from_fill(&cmd.fill);
                    SdfInstance {
                        position: [cmd.x, cmd.y],
                        bounds: cmd.bounds,
                        rotation: cmd.rotation,
                        scale: cmd.scale,
                        opacity: cmd.opacity,
                        _pad: [0.0; 2],
                        color: primary_color,
                    }
                })
                .collect();

            let instance_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: Some("sdf_instance_buffer"),
                contents: bytemuck::cast_slice(&instances),
                usage: wgpu::BufferUsages::VERTEX,
            });

            render_pass.set_pipeline(pipeline);
            render_pass.set_vertex_buffer(1, instance_buffer.slice(..));
            render_pass.draw_indexed(0..6, 0, 0..instances.len() as u32);
        }
    }

    /// Number of cached pipelines (useful for diagnostics).
    pub fn pipeline_count(&self) -> usize {
        self.pipelines.len()
    }

    /// Remove all cached pipelines (e.g. after a hot-reload).
    pub fn clear(&mut self) {
        self.pipelines.clear();
    }
}

/// Extract the primary color from a fill for passing to the instance buffer.
/// This allows the shader to read a per-instance color even though fills
/// with fixed colors bake them into the shader source.
fn primary_color_from_fill(fill: &SdfFill) -> [f32; 4] {
    match fill {
        SdfFill::Solid { color } => *color,
        SdfFill::Outline { color, .. } => *color,
        SdfFill::SolidWithOutline { fill, .. } => *fill,
        SdfFill::Gradient { from, .. } => *from,
        SdfFill::Glow { color, .. } => *color,
        SdfFill::CosinePalette { a, .. } => [a[0], a[1], a[2], 1.0],
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sdf_instance_is_48_bytes() {
        // position (2*4=8) + bounds (4) + rotation (4) + scale (4) + opacity (4)
        // + pad (2*4=8) + color (4*4=16) = 48 bytes
        assert_eq!(std::mem::size_of::<SdfInstance>(), 48);
    }

    #[test]
    fn sdf_quad_vertex_is_16_bytes() {
        // position (2*4=8) + uv (2*4=8) = 16 bytes
        assert_eq!(std::mem::size_of::<SdfQuadVertex>(), 16);
    }

    #[test]
    fn generate_shader_contains_expression() {
        let shader = generate_sdf_shader(
            "sd_circle(p, 50.0)",
            &SdfFill::Solid { color: [1.0, 0.0, 0.0, 1.0] },
        );
        assert!(shader.contains("sd_circle(p, 50.0)"), "shader should contain the SDF expression");
        assert!(shader.contains("fn sd_circle"), "shader should contain primitive definitions");
        assert!(shader.contains("fn vs_main"), "shader should contain vertex entry point");
        assert!(shader.contains("fn fs_main"), "shader should contain fragment entry point");
    }

    #[test]
    fn generate_shader_includes_all_primitives() {
        let shader = generate_sdf_shader(
            "sd_circle(p, 10.0)",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        assert!(shader.contains("fn sd_circle"));
        assert!(shader.contains("fn sd_box"));
        assert!(shader.contains("fn sd_rounded_box"));
        assert!(shader.contains("fn sd_segment"));
        assert!(shader.contains("fn sd_capsule"));
        assert!(shader.contains("fn sd_ring"));
        assert!(shader.contains("fn sd_ellipse"));
        assert!(shader.contains("fn sd_hexagon"));
        assert!(shader.contains("fn sd_star5"));
        assert!(shader.contains("fn sd_cross"));
    }

    #[test]
    fn generate_shader_includes_all_ops() {
        let shader = generate_sdf_shader(
            "op_union(sd_circle(p, 10.0), sd_box(p, vec2(5.0, 5.0)))",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        assert!(shader.contains("fn op_union"));
        assert!(shader.contains("fn op_subtract"));
        assert!(shader.contains("fn op_intersect"));
        assert!(shader.contains("fn op_smooth_union"));
        assert!(shader.contains("fn op_smooth_subtract"));
        assert!(shader.contains("fn op_smooth_intersect"));
        assert!(shader.contains("fn op_round"));
        assert!(shader.contains("fn op_annular"));
        assert!(shader.contains("fn op_repeat"));
        assert!(shader.contains("fn op_translate"));
        assert!(shader.contains("fn op_rotate"));
        assert!(shader.contains("fn op_scale"));
    }

    #[test]
    fn generate_shader_includes_camera_and_time_bindings() {
        let shader = generate_sdf_shader(
            "sd_circle(p, 1.0)",
            &SdfFill::Solid { color: [1.0, 0.0, 0.0, 1.0] },
        );
        assert!(shader.contains("struct CameraUniform"));
        assert!(shader.contains("@group(0) @binding(0)"));
        assert!(shader.contains("struct TimeUniform"));
        assert!(shader.contains("@group(1) @binding(0)"));
        assert!(shader.contains("var<uniform> camera: CameraUniform"));
        assert!(shader.contains("var<uniform> time_data: TimeUniform"));
    }

    #[test]
    fn fill_solid_generates_smoothstep_aa() {
        let code = generate_fill_wgsl(&SdfFill::Solid {
            color: [1.0, 0.0, 0.0, 1.0],
        });
        assert!(code.contains("smoothstep"), "solid fill should use smoothstep for AA");
        assert!(code.contains("1.000000, 0.000000, 0.000000, 1.000000"));
    }

    #[test]
    fn fill_outline_generates_abs_distance() {
        let code = generate_fill_wgsl(&SdfFill::Outline {
            color: [0.0, 1.0, 0.0, 1.0],
            thickness: 2.0,
        });
        assert!(code.contains("abs(d)"), "outline fill should use abs(d)");
        assert!(code.contains("2.000000"), "outline fill should include thickness");
    }

    #[test]
    fn fill_glow_generates_exp_falloff() {
        let code = generate_fill_wgsl(&SdfFill::Glow {
            color: [0.0, 0.5, 1.0, 1.0],
            intensity: 3.0,
        });
        assert!(code.contains("exp("), "glow fill should use exponential falloff");
        assert!(code.contains("3.000000"), "glow fill should include intensity");
    }

    #[test]
    fn fill_gradient_generates_direction_mapping() {
        let code = generate_fill_wgsl(&SdfFill::Gradient {
            from: [1.0, 0.0, 0.0, 1.0],
            to: [0.0, 0.0, 1.0, 1.0],
            angle: 1.5708,
            scale: 1.0,
        });
        assert!(code.contains("grad_dir"), "gradient fill should compute direction");
        assert!(code.contains("mix("), "gradient fill should interpolate colors");
    }

    #[test]
    fn fill_cosine_palette_generates_cosine_function() {
        let code = generate_fill_wgsl(&SdfFill::CosinePalette {
            a: [0.5, 0.5, 0.5],
            b: [0.5, 0.5, 0.5],
            c: [1.0, 1.0, 1.0],
            d: [0.0, 0.33, 0.67],
        });
        assert!(code.contains("cos("), "cosine palette should use cos()");
        assert!(code.contains("6.283185"), "cosine palette should use 2*pi");
    }

    #[test]
    fn fill_solid_with_outline_generates_both_colors() {
        let code = generate_fill_wgsl(&SdfFill::SolidWithOutline {
            fill: [1.0, 0.0, 0.0, 1.0],
            outline: [1.0, 1.0, 1.0, 1.0],
            thickness: 1.5,
        });
        assert!(code.contains("fill_color"), "should have fill color");
        assert!(code.contains("outline_color"), "should have outline color");
        assert!(code.contains("1.500000"), "should include thickness");
    }

    #[test]
    fn pipeline_key_differs_for_different_expressions() {
        let fill = SdfFill::Solid { color: [1.0; 4] };
        let k1 = compute_pipeline_key("sd_circle(p, 10.0)", &fill);
        let k2 = compute_pipeline_key("sd_box(p, vec2(5.0, 5.0))", &fill);
        assert_ne!(k1, k2, "different expressions should produce different keys");
    }

    #[test]
    fn pipeline_key_differs_for_different_fills() {
        let expr = "sd_circle(p, 10.0)";
        let k1 = compute_pipeline_key(expr, &SdfFill::Solid { color: [1.0, 0.0, 0.0, 1.0] });
        let k2 = compute_pipeline_key(expr, &SdfFill::Solid { color: [0.0, 1.0, 0.0, 1.0] });
        assert_ne!(k1, k2, "different fills should produce different keys");
    }

    #[test]
    fn pipeline_key_is_deterministic() {
        let fill = SdfFill::Glow { color: [0.0, 0.5, 1.0, 1.0], intensity: 3.0 };
        let k1 = compute_pipeline_key("sd_circle(p, 10.0)", &fill);
        let k2 = compute_pipeline_key("sd_circle(p, 10.0)", &fill);
        assert_eq!(k1, k2, "same input should produce the same key");
    }

    #[test]
    fn compute_fill_hash_varies_by_discriminant() {
        let h1 = compute_fill_hash(&SdfFill::Solid { color: [1.0; 4] });
        let h2 = compute_fill_hash(&SdfFill::Glow { color: [1.0; 4], intensity: 1.0 });
        assert_ne!(h1, h2, "different fill types should hash differently");
    }

    #[test]
    fn primary_color_extraction() {
        assert_eq!(
            primary_color_from_fill(&SdfFill::Solid { color: [0.1, 0.2, 0.3, 0.4] }),
            [0.1, 0.2, 0.3, 0.4],
        );
        assert_eq!(
            primary_color_from_fill(&SdfFill::Outline { color: [0.5, 0.6, 0.7, 0.8], thickness: 1.0 }),
            [0.5, 0.6, 0.7, 0.8],
        );
        assert_eq!(
            primary_color_from_fill(&SdfFill::SolidWithOutline {
                fill: [0.1, 0.2, 0.3, 0.4],
                outline: [0.9, 0.9, 0.9, 1.0],
                thickness: 2.0,
            }),
            [0.1, 0.2, 0.3, 0.4],
        );
        assert_eq!(
            primary_color_from_fill(&SdfFill::Gradient {
                from: [1.0, 0.0, 0.0, 1.0],
                to: [0.0, 0.0, 1.0, 1.0],
                angle: 0.0,
                scale: 1.0,
            }),
            [1.0, 0.0, 0.0, 1.0],
        );
        assert_eq!(
            primary_color_from_fill(&SdfFill::Glow { color: [0.0, 1.0, 0.0, 1.0], intensity: 5.0 }),
            [0.0, 1.0, 0.0, 1.0],
        );
        let cosine = primary_color_from_fill(&SdfFill::CosinePalette {
            a: [0.5, 0.5, 0.5],
            b: [0.5, 0.5, 0.5],
            c: [1.0, 1.0, 1.0],
            d: [0.0, 0.33, 0.67],
        });
        assert_eq!(cosine, [0.5, 0.5, 0.5, 1.0]);
    }

    #[test]
    fn generated_shader_has_valid_structure() {
        // Verify the shader has proper WGSL structure (all sections present)
        let shader = generate_sdf_shader(
            "op_smooth_union(sd_circle(p, 30.0), sd_box(p, vec2<f32>(20.0, 20.0)), 5.0)",
            &SdfFill::SolidWithOutline {
                fill: [0.2, 0.4, 0.8, 1.0],
                outline: [1.0, 1.0, 1.0, 1.0],
                thickness: 2.0,
            },
        );

        // Check structure ordering: primitives -> bindings -> vertex -> fragment
        let prim_pos = shader.find("fn sd_circle").unwrap();
        let binding_pos = shader.find("struct CameraUniform").unwrap();
        let vs_pos = shader.find("fn vs_main").unwrap();
        let fs_pos = shader.find("fn fs_main").unwrap();

        assert!(prim_pos < binding_pos, "primitives should come before bindings");
        assert!(binding_pos < vs_pos, "bindings should come before vertex shader");
        assert!(vs_pos < fs_pos, "vertex shader should come before fragment shader");
    }

    #[test]
    fn sdf_quad_vertices_are_centered() {
        // The quad should span from -1 to 1 in both axes
        assert_eq!(SDF_QUAD_VERTICES[0].position, [-1.0, -1.0]);
        assert_eq!(SDF_QUAD_VERTICES[1].position, [1.0, -1.0]);
        assert_eq!(SDF_QUAD_VERTICES[2].position, [1.0, 1.0]);
        assert_eq!(SDF_QUAD_VERTICES[3].position, [-1.0, 1.0]);
    }

    #[test]
    fn sdf_quad_indices_form_two_triangles() {
        assert_eq!(SDF_QUAD_INDICES.len(), 6);
        assert_eq!(SDF_QUAD_INDICES, &[0, 1, 2, 0, 2, 3]);
    }

    // -----------------------------------------------------------------------
    // WGSL validation tests (using naga parser)
    //
    // These tests verify that the generated WGSL shaders are syntactically
    // and semantically valid by parsing them through naga's WGSL front-end.
    // This catches type mismatches, undefined variables, and syntax errors
    // without needing a GPU device.
    // -----------------------------------------------------------------------

    /// Parse the given WGSL source through naga and return Ok if valid.
    fn validate_wgsl(source: &str) -> Result<(), String> {
        match naga::front::wgsl::parse_str(source) {
            Ok(_module) => Ok(()),
            Err(e) => Err(format!("{e:?}")),
        }
    }

    // === Primitive compilation tests ===

    #[test]
    fn wgsl_circle_compiles() {
        let shader = generate_sdf_shader(
            "sd_circle(p, 50.0)",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Circle shader failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_box_compiles() {
        let shader = generate_sdf_shader(
            "sd_box(p, vec2<f32>(20.0, 10.0))",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Box shader failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_rounded_box_compiles() {
        let shader = generate_sdf_shader(
            "sd_rounded_box(p, vec2<f32>(20.0, 10.0), vec4<f32>(3.0, 3.0, 3.0, 3.0))",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Rounded box shader failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_all_primitives_compile() {
        // Test every SDF primitive in the inline WGSL library.
        // Each expression must be a valid WGSL f32 expression given `p: vec2<f32>`.
        let primitives: &[(&str, &str)] = &[
            ("sd_circle", "sd_circle(p, 50.0)"),
            ("sd_box", "sd_box(p, vec2<f32>(20.0, 10.0))"),
            ("sd_rounded_box", "sd_rounded_box(p, vec2<f32>(20.0, 10.0), vec4<f32>(3.0, 3.0, 3.0, 3.0))"),
            ("sd_segment", "sd_segment(p, vec2<f32>(0.0, 0.0), vec2<f32>(20.0, 10.0))"),
            ("sd_capsule", "sd_capsule(p, vec2<f32>(-10.0, 0.0), vec2<f32>(10.0, 0.0), 5.0)"),
            ("sd_equilateral_triangle", "sd_equilateral_triangle(p, 20.0)"),
            ("sd_ring", "sd_ring(p, 20.0, 3.0)"),
            ("sd_ellipse", "sd_ellipse(p, vec2<f32>(30.0, 15.0))"),
            ("sd_hexagon", "sd_hexagon(p, 20.0)"),
            ("sd_star5", "sd_star5(p, 15.0, 0.4)"),
            ("sd_cross", "sd_cross(p, vec2<f32>(20.0, 5.0), 2.0)"),
        ];
        for (name, expr) in primitives {
            let shader = generate_sdf_shader(expr, &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] });
            let result = validate_wgsl(&shader);
            assert!(result.is_ok(), "Primitive '{name}' failed to compile.\nExpression: {expr}\nError: {}", result.unwrap_err());
        }
    }

    // === Composition operator tests ===

    #[test]
    fn wgsl_composition_operators_compile() {
        let exprs: &[(&str, &str)] = &[
            ("op_union", "op_union(sd_circle(p, 20.0), sd_box(p, vec2<f32>(15.0, 15.0)))"),
            ("op_subtract", "op_subtract(sd_circle(p, 20.0), sd_circle(p - vec2<f32>(10.0, 0.0), 15.0))"),
            ("op_intersect", "op_intersect(sd_circle(p, 20.0), sd_box(p, vec2<f32>(15.0, 15.0)))"),
            ("op_smooth_union", "op_smooth_union(sd_circle(p, 20.0), sd_box(p - vec2<f32>(15.0, 0.0), vec2<f32>(10.0, 10.0)), 5.0)"),
            ("op_smooth_subtract", "op_smooth_subtract(sd_circle(p, 20.0), sd_circle(p - vec2<f32>(5.0, 0.0), 15.0), 3.0)"),
            ("op_smooth_intersect", "op_smooth_intersect(sd_circle(p, 25.0), sd_box(p, vec2<f32>(15.0, 15.0)), 4.0)"),
        ];
        for (name, expr) in exprs {
            let shader = generate_sdf_shader(expr, &SdfFill::Solid { color: [1.0, 0.0, 0.0, 1.0] });
            let result = validate_wgsl(&shader);
            assert!(result.is_ok(), "Composition '{name}' failed.\nExpression: {expr}\nError: {}", result.unwrap_err());
        }
    }

    // === Fill type compilation tests ===

    #[test]
    fn wgsl_all_fill_types_compile() {
        let expr = "sd_circle(p, 30.0)";
        let fills: Vec<(&str, SdfFill)> = vec![
            ("Solid", SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] }),
            ("Outline", SdfFill::Outline { color: [1.0, 0.0, 0.0, 1.0], thickness: 2.0 }),
            ("SolidWithOutline", SdfFill::SolidWithOutline {
                fill: [0.0, 0.0, 1.0, 1.0],
                outline: [1.0, 1.0, 1.0, 1.0],
                thickness: 1.5,
            }),
            ("Gradient", SdfFill::Gradient {
                from: [1.0, 0.0, 0.0, 1.0],
                to: [0.0, 0.0, 1.0, 1.0],
                angle: 1.5707,
                scale: 1.0,
            }),
            ("Glow", SdfFill::Glow { color: [0.0, 1.0, 0.5, 1.0], intensity: 0.8 }),
            ("CosinePalette", SdfFill::CosinePalette {
                a: [0.5, 0.5, 0.5],
                b: [0.5, 0.5, 0.5],
                c: [1.0, 1.0, 1.0],
                d: [0.0, 0.33, 0.67],
            }),
        ];
        for (name, fill) in &fills {
            let shader = generate_sdf_shader(expr, fill);
            let result = validate_wgsl(&shader);
            assert!(result.is_ok(), "Fill '{name}' failed to compile.\nError: {}", result.unwrap_err());
        }
    }

    // === Complex expression tests ===

    #[test]
    fn wgsl_deeply_nested_tree_compiles() {
        // A tree-like shape: trunk (rounded box) + layered foliage (smooth-unioned circles)
        let expr = concat!(
            "op_smooth_union(",
                "op_smooth_union(",
                    "op_smooth_union(",
                        "sd_rounded_box(p, vec2<f32>(8.0, 30.0), vec4<f32>(2.0, 2.0, 2.0, 2.0)), ",
                        "sd_circle(p - vec2<f32>(0.0, 25.0), 18.0), ",
                    "4.0), ",
                    "sd_circle(p - vec2<f32>(-10.0, 20.0), 14.0), ",
                "4.0), ",
                "sd_circle(p - vec2<f32>(10.0, 20.0), 14.0), ",
            "4.0)",
        );
        let shader = generate_sdf_shader(expr, &SdfFill::Gradient {
            from: [0.35, 0.23, 0.1, 1.0],
            to: [0.18, 0.54, 0.3, 1.0],
            angle: 1.5707,
            scale: 1.0,
        });
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Nested tree failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_subtract_creates_crescent() {
        // Classic crescent moon via subtraction of two circles
        let expr = "op_subtract(sd_circle(p, 25.0), sd_circle(p - vec2<f32>(10.0, 5.0), 22.0))";
        let shader = generate_sdf_shader(expr, &SdfFill::Glow {
            color: [0.9, 0.9, 0.6, 1.0],
            intensity: 0.5,
        });
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Crescent moon failed: {}", result.unwrap_err());
    }

    // === Domain transform tests ===

    #[test]
    fn wgsl_time_uniform_in_expression() {
        // The time uniform is available in the fragment shader as time_data.time
        let shader = generate_sdf_shader(
            "sd_circle(p, 20.0 + sin(time_data.time) * 5.0)",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Time uniform shader failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_repeat_domain_compiles() {
        // Infinite repetition via op_repeat domain transform
        let shader = generate_sdf_shader(
            "sd_circle(op_repeat(p, vec2<f32>(40.0, 40.0)), 10.0)",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Repeat domain failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_rotate_transform_compiles() {
        // Rotate a box by 45 degrees using op_rotate
        let shader = generate_sdf_shader(
            "sd_box(op_rotate(p, 0.785), vec2<f32>(20.0, 10.0))",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Rotate transform failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_translate_transform_compiles() {
        // Translate a circle using op_translate
        let shader = generate_sdf_shader(
            "sd_circle(op_translate(p, vec2<f32>(15.0, 10.0)), 12.0)",
            &SdfFill::Outline { color: [0.0, 1.0, 0.0, 1.0], thickness: 2.0 },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Translate transform failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_scale_transform_compiles() {
        // Scale a star using op_scale
        let shader = generate_sdf_shader(
            "sd_star5(op_scale(p, 2.0), 15.0, 0.4) * 2.0",
            &SdfFill::Solid { color: [1.0, 0.8, 0.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Scale transform failed: {}", result.unwrap_err());
    }

    // === Modifier tests ===

    #[test]
    fn wgsl_round_modifier_compiles() {
        let shader = generate_sdf_shader(
            "op_round(sd_box(p, vec2<f32>(20.0, 10.0)), 3.0)",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Round modifier failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_annular_modifier_compiles() {
        // op_annular hollows out a shape (like op_onion in the standalone WGSL)
        let shader = generate_sdf_shader(
            "op_annular(sd_circle(p, 20.0), 2.0)",
            &SdfFill::Solid { color: [1.0, 1.0, 1.0, 1.0] },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Annular modifier failed: {}", result.unwrap_err());
    }

    // === Combined transforms + compositions ===

    #[test]
    fn wgsl_complex_scene_compiles() {
        // A complex scene: repeated circles unioned with a rotated cross,
        // all with a gradient fill. Tests multiple features together.
        let expr = concat!(
            "op_union(",
                "sd_circle(op_repeat(p, vec2<f32>(50.0, 50.0)), 8.0), ",
                "sd_cross(op_rotate(p, 0.785), vec2<f32>(30.0, 6.0), 2.0)",
            ")",
        );
        let shader = generate_sdf_shader(expr, &SdfFill::CosinePalette {
            a: [0.5, 0.5, 0.5],
            b: [0.5, 0.5, 0.5],
            c: [1.0, 1.0, 1.0],
            d: [0.0, 0.33, 0.67],
        });
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Complex scene failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_animated_pulsing_ring() {
        // Animated ring that pulses with time
        let shader = generate_sdf_shader(
            "sd_ring(p, 25.0 + sin(time_data.time * 2.0) * 5.0, 3.0)",
            &SdfFill::Glow { color: [0.2, 0.8, 1.0, 1.0], intensity: 1.5 },
        );
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Animated ring failed: {}", result.unwrap_err());
    }

    #[test]
    fn wgsl_three_way_smooth_union() {
        // Three shapes blended together
        let expr = concat!(
            "op_smooth_union(",
                "op_smooth_union(",
                    "sd_circle(p - vec2<f32>(-15.0, 0.0), 12.0), ",
                    "sd_circle(p - vec2<f32>(15.0, 0.0), 12.0), ",
                "6.0), ",
                "sd_circle(p - vec2<f32>(0.0, 15.0), 12.0), ",
            "6.0)",
        );
        let shader = generate_sdf_shader(expr, &SdfFill::SolidWithOutline {
            fill: [0.3, 0.3, 0.8, 1.0],
            outline: [1.0, 1.0, 1.0, 1.0],
            thickness: 1.0,
        });
        let result = validate_wgsl(&shader);
        assert!(result.is_ok(), "Three-way smooth union failed: {}", result.unwrap_err());
    }
}
