//! Replay ops: serialize/deserialize physics state for snapshot-replay testing.
//!
//! Provides `#[op2]` ops that serialize the physics world state to a flat f64 array
//! and restore it. This enables deterministic replay of physics simulations.

use std::cell::RefCell;
use std::rc::Rc;

use deno_core::OpState;

use crate::physics::types::*;
use super::physics_ops::PhysicsState;

/// Serialize the entire physics world state as a flat f64 array.
///
/// Layout per body:
///   [id, body_type, shape_type, shape_p1, shape_p2,
///    x, y, angle, vx, vy, angular_velocity,
///    mass, restitution, friction, layer, mask]
///   = 16 doubles per body
///
/// Header: [body_count, gravity_x, gravity_y]
#[deno_core::op2]
#[serde]
fn op_serialize_physics_state(state: &mut OpState) -> Vec<f64> {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let ps = physics.borrow();
    let world = match ps.0.as_ref() {
        Some(w) => w,
        None => return vec![],
    };

    let mut result: Vec<f64> = Vec::new();

    // Collect active bodies
    let bodies = world.all_bodies();
    let gravity = world.gravity();

    // Header
    result.push(bodies.len() as f64);
    result.push(gravity.0 as f64);
    result.push(gravity.1 as f64);

    // Body data
    for body in &bodies {
        result.push(body.id as f64);
        result.push(match body.body_type {
            BodyType::Static => 0.0,
            BodyType::Dynamic => 1.0,
            BodyType::Kinematic => 2.0,
        });
        match &body.shape {
            Shape::Circle { radius } => {
                result.push(0.0); // shape_type
                result.push(*radius as f64); // shape_p1
                result.push(0.0); // shape_p2
            }
            Shape::AABB { half_w, half_h } => {
                result.push(1.0); // shape_type
                result.push(*half_w as f64); // shape_p1
                result.push(*half_h as f64); // shape_p2
            }
            Shape::Polygon { .. } => {
                result.push(2.0); // shape_type
                result.push(0.0);
                result.push(0.0);
            }
        }
        result.push(body.x as f64);
        result.push(body.y as f64);
        result.push(body.angle as f64);
        result.push(body.vx as f64);
        result.push(body.vy as f64);
        result.push(body.angular_velocity as f64);
        result.push(body.mass as f64);
        result.push(body.material.restitution as f64);
        result.push(body.material.friction as f64);
        result.push(body.layer as f64);
        result.push(body.mask as f64);
    }

    result
}

/// Restore physics world state from a serialized f64 array.
///
/// Destroys the existing world and recreates it from the serialized data.
/// Uses the same layout as op_serialize_physics_state.
#[deno_core::op2]
fn op_restore_physics_state(state: &mut OpState, #[serde] data: Vec<f64>) {
    if data.len() < 3 {
        return;
    }

    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();

    let body_count = data[0] as usize;
    let gravity_x = data[1] as f32;
    let gravity_y = data[2] as f32;

    // Create a new world
    let mut world = crate::physics::world::PhysicsWorld::new(gravity_x, gravity_y);

    // Reconstruct bodies
    let mut offset = 3;
    for _ in 0..body_count {
        if offset + 16 > data.len() {
            break;
        }

        let _id = data[offset] as u32;
        let body_type = match data[offset + 1] as u32 {
            0 => BodyType::Static,
            1 => BodyType::Dynamic,
            2 => BodyType::Kinematic,
            _ => BodyType::Dynamic,
        };
        let shape_type = data[offset + 2] as u32;
        let shape_p1 = data[offset + 3] as f32;
        let shape_p2 = data[offset + 4] as f32;
        let x = data[offset + 5] as f32;
        let y = data[offset + 6] as f32;
        let _angle = data[offset + 7] as f32;
        let vx = data[offset + 8] as f32;
        let vy = data[offset + 9] as f32;
        let _angular_velocity = data[offset + 10] as f32;
        let mass = data[offset + 11] as f32;
        let restitution = data[offset + 12] as f32;
        let friction = data[offset + 13] as f32;
        let layer = data[offset + 14] as u16;
        let mask = data[offset + 15] as u16;

        let shape = match shape_type {
            0 => Shape::Circle { radius: shape_p1 },
            1 => Shape::AABB { half_w: shape_p1, half_h: shape_p2 },
            _ => Shape::AABB { half_w: shape_p1, half_h: shape_p2 },
        };

        let id = world.add_body(
            body_type,
            shape,
            x, y,
            mass,
            Material { restitution, friction },
            layer, mask,
        );

        // Restore velocity
        world.set_velocity(id, vx, vy);

        offset += 16;
    }

    ps.0 = Some(world);
}

/// Get the number of active bodies in the physics world.
#[deno_core::op2(fast)]
fn op_get_physics_body_count(state: &mut OpState) -> u32 {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let ps = physics.borrow();
    match ps.0.as_ref() {
        Some(world) => world.body_count() as u32,
        None => 0,
    }
}

deno_core::extension!(
    replay_ext,
    ops = [
        op_serialize_physics_state,
        op_restore_physics_state,
        op_get_physics_body_count,
    ],
);
