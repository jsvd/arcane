use super::types::{Contact, ContactID, ContactManifold, ManifoldPoint, RigidBody, Shape};

/// Test collision between two rigid bodies. Returns a contact if overlapping.
/// Contact normal always points from body_a toward body_b.
pub fn test_collision(a: &RigidBody, b: &RigidBody) -> Option<Contact> {
    match (&a.shape, &b.shape) {
        (Shape::Circle { .. }, Shape::Circle { .. }) => circle_vs_circle(a, b),
        (Shape::Circle { .. }, Shape::AABB { .. }) => circle_vs_aabb(a, b, false),
        (Shape::AABB { .. }, Shape::Circle { .. }) => circle_vs_aabb(b, a, true),
        (Shape::AABB { .. }, Shape::AABB { .. }) => aabb_vs_aabb(a, b),
        (Shape::Polygon { .. }, Shape::Polygon { .. }) => polygon_vs_polygon(a, b),
        (Shape::Circle { .. }, Shape::Polygon { .. }) => circle_vs_polygon(a, b, false),
        (Shape::Polygon { .. }, Shape::Circle { .. }) => circle_vs_polygon(b, a, true),
        (Shape::AABB { .. }, Shape::Polygon { .. }) => aabb_vs_polygon(a, b, false),
        (Shape::Polygon { .. }, Shape::AABB { .. }) => aabb_vs_polygon(b, a, true),
    }
}

fn circle_vs_circle(a: &RigidBody, b: &RigidBody) -> Option<Contact> {
    let ra = match a.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let rb = match b.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };

    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist_sq = dx * dx + dy * dy;
    let sum_r = ra + rb;

    if dist_sq >= sum_r * sum_r {
        return None;
    }

    let dist = dist_sq.sqrt();
    let (nx, ny) = if dist > 1e-8 {
        (dx / dist, dy / dist)
    } else {
        (1.0, 0.0)
    };

    Some(Contact {
        body_a: a.id,
        body_b: b.id,
        normal: (nx, ny),
        penetration: sum_r - dist,
        contact_point: (
            a.x + nx * (ra - (sum_r - dist) * 0.5),
            a.y + ny * (ra - (sum_r - dist) * 0.5),
        ),
        accumulated_jn: 0.0,
        accumulated_jt: 0.0,
        velocity_bias: 0.0,
        tangent: (0.0, 0.0),
    })
}

/// Circle vs AABB. `swapped` means the original call had AABB as body_a.
fn circle_vs_aabb(circle: &RigidBody, aabb: &RigidBody, swapped: bool) -> Option<Contact> {
    let radius = match circle.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let (hw, hh) = match aabb.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    // Transform circle center into AABB local space
    let local_x = circle.x - aabb.x;
    let local_y = circle.y - aabb.y;

    // Closest point on AABB to circle center
    let closest_x = local_x.clamp(-hw, hw);
    let closest_y = local_y.clamp(-hh, hh);

    let dx = local_x - closest_x;
    let dy = local_y - closest_y;
    let dist_sq = dx * dx + dy * dy;

    if dist_sq >= radius * radius {
        return None;
    }

    // Check if circle center is inside the AABB
    let inside = local_x.abs() < hw && local_y.abs() < hh;

    let (nx, ny, penetration) = if inside {
        // Push circle out along the axis of least penetration
        let overlap_x = hw - local_x.abs();
        let overlap_y = hh - local_y.abs();
        if overlap_x < overlap_y {
            let nx = if local_x >= 0.0 { 1.0 } else { -1.0 };
            (nx, 0.0, overlap_x + radius)
        } else {
            let ny = if local_y >= 0.0 { 1.0 } else { -1.0 };
            (0.0, ny, overlap_y + radius)
        }
    } else {
        let dist = dist_sq.sqrt();
        let nx = if dist > 1e-8 { dx / dist } else { 1.0 };
        let ny = if dist > 1e-8 { dy / dist } else { 0.0 };
        (nx, ny, radius - dist)
    };

    let contact_x = aabb.x + closest_x;
    let contact_y = aabb.y + closest_y;

    if swapped {
        // Original: AABB=a, Circle=b. Normal should point from a to b.
        Some(Contact {
            body_a: aabb.id,
            body_b: circle.id,
            normal: (nx, ny),
            penetration,
            contact_point: (contact_x, contact_y),
            accumulated_jn: 0.0,
            accumulated_jt: 0.0,
            velocity_bias: 0.0,
            tangent: (0.0, 0.0),
        })
    } else {
        // Original: Circle=a, AABB=b. Normal should point from a to b (opposite).
        Some(Contact {
            body_a: circle.id,
            body_b: aabb.id,
            normal: (-nx, -ny),
            penetration,
            contact_point: (contact_x, contact_y),
            accumulated_jn: 0.0,
            accumulated_jt: 0.0,
            velocity_bias: 0.0,
            tangent: (0.0, 0.0),
        })
    }
}

fn aabb_vs_aabb(a: &RigidBody, b: &RigidBody) -> Option<Contact> {
    let (ahw, ahh) = match a.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };
    let (bhw, bhh) = match b.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let overlap_x = (ahw + bhw) - dx.abs();
    let overlap_y = (ahh + bhh) - dy.abs();

    if overlap_x <= 0.0 || overlap_y <= 0.0 {
        return None;
    }

    let (nx, ny, penetration) = if overlap_x < overlap_y {
        let nx = if dx >= 0.0 { 1.0 } else { -1.0 };
        (nx, 0.0, overlap_x)
    } else {
        let ny = if dy >= 0.0 { 1.0 } else { -1.0 };
        (0.0, ny, overlap_y)
    };

    // Contact point on the actual collision surface
    let (cpx, cpy) = if overlap_x < overlap_y {
        // Minimum separation on X axis — contact at A's X edge
        let cx = if dx >= 0.0 { a.x + ahw } else { a.x - ahw };
        let y_min = (a.y - ahh).max(b.y - bhh);
        let y_max = (a.y + ahh).min(b.y + bhh);
        (cx, (y_min + y_max) * 0.5)
    } else {
        // Minimum separation on Y axis — contact at A's Y edge
        let cy = if dy >= 0.0 { a.y + ahh } else { a.y - ahh };
        let x_min = (a.x - ahw).max(b.x - bhw);
        let x_max = (a.x + ahw).min(b.x + bhw);
        ((x_min + x_max) * 0.5, cy)
    };

    Some(Contact {
        body_a: a.id,
        body_b: b.id,
        normal: (nx, ny),
        penetration,
        contact_point: (cpx, cpy),
        accumulated_jn: 0.0,
        accumulated_jt: 0.0,
        velocity_bias: 0.0,
        tangent: (0.0, 0.0),
    })
}

