use super::types::{BodyType, Contact, RigidBody};

// Velocity threshold must exceed gravity*dt to handle resting contact oscillation.
// Bodies in resting contact briefly reach gravity-level speed each frame (during integration,
// before the collision solver zeroes it). A threshold of 8.0 covers gravity*dt up to ~480.
const SLEEP_VELOCITY_THRESHOLD: f32 = 8.0;
const SLEEP_ANGULAR_THRESHOLD: f32 = 0.5;
const SLEEP_TIME_THRESHOLD: f32 = 0.5;

/// Island-based sleep: groups of connected dynamic bodies sleep/wake together.
/// This prevents cascading wake in stacks where individual bodies sleep at different
/// times, corrupting the warm start cache and causing endless blinking.
pub fn update_sleep(
    bodies: &mut [Option<RigidBody>],
    contacts: &[Contact],
    dt: f32,
) {
    let len = bodies.len();
    if len == 0 {
        return;
    }

    // Build islands using union-find on contacts.
    // Each dynamic body starts as its own island.
    let mut parent: Vec<usize> = (0..len).collect();

    // Union-find helpers (inline for simplicity)
    fn find(parent: &mut [usize], mut x: usize) -> usize {
        while parent[x] != x {
            parent[x] = parent[parent[x]]; // path compression
            x = parent[x];
        }
        x
    }
    fn union(parent: &mut [usize], a: usize, b: usize) {
        let ra = find(parent, a);
        let rb = find(parent, b);
        if ra != rb {
            parent[rb] = ra;
        }
    }

    // Merge dynamic bodies that share contacts into the same island
    for contact in contacts {
        let a = contact.body_a as usize;
        let b = contact.body_b as usize;
        if a >= len || b >= len {
            continue;
        }
        let a_dynamic = bodies[a]
            .as_ref()
            .map_or(false, |b| b.body_type == BodyType::Dynamic);
        let b_dynamic = bodies[b]
            .as_ref()
            .map_or(false, |b| b.body_type == BodyType::Dynamic);

        if a_dynamic && b_dynamic {
            union(&mut parent, a, b);
        }
    }

    // Collect islands: map root → list of dynamic body indices
    let mut island_map: std::collections::HashMap<usize, Vec<usize>> =
        std::collections::HashMap::new();
    for i in 0..len {
        let is_dynamic = bodies[i]
            .as_ref()
            .map_or(false, |b| b.body_type == BodyType::Dynamic);
        if !is_dynamic {
            continue;
        }
        let root = find(&mut parent, i);
        island_map.entry(root).or_default().push(i);
    }

    let threshold_sq = SLEEP_VELOCITY_THRESHOLD * SLEEP_VELOCITY_THRESHOLD;

    // Process each island
    for (_root, members) in &island_map {
        // Check if ALL bodies in the island are below velocity threshold
        let all_below = members.iter().all(|&i| {
            let b = bodies[i].as_ref().unwrap();
            let speed_sq = b.vx * b.vx + b.vy * b.vy;
            speed_sq < threshold_sq && b.angular_velocity.abs() < SLEEP_ANGULAR_THRESHOLD
        });

        if all_below {
            // Increment all timers. Find the minimum timer in the island.
            let mut min_timer = f32::MAX;
            for &i in members {
                let b = bodies[i].as_mut().unwrap();
                b.sleep_timer += dt;
                min_timer = min_timer.min(b.sleep_timer);
            }

            // Only sleep the entire island when ALL members have been still long enough
            if min_timer > SLEEP_TIME_THRESHOLD {
                for &i in members {
                    let b = bodies[i].as_mut().unwrap();
                    b.sleeping = true;
                    b.vx = 0.0;
                    b.vy = 0.0;
                    b.angular_velocity = 0.0;
                }
            }
        } else {
            // Any body above threshold → wake and reset the entire island
            for &i in members {
                let b = bodies[i].as_mut().unwrap();
                b.sleep_timer = 0.0;
                b.sleeping = false;
            }
        }
    }
}
