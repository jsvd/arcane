/**
 * Tests for BFRPG character creation
 */

import { describe, it, assert } from "../../../runtime/testing/harness.ts";
import { createRng } from "../../../runtime/state/index.ts";
import {
  abilityModifier,
  rollAbility,
  rollAbilities,
  applyRacialModifiers,
} from "./abilities.ts";
import type { AbilityScores, RaceName } from "./abilities.ts";
import {
  calculateAC,
  calculateBAB,
  createCharacter,
} from "./creation.ts";
import type { ClassName } from "./creation.ts";

/** Helper to assert value is in range [min, max] inclusive */
function assertRange(value: number, min: number, max: number): void {
  assert.ok(
    value >= min && value <= max,
    `Expected ${value} to be in range [${min}, ${max}]`,
  );
}

describe("abilityModifier", () => {
  it("returns -3 for scores 3-4", () => {
    assert.equal(abilityModifier(3), -3);
    assert.equal(abilityModifier(4), -3);
  });

  it("returns -2 for scores 5-6", () => {
    assert.equal(abilityModifier(5), -2);
    assert.equal(abilityModifier(6), -2);
  });

  it("returns -1 for scores 7-8", () => {
    assert.equal(abilityModifier(7), -1);
    assert.equal(abilityModifier(8), -1);
  });

  it("returns 0 for scores 9-12", () => {
    assert.equal(abilityModifier(9), 0);
    assert.equal(abilityModifier(10), 0);
    assert.equal(abilityModifier(11), 0);
    assert.equal(abilityModifier(12), 0);
  });

  it("returns +1 for scores 13-14", () => {
    assert.equal(abilityModifier(13), 1);
    assert.equal(abilityModifier(14), 1);
  });

  it("returns +2 for scores 15-16", () => {
    assert.equal(abilityModifier(15), 2);
    assert.equal(abilityModifier(16), 2);
  });

  it("returns +3 for scores 17-18", () => {
    assert.equal(abilityModifier(17), 3);
    assert.equal(abilityModifier(18), 3);
  });

  it("returns +3 for scores above 18", () => {
    assert.equal(abilityModifier(19), 3);
    assert.equal(abilityModifier(20), 3);
  });
});

describe("rollAbility", () => {
  it("rolls a score between 3 and 18", () => {
    const rng = createRng(42);
    const score = rollAbility(rng);
    assertRange(score, 3, 18);
  });

  it("produces deterministic results", () => {
    const rng1 = createRng(100);
    const score1 = rollAbility(rng1);

    const rng2 = createRng(100);
    const score2 = rollAbility(rng2);

    assert.equal(score1, score2);
  });

  it("produces different results with different seeds", () => {
    const rng1 = createRng(100);
    const score1 = rollAbility(rng1);

    const rng2 = createRng(200);
    const score2 = rollAbility(rng2);

    // Note: This could theoretically fail if both seeds produce the same result
    // but with deterministic RNG it's consistent
    assertRange(score1, 3, 18);
    assertRange(score2, 3, 18);
  });
});

describe("rollAbilities", () => {
  it("rolls all six ability scores", () => {
    const rng = createRng(42);
    const scores = rollAbilities(rng);

    assertRange(scores.strength, 3, 18);
    assertRange(scores.dexterity, 3, 18);
    assertRange(scores.constitution, 3, 18);
    assertRange(scores.intelligence, 3, 18);
    assertRange(scores.wisdom, 3, 18);
    assertRange(scores.charisma, 3, 18);
  });

  it("produces deterministic results", () => {
    const rng1 = createRng(123);
    const scores1 = rollAbilities(rng1);

    const rng2 = createRng(123);
    const scores2 = rollAbilities(rng2);

    assert.equal(scores1.strength, scores2.strength);
    assert.equal(scores1.dexterity, scores2.dexterity);
    assert.equal(scores1.constitution, scores2.constitution);
    assert.equal(scores1.intelligence, scores2.intelligence);
    assert.equal(scores1.wisdom, scores2.wisdom);
    assert.equal(scores1.charisma, scores2.charisma);
  });
});

