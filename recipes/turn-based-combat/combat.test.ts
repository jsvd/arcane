import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { applyRule } from "../../runtime/systems/index.ts";
import {
  TurnBasedCombat,
  createCombatState,
  getCurrentCombatant,
  getValidTargets,
  isTeamDefeated,
} from "./combat.ts";
import type { Combatant, CombatState } from "./types.ts";

function makeWarrior(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "warrior",
    name: "Warrior",
    hp: 20,
    maxHp: 20,
    attack: 8,
    defense: 3,
    speed: 5,
    team: "player",
    alive: true,
    initiative: 0,
    defendingThisRound: false,
    ...overrides,
  };
}

function makeGoblin(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "goblin",
    name: "Goblin",
    hp: 10,
    maxHp: 10,
    attack: 5,
    defense: 2,
    speed: 7,
    team: "enemy",
    alive: true,
    initiative: 0,
    defendingThisRound: false,
    ...overrides,
  };
}

function startCombat(
  combatants?: readonly Combatant[],
  seed?: number,
): CombatState {
  const state = createCombatState(
    combatants ?? [makeWarrior(), makeGoblin()],
    seed ?? 42,
  );
  const result = applyRule(TurnBasedCombat, "roll-initiative", state);
  return result.state;
}

describe("createCombatState", () => {
  it("sets initial phase to initiative", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    assert.equal(state.phase, "initiative");
    assert.equal(state.combatants.length, 2);
    assert.equal(state.round, 1);
    assert.equal(state.turnOrder.length, 0);
  });

  it("initializes all combatants as alive with zero initiative", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    for (const c of state.combatants) {
      assert.ok(c.alive);
      assert.equal(c.initiative, 0);
      assert.equal(c.defendingThisRound, false);
    }
  });
});

describe("roll-initiative", () => {
  it("sets phase to active", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    const result = applyRule(TurnBasedCombat, "roll-initiative", state);
    assert.ok(result.ok);
    assert.equal(result.state.phase, "active");
  });

  it("creates turn order with all alive combatants", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    const result = applyRule(TurnBasedCombat, "roll-initiative", state);
    assert.equal(result.state.turnOrder.length, 2);
    assert.equal(result.state.currentIndex, 0);
  });

  it("assigns initiative values to combatants", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    const result = applyRule(TurnBasedCombat, "roll-initiative", state);
    for (const c of result.state.combatants) {
      assert.ok(c.initiative > 0);
    }
  });

  it("sorts turn order by initiative descending", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    const result = applyRule(TurnBasedCombat, "roll-initiative", state);
    const s = result.state;
    const first = s.combatants.find((c) => c.id === s.turnOrder[0])!;
    const second = s.combatants.find((c) => c.id === s.turnOrder[1])!;
    assert.ok(first.initiative >= second.initiative);
  });

  it("fails when phase is not initiative", () => {
    const state = startCombat();
    const result = applyRule(TurnBasedCombat, "roll-initiative", state);
    assert.equal(result.ok, false);
  });

  it("adds combat begins log entry", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    const result = applyRule(TurnBasedCombat, "roll-initiative", state);
    assert.ok(result.state.log.length > 0);
    assert.ok(result.state.log.some((e) => e.message.includes("Combat begins")));
  });
});

