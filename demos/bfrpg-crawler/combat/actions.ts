/**
 * BFRPG combat action helpers
 * @license CC BY-SA 4.0
 * @source Basic Fantasy Role-Playing Game, 4th Edition
 */

import type { DiceSpec } from "../../../runtime/state/index.ts";
import { parseDice } from "../../../runtime/state/index.ts";
import type { Rng } from "../../../runtime/state/index.ts";

/**
 * Parse damage dice notation (e.g., "1d8", "2d6+3")
 * Returns DiceSpec for rolling
 */
export function parseDamageDice(notation: string): DiceSpec {
  return parseDice(notation);
}

/**
 * Roll damage dice
 */
export function rollDamage(
  rng: Rng,
  spec: DiceSpec | string,
): number {
  return rng.roll(spec);
}

/**
 * Roll to-hit (1d20)
 */
export function toHitRoll(rng: Rng): number {
  return rng.roll("1d20");
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
