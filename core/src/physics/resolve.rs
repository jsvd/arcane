use super::types::{BodyType, ContactManifold, ManifoldPoint, RigidBody};

/// Transform body-local point to world space
fn local_to_world(body: &RigidBody, local: (f32, f32)) -> (f32, f32) {
    let cos = body.angle.cos();
    let sin = body.angle.sin();
    (
        local.0 * cos - local.1 * sin + body.x,
        local.0 * sin + local.1 * cos + body.y,
    )
}

/// Initialize manifolds: pre-compute velocity bias and tangent for all contact points.
pub fn initialize_manifolds(
    bodies: &[Option<RigidBody>],
    manifolds: &mut [ContactManifold],
    restitution_threshold: f32,
) {
    for manifold in manifolds.iter_mut() {
        let id_a = manifold.body_a as usize;
        let id_b = manifold.body_b as usize;

        let a = match &bodies[id_a] {
            Some(b) => b,
            None => continue,
        };
        let b = match &bodies[id_b] {
            Some(b) => b,
            None => continue,
        };

        let (nx, ny) = manifold.normal;

        // Compute tangent (perpendicular to normal)
        manifold.tangent = (-ny, nx);

        // Compute velocity bias from average of all contact point velocities
        let mut total_vn = 0.0;
        for point in &manifold.points {
            // World-space contact points from local anchors
            let wa = local_to_world(a, point.local_a);
            let wb = local_to_world(b, point.local_b);

            // Lever arms
            let ra_x = wa.0 - a.x;
            let ra_y = wa.1 - a.y;
            let rb_x = wb.0 - b.x;
            let rb_y = wb.1 - b.y;

            // Relative velocity at contact point
            let rel_vx = (b.vx + (-b.angular_velocity * rb_y)) - (a.vx + (-a.angular_velocity * ra_y));
            let rel_vy = (b.vy + (b.angular_velocity * rb_x)) - (a.vy + (a.angular_velocity * ra_x));

            let vn = rel_vx * nx + rel_vy * ny;
            total_vn += vn;
        }

        let avg_vn = if manifold.points.is_empty() {
            0.0
        } else {
            total_vn / manifold.points.len() as f32
        };

        // Restitution bias: only apply bounce for approach speeds above threshold
        let e = if -avg_vn < restitution_threshold {
            0.0
        } else {
            a.material.restitution.max(b.material.restitution)
        };
        manifold.velocity_bias = e * (-avg_vn).max(0.0);
    }
}

/// Warm start manifolds: apply cached impulses from previous frame.
pub fn warm_start_manifolds(
    bodies: &mut [Option<RigidBody>],
    manifolds: &[ContactManifold],
) {
    for manifold in manifolds {
        let id_a = manifold.body_a as usize;
        let id_b = manifold.body_b as usize;

        let (nx, ny) = manifold.normal;
        let (tx, ty) = manifold.tangent;

        for point in &manifold.points {
            let jn = point.accumulated_jn;
            let jt = point.accumulated_jt;

            if jn == 0.0 && jt == 0.0 {
                continue;
            }

            // Combined impulse
            let px = jn * nx + jt * tx;
            let py = jn * ny + jt * ty;

            // Get world contact point (use average of both anchors)
            let (inv_ma, inv_ia, type_a, xa, ya, cos_a, sin_a) = match &bodies[id_a] {
                Some(a) => (a.inv_mass, a.inv_inertia, a.body_type, a.x, a.y, a.angle.cos(), a.angle.sin()),
                None => continue,
            };
            let (inv_mb, inv_ib, type_b, xb, yb, cos_b, sin_b) = match &bodies[id_b] {
                Some(b) => (b.inv_mass, b.inv_inertia, b.body_type, b.x, b.y, b.angle.cos(), b.angle.sin()),
                None => continue,
            };

            // Transform local anchors to world
            let wa_x = point.local_a.0 * cos_a - point.local_a.1 * sin_a + xa;
            let wa_y = point.local_a.0 * sin_a + point.local_a.1 * cos_a + ya;
            let wb_x = point.local_b.0 * cos_b - point.local_b.1 * sin_b + xb;
            let wb_y = point.local_b.0 * sin_b + point.local_b.1 * cos_b + yb;

            // Lever arms
            let ra_x = wa_x - xa;
            let ra_y = wa_y - ya;
            let rb_x = wb_x - xb;
            let rb_y = wb_y - yb;

            if let Some(a) = &mut bodies[id_a] {
                if type_a == BodyType::Dynamic {
                    a.vx -= px * inv_ma;
                    a.vy -= py * inv_ma;
                    let ra_cross_p = ra_x * py - ra_y * px;
                    a.angular_velocity -= ra_cross_p * inv_ia;
                }
            }
            if let Some(b) = &mut bodies[id_b] {
                if type_b == BodyType::Dynamic {
                    b.vx += px * inv_mb;
                    b.vy += py * inv_mb;
                    let rb_cross_p = rb_x * py - rb_y * px;
                    b.angular_velocity += rb_cross_p * inv_ib;
                }
            }
        }
    }
}