/// Get world-space vertices for a polygon body.
fn get_world_vertices(body: &RigidBody) -> Vec<(f32, f32)> {
    let verts = match &body.shape {
        Shape::Polygon { vertices } => vertices,
        _ => return Vec::new(),
    };
    let cos = body.angle.cos();
    let sin = body.angle.sin();
    verts
        .iter()
        .map(|&(vx, vy)| {
            (
                vx * cos - vy * sin + body.x,
                vx * sin + vy * cos + body.y,
            )
        })
        .collect()
}

/// Get edge normals for a set of vertices.
fn get_edge_normals(vertices: &[(f32, f32)]) -> Vec<(f32, f32)> {
    let n = vertices.len();
    let mut normals = Vec::with_capacity(n);
    for i in 0..n {
        let (x0, y0) = vertices[i];
        let (x1, y1) = vertices[(i + 1) % n];
        let ex = x1 - x0;
        let ey = y1 - y0;
        let len = (ex * ex + ey * ey).sqrt();
        if len > 1e-8 {
            normals.push((ey / len, -ex / len));
        }
    }
    normals
}

/// Project vertices onto an axis, returning (min, max).
fn project_vertices(vertices: &[(f32, f32)], axis: (f32, f32)) -> (f32, f32) {
    let mut min = f32::MAX;
    let mut max = f32::MIN;
    for &(vx, vy) in vertices {
        let p = vx * axis.0 + vy * axis.1;
        min = min.min(p);
        max = max.max(p);
    }
    (min, max)
}

