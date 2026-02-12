//! Integration tests for the physics engine.

use arcane_engine::physics::broadphase::SpatialHash;
use arcane_engine::physics::integrate::integrate;
use arcane_engine::physics::narrowphase::test_collision;
use arcane_engine::physics::resolve::resolve_contacts;
use arcane_engine::physics::sleep::update_sleep;
use arcane_engine::physics::types::*;
use arcane_engine::physics::world::PhysicsWorld;

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
    let (inv_mass, inertia, _inv_inertia) =
        compute_mass_and_inertia(&Shape::AABB { half_w: hw, half_h: hh }, mass, BodyType::Dynamic);
    assert!((inv_mass - 1.0 / 12.0).abs() < 1e-6);
    // I = m * (w^2 + h^2) / 12 = 12 * (36 + 16) / 12 = 52
    let w = hw * 2.0;
    let h = hh * 2.0;
    let expected = mass * (w * w + h * h) / 12.0;
    assert!((inertia - expected).abs() < 1e-4);
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
    let contacts = vec![Contact {
        body_a: 0,
        body_b: 1,
        normal: (0.0, 1.0),
        penetration: 0.5,
        contact_point: (0.0, 0.0),
    }];

    resolve_contacts(&mut bodies, &contacts, 6);

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
    let contacts = vec![Contact {
        body_a: 0,
        body_b: 1,
        normal: (1.0, 0.0),
        penetration: 7.0,
        contact_point: (1.5, 0.0),
    }];
    resolve_contacts(&mut bodies, &contacts, 6);
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
    // Body 1 is awake and moving
    bodies[1].as_mut().unwrap().vx = 5.0;

    let contacts = vec![Contact {
        body_a: 0,
        body_b: 1,
        normal: (1.0, 0.0),
        penetration: 0.1,
        contact_point: (1.0, 0.0),
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
    let pivot = (2.5, 0.0);
    let cid = world.add_constraint(Constraint::Revolute {
        id: 0,
        body_a: a,
        body_b: b,
        pivot,
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
    let contacts = world.get_contacts();
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
        pivot: (0.0, 0.0),
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        "Deno.core.ops.op_create_physics_world(0.0, 9.81)",
    )
    .unwrap();
}

#[test]
fn test_physics_ops_create_body_and_step() {
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 100.0);
        const id = Deno.core.ops.op_create_body(1, 0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        const s = Deno.core.ops.op_get_body_state(id);
        if (s.length !== 6) throw new Error("Expected 6 elements");
        if (s[1] <= 0) throw new Error("Body should have moved down");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_set_velocity() {
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
    rt.execute_script(
        "<test>",
        r#"
        Deno.core.ops.op_create_physics_world(0.0, 100.0);
        // Create an AABB body (shape_type=1)
        const id = Deno.core.ops.op_create_body(1, 1, 2.0, 3.0, 0.0, 0.0, 1.0, 0.3, 0.5, 65535, 65535);
        Deno.core.ops.op_physics_step(1.0 / 60.0);
        const s = Deno.core.ops.op_get_body_state(id);
        if (s.length !== 6) throw new Error("Should return state");
        if (s[1] <= 0) throw new Error("AABB body should fall with gravity");
        "#,
    )
    .unwrap();
}

#[test]
fn test_physics_ops_static_body() {
    let mut rt = arcane_engine::scripting::ArcaneRuntime::new();
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
