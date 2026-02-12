import type { BodyId, Contact, RayHit } from "./types.ts";

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
