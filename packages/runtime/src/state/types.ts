/** Branded string type for entity identification */
export type EntityId = string & { readonly __entityId: true };

/** Create an EntityId from a string */
export function entityId(id: string): EntityId {
  return id as EntityId;
}

/** Generate a unique EntityId (uses crypto.randomUUID or counter in tests) */
export function generateId(): EntityId {
  return crypto.randomUUID() as EntityId;
}

/** 2D position vector (immutable) */
export type Vec2 = Readonly<{ x: number; y: number }>;

type Primitive = string | number | boolean | null | undefined;

/** Deep recursive readonly — enforces immutability at the type level */
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
