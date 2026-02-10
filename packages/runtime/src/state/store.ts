import type { DeepReadonly } from "./types.ts";
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
    },

    getHistory(): readonly TransactionRecord<S>[] {
      return history;
    },
  };
}
