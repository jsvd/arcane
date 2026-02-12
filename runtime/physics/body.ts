import type { BodyId, BodyDef, BodyState } from "./types.ts";

const hasPhysicsOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_physics_world === "function";

const defaultBodyState: BodyState = { x: 0, y: 0, angle: 0, vx: 0, vy: 0, angularVelocity: 0, sleeping: false };

/**
 * Create a rigid body in the physics world.
 * Returns a BodyId for future reference. Returns 0 in headless mode.
 */
export function createBody(def: BodyDef): BodyId {
  if (!hasPhysicsOps) return 0;

  // Map body type to u32: 0=static, 1=dynamic, 2=kinematic
  const btMap: Record<string, number> = { static: 0, dynamic: 1, kinematic: 2 };
  const bodyTypeNum = btMap[def.type] ?? 1;

  // Map shape type to u32: 0=circle, 1=aabb
  // shape_p1/p2: circle=(radius, 0), aabb=(halfW, halfH)
  let shapeType = 0;
  let p1 = 0;
  let p2 = 0;
  const shape = def.shape;
  if (shape.type === "circle") {
    shapeType = 0;
    p1 = shape.radius;
    p2 = 0;
  } else if (shape.type === "aabb") {
    shapeType = 1;
    p1 = shape.halfW;
    p2 = shape.halfH;
  }
  // polygon not supported via this fast op (would need serde)

  const mass = def.mass ?? 1.0;
  const restitution = def.material?.restitution ?? 0.3;
  const friction = def.material?.friction ?? 0.5;
  const layer = def.layer ?? 0x0001;
  const mask = def.mask ?? 0xFFFF;
  const x = def.x;
  const y = def.y;

  return (globalThis as any).Deno.core.ops.op_create_body(
    bodyTypeNum, shapeType, p1, p2, x, y, mass, restitution, friction, layer, mask
  );
}

/**
 * Remove a body from the physics world.
 * No-op in headless mode.
 */
export function removeBody(id: BodyId): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_remove_body(id);
}

/**
 * Get the current state of a body (position, angle, velocity).
 * Returns a default state (all zeros) if the body doesn't exist or ops unavailable.
 */
export function getBodyState(id: BodyId): BodyState {
  if (!hasPhysicsOps) return defaultBodyState;
  const arr: number[] = (globalThis as any).Deno.core.ops.op_get_body_state(id);
  if (!arr || arr.length < 6) return defaultBodyState;
  return {
    x: arr[0],
    y: arr[1],
    angle: arr[2],
    vx: arr[3],
    vy: arr[4],
    angularVelocity: arr[5],
    sleeping: arr[6] === 1.0,
  };
}

/**
 * Set a body's linear velocity. Wakes the body if sleeping.
 * No-op in headless mode.
 */
export function setBodyVelocity(id: BodyId, vx: number, vy: number): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_set_body_velocity(id, vx, vy);
}

/**
 * Set a body's angular velocity. Wakes the body if sleeping.
 * No-op in headless mode.
 */
export function setBodyAngularVelocity(id: BodyId, av: number): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_set_body_angular_velocity(id, av);
}

/**
 * Apply a force to a body (accumulated over the frame). Wakes the body.
 * No-op in headless mode.
 */
export function applyForce(id: BodyId, fx: number, fy: number): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_apply_force(id, fx, fy);
}

/**
 * Apply an instant impulse to a body (directly modifies velocity). Wakes the body.
 * No-op in headless mode.
 */
export function applyImpulse(id: BodyId, ix: number, iy: number): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_apply_impulse(id, ix, iy);
}

/**
 * Teleport a body to a new position. Wakes the body.
 * No-op in headless mode.
 */
export function setBodyPosition(id: BodyId, x: number, y: number): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_set_body_position(id, x, y);
}

/**
 * Set collision filtering layers for a body.
 * Two bodies collide if (a.layer & b.mask) != 0 AND (b.layer & a.mask) != 0.
 * No-op in headless mode.
 */
export function setCollisionLayers(id: BodyId, layer: number, mask: number): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_set_collision_layers(id, layer, mask);
}

/**
 * Set a kinematic body's velocity for physics-driven movement.
 * Alias for setBodyVelocity, semantically for kinematic bodies.
 * No-op in headless mode.
 */
export function setKinematicVelocity(id: BodyId, vx: number, vy: number): void {
  setBodyVelocity(id, vx, vy);
}
