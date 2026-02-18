// Arcane Engine — State Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/state

declare module "@arcane/runtime/state" {
  /**
   * Branded string type for entity identification.
   * Uses TypeScript's structural branding to prevent plain strings from being
   * used where an EntityId is expected. Create via {@link entityId} or {@link generateId}.
   */
  export type EntityId = string & {
      readonly __entityId: true;
  };
  /**
   * Create an EntityId from a known string value.
   * Use this for deterministic IDs (e.g., "player", "enemy_1").
   * For random unique IDs, use {@link generateId} instead.
   *
   * @param id - The string to brand as an EntityId.
   * @returns A branded EntityId.
   */
  export declare function entityId(id: string): EntityId;
  /**
   * Generate a unique EntityId using crypto.randomUUID().
   * Each call produces a new UUID v4 string branded as EntityId.
   * Use {@link entityId} instead when you need a deterministic, human-readable ID.
   *
   * @returns A new unique EntityId.
   */
  export declare function generateId(): EntityId;
  /**
   * Immutable 2D vector. Used for positions, velocities, and directions.
   *
   * - `x` - Horizontal component (positive = right).
   * - `y` - Vertical component (positive = down in screen coordinates).
   */
  export type Vec2 = Readonly<{
      x: number;
      y: number;
  }>;
  type Primitive = string | number | boolean | null | undefined;
  /**
   * Deep recursive readonly utility type. Enforces immutability at the type level
   * by recursively wrapping all properties, arrays, Maps, and Sets as readonly.
   * Applied to state returned by {@link GameStore.getState} to prevent accidental mutation.
   */
  export type DeepReadonly<T> = T extends Primitive ? T : T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> : T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> : T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> : T extends object ? {
      readonly [K in keyof T]: DeepReadonly<T[K]>;
  } : T;
  export {};

  /**
   * Structured error type for the Arcane engine.
   * Provides machine-readable codes, human-readable messages, and actionable context.
   * Follows the error design in docs/api-design.md.
   *
   * - `code` - Machine-readable error code (e.g., "TRANSACTION_FAILED", "INVALID_PATH").
   * - `message` - Human-readable error description.
   * - `context.action` - What operation was being attempted.
   * - `context.reason` - Why the operation failed.
   * - `context.state` - Optional snapshot of relevant state at failure time.
   * - `context.suggestion` - Optional suggestion for how to fix the error.
   */
  export type ArcaneError = Readonly<{
      code: string;
      message: string;
      context: Readonly<{
          action: string;
          reason: string;
          state?: Readonly<Record<string, unknown>>;
          suggestion?: string;
      }>;
  }>;
  /**
   * Create an ArcaneError with structured context.
   * Pure function — returns a new frozen error object.
   *
   * @param code - Machine-readable error code (e.g., "TRANSACTION_FAILED").
   * @param message - Human-readable error description.
   * @param context - Structured context with action, reason, and optional suggestion.
   * @returns A new ArcaneError object.
   */
  export declare function createError(code: string, message: string, context: ArcaneError["context"]): ArcaneError;

  /**
   * Callback invoked when an observed path changes.
   * Receives the new value, old value, and context about the change.
   *
   * @param newValue - The value after the change.
   * @param oldValue - The value before the change.
   * @param context - Metadata about the change (path, full diff).
   */
  export type ObserverCallback<T = unknown> = (newValue: T, oldValue: T, context: ObserverContext) => void;
  /**
   * Context provided to observer callbacks when a change is detected.
   *
   * - `path` - The specific path that changed (e.g., "player.hp").
   * - `diff` - The full Diff from the transaction that triggered this notification.
   */
  export type ObserverContext = Readonly<{
      path: string;
      diff: Diff;
  }>;
  /**
   * Function returned by observe() to unsubscribe from further notifications.
   * Call it to stop receiving callbacks for that subscription.
   */
  export type Unsubscribe = () => void;
  /**
   * Pattern for matching state paths. Supports `*` wildcards at any segment position.
   * Examples: "player.hp", "enemies.*.hp", "*.position".
   * Each `*` matches exactly one path segment.
   */
  export type PathPattern = string;
  /**
   * Observer registry that manages subscriptions and dispatches change notifications.
   * Created via {@link createObserverRegistry}. Used internally by GameStore.
   *
   * - `observe` - Subscribe to changes matching a path pattern. Returns an Unsubscribe function.
   * - `notify` - Dispatch notifications to all matching observers for a given diff.
   * - `clear` - Remove all observers (useful for cleanup/reset).
   */
  export type ObserverRegistry<S> = Readonly<{
      /** Subscribe to changes at a path pattern. Returns an unsubscribe function. */
      observe: <T = unknown>(pattern: PathPattern, callback: ObserverCallback<T>) => Unsubscribe;
      /** Notify all matching observers after a transaction commits. */
      notify: (oldState: S, newState: S, diff: Diff) => void;
      /** Remove all observers. */
      clear: () => void;
  }>;
  /**
   * Create a new observer registry for tracking state change subscriptions.
   * Used internally by {@link createStore} to power the store's observe() method.
   *
   * @returns A new ObserverRegistry with observe, notify, and clear methods.
   */
  export declare function createObserverRegistry<S>(): ObserverRegistry<S>;

