use super::types::{BodyType, Contact, RigidBody};

const SLEEP_VELOCITY_THRESHOLD: f32 = 0.01;
const SLEEP_ANGULAR_THRESHOLD: f32 = 0.01;
const SLEEP_TIME_THRESHOLD: f32 = 0.5;

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

    // Second pass: wake bodies involved in contacts with awake bodies
    for contact in contacts {
        let a_id = contact.body_a as usize;
        let b_id = contact.body_b as usize;
        if a_id >= len || b_id >= len {
            continue;
        }

        let a_sleeping = bodies[a_id].as_ref().map_or(true, |b| b.sleeping);
        let b_sleeping = bodies[b_id].as_ref().map_or(true, |b| b.sleeping);

        if a_sleeping && !b_sleeping {
            if let Some(a) = &mut bodies[a_id] {
                if a.body_type == BodyType::Dynamic {
                    a.sleeping = false;
                    a.sleep_timer = 0.0;
                }
            }
        } else if b_sleeping && !a_sleeping {
            if let Some(b) = &mut bodies[b_id] {
                if b.body_type == BodyType::Dynamic {
                    b.sleeping = false;
                    b.sleep_timer = 0.0;
                }
            }
        }
    }
}
