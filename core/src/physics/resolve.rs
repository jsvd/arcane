use super::types::{BodyType, Contact, RigidBody};

/// Sequential impulse solver for contact resolution.
pub fn resolve_contacts(
    bodies: &mut [Option<RigidBody>],
    contacts: &[Contact],
    iterations: usize,
) {
    let iterations = if iterations == 0 { 6 } else { iterations };

    for _ in 0..iterations {
        for contact in contacts {
            resolve_single(bodies, contact);
        }
    }

    // Position correction (Baumgarte stabilization)
    for contact in contacts {
        position_correction(bodies, contact);
    }
}

fn resolve_single(bodies: &mut [Option<RigidBody>], contact: &Contact) {
    let id_a = contact.body_a as usize;
    let id_b = contact.body_b as usize;

    // Extract needed data from both bodies
    let (inv_ma, inv_ia, vax, vay, ava, rest_a, fric_a, type_a, xa, ya) = {
        let a = match &bodies[id_a] {
            Some(b) => b,
            None => return,
        };
        (
            a.inv_mass, a.inv_inertia, a.vx, a.vy, a.angular_velocity,
            a.material.restitution, a.material.friction, a.body_type, a.x, a.y,
        )
    };
    let (inv_mb, inv_ib, vbx, vby, avb, rest_b, fric_b, type_b, xb, yb) = {
        let b = match &bodies[id_b] {
            Some(b) => b,
            None => return,
        };
        (
            b.inv_mass, b.inv_inertia, b.vx, b.vy, b.angular_velocity,
            b.material.restitution, b.material.friction, b.body_type, b.x, b.y,
        )
    };

    // Skip if both are static/kinematic
    if type_a != BodyType::Dynamic && type_b != BodyType::Dynamic {
        return;
    }

    let (nx, ny) = contact.normal;
    let (cpx, cpy) = contact.contact_point;

    // Vectors from center of mass to contact point
    let ra_x = cpx - xa;
    let ra_y = cpy - ya;
    let rb_x = cpx - xb;
    let rb_y = cpy - yb;

    // Relative velocity at contact point
    let rel_vx = (vbx + (-avb * rb_y)) - (vax + (-ava * ra_y));
    let rel_vy = (vby + (avb * rb_x)) - (vay + (ava * ra_x));

    let vn = rel_vx * nx + rel_vy * ny;

    // Don't resolve if separating
    if vn > 0.0 {
        return;
    }

    // Cross products for angular terms
    let ra_cross_n = ra_x * ny - ra_y * nx;
    let rb_cross_n = rb_x * ny - rb_y * nx;

    let inv_mass_sum = inv_ma + inv_mb
        + ra_cross_n * ra_cross_n * inv_ia
        + rb_cross_n * rb_cross_n * inv_ib;

    if inv_mass_sum == 0.0 {
        return;
    }

    let e = rest_a.min(rest_b);
    let j = -(1.0 + e) * vn / inv_mass_sum;

    // Apply normal impulse
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

    // Friction impulse
    let tx = rel_vx - vn * nx;
    let ty = rel_vy - vn * ny;
    let t_len = (tx * tx + ty * ty).sqrt();

    if t_len > 1e-8 {
        let tx = tx / t_len;
        let ty = ty / t_len;

        let ra_cross_t = ra_x * ty - ra_y * tx;
        let rb_cross_t = rb_x * ty - rb_y * tx;

        let inv_mass_sum_t = inv_ma + inv_mb
            + ra_cross_t * ra_cross_t * inv_ia
            + rb_cross_t * rb_cross_t * inv_ib;

        if inv_mass_sum_t > 0.0 {
            let vt = rel_vx * tx + rel_vy * ty;
            let jt = -vt / inv_mass_sum_t;

            // Coulomb friction: clamp tangential impulse
            let mu = (fric_a * fric_b).sqrt();
            let jt = jt.clamp(-j.abs() * mu, j.abs() * mu);

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

    let slop = 0.01;
    let baumgarte = 0.2;

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
