import type { PhysicsWorldOptions } from "./types.ts";

const hasPhysicsOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_physics_world === "function";

/**
 * Create a physics world with gravity.
 * Call once before creating bodies. Default gravity is (0, 9.81) -- downward.
 * No-op in headless mode.
 */
export function createPhysicsWorld(options?: PhysicsWorldOptions): void {
  if (!hasPhysicsOps) return;
  const gx = options?.gravityX ?? 0;
  const gy = options?.gravityY ?? 9.81;
  (globalThis as any).Deno.core.ops.op_create_physics_world(gx, gy);
}

/**
 * Advance the physics simulation by dt seconds.
 * Uses fixed timestep internally (1/60s) with accumulator.
 * No-op in headless mode.
 */
export function stepPhysics(dt: number): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_physics_step(dt);
}

/**
 * Destroy the physics world, freeing all bodies and constraints.
 * No-op in headless mode.
 */
export function destroyPhysicsWorld(): void {
  if (!hasPhysicsOps) return;
  (globalThis as any).Deno.core.ops.op_destroy_physics_world();
}