fn polygon_vs_polygon(a: &RigidBody, b: &RigidBody) -> Option<Contact> {
    let verts_a = get_world_vertices(a);
    let verts_b = get_world_vertices(b);
    if verts_a.len() < 3 || verts_b.len() < 3 {
        return None;
    }

    let normals_a = get_edge_normals(&verts_a);
    let normals_b = get_edge_normals(&verts_b);

    let mut min_overlap = f32::MAX;
    let mut min_axis = (0.0f32, 0.0f32);

    for &axis in normals_a.iter().chain(normals_b.iter()) {
        let (min_a, max_a) = project_vertices(&verts_a, axis);
        let (min_b, max_b) = project_vertices(&verts_b, axis);

        let overlap = (max_a.min(max_b)) - (min_a.max(min_b));
        if overlap <= 0.0 {
            return None;
        }
        if overlap < min_overlap {
            min_overlap = overlap;
            min_axis = axis;
        }
    }

    // Ensure normal points from a to b
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    if dx * min_axis.0 + dy * min_axis.1 < 0.0 {
        min_axis = (-min_axis.0, -min_axis.1);
    }

    // Contact point: deepest penetrating vertex of B along -normal
    let mut best_dot = f32::MAX;
    let mut best_point = ((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    for &(vx, vy) in &verts_b {
        let d = vx * min_axis.0 + vy * min_axis.1;
        if d < best_dot {
            best_dot = d;
            best_point = (vx, vy);
        }
    }

    Some(Contact {
        body_a: a.id,
        body_b: b.id,
        normal: min_axis,
        penetration: min_overlap,
        contact_point: best_point,
        accumulated_jn: 0.0,
        accumulated_jt: 0.0,
        velocity_bias: 0.0,
        tangent: (0.0, 0.0),
    })
}

fn circle_vs_polygon(circle: &RigidBody, poly: &RigidBody, swapped: bool) -> Option<Contact> {
    let radius = match circle.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let verts = get_world_vertices(poly);
    if verts.len() < 3 {
        return None;
    }

    // Find closest point on polygon to circle center
    let mut closest_dist_sq = f32::MAX;
    let mut closest_point = (0.0f32, 0.0f32);

    let n = verts.len();
    for i in 0..n {
        let (ax, ay) = verts[i];
        let (bx, by) = verts[(i + 1) % n];
        let (cx, cy) = closest_point_on_segment(circle.x, circle.y, ax, ay, bx, by);
        let dx = circle.x - cx;
        let dy = circle.y - cy;
        let d2 = dx * dx + dy * dy;
        if d2 < closest_dist_sq {
            closest_dist_sq = d2;
            closest_point = (cx, cy);
        }
    }

    // Check if circle center is inside polygon
    let inside = point_in_polygon(circle.x, circle.y, &verts);

    let dist = closest_dist_sq.sqrt();

    if !inside && dist >= radius {
        return None;
    }

    let (nx, ny, penetration) = if inside {
        // Normal from closest point to circle center, inverted
        let dx = circle.x - closest_point.0;
        let dy = circle.y - closest_point.1;
        let len = (dx * dx + dy * dy).sqrt();
        if len > 1e-8 {
            (-dx / len, -dy / len, radius + dist)
        } else {
            (1.0, 0.0, radius)
        }
    } else {
        let dx = circle.x - closest_point.0;
        let dy = circle.y - closest_point.1;
        (dx / dist, dy / dist, radius - dist)
    };

    let (ba, bb, fnx, fny) = if swapped {
        (poly.id, circle.id, -nx, -ny)
    } else {
        (circle.id, poly.id, nx, ny)
    };

    // Ensure normal points from body_a to body_b
    let dir_x = if swapped { circle.x - poly.x } else { poly.x - circle.x };
    let dir_y = if swapped { circle.y - poly.y } else { poly.y - circle.y };
    let dot = fnx * dir_x + fny * dir_y;
    let (fnx, fny) = if dot < 0.0 { (-fnx, -fny) } else { (fnx, fny) };

    Some(Contact {
        body_a: ba,
        body_b: bb,
        normal: (fnx, fny),
        penetration,
        contact_point: closest_point,
        accumulated_jn: 0.0,
        accumulated_jt: 0.0,
        velocity_bias: 0.0,
        tangent: (0.0, 0.0),
    })
}

fn aabb_vs_polygon(aabb: &RigidBody, poly: &RigidBody, swapped: bool) -> Option<Contact> {
    let (hw, hh) = match aabb.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    // Convert AABB to polygon and use polygon-polygon
    let aabb_as_poly = RigidBody {
        shape: Shape::Polygon {
            vertices: vec![(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)],
        },
        ..aabb.clone()
    };

    let result = polygon_vs_polygon(&aabb_as_poly, poly)?;

    if swapped {
        Some(Contact {
            body_a: poly.id,
            body_b: aabb.id,
            normal: (-result.normal.0, -result.normal.1),
            penetration: result.penetration,
            contact_point: result.contact_point,
            accumulated_jn: 0.0,
            accumulated_jt: 0.0,
            velocity_bias: 0.0,
            tangent: (0.0, 0.0),
        })
    } else {
        Some(Contact {
            body_a: aabb.id,
            body_b: poly.id,
            ..result
        })
    }
}

fn closest_point_on_segment(
    px: f32, py: f32,
    ax: f32, ay: f32,
    bx: f32, by: f32,
) -> (f32, f32) {
    let abx = bx - ax;
    let aby = by - ay;
    let apx = px - ax;
    let apy = py - ay;
    let ab_sq = abx * abx + aby * aby;
    if ab_sq < 1e-12 {
        return (ax, ay);
    }
    let t = ((apx * abx + apy * aby) / ab_sq).clamp(0.0, 1.0);
    (ax + abx * t, ay + aby * t)
}

fn point_in_polygon(px: f32, py: f32, verts: &[(f32, f32)]) -> bool {
    let n = verts.len();
    let mut inside = false;
    let mut j = n - 1;
    for i in 0..n {
        let (xi, yi) = verts[i];
        let (xj, yj) = verts[j];
        if ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside;
        }
        j = i;
    }
    inside
}

// ============================================================================
// Contact Manifold Generation (TGS Soft Phase 1)
// ============================================================================

/// Test collision between two bodies and return a contact manifold.
/// This is the new entry point that generates proper 2-point manifolds using
/// Sutherland-Hodgman clipping for polygon-polygon collisions.
pub fn test_collision_manifold(a: &RigidBody, b: &RigidBody) -> Option<ContactManifold> {
    match (&a.shape, &b.shape) {
        (Shape::Circle { .. }, Shape::Circle { .. }) => circle_vs_circle_manifold(a, b),
        (Shape::Circle { .. }, Shape::AABB { .. }) => circle_vs_aabb_manifold(a, b, false),
        (Shape::AABB { .. }, Shape::Circle { .. }) => circle_vs_aabb_manifold(b, a, true),
        (Shape::AABB { .. }, Shape::AABB { .. }) => aabb_vs_aabb_manifold(a, b),
        (Shape::Polygon { .. }, Shape::Polygon { .. }) => polygon_vs_polygon_manifold(a, b),
        (Shape::Circle { .. }, Shape::Polygon { .. }) => circle_vs_polygon_manifold(a, b, false),
        (Shape::Polygon { .. }, Shape::Circle { .. }) => circle_vs_polygon_manifold(b, a, true),
        (Shape::AABB { .. }, Shape::Polygon { .. }) => aabb_vs_polygon_manifold(a, b, false),
        (Shape::Polygon { .. }, Shape::AABB { .. }) => aabb_vs_polygon_manifold(b, a, true),
    }
}

/// Transform a world-space point to body-local space
fn world_to_local(body: &RigidBody, wx: f32, wy: f32) -> (f32, f32) {
    let dx = wx - body.x;
    let dy = wy - body.y;
    let cos = body.angle.cos();
    let sin = body.angle.sin();
    // Inverse rotation
    (dx * cos + dy * sin, -dx * sin + dy * cos)
}

fn circle_vs_circle_manifold(a: &RigidBody, b: &RigidBody) -> Option<ContactManifold> {
    let ra = match a.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let rb = match b.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };

    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist_sq = dx * dx + dy * dy;
    let sum_r = ra + rb;

    if dist_sq >= sum_r * sum_r {
        return None;
    }

    let dist = dist_sq.sqrt();
    let (nx, ny) = if dist > 1e-8 {
        (dx / dist, dy / dist)
    } else {
        (1.0, 0.0)
    };

    let penetration = sum_r - dist;

    // World-space contact point
    let cpx = a.x + nx * (ra - penetration * 0.5);
    let cpy = a.y + ny * (ra - penetration * 0.5);

    // Convert to body-local anchors
    let local_a = world_to_local(a, cpx, cpy);
    let local_b = world_to_local(b, cpx, cpy);

    Some(ContactManifold {
        body_a: a.id,
        body_b: b.id,
        normal: (nx, ny),
        points: vec![ManifoldPoint::new(local_a, local_b, penetration, ContactID::circle())],
        tangent: (-ny, nx),
        velocity_bias: 0.0,
    })
}

