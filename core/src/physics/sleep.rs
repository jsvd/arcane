use super::types::{BodyType, Contact, RigidBody};

// Velocity threshold must exceed gravity*dt to handle resting contact oscillation.
// Bodies in resting contact briefly reach gravity-level speed each frame (during integration,
// before the collision solver zeroes it). A threshold of 8.0 covers gravity*dt up to ~480.
const SLEEP_VELOCITY_THRESHOLD: f32 = 8.0;
const SLEEP_ANGULAR_THRESHOLD: f32 = 0.5;
const SLEEP_TIME_THRESHOLD: f32 = 0.3;

/// Update sleep state for all bodies based on velocity and contacts.
pub fn update_sleep(
    bodies: &mut [Option<RigidBody>],
    contacts: &[Contact],
    dt: f32,
) {
    let len = bodies.len();

    // First pass: update sleep timers for dynamic bodies
    for i in 0..len {
        let body = match &mut bodies[i] {
            Some(b) if b.body_type == BodyType::Dynamic => b,
            _ => continue,
        };

        let speed_sq = body.vx * body.vx + body.vy * body.vy;
        let ang_speed = body.angular_velocity.abs();

        if speed_sq < SLEEP_VELOCITY_THRESHOLD * SLEEP_VELOCITY_THRESHOLD
            && ang_speed < SLEEP_ANGULAR_THRESHOLD
        {
            body.sleep_timer += dt;
            if body.sleep_timer > SLEEP_TIME_THRESHOLD {
                body.sleeping = true;
                body.vx = 0.0;
                body.vy = 0.0;
                body.angular_velocity = 0.0;
            }
        } else {
            body.sleep_timer = 0.0;
            body.sleeping = false;
        }
    }

    // Second pass: wake sleeping dynamic bodies that contact awake dynamic bodies.
    // Static/kinematic bodies are never wake sources (they don't move, so contact
    // with them doesn't indicate new motion).
    for contact in contacts {
        let a_id = contact.body_a as usize;
        let b_id = contact.body_b as usize;
        if a_id >= len || b_id >= len {
            continue;
        }

        let (a_sleeping, a_dynamic) = bodies[a_id]
            .as_ref()
            .map_or((true, false), |b| (b.sleeping, b.body_type == BodyType::Dynamic));
        let (b_sleeping, b_dynamic) = bodies[b_id]
            .as_ref()
            .map_or((true, false), |b| (b.sleeping, b.body_type == BodyType::Dynamic));

        // Only awake dynamic bodies can wake sleeping bodies
        let a_awake_source = !a_sleeping && a_dynamic;
        let b_awake_source = !b_sleeping && b_dynamic;

        if a_sleeping && a_dynamic && b_awake_source {
            if let Some(a) = &mut bodies[a_id] {
                a.sleeping = false;
                a.sleep_timer = 0.0;
            }
        }
        if b_sleeping && b_dynamic && a_awake_source {
            if let Some(b) = &mut bodies[b_id] {
                b.sleeping = false;
                b.sleep_timer = 0.0;
            }
        }
    }
}
