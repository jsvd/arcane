// 2D Signed Distance Function primitives for the Arcane game engine.
//
// Ported from Inigo Quilez's 2D distance functions:
//   https://iquilezles.org/articles/distfunctions2d/
//
// All functions take a point p in local space and return the signed distance
// to the shape boundary. Negative values are inside, positive are outside.
//
// Usage: These are utility functions intended to be imported (#include or
// copy-paste) into fragment shaders that need procedural SDF shapes.

const PI: f32 = 3.14159265;
const TAU: f32 = 6.28318530;

// ============================================================================
// Helper functions
// ============================================================================

/// Dot product of a vector with itself (squared length).
fn dot2v(v: vec2<f32>) -> f32 {
    return dot(v, v);
}

/// Cross product of two 2D vectors (returns scalar z-component).
fn cross2d(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.y - a.y * b.x;
}

/// Diagonal dot product: a.x*b.x - a.y*b.y. Used by vesica/rhombus shapes.
fn ndot(a: vec2<f32>, b: vec2<f32>) -> f32 {
    return a.x * b.x - a.y * b.y;
}

// ============================================================================
// Basic shapes
// ============================================================================

/// Circle centered at origin with radius r.
fn sd_circle(p: vec2<f32>, r: f32) -> f32 {
    return length(p) - r;
}

/// Axis-aligned box centered at origin with half-extents b.
fn sd_box(p: vec2<f32>, b: vec2<f32>) -> f32 {
    let d = abs(p) - b;
    return length(max(d, vec2<f32>(0.0))) + min(max(d.x, d.y), 0.0);
}

/// Rounded box with per-corner radii. b = half-extents.
/// r = (top-right, bottom-right, top-left, bottom-left) corner radii.
fn sd_rounded_box(p: vec2<f32>, b: vec2<f32>, r: vec4<f32>) -> f32 {
    // Select corner radius based on quadrant.
    // select(false_val, true_val, condition) in WGSL.
    var radii = select(r.xy, r.zw, p.x < 0.0);
    let radius = select(radii.x, radii.y, p.y < 0.0);

    let q = abs(p) - b + vec2<f32>(radius);
    return min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - radius;
}

/// Ellipse with semi-axes ab = (a, b). Exact SDF using IQ's closed-form solution.
/// Reference: https://iquilezles.org/articles/ellipsedist/
fn sd_ellipse(p_in: vec2<f32>, ab_in: vec2<f32>) -> f32 {
    // Work in first quadrant (symmetry)
    var p = abs(p_in);

    // Ensure a >= b by swapping axes if needed
    var ab = ab_in;
    if ab.x < ab.y {
        p = p.yx;
        ab = ab.yx;
    }

    let a = ab.x;
    let b = ab.y;

    let l = a * a - b * b;

    // Nearly circular: fall back to circle SDF
    if l < 1e-7 {
        return length(p) - a;
    }

    // On-axis shortcut: if p.x ~ 0, closest point is pole (0, b)
    if p.x < 1e-6 {
        return p.y - b;
    }
    // If p.y ~ 0, closest point is (a, 0)
    if p.y < 1e-6 {
        return p.x - a;
    }

    let m = a * p.x / l;
    let m2 = m * m;
    let n = b * p.y / l;
    let n2 = n * n;
    let c = (m2 + n2 - 1.0) / 3.0;
    let c3 = c * c * c;
    let d = c3 + m2 * n2 * 2.0;

    var co: vec2<f32>;

    if d < 0.0 {
        // Three real roots: use trigonometric solution
        let h = acos(clamp(d / c3, -1.0, 1.0)) / 3.0;
        let s = cos(h);
        let t = sin(h) * sqrt(3.0);
        let rx = sqrt(max(-c * (s + t + 2.0) + m2, 0.0));
        let ry = sqrt(max(-c * (s - t + 2.0) + m2, 0.0));
        let g = (ry + sign(l) * rx + abs(n) / max(rx * ry, 1e-10)) * 0.5;
        co = vec2<f32>(
            a * g / m,
            b * sqrt(max(1.0 - g * g, 0.0))
        );
    } else {
        // One real root: use Cardano's formula
        let h = 2.0 * m * n * sqrt(d);
        let s = pow(max(d + h, 0.0), 1.0 / 3.0) * sign(d + h);
        let t_val = pow(max(abs(d - h), 0.0), 1.0 / 3.0) * sign(d - h);
        let rx = -(s + t_val) - c * 4.0 + 2.0 * m2;
        let ry = (s - t_val) * sqrt(3.0);
        let rm = sqrt(max(rx * rx + ry * ry, 0.0));
        co.x = (ry / sqrt(max(rm - rx, 1e-10)) + 2.0 * m * n / max(rm, 1e-10)) * 0.5;
        co.x = a * co.x;
        co.y = b * sqrt(max(1.0 - co.x * co.x / (a * a), 0.0));
    }

    // Clamp co.x to valid range
    co.x = clamp(co.x, 0.0, a);
    co.y = b * sqrt(max(1.0 - (co.x / a) * (co.x / a), 0.0));

    return length(p - co) * sign(p.y - co.y);
}