fn circle_vs_aabb_manifold(circle: &RigidBody, aabb: &RigidBody, swapped: bool) -> Option<ContactManifold> {
    let radius = match circle.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let (hw, hh) = match aabb.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    let local_x = circle.x - aabb.x;
    let local_y = circle.y - aabb.y;

    let closest_x = local_x.clamp(-hw, hw);
    let closest_y = local_y.clamp(-hh, hh);

    let dx = local_x - closest_x;
    let dy = local_y - closest_y;
    let dist_sq = dx * dx + dy * dy;

    if dist_sq >= radius * radius {
        return None;
    }

    let inside = local_x.abs() < hw && local_y.abs() < hh;

    let (nx, ny, penetration) = if inside {
        let overlap_x = hw - local_x.abs();
        let overlap_y = hh - local_y.abs();
        if overlap_x < overlap_y {
            let nx = if local_x >= 0.0 { 1.0 } else { -1.0 };
            (nx, 0.0, overlap_x + radius)
        } else {
            let ny = if local_y >= 0.0 { 1.0 } else { -1.0 };
            (0.0, ny, overlap_y + radius)
        }
    } else {
        let dist = dist_sq.sqrt();
        let nx = if dist > 1e-8 { dx / dist } else { 1.0 };
        let ny = if dist > 1e-8 { dy / dist } else { 0.0 };
        (nx, ny, radius - dist)
    };

    let cpx = aabb.x + closest_x;
    let cpy = aabb.y + closest_y;

    let (body_a, body_b, fnx, fny) = if swapped {
        (aabb, circle, nx, ny)
    } else {
        (circle, aabb, -nx, -ny)
    };

    let local_a = world_to_local(body_a, cpx, cpy);
    let local_b = world_to_local(body_b, cpx, cpy);

    Some(ContactManifold {
        body_a: body_a.id,
        body_b: body_b.id,
        normal: (fnx, fny),
        points: vec![ManifoldPoint::new(local_a, local_b, penetration, ContactID::circle())],
        tangent: (-fny, fnx),
        velocity_bias: 0.0,
    })
}

fn aabb_vs_aabb_manifold(a: &RigidBody, b: &RigidBody) -> Option<ContactManifold> {
    let (ahw, ahh) = match a.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };
    let (bhw, bhh) = match b.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let overlap_x = (ahw + bhw) - dx.abs();
    let overlap_y = (ahh + bhh) - dy.abs();

    if overlap_x <= 0.0 || overlap_y <= 0.0 {
        return None;
    }

    // Choose axis of minimum penetration
    if overlap_x < overlap_y {
        // X-axis separation (vertical edge contact)
        let nx = if dx >= 0.0 { 1.0 } else { -1.0 };

        // Contact edge X position
        let cx = if dx >= 0.0 { a.x + ahw } else { a.x - ahw };

        // Y range of overlap
        let y_min = (a.y - ahh).max(b.y - bhh);
        let y_max = (a.y + ahh).min(b.y + bhh);

        // Two contact points at overlap corners
        let mut points = Vec::with_capacity(2);

        let cp1 = (cx, y_min);
        let local_a1 = world_to_local(a, cp1.0, cp1.1);
        let local_b1 = world_to_local(b, cp1.0, cp1.1);
        points.push(ManifoldPoint::new(local_a1, local_b1, overlap_x, ContactID::new(0, 0, 0)));

        let cp2 = (cx, y_max);
        let local_a2 = world_to_local(a, cp2.0, cp2.1);
        let local_b2 = world_to_local(b, cp2.0, cp2.1);
        points.push(ManifoldPoint::new(local_a2, local_b2, overlap_x, ContactID::new(0, 0, 1)));

        Some(ContactManifold {
            body_a: a.id,
            body_b: b.id,
            normal: (nx, 0.0),
            points,
            tangent: (0.0, 1.0),
            velocity_bias: 0.0,
        })
    } else {
        // Y-axis separation (horizontal edge contact)
        let ny = if dy >= 0.0 { 1.0 } else { -1.0 };

        // Contact edge Y position
        let cy = if dy >= 0.0 { a.y + ahh } else { a.y - ahh };

        // X range of overlap
        let x_min = (a.x - ahw).max(b.x - bhw);
        let x_max = (a.x + ahw).min(b.x + bhw);

        // Two contact points at overlap corners
        let mut points = Vec::with_capacity(2);

        let cp1 = (x_min, cy);
        let local_a1 = world_to_local(a, cp1.0, cp1.1);
        let local_b1 = world_to_local(b, cp1.0, cp1.1);
        points.push(ManifoldPoint::new(local_a1, local_b1, overlap_y, ContactID::new(1, 1, 0)));

        let cp2 = (x_max, cy);
        let local_a2 = world_to_local(a, cp2.0, cp2.1);
        let local_b2 = world_to_local(b, cp2.0, cp2.1);
        points.push(ManifoldPoint::new(local_a2, local_b2, overlap_y, ContactID::new(1, 1, 1)));

        Some(ContactManifold {
            body_a: a.id,
            body_b: b.id,
            normal: (0.0, ny),
            points,
            tangent: (1.0, 0.0),
            velocity_bias: 0.0,
        })
    }
}

/// Find the edge with maximum separation between two polygons (SAT).
/// Returns (separation, edge_index) where edge_index is on polygon `a`.
fn find_max_separation(
    a_verts: &[(f32, f32)],
    b_verts: &[(f32, f32)],
) -> (f32, usize) {
    let mut max_sep = f32::MIN;
    let mut best_edge = 0;

    let n = a_verts.len();
    for i in 0..n {
        let v0 = a_verts[i];
        let v1 = a_verts[(i + 1) % n];

        // Outward edge normal
        let ex = v1.0 - v0.0;
        let ey = v1.1 - v0.1;
        let len = (ex * ex + ey * ey).sqrt();
        if len < 1e-8 {
            continue;
        }
        let nx = ey / len;
        let ny = -ex / len;

        // Find support point on B in direction -n
        let mut min_dot = f32::MAX;
        for &bv in b_verts {
            let d = (bv.0 - v0.0) * nx + (bv.1 - v0.1) * ny;
            min_dot = min_dot.min(d);
        }

        // min_dot is the separation along this axis (negative = overlap)
        if min_dot > max_sep {
            max_sep = min_dot;
            best_edge = i;
        }
    }

    (max_sep, best_edge)
}