  /**
   * Opaque PRNG state using the xoshiro128** algorithm.
   * Serializable and deterministic — the same seed always produces the same sequence.
   * All PRNG functions are pure: they take a PRNGState and return a new PRNGState.
   * Create via {@link seed}.
   *
   * - `__brand` - Type brand, always "PRNGState".
   * - `seed` - The original seed value used to initialize this state.
   * - `s0`, `s1`, `s2`, `s3` - Internal 32-bit state words. Do not modify directly.
   */
  export type PRNGState = Readonly<{
      readonly __brand: "PRNGState";
      seed: number;
      s0: number;
      s1: number;
      s2: number;
      s3: number;
  }>;
  /**
   * Create a seeded PRNG state. The same seed always produces the same random sequence.
   * Uses splitmix32 to initialize the xoshiro128** internal state.
   *
   * @param n - The seed value. Truncated to a 32-bit integer.
   * @returns A new PRNGState ready for use with {@link rollDice}, {@link randomInt}, etc.
   *
   * @example
   * const rng = seed(42);
   * const [value, rng2] = randomInt(rng, 1, 6);
   * // value is deterministic for seed 42
   */
  export declare function seed(n: number): PRNGState;
  /**
   * Branded string type for dice notation (e.g., "2d6+3", "1d20", "3d8-1").
   * Format: `NdS` or `NdS+M` / `NdS-M` where N=count, S=sides, M=modifier.
   */
  export type DiceNotation = string & {
      readonly __dice: true;
  };
  /**
   * Parsed dice specification. Created by {@link parseDice} or passed directly to {@link rollDice}.
   *
   * - `count` - Number of dice to roll (the N in NdS). Must be >= 1.
   * - `sides` - Number of sides per die (the S in NdS). Must be >= 1.
   * - `modifier` - Added to the total after all dice are summed. Can be negative.
   */
  export type DiceSpec = Readonly<{
      count: number;
      sides: number;
      modifier: number;
  }>;
  /**
   * Parse a dice notation string into a DiceSpec.
   * Pure function. Throws if the notation is invalid.
   *
   * @param notation - Dice notation string (e.g., "2d6+3", "1d20", "3d8-1").
   * @returns Parsed DiceSpec with count, sides, and modifier.
   * @throws Error if notation doesn't match the `NdS` or `NdS+M` / `NdS-M` format.
   */
  export declare function parseDice(notation: string): DiceSpec;
  /**
   * Roll dice deterministically using the PRNG. Pure function — returns the result
   * and a new PRNGState without modifying the original.
   *
   * Accepts either a DiceSpec object or a dice notation string (e.g., "2d6+3").
   * Each die is rolled individually using {@link randomInt}, then summed with the modifier.
   *
   * @param rng - Current PRNG state.
   * @param spec - A DiceSpec or dice notation string (e.g., "1d20", "2d6+3").
   * @returns A tuple of [total roll result, new PRNGState].
   *
   * @example
   * const rng = seed(42);
   * const [damage, rng2] = rollDice(rng, "2d6+3");
   * const [toHit, rng3] = rollDice(rng2, "1d20");
   */
  export declare function rollDice(rng: PRNGState, spec: DiceSpec | string): [number, PRNGState];
  /**
   * Generate a random integer in the range [min, max] (inclusive on both ends).
   * Pure function — returns the value and a new PRNGState.
   *
   * @param rng - Current PRNG state.
   * @param min - Minimum value (inclusive).
   * @param max - Maximum value (inclusive). Must be >= min.
   * @returns A tuple of [random integer, new PRNGState].
   */
  export declare function randomInt(rng: PRNGState, min: number, max: number): [number, PRNGState];
  /**
   * Generate a random float in the range [0, 1) (inclusive of 0, exclusive of 1).
   * Pure function — returns the value and a new PRNGState.
   *
   * @param rng - Current PRNG state.
   * @returns A tuple of [random float in [0,1), new PRNGState].
   */
  export declare function randomFloat(rng: PRNGState): [number, PRNGState];
  /**
   * Pick one random element from an array. Pure function — does not modify the array.
   *
   * @param rng - Current PRNG state.
   * @param items - Non-empty array to pick from.
   * @returns A tuple of [randomly selected item, new PRNGState].
   */
  export declare function randomPick<T>(rng: PRNGState, items: readonly T[]): [T, PRNGState];
  /**
   * Shuffle an array using Fisher-Yates algorithm. Pure function — returns a new
   * shuffled array without modifying the original.
   *
   * @param rng - Current PRNG state.
   * @param items - Array to shuffle.
   * @returns A tuple of [new shuffled array, new PRNGState].
   */
  export declare function shuffle<T>(rng: PRNGState, items: readonly T[]): [readonly T[], PRNGState];

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
  export declare function query<S, R = unknown>(state: S, path: string, filter?: Predicate<R> | Record<string, unknown>): readonly R[];
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
  export declare function get<S, R = unknown>(state: S, path: string): R | undefined;
  /**
   * Check if a value exists at a path, optionally testing it with a predicate.
   * Pure function. Returns false if the path doesn't exist or if the predicate fails.
   *
   * @param state - The state to check.
   * @param path - Dot-separated path (e.g., "player.weapon").
   * @param predicate - Optional predicate to test the value against.
   * @returns True if the value exists (and passes the predicate, if provided).
   */
  export declare function has<S>(state: S, path: string, predicate?: Predicate<unknown>): boolean;
  /**
   * Create a predicate that tests if a number is less than the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item < value.
   */
  export declare function lt(value: number): Predicate<number>;
  /**
   * Create a predicate that tests if a number is greater than the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item > value.
   */
  export declare function gt(value: number): Predicate<number>;
  /**
   * Create a predicate that tests if a number is less than or equal to the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item <= value.
   */
  export declare function lte(value: number): Predicate<number>;
  /**
   * Create a predicate that tests if a number is greater than or equal to the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item >= value.
   */
  export declare function gte(value: number): Predicate<number>;
  /**
   * Create a predicate that tests for strict equality (===) with the given value.
   *
   * @param value - The value to compare against.
   * @returns A predicate returning true if item === value.
   */
  export declare function eq<T>(value: T): Predicate<T>;
  /**
   * Create a predicate that tests for strict inequality (!==) with the given value.
   *
   * @param value - The value to compare against.
   * @returns A predicate returning true if item !== value.
   */
  export declare function neq<T>(value: T): Predicate<T>;
  /**
   * Create a predicate that tests if a value is one of the given options (using Array.includes).
   *
   * @param values - The allowed values to match against.
   * @returns A predicate returning true if item is in the values list.
   */
  export declare function oneOf<T>(...values: T[]): Predicate<T>;
  /**
   * Create a predicate that tests if a Vec2 position is within a circular radius
   * of a center point. Uses squared distance for efficiency (no sqrt).
   *
   * @param center - Center point of the circle.
   * @param radius - Radius of the circle. Must be >= 0.
   * @returns A predicate returning true if the position is within the circle (inclusive).
   */
  export declare function within(center: Vec2, radius: number): Predicate<Vec2>;
  /**
   * Combine multiple predicates with logical AND. All predicates must pass.
   *
   * @param predicates - Predicates to combine.
   * @returns A predicate returning true only if every predicate passes.
   */
  export declare function allOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  /**
   * Combine multiple predicates with logical OR. At least one predicate must pass.
   *
   * @param predicates - Predicates to combine.
   * @returns A predicate returning true if any predicate passes.
   */
  export declare function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  /**
   * Negate a predicate. Returns the logical NOT of the original predicate.
   *
   * @param predicate - The predicate to negate.
   * @returns A predicate returning true when the original returns false, and vice versa.
   */
  export declare function not<T>(predicate: Predicate<T>): Predicate<T>;

