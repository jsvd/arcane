/**
 * Lightweight entity handles binding position + sprite + physics body.
 */

import type { Entity, EntityOptions, EntitySprite } from "./types.ts";
import type { BodyId } from "../physics/types.ts";
import { createBody, getBodyState, destroyBody } from "../physics/body.ts";
import { drawSprite } from "../rendering/sprites.ts";

/**
 * Create a lightweight game entity.
 *
 * Binds a world position to an optional physics body and sprite configuration.
 * If a body definition is provided, a physics body is created at (x, y).
 *
 * @param x - Initial world X position.
 * @param y - Initial world Y position.
 * @param opts - Optional entity configuration (sprite, body, tag).
 * @returns A new Entity object.
 *
 * @example
 * const player = createEntity(100, 200, {
 *   sprite: { color: rgb(0, 128, 255), w: 32, h: 32 },
 *   body: { type: "dynamic", shape: { type: "aabb", halfW: 16, halfH: 16 } },
 *   tag: "player",
 * });
 */
export function createEntity(x: number, y: number, opts?: EntityOptions): Entity {
  let bodyId: BodyId | null = null;
  if (opts?.body) {
    bodyId = createBody({ ...opts.body, x, y } as any);
  }
  return {
    x,
    y,
    angle: 0,
    bodyId,
    sprite: opts?.sprite ?? null,
    tag: opts?.tag ?? "",
    active: true,
  };
}

/**
 * Sync entity positions from their physics bodies.
 * Call once per frame after stepPhysics().
 *
 * Entities without a physics body or that are inactive are skipped.
 *
 * @param entities - Array of entities to synchronize.
 *
 * @example
 * stepPhysics(dt);
 * syncEntities(entities);
 */
export function syncEntities(entities: Entity[]): void {
  for (const ent of entities) {
    if (!ent.active || ent.bodyId === null) continue;
    const state = getBodyState(ent.bodyId);
    ent.x = state.x;
    ent.y = state.y;
    ent.angle = state.angle;
  }
}

/**
 * Draw all active entities that have sprite configurations.
 * Call once per frame during the render phase.
 *
 * Entities without a sprite or that are inactive are skipped.
 * If an entity sprite has a `color` but no `textureId`, a solid-color
 * texture is auto-created and cached.
 *
 * @param entities - Array of entities to draw.
 *
 * @example
 * drawEntities(entities);
 */
export function drawEntities(entities: Entity[]): void {
  for (const ent of entities) {
    if (!ent.active || !ent.sprite) continue;
    const s = ent.sprite;

    // Need either a textureId or a color
    if (!s.textureId && !s.color) continue;

    const offsetX = s.offsetX ?? -(s.w / 2);
    const offsetY = s.offsetY ?? -(s.h / 2);

    drawSprite({
      textureId: s.textureId,
      color: s.color,
      x: ent.x + offsetX,
      y: ent.y + offsetY,
      w: s.w,
      h: s.h,
      layer: s.layer ?? 0,
      rotation: s.rotation ?? ent.angle,
      flipX: s.flipX,
      flipY: s.flipY,
      opacity: s.opacity,
      blendMode: s.blendMode,
    });
  }
}

/**
 * Destroy an entity: removes its physics body and marks it inactive.
 *
 * After destruction the entity will be skipped by syncEntities() and
 * drawEntities(). Its bodyId is set to null.
 *
 * @param entity - The entity to destroy.
 *
 * @example
 * destroyEntity(bullet);
 */
export function destroyEntity(entity: Entity): void {
  if (entity.bodyId !== null) {
    destroyBody(entity.bodyId);
    entity.bodyId = null;
  }
  entity.active = false;
}

/**
 * Find the first active entity with a matching tag.
 *
 * @param entities - Array of entities to search.
 * @param tag - Tag string to match.
 * @returns The first matching active entity, or undefined.
 *
 * @example
 * const player = findEntity(entities, "player");
 * if (player) { ... }
 */
export function findEntity(entities: Entity[], tag: string): Entity | undefined {
  return entities.find((e) => e.active && e.tag === tag);
}

/**
 * Find all active entities with a matching tag.
 *
 * @param entities - Array of entities to search.
 * @param tag - Tag string to match.
 * @returns Array of matching active entities (may be empty).
 *
 * @example
 * const coins = findEntities(entities, "coin");
 * for (const coin of coins) { ... }
 */
export function findEntities(entities: Entity[], tag: string): Entity[] {
  return entities.filter((e) => e.active && e.tag === tag);
}