/// Find the edge on the incident polygon that is most anti-parallel to the reference normal.
fn find_incident_edge(
    inc_verts: &[(f32, f32)],
    ref_normal: (f32, f32),
) -> usize {
    let n = inc_verts.len();
    let mut min_dot = f32::MAX;
    let mut best_edge = 0;

    for i in 0..n {
        let v0 = inc_verts[i];
        let v1 = inc_verts[(i + 1) % n];

        // Edge normal (outward)
        let ex = v1.0 - v0.0;
        let ey = v1.1 - v0.1;
        let len = (ex * ex + ey * ey).sqrt();
        if len < 1e-8 {
            continue;
        }
        let nx = ey / len;
        let ny = -ex / len;

        // Most anti-parallel to reference normal
        let dot = nx * ref_normal.0 + ny * ref_normal.1;
        if dot < min_dot {
            min_dot = dot;
            best_edge = i;
        }
    }

    best_edge
}

/// Clip a line segment against a half-plane defined by the line passing through
/// `line_point` with normal `normal`. Points are kept if they're on the positive side.
/// Returns up to 2 clipped points.
fn clip_segment_to_line(
    v0: (f32, f32),
    v1: (f32, f32),
    line_point: (f32, f32),
    normal: (f32, f32),
) -> Vec<(f32, f32)> {
    let mut result = Vec::with_capacity(2);

    // Distance from line (positive = inside)
    let d0 = (v0.0 - line_point.0) * normal.0 + (v0.1 - line_point.1) * normal.1;
    let d1 = (v1.0 - line_point.0) * normal.0 + (v1.1 - line_point.1) * normal.1;

    // Keep points inside
    if d0 >= 0.0 {
        result.push(v0);
    }
    if d1 >= 0.0 {
        result.push(v1);
    }

    // If they're on opposite sides, compute intersection
    if d0 * d1 < 0.0 {
        let t = d0 / (d0 - d1);
        let cx = v0.0 + t * (v1.0 - v0.0);
        let cy = v0.1 + t * (v1.1 - v0.1);
        result.push((cx, cy));
    }

    result
}

/// Sutherland-Hodgman polygon clipping for polygon-polygon collision.
/// Generates a proper 2-point contact manifold.
fn polygon_vs_polygon_manifold(a: &RigidBody, b: &RigidBody) -> Option<ContactManifold> {
    let verts_a = get_world_vertices(a);
    let verts_b = get_world_vertices(b);

    if verts_a.len() < 3 || verts_b.len() < 3 {
        return None;
    }

    // Find axes of minimum penetration for both polygons
    let (sep_a, edge_a) = find_max_separation(&verts_a, &verts_b);
    let (sep_b, edge_b) = find_max_separation(&verts_b, &verts_a);

    // If either is positive, no collision
    if sep_a > 0.0 || sep_b > 0.0 {
        return None;
    }

    // Choose reference face (the one with smaller penetration = larger separation)
    // Use a small bias to prefer A when close to equal
    let (ref_verts, inc_verts, ref_edge, ref_body, inc_body, flip) = if sep_a > sep_b - 0.001 {
        (&verts_a, &verts_b, edge_a, a, b, false)
    } else {
        (&verts_b, &verts_a, edge_b, b, a, true)
    };

    let n = ref_verts.len();
    let ref_v0 = ref_verts[ref_edge];
    let ref_v1 = ref_verts[(ref_edge + 1) % n];

    // Reference face normal (outward)
    let ref_ex = ref_v1.0 - ref_v0.0;
    let ref_ey = ref_v1.1 - ref_v0.1;
    let ref_len = (ref_ex * ref_ex + ref_ey * ref_ey).sqrt();
    if ref_len < 1e-8 {
        return None;
    }
    let ref_nx = ref_ey / ref_len;
    let ref_ny = -ref_ex / ref_len;

    // Reference face tangent (along edge)
    let ref_tx = ref_ex / ref_len;
    let ref_ty = ref_ey / ref_len;

    // Find incident edge
    let inc_edge = find_incident_edge(inc_verts, (ref_nx, ref_ny));
    let inc_n = inc_verts.len();
    let inc_v0 = inc_verts[inc_edge];
    let inc_v1 = inc_verts[(inc_edge + 1) % inc_n];

    // Clip incident edge against side planes of reference face
    // The side planes are perpendicular to the reference edge at its endpoints.
    // We want to keep points BETWEEN the two endpoints, so:
    // - At ref_v0: keep points in the +tangent direction (toward ref_v1)
    // - At ref_v1: keep points in the -tangent direction (toward ref_v0)

    // Side plane 1: at ref_v0, normal = +tangent (keeps points toward ref_v1)
    let mut clipped = clip_segment_to_line(inc_v0, inc_v1, ref_v0, (ref_tx, ref_ty));

    if clipped.len() < 2 {
        // Degenerate case - use single point
        if clipped.is_empty() {
            return None;
        }
    }

    // Side plane 2: at ref_v1, normal = -tangent (keeps points toward ref_v0)
    if clipped.len() >= 2 {
        clipped = clip_segment_to_line(clipped[0], clipped[1], ref_v1, (-ref_tx, -ref_ty));
    }

    // Keep only points behind reference face
    let mut points = Vec::with_capacity(2);
    for (i, &cp) in clipped.iter().enumerate() {
        // Distance behind reference face
        let sep = (cp.0 - ref_v0.0) * ref_nx + (cp.1 - ref_v0.1) * ref_ny;

        if sep <= 0.0 {
            // Penetration = -sep
            let penetration = -sep;

            let (local_a, local_b) = if flip {
                (world_to_local(inc_body, cp.0, cp.1), world_to_local(ref_body, cp.0, cp.1))
            } else {
                (world_to_local(ref_body, cp.0, cp.1), world_to_local(inc_body, cp.0, cp.1))
            };

            let id = ContactID::new(ref_edge as u8, inc_edge as u8, i as u8);
            points.push(ManifoldPoint::new(local_a, local_b, penetration, id));
        }
    }

    if points.is_empty() {
        return None;
    }

    // Build final normal pointing from A to B
    let (final_nx, final_ny) = if flip {
        (-ref_nx, -ref_ny)
    } else {
        (ref_nx, ref_ny)
    };

    // Ensure normal points from A toward B
    let dir_x = b.x - a.x;
    let dir_y = b.y - a.y;
    let (final_nx, final_ny) = if dir_x * final_nx + dir_y * final_ny < 0.0 {
        (-final_nx, -final_ny)
    } else {
        (final_nx, final_ny)
    };

    Some(ContactManifold {
        body_a: a.id,
        body_b: b.id,
        normal: (final_nx, final_ny),
        points,
        tangent: (-final_ny, final_nx),
        velocity_bias: 0.0,
    })
}

