import type { DeepReadonly } from "./types.ts";
import type { Mutation, Diff, TransactionResult } from "./transaction.ts";
import { transaction } from "./transaction.ts";
import type { Predicate } from "./query.ts";
import { query, get, has } from "./query.ts";
import type { PathPattern, ObserverCallback, Unsubscribe } from "./observe.ts";
import { createObserverRegistry } from "./observe.ts";

/** The game store: ties state + transactions + observers together */
export type GameStore<S> = Readonly<{
  /** Current state (readonly snapshot) */
  getState: () => DeepReadonly<S>;

  /** Apply mutations as a transaction, update state, notify observers */
  dispatch: (mutations: readonly Mutation<S>[]) => TransactionResult<S>;

  /** Subscribe to state changes at a path pattern */
  observe: <T = unknown>(
    pattern: PathPattern,
    callback: ObserverCallback<T>,
  ) => Unsubscribe;

  /** Query current state */
  query: <R = unknown>(
    path: string,
    filter?: Predicate<R> | Record<string, unknown>,
  ) => readonly R[];

  /** Get a value from current state */
  get: <R = unknown>(path: string) => R | undefined;

  /** Check existence in current state */
  has: (path: string, predicate?: Predicate<unknown>) => boolean;

  /** Replace the entire state (for deserialization / time travel) */
  replaceState: (state: S) => void;

  /** Get the transaction history (for recording/replay) */
  getHistory: () => readonly TransactionRecord<S>[];
}>;

/** A recorded transaction for replay */
export type TransactionRecord<S> = Readonly<{
  timestamp: number;
  mutations: readonly Mutation<S>[];
  diff: Diff;
}>;

/** Create a game store with initial state */
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
