use std::cell::RefCell;
use std::rc::Rc;

use deno_core::OpState;

use crate::physics::types::*;
use crate::physics::world::PhysicsWorld;

/// Wrapper for physics state in OpState.
pub struct PhysicsState(pub Option<PhysicsWorld>);

#[deno_core::op2(fast)]
fn op_create_physics_world(state: &mut OpState, gravity_x: f64, gravity_y: f64) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    physics.borrow_mut().0 = Some(PhysicsWorld::new(gravity_x as f32, gravity_y as f32));
}

#[deno_core::op2(fast)]
fn op_destroy_physics_world(state: &mut OpState) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    physics.borrow_mut().0 = None;
}

#[deno_core::op2(fast)]
fn op_physics_step(state: &mut OpState, dt: f64) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    if let Some(world) = physics.borrow_mut().0.as_mut() {
        world.step(dt as f32);
    }
}

/// Create a body. shape_type: 0=circle, 1=aabb. body_type: 0=static, 1=dynamic, 2=kinematic.
/// For circle: shape_p1=radius, shape_p2 unused.
/// For AABB: shape_p1=half_w, shape_p2=half_h.
#[deno_core::op2(fast)]
fn op_create_body(
    state: &mut OpState,
    body_type: u32,
    shape_type: u32,
    shape_p1: f64,
    shape_p2: f64,
    x: f64,
    y: f64,
    mass: f64,
    restitution: f64,
    friction: f64,
    layer: u32,
    mask: u32,
) -> u32 {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    let world = match ps.0.as_mut() {
        Some(w) => w,
        None => return u32::MAX,
    };

    let bt = match body_type {
        0 => BodyType::Static,
        1 => BodyType::Dynamic,
        2 => BodyType::Kinematic,
        _ => return u32::MAX,
    };

    let shape = match shape_type {
        0 => Shape::Circle {
            radius: shape_p1 as f32,
        },
        1 => Shape::AABB {
            half_w: shape_p1 as f32,
            half_h: shape_p2 as f32,
        },
        _ => return u32::MAX,
    };

    let material = Material {
        restitution: restitution as f32,
        friction: friction as f32,
    };

    world.add_body(bt, shape, x as f32, y as f32, mass as f32, material, layer as u16, mask as u16)
}

#[deno_core::op2(fast)]
fn op_remove_body(state: &mut OpState, id: u32) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.remove_body(id);
    }
}

/// Returns [x, y, angle, vx, vy, angular_velocity] or empty vec.
#[deno_core::op2]
#[serde]
fn op_get_body_state(state: &mut OpState, id: u32) -> Vec<f64> {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let ps = physics.borrow();
    match ps.0.as_ref().and_then(|w| w.get_body(id)) {
        Some(body) => vec![
            body.x as f64,
            body.y as f64,
            body.angle as f64,
            body.vx as f64,
            body.vy as f64,
            body.angular_velocity as f64,
            if body.sleeping { 1.0 } else { 0.0 },
        ],
        None => vec![],
    }
}

#[deno_core::op2(fast)]
fn op_set_body_velocity(state: &mut OpState, id: u32, vx: f64, vy: f64) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.set_velocity(id, vx as f32, vy as f32);
    }
}

#[deno_core::op2(fast)]
fn op_set_body_angular_velocity(state: &mut OpState, id: u32, av: f64) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.set_angular_velocity(id, av as f32);
    }
}

#[deno_core::op2(fast)]
fn op_apply_force(state: &mut OpState, id: u32, fx: f64, fy: f64) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.apply_force(id, fx as f32, fy as f32);
    }
}

#[deno_core::op2(fast)]
fn op_apply_impulse(state: &mut OpState, id: u32, ix: f64, iy: f64) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.apply_impulse(id, ix as f32, iy as f32);
    }
}