fn circle_vs_polygon_manifold(circle: &RigidBody, poly: &RigidBody, swapped: bool) -> Option<ContactManifold> {
    let radius = match circle.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let verts = get_world_vertices(poly);
    if verts.len() < 3 {
        return None;
    }

    // Find closest point on polygon to circle center
    let mut closest_dist_sq = f32::MAX;
    let mut closest_point = (0.0f32, 0.0f32);

    let n = verts.len();
    for i in 0..n {
        let (ax, ay) = verts[i];
        let (bx, by) = verts[(i + 1) % n];
        let (cx, cy) = closest_point_on_segment(circle.x, circle.y, ax, ay, bx, by);
        let dx = circle.x - cx;
        let dy = circle.y - cy;
        let d2 = dx * dx + dy * dy;
        if d2 < closest_dist_sq {
            closest_dist_sq = d2;
            closest_point = (cx, cy);
        }
    }

    let inside = point_in_polygon(circle.x, circle.y, &verts);
    let dist = closest_dist_sq.sqrt();

    if !inside && dist >= radius {
        return None;
    }

    let (nx, ny, penetration) = if inside {
        let dx = circle.x - closest_point.0;
        let dy = circle.y - closest_point.1;
        let len = (dx * dx + dy * dy).sqrt();
        if len > 1e-8 {
            (-dx / len, -dy / len, radius + dist)
        } else {
            (1.0, 0.0, radius)
        }
    } else {
        let dx = circle.x - closest_point.0;
        let dy = circle.y - closest_point.1;
        (dx / dist, dy / dist, radius - dist)
    };

    let (body_a, body_b, fnx, fny) = if swapped {
        (poly, circle, -nx, -ny)
    } else {
        (circle, poly, nx, ny)
    };

    // Ensure normal points from body_a to body_b
    let dir_x = body_b.x - body_a.x;
    let dir_y = body_b.y - body_a.y;
    let (fnx, fny) = if fnx * dir_x + fny * dir_y < 0.0 {
        (-fnx, -fny)
    } else {
        (fnx, fny)
    };

    let local_a = world_to_local(body_a, closest_point.0, closest_point.1);
    let local_b = world_to_local(body_b, closest_point.0, closest_point.1);

    Some(ContactManifold {
        body_a: body_a.id,
        body_b: body_b.id,
        normal: (fnx, fny),
        points: vec![ManifoldPoint::new(local_a, local_b, penetration, ContactID::circle())],
        tangent: (-fny, fnx),
        velocity_bias: 0.0,
    })
}

fn aabb_vs_polygon_manifold(aabb: &RigidBody, poly: &RigidBody, swapped: bool) -> Option<ContactManifold> {
    let (hw, hh) = match aabb.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    // Convert AABB to polygon and use polygon-polygon collision
    let aabb_as_poly = RigidBody {
        shape: Shape::Polygon {
            vertices: vec![(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)],
        },
        ..aabb.clone()
    };

    let mut manifold = polygon_vs_polygon_manifold(&aabb_as_poly, poly)?;

    if swapped {
        // Swap body IDs and flip normal
        std::mem::swap(&mut manifold.body_a, &mut manifold.body_b);
        manifold.normal = (-manifold.normal.0, -manifold.normal.1);
        manifold.tangent = (-manifold.tangent.0, -manifold.tangent.1);

        // Swap local anchors in each point
        for point in &mut manifold.points {
            std::mem::swap(&mut point.local_a, &mut point.local_b);
        }
    } else {
        // Fix body IDs (we used aabb_as_poly which has same id as aabb)
        manifold.body_a = aabb.id;
    }

    Some(manifold)
}

// ============================================================================
// Speculative Contact Detection (TGS Soft Phase 3)
// ============================================================================

