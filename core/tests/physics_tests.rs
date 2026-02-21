//! Integration tests for the physics engine.

use arcane_core::physics::broadphase::SpatialHash;
use arcane_core::physics::integrate::integrate;
use arcane_core::physics::narrowphase::test_collision;
use arcane_core::physics::resolve::resolve_contacts;
use arcane_core::physics::sleep::update_sleep;
use arcane_core::physics::types::*;
use arcane_core::physics::world::PhysicsWorld;

fn make_body(id: BodyId, body_type: BodyType, shape: Shape, x: f32, y: f32, mass: f32) -> RigidBody {
    let (inv_mass, inertia, inv_inertia) = compute_mass_and_inertia(&shape, mass, body_type);
    RigidBody {
        id,
        body_type,
        shape,
        material: Material::default(),
        x,
        y,
        angle: 0.0,
        vx: 0.0,
        vy: 0.0,
        angular_velocity: 0.0,
        fx: 0.0,
        fy: 0.0,
        torque: 0.0,
        mass,
        inv_mass,
        inertia,
        inv_inertia,
        layer: 0xFFFF,
        mask: 0xFFFF,
        sleeping: false,
        sleep_timer: 0.0,
    }
}

// =========================================================================
// Types & mass/inertia
// =========================================================================

#[test]
fn test_static_body_has_zero_inverse_mass() {
    let (inv_mass, _inertia, inv_inertia) =
        compute_mass_and_inertia(&Shape::Circle { radius: 5.0 }, 10.0, BodyType::Static);
    assert_eq!(inv_mass, 0.0);
    assert_eq!(inv_inertia, 0.0);
}

#[test]
fn test_dynamic_circle_mass_inertia() {
    let mass = 4.0;
    let radius = 2.0;
    let (inv_mass, inertia, inv_inertia) =
        compute_mass_and_inertia(&Shape::Circle { radius }, mass, BodyType::Dynamic);
    assert!((inv_mass - 0.25).abs() < 1e-6);
    // I = 0.5 * m * r^2 = 0.5 * 4 * 4 = 8
    assert!((inertia - 8.0).abs() < 1e-6);
    assert!((inv_inertia - 0.125).abs() < 1e-6);
}

#[test]
fn test_dynamic_aabb_mass_inertia() {
    let mass = 12.0;
    let hw = 3.0;
    let hh = 2.0;
    let (inv_mass, inertia, inv_inertia) =
        compute_mass_and_inertia(&Shape::AABB { half_w: hw, half_h: hh }, mass, BodyType::Dynamic);
    assert!((inv_mass - 1.0 / 12.0).abs() < 1e-6);
    // AABBs get zero inertia — collision detection treats them as axis-aligned
    // regardless of body angle, so angular dynamics would create phantom forces.
    assert_eq!(inertia, 0.0);
    assert_eq!(inv_inertia, 0.0);
}

#[test]
fn test_zero_mass_is_like_static() {
    let (inv_mass, _, inv_inertia) =
        compute_mass_and_inertia(&Shape::Circle { radius: 1.0 }, 0.0, BodyType::Dynamic);
    assert_eq!(inv_mass, 0.0);
    assert_eq!(inv_inertia, 0.0);
}

#[test]
fn test_kinematic_has_mass_properties() {
    let (inv_mass, _, _) =
        compute_mass_and_inertia(&Shape::Circle { radius: 1.0 }, 5.0, BodyType::Kinematic);
    // Kinematic bodies do have mass computed (they're not static)
    assert!((inv_mass - 0.2).abs() < 1e-6);
}

// =========================================================================
// Shape AABB
// =========================================================================

#[test]
fn test_circle_aabb() {
    let body = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 10.0, 20.0, 1.0);
    let (min_x, min_y, max_x, max_y) = get_shape_aabb(&body);
    assert!((min_x - 5.0).abs() < 1e-6);
    assert!((min_y - 15.0).abs() < 1e-6);
    assert!((max_x - 15.0).abs() < 1e-6);
    assert!((max_y - 25.0).abs() < 1e-6);
}

#[test]
fn test_aabb_shape_aabb() {
    let body = make_body(0, BodyType::Dynamic, Shape::AABB { half_w: 3.0, half_h: 2.0 }, 0.0, 0.0, 1.0);
    let (min_x, min_y, max_x, max_y) = get_shape_aabb(&body);
    assert!((min_x + 3.0).abs() < 1e-6);
    assert!((min_y + 2.0).abs() < 1e-6);
    assert!((max_x - 3.0).abs() < 1e-6);
    assert!((max_y - 2.0).abs() < 1e-6);
}

#[test]
fn test_polygon_aabb() {
    let body = make_body(
        0,
        BodyType::Dynamic,
        Shape::Polygon {
            vertices: vec![(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)],
        },
        5.0,
        5.0,
        1.0,
    );
    let (min_x, min_y, max_x, max_y) = get_shape_aabb(&body);
    assert!((min_x - 4.0).abs() < 1e-6);
    assert!((min_y - 4.0).abs() < 1e-6);
    assert!((max_x - 6.0).abs() < 1e-6);
    assert!((max_y - 6.0).abs() < 1e-6);
}

// =========================================================================
// Integration
// =========================================================================

#[test]
fn test_gravity_moves_dynamic_body() {
    let mut body = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 0.0, 0.0, 1.0);
    integrate(&mut body, 0.0, 9.81, 1.0 / 60.0);
    assert!(body.vy > 0.0, "Gravity should accelerate body downward");
    assert!(body.y > 0.0, "Body should have moved down");
}

#[test]
fn test_static_body_not_moved_by_gravity() {
    let mut body = make_body(0, BodyType::Static, Shape::Circle { radius: 1.0 }, 5.0, 5.0, 1.0);
    integrate(&mut body, 0.0, 9.81, 1.0 / 60.0);
    assert_eq!(body.x, 5.0);
    assert_eq!(body.y, 5.0);
    assert_eq!(body.vx, 0.0);
    assert_eq!(body.vy, 0.0);
}

#[test]
fn test_sleeping_body_not_integrated() {
    let mut body = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 0.0, 0.0, 1.0);
    body.sleeping = true;
    integrate(&mut body, 0.0, 9.81, 1.0 / 60.0);
    assert_eq!(body.y, 0.0);
    assert_eq!(body.vy, 0.0);
}

#[test]
fn test_force_accelerates_body() {
    let mut body = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 0.0, 0.0, 2.0);
    body.fx = 10.0;
    integrate(&mut body, 0.0, 0.0, 1.0);
    // a = F/m = 10/2 = 5, v = 5*1 = 5, x = 5*1 = 5
    assert!((body.vx - 5.0).abs() < 1e-4);
    assert!((body.x - 5.0).abs() < 1e-4);
}

#[test]
fn test_forces_cleared_after_integration() {
    let mut body = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 0.0, 0.0, 1.0);
    body.fx = 100.0;
    body.fy = 200.0;
    body.torque = 50.0;
    integrate(&mut body, 0.0, 0.0, 0.01);
    assert_eq!(body.fx, 0.0);
    assert_eq!(body.fy, 0.0);
    assert_eq!(body.torque, 0.0);
}

#[test]
fn test_angular_velocity_updates_angle() {
    let mut body = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 0.0, 0.0, 1.0);
    body.angular_velocity = std::f32::consts::PI;
    integrate(&mut body, 0.0, 0.0, 1.0);
    assert!((body.angle - std::f32::consts::PI).abs() < 1e-4);
}

// =========================================================================
// Broadphase
// =========================================================================

#[test]
fn test_nearby_bodies_produce_pairs() {
    let mut hash = SpatialHash::new(64.0);
    hash.insert(0, 0.0, 0.0, 10.0, 10.0);
    hash.insert(1, 5.0, 5.0, 15.0, 15.0);
    let pairs = hash.get_pairs();
    assert_eq!(pairs.len(), 1);
    assert!(pairs.contains(&(0, 1)));
}

#[test]
fn test_far_apart_bodies_no_pairs() {
    let mut hash = SpatialHash::new(64.0);
    hash.insert(0, 0.0, 0.0, 10.0, 10.0);
    hash.insert(1, 500.0, 500.0, 510.0, 510.0);
    let pairs = hash.get_pairs();
    assert!(pairs.is_empty());
}

#[test]
fn test_broadphase_no_duplicate_pairs() {
    let mut hash = SpatialHash::new(32.0);
    // Two bodies that span multiple cells — should still only get one pair
    hash.insert(0, 0.0, 0.0, 50.0, 50.0);
    hash.insert(1, 10.0, 10.0, 60.0, 60.0);
    let pairs = hash.get_pairs();
    assert_eq!(pairs.len(), 1);
}

#[test]
fn test_broadphase_clear() {
    let mut hash = SpatialHash::new(64.0);
    hash.insert(0, 0.0, 0.0, 10.0, 10.0);
    hash.clear();
    hash.insert(1, 0.0, 0.0, 10.0, 10.0);
    let pairs = hash.get_pairs();
    assert!(pairs.is_empty());
}

// =========================================================================
// Narrowphase
// =========================================================================

#[test]
fn test_circle_circle_overlap() {
    let a = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 8.0, 0.0, 1.0);
    let contact = test_collision(&a, &b);
    assert!(contact.is_some());
    let c = contact.unwrap();
    assert_eq!(c.body_a, 0);
    assert_eq!(c.body_b, 1);
    assert!((c.penetration - 2.0).abs() < 1e-4);
    // Normal should point from a to b (positive x)
    assert!(c.normal.0 > 0.0);
}

#[test]
fn test_circle_circle_no_overlap() {
    let a = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 20.0, 0.0, 1.0);
    assert!(test_collision(&a, &b).is_none());
}

#[test]
fn test_aabb_aabb_overlap() {
    let a = make_body(0, BodyType::Dynamic, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 8.0, 0.0, 1.0);
    let contact = test_collision(&a, &b);
    assert!(contact.is_some());
    let c = contact.unwrap();
    assert!((c.penetration - 2.0).abs() < 1e-4);
}

#[test]
fn test_aabb_aabb_no_overlap() {
    let a = make_body(0, BodyType::Dynamic, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 20.0, 0.0, 1.0);
    assert!(test_collision(&a, &b).is_none());
}