describe("attack", () => {
  it("reduces target HP by attack minus defense", () => {
    const state = startCombat();
    const current = getCurrentCombatant(state)!;
    const targets = getValidTargets(state);
    const target = targets[0];
    const result = applyRule(TurnBasedCombat, "attack", state, {
      targetId: target.id,
    });
    assert.ok(result.ok);
    const updated = result.state.combatants.find((c) => c.id === target.id)!;
    const expectedDamage = Math.max(1, current.attack - target.defense);
    assert.equal(updated.hp, target.hp - expectedDamage);
  });

  it("deals minimum 1 damage", () => {
    // Tank with very high defense
    const tank = makeGoblin({
      id: "tank",
      name: "Tank",
      defense: 100,
      hp: 50,
      maxHp: 50,
    });
    const state = startCombat([makeWarrior(), tank]);
    const current = getCurrentCombatant(state)!;
    const targets = getValidTargets(state);
    const target = targets[0];
    const result = applyRule(TurnBasedCombat, "attack", state, {
      targetId: target.id,
    });
    assert.ok(result.ok);
    const updated = result.state.combatants.find((c) => c.id === target.id)!;
    assert.equal(updated.hp, target.hp - 1);
  });

  it("kills target when HP drops to 0", () => {
    const weakGoblin = makeGoblin({ hp: 1, maxHp: 1 });
    const state = startCombat([makeWarrior(), weakGoblin]);
    const current = getCurrentCombatant(state)!;
    const target = state.combatants.find((c) => c.team !== current.team)!;
    const result = applyRule(TurnBasedCombat, "attack", state, {
      targetId: target.id,
    });
    assert.ok(result.ok);
    const updated = result.state.combatants.find((c) => c.id === target.id)!;
    assert.equal(updated.alive, false);
    assert.equal(updated.hp, 0);
  });

  it("auto-advances turn after attack", () => {
    const state = startCombat();
    const targets = getValidTargets(state);
    const result = applyRule(TurnBasedCombat, "attack", state, {
      targetId: targets[0].id,
    });
    assert.ok(result.ok);
    // If combat not ended, index should have changed or round advanced
    if (result.state.phase !== "ended") {
      assert.ok(
        result.state.currentIndex !== state.currentIndex ||
          result.state.round !== state.round,
      );
    }
  });

  it("logs the attack with damage", () => {
    const state = startCombat();
    const targets = getValidTargets(state);
    const logBefore = state.log.length;
    const result = applyRule(TurnBasedCombat, "attack", state, {
      targetId: targets[0].id,
    });
    assert.ok(result.state.log.length > logBefore);
    const lastAttackLog = result.state.log.find((e) => e.message.includes("attacks"));
    assert.ok(lastAttackLog);
    assert.ok(lastAttackLog!.message.includes("damage"));
  });

  it("fails when phase is not active", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    const result = applyRule(TurnBasedCombat, "attack", state, {
      targetId: "goblin",
    });
    assert.equal(result.ok, false);
  });

  it("halves damage when target is defending", () => {
    const state = startCombat();
    const current = getCurrentCombatant(state)!;
    const targets = getValidTargets(state);
    const target = targets[0];

    // Manually set target as defending
    const modifiedState: CombatState = {
      ...state,
      combatants: state.combatants.map((c) =>
        c.id === target.id ? { ...c, defendingThisRound: true } : c,
      ),
    };

    const result = applyRule(TurnBasedCombat, "attack", modifiedState, {
      targetId: target.id,
    });
    assert.ok(result.ok);
    const updated = result.state.combatants.find((c) => c.id === target.id)!;
    const effectiveDefense = target.defense * 2;
    const expectedDamage = Math.max(1, current.attack - effectiveDefense);
    assert.equal(updated.hp, target.hp - expectedDamage);
  });
});

describe("defend", () => {
  it("sets defendingThisRound to true", () => {
    const state = startCombat();
    const current = getCurrentCombatant(state)!;
    const result = applyRule(TurnBasedCombat, "defend", state);
    assert.ok(result.ok);
    const updated = result.state.combatants.find((c) => c.id === current.id)!;
    assert.equal(updated.defendingThisRound, true);
  });

  it("auto-advances turn", () => {
    const state = startCombat();
    const result = applyRule(TurnBasedCombat, "defend", state);
    assert.ok(result.ok);
    assert.ok(
      result.state.currentIndex !== state.currentIndex ||
        result.state.round !== state.round,
    );
  });

  it("logs the defensive stance", () => {
    const state = startCombat();
    const logBefore = state.log.length;
    const result = applyRule(TurnBasedCombat, "defend", state);
    assert.ok(result.state.log.length > logBefore);
    assert.ok(
      result.state.log.some((e) => e.message.includes("defensive stance")),
    );
  });
});

describe("skip", () => {
  it("logs and advances turn", () => {
    const state = startCombat();
    const logBefore = state.log.length;
    const result = applyRule(TurnBasedCombat, "skip", state);
    assert.ok(result.ok);
    assert.ok(result.state.log.length > logBefore);
    assert.ok(result.state.log.some((e) => e.message.includes("skips")));
  });

  it("advances to next combatant", () => {
    const state = startCombat();
    const result = applyRule(TurnBasedCombat, "skip", state);
    assert.ok(result.ok);
    assert.ok(
      result.state.currentIndex !== state.currentIndex ||
        result.state.round !== state.round,
    );
  });
});

describe("advance-turn mechanics", () => {
  it("skips dead combatants", () => {
    // Create 3 combatants, kill the middle one
    const fighter = makeWarrior({ id: "fighter", speed: 10 });
    const deadGoblin = makeGoblin({ id: "dead-goblin", hp: 0, alive: false });
    const liveGoblin = makeGoblin({ id: "live-goblin", speed: 3 });
    const state = startCombat([fighter, deadGoblin, liveGoblin]);

    // The dead goblin should never be the current combatant
    let s = state;
    for (let i = 0; i < 6; i++) {
      const current = getCurrentCombatant(s);
      if (!current) break;
      assert.notEqual(current.id, "dead-goblin");
      const targets = getValidTargets(s);
      if (targets.length === 0) break;
      const result = applyRule(TurnBasedCombat, "skip", s);
      if (!result.ok || result.state.phase === "ended") break;
      s = result.state;
    }
  });

  it("wraps around and triggers end-of-round", () => {
    const state = startCombat();
    // Skip both turns to trigger wrap
    let s = state;
    const r1 = applyRule(TurnBasedCombat, "skip", s);
    assert.ok(r1.ok);
    s = r1.state;
    // After second skip, round should advance
    const r2 = applyRule(TurnBasedCombat, "skip", s);
    assert.ok(r2.ok);
    assert.equal(r2.state.round, state.round + 1);
  });
});

