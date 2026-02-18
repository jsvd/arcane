import type { DeepReadonly, EntityId } from "./types.ts";
import type { Mutation, Diff, TransactionResult } from "./transaction.ts";
import { transaction } from "./transaction.ts";
import type { Predicate } from "./query.ts";
import { query, get, has } from "./query.ts";
import type { PathPattern, ObserverCallback, Unsubscribe } from "./observe.ts";
import { createObserverRegistry } from "./observe.ts";

/**
 * The game store: central coordination point for state management.
 * Ties together state, transactions, queries, and observers.
 * Created via {@link createStore}.
 *
 * - `getState()` - Returns the current state as a deep readonly snapshot.
 * - `dispatch(mutations)` - Apply mutations atomically, update state, notify observers.
 * - `observe(pattern, callback)` - Subscribe to state changes matching a path pattern.
 * - `query(path, filter?)` - Query arrays or values in current state.
 * - `get(path)` - Get a single value from current state.
 * - `has(path, predicate?)` - Check existence in current state.
 * - `replaceState(state)` - Replace the entire state (for deserialization / time travel).
 * - `getHistory()` - Get the transaction history for recording/replay.
 * - `enableComponentIndex(collectionPath)` - Enable fast component lookups for an entity collection.
 * - `getEntitiesWithComponent(component)` - Get entity IDs that have a given component key.
 */
export type GameStore<S> = Readonly<{
  /** Returns the current state as a deep readonly snapshot. */
  getState: () => DeepReadonly<S>;

  /** Apply mutations atomically. Updates state and notifies observers on success. */
  dispatch: (mutations: readonly Mutation<S>[]) => TransactionResult<S>;

  /** Subscribe to state changes matching a path pattern. Returns an unsubscribe function. */
  observe: <T = unknown>(
    pattern: PathPattern,
    callback: ObserverCallback<T>,
  ) => Unsubscribe;

  /** Query arrays or values at a path, with optional filtering. */
  query: <R = unknown>(
    path: string,
    filter?: Predicate<R> | Record<string, unknown>,
  ) => readonly R[];

  /** Get a single value from current state by path. Returns undefined if not found. */
  get: <R = unknown>(path: string) => R | undefined;

  /** Check if a value exists at a path, optionally testing with a predicate. */
  has: (path: string, predicate?: Predicate<unknown>) => boolean;

  /** Replace the entire state (for deserialization / time travel). Does not trigger observers. */
  replaceState: (state: S) => void;

  /** Get the transaction history as an ordered list of TransactionRecords. */
  getHistory: () => readonly TransactionRecord<S>[];

  /**
   * Enable component indexing for an entity collection stored at the given path.
   * The collection must be a Record<EntityId, object> (entity map keyed by ID).
   * After enabling, query() will use the index for faster lookups when filtering
   * by component presence, and getEntitiesWithComponent() becomes available.
   *
   * @param collectionPath - Dot-separated path to the entity collection (e.g., "entities").
   */
  enableComponentIndex: (collectionPath: string) => void;

  /**
   * Get entity IDs that have a specific component (property key) in any indexed collection.
   * Returns an empty set if no component index is enabled or no entities have the component.
   *
   * @param component - The component/property name to look up.
   * @returns ReadonlySet of entity IDs that have this component.
   */
  getEntitiesWithComponent: (component: string) => ReadonlySet<EntityId>;
}>;

/**
 * A recorded transaction for replay and debugging.
 * Stored in the store's history, accessible via getHistory().
 *
 * - `timestamp` - When the transaction was applied (Date.now() milliseconds).
 * - `mutations` - The mutations that were applied in this transaction.
 * - `diff` - The computed diff of changes from this transaction.
 */
export type TransactionRecord<S> = Readonly<{
  timestamp: number;
  mutations: readonly Mutation<S>[];
  diff: Diff;
}>;

/**
 * Create a new game store with initial state, transactions, and observers.
 * The store is the central coordination point for game state management.
 *
 * @param initialState - The initial state object. Becomes the starting state for all queries.
 * @returns A GameStore with getState, dispatch, observe, query, get, has, replaceState, and getHistory.
 *
 * @example
 * const store = createStore({ player: { x: 0, y: 0, hp: 100 }, enemies: [] });
 * store.dispatch([set("player.x", 10)]);
 * console.log(store.getState().player.x); // 10
 */
export function createStore<S>(initialState: S): GameStore<S> {
  let state: S = initialState;
  const observers = createObserverRegistry<S>();
  const history: TransactionRecord<S>[] = [];

  // Component index: tracks which entities have which component keys.
  // Key = component name, Value = set of entity IDs that have it.
  const componentIndex = new Map<string, Set<EntityId>>();
  let indexedCollectionPath: string | null = null;

  /** Rebuild the component index from the current state. */
  function rebuildIndex(): void {
    componentIndex.clear();
    if (indexedCollectionPath === null) return;
    const collection = get(state, indexedCollectionPath) as Record<string, unknown> | undefined;
    if (!collection || typeof collection !== "object") return;
    for (const [entityIdStr, entity] of Object.entries(collection)) {
      if (entity && typeof entity === "object") {
        for (const key of Object.keys(entity as Record<string, unknown>)) {
          let set = componentIndex.get(key);
          if (!set) {
            set = new Set();
            componentIndex.set(key, set);
          }
          set.add(entityIdStr as EntityId);
        }
      }
    }
  }

  return {
    getState(): DeepReadonly<S> {
      return state as DeepReadonly<S>;
    },

    dispatch(mutations: readonly Mutation<S>[]): TransactionResult<S> {
      const oldState = state;
      const result = transaction(state, mutations);

      if (result.valid) {
        state = result.state;

        history.push({
          timestamp: Date.now(),
          mutations,
          diff: result.diff,
        });

        // Update component index if enabled and relevant paths changed
        if (indexedCollectionPath !== null) {
          const prefix = indexedCollectionPath + ".";
          const needsUpdate = result.diff.entries.some(
            (e) => e.path === indexedCollectionPath || e.path.startsWith(prefix),
          );
          if (needsUpdate) {
            rebuildIndex();
          }
        }

        observers.notify(oldState, state, result.diff);
      }

      return result;
    },

    observe<T = unknown>(
      pattern: PathPattern,
      callback: ObserverCallback<T>,
    ): Unsubscribe {
      return observers.observe(pattern, callback);
    },

    query<R = unknown>(
      path: string,
      filter?: Predicate<R> | Record<string, unknown>,
    ): readonly R[] {
      return query(state, path, filter);
    },

    get<R = unknown>(path: string): R | undefined {
      return get(state, path);
    },

    has(path: string, predicate?: Predicate<unknown>): boolean {
      return has(state, path, predicate);
    },

    replaceState(newState: S): void {
      state = newState;
      if (indexedCollectionPath !== null) {
        rebuildIndex();
      }
    },

    getHistory(): readonly TransactionRecord<S>[] {
      return history;
    },

    enableComponentIndex(collectionPath: string): void {
      indexedCollectionPath = collectionPath;
      rebuildIndex();
    },

    getEntitiesWithComponent(component: string): ReadonlySet<EntityId> {
      const set = componentIndex.get(component);
      return set ?? new Set();
    },
  };
}
