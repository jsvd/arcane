import type { Vec2 } from "./types.ts";

/**
 * A predicate function for filtering state queries.
 * Returns true if the item matches the filter criteria.
 * Build predicates using combinators: {@link lt}, {@link gt}, {@link eq}, {@link oneOf}, etc.
 */
export type Predicate<T> = (item: T) => boolean;

/**
 * Query state at a dot-separated path, with optional filtering.
 * Pure function — does not modify the state.
 *
 * If the value at the path is an array, returns matching elements.
 * If the value is a single value, wraps it in an array.
 * If the path doesn't exist, returns an empty array.
 *
 * The filter can be a predicate function, or an object where each key-value pair
 * must match (values can be predicates or literal values).
 * Supports `*` wildcards in paths to query across array elements.
 *
 * @param state - The state to query.
 * @param path - Dot-separated path (e.g., "enemies", "player.inventory"). Use `*` for wildcards.
 * @param filter - Optional predicate function or property-matching object.
 * @returns Readonly array of matching results.
 *
 * @example
 * const alive = query(state, "enemies", { alive: true });
 * const nearby = query(state, "enemies", within({ x: 5, y: 5 }, 3));
 * const names = query(state, "enemies.*.name");
 */
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

/**
 * Get a single value at a dot-separated path. Pure function.
 * Returns undefined if the path doesn't exist.
 *
 * @param state - The state to read from.
 * @param path - Dot-separated path (e.g., "player.hp", "config.difficulty").
 * @returns The value at the path, or undefined if not found.
 *
 * @example
 * const hp = get(state, "player.hp"); // number | undefined
 */
export function get<S, R = unknown>(state: S, path: string): R | undefined {
  return getByPath(state, path) as R | undefined;
}

/**
 * Check if a value exists at a path, optionally testing it with a predicate.
 * Pure function. Returns false if the path doesn't exist or if the predicate fails.
 *
 * @param state - The state to check.
 * @param path - Dot-separated path (e.g., "player.weapon").
 * @param predicate - Optional predicate to test the value against.
 * @returns True if the value exists (and passes the predicate, if provided).
 */
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

/**
 * Create a predicate that tests if a number is less than the given value.
 *
 * @param value - The threshold to compare against.
 * @returns A predicate returning true if item < value.
 */
export function lt(value: number): Predicate<number> {
  return (item: number) => item < value;
}

/**
 * Create a predicate that tests if a number is greater than the given value.
 *
 * @param value - The threshold to compare against.
 * @returns A predicate returning true if item > value.
 */
export function gt(value: number): Predicate<number> {
  return (item: number) => item > value;
}

/**
 * Create a predicate that tests if a number is less than or equal to the given value.
 *
 * @param value - The threshold to compare against.
 * @returns A predicate returning true if item <= value.
 */
export function lte(value: number): Predicate<number> {
  return (item: number) => item <= value;
}

/**
 * Create a predicate that tests if a number is greater than or equal to the given value.
 *
 * @param value - The threshold to compare against.
 * @returns A predicate returning true if item >= value.
 */
export function gte(value: number): Predicate<number> {
  return (item: number) => item >= value;
}

/**
 * Create a predicate that tests for strict equality (===) with the given value.
 *
 * @param value - The value to compare against.
 * @returns A predicate returning true if item === value.
 */
export function eq<T>(value: T): Predicate<T> {
  return (item: T) => item === value;
}

/**
 * Create a predicate that tests for strict inequality (!==) with the given value.
 *
 * @param value - The value to compare against.
 * @returns A predicate returning true if item !== value.
 */
export function neq<T>(value: T): Predicate<T> {
  return (item: T) => item !== value;
}

/**
 * Create a predicate that tests if a value is one of the given options (using Array.includes).
 *
 * @param values - The allowed values to match against.
 * @returns A predicate returning true if item is in the values list.
 */
export function oneOf<T>(...values: T[]): Predicate<T> {
  return (item: T) => values.includes(item);
}

/**
 * Create a predicate that tests if a Vec2 position is within a circular radius
 * of a center point. Uses squared distance for efficiency (no sqrt).
 *
 * @param center - Center point of the circle.
 * @param radius - Radius of the circle. Must be >= 0.
 * @returns A predicate returning true if the position is within the circle (inclusive).
 */
export function within(center: Vec2, radius: number): Predicate<Vec2> {
  return (pos: Vec2) => {
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    return dx * dx + dy * dy <= radius * radius;
  };
}

/**
 * Combine multiple predicates with logical AND. All predicates must pass.
 *
 * @param predicates - Predicates to combine.
 * @returns A predicate returning true only if every predicate passes.
 */
export function allOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item: T) => predicates.every((p) => p(item));
}

/**
 * Combine multiple predicates with logical OR. At least one predicate must pass.
 *
 * @param predicates - Predicates to combine.
 * @returns A predicate returning true if any predicate passes.
 */
export function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (item: T) => predicates.some((p) => p(item));
}

/**
 * Negate a predicate. Returns the logical NOT of the original predicate.
 *
 * @param predicate - The predicate to negate.
 * @returns A predicate returning true when the original returns false, and vice versa.
 */
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