describe("end-of-round", () => {
  it("clears defending flags", () => {
    const state = startCombat();
    // Defend then skip to trigger round end
    const r1 = applyRule(TurnBasedCombat, "defend", state);
    assert.ok(r1.ok);
    const r2 = applyRule(TurnBasedCombat, "skip", r1.state);
    assert.ok(r2.ok);
    // New round: all defending flags should be cleared
    for (const c of r2.state.combatants) {
      assert.equal(c.defendingThisRound, false);
    }
  });

  it("increments round counter", () => {
    const state = startCombat();
    assert.equal(state.round, 1);
    const r1 = applyRule(TurnBasedCombat, "skip", state);
    const r2 = applyRule(TurnBasedCombat, "skip", r1.state);
    assert.equal(r2.state.round, 2);
  });
});

describe("victory detection", () => {
  it("ends combat when one team is defeated", () => {
    const weakGoblin = makeGoblin({ hp: 1, maxHp: 1 });
    const state = startCombat([makeWarrior(), weakGoblin]);

    // Find the warrior's turn and attack
    let s = state;
    let attempts = 0;
    while (s.phase !== "ended" && attempts < 10) {
      const current = getCurrentCombatant(s)!;
      if (current.team === "player") {
        const result = applyRule(TurnBasedCombat, "attack", s, {
          targetId: "goblin",
        });
        s = result.state;
      } else {
        const result = applyRule(TurnBasedCombat, "skip", s);
        s = result.state;
      }
      attempts++;
    }
    assert.equal(s.phase, "ended");
    assert.ok(isTeamDefeated(s, "enemy"));
  });

  it("logs victory message", () => {
    const weakGoblin = makeGoblin({ hp: 1, maxHp: 1 });
    const state = startCombat([makeWarrior(), weakGoblin]);

    let s = state;
    let attempts = 0;
    while (s.phase !== "ended" && attempts < 10) {
      const current = getCurrentCombatant(s)!;
      if (current.team === "player") {
        const result = applyRule(TurnBasedCombat, "attack", s, {
          targetId: "goblin",
        });
        s = result.state;
      } else {
        const result = applyRule(TurnBasedCombat, "skip", s);
        s = result.state;
      }
      attempts++;
    }
    assert.ok(s.log.some((e) => e.message.includes("wins")));
  });
});

describe("query functions", () => {
  it("getCurrentCombatant returns correct combatant", () => {
    const state = startCombat();
    const current = getCurrentCombatant(state);
    assert.ok(current);
    assert.equal(current!.id, state.turnOrder[state.currentIndex]);
  });

  it("getValidTargets returns alive opposing team members", () => {
    const state = startCombat();
    const current = getCurrentCombatant(state)!;
    const targets = getValidTargets(state);
    assert.ok(targets.length > 0);
    for (const t of targets) {
      assert.ok(t.alive);
      assert.notEqual(t.team, current.team);
    }
  });

  it("getValidTargets returns empty when no opposing alive", () => {
    const weakGoblin = makeGoblin({ hp: 0, alive: false });
    const state = createCombatState([makeWarrior(), weakGoblin], 42);
    const result = applyRule(TurnBasedCombat, "roll-initiative", state);
    const s = result.state;
    // Only player is alive — but if current is player, targets should be empty
    const current = getCurrentCombatant(s);
    if (current && current.team === "player") {
      const targets = getValidTargets(s);
      assert.equal(targets.length, 0);
    }
  });

  it("isTeamDefeated returns true when all dead", () => {
    const state = createCombatState(
      [makeWarrior(), makeGoblin({ hp: 0, alive: false })],
      42,
    );
    // The factory normalizes alive based on hp
    assert.ok(isTeamDefeated(state, "enemy"));
  });

  it("isTeamDefeated returns false when some alive", () => {
    const state = createCombatState([makeWarrior(), makeGoblin()], 42);
    assert.equal(isTeamDefeated(state, "enemy"), false);
    assert.equal(isTeamDefeated(state, "player"), false);
  });
});

describe("full combat simulation", () => {
  it("runs a full combat until one team wins", () => {
    const state = startCombat([
      makeWarrior({ id: "w1", name: "Warrior 1" }),
      makeWarrior({ id: "w2", name: "Warrior 2" }),
      makeGoblin({ id: "g1", name: "Goblin 1" }),
      makeGoblin({ id: "g2", name: "Goblin 2" }),
    ]);

    let s = state;
    let turns = 0;
    while (s.phase !== "ended" && turns < 100) {
      const current = getCurrentCombatant(s)!;
      const targets = getValidTargets(s);
      if (targets.length === 0) break;
      const result = applyRule(TurnBasedCombat, "attack", s, {
        targetId: targets[0].id,
      });
      if (!result.ok) break;
      s = result.state;
      turns++;
    }

    assert.equal(s.phase, "ended");
    assert.ok(
      isTeamDefeated(s, "player") || isTeamDefeated(s, "enemy"),
    );
    assert.ok(s.log.length > 0);
    assert.ok(turns > 0);
  });
});
