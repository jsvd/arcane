use super::types::{BodyType, RigidBody};

/// Semi-implicit Euler integration.
/// Applies gravity, updates velocity from forces, updates position from velocity.
pub fn integrate(body: &mut RigidBody, gravity_x: f32, gravity_y: f32, dt: f32) {
    if body.body_type == BodyType::Static || body.sleeping {
        body.fx = 0.0;
        body.fy = 0.0;
        body.torque = 0.0;
        return;
    }

    // Apply gravity to dynamic bodies (not kinematic)
    if body.body_type == BodyType::Dynamic {
        body.fx += gravity_x * body.mass;
        body.fy += gravity_y * body.mass;
    }

    // Update velocity from forces
    body.vx += body.fx * body.inv_mass * dt;
    body.vy += body.fy * body.inv_mass * dt;
    body.angular_velocity += body.torque * body.inv_inertia * dt;

    // Update position from velocity
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    body.angle += body.angular_velocity * dt;

    // Clear accumulated forces
    body.fx = 0.0;
    body.fy = 0.0;
    body.torque = 0.0;
}
