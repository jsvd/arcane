// 2D SDF composition operations and domain transforms for the Arcane game engine.
//
// These operations combine and transform signed distance fields produced by
// the primitives in sdf_primitives.wgsl.
//
// Ported from Inigo Quilez's reference:
//   https://iquilezles.org/articles/distfunctions2d/
//
// Usage: Import alongside sdf_primitives.wgsl into fragment shaders that
// build complex procedural shapes from SDF primitives.

// ============================================================================
// Boolean operations
// ============================================================================

/// Union: the exterior of both shapes becomes the exterior of the result.
/// Returns the minimum distance (closest surface).
fn op_union(d1: f32, d2: f32) -> f32 {
    return min(d1, d2);
}

/// Subtraction: carves d2 out of d1. The interior of d2 becomes exterior.
fn op_subtract(d1: f32, d2: f32) -> f32 {
    return max(d1, -d2);
}

/// Intersection: only the region inside both shapes remains interior.
fn op_intersect(d1: f32, d2: f32) -> f32 {
    return max(d1, d2);
}

/// Smooth union with blending factor k. Larger k = smoother blend.
/// k = 0 degenerates to hard union. Typical values: 0.1 to 1.0.
fn op_smooth_union(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

/// Smooth subtraction with blending factor k. Carves d2 from d1 with
/// a smooth fillet at the intersection.
fn op_smooth_subtract(d1: f32, d2: f32, k: f32) -> f32 {
    let h = clamp(0.5 - 0.5 * (d1 + d2) / k, 0.0, 1.0);
    return mix(d1, -d2, h) + k * h * (1.0 - h);
}

// ============================================================================
// Modifiers
// ============================================================================

/// Round: expand the shape outward by radius r, rounding all corners.
/// Equivalent to a Minkowski sum with a circle of radius r.
fn op_round(d: f32, r: f32) -> f32 {
    return d - r;
}

/// Onion: hollow out a shape, creating a shell of thickness r.
/// Converts a filled shape into a ring/outline.
fn op_onion(d: f32, r: f32) -> f32 {
    return abs(d) - r;
}

// ============================================================================
// Domain transforms
//
// These modify the input point p before passing it to an SDF primitive,
// effectively transforming the shape in space.
// ============================================================================

/// Rotate a point by angle (in radians) around the origin.
/// Apply before evaluating an SDF to rotate the shape.
fn rotate_rad(p: vec2<f32>, angle: f32) -> vec2<f32> {
    let c = cos(angle);
    let s = sin(angle);
    return vec2<f32>(
        c * p.x + s * p.y,
        -s * p.x + c * p.y
    );
}

/// Infinite repetition: tiles space with the given spacing.
/// Returns a point in the range [-spacing/2, spacing/2] per axis.
///
/// Note: This creates infinite copies. For finite repetition, use
/// clamp on the cell index instead.
fn op_repeat(p: vec2<f32>, spacing: vec2<f32>) -> vec2<f32> {
    return p - spacing * round(p / spacing);
}

/// Mirror across the x-axis (left-right symmetry).
/// Folds the point into the positive-x half-plane, so you only
/// need to define the shape for x >= 0.
fn op_symmetry_x(p: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(abs(p.x), p.y);
}
