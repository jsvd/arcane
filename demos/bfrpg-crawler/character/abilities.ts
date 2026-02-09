/**
 * BFRPG ability score modifiers and racial adjustments
 * @license CC BY-SA 4.0
 * @source Basic Fantasy Role-Playing Game, 4th Edition
 */

import type { PRNGState } from "../../../runtime/state/prng.ts";
import { rollDice } from "../../../runtime/state/prng.ts";
import racesData from "../data/races.json" with { type: "json" };

/** Six core abilities */
export type AbilityScores = Readonly<{
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}>;

/** Race names from BFRPG */
export type RaceName = "Human" | "Dwarf" | "Elf" | "Halfling";

/** Race data structure */
type RaceData = {
  abilityBonuses: Partial<Record<keyof AbilityScores, number>>;
  description: string;
};

const races = racesData as Record<RaceName, RaceData>;

/**
 * Calculate ability modifier per BFRPG rules
 * 3-4: -3, 5-6: -2, 7-8: -1, 9-12: 0, 13-14: +1, 15-16: +2, 17-18: +3
 */
export function abilityModifier(score: number): number {
  if (score <= 4) return -3;
  if (score <= 6) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 14) return 1;
  if (score <= 16) return 2;
  return 3;
}

/**
 * Roll 3d6 for a single ability score
 * Returns [score, newRng]
 */
export function rollAbility(rng: PRNGState): [number, PRNGState] {
  return rollDice(rng, "3d6");
}

/**
 * Roll all six ability scores using 3d6 method
 * Returns [scores, newRng]
 */
export function rollAbilities(rng: PRNGState): [AbilityScores, PRNGState] {
  let current = rng;
  const [strength, rng1] = rollAbility(current);
  current = rng1;
  const [dexterity, rng2] = rollAbility(current);
  current = rng2;
  const [constitution, rng3] = rollAbility(current);
  current = rng3;
  const [intelligence, rng4] = rollAbility(current);
  current = rng4;
  const [wisdom, rng5] = rollAbility(current);
  current = rng5;
  const [charisma, rng6] = rollAbility(current);
  current = rng6;

  return [
    {
      strength,
      dexterity,
      constitution,
      intelligence,
      wisdom,
      charisma,
    },
    current,
  ];
}

/**
 * Apply racial ability score modifiers
 * Returns new ability scores with racial bonuses applied
 */
export function applyRacialModifiers(
  scores: AbilityScores,
  race: RaceName,
): AbilityScores {
  const raceData = races[race];
  if (!raceData) {
    throw new Error(`Unknown race: ${race}`);
  }

  const bonuses = raceData.abilityBonuses;
  return {
    strength: scores.strength + (bonuses.strength ?? 0),
    dexterity: scores.dexterity + (bonuses.dexterity ?? 0),
    constitution: scores.constitution + (bonuses.constitution ?? 0),
    intelligence: scores.intelligence + (bonuses.intelligence ?? 0),
    wisdom: scores.wisdom + (bonuses.wisdom ?? 0),
    charisma: scores.charisma + (bonuses.charisma ?? 0),
  };
}
