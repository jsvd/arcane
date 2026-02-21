pub type BodyId = u32;
pub type ConstraintId = u32;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BodyType {
    Static,
    Dynamic,
    Kinematic,
}

/// Feature-based contact identifier for warm starting.
/// Tracks which geometric features (edges/vertices) are in contact
/// so accumulated impulses can be transferred across frames even when
/// contact points shift slightly.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ContactID {
    /// Edge index on reference body (the face we're clipping against)
    pub ref_edge: u8,
    /// Edge index on incident body (the face being clipped)
    pub inc_edge: u8,
    /// Which endpoint of the clipped segment (0 or 1)
    pub clip_index: u8,
    /// Reserved for future use / padding
    pub flags: u8,
}

impl ContactID {
    pub fn new(ref_edge: u8, inc_edge: u8, clip_index: u8) -> Self {
        Self {
            ref_edge,
            inc_edge,
            clip_index,
            flags: 0,
        }
    }

    /// ID for circle contacts (no edge features)
    pub fn circle() -> Self {
        Self {
            ref_edge: 255,
            inc_edge: 255,
            clip_index: 0,
            flags: 0,
        }
    }
}

/// A single contact point within a manifold.
/// Stores body-local anchors for analytical updating across sub-steps.
#[derive(Debug, Clone)]
pub struct ManifoldPoint {
    /// Body-local anchor on body A
    pub local_a: (f32, f32),
    /// Body-local anchor on body B
    pub local_b: (f32, f32),
    /// Penetration depth (positive = overlapping, negative = separated/speculative)
    pub penetration: f32,
    /// Feature-based ID for warm start matching
    pub id: ContactID,
    /// Accumulated normal impulse (for warm starting)
    pub accumulated_jn: f32,
    /// Accumulated friction impulse (for warm starting)
    pub accumulated_jt: f32,
}

impl ManifoldPoint {
    pub fn new(local_a: (f32, f32), local_b: (f32, f32), penetration: f32, id: ContactID) -> Self {
        Self {
            local_a,
            local_b,
            penetration,
            id,
            accumulated_jn: 0.0,
            accumulated_jt: 0.0,
        }
    }
}

