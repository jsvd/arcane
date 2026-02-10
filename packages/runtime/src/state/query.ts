import type { Vec2 } from "./types.ts";

/** A predicate function for filtering */
export type Predicate<T> = (item: T) => boolean;

/** Query an array at a path, with optional filtering */
export function query<S, R = unknown>(
  state: S,
  path: string,
  filter?: Predicate<R> | Record<string, unknown>,
): readonly R[] {
  const value = getByPath(state, path);

  if (!Array.isArray(value)) {
    return value !== undefined ? ([value] as unknown as readonly R[]) : [];
  }

  if (!filter) return value as readonly R[];

  if (typeof filter === "function") {
    return value.filter(filter) as readonly R[];
  }

  // Object filter: match properties
  return value.filter((item) => {
    if (typeof item !== "object" || item === null) return false;
    const record = item as Record<string, unknown>;
    for (const [key, expected] of Object.entries(filter)) {
      if (typeof expected === "function") {
        if (!(expected as Predicate<unknown>)(record[key])) return false;
      } else if (record[key] !== expected) {
        return false;
      }
    }
    return true;
  }) as readonly R[];
}

/** Get a single value at a path */
export function get<S, R = unknown>(state: S, path: string): R | undefined {
  return getByPath(state, path) as R | undefined;
}

/** Check existence at a path, optionally with a predicate */
export function has<S>(
  state: S,
  path: string,
  predicate?: Predicate<unknown>,
): boolean {
  const value = getByPath(state, path);
  if (value === undefined) return false;
  if (predicate) return predicate(value);
  return true;
}

// --- Filter combinators ---

/** Less than */
export function lt(value: number): Predicate<number> {
  return (item: number) => item < value;
}

/** Greater than */
export function gt(value: number): Predicate<number> {
  return (item: number) => item > value;
}

/** Less than or equal */
export function lte(value: number): Predicate<number> {
  return (item: number) => item <= value;
}

/** Greater than or equal */
export function gte(value: number): Predicate<number> {
  return (item: number) => item >= value;
}

/** Strict equality */
export function eq<T>(value: T): Predicate<T> {
  return (item: T) => item === value;
}

/** Not equal */
export function neq<T>(value: T): Predicate<T> {
  return (item: T) => item !== value;
}

/** Value is one of the given options */
export function oneOf<T>(...values: T[]): Predicate<T> {
  return (item: T) => values.includes(item);
}

/** Position within radius of a center point */
export function within(center: Vec2, radius: number): Predicate<Vec2> {
  return (pos: Vec2) => {
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
  };
}

/** Combine predicates: all must pass */
export function allOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item: T) => predicates.every((p) => p(item));
}

/** Combine predicates: any must pass */
export function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item: T) => predicates.some((p) => p(item));
}

/** Negate a predicate */
export function not<T>(predicate: Predicate<T>): Predicate<T> {
  return (item: T) => !predicate(item);
}

// --- Internal: path traversal with wildcard support ---

function getByPath(obj: unknown, path: string): unknown {
  const segments = path.split(".");
  return resolveSegments(obj, segments);
}

function resolveSegments(obj: unknown, segments: string[]): unknown {
  if (segments.length === 0) return obj;

  const [head, ...rest] = segments;

  if (head === "*") {
    // Wildcard: expand across array elements
    if (!Array.isArray(obj)) return undefined;
    if (rest.length === 0) return obj;
    return obj.flatMap((item) => {
      const result = resolveSegments(item, rest);
      return Array.isArray(result) ? result : [result];
    });
  }

  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== "object") return undefined;

  const next = (obj as Record<string, unknown>)[head];
  return resolveSegments(next, rest);
}