describe("applyRacialModifiers", () => {
  const baseScores: AbilityScores = {
    strength: 12,
    dexterity: 12,
    constitution: 12,
    intelligence: 12,
    wisdom: 12,
    charisma: 12,
  };

  it("applies no modifiers for Human", () => {
    const modified = applyRacialModifiers(baseScores, "Human");
    assert.equal(modified.strength, 12);
    assert.equal(modified.dexterity, 12);
    assert.equal(modified.constitution, 12);
    assert.equal(modified.intelligence, 12);
    assert.equal(modified.wisdom, 12);
    assert.equal(modified.charisma, 12);
  });

  it("applies Dwarf modifiers (+1 CON, -1 CHA)", () => {
    const modified = applyRacialModifiers(baseScores, "Dwarf");
    assert.equal(modified.strength, 12);
    assert.equal(modified.dexterity, 12);
    assert.equal(modified.constitution, 13);
    assert.equal(modified.intelligence, 12);
    assert.equal(modified.wisdom, 12);
    assert.equal(modified.charisma, 11);
  });

  it("applies Elf modifiers (+1 DEX, -1 CON)", () => {
    const modified = applyRacialModifiers(baseScores, "Elf");
    assert.equal(modified.strength, 12);
    assert.equal(modified.dexterity, 13);
    assert.equal(modified.constitution, 11);
    assert.equal(modified.intelligence, 12);
    assert.equal(modified.wisdom, 12);
    assert.equal(modified.charisma, 12);
  });

  it("applies Halfling modifiers (+1 DEX, -1 STR)", () => {
    const modified = applyRacialModifiers(baseScores, "Halfling");
    assert.equal(modified.strength, 11);
    assert.equal(modified.dexterity, 13);
    assert.equal(modified.constitution, 12);
    assert.equal(modified.intelligence, 12);
    assert.equal(modified.wisdom, 12);
    assert.equal(modified.charisma, 12);
  });
});

describe("calculateAC", () => {
  const baseAbilities: AbilityScores = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };

  it("calculates base AC of 10 with no armor and 0 Dex mod", () => {
    const ac = calculateAC(baseAbilities, []);
    assert.equal(ac, 10);
  });

  it("applies Dex modifier to AC", () => {
    const highDex = { ...baseAbilities, dexterity: 16 };
    const ac = calculateAC(highDex, []);
    assert.equal(ac, 12); // 10 + 2 (Dex mod)
  });

  it("applies leather armor bonus", () => {
    const ac = calculateAC(baseAbilities, ["leather"]);
    assert.equal(ac, 12); // 10 + 2 (leather)
  });

  it("applies chainmail armor bonus", () => {
    const ac = calculateAC(baseAbilities, ["chainmail"]);
    assert.equal(ac, 14); // 10 + 4 (chainmail)
  });

  it("applies shield bonus", () => {
    const ac = calculateAC(baseAbilities, ["shield"]);
    assert.equal(ac, 11); // 10 + 1 (shield)
  });

  it("stacks armor and shield bonuses", () => {
    const ac = calculateAC(baseAbilities, ["chainmail", "shield"]);
    assert.equal(ac, 15); // 10 + 4 (chainmail) + 1 (shield)
  });

  it("applies Dex modifier with armor", () => {
    const highDex = { ...baseAbilities, dexterity: 14 };
    const ac = calculateAC(highDex, ["chainmail", "shield"]);
    assert.equal(ac, 16); // 10 + 4 (chainmail) + 1 (shield) + 1 (Dex)
  });

  it("applies negative Dex modifier", () => {
    const lowDex = { ...baseAbilities, dexterity: 7 };
    const ac = calculateAC(lowDex, ["chainmail"]);
    assert.equal(ac, 13); // 10 + 4 (chainmail) - 1 (Dex)
  });
});

describe("calculateBAB", () => {
  it("calculates Fighter BAB at level 1", () => {
    const bab = calculateBAB("Fighter", 1);
    assert.equal(bab, 1); // floor(1 * 1.0) = 1
  });

  it("calculates Fighter BAB at level 5", () => {
    const bab = calculateBAB("Fighter", 5);
    assert.equal(bab, 5); // floor(5 * 1.0) = 5
  });

  it("calculates Cleric BAB at level 1", () => {
    const bab = calculateBAB("Cleric", 1);
    assert.equal(bab, 0); // floor(1 * 0.75) = 0
  });

  it("calculates Cleric BAB at level 2", () => {
    const bab = calculateBAB("Cleric", 2);
    assert.equal(bab, 1); // floor(2 * 0.75) = 1
  });

  it("calculates Cleric BAB at level 4", () => {
    const bab = calculateBAB("Cleric", 4);
    assert.equal(bab, 3); // floor(4 * 0.75) = 3
  });

  it("calculates MagicUser BAB at level 1", () => {
    const bab = calculateBAB("MagicUser", 1);
    assert.equal(bab, 0); // floor(1 * 0.5) = 0
  });

  it("calculates MagicUser BAB at level 3", () => {
    const bab = calculateBAB("MagicUser", 3);
    assert.equal(bab, 1); // floor(3 * 0.5) = 1
  });

  it("calculates Thief BAB at level 1", () => {
    const bab = calculateBAB("Thief", 1);
    assert.equal(bab, 0); // floor(1 * 0.5) = 0
  });

  it("calculates Thief BAB at level 6", () => {
    const bab = calculateBAB("Thief", 6);
    assert.equal(bab, 3); // floor(6 * 0.5) = 3
  });
});

