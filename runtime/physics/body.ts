import type { BodyId, BodyDef, BodyState } from "./types.ts";

const hasPhysicsOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_physics_world === "function";

const hasPolygonOp =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_polygon_body === "function";

const defaultBodyState: BodyState = { x: 0, y: 0, angle: 0, vx: 0, vy: 0, angularVelocity: 0, sleeping: false };

/**
 * Generate vertices for a box polygon shape centered at origin.
 * Use this with createBody() and shape: { type: "polygon", vertices: ... }
 * to create physics bodies that properly rotate (unlike AABB shapes).
 *
 * @param halfW - Half-width of the box.
 * @param halfH - Half-height of the box.
 * @returns Array of [x, y] vertices in CCW order.
 *
 * @example
 * const vertices = boxPolygonVertices(30, 10);
 * const bodyId = createBody({
 *   type: "dynamic",
 *   shape: { type: "polygon", vertices },
 *   x: 400, y: 200,
 *   mass: 2.0,
 * });
 */
export function boxPolygonVertices(halfW: number, halfH: number): [number, number][] {
  return [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
  ];
}

/**
 * Create a rigid body in the physics world.
 * Returns a BodyId for future reference. Returns 0 in headless mode.
 */
export function createBody(def: BodyDef): BodyId {
  if (!hasPhysicsOps) return 0;

  // Map body type to u32: 0=static, 1=dynamic, 2=kinematic
  const btMap: Record<string, number> = { static: 0, dynamic: 1, kinematic: 2 };
  const bodyTypeNum = btMap[def.type] ?? 1;

  const mass = def.mass ?? 1.0;
  const restitution = def.material?.restitution ?? 0.3;
  const friction = def.material?.friction ?? 0.5;
  const layer = def.layer ?? 0x0001;
  const mask = def.mask ?? 0xFFFF;
  const x = def.x;
  const y = def.y;

  const shape = def.shape;

  // Handle polygon shapes via dedicated serde-based op
  if (shape.type === "polygon") {
    if (!hasPolygonOp) return 0;
    // Flatten vertices to [x0, y0, x1, y1, ...]
    const flatVerts: number[] = [];
    for (const [vx, vy] of shape.vertices) {
      flatVerts.push(vx, vy);
    }
    return (globalThis as any).Deno.core.ops.op_create_polygon_body(
      bodyTypeNum, flatVerts, x, y, mass, restitution, friction, layer, mask
    );
  }

  // Map shape type to u32: 0=circle, 1=aabb
  // shape_p1/p2: circle=(radius, 0), aabb=(halfW, halfH)
  let shapeType = 0;
  let p1 = 0;
  let p2 = 0;
  if (shape.type === "circle") {
    shapeType = 0;
    p1 = shape.radius;
    p2 = 0;
  } else if (shape.type === "aabb") {
    shapeType = 1;
    p1 = shape.halfW;
    p2 = shape.halfH;
  }

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

/**
 * Get the state of all bodies in the physics world in a single call.
 * Much more efficient than calling getBodyState() per body when you have many bodies.
 * Returns an empty array in headless mode or if no physics world exists.
 *
 * @returns Array of BodyState objects for every active body in the world.
 */
export function getAllBodyStates(): (BodyState & { id: BodyId })[] {
  if (!hasPhysicsOps) return [];
  const hasOp = typeof (globalThis as any).Deno?.core?.ops?.op_get_all_body_states === "function";
  if (!hasOp) return [];

  const arr: number[] = (globalThis as any).Deno.core.ops.op_get_all_body_states();
  if (!arr || arr.length === 0) return [];

  // Layout per body: [id, x, y, vx, vy, angle, angular_velocity, is_sleeping] = 8 f64s
  const STRIDE = 8;
  const count = Math.floor(arr.length / STRIDE);
  const result: (BodyState & { id: BodyId })[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const base = i * STRIDE;
    result[i] = {
      id: arr[base],
      x: arr[base + 1],
      y: arr[base + 2],
      vx: arr[base + 3],
      vy: arr[base + 4],
      angle: arr[base + 5],
      angularVelocity: arr[base + 6],
      sleeping: arr[base + 7] === 1.0,
    };
  }

  return result;
}
