/**
 * BFRPG character creation
 * @license CC BY-SA 4.0
 * @source Basic Fantasy Role-Playing Game, 4th Edition
 */

import type { PRNGState } from "../../../runtime/state/prng.ts";
import { rollDice } from "../../../runtime/state/prng.ts";
import type { AbilityScores, RaceName } from "./abilities.ts";
import {
  abilityModifier,
  applyRacialModifiers,
  rollAbilities,
} from "./abilities.ts";
import classesData from "../data/classes.json" with { type: "json" };

/** Character class names from BFRPG */
export type ClassName = "Fighter" | "Cleric" | "MagicUser" | "Thief";

/** Class data structure */
type ClassData = {
  hitDie: number;
  babPerLevel: number;
  primaryAbility: keyof AbilityScores;
  startingEquipment: string[];
  description: string;
};

const classes = classesData as Record<ClassName, ClassData>;

/** Complete character definition */
export type Character = Readonly<{
  name: string;
  race: RaceName;
  class: ClassName;
  level: number;
  abilities: AbilityScores;
  maxHp: number;
  currentHp: number;
  armorClass: number;
  baseAttackBonus: number;
  equipment: readonly string[];
}>;

/**
 * Calculate Armor Class based on equipped armor and Dex modifier
 * Base AC = 10 + armor bonuses + Dex modifier
 */
export function calculateAC(
  abilities: AbilityScores,
  equippedArmor: readonly string[],
): number {
  const dexMod = abilityModifier(abilities.dexterity);
  let armorBonus = 0;

  // In this simplified system, we'll hardcode armor AC bonuses
  // This can be enhanced later with equipment data lookups
  if (equippedArmor.includes("chainmail")) armorBonus += 4;
  if (equippedArmor.includes("leather")) armorBonus += 2;
  if (equippedArmor.includes("shield")) armorBonus += 1;

  return 10 + armorBonus + dexMod;
}

/**
 * Calculate Base Attack Bonus for a class at a given level
 * BAB = floor(level * babPerLevel)
 */
export function calculateBAB(characterClass: ClassName, level: number): number {
  const classData = classes[characterClass];
  if (!classData) {
    throw new Error(`Unknown class: ${characterClass}`);
  }

  return Math.floor(level * classData.babPerLevel);
}

/**
 * Roll hit points for a given hit die and Constitution modifier
 * Minimum 1 HP per level
 */
function rollHitPoints(
  rng: PRNGState,
  hitDie: number,
  conMod: number,
): [number, PRNGState] {
  const [roll, next] = rollDice(rng, `1d${hitDie}`);
  const hp = Math.max(1, roll + conMod);
  return [hp, next];
}

/** Character creation options */
export type CharacterOptions = Readonly<{
  name: string;
  race: RaceName;
  class: ClassName;
  /** Optional: provide pre-rolled abilities. If omitted, will roll 3d6 for each */
  abilities?: AbilityScores;
  /** Starting level (default: 1) */
  level?: number;
}>;

/**
 * Create a new character
 * Returns [character, newRng]
 */
export function createCharacter(
  rng: PRNGState,
  options: CharacterOptions,
): [Character, PRNGState] {
  const { name, race, class: characterClass, level = 1 } = options;

  const classData = classes[characterClass];
  if (!classData) {
    throw new Error(`Unknown class: ${characterClass}`);
  }

  // Roll or use provided abilities
  let current = rng;
  let baseAbilities: AbilityScores;
  if (options.abilities) {
    baseAbilities = options.abilities;
  } else {
    const [rolled, next] = rollAbilities(current);
    baseAbilities = rolled;
    current = next;
  }

  // Apply racial modifiers
  const abilities = applyRacialModifiers(baseAbilities, race);

  // Roll HP
  const conMod = abilityModifier(abilities.constitution);
  const [maxHp, nextRng] = rollHitPoints(current, classData.hitDie, conMod);
  current = nextRng;

  // Calculate derived stats
  const baseAttackBonus = calculateBAB(characterClass, level);
  const equipment = [...classData.startingEquipment];
  const armorClass = calculateAC(abilities, equipment);

  return [
    {
      name,
      race,
      class: characterClass,
      level,
      abilities,
      maxHp,
      currentHp: maxHp,
      armorClass,
      baseAttackBonus,
      equipment,
    },
    current,
  ];
}