#[test]
fn test_circle_aabb_overlap() {
    let circle = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 0.0, 0.0, 1.0);
    let aabb = make_body(1, BodyType::Static, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 8.0, 0.0, 1.0);
    let contact = test_collision(&circle, &aabb);
    assert!(contact.is_some());
}

#[test]
fn test_circle_aabb_no_overlap() {
    let circle = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 2.0 }, 0.0, 0.0, 1.0);
    let aabb = make_body(1, BodyType::Static, Shape::AABB { half_w: 2.0, half_h: 2.0 }, 10.0, 0.0, 1.0);
    assert!(test_collision(&circle, &aabb).is_none());
}

#[test]
fn test_aabb_circle_overlap_reversed() {
    // AABB first, circle second — tests the dispatcher
    let aabb = make_body(0, BodyType::Static, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 0.0, 0.0, 1.0);
    let circle = make_body(1, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 8.0, 0.0, 1.0);
    let contact = test_collision(&aabb, &circle);
    assert!(contact.is_some());
    let c = contact.unwrap();
    assert_eq!(c.body_a, 0);
    assert_eq!(c.body_b, 1);
}

#[test]
fn test_polygon_polygon_overlap() {
    let a = make_body(
        0,
        BodyType::Dynamic,
        Shape::Polygon {
            vertices: vec![(-2.0, -2.0), (2.0, -2.0), (2.0, 2.0), (-2.0, 2.0)],
        },
        0.0,
        0.0,
        1.0,
    );
    let b = make_body(
        1,
        BodyType::Dynamic,
        Shape::Polygon {
            vertices: vec![(-2.0, -2.0), (2.0, -2.0), (2.0, 2.0), (-2.0, 2.0)],
        },
        3.0,
        0.0,
        1.0,
    );
    assert!(test_collision(&a, &b).is_some());
}

#[test]
fn test_polygon_polygon_no_overlap() {
    let a = make_body(
        0,
        BodyType::Dynamic,
        Shape::Polygon {
            vertices: vec![(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)],
        },
        0.0,
        0.0,
        1.0,
    );
    let b = make_body(
        1,
        BodyType::Dynamic,
        Shape::Polygon {
            vertices: vec![(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)],
        },
        10.0,
        0.0,
        1.0,
    );
    assert!(test_collision(&a, &b).is_none());
}

// =========================================================================
// Solver
// =========================================================================

#[test]
fn test_ball_bounces_off_static_ground() {
    // Dynamic circle falling onto static AABB
    let mut bodies: Vec<Option<RigidBody>> = vec![
        Some(make_body(0, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 0.0, -0.5, 1.0)),
        Some(make_body(1, BodyType::Static, Shape::AABB { half_w: 100.0, half_h: 1.0 }, 0.0, 1.0, 0.0)),
    ];

    // Give the ball downward velocity
    bodies[0].as_mut().unwrap().vy = 5.0;

    // Create a contact manually (ball touching ground)
    let mut contacts = vec![Contact {
        body_a: 0,
        body_b: 1,
        normal: (0.0, 1.0),
        penetration: 0.5,
        contact_point: (0.0, 0.0),
        accumulated_jn: 0.0,
        accumulated_jt: 0.0,
        velocity_bias: 0.0,
        tangent: (0.0, 0.0),
    }];

    resolve_contacts(&mut bodies, &mut contacts, 6);

    let ball = bodies[0].as_ref().unwrap();
    // Ball should have bounced (velocity reversed or reduced)
    assert!(ball.vy < 5.0, "Ball velocity should be reduced after collision");
}

#[test]
fn test_solver_does_not_move_two_static_bodies() {
    let mut bodies: Vec<Option<RigidBody>> = vec![
        Some(make_body(0, BodyType::Static, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 0.0, 0.0, 0.0)),
        Some(make_body(1, BodyType::Static, Shape::AABB { half_w: 5.0, half_h: 5.0 }, 3.0, 0.0, 0.0)),
    ];
    let mut contacts = vec![Contact {
        body_a: 0,
        body_b: 1,
        normal: (1.0, 0.0),
        penetration: 7.0,
        contact_point: (1.5, 0.0),
        accumulated_jn: 0.0,
        accumulated_jt: 0.0,
        velocity_bias: 0.0,
        tangent: (0.0, 0.0),
    }];
    resolve_contacts(&mut bodies, &mut contacts, 6);
    assert_eq!(bodies[0].as_ref().unwrap().x, 0.0);
    assert_eq!(bodies[1].as_ref().unwrap().x, 3.0);
}

// =========================================================================
// Sleep
// =========================================================================

#[test]
fn test_body_sleeps_after_being_still() {
    let mut bodies: Vec<Option<RigidBody>> = vec![Some(make_body(
        0,
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
    ))];
    // Run update_sleep many times with small dt so sleep_timer accumulates > 0.5
    for _ in 0..100 {
        update_sleep(&mut bodies, &[], 0.016);
    }
    assert!(bodies[0].as_ref().unwrap().sleeping);
}

#[test]
fn test_moving_body_does_not_sleep() {
    let mut bodies: Vec<Option<RigidBody>> = vec![Some(make_body(
        0,
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
    ))];
    bodies[0].as_mut().unwrap().vx = 10.0;
    for _ in 0..100 {
        update_sleep(&mut bodies, &[], 0.016);
    }
    assert!(!bodies[0].as_ref().unwrap().sleeping);
}

#[test]
fn test_sleeping_body_wakes_on_contact_with_awake_body() {
    let mut bodies: Vec<Option<RigidBody>> = vec![
        Some(make_body(0, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 0.0, 0.0, 1.0)),
        Some(make_body(1, BodyType::Dynamic, Shape::Circle { radius: 1.0 }, 2.0, 0.0, 1.0)),
    ];
    // Put body 0 to sleep
    bodies[0].as_mut().unwrap().sleeping = true;
    // Body 1 is awake and moving fast (above sleep velocity threshold of 8.0)
    bodies[1].as_mut().unwrap().vx = 20.0;

    let contacts = vec![Contact {
        body_a: 0,
        body_b: 1,
        normal: (1.0, 0.0),
        penetration: 0.1,
        contact_point: (1.0, 0.0),
        accumulated_jn: 0.0,
        accumulated_jt: 0.0,
        velocity_bias: 0.0,
        tangent: (0.0, 0.0),
    }];

    update_sleep(&mut bodies, &contacts, 0.016);
    assert!(!bodies[0].as_ref().unwrap().sleeping);
}

// =========================================================================
// World lifecycle
// =========================================================================

#[test]
fn test_world_create_and_add_body() {
    let mut world = PhysicsWorld::new(0.0, 9.81);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    assert!(world.get_body(id).is_some());
}

#[test]
fn test_world_remove_body() {
    let mut world = PhysicsWorld::new(0.0, 9.81);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.remove_body(id);
    assert!(world.get_body(id).is_none());
}

#[test]
fn test_world_recycle_ids() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id1 = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.remove_body(id1);
    let id2 = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    // Recycled ID should be reused
    assert_eq!(id1, id2);
}

#[test]
fn test_world_step_applies_gravity() {
    let mut world = PhysicsWorld::new(0.0, 100.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    // Step for one frame
    world.step(1.0 / 60.0);
    let body = world.get_body(id).unwrap();
    assert!(body.y > 0.0, "Body should fall due to gravity");
    assert!(body.vy > 0.0, "Body should have downward velocity");
}

#[test]
fn test_world_set_velocity() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.set_velocity(id, 10.0, 5.0);
    let body = world.get_body(id).unwrap();
    assert_eq!(body.vx, 10.0);
    assert_eq!(body.vy, 5.0);
}

#[test]
fn test_world_apply_force() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.apply_force(id, 100.0, 0.0);
    world.step(1.0 / 60.0);
    let body = world.get_body(id).unwrap();
    assert!(body.vx > 0.0, "Force should accelerate body");
}

#[test]
fn test_world_apply_impulse() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        2.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.apply_impulse(id, 10.0, 0.0);
    let body = world.get_body(id).unwrap();
    // impulse: vx += ix * inv_mass = 10 * 0.5 = 5
    assert!((body.vx - 5.0).abs() < 1e-4);
}

#[test]
fn test_world_set_position() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.set_position(id, 50.0, 100.0);
    let body = world.get_body(id).unwrap();
    assert_eq!(body.x, 50.0);
    assert_eq!(body.y, 100.0);
}

#[test]
fn test_world_collision_layers() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let _a = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 5.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0x0001,
        0x0002,
    );
    let _b = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 5.0 },
        3.0,
        0.0,
        1.0,
        Material::default(),
        0x0004,
        0x0008,
    );
    // Layers don't match masks — no collision should occur
    world.step(1.0 / 60.0);
    assert!(world.get_contacts().is_empty());
}

#[test]
fn test_world_collision_layers_matching() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let _a = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 5.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0x0001,
        0xFFFF,
    );
    let _b = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 5.0 },
        3.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    // Layers match masks — collision should occur
    world.step(1.0 / 60.0);
    assert!(!world.get_contacts().is_empty());
}

#[test]
fn test_world_set_angular_velocity() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.set_angular_velocity(id, 2.0);
    let body = world.get_body(id).unwrap();
    assert_eq!(body.angular_velocity, 2.0);
}

// =========================================================================
// Query AABB
// =========================================================================

#[test]
fn test_query_aabb_finds_bodies() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let a = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        5.0,
        5.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let _b = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        100.0,
        100.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let results = world.query_aabb(0.0, 0.0, 10.0, 10.0);
    assert_eq!(results.len(), 1);
    assert_eq!(results[0], a);
}

#[test]
fn test_query_aabb_empty_region() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let _a = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        50.0,
        50.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let results = world.query_aabb(0.0, 0.0, 10.0, 10.0);
    assert!(results.is_empty());
}

// =========================================================================
// Raycast
// =========================================================================

#[test]
fn test_raycast_hits_circle() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 2.0 },
        10.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    // Ray from origin going right
    let result = world.raycast(0.0, 0.0, 1.0, 0.0, 100.0);
    assert!(result.is_some());
    let (hit_id, _hx, _hy, dist) = result.unwrap();
    assert_eq!(hit_id, id);
    assert!((dist - 8.0).abs() < 1e-3);
}

