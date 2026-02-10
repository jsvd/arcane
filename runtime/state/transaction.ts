import type { ArcaneError } from "./error.ts";
import { createError } from "./error.ts";

/**
 * A mutation: a named, describable, applicable state change.
 * Created by mutation primitives ({@link set}, {@link update}, {@link push}, etc.)
 * and applied atomically via {@link transaction}.
 *
 * - `type` - Mutation kind: "set", "update", "push", or "remove".
 * - `path` - Dot-separated path to the target value (e.g., "player.hp").
 * - `description` - Human-readable description of what this mutation does.
 * - `apply` - Pure function that takes state and returns new state with the mutation applied.
 */
export type Mutation<S> = Readonly<{
  type: string;
  path: string;
  description: string;
  apply: (state: S) => S;
}>;

// --- Core mutation primitives ---

/**
 * Create a mutation that sets a value at a dot-separated path.
 * Pure function — returns a Mutation object, does not modify state directly.
 * Apply via {@link transaction} or {@link GameStore.dispatch}.
 *
 * @param path - Dot-separated path (e.g., "player.hp", "enemies.0.alive").
 * @param value - The value to set at the path.
 * @returns A Mutation that can be applied in a transaction.
 *
 * @example
 * const result = transaction(state, [
 *   set("player.hp", 80),
 *   set("player.position.x", 10),
 * ]);
 */
export function set<S>(path: string, value: unknown): Mutation<S> {
  return {
    type: "set",
    path,
    description: `Set ${path} to ${JSON.stringify(value)}`,
    apply: (state: S) => setAtPath(state, path, value) as S,
  };
}

/**
 * Create a mutation that updates a value at a path using a transform function.
 * The function receives the current value and returns the new value.
 * Pure function — returns a Mutation object, does not modify state directly.
 *
 * @param path - Dot-separated path to the value (e.g., "player.hp").
 * @param fn - Transform function: receives the current value, returns the new value.
 * @returns A Mutation that can be applied in a transaction.
 */
export function update<S>(
  path: string,
  fn: (current: unknown) => unknown,
): Mutation<S> {
  return {
    type: "update",
    path,
    description: `Update ${path}`,
    apply: (state: S) => {
      const current = getAtPath(state, path);
      return setAtPath(state, path, fn(current)) as S;
    },
  };
}

/**
 * Create a mutation that pushes an item onto an array at a path.
 * Throws during application if the value at the path is not an array.
 *
 * @param path - Dot-separated path to the array (e.g., "enemies", "player.inventory").
 * @param item - The item to append to the array.
 * @returns A Mutation that can be applied in a transaction.
 */
export function push<S>(path: string, item: unknown): Mutation<S> {
  return {
    type: "push",
    path,
    description: `Push item onto ${path}`,
    apply: (state: S) => {
      const arr = getAtPath(state, path);
      if (!Array.isArray(arr)) {
        throw new Error(`Expected array at path "${path}", got ${typeof arr}`);
      }
      return setAtPath(state, path, [...arr, item]) as S;
    },
  };
}

/**
 * Create a mutation that removes items from an array at a path where the predicate returns true.
 * Throws during application if the value at the path is not an array.
 *
 * @param path - Dot-separated path to the array.
 * @param predicate - Function that returns true for items to remove.
 * @returns A Mutation that can be applied in a transaction.
 */
export function removeWhere<S>(
  path: string,
  predicate: (item: unknown) => boolean,
): Mutation<S> {
  return {
    type: "remove",
    path,
    description: `Remove matching items from ${path}`,
    apply: (state: S) => {
      const arr = getAtPath(state, path);
      if (!Array.isArray(arr)) {
        throw new Error(`Expected array at path "${path}", got ${typeof arr}`);
      }
      return setAtPath(
        state,
        path,
        arr.filter((item) => !predicate(item)),
      ) as S;
    },
  };
}

/**
 * Create a mutation that removes a key from an object.
 * The last segment of the path is the key to remove; the preceding segments
 * identify the parent object. Throws during application if the parent is not an object.
 *
 * @param path - Dot-separated path where the last segment is the key to remove
 *               (e.g., "player.buffs.shield" removes "shield" from player.buffs).
 * @returns A Mutation that can be applied in a transaction.
 */
export function removeKey<S>(path: string): Mutation<S> {
  const segments = path.split(".");
  const key = segments.pop()!;
  const parentPath = segments.join(".");

  return {
    type: "remove",
    path,
    description: `Remove key "${key}" from ${parentPath || "root"}`,
    apply: (state: S) => {
      const parent = parentPath ? getAtPath(state, parentPath) : state;
      if (typeof parent !== "object" || parent === null) {
        throw new Error(
          `Expected object at path "${parentPath}", got ${typeof parent}`,
        );
      }
      const { [key]: _, ...rest } = parent as Record<string, unknown>;
      return (parentPath ? setAtPath(state, parentPath, rest) : rest) as S;
    },
  };
}

// --- Diff ---

/**
 * A single change entry in a diff, representing one value that changed.
 *
 * - `path` - Dot-separated path to the changed value (e.g., "player.hp").
 * - `from` - The previous value (undefined if the key was added).
 * - `to` - The new value (undefined if the key was removed).
 */
export type DiffEntry = Readonly<{
  path: string;
  from: unknown;
  to: unknown;
}>;

/**
 * All changes from a transaction, as a list of individual DiffEntry items.
 * Empty entries array means no changes occurred.
 *
 * - `entries` - Ordered list of individual value changes.
 */
