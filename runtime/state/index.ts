// Foundational types
export type { EntityId, Vec2, DeepReadonly } from "./types.ts";
export { entityId, generateId } from "./types.ts";

// Error types
export type { ArcaneError } from "./error.ts";
export { createError } from "./error.ts";

// PRNG
export type { PRNGState, DiceNotation, DiceSpec } from "./prng.ts";
export {
  seed,
  parseDice,
  rollDice,
  randomInt,
  randomFloat,
  randomPick,
  shuffle,
} from "./prng.ts";

// Transactions
export type {
  Mutation,
  DiffEntry,
  Diff,
  Effect,
  TransactionResult,
} from "./transaction.ts";
export {
  set,
  update,
  push,
  removeWhere,
  removeKey,
  transaction,
  computeDiff,
} from "./transaction.ts";

// Queries
export type { Predicate } from "./query.ts";
export {
  query,
  get,
  has,
  lt,
  gt,
  lte,
  gte,
  eq,
  neq,
  oneOf,
  within,
  allOf,
  anyOf,
  not,
} from "./query.ts";

// Observers
export type {
  ObserverCallback,
  ObserverContext,
  Unsubscribe,
  PathPattern,
  ObserverRegistry,
} from "./observe.ts";
export { createObserverRegistry } from "./observe.ts";

// Store
export type { GameStore, TransactionRecord } from "./store.ts";
export { createStore } from "./store.ts";