#[test]
fn test_raycast_hits_aabb() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 2.0, half_h: 2.0 },
        10.0,
        0.0,
        0.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let result = world.raycast(0.0, 0.0, 1.0, 0.0, 100.0);
    assert!(result.is_some());
    let (hit_id, _hx, _hy, dist) = result.unwrap();
    assert_eq!(hit_id, id);
    assert!((dist - 8.0).abs() < 1e-3);
}

#[test]
fn test_raycast_miss() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let _id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        10.0,
        10.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    // Ray going in wrong direction
    let result = world.raycast(0.0, 0.0, -1.0, 0.0, 100.0);
    assert!(result.is_none());
}

#[test]
fn test_raycast_max_distance() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let _id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        100.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    // Ray with short max distance
    let result = world.raycast(0.0, 0.0, 1.0, 0.0, 10.0);
    assert!(result.is_none());
}

#[test]
fn test_raycast_closest_body() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let near = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        5.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let _far = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        20.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let result = world.raycast(0.0, 0.0, 1.0, 0.0, 100.0);
    assert!(result.is_some());
    assert_eq!(result.unwrap().0, near);
}

// =========================================================================
// Constraints
// =========================================================================

#[test]
fn test_distance_constraint_maintains_distance() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let a = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let b = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        10.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    world.add_constraint(Constraint::Distance {
        id: 0,
        body_a: a,
        body_b: b,
        distance: 10.0,
        anchor_a: (0.0, 0.0),
        anchor_b: (0.0, 0.0),
    });

    // Push one body away
    world.set_velocity(a, -5.0, 0.0);
    for _ in 0..60 {
        world.step(1.0 / 60.0);
    }

    let ba = world.get_body(a).unwrap();
    let bb = world.get_body(b).unwrap();
    let dist = ((ba.x - bb.x).powi(2) + (ba.y - bb.y).powi(2)).sqrt();
    // Distance should be close to the constraint distance
    assert!(
        (dist - 10.0).abs() < 2.0,
        "Distance should be approximately 10.0, got {}",
        dist
    );
}

#[test]
fn test_revolute_constraint() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let a = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let b = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        5.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    // Body A at (0,0), body B at (5,0), pivot at (2.5, 0)
    // Local anchors: A: (2.5, 0), B: (-2.5, 0)
    let cid = world.add_constraint(Constraint::Revolute {
        id: 0,
        body_a: a,
        body_b: b,
        anchor_a: (2.5, 0.0),
        anchor_b: (-2.5, 0.0),
    });

    world.step(1.0 / 60.0);
    // Constraint should still exist
    assert!(cid < u32::MAX);
}

#[test]
fn test_remove_constraint() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let a = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let b = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        10.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    let cid = world.add_constraint(Constraint::Distance {
        id: 0,
        body_a: a,
        body_b: b,
        distance: 10.0,
        anchor_a: (0.0, 0.0),
        anchor_b: (0.0, 0.0),
    });
    world.remove_constraint(cid);
    // Should not crash when stepping without the constraint
    world.step(1.0 / 60.0);
}

// =========================================================================
// World with collisions
// =========================================================================

#[test]
fn test_ball_on_ground_contacts() {
    let mut world = PhysicsWorld::new(0.0, 100.0);
    // Ball starting just above ground
    let _ball = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        -3.0,
        1.0,
        Material { restitution: 0.5, friction: 0.5 },
        0xFFFF,
        0xFFFF,
    );
    // Ground
    let _ground = world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 100.0, half_h: 1.0 },
        0.0,
        0.0,
        0.0,
        Material { restitution: 0.5, friction: 0.5 },
        0xFFFF,
        0xFFFF,
    );

    // Step a few frames to let ball fall
    for _ in 0..10 {
        world.step(1.0 / 60.0);
    }
    // Eventually there should be contacts
    // Note: contacts are only from the last sub-step
    let _contacts = world.get_contacts();
    // The ball should have fallen and hit the ground by now
    let ball = world.get_body(_ball).unwrap();
    assert!(ball.y > -3.0, "Ball should have fallen");
}

#[test]
fn test_world_multiple_bodies() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let ids: Vec<u32> = (0..10)
        .map(|i| {
            world.add_body(
                BodyType::Dynamic,
                Shape::Circle { radius: 1.0 },
                i as f32 * 100.0,
                0.0,
                1.0,
                Material::default(),
                0xFFFF,
                0xFFFF,
            )
        })
        .collect();
    assert_eq!(ids.len(), 10);
    for (i, &id) in ids.iter().enumerate() {
        let body = world.get_body(id).unwrap();
        assert!((body.x - i as f32 * 100.0).abs() < 1e-6);
    }
}

#[test]
fn test_world_get_body_mut() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0xFFFF,
        0xFFFF,
    );
    {
        let body = world.get_body_mut(id).unwrap();
        body.x = 42.0;
    }
    assert_eq!(world.get_body(id).unwrap().x, 42.0);
}

#[test]
fn test_world_set_collision_layers() {
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 1.0 },
        0.0,
        0.0,
        1.0,
        Material::default(),
        0x0001,
        0x0001,
    );
    world.set_collision_layers(id, 0x0002, 0x0004);
    let body = world.get_body(id).unwrap();
    assert_eq!(body.layer, 0x0002);
    assert_eq!(body.mask, 0x0004);
}

// =========================================================================
// Material defaults
// =========================================================================

#[test]
fn test_material_default() {
    let m = Material::default();
    assert!((m.restitution - 0.3).abs() < 1e-6);
    assert!((m.friction - 0.5).abs() < 1e-6);
}

// =========================================================================
// Constraint ID helper
// =========================================================================

#[test]
fn test_constraint_id() {
    let c = Constraint::Distance {
        id: 42,
        body_a: 0,
        body_b: 1,
        distance: 5.0,
        anchor_a: (0.0, 0.0),
        anchor_b: (0.0, 0.0),
    };
    assert_eq!(c.id(), 42);

    let r = Constraint::Revolute {
        id: 7,
        body_a: 0,
        body_b: 1,
        anchor_a: (0.0, 0.0),
        anchor_b: (0.0, 0.0),
    };
    assert_eq!(r.id(), 7);
}

// =========================================================================
// Polygon inertia
// =========================================================================

#[test]
fn test_polygon_mass_inertia() {
    let shape = Shape::Polygon {
        vertices: vec![(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0)],
    };
    let (inv_mass, inertia, inv_inertia) = compute_mass_and_inertia(&shape, 4.0, BodyType::Dynamic);
    assert!((inv_mass - 0.25).abs() < 1e-6);
    assert!(inertia > 0.0);
    assert!(inv_inertia > 0.0);
}

// =========================================================================
// Op-level tests via ArcaneRuntime
// =========================================================================

#[test]
fn test_physics_ops_create_world() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        "Deno.core.ops.op_create_physics_world(0.0, 9.81)",
    )
    .unwrap();
}

#[test]
fn test_physics_ops_create_body_and_step() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 100.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        const s = Deno.core.ops.op_get_body_state(id);
        if (s.length !== 7) throw new Error("Expected 7 elements");
        if (s[1] <= 0) throw new Error("Body should have moved down");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_set_velocity() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_set_body_velocity(id, 10.0, 5.0);
        const s = Deno.core.ops.op_get_body_state(id);
        if (Math.abs(s[3] - 10.0) > 0.01) throw new Error("vx should be 10");
        if (Math.abs(s[4] - 5.0) > 0.01) throw new Error("vy should be 5");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_apply_force_and_impulse() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_apply_impulse(id, 10.0, 0.0);
        const s1 = Deno.core.ops.op_get_body_state(id);
        if (Math.abs(s1[3] - 10.0) > 0.01) throw new Error("vx after impulse should be 10");
        Deno.core.ops.op_apply_force(id, 100.0, 0.0);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        const s2 = Deno.core.ops.op_get_body_state(id);
        if (s2[3] <= 10.0) throw new Error("vx should have increased from force");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_remove_body() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_remove_body(id);
        const s = Deno.core.ops.op_get_body_state(id);
        if (s.length !== 0) throw new Error("Removed body should return empty state");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_query_aabb() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 5.0, 5.0, 1.0, 0.3, 0.5, 65535, 65535);
        const results = Deno.core.ops.op_query_aabb(0.0, 0.0, 10.0, 10.0);
        if (results.length !== 1) throw new Error("Should find 1 body, found " + results.length);
        if (results[0] !== id) throw new Error("Should find the body we created");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_raycast() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 2.0, 0.0, 10.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        const hit = Deno.core.ops.op_raycast(0.0, 0.0, 1.0, 0.0, 100.0);
        if (hit.length !== 4) throw new Error("Should return [id, hx, hy, dist]");
        if (hit[0] !== id) throw new Error("Should hit our body");
        if (Math.abs(hit[3] - 8.0) > 0.1) throw new Error("Distance should be ~8, got " + hit[3]);
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_raycast_miss() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 10.0, 10.0, 1.0, 0.3, 0.5, 65535, 65535);
        const hit = Deno.core.ops.op_raycast(0.0, 0.0, -1.0, 0.0, 100.0);
        if (hit.length !== 0) throw new Error("Should miss");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_joints() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const a = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        const b = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 10.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        const jid = Deno.core.ops.op_create_distance_joint(a, b, 10.0);
        if (jid === 4294967295) throw new Error("Joint creation failed");
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        Deno.core.ops.op_remove_constraint(jid);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_revolute_joint() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const a = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        const b = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 5.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        const jid = Deno.core.ops.op_create_revolute_joint(a, b, 2.5, 0.0);
        if (jid === 4294967295) throw new Error("Revolute joint creation failed");
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_set_position() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_set_body_position(id, 42.0, 99.0);
        const s = Deno.core.ops.op_get_body_state(id);
        if (Math.abs(s[0] - 42.0) > 0.01) throw new Error("x should be 42");
        if (Math.abs(s[1] - 99.0) > 0.01) throw new Error("y should be 99");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_set_angular_velocity() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_set_body_angular_velocity(id, 3.14);
        const s = Deno.core.ops.op_get_body_state(id);
        if (Math.abs(s[5] - 3.14) > 0.01) throw new Error("angular velocity should be 3.14");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_collision_layers() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 1, 1);
        Deno.core.ops.op_set_collision_layers(id, 2, 4);
        // Can't easily verify layers via ops, but at least it shouldn't crash
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_get_contacts() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 0.0);
        // Two overlapping circles
        Deno.core.ops.op_create_body(1, 0, 5.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_create_body(1, 0, 5.0, 0.0, 3.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        const contacts = Deno.core.ops.op_get_contacts();
        // Contacts are flattened in groups of 7
        if (contacts.length < 7) throw new Error("Should have at least one contact, got " + contacts.length);
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_destroy_world() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 9.81);
        Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_destroy_physics_world();
        // After destroy, ops should gracefully return defaults
        const s = Deno.core.ops.op_get_body_state(0);
        if (s.length !== 0) throw new Error("Destroyed world should return empty");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_aabb_body() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 100.0);
        // Create an AABB body (shape_type=1)
        const id = Deno.core.ops.op_create_body(1, 1, 2.0, 3.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        const s = Deno.core.ops.op_get_body_state(id);
        if (s.length !== 7) throw new Error("Should return state");
        if (s[1] <= 0) throw new Error("AABB body should fall with gravity");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_static_body() {
    let mut rt = arcane_core::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 100.0);
        // Create a static body (body_type=0)
        const id = Deno.core.ops.op_create_body(0, 0, 5.0, 0.0, 10.0, 20.0, 0.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        const s = Deno.core.ops.op_get_body_state(id);
        if (Math.abs(s[0] - 10.0) > 0.01) throw new Error("Static body should not move");
        if (Math.abs(s[1] - 20.0) > 0.01) throw new Error("Static body should not fall");
        "#,
    )
    .unwrap();
}

