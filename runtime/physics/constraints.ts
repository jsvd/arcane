import type { BodyId, ConstraintId } from "./types.ts";

const hasPhysicsOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_physics_world === "function";

/**
 * Create a distance joint that maintains a fixed distance between two bodies.
 * Returns a ConstraintId for future reference. Returns 0 in headless mode.
 */
export function createDistanceJoint(bodyA: BodyId, bodyB: BodyId, distance: number): ConstraintId {
  if (!hasPhysicsOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_distance_joint(bodyA, bodyB, distance);
}

/**
 * Create a revolute (hinge) joint at a pivot point between two bodies.
 * Returns a ConstraintId for future reference. Returns 0 in headless mode.
 */
export function createRevoluteJoint(bodyA: BodyId, bodyB: BodyId, pivotX: number, pivotY: number): ConstraintId {
  if (!hasPhysicsOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_revolute_joint(bodyA, bodyB, pivotX, pivotY);
}

/**
 * Remove a constraint from the physics world.
 * No-op in headless mode.
 */
export function removeConstraint(id: ConstraintId): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_remove_constraint(id);
}