/// Test collision between two bodies with speculative contact detection.
/// If bodies are separated but within the speculative margin, generates a
/// contact with negative penetration (representing the separation distance).
/// This prevents tunneling for fast-moving objects.
pub fn test_collision_manifold_speculative(
    a: &RigidBody,
    b: &RigidBody,
    margin: f32,
) -> Option<ContactManifold> {
    // First try normal collision detection
    if let Some(manifold) = test_collision_manifold(a, b) {
        return Some(manifold);
    }

    // If no collision, check if bodies are close enough for speculative contact
    // Use shape-specific separation distance calculation
    match (&a.shape, &b.shape) {
        (Shape::Circle { .. }, Shape::Circle { .. }) => {
            circle_vs_circle_speculative(a, b, margin)
        }
        (Shape::Circle { .. }, Shape::AABB { .. }) => {
            circle_vs_aabb_speculative(a, b, margin, false)
        }
        (Shape::AABB { .. }, Shape::Circle { .. }) => {
            circle_vs_aabb_speculative(b, a, margin, true)
        }
        (Shape::AABB { .. }, Shape::AABB { .. }) => {
            aabb_vs_aabb_speculative(a, b, margin)
        }
        (Shape::Polygon { .. }, Shape::Polygon { .. }) => {
            polygon_vs_polygon_speculative(a, b, margin)
        }
        (Shape::Circle { .. }, Shape::Polygon { .. }) => {
            circle_vs_polygon_speculative(a, b, margin, false)
        }
        (Shape::Polygon { .. }, Shape::Circle { .. }) => {
            circle_vs_polygon_speculative(b, a, margin, true)
        }
        // AABB vs Polygon: convert AABB and use polygon-polygon
        (Shape::AABB { half_w, half_h }, Shape::Polygon { .. }) => {
            let aabb_as_poly = RigidBody {
                shape: Shape::Polygon {
                    vertices: vec![(-half_w, -half_h), (*half_w, -half_h), (*half_w, *half_h), (-half_w, *half_h)],
                },
                ..a.clone()
            };
            let mut result = polygon_vs_polygon_speculative(&aabb_as_poly, b, margin)?;
            result.body_a = a.id;
            Some(result)
        }
        (Shape::Polygon { .. }, Shape::AABB { half_w, half_h }) => {
            let aabb_as_poly = RigidBody {
                shape: Shape::Polygon {
                    vertices: vec![(-half_w, -half_h), (*half_w, -half_h), (*half_w, *half_h), (-half_w, *half_h)],
                },
                ..b.clone()
            };
            let mut result = polygon_vs_polygon_speculative(a, &aabb_as_poly, margin)?;
            result.body_b = b.id;
            Some(result)
        }
    }
}

/// Speculative circle vs circle: compute separation and create contact if within margin.
fn circle_vs_circle_speculative(a: &RigidBody, b: &RigidBody, margin: f32) -> Option<ContactManifold> {
    let ra = match a.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let rb = match b.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };

    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = (dx * dx + dy * dy).sqrt();
    let sum_r = ra + rb;
    let separation = dist - sum_r;

    // Only create speculative contact if separated but within margin
    if separation <= 0.0 || separation > margin {
        return None;
    }

    // Normal from a to b
    let (nx, ny) = if dist > 1e-8 {
        (dx / dist, dy / dist)
    } else {
        (1.0, 0.0)
    };

    // Contact point: midpoint between closest surface points
    let cpx = a.x + nx * ra;
    let cpy = a.y + ny * ra;

    let local_a = world_to_local(a, cpx, cpy);
    let local_b = world_to_local(b, cpx, cpy);

    // Negative penetration = separation distance
    Some(ContactManifold {
        body_a: a.id,
        body_b: b.id,
        normal: (nx, ny),
        points: vec![ManifoldPoint::new(local_a, local_b, -separation, ContactID::circle())],
        tangent: (-ny, nx),
        velocity_bias: 0.0,
    })
}

/// Speculative circle vs AABB.
fn circle_vs_aabb_speculative(
    circle: &RigidBody,
    aabb: &RigidBody,
    margin: f32,
    swapped: bool,
) -> Option<ContactManifold> {
    let radius = match circle.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let (hw, hh) = match aabb.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    // Circle center in AABB local space
    let local_x = circle.x - aabb.x;
    let local_y = circle.y - aabb.y;

    // Closest point on AABB to circle center
    let closest_x = local_x.clamp(-hw, hw);
    let closest_y = local_y.clamp(-hh, hh);

    let dx = local_x - closest_x;
    let dy = local_y - closest_y;
    let dist_sq = dx * dx + dy * dy;
    let dist = dist_sq.sqrt();

    // Separation = distance from closest point to circle surface
    let separation = dist - radius;

    // Only speculative if separated but within margin
    if separation <= 0.0 || separation > margin {
        return None;
    }

    // Normal from AABB toward circle
    let (nx, ny) = if dist > 1e-8 {
        (dx / dist, dy / dist)
    } else {
        (1.0, 0.0)
    };

    let cpx = aabb.x + closest_x;
    let cpy = aabb.y + closest_y;

    let (body_a, body_b, fnx, fny) = if swapped {
        (aabb, circle, nx, ny)
    } else {
        (circle, aabb, -nx, -ny)
    };

    let local_a = world_to_local(body_a, cpx, cpy);
    let local_b = world_to_local(body_b, cpx, cpy);

    Some(ContactManifold {
        body_a: body_a.id,
        body_b: body_b.id,
        normal: (fnx, fny),
        points: vec![ManifoldPoint::new(local_a, local_b, -separation, ContactID::circle())],
        tangent: (-fny, fnx),
        velocity_bias: 0.0,
    })
}

/// Speculative AABB vs AABB.
fn aabb_vs_aabb_speculative(a: &RigidBody, b: &RigidBody, margin: f32) -> Option<ContactManifold> {
    let (ahw, ahh) = match a.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };
    let (bhw, bhh) = match b.shape {
        Shape::AABB { half_w, half_h } => (half_w, half_h),
        _ => return None,
    };

    let dx = b.x - a.x;
    let dy = b.y - a.y;

    // Compute separation on each axis
    let sep_x = dx.abs() - (ahw + bhw);
    let sep_y = dy.abs() - (ahh + bhh);

    // Both must be separated, and the smaller separation must be within margin
    let separation = sep_x.max(sep_y);

    if separation <= 0.0 || separation > margin {
        return None;
    }

    // Choose axis of minimum separation for the contact normal
    let (nx, ny, sep) = if sep_x > sep_y {
        // X-axis separation
        let nx = if dx >= 0.0 { 1.0 } else { -1.0 };
        (nx, 0.0, sep_x)
    } else {
        // Y-axis separation
        let ny = if dy >= 0.0 { 1.0 } else { -1.0 };
        (0.0, ny, sep_y)
    };

    // Contact point: surface of A closest to B
    let cpx = a.x + nx * ahw;
    let cpy = a.y + ny * ahh;

    let local_a = world_to_local(a, cpx, cpy);
    let local_b = world_to_local(b, cpx, cpy);

    Some(ContactManifold {
        body_a: a.id,
        body_b: b.id,
        normal: (nx, ny),
        points: vec![ManifoldPoint::new(local_a, local_b, -sep, ContactID::new(0, 0, 0))],
        tangent: (-ny, nx),
        velocity_bias: 0.0,
    })
}