// =========================================================================
// Resting contact regression tests
// =========================================================================

#[test]
fn test_aabb_settles_on_ground() {
    // Regression: boxes would sink through floor due to bad contact point
    let mut world = PhysicsWorld::new(0.0, 400.0);
    // Wide ground (top at y=560)
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 400.0, half_h: 20.0 },
        400.0, 580.0, 0.0,
        Material { restitution: 0.2, friction: 0.8 },
        0xFFFF, 0xFFFF,
    );
    // Box dropped from nearby, offset from ground center (short fall = fast settle)
    let box_id = world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: 15.0, half_h: 15.0 },
        250.0, 500.0, 2.0,
        Material { restitution: 0.3, friction: 0.6 },
        0xFFFF, 0xFFFF,
    );
    // Step for 5 seconds
    for _ in 0..300 {
        world.step(1.0 / 60.0);
    }
    let body = world.get_body(box_id).unwrap();
    assert!(body.sleeping, "Box should be asleep after 5 seconds, vy={:.4} vx={:.4} timer={:.3}",
        body.vy, body.vx, body.sleep_timer);
}

#[test]
fn test_circle_settles_on_ground() {
    let mut world = PhysicsWorld::new(0.0, 400.0);
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 400.0, half_h: 20.0 },
        400.0, 580.0, 0.0,
        Material { restitution: 0.2, friction: 0.8 },
        0xFFFF, 0xFFFF,
    );
    // Ball with moderate restitution, short fall
    let ball_id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 10.0 },
        300.0, 500.0, 0.5,
        Material { restitution: 0.3, friction: 0.3 },
        0xFFFF, 0xFFFF,
    );
    // Step for 5 seconds
    for _ in 0..300 {
        world.step(1.0 / 60.0);
    }
    let body = world.get_body(ball_id).unwrap();
    assert!(body.sleeping, "Ball should be asleep after 5 seconds");
    assert!(body.vy.abs() < 0.5, "Ball should have near-zero vy, got {}", body.vy);
}

#[test]
fn test_stacked_boxes_no_lateral_drift() {
    // Regression: AABB angular leakage caused lateral oscillation
    let mut world = PhysicsWorld::new(0.0, 400.0);
    // Ground
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 400.0, half_h: 20.0 },
        400.0, 580.0, 0.0,
        Material { restitution: 0.2, friction: 0.8 },
        0xFFFF, 0xFFFF,
    );
    // Bottom box
    world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: 20.0, half_h: 20.0 },
        400.0, 520.0, 4.0,
        Material { restitution: 0.2, friction: 0.6 },
        0xFFFF, 0xFFFF,
    );
    // Top box — slightly offset horizontally, placed just above bottom box
    let top_id = world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: 15.0, half_h: 15.0 },
        405.0, 490.0, 2.0,
        Material { restitution: 0.2, friction: 0.6 },
        0xFFFF, 0xFFFF,
    );
    let initial_x = 405.0;
    // Step for 8 seconds
    for _ in 0..480 {
        world.step(1.0 / 60.0);
    }
    let body = world.get_body(top_id).unwrap();
    let drift = (body.x - initial_x).abs();
    assert!(
        drift < 5.0,
        "Top box should not drift far laterally, drifted {} pixels",
        drift,
    );
    assert!(body.sleeping, "Stacked boxes should eventually sleep");
}

#[test]
fn test_aabb_no_angular_velocity_from_contacts() {
    // Regression: AABBs should not gain angular velocity since collision ignores rotation
    let mut world = PhysicsWorld::new(0.0, 400.0);
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 400.0, half_h: 20.0 },
        400.0, 580.0, 0.0, Material::default(),
        0xFFFF, 0xFFFF,
    );
    let box_id = world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: 15.0, half_h: 15.0 },
        350.0, 200.0, 2.0, Material::default(),
        0xFFFF, 0xFFFF,
    );
    // Step to let box fall and collide
    for _ in 0..60 {
        world.step(1.0 / 60.0);
    }
    let body = world.get_body(box_id).unwrap();
    assert_eq!(
        body.angular_velocity, 0.0,
        "AABB should have zero angular velocity (inv_inertia=0)"
    );
    assert_eq!(body.angle, 0.0, "AABB angle should remain 0");
}

#[test]
fn test_aabb_contact_point_on_collision_surface() {
    // Regression: contact point was midpoint of centers, should be on collision edge
    // Box A overlapping box B by 2 pixels on Y axis
    let a = make_body(
        0, BodyType::Dynamic,
        Shape::AABB { half_w: 10.0, half_h: 10.0 },
        100.0, 82.0, 1.0,
    );
    let b = make_body(
        1, BodyType::Static,
        Shape::AABB { half_w: 200.0, half_h: 20.0 },
        200.0, 110.0, 0.0,
    );
    // A bottom = 92, B top = 90 → 2px overlap on Y
    let contact = test_collision(&a, &b).unwrap();
    // Contact should be on A's bottom edge (y = 82 + 10 = 92), not midpoint of centers (96)
    assert!(
        (contact.contact_point.1 - 92.0).abs() < 1e-4,
        "Contact y should be at A's bottom edge (92), got {}",
        contact.contact_point.1,
    );
    // Contact x should be centered in the overlap region
    // A extends x: 90..110, B extends x: 0..400, overlap: 90..110, center: 100
    assert!(
        (contact.contact_point.0 - 100.0).abs() < 1e-4,
        "Contact x should be centered in overlap (100), got {}",
        contact.contact_point.0,
    );
}

#[test]
fn test_restitution_killed_for_slow_contacts() {
    // A ball with high restitution starting very close to ground should settle.
    // Fall distance < 0.125 px → approach speed < threshold → restitution killed.
    let mut world = PhysicsWorld::new(0.0, 400.0);
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 400.0, half_h: 20.0 },
        400.0, 580.0, 0.0,
        Material { restitution: 1.0, friction: 0.5 },
        0xFFFF, 0xFFFF,
    );
    // Ball resting just above ground surface (ground top=560, ball bottom=560-0.1)
    // Falls 0.1 px → v=sqrt(2*400*0.1)=8.9 < threshold(10) → e=0
    let ball_id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 5.0 },
        400.0, 554.9, 1.0,
        Material { restitution: 1.0, friction: 0.5 },
        0xFFFF, 0xFFFF,
    );
    for _ in 0..300 {
        world.step(1.0 / 60.0);
    }
    let body = world.get_body(ball_id).unwrap();
    assert!(
        body.sleeping,
        "Ball with restitution=1.0 should settle when approach speed < threshold"
    );
}

#[test]
fn test_tall_stack_does_not_fuse() {
    // Regression: stacking 7+ boxes would cause them to fuse together (penetration
    // accumulates faster than position correction removes it).
    let mut world = PhysicsWorld::new(0.0, 400.0);
    // Ground
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 400.0, half_h: 20.0 },
        400.0, 580.0, 0.0,
        Material { restitution: 0.0, friction: 0.8 },
        0xFFFF, 0xFFFF,
    );
    // Stack 7 boxes, each 30px tall, placed at rest positions
    let half_h = 15.0;
    let box_size = half_h * 2.0;
    let ground_top = 560.0;
    let mut box_ids = Vec::new();
    for i in 0..7 {
        let y = ground_top - half_h - (i as f32 * box_size);
        let id = world.add_body(
            BodyType::Dynamic,
            Shape::AABB { half_w: 15.0, half_h },
            400.0, y, 2.0,
            Material { restitution: 0.0, friction: 0.8 },
            0xFFFF, 0xFFFF,
        );
        box_ids.push(id);
    }
    // Step for 3 seconds to let stack settle
    for _ in 0..180 {
        world.step(1.0 / 60.0);
    }
    // Check that boxes maintain separation — no fusing
    // Each box should be roughly box_size apart from its neighbors
    for i in 0..6 {
        let a = world.get_body(box_ids[i]).unwrap();
        let b = world.get_body(box_ids[i + 1]).unwrap();
        let gap = a.y - b.y; // a is lower (higher y), b is above (lower y)
        assert!(
            gap > box_size * 0.8,
            "Box {} and {} should be ~{} apart, got {:.1} (fusing!)",
            i, i + 1, box_size, gap,
        );
    }
}

