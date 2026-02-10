import type { ArcaneError } from "../state/error.ts";

/**
 * A predicate that checks whether a rule's preconditions are met.
 * Must be a pure function.
 *
 * @param state - Current game state (read-only by convention).
 * @param args - Additional arguments passed to {@link applyRule}.
 * @returns True if the condition is satisfied.
 */
export type Condition<S> = (state: S, args: Record<string, unknown>) => boolean;

/**
 * A pure transform that produces new state when a rule fires.
 * Multiple actions on a rule are chained: each receives the output of the previous.
 *
 * @param state - Current game state.
 * @param args - Additional arguments passed to {@link applyRule}.
 * @returns New state (must not mutate the input).
 */
export type Action<S> = (state: S, args: Record<string, unknown>) => S;

/**
 * A named rule consisting of conditions and actions.
 *
 * When applied via {@link applyRule}, all conditions must pass for the
 * actions to execute. Actions are chained in order.
 *
 * @typeParam S - The game state type.
 */
export type Rule<S> = Readonly<{
  /** Unique name within the system. Used for lookup by {@link applyRule} and {@link extend}. */
  name: string;
  /** Conditions that must all return true for the rule to fire. Empty = always fires. */
  conditions: readonly Condition<S>[];
  /** State transforms to apply in order when the rule fires. */
  actions: readonly Action<S>[];
  /** If set, this rule replaces the rule with the given name when used in {@link extend}. */
  replaces?: string;
}>;

/**
 * A named system: an ordered collection of rules that together define game mechanics.
 * Created via {@link system} and extended via {@link extend}.
 *
 * @typeParam S - The game state type.
 */
export type SystemDef<S> = Readonly<{
  /** System name (e.g., "combat", "inventory"). */
  name: string;
  /** Ordered list of rules in this system. */
  rules: readonly Rule<S>[];
}>;

/**
 * Result of applying a single rule via {@link applyRule}.
 *
 * @typeParam S - The game state type.
 */
export type RuleResult<S> = Readonly<{
  /** True if all conditions passed and actions executed successfully. */
  ok: boolean;
  /** The resulting state (unchanged if ok is false). */
  state: S;
  /** Name of the rule that was applied. */
  ruleName: string;
  /** Error details if ok is false (rule not found or conditions failed). */
  error?: ArcaneError;
}>;

/**
 * Options for extending a system via {@link extend}.
 *
 * @typeParam S - The game state type.
 */
export type ExtendOptions<S> = {
  /** New rules to add. Rules with `replaces` set will replace existing rules by name. */
  rules?: readonly Rule<S>[];
  /** Names of existing rules to remove from the system. */
  remove?: readonly string[];
};