/// Speculative polygon vs polygon using SAT separation.
fn polygon_vs_polygon_speculative(a: &RigidBody, b: &RigidBody, margin: f32) -> Option<ContactManifold> {
    let verts_a = get_world_vertices(a);
    let verts_b = get_world_vertices(b);

    if verts_a.len() < 3 || verts_b.len() < 3 {
        return None;
    }

    // Find minimum separation using SAT
    let (sep_a, edge_a) = find_max_separation(&verts_a, &verts_b);
    let (sep_b, edge_b) = find_max_separation(&verts_b, &verts_a);

    // Take the larger separation (both should be positive for separated polygons)
    let separation = sep_a.max(sep_b);

    // Only speculative if separated but within margin
    if separation <= 0.0 || separation > margin {
        return None;
    }

    // Use the edge with larger separation as reference
    let (ref_verts, inc_verts, ref_edge, _ref_body, _inc_body, flip) = if sep_a >= sep_b {
        (&verts_a, &verts_b, edge_a, a, b, false)
    } else {
        (&verts_b, &verts_a, edge_b, b, a, true)
    };

    // Get reference edge normal
    let n = ref_verts.len();
    let ref_v0 = ref_verts[ref_edge];
    let ref_v1 = ref_verts[(ref_edge + 1) % n];

    let ref_ex = ref_v1.0 - ref_v0.0;
    let ref_ey = ref_v1.1 - ref_v0.1;
    let ref_len = (ref_ex * ref_ex + ref_ey * ref_ey).sqrt();
    if ref_len < 1e-8 {
        return None;
    }
    let ref_nx = ref_ey / ref_len;
    let ref_ny = -ref_ex / ref_len;

    // Find closest vertex on incident polygon
    let mut min_proj = f32::MAX;
    let mut closest_point = inc_verts[0];
    for &v in inc_verts {
        let proj = (v.0 - ref_v0.0) * ref_nx + (v.1 - ref_v0.1) * ref_ny;
        if proj < min_proj {
            min_proj = proj;
            closest_point = v;
        }
    }

    // Build normal pointing from A to B
    let (final_nx, final_ny) = if flip {
        (-ref_nx, -ref_ny)
    } else {
        (ref_nx, ref_ny)
    };

    // Ensure normal points from A toward B
    let dir_x = b.x - a.x;
    let dir_y = b.y - a.y;
    let (final_nx, final_ny) = if dir_x * final_nx + dir_y * final_ny < 0.0 {
        (-final_nx, -final_ny)
    } else {
        (final_nx, final_ny)
    };

    let local_a = world_to_local(a, closest_point.0, closest_point.1);
    let local_b = world_to_local(b, closest_point.0, closest_point.1);

    Some(ContactManifold {
        body_a: a.id,
        body_b: b.id,
        normal: (final_nx, final_ny),
        points: vec![ManifoldPoint::new(local_a, local_b, -separation, ContactID::new(ref_edge as u8, 0, 0))],
        tangent: (-final_ny, final_nx),
        velocity_bias: 0.0,
    })
}

/// Speculative circle vs polygon.
fn circle_vs_polygon_speculative(
    circle: &RigidBody,
    poly: &RigidBody,
    margin: f32,
    swapped: bool,
) -> Option<ContactManifold> {
    let radius = match circle.shape {
        Shape::Circle { radius } => radius,
        _ => return None,
    };
    let verts = get_world_vertices(poly);
    if verts.len() < 3 {
        return None;
    }

    // Find closest point on polygon to circle center
    let mut closest_dist_sq = f32::MAX;
    let mut closest_point = (0.0f32, 0.0f32);

    let n = verts.len();
    for i in 0..n {
        let (ax, ay) = verts[i];
        let (bx, by) = verts[(i + 1) % n];
        let (cx, cy) = closest_point_on_segment(circle.x, circle.y, ax, ay, bx, by);
        let dx = circle.x - cx;
        let dy = circle.y - cy;
        let d2 = dx * dx + dy * dy;
        if d2 < closest_dist_sq {
            closest_dist_sq = d2;
            closest_point = (cx, cy);
        }
    }

    // Check if inside polygon (would be handled by normal collision)
    if point_in_polygon(circle.x, circle.y, &verts) {
        return None;
    }

    let dist = closest_dist_sq.sqrt();
    let separation = dist - radius;

    // Only speculative if separated but within margin
    if separation <= 0.0 || separation > margin {
        return None;
    }

    // Normal from polygon toward circle
    let dx = circle.x - closest_point.0;
    let dy = circle.y - closest_point.1;
    let (nx, ny) = if dist > 1e-8 {
        (dx / dist, dy / dist)
    } else {
        (1.0, 0.0)
    };

    let (body_a, body_b, fnx, fny) = if swapped {
        (poly, circle, -nx, -ny)
    } else {
        (circle, poly, nx, ny)
    };

    // Ensure normal points from body_a to body_b
    let dir_x = body_b.x - body_a.x;
    let dir_y = body_b.y - body_a.y;
    let (fnx, fny) = if fnx * dir_x + fny * dir_y < 0.0 {
        (-fnx, -fny)
    } else {
        (fnx, fny)
    };

    let local_a = world_to_local(body_a, closest_point.0, closest_point.1);
    let local_b = world_to_local(body_b, closest_point.0, closest_point.1);

    Some(ContactManifold {
        body_a: body_a.id,
        body_b: body_b.id,
        normal: (fnx, fny),
        points: vec![ManifoldPoint::new(local_a, local_b, -separation, ContactID::circle())],
        tangent: (-fny, fnx),
        velocity_bias: 0.0,
    })
}