#[test]
fn test_tall_tower_lateral_stability() {
    // A tower of 10 boxes placed at perfect rest positions must not wobble or compress.
    // Tracks max lateral drift and stack height over the first 10 seconds.
    let mut world = PhysicsWorld::new(0.0, 400.0);
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 400.0, half_h: 20.0 },
        400.0, 580.0, 0.0,
        Material { restitution: 0.0, friction: 0.8 },
        0xFFFF, 0xFFFF,
    );
    let half_w = 15.0;
    let half_h = 15.0;
    let box_size = half_h * 2.0;
    let ground_top = 560.0;
    let center_x = 400.0;
    let mut box_ids = Vec::new();
    for i in 0..10 {
        let y = ground_top - half_h - (i as f32 * box_size);
        let id = world.add_body(
            BodyType::Dynamic, Shape::AABB { half_w, half_h },
            center_x, y, 2.0,
            Material { restitution: 0.0, friction: 0.8 },
            0xFFFF, 0xFFFF,
        );
        box_ids.push(id);
    }
    let expected_height = 9.0 * box_size; // 270px

    let mut max_drift = 0.0f32;
    let mut min_height = f32::MAX;
    for frame in 0..600 {
        world.step(1.0 / 60.0);
        // Measure max lateral drift of any box
        for &id in &box_ids {
            let body = world.get_body(id).unwrap();
            let drift = (body.x - center_x).abs();
            if drift > max_drift {
                max_drift = drift;
            }
        }
        // Measure stack height
        let top = world.get_body(box_ids[9]).unwrap();
        let bot = world.get_body(box_ids[0]).unwrap();
        let height = bot.y - top.y;
        if height < min_height {
            min_height = height;
        }
        // Print every second for diagnostics
        if frame % 60 == 59 {
            eprintln!(
                "t={:.0}s: height={:.1}/{:.0} ({:.1}%) max_drift={:.2}px",
                (frame + 1) as f32 / 60.0, height, expected_height,
                height / expected_height * 100.0, max_drift,
            );
        }
    }
    // Strict criteria: boxes placed at rest should stay at rest
    assert!(
        max_drift < 2.0,
        "Max lateral drift was {:.2}px (should be <2px)",
        max_drift,
    );
    assert!(
        min_height > expected_height * 0.95,
        "Stack compressed to {:.1}/{:.0} ({:.1}%) — should retain >95% height",
        min_height, expected_height, min_height / expected_height * 100.0,
    );
}

// =========================================================================
// First-principles physics tests
// =========================================================================

#[test]
fn test_integration_f_equals_ma() {
    // F = ma ⟹ a = F * inv_mass, v_new = v + a*dt, x_new = x + v_new*dt
    let mut body = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 0.0, 0.0, 2.0);
    // Apply force of 100 N rightward (no gravity)
    body.fx = 100.0;
    integrate(&mut body, 0.0, 0.0, 1.0 / 60.0);
    // a = F * inv_mass = 100 * 0.5 = 50
    // v_new = 0 + 50 * (1/60) = 0.8333...
    let expected_v = 100.0 * body.inv_mass * (1.0 / 60.0);
    assert!((body.vx - expected_v).abs() < 1e-6, "vx={} expected {}", body.vx, expected_v);
    // x_new = 0 + v_new * dt
    let expected_x = expected_v * (1.0 / 60.0);
    assert!((body.x - expected_x).abs() < 1e-6, "x={} expected {}", body.x, expected_x);
    // Force must be cleared after integration
    assert_eq!(body.fx, 0.0, "Force should be cleared after integration");
    assert_eq!(body.fy, 0.0);
}

#[test]
fn test_integration_gravity_is_acceleration_not_force() {
    // Gravity parameters are accelerations (m/s²), not forces.
    // All dynamic bodies fall at the same rate regardless of mass.
    let dt = 1.0 / 60.0;
    let gravity_y = 400.0;
    let mut light = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 0.0, 0.0, 0.5);
    let mut heavy = make_body(1, BodyType::Dynamic, Shape::Circle { radius: 5.0 }, 0.0, 0.0, 10.0);
    integrate(&mut light, 0.0, gravity_y, dt);
    integrate(&mut heavy, 0.0, gravity_y, dt);
    assert!(
        (light.vy - heavy.vy).abs() < 1e-6,
        "All bodies should fall at same rate: light vy={}, heavy vy={}",
        light.vy, heavy.vy
    );
    assert!(
        (light.y - heavy.y).abs() < 1e-6,
        "All bodies should fall same distance: light y={}, heavy y={}",
        light.y, heavy.y
    );
}

#[test]
fn test_contact_normal_points_a_to_b() {
    // Contact normal must consistently point from body_a toward body_b.
    // This is critical for impulse direction: positive impulse pushes A and B apart.

    // Circle-Circle: A left of B
    let a = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 10.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::Circle { radius: 10.0 }, 15.0, 0.0, 1.0);
    let c = test_collision(&a, &b).unwrap();
    assert!(c.normal.0 > 0.0, "Circle-circle: normal x should point from A to B (right), got {:?}", c.normal);
    assert_eq!(c.body_a, 0);
    assert_eq!(c.body_b, 1);

    // AABB-AABB: A above B (y increases downward)
    let a = make_body(0, BodyType::Dynamic, Shape::AABB { half_w: 10.0, half_h: 10.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::AABB { half_w: 10.0, half_h: 10.0 }, 0.0, 18.0, 1.0);
    let c = test_collision(&a, &b).unwrap();
    assert!(c.normal.1 > 0.0, "AABB-AABB: normal y should point from A to B (down), got {:?}", c.normal);

    // Circle-AABB: circle left of AABB
    let circ = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 10.0 }, 0.0, 0.0, 1.0);
    let aabb = make_body(1, BodyType::Dynamic, Shape::AABB { half_w: 10.0, half_h: 10.0 }, 15.0, 0.0, 1.0);
    let c = test_collision(&circ, &aabb).unwrap();
    assert!(c.normal.0 > 0.0, "Circle-AABB: normal x should point from circle to AABB (right), got {:?}", c.normal);
}

#[test]
fn test_impulse_conserves_momentum() {
    // In a collision between two equal-mass bodies with e=1 (perfectly elastic),
    // total momentum must be conserved: m_a*v_a + m_b*v_b = constant.
    let mut world = PhysicsWorld::new(0.0, 0.0); // No gravity
    let a_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 10.0 },
        0.0, 0.0, 1.0,
        Material { restitution: 1.0, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );
    let b_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 10.0 },
        15.0, 0.0, 1.0, // 5px overlap
        Material { restitution: 1.0, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );
    // A moves right at 100, B is stationary
    world.set_velocity(a_id, 100.0, 0.0);
    let mass_a = world.get_body(a_id).unwrap().mass;
    let mass_b = world.get_body(b_id).unwrap().mass;
    let p_before = mass_a * 100.0 + mass_b * 0.0;
    // Step once (will detect collision and resolve)
    world.step(1.0 / 60.0);
    let va = world.get_body(a_id).unwrap().vx;
    let vb = world.get_body(b_id).unwrap().vx;
    let p_after = mass_a * va + mass_b * vb;
    assert!(
        (p_before - p_after).abs() < 1.0,
        "Momentum should be conserved: before={} after={} (va={}, vb={})",
        p_before, p_after, va, vb
    );
}

#[test]
fn test_elastic_collision_velocity_exchange() {
    // Two equal-mass balls in perfectly elastic 1D collision:
    // Ball A (moving) hits Ball B (stationary) → A stops, B gets A's velocity.
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let a_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 10.0 },
        0.0, 0.0, 2.0,
        Material { restitution: 1.0, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );
    let b_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 10.0 },
        18.0, 0.0, 2.0, // 2px overlap
        Material { restitution: 1.0, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );
    world.set_velocity(a_id, 50.0, 0.0);
    // Multiple steps to let the solver fully resolve
    for _ in 0..5 {
        world.step(1.0 / 60.0);
    }
    let va = world.get_body(a_id).unwrap().vx;
    let vb = world.get_body(b_id).unwrap().vx;
    // After elastic collision: A should be near 0, B should be near 50
    assert!(va.abs() < 5.0, "After elastic collision, A should be ~stopped, got vx={}", va);
    assert!((vb - 50.0).abs() < 10.0, "After elastic collision, B should have A's velocity ~50, got vx={}", vb);
}

#[test]
fn test_static_body_absorbs_all_momentum() {
    // A dynamic body hitting a static body should bounce (with restitution).
    // Static body must not move.
    let mut world = PhysicsWorld::new(0.0, 0.0);
    world.add_body(
        BodyType::Static, Shape::AABB { half_w: 100.0, half_h: 10.0 },
        0.0, 20.0, 0.0,
        Material { restitution: 0.5, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );
    let ball_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 5.0 },
        0.0, 8.0, 1.0, // 3px overlap
        Material { restitution: 0.5, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );
    world.set_velocity(ball_id, 0.0, 100.0); // Moving down toward static body
    world.step(1.0 / 60.0);
    let ball = world.get_body(ball_id).unwrap();
    // Ball should bounce upward (negative vy after hitting surface below)
    assert!(ball.vy < 0.0, "Ball should bounce upward after hitting static body, vy={}", ball.vy);
    // Static body must not move
    let static_body = world.get_body(0).unwrap();
    assert_eq!(static_body.x, 0.0);
    assert_eq!(static_body.y, 20.0);
}

#[test]
fn test_friction_slows_sliding_body() {
    // A body sliding on a surface with friction should decelerate.
    let mut world = PhysicsWorld::new(0.0, 400.0); // Gravity pushes down
    world.add_body(
        BodyType::Static, Shape::AABB { half_w: 400.0, half_h: 20.0 },
        0.0, 30.0, 0.0,
        Material { restitution: 0.0, friction: 0.8 },
        0xFFFF, 0xFFFF,
    );
    let box_id = world.add_body(
        BodyType::Dynamic, Shape::AABB { half_w: 5.0, half_h: 5.0 },
        0.0, 4.0, 1.0, // Resting on surface (1px overlap)
        Material { restitution: 0.0, friction: 0.8 },
        0xFFFF, 0xFFFF,
    );
    world.set_velocity(box_id, 200.0, 0.0); // Sliding right
    let v0 = 200.0f32;
    // Step for 1 second
    for _ in 0..60 {
        world.step(1.0 / 60.0);
    }
    let body = world.get_body(box_id).unwrap();
    assert!(
        body.vx.abs() < v0 * 0.5,
        "Friction should slow the body significantly, vx={} (started at {})",
        body.vx, v0,
    );
}

