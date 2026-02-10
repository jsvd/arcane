import type { ArcaneError } from "../state/error.ts";

/** A condition that must be true for a rule to fire. */
export type Condition<S> = (state: S, args: Record<string, unknown>) => boolean;

/** An action that transforms state when a rule fires. */
export type Action<S> = (state: S, args: Record<string, unknown>) => S;

/** A named rule with conditions and actions. */
export type Rule<S> = Readonly<{
  name: string;
  conditions: readonly Condition<S>[];
  actions: readonly Action<S>[];
  replaces?: string;
}>;

/** A named system: a collection of rules. */
export type SystemDef<S> = Readonly<{
  name: string;
  rules: readonly Rule<S>[];
}>;

/** Result of applying a single rule. */
export type RuleResult<S> = Readonly<{
  ok: boolean;
  state: S;
  ruleName: string;
  error?: ArcaneError;
}>;

/** Options for extending a system. */
export type ExtendOptions<S> = {
  rules?: readonly Rule<S>[];
  remove?: readonly string[];
};
