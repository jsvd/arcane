import type { Condition, Action, Rule, SystemDef, RuleResult, ExtendOptions } from "./types.ts";
import { createError } from "../state/error.ts";

/**
 * Create a system definition from a name and list of rules.
 *
 * A system is a named collection of rules that together define a game mechanic.
 * Use {@link rule} to build rules, then combine them into a system.
 *
 * @typeParam S - The game state type.
 * @param name - System name (e.g., "combat", "inventory").
 * @param rules - Ordered array of rules belonging to this system.
 * @returns An immutable {@link SystemDef}.
 *
 * @example
 * ```ts
 * const combat = system("combat", [
 *   rule<GameState>("attack")
 *     .when((s, args) => s.player.hp > 0)
 *     .then((s, args) => ({ ...s, enemy: { ...s.enemy, hp: s.enemy.hp - 10 } })),
 * ]);
 * ```
 */
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

/**
 * Fluent builder for creating named rules.
 *
 * Chain `.when()` to add conditions and `.then()` to add actions.
 * Use `.replaces()` to mark this rule as a replacement for an existing rule
 * when used with {@link extend}.
 *
 * @typeParam S - The game state type.
 * @param name - Unique rule name within the system.
 * @returns A fluent builder with `.when()`, `.then()`, and `.replaces()` methods.
 *
 * @example
 * ```ts
 * const attackRule = rule<GameState>("attack")
 *   .when((s) => s.player.hp > 0, (s) => s.enemy.hp > 0)
 *   .then((s, args) => ({ ...s, enemy: { ...s.enemy, hp: s.enemy.hp - 10 } }));
 * ```
 */
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

/**
 * Find a rule by name in a system, check its conditions, and execute its actions.
 *
 * If the rule is not found, returns `{ ok: false }` with an UNKNOWN_RULE error.
 * If any condition fails, returns `{ ok: false }` with a CONDITION_FAILED error.
 * Otherwise, chains all actions and returns `{ ok: true }` with the new state.
 *
 * @typeParam S - The game state type.
 * @param sys - The system to search for the rule.
 * @param ruleName - Name of the rule to apply.
 * @param state - Current game state.
 * @param args - Optional arguments passed to conditions and actions.
 * @returns A {@link RuleResult} with the outcome and resulting state.
 */
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

/**
 * Return names of rules whose conditions are all satisfied for the given state.
 * Useful for presenting valid actions to a player or AI agent.
 *
 * @typeParam S - The game state type.
 * @param sys - The system to query.
 * @param state - Current game state to test conditions against.
 * @param args - Optional arguments passed to condition functions.
 * @returns Array of rule names that can currently be applied.
 */
export function getApplicableRules<S>(
  sys: SystemDef<S>,
  state: S,
  args: Record<string, unknown> = {},
): string[] {
  return sys.rules
    .filter((r) => r.conditions.every((c) => c(state, args)))
    .map((r) => r.name);
}

/**
 * Create a new system by extending an existing one.
 *
 * Supports three operations:
 * 1. **Replace** — new rules with `replaces` set swap out existing rules by name.
 * 2. **Add** — new rules without `replaces` are appended to the end.
 * 3. **Remove** — rules named in `options.remove` are excluded.
 *
 * The base system is not modified; a new {@link SystemDef} is returned.
 *
 * @typeParam S - The game state type.
 * @param base - The system to extend.
 * @param options - Rules to add/replace and rule names to remove.
 * @returns A new system with the modifications applied.
 */
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
