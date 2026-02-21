use super::types::{BodyType, Constraint, RigidBody};

/// Solve all constraints velocity-level for this timestep.
/// This applies velocity impulses to satisfy constraint conditions.
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
            } => solve_distance_velocity(bodies, *body_a, *body_b, *distance, *anchor_a, *anchor_b),
            Constraint::Revolute {
                body_a,
                body_b,
                anchor_a,
                anchor_b,
                ..
            } => solve_revolute_velocity(bodies, *body_a, *body_b, *anchor_a, *anchor_b),
        }
    }
}

/// Position correction pass for constraints (called after velocity solve).
pub fn solve_constraints_position(
    bodies: &mut [Option<RigidBody>],
    constraints: &[Constraint],
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
            } => solve_distance_position(bodies, *body_a, *body_b, *distance, *anchor_a, *anchor_b),
            Constraint::Revolute {
                body_a,
                body_b,
                anchor_a,
                anchor_b,
                ..
            } => solve_revolute_position(bodies, *body_a, *body_b, *anchor_a, *anchor_b),
        }
    }
}

/// Relaxation factor for constraint impulses.
/// Standard value - stiffness comes from iteration count, not this parameter.
/// Box2D uses ~1.0 with warmstarting; we use 0.8 as a safe default.
const CONSTRAINT_RELAXATION: f32 = 0.8;

