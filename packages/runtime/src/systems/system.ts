import type { Condition, Action, Rule, SystemDef, RuleResult, ExtendOptions } from "./types.ts";
import { createError } from "../state/error.ts";

/** Create a system definition from a name and list of rules. */
export function system<S>(name: string, rules: readonly Rule<S>[]): SystemDef<S> {
  return { name, rules };
}

// --- Fluent rule builder ---

type RuleBuilderWithConditions<S> = {
  then(...actions: Action<S>[]): Rule<S>;
};

type RuleBuilderBase<S> = {
  when(...conditions: Condition<S>[]): RuleBuilderWithConditions<S>;
  then(...actions: Action<S>[]): Rule<S>;
  replaces(targetName: string): {
    when(...conditions: Condition<S>[]): RuleBuilderWithConditions<S>;
    then(...actions: Action<S>[]): Rule<S>;
  };
};

/** Fluent builder for creating rules. */
export function rule<S>(name: string): RuleBuilderBase<S> {
  let replacesName: string | undefined;

  const makeRule = (conditions: readonly Condition<S>[], actions: readonly Action<S>[]): Rule<S> => ({
    name,
    conditions,
    actions,
    ...(replacesName !== undefined ? { replaces: replacesName } : {}),
  });

  const withConditions = (conditions: readonly Condition<S>[]): RuleBuilderWithConditions<S> => ({
    then(...actions: Action<S>[]) {
      return makeRule(conditions, actions);
    },
  });

  return {
    when(...conditions: Condition<S>[]) {
      return withConditions(conditions);
    },
    then(...actions: Action<S>[]) {
      return makeRule([], actions);
    },
    replaces(targetName: string) {
      replacesName = targetName;
      return {
        when(...conditions: Condition<S>[]) {
          return withConditions(conditions);
        },
        then(...actions: Action<S>[]) {
          return makeRule([], actions);
        },
      };
    },
  };
}

/** Find a rule by name, apply conditions, chain actions. */
export function applyRule<S>(
  sys: SystemDef<S>,
  ruleName: string,
  state: S,
  args: Record<string, unknown> = {},
): RuleResult<S> {
  const r = sys.rules.find((r) => r.name === ruleName);
  if (!r) {
    return {
      ok: false,
      state,
      ruleName,
      error: createError("UNKNOWN_RULE", `Rule "${ruleName}" not found in system "${sys.name}"`, {
        action: "applyRule",
        reason: `No rule named "${ruleName}"`,
        suggestion: `Available rules: ${sys.rules.map((r) => r.name).join(", ")}`,
      }),
    };
  }

  for (const condition of r.conditions) {
    if (!condition(state, args)) {
      return {
        ok: false,
        state,
        ruleName,
        error: createError("CONDITION_FAILED", `Conditions not met for rule "${ruleName}"`, {
          action: "applyRule",
          reason: "One or more conditions returned false",
        }),
      };
    }
  }

  let current = state;
  for (const action of r.actions) {
    current = action(current, args);
  }

  return { ok: true, state: current, ruleName };
}

/** Return names of rules whose conditions are all met. */
export function getApplicableRules<S>(
  sys: SystemDef<S>,
  state: S,
  args: Record<string, unknown> = {},
): string[] {
  return sys.rules
    .filter((r) => r.conditions.every((c) => c(state, args)))
    .map((r) => r.name);
}

/** Extend a system: replace rules by name, add new rules, remove rules by name. */
export function extend<S>(base: SystemDef<S>, options: ExtendOptions<S>): SystemDef<S> {
  const removeSet = new Set(options.remove ?? []);
  const newRules = options.rules ?? [];

  // Build replacement map from new rules that have `replaces`
  const replaceMap = new Map<string, Rule<S>>();
  const additions: Rule<S>[] = [];
  for (const r of newRules) {
    if (r.replaces) {
      replaceMap.set(r.replaces, r);
    } else {
      additions.push(r);
    }
  }

  // Process base rules: replace or keep (unless removed)
  const result: Rule<S>[] = [];
  for (const r of base.rules) {
    if (removeSet.has(r.name)) continue;
    const replacement = replaceMap.get(r.name);
    if (replacement) {
      result.push(replacement);
    } else {
      result.push(r);
    }
  }

  // Append non-replacement additions
  for (const r of additions) {
    result.push(r);
  }

  return { name: base.name, rules: result };
}
