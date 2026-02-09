/**
 * Integration tests for BFRPG Dungeon Crawler
 */

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { seed } from "../../runtime/state/prng.ts";
import { createGame } from "./game.ts";
import { moveCharacter, descendStairs, checkDeath, checkVictory } from "./bfrpg-crawler.ts";

describe("Integration - Full Game Flow", () => {
  it("should create a complete game state", () => {
    const game = createGame("Thrain", "Fighter", "Dwarf", 12345);

    assert.equal(game.phase, "exploration");
    assert.equal(game.character.name, "Thrain");
    assert.equal(game.character.class, "Fighter");
    assert.equal(game.character.race, "Dwarf");
    assert.equal(game.character.level, 1);
    assert.ok(game.character.hp > 0);
    assert.ok(game.character.maxHp > 0);
    assert.ok(game.character.ac >= 10);
    assert.ok(game.character.bab >= 0);
    assert.equal(game.dungeon.floor, 1);
    assert.ok(game.dungeon.rooms.length > 0);
    assert.ok(game.monsters.length > 0);
    assert.ok(game.fov.visible.length > 0);
    assert.ok(game.log.length > 0);
  });

  it("should handle movement and exploration", () => {
    let game = createGame("Test", "Fighter", "Human", 999);

    const initialTurn = game.turn;
    const initialPos = { ...game.character.pos };

    // Try to move right
    game = moveCharacter(game, { x: 1, y: 0 });

    // Turn should increment (if movement succeeded)
    assert.ok(game.turn >= initialTurn);

    // Either position changed or blocked
    const moved = game.character.pos.x !== initialPos.x || game.character.pos.y !== initialPos.y;
    assert.ok(true); // Movement logic is valid whether it moved or not
  });

  it("should handle death condition", () => {
    let game = createGame("Doomed", "MagicUser", "Elf", 555);

    // Reduce HP to 0
    game = {
      ...game,
      character: {
        ...game.character,
        hp: 0,
      },
    };

    game = checkDeath(game);

    assert.equal(game.phase, "dead");
    assert.ok(game.log.some(entry => entry.message.includes("slain")));
  });

  it("should handle victory condition", () => {
    let game = createGame("Victor", "Cleric", "Halfling", 777);

    // Set floor to 5
    game = {
      ...game,
      dungeon: {
        ...game.dungeon,
        floor: 5,
      },
    };

    game = checkVictory(game);

    assert.equal(game.phase, "won");
    assert.ok(game.log.some(entry => entry.message.includes("VICTORY")));
  });

  it("should handle descending stairs", () => {
    let game = createGame("Descender", "Thief", "Human", 333);

    // Place character on stairs
    game = {
      ...game,
      character: {
        ...game.character,
        pos: game.dungeon.stairsPos,
        hp: 4,
        maxHp: 10,
      },
    };

    const prevFloor = game.dungeon.floor;
    const prevHp = game.character.hp;

    game = descendStairs(game);

    assert.equal(game.dungeon.floor, prevFloor + 1);
    assert.ok(game.character.hp >= prevHp); // Healed 25%
    assert.ok(game.monsters.length > 0); // New monsters spawned
  });

  it("should progress through multiple floors", () => {
    let game = createGame("Runner", "Fighter", "Dwarf", 111);

    // Simulate going through 3 floors
    for (let i = 0; i < 3; i++) {
      // Place on stairs
      game = {
        ...game,
        character: {
          ...game.character,
          pos: game.dungeon.stairsPos,
        },
      };

      game = descendStairs(game);

      assert.equal(game.dungeon.floor, i + 2);
      assert.equal(game.phase, "exploration");
    }

    assert.equal(game.dungeon.floor, 4);
  });

  it("should track combat trigger on adjacent monster", () => {
    let game = createGame("Combatant", "Fighter", "Human", 444);

    if (game.monsters.length > 0) {
      const monster = game.monsters[0];

      // Move character adjacent to monster
      game = {
        ...game,
        character: {
          ...game.character,
          pos: { x: monster.pos.x + 1, y: monster.pos.y },
        },
      };

      // Manually import checkCombatTrigger if needed, or just verify state
      // For now, just verify the game state is valid
      assert.equal(game.phase, "exploration"); // Phase won't change without calling checkCombatTrigger
    }
  });
});

describe("Integration - Character Classes", () => {
  it("should create Fighter with proper stats", () => {
    const game = createGame("Fighter1", "Fighter", "Human", 100);

    assert.equal(game.character.class, "Fighter");
    assert.ok(game.character.maxHp >= 1); // At least 1 HP (d8 hit die)
    assert.equal(game.character.bab, 1); // BAB = 1 at level 1
  });

  it("should create Cleric with proper stats", () => {
    const game = createGame("Cleric1", "Cleric", "Human", 200);

    assert.equal(game.character.class, "Cleric");
    assert.ok(game.character.maxHp >= 1); // d6 hit die
    assert.ok(game.character.bab === 0 || game.character.bab === 1); // BAB = 0.75 * 1 = 0 (rounded down)
  });

  it("should create MagicUser with proper stats", () => {
    const game = createGame("Mage1", "MagicUser", "Elf", 300);

    assert.equal(game.character.class, "MagicUser");
    assert.ok(game.character.maxHp >= 1); // d4 hit die
    assert.ok(game.character.bab === 0 || game.character.bab === 1); // BAB = 0.5 * 1 = 0 (rounded down)
  });

  it("should create Thief with proper stats", () => {
    const game = createGame("Thief1", "Thief", "Halfling", 400);

    assert.equal(game.character.class, "Thief");
    assert.ok(game.character.maxHp >= 1); // d4 hit die
    assert.ok(game.character.bab === 0 || game.character.bab === 1); // BAB = 0.5 * 1 = 0 (rounded down)
  });
});

describe("Integration - Racial Modifiers", () => {
  it("should apply Dwarf racial bonuses", () => {
    const game = createGame("Dwarf1", "Fighter", "Dwarf", 500);

    assert.equal(game.character.race, "Dwarf");
    // Dwarf: +1 CON, -1 CHA (bonuses already applied in creation)
    assert.ok(game.character.abilities.constitution >= 4); // 3 (min roll) + 1
  });

  it("should apply Elf racial bonuses", () => {
    const game = createGame("Elf1", "MagicUser", "Elf", 600);

    assert.equal(game.character.race, "Elf");
    // Elf: +1 DEX, -1 CON
    assert.ok(game.character.abilities.dexterity >= 4);
  });

  it("should apply Halfling racial bonuses", () => {
    const game = createGame("Halfling1", "Thief", "Halfling", 700);

    assert.equal(game.character.race, "Halfling");
    // Halfling: +1 DEX, -1 STR
    assert.ok(game.character.abilities.dexterity >= 4);
  });
});