/// Distance constraint velocity solver.
/// Applies impulses to zero out relative velocity along the constraint axis.
fn solve_distance_velocity(
    bodies: &mut [Option<RigidBody>],
    id_a: u32,
    id_b: u32,
    _target_distance: f32,
    anchor_a: (f32, f32),
    anchor_b: (f32, f32),
) {
    let a_idx = id_a as usize;
    let b_idx = id_b as usize;

    // Extract body data
    let (xa, ya, cos_a, sin_a, vax, vay, ava, inv_ma, inv_ia, type_a) = match &bodies[a_idx] {
        Some(b) => (
            b.x, b.y, b.angle.cos(), b.angle.sin(),
            b.vx, b.vy, b.angular_velocity,
            b.inv_mass, b.inv_inertia, b.body_type,
        ),
        None => return,
    };
    let (xb, yb, cos_b, sin_b, vbx, vby, avb, inv_mb, inv_ib, type_b) = match &bodies[b_idx] {
        Some(b) => (
            b.x, b.y, b.angle.cos(), b.angle.sin(),
            b.vx, b.vy, b.angular_velocity,
            b.inv_mass, b.inv_inertia, b.body_type,
        ),
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

    // Constraint axis (from A to B anchor)
    let dx = wb_x - wa_x;
    let dy = wb_y - wa_y;
    let current_distance = (dx * dx + dy * dy).sqrt();

    if current_distance < 1e-8 {
        return;
    }

    let nx = dx / current_distance;
    let ny = dy / current_distance;

    // Lever arms from body centers to anchors
    let ra_x = wa_x - xa;
    let ra_y = wa_y - ya;
    let rb_x = wb_x - xb;
    let rb_y = wb_y - yb;

    // Velocity at anchor points (linear + angular contribution)
    let va_x = vax - ava * ra_y;
    let va_y = vay + ava * ra_x;
    let vb_x = vbx - avb * rb_y;
    let vb_y = vby + avb * rb_x;

    // Relative velocity along constraint axis
    let rel_vn = (vb_x - va_x) * nx + (vb_y - va_y) * ny;

    // Effective mass for the constraint
    let ra_cross_n = ra_x * ny - ra_y * nx;
    let rb_cross_n = rb_x * ny - rb_y * nx;
    let inv_mass_sum = inv_ma + inv_mb
        + ra_cross_n * ra_cross_n * inv_ia
        + rb_cross_n * rb_cross_n * inv_ib;

    if inv_mass_sum < 1e-8 {
        return;
    }

    // Impulse to zero out relative velocity along axis (with relaxation)
    let j = -rel_vn / inv_mass_sum * CONSTRAINT_RELAXATION;

    let impulse_x = j * nx;
    let impulse_y = j * ny;

    // Apply impulses
    if let Some(a) = &mut bodies[a_idx] {
        if a.body_type == BodyType::Dynamic {
            a.vx -= impulse_x * inv_ma;
            a.vy -= impulse_y * inv_ma;
            a.angular_velocity -= ra_cross_n * j * inv_ia;
        }
    }
    if let Some(b) = &mut bodies[b_idx] {
        if b.body_type == BodyType::Dynamic {
            b.vx += impulse_x * inv_mb;
            b.vy += impulse_y * inv_mb;
            b.angular_velocity += rb_cross_n * j * inv_ib;
        }
    }
}

/// Distance constraint position correction (Baumgarte stabilization).
fn solve_distance_position(
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

    // Slop and Baumgarte factor (matching Box2D standard values).
    // Stiffness comes from iteration count, not aggressive correction.
    let slop = 0.005;
    let baumgarte = 0.2;
    let max_correction = 0.2;

    let pen = if error > 0.0 { (error - slop).max(0.0) } else { (error + slop).min(0.0) };

    let inv_total = inv_ma + inv_mb;
    if inv_total == 0.0 {
        return;
    }

    let correction = (pen * baumgarte).clamp(-max_correction, max_correction) / inv_total;

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

/// Revolute constraint velocity solver.
/// Applies impulses to zero out relative velocity at the anchor point in both directions.
/// This constrains translation but allows free rotation.
fn solve_revolute_velocity(
    bodies: &mut [Option<RigidBody>],
    id_a: u32,
    id_b: u32,
    anchor_a: (f32, f32),
    anchor_b: (f32, f32),
) {
    let a_idx = id_a as usize;
    let b_idx = id_b as usize;

    // Extract body data
    let (xa, ya, cos_a, sin_a, vax, vay, ava, inv_ma, inv_ia, type_a) = match &bodies[a_idx] {
        Some(b) => (
            b.x, b.y, b.angle.cos(), b.angle.sin(),
            b.vx, b.vy, b.angular_velocity,
            b.inv_mass, b.inv_inertia, b.body_type,
        ),
        None => return,
    };
    let (xb, yb, cos_b, sin_b, vbx, vby, avb, inv_mb, inv_ib, type_b) = match &bodies[b_idx] {
        Some(b) => (
            b.x, b.y, b.angle.cos(), b.angle.sin(),
            b.vx, b.vy, b.angular_velocity,
            b.inv_mass, b.inv_inertia, b.body_type,
        ),
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

    // Lever arms from body centers to anchors
    let ra_x = wa_x - xa;
    let ra_y = wa_y - ya;
    let rb_x = wb_x - xb;
    let rb_y = wb_y - yb;

    // Velocity at anchor points (linear + angular contribution)
    let va_x = vax - ava * ra_y;
    let va_y = vay + ava * ra_x;
    let vb_x = vbx - avb * rb_y;
    let vb_y = vby + avb * rb_x;

    // Relative velocity at anchor (we want to zero this out)
    let rel_vx = vb_x - va_x;
    let rel_vy = vb_y - va_y;

    // Build 2x2 effective mass matrix K
    // K = [k11, k12; k21, k22]
    // For impulse J = (jx, jy), velocity change is:
    //   delta_v = K^-1 * J

    // Diagonal terms
    let k11 = inv_ma + inv_mb + ra_y * ra_y * inv_ia + rb_y * rb_y * inv_ib;
    let k22 = inv_ma + inv_mb + ra_x * ra_x * inv_ia + rb_x * rb_x * inv_ib;

    // Off-diagonal terms
    let k12 = -ra_x * ra_y * inv_ia - rb_x * rb_y * inv_ib;
    let k21 = k12; // Symmetric

    // Solve K * J = -rel_v using Cramer's rule
    let det = k11 * k22 - k12 * k21;
    if det.abs() < 1e-8 {
        return;
    }

    let inv_det = 1.0 / det;
    let jx = inv_det * (k22 * (-rel_vx) - k12 * (-rel_vy)) * CONSTRAINT_RELAXATION;
    let jy = inv_det * (-k21 * (-rel_vx) + k11 * (-rel_vy)) * CONSTRAINT_RELAXATION;

    // Apply impulses
    if let Some(a) = &mut bodies[a_idx] {
        if a.body_type == BodyType::Dynamic {
            a.vx -= jx * inv_ma;
            a.vy -= jy * inv_ma;
            // Angular impulse: r × J
            let ra_cross_j = ra_x * jy - ra_y * jx;
            a.angular_velocity -= ra_cross_j * inv_ia;
        }
    }
    if let Some(b) = &mut bodies[b_idx] {
        if b.body_type == BodyType::Dynamic {
            b.vx += jx * inv_mb;
            b.vy += jy * inv_mb;
            let rb_cross_j = rb_x * jy - rb_y * jx;
            b.angular_velocity += rb_cross_j * inv_ib;
        }
    }
}

/// Revolute constraint position correction.
fn solve_revolute_position(
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

    // Position error
    let dx = wb_x - wa_x;
    let dy = wb_y - wa_y;
    let error_sq = dx * dx + dy * dy;

    if error_sq < 1e-8 {
        return;
    }

    let baumgarte = 0.2;
    let max_correction = 0.2;

    let inv_total = inv_ma + inv_mb;
    if inv_total == 0.0 {
        return;
    }

    // Apply correction proportionally
    let cx = (dx * baumgarte).clamp(-max_correction, max_correction) / inv_total;
    let cy = (dy * baumgarte).clamp(-max_correction, max_correction) / inv_total;

    if let Some(a) = &mut bodies[a_idx] {
        if a.body_type == BodyType::Dynamic {
            a.x += cx * inv_ma;
            a.y += cy * inv_ma;
        }
    }
    if let Some(b) = &mut bodies[b_idx] {
        if b.body_type == BodyType::Dynamic {
            b.x -= cx * inv_mb;
            b.y -= cy * inv_mb;
        }
    }
}