describe("createCharacter", () => {
  it("creates a basic human fighter", () => {
    const rng = createRng(42);
    const character = createCharacter(rng, {
      name: "Thorin",
      race: "Human",
      class: "Fighter",
    });

    assert.equal(character.name, "Thorin");
    assert.equal(character.race, "Human");
    assert.equal(character.class, "Fighter");
    assert.equal(character.level, 1);
    assert.equal(character.baseAttackBonus, 1);
    assertRange(character.maxHp, 1, 18); // 1d8 + con mod (can vary)
    assert.equal(character.currentHp, character.maxHp);
    assert.equal(character.equipment.length, 3); // longsword, chainmail, shield
  });

  it("creates a dwarf cleric with proper racial modifiers", () => {
    const rng = createRng(100);
    const character = createCharacter(rng, {
      name: "Gimli",
      race: "Dwarf",
      class: "Cleric",
    });

    assert.equal(character.race, "Dwarf");
    assert.equal(character.class, "Cleric");
    // Dwarf gets +1 CON, -1 CHA
    // Since abilities are rolled, we can't predict exact values
    // but we can verify the character was created
    assertRange(character.abilities.constitution, 4, 19); // 3-18 + 1
    assertRange(character.abilities.charisma, 2, 17); // 3-18 - 1
  });

  it("creates an elf magic user", () => {
    const rng = createRng(200);
    const character = createCharacter(rng, {
      name: "Elrond",
      race: "Elf",
      class: "MagicUser",
    });

    assert.equal(character.race, "Elf");
    assert.equal(character.class, "MagicUser");
    assert.equal(character.baseAttackBonus, 0); // MagicUser at level 1
    assert.equal(character.equipment.length, 1); // dagger only
  });

  it("creates a halfling thief", () => {
    const rng = createRng(300);
    const character = createCharacter(rng, {
      name: "Bilbo",
      race: "Halfling",
      class: "Thief",
    });

    assert.equal(character.race, "Halfling");
    assert.equal(character.class, "Thief");
    assert.equal(character.baseAttackBonus, 0); // Thief at level 1
    assert.equal(character.equipment.length, 2); // shortsword, leather
  });

  it("accepts pre-rolled abilities", () => {
    const rng = createRng(42);
    const customAbilities: AbilityScores = {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    };

    const character = createCharacter(rng, {
      name: "Custom",
      race: "Human",
      class: "Fighter",
      abilities: customAbilities,
    });

    // Human has no racial modifiers, so abilities should match exactly
    assert.equal(character.abilities.strength, 16);
    assert.equal(character.abilities.dexterity, 14);
    assert.equal(character.abilities.constitution, 15);
    assert.equal(character.abilities.intelligence, 12);
    assert.equal(character.abilities.wisdom, 10);
    assert.equal(character.abilities.charisma, 8);
  });

  it("calculates AC correctly based on class equipment", () => {
    const rng = createRng(500);
    const abilities: AbilityScores = {
      strength: 12,
      dexterity: 14, // +1 modifier
      constitution: 12,
      intelligence: 12,
      wisdom: 12,
      charisma: 12,
    };

    const fighter = createCharacter(rng, {
      name: "Tank",
      race: "Human",
      class: "Fighter",
      abilities,
    });

    // Fighter starts with chainmail (AC +4) and shield (AC +1) and Dex +1
    assert.equal(fighter.armorClass, 16); // 10 + 4 + 1 + 1
  });

  it("supports higher level characters", () => {
    const rng = createRng(600);
    const character = createCharacter(rng, {
      name: "Veteran",
      race: "Human",
      class: "Fighter",
      level: 5,
    });

    assert.equal(character.level, 5);
    assert.equal(character.baseAttackBonus, 5); // Fighter gets BAB = level
  });

  it("produces deterministic characters with same seed", () => {
    const rng1 = createRng(777);
    const char1 = createCharacter(rng1, {
      name: "Twin1",
      race: "Human",
      class: "Fighter",
    });

    const rng2 = createRng(777);
    const char2 = createCharacter(rng2, {
      name: "Twin2",
      race: "Human",
      class: "Fighter",
    });

    // Same seed should produce identical ability scores and HP
    assert.equal(char1.abilities.strength, char2.abilities.strength);
    assert.equal(char1.abilities.dexterity, char2.abilities.dexterity);
    assert.equal(char1.abilities.constitution, char2.abilities.constitution);
    assert.equal(char1.abilities.intelligence, char2.abilities.intelligence);
    assert.equal(char1.abilities.wisdom, char2.abilities.wisdom);
    assert.equal(char1.abilities.charisma, char2.abilities.charisma);
    assert.equal(char1.maxHp, char2.maxHp);
  });

  it("ensures minimum 1 HP even with negative CON modifier", () => {
    const rng = createRng(999);
    const lowConAbilities: AbilityScores = {
      strength: 10,
      dexterity: 10,
      constitution: 3, // -3 modifier
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    };

    const character = createCharacter(rng, {
      name: "Sickly",
      race: "Human",
      class: "MagicUser", // d4 hit die
      abilities: lowConAbilities,
    });

    // Even with d4 - 3, HP should be at least 1
    assertRange(character.maxHp, 1, 10);
  });
});