/// Contact manifold: up to 2 contact points between two bodies.
/// In 2D, any convex-convex collision produces at most 2 contact points.
#[derive(Debug, Clone)]
pub struct ContactManifold {
    pub body_a: BodyId,
    pub body_b: BodyId,
    /// Contact normal (points from A toward B)
    pub normal: (f32, f32),
    /// Contact points (0-2 for 2D)
    pub points: Vec<ManifoldPoint>,
    /// Pre-computed tangent direction (perpendicular to normal)
    pub tangent: (f32, f32),
    /// Pre-computed restitution velocity bias
    pub velocity_bias: f32,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Shape {
    Circle { radius: f32 },
    AABB { half_w: f32, half_h: f32 },
    Polygon { vertices: Vec<(f32, f32)> },
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Material {
    pub restitution: f32,
    pub friction: f32,
}

impl Default for Material {
    fn default() -> Self {
        Self {
            restitution: 0.3,
            friction: 0.5,
        }
    }
}

#[derive(Debug, Clone)]
pub struct RigidBody {
    pub id: BodyId,
    pub body_type: BodyType,
    pub shape: Shape,
    pub material: Material,
    pub x: f32,
    pub y: f32,
    pub angle: f32,
    pub vx: f32,
    pub vy: f32,
    pub angular_velocity: f32,
    pub fx: f32,
    pub fy: f32,
    pub torque: f32,
    pub mass: f32,
    pub inv_mass: f32,
    pub inertia: f32,
    pub inv_inertia: f32,
    pub layer: u16,
    pub mask: u16,
    pub sleeping: bool,
    pub sleep_timer: f32,
}

#[derive(Debug, Clone)]
pub struct Contact {
    pub body_a: BodyId,
    pub body_b: BodyId,
    pub normal: (f32, f32),
    pub penetration: f32,
    pub contact_point: (f32, f32),
    /// Accumulated normal impulse (used by warm starting)
    pub accumulated_jn: f32,
    /// Accumulated friction impulse (used by warm starting)
    pub accumulated_jt: f32,
    /// Restitution velocity bias (computed once before solver iterations)
    pub velocity_bias: f32,
    /// Friction tangent direction (computed once before solver iterations)
    pub tangent: (f32, f32),
}

#[derive(Debug, Clone)]
pub enum Constraint {
    Distance {
        id: ConstraintId,
        body_a: BodyId,
        body_b: BodyId,
        distance: f32,
        anchor_a: (f32, f32),
        anchor_b: (f32, f32),
    },
    Revolute {
        id: ConstraintId,
        body_a: BodyId,
        body_b: BodyId,
        anchor_a: (f32, f32),
        anchor_b: (f32, f32),
    },
}

impl Constraint {
    pub fn id(&self) -> ConstraintId {
        match self {
            Constraint::Distance { id, .. } => *id,
            Constraint::Revolute { id, .. } => *id,
        }
    }
}

/// Compute inverse mass, inertia, and inverse inertia for a shape.
/// Static bodies get inv_mass=0 and inv_inertia=0.
pub fn compute_mass_and_inertia(shape: &Shape, mass: f32, body_type: BodyType) -> (f32, f32, f32) {
    if body_type == BodyType::Static || mass <= 0.0 {
        return (0.0, 0.0, 0.0);
    }
    let inv_mass = 1.0 / mass;
    let inertia = match shape {
        Shape::Circle { radius } => 0.5 * mass * radius * radius,
        Shape::AABB { .. } => {
            // AABBs don't rotate — collision detection treats them as axis-aligned
            // regardless of body angle. Angular dynamics would create phantom forces
            // (angular velocity leaks into linear velocity via friction at contacts).
            // Use Polygon shapes for rotatable boxes.
            0.0
        }
        Shape::Polygon { vertices } => {
            // Approximate inertia using polygon area moment
            compute_polygon_inertia(vertices, mass)
        }
    };
    let inv_inertia = if inertia > 0.0 { 1.0 / inertia } else { 0.0 };
    (inv_mass, inertia, inv_inertia)
}

fn compute_polygon_inertia(vertices: &[(f32, f32)], mass: f32) -> f32 {
    let n = vertices.len();
    if n < 3 {
        return 0.0;
    }
    let mut numerator = 0.0f32;
    let mut denominator = 0.0f32;
    for i in 0..n {
        let (x0, y0) = vertices[i];
        let (x1, y1) = vertices[(i + 1) % n];
        let cross = (x0 * y1 - x1 * y0).abs();
        numerator += cross * (x0 * x0 + x0 * x1 + x1 * x1 + y0 * y0 + y0 * y1 + y1 * y1);
        denominator += cross;
    }
    if denominator == 0.0 {
        return 0.0;
    }
    mass * numerator / (6.0 * denominator)
}

/// Get the axis-aligned bounding box for a body, accounting for position.
pub fn get_shape_aabb(body: &RigidBody) -> (f32, f32, f32, f32) {
    match &body.shape {
        Shape::Circle { radius } => (
            body.x - radius,
            body.y - radius,
            body.x + radius,
            body.y + radius,
        ),
        Shape::AABB { half_w, half_h } => {
            if body.angle.abs() < 1e-6 {
                (
                    body.x - half_w,
                    body.y - half_h,
                    body.x + half_w,
                    body.y + half_h,
                )
            } else {
                // Rotated AABB: compute bounding box of rotated corners
                let cos = body.angle.cos();
                let sin = body.angle.sin();
                let hw = (half_w * cos.abs()) + (half_h * sin.abs());
                let hh = (half_w * sin.abs()) + (half_h * cos.abs());
                (body.x - hw, body.y - hh, body.x + hw, body.y + hh)
            }
        }
        Shape::Polygon { vertices } => {
            if vertices.is_empty() {
                return (body.x, body.y, body.x, body.y);
            }
            let cos = body.angle.cos();
            let sin = body.angle.sin();
            let mut min_x = f32::MAX;
            let mut min_y = f32::MAX;
            let mut max_x = f32::MIN;
            let mut max_y = f32::MIN;
            for &(vx, vy) in vertices {
                let rx = vx * cos - vy * sin + body.x;
                let ry = vx * sin + vy * cos + body.y;
                min_x = min_x.min(rx);
                min_y = min_y.min(ry);
                max_x = max_x.max(rx);
                max_y = max_y.max(ry);
            }
            (min_x, min_y, max_x, max_y)
        }
    }
}