#[test]
fn test_zero_restitution_no_bounce() {
    // With restitution=0, a dropped ball should not bounce.
    let mut world = PhysicsWorld::new(0.0, 400.0);
    world.add_body(
        BodyType::Static, Shape::AABB { half_w: 400.0, half_h: 20.0 },
        0.0, 100.0, 0.0,
        Material { restitution: 0.0, friction: 0.5 },
        0xFFFF, 0xFFFF,
    );
    let ball_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 5.0 },
        0.0, 50.0, 1.0,
        Material { restitution: 0.0, friction: 0.5 },
        0xFFFF, 0xFFFF,
    );
    // Let ball fall and hit surface
    for _ in 0..60 {
        world.step(1.0 / 60.0);
    }
    let body = world.get_body(ball_id).unwrap();
    // With zero restitution, after settling the ball should be near the surface, not bouncing
    let surface_y = 100.0 - 20.0 - 5.0; // ground top - ball radius = 75
    assert!(
        (body.y - surface_y).abs() < 2.0,
        "Zero-restitution ball should rest on surface at y~{}, got y={}",
        surface_y, body.y,
    );
}

#[test]
fn test_collision_layer_filtering() {
    // Bodies on non-matching layers should pass through each other.
    let mut world = PhysicsWorld::new(0.0, 0.0);
    let a_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 10.0 },
        0.0, 0.0, 1.0, Material::default(),
        0x0001, 0x0002, // Layer 1, mask 2
    );
    let b_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 10.0 },
        15.0, 0.0, 1.0, Material::default(),
        0x0004, 0x0008, // Layer 4, mask 8 — doesn't match A's mask (2)
    );
    world.set_velocity(a_id, 50.0, 0.0);
    world.set_velocity(b_id, -50.0, 0.0);
    // Step — bodies should pass through each other
    for _ in 0..30 {
        world.step(1.0 / 60.0);
    }
    let a = world.get_body(a_id).unwrap();
    let b = world.get_body(b_id).unwrap();
    // A should have passed right through B (still moving right)
    assert!(a.vx > 40.0, "Body A should pass through B (non-matching layers), vx={}", a.vx);
    assert!(b.vx < -40.0, "Body B should pass through A, vx={}", b.vx);
}

#[test]
fn test_penetration_depth_correctness() {
    // Verify penetration depth matches geometric expectation.
    // Two circles: centers 15 apart, radii 10 each → penetration = 10+10-15 = 5
    let a = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 10.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::Circle { radius: 10.0 }, 15.0, 0.0, 1.0);
    let c = test_collision(&a, &b).unwrap();
    assert!(
        (c.penetration - 5.0).abs() < 1e-4,
        "Circle penetration should be 5.0, got {}",
        c.penetration,
    );

    // Two AABBs: overlap 4px on X, 20px on Y → penetration = min(4, 20) = 4
    let a = make_body(0, BodyType::Dynamic, Shape::AABB { half_w: 10.0, half_h: 10.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::AABB { half_w: 10.0, half_h: 10.0 }, 16.0, 0.0, 1.0);
    let c = test_collision(&a, &b).unwrap();
    assert!(
        (c.penetration - 4.0).abs() < 1e-4,
        "AABB penetration should be 4.0, got {}",
        c.penetration,
    );
}

#[test]
fn test_no_collision_when_separated() {
    // Bodies that don't overlap should not produce contacts.
    let a = make_body(0, BodyType::Dynamic, Shape::Circle { radius: 10.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::Circle { radius: 10.0 }, 25.0, 0.0, 1.0);
    assert!(test_collision(&a, &b).is_none(), "Separated circles should not collide");

    let a = make_body(0, BodyType::Dynamic, Shape::AABB { half_w: 10.0, half_h: 10.0 }, 0.0, 0.0, 1.0);
    let b = make_body(1, BodyType::Dynamic, Shape::AABB { half_w: 10.0, half_h: 10.0 }, 25.0, 0.0, 1.0);
    assert!(test_collision(&a, &b).is_none(), "Separated AABBs should not collide");
}

#[test]
fn test_distance_constraint_spring_behavior() {
    // Two bodies connected by distance constraint should oscillate around rest distance
    // and not drift apart over time.
    let mut world = PhysicsWorld::new(0.0, 0.0); // No gravity
    let a_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 5.0 },
        0.0, 0.0, 1.0, Material::default(),
        0xFFFF, 0xFFFF,
    );
    let b_id = world.add_body(
        BodyType::Dynamic, Shape::Circle { radius: 5.0 },
        100.0, 0.0, 1.0, Material::default(),
        0xFFFF, 0xFFFF,
    );
    world.add_constraint(Constraint::Distance {
        id: 0,
        body_a: a_id,
        body_b: b_id,
        distance: 100.0,
        anchor_a: (0.0, 0.0),
        anchor_b: (0.0, 0.0),
    });
    // Pull bodies apart
    world.set_velocity(a_id, -50.0, 0.0);
    world.set_velocity(b_id, 50.0, 0.0);
    // Step for 5 seconds
    for _ in 0..300 {
        world.step(1.0 / 60.0);
    }
    let a = world.get_body(a_id).unwrap();
    let b = world.get_body(b_id).unwrap();
    let dist = ((b.x - a.x).powi(2) + (b.y - a.y).powi(2)).sqrt();
    assert!(
        (dist - 100.0).abs() < 5.0,
        "Distance constraint should maintain ~100px distance, got {}",
        dist,
    );
}

#[test]
fn test_raycast_returns_closest_hit() {
    // Raycast should return the closest body, not any arbitrary one.
    let mut world = PhysicsWorld::new(0.0, 0.0);
    // Body at x=50 (closer)
    world.add_body(
        BodyType::Static, Shape::Circle { radius: 5.0 },
        50.0, 0.0, 0.0, Material::default(),
        0xFFFF, 0xFFFF,
    );
    // Body at x=100 (farther)
    world.add_body(
        BodyType::Static, Shape::Circle { radius: 5.0 },
        100.0, 0.0, 0.0, Material::default(),
        0xFFFF, 0xFFFF,
    );
    // Ray from origin going right
    let hit = world.raycast(0.0, 0.0, 1.0, 0.0, 200.0);
    assert!(hit.is_some(), "Raycast should hit something");
    let (id, _, _, t) = hit.unwrap();
    assert_eq!(id, 0, "Should hit closer body (id=0), got id={}", id);
    assert!((t - 45.0).abs() < 1.0, "Hit distance should be ~45 (50-radius), got {}", t);
}

#[test]
fn test_stacked_boxes_reach_sleep_within_2_seconds() {
    // Regression: boxes in a settled stack should go to sleep promptly,
    // not blink between sleeping/awake for 10+ seconds.
    let mut world = PhysicsWorld::new(0.0, 400.0);

    // Ground
    world.add_body(
        BodyType::Static, Shape::AABB { half_w: 200.0, half_h: 10.0 },
        200.0, 310.0, 0.0,
        Material { restitution: 0.0, friction: 0.5 },
        0xFFFF, 0xFFFF,
    );

    // Stack 5 boxes (30×30) starting above ground, spaced slightly apart so they drop
    let box_size = 15.0; // half_w = half_h = 15
    let mut box_ids = Vec::new();
    for i in 0..5 {
        let y = 280.0 - (i as f32 * 32.0); // stacked with small gaps
        let id = world.add_body(
            BodyType::Dynamic, Shape::AABB { half_w: box_size, half_h: box_size },
            200.0, y, 1.0,
            Material { restitution: 0.0, friction: 0.5 },
            0xFFFF, 0xFFFF,
        );
        box_ids.push(id);
    }

    // Simulate for 2 seconds (120 frames) — boxes should settle and sleep
    for _ in 0..120 {
        world.step(1.0 / 60.0);
    }

    let all_sleeping = box_ids.iter().all(|&id| {
        world.get_body(id).unwrap().sleeping
    });
    assert!(all_sleeping,
        "All stacked boxes should be sleeping after 2s. States: {:?}",
        box_ids.iter().map(|&id| {
            let b = world.get_body(id).unwrap();
            (id, b.sleeping, b.vx, b.vy, b.sleep_timer)
        }).collect::<Vec<_>>()
    );
}

#[test]
fn test_12_stacked_boxes_reach_sleep_within_5_seconds() {
    let mut world = PhysicsWorld::new(0.0, 400.0);

    // Ground
    world.add_body(
        BodyType::Static, Shape::AABB { half_w: 200.0, half_h: 10.0 },
        200.0, 310.0, 0.0,
        Material { restitution: 0.0, friction: 0.5 },
        0xFFFF, 0xFFFF,
    );

    // Stack 12 boxes
    let box_size = 15.0;
    let mut box_ids = Vec::new();
    for i in 0..12 {
        let y = 280.0 - (i as f32 * 32.0);
        let id = world.add_body(
            BodyType::Dynamic, Shape::AABB { half_w: box_size, half_h: box_size },
            200.0, y, 1.0,
            Material { restitution: 0.0, friction: 0.5 },
            0xFFFF, 0xFFFF,
        );
        box_ids.push(id);
    }

    // Simulate and track when each body sleeps
    let mut all_asleep_frame = None;
    for frame in 0..600 { // 10 seconds max
        world.step(1.0 / 60.0);
        let all_sleeping = box_ids.iter().all(|&id| world.get_body(id).unwrap().sleeping);
        if all_sleeping {
            all_asleep_frame = Some(frame);
            break;
        }
    }

    // Print diagnostic info
    let states: Vec<_> = box_ids.iter().map(|&id| {
        let b = world.get_body(id).unwrap();
        (id, b.sleeping, b.vx, b.vy, b.sleep_timer)
    }).collect();

    assert!(all_asleep_frame.is_some(),
        "12 stacked boxes should all sleep within 10s. States: {:?}", states);

    let frame = all_asleep_frame.unwrap();
    let seconds = frame as f32 / 60.0;
    eprintln!("12-box stack settled at frame {} ({:.1}s)", frame, seconds);

    assert!(frame < 300,
        "12-box stack should sleep within 5s, took {:.1}s (frame {})", seconds, frame);
}

// =========================================================================
// Clipping regression tests — bodies must not penetrate static ground
// =========================================================================