#[deno_core::op2(fast)]
fn op_set_body_position(state: &mut OpState, id: u32, x: f64, y: f64) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.set_position(id, x as f32, y as f32);
    }
}

#[deno_core::op2(fast)]
fn op_set_collision_layers(state: &mut OpState, id: u32, layer: u32, mask: u32) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.set_collision_layers(id, layer as u16, mask as u16);
    }
}

#[deno_core::op2(fast)]
fn op_create_distance_joint(
    state: &mut OpState,
    body_a: u32,
    body_b: u32,
    distance: f64,
) -> u32 {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    match ps.0.as_mut() {
        Some(world) => world.add_constraint(Constraint::Distance {
            id: 0,
            body_a,
            body_b,
            distance: distance as f32,
            anchor_a: (0.0, 0.0),
            anchor_b: (0.0, 0.0),
        }),
        None => u32::MAX,
    }
}

#[deno_core::op2(fast)]
fn op_create_revolute_joint(
    state: &mut OpState,
    body_a: u32,
    body_b: u32,
    pivot_x: f64,
    pivot_y: f64,
) -> u32 {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    match ps.0.as_mut() {
        Some(world) => {
            // Compute local anchor offsets from body centers to pivot
            let (anchor_a, anchor_b) = {
                let ba = world.get_body(body_a);
                let bb = world.get_body(body_b);
                let pivot = (pivot_x as f32, pivot_y as f32);
                let anchor_a = match ba {
                    Some(b) => {
                        let cos = b.angle.cos();
                        let sin = b.angle.sin();
                        let dx = pivot.0 - b.x;
                        let dy = pivot.1 - b.y;
                        // Rotate into body-local space
                        (dx * cos + dy * sin, -dx * sin + dy * cos)
                    }
                    None => (0.0, 0.0),
                };
                let anchor_b = match bb {
                    Some(b) => {
                        let cos = b.angle.cos();
                        let sin = b.angle.sin();
                        let dx = pivot.0 - b.x;
                        let dy = pivot.1 - b.y;
                        // Rotate into body-local space
                        (dx * cos + dy * sin, -dx * sin + dy * cos)
                    }
                    None => (0.0, 0.0),
                };
                (anchor_a, anchor_b)
            };
            world.add_constraint(Constraint::Revolute {
                id: 0,
                body_a,
                body_b,
                anchor_a,
                anchor_b,
            })
        },
        None => u32::MAX,
    }
}

#[deno_core::op2(fast)]
fn op_remove_constraint(state: &mut OpState, id: u32) {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    if let Some(world) = ps.0.as_mut() {
        world.remove_constraint(id);
    }
}

/// Returns body IDs overlapping the query rectangle.
#[deno_core::op2]
#[serde]
fn op_query_aabb(
    state: &mut OpState,
    min_x: f64,
    min_y: f64,
    max_x: f64,
    max_y: f64,
) -> Vec<u32> {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let ps = physics.borrow();
    match ps.0.as_ref() {
        Some(world) => world.query_aabb(min_x as f32, min_y as f32, max_x as f32, max_y as f32),
        None => vec![],
    }
}

/// Returns [] for no hit, [body_id, hit_x, hit_y, distance] for hit.
#[deno_core::op2]
#[serde]
fn op_raycast(
    state: &mut OpState,
    origin_x: f64,
    origin_y: f64,
    dir_x: f64,
    dir_y: f64,
    max_dist: f64,
) -> Vec<f64> {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let ps = physics.borrow();
    match ps.0.as_ref() {
        Some(world) => {
            match world.raycast(
                origin_x as f32,
                origin_y as f32,
                dir_x as f32,
                dir_y as f32,
                max_dist as f32,
            ) {
                Some((id, hx, hy, dist)) => {
                    vec![id as f64, hx as f64, hy as f64, dist as f64]
                }
                None => vec![],
            }
        }
        None => vec![],
    }
}

