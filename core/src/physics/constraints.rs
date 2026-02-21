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
                anchor_a,
                anchor_b,
                ..
            } => solve_revolute(bodies, *body_a, *body_b, *anchor_a, *anchor_b),
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

    // Transform local anchors to world space
    let wa_x = xa + anchor_a.0 * cos_a - anchor_a.1 * sin_a;
    let wa_y = ya + anchor_a.0 * sin_a + anchor_a.1 * cos_a;
    let wb_x = xb + anchor_b.0 * cos_b - anchor_b.1 * sin_b;
    let wb_y = yb + anchor_b.0 * sin_b + anchor_b.1 * cos_b;

    // Compute separation error
    let dx = wb_x - wa_x;
    let dy = wb_y - wa_y;
    let error_sq = dx * dx + dy * dy;

    if error_sq < 1e-8 {
        return; // Already constrained
    }

    let error = error_sq.sqrt();
    let nx = dx / error;
    let ny = dy / error;

    let inv_total = inv_ma + inv_mb;
    if inv_total == 0.0 {
        return;
    }

    // Apply positional correction to bring anchors together
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