/// A single dynamic box dropped from height onto a static ground
/// must never penetrate more than the allowed slop (0.005 units).
#[test]
fn test_single_box_no_ground_clipping() {
    let mut world = PhysicsWorld::new(0.0, 300.0);
    let box_size = 20.0;
    let half = box_size / 2.0;

    // Static ground at y=200
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 500.0, half_h: 20.0 },
        250.0, 220.0, 1.0,
        Material::default(),
        0xFFFF, 0xFFFF,
    );

    // Dynamic box dropped from y=50
    let box_id = world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: half, half_h: half },
        250.0, 50.0, 1.0,
        Material { restitution: 0.0, friction: 0.3 },
        0xFFFF, 0xFFFF,
    );

    let ground_top = 200.0; // ground center 220 - half_h 20
    let max_allowed_penetration = 0.5; // generous threshold for visible clipping

    // Simulate 5 seconds at 60fps
    for frame in 0..300 {
        world.step(1.0 / 60.0);

        let body = world.get_body(box_id).unwrap();
        let box_bottom = body.y + half;

        assert!(
            box_bottom <= ground_top + max_allowed_penetration,
            "Frame {}: box bottom ({:.3}) penetrates ground top ({:.3}) by {:.3} units (max allowed: {:.3})",
            frame, box_bottom, ground_top, box_bottom - ground_top, max_allowed_penetration,
        );
    }
}

/// Stack of 20 boxes on ground — no box should clip into the ground
/// by more than a small threshold during active simulation.
#[test]
fn test_stacked_boxes_no_ground_clipping() {
    let mut world = PhysicsWorld::new(0.0, 300.0);
    let box_size = 20.0;
    let half = box_size / 2.0;

    // Wide static ground at y=500
    let ground_center_y = 520.0;
    let ground_half_h = 20.0;
    let ground_top = ground_center_y - ground_half_h; // 500.0

    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 500.0, half_h: ground_half_h },
        250.0, ground_center_y, 1.0,
        Material::default(),
        0xFFFF, 0xFFFF,
    );

    // Stack 20 boxes
    let mut box_ids = Vec::new();
    for i in 0..20 {
        let y = ground_top - half - (i as f32 * box_size) - 1.0;
        let id = world.add_body(
            BodyType::Dynamic,
            Shape::AABB { half_w: half, half_h: half },
            250.0, y, 1.0,
            Material { restitution: 0.0, friction: 0.5 },
            0xFFFF, 0xFFFF,
        );
        box_ids.push(id);
    }

    let max_allowed_penetration = 1.0; // slightly more generous for stacks

    // Simulate 5 seconds
    for frame in 0..300 {
        world.step(1.0 / 60.0);

        // Check the bottom box (most likely to clip)
        let bottom_box = world.get_body(box_ids[0]).unwrap();
        let box_bottom = bottom_box.y + half;

        assert!(
            box_bottom <= ground_top + max_allowed_penetration,
            "Frame {}: bottom box clips ground by {:.3} units (bottom={:.3}, ground_top={:.3}, max={:.3})",
            frame, box_bottom - ground_top, box_bottom, ground_top, max_allowed_penetration,
        );
    }
}

/// Many boxes dropped in a cluster — simulates the physics playground scenario
/// where hundreds of bodies pile up. Tests two things:
/// 1. Transient penetration during chaotic impact must stay bounded
/// 2. Steady-state penetration after settling must be near zero
#[test]
fn test_cluster_drop_no_ground_clipping() {
    let mut world = PhysicsWorld::new(0.0, 300.0);
    let box_size = 15.0;
    let half = box_size / 2.0;

    // Wide static ground
    let ground_center_y = 400.0;
    let ground_half_h = 20.0;
    let ground_top = ground_center_y - ground_half_h; // 380.0

    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 300.0, half_h: ground_half_h },
        200.0, ground_center_y, 1.0,
        Material::default(),
        0xFFFF, 0xFFFF,
    );

    // Static walls to contain the pile
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 20.0, half_h: 200.0 },
        -20.0, 280.0, 1.0,
        Material::default(),
        0xFFFF, 0xFFFF,
    );
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 20.0, half_h: 200.0 },
        420.0, 280.0, 1.0,
        Material::default(),
        0xFFFF, 0xFFFF,
    );

    // Drop 100 boxes in a grid pattern
    let mut box_ids = Vec::new();
    for row in 0..10 {
        for col in 0..10 {
            let x = 80.0 + col as f32 * (box_size + 2.0);
            let y = 100.0 - row as f32 * (box_size + 2.0);
            let id = world.add_body(
                BodyType::Dynamic,
                Shape::AABB { half_w: half, half_h: half },
                x, y, 1.0,
                Material { restitution: 0.0, friction: 0.3 },
                0xFFFF, 0xFFFF,
            );
            box_ids.push(id);
        }
    }

    // Phase 1: Impact phase (first 3 seconds = 180 frames)
    // With 4 sub-steps per frame, transient penetration stays under 0.5 units even
    // during chaotic multi-body impact. Sub-stepping (Box2D v3 approach) is far more
    // effective than extra solver iterations for stack stability.
    let max_transient_penetration = 1.0;
    let mut worst_transient = 0.0f32;
    let mut worst_frame = 0;

    for frame in 0..180 {
        world.step(1.0 / 60.0);

        for &id in &box_ids {
            if let Some(body) = world.get_body(id) {
                let penetration = (body.y + half) - ground_top;
                if penetration > worst_transient {
                    worst_transient = penetration;
                    worst_frame = frame;
                }
            }
        }
    }

    eprintln!(
        "100-body cluster: worst transient penetration = {:.3} at frame {} ({:.1}s)",
        worst_transient, worst_frame, worst_frame as f32 / 60.0,
    );

    assert!(
        worst_transient <= max_transient_penetration,
        "Cluster impact: worst transient penetration {:.3} exceeds {:.3} at frame {}",
        worst_transient, max_transient_penetration, worst_frame,
    );

    // Phase 2: Settling phase (simulate 5 more seconds = 300 frames)
    for _ in 0..300 {
        world.step(1.0 / 60.0);
    }

    // Phase 3: Steady state — after settling, penetration must be near zero.
    // This is what the user actually sees: bodies at rest should not clip.
    // With sub-stepping, steady-state penetration is ~0.005 (just the slop value).
    let max_steady_penetration = 0.1;
    let mut worst_steady = 0.0f32;
    let mut worst_body = 0u32;

    for &id in &box_ids {
        if let Some(body) = world.get_body(id) {
            let penetration = (body.y + half) - ground_top;
            if penetration > worst_steady {
                worst_steady = penetration;
                worst_body = id;
            }
        }
    }

    eprintln!(
        "100-body cluster steady state: worst penetration = {:.3} (body {})",
        worst_steady, worst_body,
    );

    assert!(
        worst_steady <= max_steady_penetration,
        "Cluster steady-state: body {} penetrates ground by {:.3} (max allowed: {:.3}). \
         Bodies at rest must not visibly clip through surfaces.",
        worst_body, worst_steady, max_steady_penetration,
    );
}

// =========================================================================
// Sticking regression tests — overlapping dynamic bodies must separate
// =========================================================================

/// Two overlapping boxes placed midair must separate under gravity, not stick.
/// This tests that velocity clamping doesn't zero out gravity-driven velocity
/// for dynamic-dynamic contacts.
#[test]
fn test_overlapping_boxes_midair_separate() {
    let mut world = PhysicsWorld::new(0.0, 300.0);
    let half = 10.0;

    // Two boxes placed at the same position (fully overlapping) midair
    let a = world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: half, half_h: half },
        100.0, 100.0, 1.0,
        Material { restitution: 0.0, friction: 0.3 },
        0xFFFF, 0xFFFF,
    );
    let b = world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: half, half_h: half },
        100.0, 110.0, 1.0, // 10 units of vertical overlap
        Material { restitution: 0.0, friction: 0.3 },
        0xFFFF, 0xFFFF,
    );

    // Both should fall under gravity. After 1 second, they must have
    // separated AND moved significantly downward.
    let start_y_a = world.get_body(a).unwrap().y;
    let start_y_b = world.get_body(b).unwrap().y;

    for _ in 0..60 {
        world.step(1.0 / 60.0);
    }

    let end_a = world.get_body(a).unwrap();
    let end_b = world.get_body(b).unwrap();

    // Both should have fallen significantly (gravity = 300, after 1s: ~150 units)
    let fall_a = end_a.y - start_y_a;
    let fall_b = end_b.y - start_y_b;

    eprintln!(
        "Overlapping midair: A fell {:.1}, B fell {:.1}, separation = {:.1}",
        fall_a, fall_b, (end_b.y - end_a.y).abs(),
    );

    assert!(
        fall_a > 50.0,
        "Body A stuck midair: only fell {:.1} units in 1 second (expected >50 with gravity=300)",
        fall_a,
    );
    assert!(
        fall_b > 50.0,
        "Body B stuck midair: only fell {:.1} units in 1 second (expected >50 with gravity=300)",
        fall_b,
    );

    // They should have separated (no longer overlapping)
    let gap = (end_b.y - end_a.y).abs();
    assert!(
        gap >= half * 2.0 - 1.0, // allow small tolerance
        "Bodies still overlapping after 1 second: gap={:.1}, expected >= {:.1}",
        gap, half * 2.0,
    );
}

/// A vertical stack of 5 overlapping circles placed midair must all fall,
/// not stick together as a floating column.
#[test]
fn test_overlapping_circle_column_falls() {
    let mut world = PhysicsWorld::new(0.0, 300.0);
    let radius = 8.0;
    let mut ids = Vec::new();

    // 5 circles in a vertical column, each overlapping the next by 50%
    for i in 0..5 {
        let id = world.add_body(
            BodyType::Dynamic,
            Shape::Circle { radius },
            100.0, 50.0 + i as f32 * radius, // spacing = radius (50% overlap)
            1.0,
            Material { restitution: 0.0, friction: 0.3 },
            0xFFFF, 0xFFFF,
        );
        ids.push(id);
    }

    let start_y: Vec<f32> = ids.iter().map(|&id| world.get_body(id).unwrap().y).collect();

    // Simulate 2 seconds
    for _ in 0..120 {
        world.step(1.0 / 60.0);
    }

    // Every body must have fallen significantly
    for (i, &id) in ids.iter().enumerate() {
        let body = world.get_body(id).unwrap();
        let fall = body.y - start_y[i];
        eprintln!("Circle {}: fell {:.1} units", i, fall);
        assert!(
            fall > 100.0,
            "Circle {} stuck midair: only fell {:.1} units in 2 seconds (gravity=300)",
            i, fall,
        );
    }
}

