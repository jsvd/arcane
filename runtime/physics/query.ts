import type { BodyId, Contact, ContactManifold, ManifoldPoint, RayHit } from "./types.ts";

const hasPhysicsOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_physics_world === "function";

/**
 * Query all bodies overlapping an axis-aligned bounding box.
 * Returns an empty array in headless mode.
 */
export function queryAABB(minX: number, minY: number, maxX: number, maxY: number): BodyId[] {
  if (!hasPhysicsOps) return [];
  return (globalThis as any).Deno.core.ops.op_query_aabb(minX, minY, maxX, maxY);
}

/**
 * Cast a ray and return the first hit, or null if nothing hit.
 * Direction does not need to be normalized.
 * Returns null in headless mode.
 *
 * @param originX - Ray origin X.
 * @param originY - Ray origin Y.
 * @param dirX - Ray direction X (unnormalized).
 * @param dirY - Ray direction Y (unnormalized).
 * @param maxDistance - Maximum ray distance. Default: 1000.
 */
export function raycast(originX: number, originY: number, dirX: number, dirY: number, maxDistance?: number): RayHit | null {
  if (!hasPhysicsOps) return null;
  const dist = maxDistance ?? 1000.0;
  const result: number[] = (globalThis as any).Deno.core.ops.op_raycast(originX, originY, dirX, dirY, dist);
  if (!result || result.length < 4) return null;
  return {
    bodyId: result[0],
    hitX: result[1],
    hitY: result[2],
    distance: result[3],
  };
}

/**
 * Get all contacts from the last physics step.
 * Returns an empty array in headless mode.
 */
export function getContacts(): Contact[] {
  if (!hasPhysicsOps) return [];
  const flat: number[] = (globalThis as any).Deno.core.ops.op_get_contacts();
  const contacts: Contact[] = [];
  for (let i = 0; i + 6 < flat.length; i += 7) {
    contacts.push({
      bodyA: flat[i],
      bodyB: flat[i + 1],
      normalX: flat[i + 2],
      normalY: flat[i + 3],
      penetration: flat[i + 4],
      contactX: flat[i + 5],
      contactY: flat[i + 6],
    });
  }
  return contacts;
}

/**
 * Get all contact manifolds from the physics simulation.
 *
 * Contact manifolds provide detailed collision information used by the
 * TGS Soft solver. Each manifold represents a collision between two bodies
 * and can contain 1-2 contact points (2D collisions produce at most 2).
 *
 * Use this for:
 * - Visualizing contact points for debugging
 * - Custom collision response logic
 * - Physics debugging overlays
 *
 * **Note:** Sleeping bodies don't generate manifolds (performance optimization).
 * Wake a body with `applyImpulse(body, 0, 0)` if you need its manifolds.
 *
 * @returns Array of contact manifolds. Empty in headless mode.
 *
 * @example
 * // Draw contact points for debugging
 * for (const m of getManifolds()) {
 *   const stateA = getBodyState(m.bodyA);
 *   for (const pt of m.points) {
 *     // Transform local anchor to world space
 *     const wx = stateA.x + pt.localAX;
 *     const wy = stateA.y + pt.localAY;
 *     drawCircle({ x: wx, y: wy, radius: 3, color: rgb(255, 0, 0) });
 *   }
 * }
 */
export function getManifolds(): ContactManifold[] {
  if (!hasPhysicsOps) return [];
  const flat: number[] = (globalThis as any).Deno.core.ops.op_get_manifolds();
  const manifolds: ContactManifold[] = [];
  let i = 0;
  while (i < flat.length) {
    const bodyA = flat[i++];
    const bodyB = flat[i++];
    const normalX = flat[i++];
    const normalY = flat[i++];
    const numPoints = flat[i++];
    const points: ManifoldPoint[] = [];
    for (let p = 0; p < numPoints; p++) {
      points.push({
        localAX: flat[i++],
        localAY: flat[i++],
        localBX: flat[i++],
        localBY: flat[i++],
        penetration: flat[i++],
      });
    }
    manifolds.push({ bodyA, bodyB, normalX, normalY, points });
  }
  return manifolds;
}
