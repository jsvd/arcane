/**
 * BFRPG combat action helpers
 * @license CC BY-SA 4.0
 * @source Basic Fantasy Role-Playing Game, 4th Edition
 */

import type { PRNGState, DiceSpec } from "../../../runtime/state/index.ts";
import { rollDice, parseDice } from "../../../runtime/state/index.ts";

/**
 * Parse damage dice notation (e.g., "1d8", "2d6+3")
 * Returns DiceSpec for rolling
 */
export function parseDamageDice(notation: string): DiceSpec {
  return parseDice(notation);
}

/**
 * Roll damage dice
 * Returns [damage, newRng]
 */
export function rollDamage(
  rng: PRNGState,
  spec: DiceSpec | string,
): [number, PRNGState] {
  return rollDice(rng, spec);
}

/**
 * Roll to-hit (1d20)
 * Returns [roll, newRng]
 */
export function toHitRoll(rng: PRNGState): [number, PRNGState] {
  return rollDice(rng, "1d20");
}

/**
 * Check if to-hit roll succeeds against target AC
 * BFRPG: d20 + BAB + ability modifier >= target AC
 */
export function checkHit(
  toHitRoll: number,
  attackerBAB: number,
  attackerModifier: number,
  targetAC: number,
): boolean {
  const totalAttack = toHitRoll + attackerBAB + attackerModifier;
  return totalAttack >= targetAC;
}
