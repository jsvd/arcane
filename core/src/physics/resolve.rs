use super::types::{BodyType, Contact, RigidBody};

/// Pre-compute solver data for each contact: velocity bias (restitution) and tangent direction.
/// Must be called ONCE per frame before warm starting and solver iterations.
/// This follows the Box2D approach: bias and tangent are fixed for the entire solve.
pub fn initialize_contacts(
    bodies: &[Option<RigidBody>],
    contacts: &mut [Contact],
    restitution_threshold: f32,
) {
    for contact in contacts.iter_mut() {
        let id_a = contact.body_a as usize;
        let id_b = contact.body_b as usize;

        let a = match &bodies[id_a] {
            Some(b) => b,
            None => continue,
        };
        let b = match &bodies[id_b] {
            Some(b) => b,
            None => continue,
        };

        let (nx, ny) = contact.normal;
        let (cpx, cpy) = contact.contact_point;

        let ra_x = cpx - a.x;
        let ra_y = cpy - a.y;
        let rb_x = cpx - b.x;
        let rb_y = cpy - b.y;

        // Relative velocity at contact point
        let rel_vx = (b.vx + (-b.angular_velocity * rb_y)) - (a.vx + (-a.angular_velocity * ra_y));
        let rel_vy = (b.vy + (b.angular_velocity * rb_x)) - (a.vy + (a.angular_velocity * ra_x));

        let vn = rel_vx * nx + rel_vy * ny;

        // Restitution bias: only apply bounce for approach speeds above threshold
        let e = if -vn < restitution_threshold {
            0.0
        } else {
            a.material.restitution.min(b.material.restitution)
        };
        contact.velocity_bias = e * (-vn).max(0.0);

        // Tangent direction from initial relative velocity (fixed for all iterations)
        let tx = rel_vx - vn * nx;
        let ty = rel_vy - vn * ny;
        let t_len = (tx * tx + ty * ty).sqrt();
        if t_len > 1e-8 {
            contact.tangent = (tx / t_len, ty / t_len);
        } else {
            // Default tangent: 90° rotation of normal
            contact.tangent = (-ny, nx);
        }
    }
}

/// Pre-apply cached impulses from previous frame (warm starting).
/// This gives the iterative solver a head start, dramatically improving convergence for stacks.
pub fn warm_start_contacts(
    bodies: &mut [Option<RigidBody>],
    contacts: &[Contact],
) {
    for contact in contacts {
        let jn = contact.accumulated_jn;
        let jt = contact.accumulated_jt;
        if jn == 0.0 && jt == 0.0 {
            continue;
        }

        let id_a = contact.body_a as usize;
        let id_b = contact.body_b as usize;
        let (nx, ny) = contact.normal;
        let (tx, ty) = contact.tangent;

        // Combined impulse: normal + friction
        let px = jn * nx + jt * tx;
        let py = jn * ny + jt * ty;

        let (cpx, cpy) = contact.contact_point;

        if let Some(a) = &mut bodies[id_a] {
            if a.body_type == BodyType::Dynamic {
                let ra_x = cpx - a.x;
                let ra_y = cpy - a.y;
                a.vx -= px * a.inv_mass;
                a.vy -= py * a.inv_mass;
                let ra_cross_p = ra_x * py - ra_y * px;
                a.angular_velocity -= ra_cross_p * a.inv_inertia;
            }
        }
        if let Some(b) = &mut bodies[id_b] {
            if b.body_type == BodyType::Dynamic {
                let rb_x = cpx - b.x;
                let rb_y = cpy - b.y;
                b.vx += px * b.inv_mass;
                b.vy += py * b.inv_mass;
                let rb_cross_p = rb_x * py - rb_y * px;
                b.angular_velocity += rb_cross_p * b.inv_inertia;
            }
        }
    }
}

/// One iteration of velocity-level contact resolution with accumulated impulse clamping.
/// `reverse`: if true, iterate contacts in reverse order (for alternating Gauss-Seidel).
pub fn resolve_contacts_velocity_iteration(
    bodies: &mut [Option<RigidBody>],
    contacts: &mut [Contact],
    reverse: bool,
) {
    let len = contacts.len();
    if reverse {
        for i in (0..len).rev() {
            resolve_single_accumulated(bodies, &mut contacts[i]);
        }
    } else {
        for i in 0..len {
            resolve_single_accumulated(bodies, &mut contacts[i]);
        }
    }
}

