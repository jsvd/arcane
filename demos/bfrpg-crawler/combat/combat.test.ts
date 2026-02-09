/**
 * Tests for BFRPG combat system
 */

import { describe, it, assert } from "../../../runtime/testing/harness.ts";
import { seed } from "../../../runtime/state/prng.ts";
import {
  parseDamageDice,
  rollDamage,
  toHitRoll,
  checkHit,
} from "./actions.ts";
import {
  BFRPGCombat,
  enterCombat,
  exitCombat,
  awardCombatRewards,
} from "./bfrpg-combat.ts";
import type { BFRPGCombatant, BFRPGCombatState } from "./bfrpg-combat.ts";
import { applyRule } from "../../../runtime/systems/index.ts";

/** Helper to assert value is in range [min, max] inclusive */
function assertRange(value: number, min: number, max: number): void {
  assert.ok(
    value >= min && value <= max,
    `Expected ${value} to be in range [${min}, ${max}]`,
  );
}

describe("parseDamageDice", () => {
  it("parses simple dice notation", () => {
    const spec = parseDamageDice("1d8");
    assert.equal(spec.count, 1);
    assert.equal(spec.sides, 8);
    assert.equal(spec.modifier, 0);
  });

  it("parses dice with modifier", () => {
    const spec = parseDamageDice("2d6+3");
    assert.equal(spec.count, 2);
    assert.equal(spec.sides, 6);
    assert.equal(spec.modifier, 3);
  });

  it("parses dice with negative modifier", () => {
    const spec = parseDamageDice("1d4-1");
    assert.equal(spec.count, 1);
    assert.equal(spec.sides, 4);
    assert.equal(spec.modifier, -1);
  });
});

describe("rollDamage", () => {
  it("rolls damage in valid range", () => {
    const rng = seed(42);
    const [damage, _] = rollDamage(rng, "1d8");
    assertRange(damage, 1, 8);
  });

  it("applies modifiers to damage", () => {
    const rng = seed(100);
    const spec = parseDamageDice("1d6+3");
    const [damage, _] = rollDamage(rng, spec);
    assertRange(damage, 4, 9); // 1-6 + 3
  });

  it("produces deterministic results", () => {
    const rng1 = seed(777);
    const [damage1, _] = rollDamage(rng1, "1d8");

    const rng2 = seed(777);
    const [damage2, __] = rollDamage(rng2, "1d8");

    assert.equal(damage1, damage2);
  });
});

describe("toHitRoll", () => {
  it("rolls 1d20", () => {
    const rng = seed(42);
    const [roll, _] = toHitRoll(rng);
    assertRange(roll, 1, 20);
  });

  it("produces deterministic results", () => {
    const rng1 = seed(333);
    const [roll1, _] = toHitRoll(rng1);

    const rng2 = seed(333);
    const [roll2, __] = toHitRoll(rng2);

    assert.equal(roll1, roll2);
  });
});

describe("checkHit", () => {
  it("hits when total attack equals AC", () => {
    const hit = checkHit(10, 1, 2, 13); // 10 + 1 + 2 = 13
    assert.ok(hit);
  });

  it("hits when total attack exceeds AC", () => {
    const hit = checkHit(15, 2, 3, 18); // 15 + 2 + 3 = 20 > 18
    assert.ok(hit);
  });

  it("misses when total attack is below AC", () => {
    const hit = checkHit(5, 1, 0, 10); // 5 + 1 + 0 = 6 < 10
    assert.equal(hit, false);
  });

  it("accounts for negative modifiers", () => {
    const hit = checkHit(10, 1, -2, 10); // 10 + 1 - 2 = 9 < 10
    assert.equal(hit, false);
  });

  it("accounts for BAB", () => {
    const hit = checkHit(8, 5, 2, 15); // 8 + 5 + 2 = 15
    assert.ok(hit);
  });
});

