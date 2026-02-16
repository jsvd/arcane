// Arcane Engine — Systems Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/systems

declare module "@arcane/runtime/systems" {
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
  export declare function system<S>(name: string, rules: readonly Rule<S>[]): SystemDef<S>;
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
  export declare function rule<S>(name: string): RuleBuilderBase<S>;
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
  export declare function applyRule<S>(sys: SystemDef<S>, ruleName: string, state: S, args?: Record<string, unknown>): RuleResult<S>;
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
  export declare function getApplicableRules<S>(sys: SystemDef<S>, state: S, args?: Record<string, unknown>): string[];
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
  export declare function extend<S>(base: SystemDef<S>, options: ExtendOptions<S>): SystemDef<S>;
  export {};

}
