use super::types::{BodyType, Constraint, RigidBody, SoftConstraintParams};

/// Solve all constraints velocity-level for this timestep.
/// For soft constraints, position error is corrected via velocity bias.
pub fn solve_constraints(
    bodies: &mut [Option<RigidBody>],
    constraints: &mut [Constraint],
    dt: f32,
) {
    for constraint in constraints.iter_mut() {
        match constraint {
            Constraint::Distance {
                body_a,
                body_b,
                distance,
                anchor_a,
                anchor_b,
                soft,
                accumulated_impulse,
                ..
            } => solve_distance_velocity_soft(
                bodies, *body_a, *body_b, *distance, *anchor_a, *anchor_b,
                soft.as_ref(), accumulated_impulse, dt,
            ),
            Constraint::Revolute {
                body_a,
                body_b,
                anchor_a,
                anchor_b,
                soft,
                accumulated_impulse,
                ..
            } => solve_revolute_velocity_soft(
                bodies, *body_a, *body_b, *anchor_a, *anchor_b,
                soft.as_ref(), accumulated_impulse, dt,
            ),
        }
    }
}

/// Position correction pass for constraints (called after velocity solve).
/// Soft constraints skip this phase (error corrected via velocity bias).
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
                soft,
                ..
            } => {
                // Skip position correction for soft constraints
                if soft.is_none() {
                    solve_distance_position(bodies, *body_a, *body_b, *distance, *anchor_a, *anchor_b);
                }
            }
            Constraint::Revolute {
                body_a,
                body_b,
                anchor_a,
                anchor_b,
                soft,
                ..
            } => {
                // Skip position correction for soft constraints
                if soft.is_none() {
                    solve_revolute_position(bodies, *body_a, *body_b, *anchor_a, *anchor_b);
                }
            }
        }
    }
}