/// Position correction (Baumgarte stabilization) for all contacts.
/// `reverse`: if true, iterate contacts in reverse order.
pub fn resolve_contacts_position(
    bodies: &mut [Option<RigidBody>],
    contacts: &[Contact],
    reverse: bool,
) {
    if reverse {
        for contact in contacts.iter().rev() {
            position_correction(bodies, contact);
        }
    } else {
        for contact in contacts {
            position_correction(bodies, contact);
        }
    }
}

/// Sequential impulse solver for contact resolution (backward compat).
pub fn resolve_contacts(
    bodies: &mut [Option<RigidBody>],
    contacts: &mut [Contact],
    iterations: usize,
) {
    let iterations = if iterations == 0 { 6 } else { iterations };

    // Pre-compute bias and tangent (no restitution threshold for standalone use)
    initialize_contacts(bodies, contacts, 0.0);

    for i in 0..iterations {
        resolve_contacts_velocity_iteration(bodies, contacts, i % 2 == 1);
    }

    resolve_contacts_position(bodies, contacts, false);
}

/// Accumulated impulse solver — the key to warm starting (Box2D approach).
/// Uses pre-computed velocity_bias and tangent direction from initialize_contacts().
/// Tracks total accumulated impulse and only applies the DELTA each iteration.
/// Normal impulse clamped non-negative (can't pull). Friction clamped to Coulomb cone.
fn resolve_single_accumulated(bodies: &mut [Option<RigidBody>], contact: &mut Contact) {
    let id_a = contact.body_a as usize;
    let id_b = contact.body_b as usize;

    let (inv_ma, inv_ia, vax, vay, ava, fric_a, type_a, xa, ya) = {
        let a = match &bodies[id_a] {
            Some(b) => b,
            None => return,
        };
        (
            a.inv_mass, a.inv_inertia, a.vx, a.vy, a.angular_velocity,
            a.material.friction, a.body_type, a.x, a.y,
        )
    };
    let (inv_mb, inv_ib, vbx, vby, avb, fric_b, type_b, xb, yb) = {
        let b = match &bodies[id_b] {
            Some(b) => b,
            None => return,
        };
        (
            b.inv_mass, b.inv_inertia, b.vx, b.vy, b.angular_velocity,
            b.material.friction, b.body_type, b.x, b.y,
        )
    };

    if type_a != BodyType::Dynamic && type_b != BodyType::Dynamic {
        return;
    }

    let (nx, ny) = contact.normal;
    let (cpx, cpy) = contact.contact_point;

    let ra_x = cpx - xa;
    let ra_y = cpy - ya;
    let rb_x = cpx - xb;
    let rb_y = cpy - yb;

    // Relative velocity at contact point
    let rel_vx = (vbx + (-avb * rb_y)) - (vax + (-ava * ra_y));
    let rel_vy = (vby + (avb * rb_x)) - (vay + (ava * ra_x));

    let vn = rel_vx * nx + rel_vy * ny;

    let ra_cross_n = ra_x * ny - ra_y * nx;
    let rb_cross_n = rb_x * ny - rb_y * nx;

    let inv_mass_sum = inv_ma + inv_mb
        + ra_cross_n * ra_cross_n * inv_ia
        + rb_cross_n * rb_cross_n * inv_ib;

    if inv_mass_sum == 0.0 {
        return;
    }

    // Normal impulse with accumulated clamping.
    // Uses pre-computed velocity_bias for restitution (fixed for all iterations).
    // velocity_bias is the target rebound speed (positive). We want vn >= velocity_bias.
    let j_new = -(vn - contact.velocity_bias) / inv_mass_sum;

    // Clamp accumulated impulse: can't pull (impulse must be non-negative)
    let old_accumulated = contact.accumulated_jn;
    contact.accumulated_jn = (old_accumulated + j_new).max(0.0);
    let j = contact.accumulated_jn - old_accumulated; // Apply only the delta

    if j.abs() > 1e-8 {
        let impulse_x = j * nx;
        let impulse_y = j * ny;

        if let Some(a) = &mut bodies[id_a] {
            if a.body_type == BodyType::Dynamic {
                a.vx -= impulse_x * inv_ma;
                a.vy -= impulse_y * inv_ma;
                a.angular_velocity -= ra_cross_n * j * inv_ia;
            }
        }
        if let Some(b) = &mut bodies[id_b] {
            if b.body_type == BodyType::Dynamic {
                b.vx += impulse_x * inv_mb;
                b.vy += impulse_y * inv_mb;
                b.angular_velocity += rb_cross_n * j * inv_ib;
            }
        }
    }

    // Friction impulse with accumulated clamping.
    // Uses pre-computed tangent direction (fixed for all iterations).
    let (tx, ty) = contact.tangent;

    // Recompute relative velocity (bodies changed from normal impulse)
    let (vax, vay, ava) = bodies[id_a].as_ref().map_or((0.0, 0.0, 0.0), |b| (b.vx, b.vy, b.angular_velocity));
    let (vbx, vby, avb) = bodies[id_b].as_ref().map_or((0.0, 0.0, 0.0), |b| (b.vx, b.vy, b.angular_velocity));

    let rel_vx = (vbx + (-avb * rb_y)) - (vax + (-ava * ra_y));
    let rel_vy = (vby + (avb * rb_x)) - (vay + (ava * ra_x));

    let ra_cross_t = ra_x * ty - ra_y * tx;
    let rb_cross_t = rb_x * ty - rb_y * tx;

    let inv_mass_sum_t = inv_ma + inv_mb
        + ra_cross_t * ra_cross_t * inv_ia
        + rb_cross_t * rb_cross_t * inv_ib;

    if inv_mass_sum_t > 0.0 {
        let vt = rel_vx * tx + rel_vy * ty;
        let jt_new = -vt / inv_mass_sum_t;

        // Coulomb friction: clamp accumulated friction to friction cone
        let mu = (fric_a * fric_b).sqrt();
        let max_friction = contact.accumulated_jn * mu;
        let old_jt = contact.accumulated_jt;
        contact.accumulated_jt = (old_jt + jt_new).clamp(-max_friction, max_friction);
        let jt = contact.accumulated_jt - old_jt;

        if jt.abs() > 1e-8 {
            let friction_x = jt * tx;
            let friction_y = jt * ty;

            if let Some(a) = &mut bodies[id_a] {
                if a.body_type == BodyType::Dynamic {
                    a.vx -= friction_x * inv_ma;
                    a.vy -= friction_y * inv_ma;
                    a.angular_velocity -= ra_cross_t * jt * inv_ia;
                }
            }
            if let Some(b) = &mut bodies[id_b] {
                if b.body_type == BodyType::Dynamic {
                    b.vx += friction_x * inv_mb;
                    b.vy += friction_y * inv_mb;
                    b.angular_velocity += rb_cross_t * jt * inv_ib;
                }
            }
        }
    }
}

fn position_correction(bodies: &mut [Option<RigidBody>], contact: &Contact) {
    let id_a = contact.body_a as usize;
    let id_b = contact.body_b as usize;

    let (inv_ma, type_a) = match &bodies[id_a] {
        Some(b) => (b.inv_mass, b.body_type),
        None => return,
    };
    let (inv_mb, type_b) = match &bodies[id_b] {
        Some(b) => (b.inv_mass, b.body_type),
        None => return,
    };

    if type_a != BodyType::Dynamic && type_b != BodyType::Dynamic {
        return;
    }

    let slop = 0.005;
    let baumgarte = 0.4;

    let correction = ((contact.penetration - slop).max(0.0) * baumgarte) / (inv_ma + inv_mb);

    let (nx, ny) = contact.normal;

    if let Some(a) = &mut bodies[id_a] {
        if a.body_type == BodyType::Dynamic {
            a.x -= correction * inv_ma * nx;
            a.y -= correction * inv_ma * ny;
        }
    }
    if let Some(b) = &mut bodies[id_b] {
        if b.body_type == BodyType::Dynamic {
            b.x += correction * inv_mb * nx;
            b.y += correction * inv_mb * ny;
        }
    }
}
