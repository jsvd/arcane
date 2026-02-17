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

import type { PRNGState, DiceSpec } from "./prng.ts";
import { seed as seedPrng, randomInt, randomFloat, randomPick, shuffle as shufflePure, rollDice } from "./prng.ts";

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
export function createRng(seedOrState: number | PRNGState): Rng {
  let state: PRNGState = typeof seedOrState === "number"
    ? seedPrng(seedOrState)
    : seedOrState;

  return {
    int(min: number, max: number): number {
      const [v, next] = randomInt(state, min, max);
      state = next;
      return v;
    },
    float(): number {
      const [v, next] = randomFloat(state);
      state = next;
      return v;
    },
    pick<T>(items: readonly T[]): T {
      const [v, next] = randomPick(state, items);
      state = next;
      return v;
    },
    shuffle<T>(items: readonly T[]): readonly T[] {
      const [v, next] = shufflePure(state, items);
      state = next;
      return v;
    },
    roll(spec: DiceSpec | string): number {
      const [v, next] = rollDice(state, spec);
      state = next;
      return v;
    },
    snapshot(): PRNGState {
      return state;
    },
    restore(s: PRNGState): void {
      state = s;
    },
    fork(): Rng {
      // Advance parent state, use generated value as child seed
      const [childSeed, next] = randomInt(state, 0, 2147483647);
      state = next;
      return createRng(childSeed);
    },
  };
}
