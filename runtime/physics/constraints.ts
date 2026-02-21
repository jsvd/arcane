import type { BodyId, ConstraintId } from "./types.ts";

const hasPhysicsOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_physics_world === "function";

/**
 * Soft constraint parameters for spring-like behavior.
 * frequency_hz: Natural frequency in Hz (0 = rigid, 1-5 Hz typical for springs)
 * damping_ratio: 1.0 = critically damped, <1.0 = bouncy, >1.0 = overdamped
 */
export interface SoftConstraintParams {
  frequencyHz: number;
  dampingRatio: number;
}

/**
 * Create a distance joint that maintains a fixed distance between two bodies.
 * Returns a ConstraintId for future reference. Returns 0 in headless mode.
 */
export function createDistanceJoint(bodyA: BodyId, bodyB: BodyId, distance: number): ConstraintId {
  if (!hasPhysicsOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_distance_joint(bodyA, bodyB, distance);
}

/**
 * Create a soft distance joint with spring-like behavior.
 * @param bodyA First body
 * @param bodyB Second body
 * @param distance Target distance
 * @param params Soft constraint parameters (frequency and damping)
 * @returns ConstraintId for future reference. Returns 0 in headless mode.
 */
export function createSoftDistanceJoint(
  bodyA: BodyId,
  bodyB: BodyId,
  distance: number,
  params: SoftConstraintParams
): ConstraintId {
  if (!hasPhysicsOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_soft_distance_joint(
    bodyA,
    bodyB,
    distance,
    params.frequencyHz,
    params.dampingRatio
  );
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
 * Create a soft revolute joint with spring-like behavior.
 * @param bodyA First body
 * @param bodyB Second body
 * @param pivotX Pivot X coordinate in world space
 * @param pivotY Pivot Y coordinate in world space
 * @param params Soft constraint parameters (frequency and damping)
 * @returns ConstraintId for future reference. Returns 0 in headless mode.
 */
export function createSoftRevoluteJoint(
  bodyA: BodyId,
  bodyB: BodyId,
  pivotX: number,
  pivotY: number,
  params: SoftConstraintParams
): ConstraintId {
  if (!hasPhysicsOps) return 0;
  return (globalThis as any).Deno.core.ops.op_create_soft_revolute_joint(
    bodyA,
    bodyB,
    pivotX,
    pivotY,
    params.frequencyHz,
    params.dampingRatio
  );
}

/**
 * Remove a constraint from the physics world.
 * No-op in headless mode.
 */
export function removeConstraint(id: ConstraintId): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_remove_constraint(id);
}
