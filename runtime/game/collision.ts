/**
 * Collision event system. Register callbacks for body or pair collisions,
 * then call processCollisions() each frame after stepPhysics().
 */

import type { BodyId, Contact } from "../physics/types.ts";
import type { CollisionCallback, CollisionRegistry } from "./types.ts";
import { getContacts } from "../physics/query.ts";

/**
 * Create a collision event registry.
 * @returns Empty collision registry.
 */
export function createCollisionRegistry(): CollisionRegistry {
  return {
    _bodyCallbacks: new Map(),
    _pairCallbacks: new Map(),
  };
}

/** @internal Compute sorted pair key for two body IDs. */
function pairKey(a: BodyId, b: BodyId): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/**
 * Register a callback for when a specific body collides with anything.
 */
export function onBodyCollision(
  registry: CollisionRegistry,
  bodyId: BodyId,
  callback: CollisionCallback,
): void {
  const existing = registry._bodyCallbacks.get(bodyId) ?? [];
  existing.push(callback);
  registry._bodyCallbacks.set(bodyId, existing);
}

/**
 * Register a callback for when two specific bodies collide.
 */
export function onCollision(
  registry: CollisionRegistry,
  bodyA: BodyId,
  bodyB: BodyId,
  callback: CollisionCallback,
): void {
  const key = pairKey(bodyA, bodyB);
  const existing = registry._pairCallbacks.get(key) ?? [];
  existing.push(callback);
  registry._pairCallbacks.set(key, existing);
}

/**
 * Remove all collision callbacks involving a body.
 * Call when destroying an entity/body.
 */
export function removeBodyCollisions(
  registry: CollisionRegistry,
  bodyId: BodyId,
): void {
  registry._bodyCallbacks.delete(bodyId);
  for (const key of registry._pairCallbacks.keys()) {
    const [a, b] = key.split("_").map(Number);
    if (a === bodyId || b === bodyId) {
      registry._pairCallbacks.delete(key);
    }
  }
}

/**
 * Process all contacts from the last physics step and fire registered callbacks.
 * Call once per frame after stepPhysics().
 */
export function processCollisions(registry: CollisionRegistry): void {
  const contacts = getContacts();
  for (const contact of contacts) {
    const cbA = registry._bodyCallbacks.get(contact.bodyA);
    if (cbA) {
      for (const cb of cbA) cb(contact);
    }
    const cbB = registry._bodyCallbacks.get(contact.bodyB);
    if (cbB) {
      for (const cb of cbB) cb(contact);
    }
    const key = pairKey(contact.bodyA, contact.bodyB);
    const pairCbs = registry._pairCallbacks.get(key);
    if (pairCbs) {
      for (const cb of pairCbs) cb(contact);
    }
  }
}
