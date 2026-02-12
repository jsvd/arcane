use super::types::{BodyType, Constraint, RigidBody};

/// Solve all constraints for this timestep.
pub fn solve_constraints(
    bodies: &mut [Option<RigidBody>],
    constraints: &[Constraint],
    _dt: f32,
) {
    for constraint in constraints {
        match constraint {
            Constraint::Distance {
                body_a,
                body_b,
                distance,
                anchor_a,
                anchor_b,
                ..
            } => solve_distance(bodies, *body_a, *body_b, *distance, *anchor_a, *anchor_b),
            Constraint::Revolute {
                body_a,
                body_b,
                pivot,
                ..
            } => solve_revolute(bodies, *body_a, *body_b, *pivot),
        }
    }
}

fn solve_distance(
    bodies: &mut [Option<RigidBody>],
    id_a: u32,
    id_b: u32,
    target_distance: f32,
    anchor_a: (f32, f32),
    anchor_b: (f32, f32),
) {
    let a_idx = id_a as usize;
    let b_idx = id_b as usize;

    let (xa, ya, cos_a, sin_a, inv_ma, type_a) = match &bodies[a_idx] {
        Some(b) => (b.x, b.y, b.angle.cos(), b.angle.sin(), b.inv_mass, b.body_type),
        None => return,
    };
    let (xb, yb, cos_b, sin_b, inv_mb, type_b) = match &bodies[b_idx] {
        Some(b) => (b.x, b.y, b.angle.cos(), b.angle.sin(), b.inv_mass, b.body_type),
        None => return,
    };

    if type_a != BodyType::Dynamic && type_b != BodyType::Dynamic {
        return;
    }

    // World-space anchor positions
    let wa_x = xa + anchor_a.0 * cos_a - anchor_a.1 * sin_a;
    let wa_y = ya + anchor_a.0 * sin_a + anchor_a.1 * cos_a;
    let wb_x = xb + anchor_b.0 * cos_b - anchor_b.1 * sin_b;
    let wb_y = yb + anchor_b.0 * sin_b + anchor_b.1 * cos_b;

    let dx = wb_x - wa_x;
    let dy = wb_y - wa_y;
    let current_distance = (dx * dx + dy * dy).sqrt();

    if current_distance < 1e-8 {
        return;
    }

    let nx = dx / current_distance;
    let ny = dy / current_distance;
    let error = current_distance - target_distance;

    let inv_total = inv_ma + inv_mb;
    if inv_total == 0.0 {
        return;
    }

    let correction = error / inv_total;

    if let Some(a) = &mut bodies[a_idx] {
        if a.body_type == BodyType::Dynamic {
            a.x += correction * inv_ma * nx;
            a.y += correction * inv_ma * ny;
        }
    }
    if let Some(b) = &mut bodies[b_idx] {
        if b.body_type == BodyType::Dynamic {
            b.x -= correction * inv_mb * nx;
            b.y -= correction * inv_mb * ny;
        }
    }
}

fn solve_revolute(
    bodies: &mut [Option<RigidBody>],
    id_a: u32,
    id_b: u32,
    pivot: (f32, f32),
) {
    let a_idx = id_a as usize;
    let b_idx = id_b as usize;

    let (xa, ya, inv_ma, type_a) = match &bodies[a_idx] {
        Some(b) => (b.x, b.y, b.inv_mass, b.body_type),
        None => return,
    };
    let (xb, yb, inv_mb, type_b) = match &bodies[b_idx] {
        Some(b) => (b.x, b.y, b.inv_mass, b.body_type),
        None => return,
    };

    if type_a != BodyType::Dynamic && type_b != BodyType::Dynamic {
        return;
    }

    // For revolute: both bodies should have the same world-space pivot point.
    // Compute error: difference between where each body thinks the pivot is.
    // For simplicity, use pivot as a world-space anchor that both bodies must share.
    let mid_x = (xa + xb) * 0.5;
    let mid_y = (ya + yb) * 0.5;
    let _ = mid_x;
    let _ = mid_y;

    // Error from body A to pivot
    let err_ax = pivot.0 - xa;
    let err_ay = pivot.1 - ya;
    // Error from body B to pivot
    let err_bx = pivot.0 - xb;
    let err_by = pivot.1 - yb;

    let inv_total = inv_ma + inv_mb;
    if inv_total == 0.0 {
        return;
    }

    // Apply position correction toward the pivot
    // Each body moves proportional to its inverse mass
    let _ = err_ax;
    let _ = err_ay;
    let _ = err_bx;
    let _ = err_by;

    // Compute where each body's pivot would be in world space
    // For simplicity, the "local" pivot offsets are stored relative to body position at constraint creation
    // Re-derive: the pivot should remain at the same world position
    // We push both bodies so that both are at the distance implied by the pivot
    // Body A should be at (pivot.0 - local_offset_a), etc.
    // Since we don't store local offsets, treat pivot as a fixed world point that both bodies are pinned to.

    // Correction: move each body partially toward making their center go through appropriate offset
    // Actually, the simplest revolute: both bodies' positions are free, but they share a point.
    // Here we just correct velocities to prevent separation at the pivot.
    // A better approach: store local anchors. For now, apply direct position correction.

    // Desired: anchor_a_world == anchor_b_world == pivot
    // Since anchor is at body center (0,0): body.pos == pivot for each
    // This doesn't make physical sense for general revolute. Use anchor-based approach:

    // With no local anchors, revolute just pins both bodies at the same point (the pivot).
    // Correction = move both bodies toward pivot proportional to inverse mass.
    if let Some(a) = &mut bodies[a_idx] {
        if a.body_type == BodyType::Dynamic {
            let dx = pivot.0 - a.x;
            let dy = pivot.1 - a.y;
            a.x += dx * inv_ma / inv_total;
            a.y += dy * inv_ma / inv_total;
        }
    }
    if let Some(b) = &mut bodies[b_idx] {
        if b.body_type == BodyType::Dynamic {
            let dx = pivot.0 - b.x;
            let dy = pivot.1 - b.y;
            b.x += dx * inv_mb / inv_total;
            b.y += dy * inv_mb / inv_total;
        }
    }
}