  /**
   * Mutable PRNG wrapper for ergonomic random number generation.
   *
   * Wraps the pure PRNG functions from prng.ts with a closure that
   * holds and auto-advances the internal PRNGState. Same deterministic
   * sequences — less boilerplate.
   *
   * @example
   * ```ts
   * import { createRng } from "@arcane/runtime/state";
   *
   * const rng = createRng(42);
   * const damage = rng.roll("2d6+3");
   * const enemy = rng.pick(["goblin", "orc", "troll"]);
   * const shuffled = rng.shuffle([1, 2, 3, 4, 5]);
   * ```
   */
  /** Mutable PRNG handle. Same deterministic output as the pure functions, less boilerplate. */
  export interface Rng {
      /** Random integer in [min, max] inclusive. */
      int(min: number, max: number): number;
      /** Random float in [0, 1). */
      float(): number;
      /** Pick one random element from a non-empty array. */
      pick<T>(items: readonly T[]): T;
      /** Return a new shuffled copy of the array (Fisher-Yates). */
      shuffle<T>(items: readonly T[]): readonly T[];
      /** Roll dice from a DiceSpec or notation string (e.g., "2d6+3"). */
      roll(spec: DiceSpec | string): number;
      /** Snapshot the current internal state (for save/restore). */
      snapshot(): PRNGState;
      /** Restore from a previously captured snapshot. */
      restore(state: PRNGState): void;
      /** Fork: create an independent child Rng seeded from this one's current state. */
      fork(): Rng;
  }
  /**
   * Create a mutable PRNG wrapper.
   *
   * @param seedOrState - A numeric seed or an existing PRNGState to resume from.
   * @returns A mutable Rng handle.
   */
  export declare function createRng(seedOrState: number | PRNGState): Rng;

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
      observe: <T = unknown>(pattern: PathPattern, callback: ObserverCallback<T>) => Unsubscribe;
      /** Query arrays or values at a path, with optional filtering. */
      query: <R = unknown>(path: string, filter?: Predicate<R> | Record<string, unknown>) => readonly R[];
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
  export declare function createStore<S>(initialState: S): GameStore<S>;

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
  export declare function set<S>(path: string, value: unknown): Mutation<S>;
  /**
   * Create a mutation that updates a value at a path using a transform function.
   * The function receives the current value and returns the new value.
   * Pure function — returns a Mutation object, does not modify state directly.
   *
   * @param path - Dot-separated path to the value (e.g., "player.hp").
   * @param fn - Transform function: receives the current value, returns the new value.
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function update<S>(path: string, fn: (current: unknown) => unknown): Mutation<S>;
  /**
   * Create a mutation that pushes an item onto an array at a path.
   * Throws during application if the value at the path is not an array.
   *
   * @param path - Dot-separated path to the array (e.g., "enemies", "player.inventory").
   * @param item - The item to append to the array.
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function push<S>(path: string, item: unknown): Mutation<S>;
  /**
   * Create a mutation that removes items from an array at a path where the predicate returns true.
   * Throws during application if the value at the path is not an array.
   *
   * @param path - Dot-separated path to the array.
   * @param predicate - Function that returns true for items to remove.
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function removeWhere<S>(path: string, predicate: (item: unknown) => boolean): Mutation<S>;
  /**
   * Create a mutation that removes a key from an object.
   * The last segment of the path is the key to remove; the preceding segments
   * identify the parent object. Throws during application if the parent is not an object.
   *
   * @param path - Dot-separated path where the last segment is the key to remove
   *               (e.g., "player.buffs.shield" removes "shield" from player.buffs).
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function removeKey<S>(path: string): Mutation<S>;
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
  export declare function transaction<S>(state: S, mutations: readonly Mutation<S>[]): TransactionResult<S>;
  /**
   * Compute the diff between two state trees by recursively comparing all values.
   * Pure function — does not modify either state tree.
   * Used internally by {@link transaction}, but can also be called directly.
   *
   * @param before - The state before changes.
   * @param after - The state after changes.
   * @returns A Diff containing all individual value changes.
   */
  export declare function computeDiff<S>(before: S, after: S): Diff;

}
