/**
 * Branded string type for entity identification.
 * Uses TypeScript's structural branding to prevent plain strings from being
 * used where an EntityId is expected. Create via {@link entityId} or {@link generateId}.
 */
export type EntityId = string & { readonly __entityId: true };

/**
 * Create an EntityId from a known string value.
 * Use this for deterministic IDs (e.g., "player", "enemy_1").
 * For random unique IDs, use {@link generateId} instead.
 *
 * @param id - The string to brand as an EntityId.
 * @returns A branded EntityId.
 */
export function entityId(id: string): EntityId {
  return id as EntityId;
}

/**
 * Generate a unique EntityId using crypto.randomUUID().
 * Each call produces a new UUID v4 string branded as EntityId.
 * Use {@link entityId} instead when you need a deterministic, human-readable ID.
 *
 * @returns A new unique EntityId.
 */
export function generateId(): EntityId {
  return crypto.randomUUID() as EntityId;
}

/**
 * Immutable 2D vector. Used for positions, velocities, and directions.
 *
 * - `x` - Horizontal component (positive = right).
 * - `y` - Vertical component (positive = down in screen coordinates).
 */
export type Vec2 = Readonly<{ x: number; y: number }>;

type Primitive = string | number | boolean | null | undefined;

/**
 * Deep recursive readonly utility type. Enforces immutability at the type level
 * by recursively wrapping all properties, arrays, Maps, and Sets as readonly.
 * Applied to state returned by {@link GameStore.getState} to prevent accidental mutation.
 */
export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends Set<infer U>
        ? ReadonlySet<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;
