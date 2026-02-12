use super::types::{Contact, RigidBody, Shape};

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
        })
    } else {
        // Original: Circle=a, AABB=b. Normal should point from a to b (opposite).
        Some(Contact {
            body_a: circle.id,
            body_b: aabb.id,
            normal: (-nx, -ny),
            penetration,
            contact_point: (contact_x, contact_y),
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

    Some(Contact {
        body_a: a.id,
        body_b: b.id,
        normal: (nx, ny),
        penetration,
        contact_point: (
            (a.x + b.x) * 0.5,
            (a.y + b.y) * 0.5,
        ),
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

    Some(Contact {
        body_a: a.id,
        body_b: b.id,
        normal: min_axis,
        penetration: min_overlap,
        contact_point: (
            (a.x + b.x) * 0.5,
            (a.y + b.y) * 0.5,
        ),
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
    let dx = bb as f32 - ba as f32; // Just use actual body positions
    let _ = dx;
    // Normal should point from a to b
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
