import type { BodyId, ConstraintId } from "./types.ts";

const hasPhysicsOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_physics_world === "function";

/**
 * Soft constraint parameters for spring-like behavior.
 *
 * These parameters control how "springy" a constraint feels:
 *
 * - **frequencyHz**: Natural oscillation frequency in Hz.
 *   - `0` = rigid constraint (no spring behavior)
 *   - `1-5 Hz` = soft springs (rope, bungee, suspension)
 *   - `30+ Hz` = stiff contacts (default for collisions)
 *
 * - **dampingRatio**: Controls oscillation decay.
 *   - `< 1.0` = underdamped (bouncy, oscillates)
 *   - `= 1.0` = critically damped (returns smoothly, no overshoot)
 *   - `> 1.0` = overdamped (sluggish return)
 *
 * @example
 * // Bouncy spring (oscillates ~3 times/sec)
 * { frequencyHz: 3, dampingRatio: 0.3 }
 *
 * // Car suspension (smooth, no bounce)
 * { frequencyHz: 5, dampingRatio: 1.0 }
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
 *
 * Unlike rigid distance joints, soft joints act like springs that pull
 * bodies toward the target distance with configurable stiffness and damping.
 *
 * @param bodyA First body
 * @param bodyB Second body
 * @param distance Target rest distance between body centers
 * @param params Soft constraint parameters (frequency and damping)
 * @returns ConstraintId for future reference. Returns 0 in headless mode.
 *
 * @example
 * // Bouncy rope between two bodies
 * const rope = createSoftDistanceJoint(anchor, ball, 100, {
 *   frequencyHz: 2,      // Oscillates ~2 times per second
 *   dampingRatio: 0.3,   // Bouncy (underdamped)
 * });
 *
 * // Stiff suspension spring
 * const spring = createSoftDistanceJoint(chassis, wheel, 30, {
 *   frequencyHz: 8,
 *   dampingRatio: 1.0,   // Critically damped (no bounce)
 * });
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
 * Create a soft revolute (hinge) joint with spring-like behavior.
 *
 * Bodies rotate freely around the pivot point, but the pivot connection
 * itself has spring-like compliance. Useful for shock-absorbing hinges.
 *
 * @param bodyA First body
 * @param bodyB Second body
 * @param pivotX Pivot X coordinate in world space
 * @param pivotY Pivot Y coordinate in world space
 * @param params Soft constraint parameters (frequency and damping)
 * @returns ConstraintId for future reference. Returns 0 in headless mode.
 *
 * @example
 * // Shock-absorbing car wheel mount
 * const axle = createSoftRevoluteJoint(chassis, wheel, wheelX, wheelY, {
 *   frequencyHz: 4,
 *   dampingRatio: 0.8,
 * });
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