/// Distance constraint velocity solver with soft constraint support.
fn solve_distance_velocity_soft(
    bodies: &mut [Option<RigidBody>],
    id_a: u32,
    id_b: u32,
    target_distance: f32,
    anchor_a: (f32, f32),
    anchor_b: (f32, f32),
    soft: Option<&SoftConstraintParams>,
    accumulated: &mut f32,
    dt: f32,
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

    // Position error (constraint violation)
    let position_error = current_distance - target_distance;

    // Lever arms from body centers to anchors
    let ra_x = wa_x - xa;
    let ra_y = wa_y - ya;
    let rb_x = wb_x - xb;
    let rb_y = wb_y - yb;

    // Velocity at anchor points
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

    let eff_mass = 1.0 / inv_mass_sum;

    // For soft constraints, apply spring-damper force ONCE per sub-step
    // F = -k*x - c*v, impulse J = F * dt
    //
    // We use accumulated impulse to detect if this is the first iteration
    // of a sub-step (accumulated resets between sub-steps in physics world)
    let is_first_iteration = *accumulated == 0.0;

    let lambda = if let Some(params) = soft {
        if !params.is_rigid() && dt > 0.0 {
            // Only apply spring force on first iteration of sub-step
            if is_first_iteration {
                let omega = 2.0 * std::f32::consts::PI * params.frequency_hz;
                let k = omega * omega;                          // stiffness
                let c = 2.0 * params.damping_ratio * omega;     // damping

                // Spring-damper impulse: J = -(k*x + c*v) * dt
                let spring_term = k * position_error;
                let damping_term = c * rel_vn;
                -(spring_term + damping_term) * dt * eff_mass
            } else {
                // Subsequent iterations: no additional impulse (spring already applied)
                0.0
            }
        } else {
            // Rigid constraint: correct velocity to zero relative motion (all iterations)
            -eff_mass * rel_vn
        }
    } else {
        // Rigid constraint: correct velocity to zero relative motion
        -eff_mass * rel_vn
    };

    // Track accumulated impulse
    let old_accumulated = *accumulated;
    *accumulated += lambda;
    let j = *accumulated - old_accumulated;

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
/// Only used for rigid constraints; soft constraints use velocity bias.
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

/// Revolute constraint velocity solver with soft constraint support.
fn solve_revolute_velocity_soft(
    bodies: &mut [Option<RigidBody>],
    id_a: u32,
    id_b: u32,
    anchor_a: (f32, f32),
    anchor_b: (f32, f32),
    soft: Option<&SoftConstraintParams>,
    accumulated: &mut (f32, f32),
    dt: f32,
) {
    let a_idx = id_a as usize;
    let b_idx = id_b as usize;

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

    let wa_x = xa + anchor_a.0 * cos_a - anchor_a.1 * sin_a;
    let wa_y = ya + anchor_a.0 * sin_a + anchor_a.1 * cos_a;
    let wb_x = xb + anchor_b.0 * cos_b - anchor_b.1 * sin_b;
    let wb_y = yb + anchor_b.0 * sin_b + anchor_b.1 * cos_b;

    // Position error
    let pos_err_x = wb_x - wa_x;
    let pos_err_y = wb_y - wa_y;

    let ra_x = wa_x - xa;
    let ra_y = wa_y - ya;
    let rb_x = wb_x - xb;
    let rb_y = wb_y - yb;

    let va_x = vax - ava * ra_y;
    let va_y = vay + ava * ra_x;
    let vb_x = vbx - avb * rb_y;
    let vb_y = vby + avb * rb_x;

    let rel_vx = vb_x - va_x;
    let rel_vy = vb_y - va_y;

    // 2x2 effective mass matrix
    let k11 = inv_ma + inv_mb + ra_y * ra_y * inv_ia + rb_y * rb_y * inv_ib;
    let k22 = inv_ma + inv_mb + ra_x * ra_x * inv_ia + rb_x * rb_x * inv_ib;
    let k12 = -ra_x * ra_y * inv_ia - rb_x * rb_y * inv_ib;

    let det = k11 * k22 - k12 * k12;
    if det.abs() < 1e-8 {
        return;
    }

    let inv_det = 1.0 / det;

    // Soft constraint bias
    let (bias_x, bias_y, mass_coeff, damp_coeff) = if let Some(params) = soft {
        if !params.is_rigid() && dt > 0.0 {
            let inv_mass_sum = inv_ma + inv_mb;
            let coeffs = params.compute_coefficients(dt, inv_mass_sum);
            let bias_x = coeffs.bias_coeff * pos_err_x;
            let bias_y = coeffs.bias_coeff * pos_err_y;
            (bias_x, bias_y, coeffs.mass_coeff, coeffs.impulse_coeff)
        } else {
            (0.0, 0.0, 1.0, 0.0)
        }
    } else {
        (0.0, 0.0, 1.0, 0.0)
    };

    // Solve K * J = -(rel_v + bias) with damping
    let damp_factor = 1.0 + damp_coeff;
    let rhs_x = -(damp_factor * rel_vx + bias_x);
    let rhs_y = -(damp_factor * rel_vy + bias_y);
    let jx = inv_det * (k22 * rhs_x - k12 * rhs_y) * mass_coeff;
    let jy = inv_det * (-k12 * rhs_x + k11 * rhs_y) * mass_coeff;

    // Accumulate impulse
    let old_x = accumulated.0;
    let old_y = accumulated.1;
    accumulated.0 += jx;
    accumulated.1 += jy;
    let applied_jx = accumulated.0 - old_x;
    let applied_jy = accumulated.1 - old_y;

    // Apply impulses
    if let Some(a) = &mut bodies[a_idx] {
        if a.body_type == BodyType::Dynamic {
            a.vx -= applied_jx * inv_ma;
            a.vy -= applied_jy * inv_ma;
            let ra_cross_j = ra_x * applied_jy - ra_y * applied_jx;
            a.angular_velocity -= ra_cross_j * inv_ia;
        }
    }
    if let Some(b) = &mut bodies[b_idx] {
        if b.body_type == BodyType::Dynamic {
            b.vx += applied_jx * inv_mb;
            b.vy += applied_jy * inv_mb;
            let rb_cross_j = rb_x * applied_jy - rb_y * applied_jx;
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

    let wa_x = xa + anchor_a.0 * cos_a - anchor_a.1 * sin_a;
    let wa_y = ya + anchor_a.0 * sin_a + anchor_a.1 * cos_a;
    let wb_x = xb + anchor_b.0 * cos_b - anchor_b.1 * sin_b;
    let wb_y = yb + anchor_b.0 * sin_b + anchor_b.1 * cos_b;

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