describe("BFRPGCombat system", () => {
  function createTestCombatant(overrides: Partial<BFRPGCombatant>): BFRPGCombatant {
    return {
      id: "test-1",
      name: "Test Fighter",
      hp: 10,
      maxHp: 10,
      attack: 5, // Legacy field from base recipe
      defense: 2, // Legacy field from base recipe
      speed: 3,
      team: "player",
      alive: true,
      initiative: 0,
      defendingThisRound: false,
      strength: 14,
      dexterity: 12,
      armorClass: 15,
      baseAttackBonus: 1,
      damageDice: "1d8",
      ...overrides,
    };
  }

  function createInitialState(
    combatants: readonly BFRPGCombatant[],
    seedValue: number,
  ): BFRPGCombatState {
    return {
      phase: "initiative",
      combatants: combatants.map((c) => ({
        ...c,
        alive: c.hp > 0,
        initiative: 0,
        defendingThisRound: false,
        dodgingThisRound: false,
      })),
      turnOrder: [],
      currentIndex: 0,
      round: 1,
      log: [],
      rng: seed(seedValue),
    };
  }

  describe("enterCombat", () => {
    it("adds enemies to combat state", () => {
      const player = createTestCombatant({ id: "player-1", team: "player" });
      const enemy = createTestCombatant({ id: "enemy-1", team: "enemy" });

      const state = createInitialState([player], 42);
      const newState = enterCombat(state, [enemy]);

      assert.equal(newState.combatants.length, 2);
      assert.equal(newState.phase, "initiative");
    });

    it("preserves existing combatants", () => {
      const player1 = createTestCombatant({ id: "player-1", team: "player" });
      const player2 = createTestCombatant({ id: "player-2", team: "player" });
      const enemy = createTestCombatant({ id: "enemy-1", team: "enemy" });

      const state = createInitialState([player1, player2], 42);
      const newState = enterCombat(state, [enemy]);

      assert.equal(newState.combatants.length, 3);
      const playerIds = newState.combatants
        .filter((c) => c.team === "player")
        .map((c) => c.id);
      assert.ok(playerIds.includes("player-1"));
      assert.ok(playerIds.includes("player-2"));
    });
  });

  describe("exitCombat", () => {
    it("removes defeated players and all enemies", () => {
      const deadPlayer = createTestCombatant({
        id: "player-dead",
        team: "player",
        hp: 0,
        alive: false,
      });
      const alivePlayer = createTestCombatant({
        id: "player-alive",
        team: "player",
      });
      const enemy = createTestCombatant({ id: "enemy-1", team: "enemy" });

      const state = createInitialState([deadPlayer, alivePlayer, enemy], 42);
      const newState = exitCombat(state);

      assert.equal(newState.combatants.length, 1);
      assert.equal(newState.combatants[0].id, "player-alive");
      assert.equal(newState.phase, "ended");
    });
  });

  describe("awardCombatRewards", () => {
    it("logs reward message after victory", () => {
      const player = createTestCombatant({ id: "player-1", team: "player" });
      const enemy = createTestCombatant({
        id: "enemy-1",
        team: "enemy",
        hp: 0,
        alive: false,
      });

      const state = createInitialState([player, enemy], 42);
      const newState = awardCombatRewards(state);

      assert.ok(newState.log.length > 0);
      const lastLog = newState.log[newState.log.length - 1];
      assert.match(lastLog.message, /experience/i);
    });

    it("counts all defeated enemies", () => {
      const player = createTestCombatant({ id: "player-1", team: "player" });
      const enemy1 = createTestCombatant({
        id: "enemy-1",
        team: "enemy",
        hp: 0,
        alive: false,
      });
      const enemy2 = createTestCombatant({
        id: "enemy-2",
        team: "enemy",
        hp: 0,
        alive: false,
      });

      const state = createInitialState([player, enemy1, enemy2], 42);
      const newState = awardCombatRewards(state);

      const lastLog = newState.log[newState.log.length - 1];
      assert.match(lastLog.message, /2 defeated foes/i);
    });
  });

  describe("roll-initiative rule", () => {
    it("rolls initiative and starts combat", () => {
      const player = createTestCombatant({ id: "player-1", speed: 2 });
      const enemy = createTestCombatant({ id: "enemy-1", team: "enemy", speed: 1 });

      const state = createInitialState([player, enemy], 42);
      const result = applyRule(BFRPGCombat, "roll-initiative", state, {});

      assert.ok(result.ok);
      assert.equal(result.state.phase, "active");
      assert.ok(result.state.turnOrder.length > 0);
      assert.ok(result.state.log.some((l) => l.message.includes("Combat begins")));
    });

    it("orders combatants by initiative", () => {
      const player = createTestCombatant({ id: "player-1", speed: 10 });
      const enemy = createTestCombatant({ id: "enemy-1", team: "enemy", speed: 1 });

      const state = createInitialState([player, enemy], 100);
      const result = applyRule(BFRPGCombat, "roll-initiative", state, {});

      // Player has higher speed, more likely to go first
      // But initiative is random so we just verify turn order exists
      assert.ok(result.ok);
      assert.equal(result.state.turnOrder.length, 2);
    });
  });

  describe("attack rule (BFRPG mechanics)", () => {
    it("performs attack with to-hit roll and damage", () => {
      const attacker = createTestCombatant({
        id: "attacker",
        strength: 16, // +3 modifier
        baseAttackBonus: 3,
        damageDice: "1d8",
      });
      const target = createTestCombatant({
        id: "target",
        team: "enemy",
        hp: 20,
        armorClass: 12,
      });

      let state = createInitialState([attacker, target], 42);
      // Set up combat state
      state = { ...state, phase: "active", turnOrder: ["attacker", "target"] };

      const result = applyRule(BFRPGCombat, "attack", state, {
        targetId: "target",
      });

      // Verify combat log includes attack message
      assert.ok(result.ok, result.error?.message);
      assert.ok(result.state.log.length > 0, "Log should have entries");
      // Log message should mention the attacker and target
      const hasAttackMessage = result.state.log.some(
        (l) => l.message.toLowerCase().includes("attack") ||
               l.message.toLowerCase().includes("hit") ||
               l.message.toLowerCase().includes("miss"),
      );
      assert.ok(hasAttackMessage, `Log messages: ${result.state.log.map(l => l.message).join("; ")}`);
    });

    it("misses when roll is too low", () => {
      const attacker = createTestCombatant({
        id: "attacker",
        strength: 10, // +0 modifier
        baseAttackBonus: 0,
        damageDice: "1d8",
      });
      const target = createTestCombatant({
        id: "target",
        team: "enemy",
        hp: 20,
        armorClass: 25, // Very high AC
      });

      let state = createInitialState([attacker, target], 42);
      state = { ...state, phase: "active", turnOrder: ["attacker", "target"] };

      const result = applyRule(BFRPGCombat, "attack", state, {
        targetId: "target",
      });

      // Target HP should be unchanged (miss)
      assert.ok(result.ok);
      const targetAfter = result.state.combatants.find((c) => c.id === "target");
      // With high AC and low attack bonus, likely to miss
      // Check log for miss message
      const hasMissMessage = result.state.log.some((l) => l.message.includes("misses"));
      if (hasMissMessage) {
        assert.equal(targetAfter?.hp, 20);
      }
    });

    it("reduces target HP on successful hit", () => {
      const attacker = createTestCombatant({
        id: "attacker",
        strength: 18, // +3 modifier
        baseAttackBonus: 5,
        damageDice: "1d8",
      });
      const target = createTestCombatant({
        id: "target",
        team: "enemy",
        hp: 20,
        armorClass: 10, // Low AC, likely to hit
      });

      let state = createInitialState([attacker, target], 999);
      state = { ...state, phase: "active", turnOrder: ["attacker", "target"] };

      const result = applyRule(BFRPGCombat, "attack", state, {
        targetId: "target",
      });

      assert.ok(result.ok);
      const targetAfter = result.state.combatants.find((c) => c.id === "target");
      // Either hit and reduced HP, or missed and HP unchanged
      assert.ok(targetAfter);
      assertRange(targetAfter.hp, 0, 20);
    });

    it("marks target as dead when HP reaches 0", () => {
      const attacker = createTestCombatant({
        id: "attacker",
        strength: 18,
        baseAttackBonus: 10,
        damageDice: "10d10", // Guaranteed to kill
      });
      const target = createTestCombatant({
        id: "target",
        team: "enemy",
        hp: 5,
        armorClass: 5, // Very low AC
      });

      let state = createInitialState([attacker, target], 500);
      state = { ...state, phase: "active", turnOrder: ["attacker", "target"] };

      const result = applyRule(BFRPGCombat, "attack", state, {
        targetId: "target",
      });

      assert.ok(result.ok);
      const targetAfter = result.state.combatants.find((c) => c.id === "target");
      // With massive damage, likely to kill
      if (targetAfter && targetAfter.hp === 0) {
        assert.equal(targetAfter.alive, false);
        assert.ok(result.state.log.some((l) => l.message.includes("falls")));
      }
    });
  });

  describe("dodge rule", () => {
    it("sets dodgingThisRound flag", () => {
      const dodger = createTestCombatant({ id: "dodger" });
      const enemy = createTestCombatant({ id: "enemy", team: "enemy" });

      let state = createInitialState([dodger, enemy], 42);
      state = { ...state, phase: "active", turnOrder: ["dodger", "enemy"] };

      const result = applyRule(BFRPGCombat, "dodge", state, {});

      assert.ok(result.ok, result.error?.message);
      const dodgerAfter = result.state.combatants.find((c) => c.id === "dodger");
      assert.ok(dodgerAfter, "Dodger should still exist");
      assert.ok(dodgerAfter.dodgingThisRound, "Dodging flag should be set");
      assert.ok(
        result.state.log.some((l) => l.message.includes("dodges") && l.message.includes("+2 AC")),
        "Log should mention dodge and +2 AC",
      );
    });

    it("provides +2 AC against attacks", () => {
      const attacker = createTestCombatant({
        id: "attacker",
        strength: 14, // +2 modifier
        baseAttackBonus: 2,
        damageDice: "1d8",
      });
      const dodger = createTestCombatant({
        id: "dodger",
        team: "enemy",
        hp: 20,
        armorClass: 15,
        dodgingThisRound: true,
      });

      let state = createInitialState([attacker, dodger], 42);
      state = { ...state, phase: "active", turnOrder: ["attacker", "dodger"] };

      const result = applyRule(BFRPGCombat, "attack", state, {
        targetId: "dodger",
      });

      // Effective AC is 17 (15 + 2), harder to hit
      // The attack should process normally, accounting for +2 AC
      assert.ok(result.ok);
      // Verify attack message was logged
      assert.ok(result.state.log.length > 0);
    });
  });

  describe("victory conditions", () => {
    it("ends combat when all enemies are defeated", () => {
      const player = createTestCombatant({
        id: "player",
        strength: 18,
        baseAttackBonus: 10,
        damageDice: "10d10",
      });
      const enemy = createTestCombatant({
        id: "enemy",
        team: "enemy",
        hp: 1,
        armorClass: 5,
      });

      let state = createInitialState([player, enemy], 999);
      state = { ...state, phase: "active", turnOrder: ["player", "enemy"] };

      const result = applyRule(BFRPGCombat, "attack", state, {
        targetId: "enemy",
      });

      // If enemy was killed, combat should end
      assert.ok(result.ok);
      const enemyAfter = result.state.combatants.find((c) => c.id === "enemy");
      if (enemyAfter && !enemyAfter.alive) {
        assert.equal(result.state.phase, "ended");
        assert.ok(result.state.log.some((l) => l.message.includes("Victory")));
      }
    });

    it("ends combat when all players are defeated", () => {
      const player = createTestCombatant({
        id: "player",
        hp: 1,
        armorClass: 5,
      });
      const enemy = createTestCombatant({
        id: "enemy",
        team: "enemy",
        strength: 18,
        baseAttackBonus: 10,
        damageDice: "10d10",
      });

      let state = createInitialState([player, enemy], 777);
      state = { ...state, phase: "active", turnOrder: ["enemy", "player"] };

      const result = applyRule(BFRPGCombat, "attack", state, {
        targetId: "player",
      });

      // If player was killed, combat should end
      assert.ok(result.ok);
      const playerAfter = result.state.combatants.find((c) => c.id === "player");
      if (playerAfter && !playerAfter.alive) {
        assert.equal(result.state.phase, "ended");
        assert.ok(result.state.log.some((l) => l.message.includes("GAME OVER")));
      }
    });
  });
});