/// One iteration of velocity solving for all manifolds.
/// `sub_dt` is the sub-step time for speculative contact bias calculation.
pub fn resolve_manifolds_velocity_iteration(
    bodies: &mut [Option<RigidBody>],
    manifolds: &mut [ContactManifold],
    reverse: bool,
    sub_dt: f32,
) {
    let len = manifolds.len();
    if reverse {
        for i in (0..len).rev() {
            resolve_manifold_velocity(bodies, &mut manifolds[i], sub_dt);
        }
    } else {
        for i in 0..len {
            resolve_manifold_velocity(bodies, &mut manifolds[i], sub_dt);
        }
    }
}

/// Solve velocity constraints for a single manifold.
/// `sub_dt` is used to compute speculative contact bias for negative penetration.
fn resolve_manifold_velocity(bodies: &mut [Option<RigidBody>], manifold: &mut ContactManifold, sub_dt: f32) {
    let id_a = manifold.body_a as usize;
    let id_b = manifold.body_b as usize;

    // Extract body data
    let (inv_ma, inv_ia, fric_a, type_a, xa, ya, cos_a, sin_a) = {
        let a = match &bodies[id_a] {
            Some(b) => b,
            None => return,
        };
        (
            a.inv_mass, a.inv_inertia,
            a.material.friction, a.body_type, a.x, a.y, a.angle.cos(), a.angle.sin(),
        )
    };
    let (inv_mb, inv_ib, fric_b, type_b, xb, yb, cos_b, sin_b) = {
        let b = match &bodies[id_b] {
            Some(b) => b,
            None => return,
        };
        (
            b.inv_mass, b.inv_inertia,
            b.material.friction, b.body_type, b.x, b.y, b.angle.cos(), b.angle.sin(),
        )
    };

    if type_a != BodyType::Dynamic && type_b != BodyType::Dynamic {
        return;
    }

    let (nx, ny) = manifold.normal;
    let (tx, ty) = manifold.tangent;
    let velocity_bias = manifold.velocity_bias;
    let mu = (fric_a * fric_b).sqrt();
    let num_points = manifold.points.len() as f32;

    // Solve each contact point
    for point in &mut manifold.points {
        // Transform local anchors to world
        let wa_x = point.local_a.0 * cos_a - point.local_a.1 * sin_a + xa;
        let wa_y = point.local_a.0 * sin_a + point.local_a.1 * cos_a + ya;
        let wb_x = point.local_b.0 * cos_b - point.local_b.1 * sin_b + xb;
        let wb_y = point.local_b.0 * sin_b + point.local_b.1 * cos_b + yb;

        // Lever arms
        let ra_x = wa_x - xa;
        let ra_y = wa_y - ya;
        let rb_x = wb_x - xb;
        let rb_y = wb_y - yb;

        // Re-read current velocities (they may have changed from previous point solve)
        let (vax, vay, ava) = bodies[id_a].as_ref().map_or((0.0, 0.0, 0.0), |b| (b.vx, b.vy, b.angular_velocity));
        let (vbx, vby, avb) = bodies[id_b].as_ref().map_or((0.0, 0.0, 0.0), |b| (b.vx, b.vy, b.angular_velocity));

        // Relative velocity at contact point
        let rel_vx = (vbx + (-avb * rb_y)) - (vax + (-ava * ra_y));
        let rel_vy = (vby + (avb * rb_x)) - (vay + (ava * ra_x));

        let vn = rel_vx * nx + rel_vy * ny;

        // Effective mass
        let ra_cross_n = ra_x * ny - ra_y * nx;
        let rb_cross_n = rb_x * ny - rb_y * nx;
        let inv_mass_sum = inv_ma + inv_mb
            + ra_cross_n * ra_cross_n * inv_ia
            + rb_cross_n * rb_cross_n * inv_ib;

        if inv_mass_sum == 0.0 {
            continue;
        }

        // Bias computation: speculative vs restitution are mutually exclusive.
        // - Speculative (penetration < 0): not touching yet, just limit approach
        //   velocity so bodies arrive just-touching. No bounce.
        // - Touching (penetration >= 0): apply restitution for bounce.
        let per_point_bias = if point.penetration < 0.0 && sub_dt > 0.0 {
            // Speculative: allow approach up to separation/dt (negative bias)
            point.penetration / sub_dt
        } else {
            // Actual contact: apply restitution bounce
            velocity_bias / num_points
        };
        let j_new = -(vn - per_point_bias) / inv_mass_sum;

        let old_accumulated = point.accumulated_jn;
        point.accumulated_jn = (old_accumulated + j_new).max(0.0);
        let j = point.accumulated_jn - old_accumulated;

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

        // Friction solve with friction anchors
        let ra_cross_t = ra_x * ty - ra_y * tx;
        let rb_cross_t = rb_x * ty - rb_y * tx;
        let inv_mass_sum_t = inv_ma + inv_mb
            + ra_cross_t * ra_cross_t * inv_ia
            + rb_cross_t * rb_cross_t * inv_ib;

        if inv_mass_sum_t > 0.0 {
            // Re-read velocities after normal solve
            let (vax, vay, ava) = bodies[id_a].as_ref().map_or((0.0, 0.0, 0.0), |b| (b.vx, b.vy, b.angular_velocity));
            let (vbx, vby, avb) = bodies[id_b].as_ref().map_or((0.0, 0.0, 0.0), |b| (b.vx, b.vy, b.angular_velocity));

            let rel_vx = (vbx + (-avb * rb_y)) - (vax + (-ava * ra_y));
            let rel_vy = (vby + (avb * rb_x)) - (vay + (ava * ra_x));

            let vt = rel_vx * tx + rel_vy * ty;

            // Friction anchor: compute tangent position correction
            // Current world-space contact position (midpoint of both anchors)
            let current_pos = ((wa_x + wb_x) * 0.5, (wa_y + wb_y) * 0.5);

            // Initialize friction anchor if not set
            if point.friction_anchor.is_none() {
                point.friction_anchor = Some(current_pos);
            }

            // Compute tangent drift from anchor
            let anchor = point.friction_anchor.unwrap();
            let drift_x = current_pos.0 - anchor.0;
            let drift_y = current_pos.1 - anchor.1;
            let tangent_drift = drift_x * tx + drift_y * ty;

            // Baumgarte correction velocity toward anchor (factor = 0.1)
            const FRICTION_BAUMGARTE: f32 = 0.1;
            let correction_velocity = if sub_dt > 0.0 {
                tangent_drift * FRICTION_BAUMGARTE / sub_dt
            } else {
                0.0
            };

            // Total tangent velocity to correct: actual velocity + anchor drift correction
            let vt_corrected = vt + correction_velocity;
            let jt_new = -vt_corrected / inv_mass_sum_t;

            // Coulomb friction
            let max_friction = point.accumulated_jn * mu;
            let old_jt = point.accumulated_jt;
            let new_jt_accumulated = (old_jt + jt_new).clamp(-max_friction, max_friction);

            // Check if we hit the friction limit (sliding)
            let requested_jt = old_jt + jt_new;
            let is_sliding = (new_jt_accumulated - requested_jt).abs() > 1e-8;

            if is_sliding {
                // Reset friction anchor when sliding
                point.friction_anchor = Some(current_pos);
            }

            point.accumulated_jt = new_jt_accumulated;
            let jt = point.accumulated_jt - old_jt;

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
}

/// Position correction for manifolds.
pub fn resolve_manifolds_position(
    bodies: &mut [Option<RigidBody>],
    manifolds: &[ContactManifold],
    reverse: bool,
) {
    if reverse {
        for manifold in manifolds.iter().rev() {
            for point in &manifold.points {
                position_correction_manifold_point(bodies, manifold, point);
            }
        }
    } else {
        for manifold in manifolds {
            for point in &manifold.points {
                position_correction_manifold_point(bodies, manifold, point);
            }
        }
    }
}

fn position_correction_manifold_point(
    bodies: &mut [Option<RigidBody>],
    manifold: &ContactManifold,
    point: &ManifoldPoint,
) {
    let id_a = manifold.body_a as usize;
    let id_b = manifold.body_b as usize;

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
    let max_correction = 0.2;
    let baumgarte = 0.2;

    let pen = (point.penetration - slop).max(0.0);
    let inv_total = inv_ma + inv_mb;
    if inv_total == 0.0 {
        return;
    }

    let correction = (pen * baumgarte).min(max_correction) / inv_total;

    let (nx, ny) = manifold.normal;

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