/// Line segment from a to b. Returns unsigned distance.
fn sd_segment(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

/// Triangle defined by three vertices.
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
    let d = min(min(
        vec2<f32>(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
        vec2<f32>(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
        vec2<f32>(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));

    return -sqrt(d.x) * sign(d.y);
}

// ============================================================================
// Organic shapes
// ============================================================================

/// Egg shape (asymmetric vertically). ra = large radius, rb = small radius.
/// The egg is oriented along the y-axis with the wider end at the bottom.
fn sd_egg(p: vec2<f32>, ra: f32, rb: f32) -> f32 {
    let k = sqrt(3.0);
    var q = vec2<f32>(abs(p.x), p.y);

    let r = ra - rb;

    // Bottom half-plane: circle of radius r centered at origin
    if q.y < 0.0 {
        return length(q) - r;
    }

    // Top region: small circle tangent at top
    if k * (q.x + r) < q.y {
        return length(q - vec2<f32>(0.0, k * r + rb)) - rb;
    }

    // Side region: large arc
    return length(q + vec2<f32>(r, 0.0)) - 2.0 * r - rb;
}

/// Heart shape. The heart is oriented with the point downward.
/// r controls the overall size.
fn sd_heart(p: vec2<f32>, r: f32) -> f32 {
    var q = p / r;
    q = vec2<f32>(abs(q.x), q.y + 0.75);

    if q.x + q.y > 1.0 {
        return r * (sqrt(dot2v(q - vec2<f32>(0.25, 0.75))) - sqrt(2.0) * 0.25);
    }

    let half_diag = vec2<f32>(0.5 * max(q.x + q.y, 0.0));
    return r * (sqrt(min(dot2v(q - vec2<f32>(0.0, 1.0)),
                         dot2v(q - half_diag))) *
                sign(q.x - q.y));
}

/// Moon shape. d = displacement of inner circle, ra = outer radius, rb = inner radius.
/// Creates a crescent by subtracting one circle from another.
fn sd_moon(p: vec2<f32>, d: f32, ra: f32, rb: f32) -> f32 {
    var q = vec2<f32>(p.x, abs(p.y));

    let a = (ra * ra - rb * rb + d * d) / (2.0 * d);
    let b = sqrt(max(ra * ra - a * a, 0.0));

    if d * (q.x * b - q.y * a) > d * d * max(b - q.y, 0.0) {
        return length(q - vec2<f32>(a, b));
    }

    return max(length(q) - ra,
              -(length(q - vec2<f32>(d, 0.0)) - rb));
}

/// Vesica piscis (lens/almond shape). r = circle radius, d = half-distance between centers.
/// The two circles are centered at (-d, 0) and (d, 0).
fn sd_vesica(p: vec2<f32>, r: f32, d: f32) -> f32 {
    let q = abs(p);

    let b = sqrt(max(r * r - d * d, 0.0));

    if (q.y - b) * d > q.x * b {
        return length(q - vec2<f32>(0.0, b));
    }

    return length(q - vec2<f32>(-d, 0.0)) - r;
}

/// Circular arc. sc = vec2(sin, cos) of the arc half-angle opening, ra = radius, rb = thickness.
/// The arc opens upward centered on the y-axis.
fn sd_arc(p: vec2<f32>, sc: vec2<f32>, ra: f32, rb: f32) -> f32 {
    let q = vec2<f32>(abs(p.x), p.y);

    // Test if the point is within the arc's angular span
    if sc.y * q.x > sc.x * q.y {
        // Within span: distance to the arc ring
        return abs(length(q) - ra) - rb;
    }

    // Outside span: distance to the arc endpoints
    return length(q - sc * ra) - rb;
}

// ============================================================================
// Geometric shapes (regular polygons and stars)
// ============================================================================

/// Regular hexagon with inradius r (flat-to-flat distance / 2).
fn sd_hexagon(p: vec2<f32>, r: f32) -> f32 {
    // k = (-sqrt(3)/2, 0.5, 1/sqrt(3))
    let k = vec3<f32>(-0.866025404, 0.5, 0.577350269);
    var q = abs(p);

    // Reflect across the two mirror axes
    q = q - 2.0 * min(dot(k.xy, q), 0.0) * k.xy;

    // Distance to the flat edge
    q = q - vec2<f32>(clamp(q.x, -k.z * r, k.z * r), r);

    return length(q) * sign(q.y);
}

/// Regular pentagon with inradius r.
fn sd_pentagon(p: vec2<f32>, r: f32) -> f32 {
    // k = (cos(pi/5), sin(pi/5), tan(pi/5))
    let k = vec3<f32>(0.809016994, 0.587785252, 0.726542528);
    var q = vec2<f32>(abs(p.x), -p.y);

    // Two reflections to fold into one sector
    q = q - 2.0 * min(dot(vec2<f32>(-k.x, k.y), q), 0.0) * vec2<f32>(-k.x, k.y);
    q = q - 2.0 * min(dot(vec2<f32>(k.x, k.y), q), 0.0) * vec2<f32>(k.x, k.y);

    // Distance to the flat edge
    q = q - vec2<f32>(clamp(q.x, -r * k.z, r * k.z), r);

    return length(q) * sign(q.y);
}

/// Regular octagon with inradius r.
fn sd_octogon(p: vec2<f32>, r: f32) -> f32 {
    // k = (-cos(pi/8), sin(pi/8), tan(pi/8))
    let k = vec3<f32>(-0.9238795325, 0.3826834324, 0.4142135624);
    var q = abs(p);

    // Reflect across two mirror axes (45-degree-spaced)
    q = q - 2.0 * min(dot(vec2<f32>(k.x, k.y), q), 0.0) * vec2<f32>(k.x, k.y);
    q = q - 2.0 * min(dot(vec2<f32>(-k.x, k.y), q), 0.0) * vec2<f32>(-k.x, k.y);

    // Distance to the flat edge
    q = q - vec2<f32>(clamp(q.x, -k.z * r, k.z * r), r);

    return length(q) * sign(q.y);
}

/// Five-pointed star. r = outer radius, rf = inner radius factor.
/// rf controls how "pointy" the star is. rf ~ 0.382 gives a regular star.
fn sd_star5(p: vec2<f32>, r: f32, rf: f32) -> f32 {
    // k1 = (cos(pi/5), -sin(pi/5)), k2 = (-cos(pi/5), -sin(pi/5))
    let k1 = vec2<f32>(0.809016994, -0.587785252);
    let k2 = vec2<f32>(-k1.x, k1.y);

    var q = vec2<f32>(abs(p.x), -p.y);

    // Fold into one star arm via two reflections
    q = q - 2.0 * max(dot(k1, q), 0.0) * k1;
    q = q - 2.0 * max(dot(k2, q), 0.0) * k2;

    // Distance to the inner edge of the arm and the central axis to the star tip
    let e0 = rf * vec2<f32>(-k1.y, k1.x); // inner edge direction
    let e1 = vec2<f32>(0.0, -1.0);        // axis to tip (downward in folded space)

    // Project q onto the inner edge line (from origin along e0 direction)
    let pq0 = q - e0 * clamp(dot(q, e0) / dot(e0, e0), 0.0, r);

    // Project q onto the central axis (origin to tip at (0, -r))
    let pq1 = q - e1 * clamp(dot(q, e1), 0.0, r);

    return sqrt(min(dot(pq0, pq0), dot(pq1, pq1))) *
           sign(q.y * e0.x - q.x * e0.y);
}

/// General n-pointed star. r = outer radius, n = point count, m = angular sharpness.
/// m controls the inner angle: m = 2 gives minimal points, higher m = sharper points.
/// Valid range: 2 <= m <= n.
fn sd_star(p: vec2<f32>, r: f32, n: u32, m: f32) -> f32 {
    let an = PI / f32(n);
    let en = PI / m;
    let acs = vec2<f32>(cos(an), sin(an));
    let ecs = vec2<f32>(cos(en), sin(en));

    // Fold the angle into the first sector using modulo
    let bn = (atan2(abs(p.x), p.y) % (2.0 * an)) - an;
    var q = length(p) * vec2<f32>(cos(bn), abs(sin(bn)));

    // Project onto the star edge
    q = q - r * acs;
    q = q + ecs * clamp(-dot(q, ecs), 0.0, r * acs.y / ecs.y);

    return length(q) * sign(q.x);
}

/// Cross (plus sign) shape. b = half-extents of one arm (b.x = length, b.y = thickness).
/// r = corner rounding radius. The cross is two overlapping rectangles.
fn sd_cross(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
    var q = abs(p);

    // Exploit 45-degree symmetry: fold so that x >= y
    if q.y > q.x {
        q = q.yx;
    }

    // Now q is in the sector where x >= y >= 0.
    // The cross boundary in this sector is an L-shape with corners at:
    //   (b.y, b.y) inner corner, (b.x, b.y) arm end, (b.y, b.x) arm end
    let t = q - b;
    let k = max(t.x, t.y);

    if k > 0.0 {
        // Outside the bounding box of the arm
        return length(max(t, vec2<f32>(0.0))) - r;
    }

    // Inside: distance to the inner L-corner boundary
    // The inner corner is at (b.y, b.y). The signed distance to the
    // two inner edges: q.x - b.y (right of inner edge) and q.y - b.y
    // But after the diagonal fold, we are in the x>=y sector, so only
    // the boundary at y = b.y matters when q.x < b.x.
    // Combined: max of (distance to outer edge, distance to inner corner)
    return max(q.y - b.y, k) - r;
}

// ============================================================================
// Utility shapes
// ============================================================================

/// Ring (annulus). r = center radius, w = ring thickness.
fn sd_ring(p: vec2<f32>, r: f32, w: f32) -> f32 {
    return abs(length(p) - r) - w * 0.5;
}

/// Pie (circular sector). sc = vec2(sin, cos) of the half-angle, r = radius.
/// The sector opens along the +y axis.
fn sd_pie(p: vec2<f32>, sc: vec2<f32>, r: f32) -> f32 {
    let q = vec2<f32>(abs(p.x), p.y);
    let l = length(q) - r;
    let m = length(q - sc * clamp(dot(q, sc), 0.0, r));
    return max(l, m * sign(sc.y * q.x - sc.x * q.y));
}

/// Rounded X (multiplication sign). w = arm half-width, r = tip rounding radius.
fn sd_rounded_x(p: vec2<f32>, w: f32, r: f32) -> f32 {
    let q = abs(p);
    // The X diagonals are the lines y=x and y=-x. After abs(), we only
    // need distance to y=x in the first quadrant.
    // Closest point on y=x to (qx, qy) is ((qx+qy)/2, (qx+qy)/2).
    let d = min(q.x + q.y, max(q.x, q.y));
    return d * 0.5 - w * 0.5 - r;
}