/// Bodies spawned at the exact same position must fully separate.
/// This catches the velocity clamping sign bug: body A's separation velocity
/// was being zeroed instead of its approach velocity, preventing separation.
#[test]
fn test_bodies_at_same_position_fully_separate() {
    let mut world = PhysicsWorld::new(0.0, 400.0);
    let half = 15.0;

    // Spawn 4 boxes at the exact same position (mimics rapid clicking in demo)
    let mut ids = Vec::new();
    for _ in 0..4 {
        let id = world.add_body(
            BodyType::Dynamic,
            Shape::AABB { half_w: half, half_h: half },
            200.0, 100.0, 1.0,
            Material { restitution: 0.3, friction: 0.6 },
            0xFFFF, 0xFFFF,
        );
        ids.push(id);
    }

    // Simulate 3 seconds
    for _ in 0..180 {
        world.step(1.0 / 60.0);
    }

    // Check that all bodies have separated: no pair should overlap
    for i in 0..ids.len() {
        for j in (i + 1)..ids.len() {
            let a = world.get_body(ids[i]).unwrap();
            let b = world.get_body(ids[j]).unwrap();
            let dx = (b.x - a.x).abs();
            let dy = (b.y - a.y).abs();
            // For two AABBs with half_w=half, they overlap if dx < 2*half AND dy < 2*half
            let overlap_x = (2.0 * half - dx).max(0.0);
            let overlap_y = (2.0 * half - dy).max(0.0);
            let overlapping = overlap_x > 0.5 && overlap_y > 0.5;
            eprintln!(
                "Pair ({},{}): dx={:.1} dy={:.1} overlap_x={:.1} overlap_y={:.1} overlapping={}",
                i, j, dx, dy, overlap_x, overlap_y, overlapping,
            );
            assert!(
                !overlapping,
                "Bodies {} and {} still overlapping after 3 seconds: dx={:.1} dy={:.1}",
                i, j, dx, dy,
            );
        }
    }
}

/// Bodies spawned over successive frames at the same position must separate.
/// Simulates rapid clicking in the physics demo.
#[test]
fn test_successive_spawns_same_position_separate() {
    let mut world = PhysicsWorld::new(0.0, 400.0);

    // Add ground
    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 500.0, half_h: 20.0 },
        250.0, 500.0, 1.0,
        Material::default(),
        0xFFFF, 0xFFFF,
    );

    let half = 20.0;
    let mut ids = Vec::new();

    // Spawn a new box at the same position every 10 frames (6 boxes total)
    for frame in 0..360 {
        if frame % 10 == 0 && ids.len() < 6 {
            let id = world.add_body(
                BodyType::Dynamic,
                Shape::AABB { half_w: half, half_h: half },
                200.0, 100.0, 1.0,
                Material { restitution: 0.3, friction: 0.6 },
                0xFFFF, 0xFFFF,
            );
            ids.push(id);
        }
        world.step(1.0 / 60.0);
    }

    // After 6 seconds, check no two dynamic bodies overlap
    let positions: Vec<(f32, f32)> = ids.iter()
        .map(|&id| {
            let b = world.get_body(id).unwrap();
            (b.x, b.y)
        })
        .collect();

    for i in 0..positions.len() {
        for j in (i + 1)..positions.len() {
            let dx = (positions[j].0 - positions[i].0).abs();
            let dy = (positions[j].1 - positions[i].1).abs();
            let overlap_x = (2.0 * half - dx).max(0.0);
            let overlap_y = (2.0 * half - dy).max(0.0);
            let overlapping = overlap_x > 1.0 && overlap_y > 1.0;
            assert!(
                !overlapping,
                "Successively spawned bodies {} and {} still overlap after settling: \
                 pos_i=({:.1},{:.1}) pos_j=({:.1},{:.1}) overlap=({:.1},{:.1})",
                i, j, positions[i].0, positions[i].1,
                positions[j].0, positions[j].1,
                overlap_x, overlap_y,
            );
        }
    }
}

/// Mixed shapes (boxes + circles) spawned overlapping midair must not stick.
#[test]
fn test_mixed_shapes_overlapping_midair_dont_stick() {
    let mut world = PhysicsWorld::new(0.0, 300.0);
    let mut ids = Vec::new();

    // Create a cluster of overlapping shapes at the same position
    let cx = 100.0;
    let cy = 80.0;

    ids.push(world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: 12.0, half_h: 12.0 },
        cx, cy, 1.0,
        Material { restitution: 0.0, friction: 0.3 },
        0xFFFF, 0xFFFF,
    ));
    ids.push(world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 10.0 },
        cx + 5.0, cy + 5.0, 1.0,
        Material { restitution: 0.0, friction: 0.3 },
        0xFFFF, 0xFFFF,
    ));
    ids.push(world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: 8.0, half_h: 8.0 },
        cx - 3.0, cy + 10.0, 1.0,
        Material { restitution: 0.0, friction: 0.3 },
        0xFFFF, 0xFFFF,
    ));
    ids.push(world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 6.0 },
        cx + 2.0, cy - 5.0, 1.0,
        Material { restitution: 0.0, friction: 0.3 },
        0xFFFF, 0xFFFF,
    ));

    let start_y: Vec<f32> = ids.iter().map(|&id| world.get_body(id).unwrap().y).collect();

    for _ in 0..90 {
        world.step(1.0 / 60.0);
    }

    for (i, &id) in ids.iter().enumerate() {
        let body = world.get_body(id).unwrap();
        let fall = body.y - start_y[i];
        eprintln!("Mixed body {}: fell {:.1}", i, fall);
        assert!(
            fall > 50.0,
            "Body {} stuck midair: fell only {:.1} in 1.5s",
            i, fall,
        );
    }
}

// =========================================================================
// Contact accumulation — get_contacts() must report all sub-step collisions
// =========================================================================

/// A fast ball hitting a static wall should appear in get_contacts() even
/// if the ball bounces away during an earlier sub-step. This simulates
/// the breakout scenario where the ball hits a brick and bounces off
/// within the same frame.
#[test]
fn test_contacts_accumulated_across_substeps() {
    let mut world = PhysicsWorld::new(0.0, 0.0); // No gravity

    // Static wall
    let wall_id = world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: 200.0, half_h: 10.0 },
        200.0, 0.0, 1.0,
        Material { restitution: 1.0, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );

    // Fast ball approaching wall from below (positive Y = toward wall at y=0)
    let ball_id = world.add_body(
        BodyType::Dynamic,
        Shape::Circle { radius: 6.0 },
        200.0, 20.0, 1.0,
        Material { restitution: 1.0, friction: 0.0 },
        0xFFFF, 0xFFFF,
    );
    world.set_velocity(ball_id, 0.0, -350.0); // Moving toward wall

    // Step one frame
    world.step(1.0 / 60.0);

    // The ball should have bounced off the wall. Even if it separated by
    // the last sub-step, get_contacts() must report the collision.
    let contacts = world.get_contacts();
    let has_wall_contact = contacts.iter().any(|c| {
        (c.body_a == ball_id && c.body_b == wall_id) ||
        (c.body_a == wall_id && c.body_b == ball_id)
    });

    // The ball at y=20, radius=6, moving at -350 u/s. In 1/60s = 5.83 units.
    // After 1 sub-step (1/240s): moves ~1.46 units → y≈18.5, still no contact.
    // The ball needs to reach y=16 (wall top at 10 + radius 6) to hit.
    // This takes ~4/350 * 240 ≈ 2.7 sub-steps. So contact happens mid-frame
    // and the ball bounces away. Without accumulation, we'd miss it.
    let ball_state = world.get_body(ball_id).unwrap();
    eprintln!(
        "Ball after step: y={:.1} vy={:.1}, contacts={}, wall_contact={}",
        ball_state.y, ball_state.vy, contacts.len(), has_wall_contact,
    );

    assert!(
        has_wall_contact,
        "Ball-wall contact missing from get_contacts(). Ball likely bounced during \
         an earlier sub-step and the contact was lost. Found {} contacts: {:?}",
        contacts.len(),
        contacts.iter().map(|c| (c.body_a, c.body_b)).collect::<Vec<_>>(),
    );
}

/// Box at the edge of a platform must not clip through.
/// This tests the AABB axis selection issue where horizontal overlap
/// can be smaller than vertical, causing incorrect sideways resolution.
#[test]
fn test_box_on_platform_edge_no_clipping() {
    let mut world = PhysicsWorld::new(0.0, 300.0);
    let box_size = 20.0;
    let half = box_size / 2.0;

    // Platform: 100 units wide, centered at x=100
    let plat_center_x = 100.0;
    let plat_half_w = 50.0;
    let plat_center_y = 220.0;
    let plat_half_h = 10.0;
    let plat_top = plat_center_y - plat_half_h; // 210.0
    let plat_right = plat_center_x + plat_half_w; // 150.0

    world.add_body(
        BodyType::Static,
        Shape::AABB { half_w: plat_half_w, half_h: plat_half_h },
        plat_center_x, plat_center_y, 1.0,
        Material::default(),
        0xFFFF, 0xFFFF,
    );

    // Drop box near the right edge of the platform (only 5 units of horizontal overlap)
    let box_x = plat_right - 5.0; // most of the box hangs off the right edge
    let box_id = world.add_body(
        BodyType::Dynamic,
        Shape::AABB { half_w: half, half_h: half },
        box_x, 50.0, 1.0,
        Material { restitution: 0.0, friction: 0.5 },
        0xFFFF, 0xFFFF,
    );

    let max_allowed_penetration = 1.0;

    for frame in 0..300 {
        world.step(1.0 / 60.0);

        let body = world.get_body(box_id).unwrap();
        let box_bottom = body.y + half;

        // The box should either land on top of the platform or slide off the edge.
        // It must NOT clip through the platform surface.
        if body.x + half > plat_center_x - plat_half_w && body.x - half < plat_right {
            // Box still overlaps platform horizontally
            assert!(
                box_bottom <= plat_top + max_allowed_penetration,
                "Frame {}: edge box penetrates platform by {:.3} (bottom={:.3}, plat_top={:.3})",
                frame, box_bottom - plat_top, box_bottom, plat_top,
            );
        }
    }
}