/// Create a polygon body. vertices is a flat [x0, y0, x1, y1, ...] array.
/// body_type: 0=static, 1=dynamic, 2=kinematic.
#[deno_core::op2]
fn op_create_polygon_body(
    state: &mut OpState,
    body_type: u32,
    #[serde] vertices: Vec<f64>,
    x: f64,
    y: f64,
    mass: f64,
    restitution: f64,
    friction: f64,
    layer: u32,
    mask: u32,
) -> u32 {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let mut ps = physics.borrow_mut();
    let world = match ps.0.as_mut() {
        Some(w) => w,
        None => return u32::MAX,
    };

    let bt = match body_type {
        0 => BodyType::Static,
        1 => BodyType::Dynamic,
        2 => BodyType::Kinematic,
        _ => return u32::MAX,
    };

    // Convert flat vertex array to Vec<(f32, f32)>
    if vertices.len() < 6 || vertices.len() % 2 != 0 {
        return u32::MAX; // Need at least 3 vertices (6 values)
    }
    let polygon_verts: Vec<(f32, f32)> = vertices
        .chunks(2)
        .map(|c| (c[0] as f32, c[1] as f32))
        .collect();

    let shape = Shape::Polygon { vertices: polygon_verts };

    let material = Material {
        restitution: restitution as f32,
        friction: friction as f32,
    };

    world.add_body(bt, shape, x as f32, y as f32, mass as f32, material, layer as u16, mask as u16)
}

/// Returns flattened contacts: [bodyA, bodyB, nx, ny, penetration, contactX, contactY, ...].
#[deno_core::op2]
#[serde]
fn op_get_contacts(state: &mut OpState) -> Vec<f64> {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let ps = physics.borrow();
    match ps.0.as_ref() {
        Some(world) => {
            let contacts = world.get_contacts();
            let mut result = Vec::with_capacity(contacts.len() * 7);
            for c in contacts {
                result.push(c.body_a as f64);
                result.push(c.body_b as f64);
                result.push(c.normal.0 as f64);
                result.push(c.normal.1 as f64);
                result.push(c.penetration as f64);
                result.push(c.contact_point.0 as f64);
                result.push(c.contact_point.1 as f64);
            }
            result
        }
        None => vec![],
    }
}

/// Get all body states as a packed f64 array for bulk readback.
/// Layout per body: [id, x, y, vx, vy, angle, angular_velocity, is_sleeping(0/1)] = 8 f64s.
/// Only includes bodies that exist (skips removed/empty slots).
#[deno_core::op2]
#[serde]
fn op_get_all_body_states(state: &mut OpState) -> Vec<f64> {
    let physics = state.borrow_mut::<Rc<RefCell<PhysicsState>>>();
    let ps = physics.borrow();
    match ps.0.as_ref() {
        Some(world) => {
            let bodies = world.all_bodies();
            let mut result = Vec::with_capacity(bodies.len() * 8);
            for body in bodies {
                result.push(body.id as f64);
                result.push(body.x as f64);
                result.push(body.y as f64);
                result.push(body.vx as f64);
                result.push(body.vy as f64);
                result.push(body.angle as f64);
                result.push(body.angular_velocity as f64);
                result.push(if body.sleeping { 1.0 } else { 0.0 });
            }
            result
        }
        None => vec![],
    }
}

deno_core::extension!(
    physics_ext,
    ops = [
        op_create_physics_world,
        op_destroy_physics_world,
        op_physics_step,
        op_create_body,
        op_create_polygon_body,
        op_remove_body,
        op_get_body_state,
        op_set_body_velocity,
        op_set_body_angular_velocity,
        op_apply_force,
        op_apply_impulse,
        op_set_body_position,
        op_set_collision_layers,
        op_create_distance_joint,
        op_create_revolute_joint,
        op_remove_constraint,
        op_query_aabb,
        op_raycast,
        op_get_contacts,
        op_get_all_body_states,
    ],
);