export type Diff = Readonly<{
  entries: readonly DiffEntry[];
}>;

// --- Transaction result ---

/**
 * An effect triggered by a state change, for observer/event routing.
 * Reserved for future use — currently transactions return an empty effects array.
 *
 * - `type` - Effect type identifier (e.g., "damage", "levelUp").
 * - `source` - Identifier of the mutation or system that produced this effect.
 * - `data` - Arbitrary payload data for the effect.
 */
export type Effect = Readonly<{
  type: string;
  source: string;
  data: Readonly<Record<string, unknown>>;
}>;

/**
 * Result of executing a transaction. Check `valid` before using the new state.
 *
 * - `state` - The resulting state. Equals the original state if the transaction failed.
 * - `diff` - Changes that occurred. Empty if the transaction failed.
 * - `effects` - Side effects produced (reserved for future use).
 * - `valid` - Whether the transaction succeeded. If false, state is unchanged.
 * - `error` - Structured error if `valid` is false. Undefined on success.
 */
export type TransactionResult<S> = Readonly<{
  state: S;
  diff: Diff;
  effects: readonly Effect[];
  valid: boolean;
  error?: ArcaneError;
}>;

/**
 * Apply mutations atomically to state. All succeed or all roll back.
 * Pure function — returns a new state without modifying the original.
 * If any mutation throws, the entire transaction fails and the original state is returned.
 *
 * @param state - The current state to apply mutations to.
 * @param mutations - Ordered list of mutations to apply. Created via {@link set}, {@link update}, etc.
 * @returns A TransactionResult with the new state, diff, and validity flag.
 *
 * @example
 * const result = transaction(state, [
 *   set("player.hp", 80),
 *   update("player.xp", (xp: any) => xp + 50),
 * ]);
 * if (result.valid) {
 *   // Use result.state
 * }
 */
export function transaction<S>(
  state: S,
  mutations: readonly Mutation<S>[],
): TransactionResult<S> {
  try {
    let current = state;
    for (const mutation of mutations) {
      current = mutation.apply(current);
    }

    const diff = computeDiff(state, current);

    return {
      state: current,
      diff,
      effects: [],
      valid: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      state,
      diff: { entries: [] },
      effects: [],
      valid: false,
      error: createError("TRANSACTION_FAILED", `Transaction failed: ${message}`, {
        action: mutations.map((m) => m.description).join("; "),
        reason: message,
        suggestion: "Check that all paths exist and values are of expected types",
      }),
    };
  }
}

/**
 * Compute the diff between two state trees by recursively comparing all values.
 * Pure function — does not modify either state tree.
 * Used internally by {@link transaction}, but can also be called directly.
 *
 * @param before - The state before changes.
 * @param after - The state after changes.
 * @returns A Diff containing all individual value changes.
 */
export function computeDiff<S>(before: S, after: S): Diff {
  const entries: DiffEntry[] = [];
  diffRecursive(before, after, "", entries);
  return { entries };
}

// --- Internal helpers ---

function diffRecursive(
  before: unknown,
  after: unknown,
  path: string,
  entries: DiffEntry[],
): void {
  if (before === after) return;

  if (
    typeof before !== "object" ||
    typeof after !== "object" ||
    before === null ||
    after === null ||
    Array.isArray(before) !== Array.isArray(after)
  ) {
    entries.push({ path: path || "root", from: before, to: after });
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLen = Math.max(before.length, after.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = path ? `${path}.${i}` : `${i}`;
      if (i >= before.length) {
        entries.push({ path: childPath, from: undefined, to: after[i] });
      } else if (i >= after.length) {
        entries.push({ path: childPath, from: before[i], to: undefined });
      } else {
        diffRecursive(before[i], after[i], childPath, entries);
      }
    }
    if (before.length !== after.length) {
      const lengthPath = path ? `${path}.length` : "length";
      entries.push({ path: lengthPath, from: before.length, to: after.length });
    }
    return;
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const allKeys = new Set([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);

  for (const key of allKeys) {
    const childPath = path ? `${path}.${key}` : key;
    if (!(key in beforeObj)) {
      entries.push({ path: childPath, from: undefined, to: afterObj[key] });
    } else if (!(key in afterObj)) {
      entries.push({ path: childPath, from: beforeObj[key], to: undefined });
    } else {
      diffRecursive(beforeObj[key], afterObj[key], childPath, entries);
    }
  }
}

function getAtPath(obj: unknown, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function setAtPath(obj: unknown, path: string, value: unknown): unknown {
  const segments = path.split(".");

  if (segments.length === 1) {
    if (typeof obj !== "object" || obj === null) {
      throw new Error(`Cannot set property "${path}" on ${typeof obj}`);
    }
    if (Array.isArray(obj)) {
      const index = parseInt(segments[0], 10);
      const result = [...obj];
      result[index] = value;
      return result;
    }
    return { ...(obj as Record<string, unknown>), [segments[0]]: value };
  }

  const [head, ...rest] = segments;
  const restPath = rest.join(".");

  if (typeof obj !== "object" || obj === null) {
    throw new Error(`Cannot traverse into ${typeof obj} at "${head}"`);
  }

  if (Array.isArray(obj)) {
    const index = parseInt(head, 10);
    const result = [...obj];
    result[index] = setAtPath(result[index], restPath, value);
    return result;
  }

  const record = obj as Record<string, unknown>;
  return { ...record, [head]: setAtPath(record[head], restPath, value) };
}
