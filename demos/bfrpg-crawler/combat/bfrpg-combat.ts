/**
 * BFRPG combat system extending TurnBasedCombat recipe
 * @license CC BY-SA 4.0
 * @source Basic Fantasy Role-Playing Game, 4th Edition
 */

import { extend, rule } from "../../../runtime/systems/index.ts";
import { TurnBasedCombat } from "../../../recipes/turn-based-combat/combat.ts";
import {
  getCurrentCombatant,
  isTeamDefeated,
} from "../../../recipes/turn-based-combat/combat.ts";
import type { CombatState } from "../../../recipes/turn-based-combat/types.ts";
import type { Combatant } from "../../../recipes/turn-based-combat/types.ts";
import { toHitRoll, checkHit, rollDamage } from "./actions.ts";
import { abilityModifier } from "../character/abilities.ts";

/** BFRPG-specific combatant fields */
export type BFRPGCombatant = Combatant & {
  /** Strength score for melee attack modifier */
  strength: number;
  /** Dexterity score for ranged attack modifier and AC */
  dexterity: number;
  /** Armor Class */
  armorClass: number;
  /** Base Attack Bonus */
  baseAttackBonus: number;
  /** Damage dice (e.g., "1d8" for longsword) */
  damageDice: string;
  /** AC bonus when dodging (+2) */
  dodgingThisRound?: boolean;
};

export type BFRPGCombatState = Omit<CombatState, "combatants"> & {
  combatants: readonly BFRPGCombatant[];
};

/** Helper to update a combatant */
function updateCombatant(
  combatants: readonly BFRPGCombatant[],
  id: string,
  patch: Partial<BFRPGCombatant>,
): readonly BFRPGCombatant[] {
  return combatants.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

/** Helper to add log entry */
function addLog(state: BFRPGCombatState, message: string): BFRPGCombatState {
  return { ...state, log: [...state.log, { round: state.round, message }] };
}

/** Helper to advance turn */
function advanceTurn(state: BFRPGCombatState): BFRPGCombatState {
  let idx = state.currentIndex;
  const len = state.turnOrder.length;

  // Move to next index
  idx = (idx + 1) % len;

  // Check if we wrapped around (new round)
  if (idx === 0) {
    return endOfRound(state);
  }

  // Skip dead combatants
  let checked = 0;
  while (checked < len) {
    const id = state.turnOrder[idx];
    const combatant = state.combatants.find((c) => c.id === id);
    if (combatant && combatant.alive) break;
    idx = (idx + 1) % len;
    if (idx === 0) {
      return endOfRound(state);
    }
    checked++;
  }

  return { ...state, currentIndex: idx };
}

/** Helper to check victory conditions */
function checkCombatVictory(state: BFRPGCombatState): BFRPGCombatState {
  const playerDefeated = isTeamDefeated(state as CombatState, "player");
  const enemyDefeated = isTeamDefeated(state as CombatState, "enemy");

  if (playerDefeated) {
    state = addLog(state, "All party members have fallen! GAME OVER.");
    return { ...state, phase: "ended" };
  }
  if (enemyDefeated) {
    state = addLog(state, "Victory! All enemies defeated!");
    state = awardCombatRewards(state);
    return { ...state, phase: "ended" };
  }
  return state;
}

/** Helper for end of round */
function endOfRound(state: BFRPGCombatState): BFRPGCombatState {
  // Clear defensive flags
  const combatants = state.combatants.map((c) => ({
    ...c,
    defendingThisRound: false,
    dodgingThisRound: false,
  }));

  let newState: BFRPGCombatState = {
    ...state,
    combatants,
    round: state.round + 1,
  };

  newState = addLog(newState, `Round ${newState.round} begins.`);

  return newState;
}

/**
 * Award XP and loot after combat victory
 * For now, just log the victory - can be extended later
 */
export function awardCombatRewards(
  state: BFRPGCombatState,
): BFRPGCombatState {
  // Calculate total XP from defeated enemies
  const defeatedEnemies = state.combatants.filter(
    (c) => c.team === "enemy" && !c.alive,
  );

  if (defeatedEnemies.length > 0) {
    return addLog(
      state,
      `Gained experience from ${defeatedEnemies.length} defeated foes.`,
    );
  }

  return state;
}

/**
 * Enter combat mode - initialize combat state
 * Returns new state with combat initialized
 */
export function enterCombat(
  state: BFRPGCombatState,
  enemies: readonly BFRPGCombatant[],
): BFRPGCombatState {
  const allCombatants = [...state.combatants, ...enemies];
  return {
    ...state,
    combatants: allCombatants,
    phase: "initiative",
  };
}

/**
 * Exit combat mode - clean up combat state
 * Returns state with only surviving player combatants
 */
export function exitCombat(state: BFRPGCombatState): BFRPGCombatState {
  const survivors = state.combatants.filter(
    (c) => c.team === "player" && c.alive,
  );
  return {
    ...state,
    combatants: survivors,
    turnOrder: [],
    currentIndex: 0,
    phase: "ended",
  };
}

// --- BFRPG-specific rules ---

/**
 * BFRPG attack rule: replaces the recipe's attack with BFRPG to-hit mechanics
 * d20 + BAB + STR mod vs AC, then roll damage on hit
 *
 * We give this rule a new name but mark it as replacing the base "attack" rule.
 * After extension, this rule can be called by its own name.
 */
const bfrpgAttackRule = rule<BFRPGCombatState>("attack")
  .when((s) => s.phase === "active")
  .then((state, args) => {
    const targetId = args.targetId as string;
    const attacker = getCurrentCombatant(state as CombatState) as
      | BFRPGCombatant
      | undefined;
    const target = state.combatants.find((c) => c.id === targetId);

    if (!attacker || !target || !target.alive) return state;

    // Roll to-hit
    const [d20Roll, rng1] = toHitRoll(state.rng);
    let currentRng = rng1;

    // Calculate modifiers
    const strMod = abilityModifier(attacker.strength);
    const effectiveAC = target.armorClass + (target.dodgingThisRound ? 2 : 0);

    // Check if hit
    const hit = checkHit(d20Roll, attacker.baseAttackBonus, strMod, effectiveAC);

    let s: BFRPGCombatState = { ...state, rng: currentRng };

    if (!hit) {
      // Miss
      s = addLog(
        s,
        `${attacker.name} attacks ${target.name} but misses! (rolled ${d20Roll})`,
      );
      s = advanceTurn(s);
      return s;
    }

    // Hit - roll damage
    const [damage, rng2] = rollDamage(currentRng, attacker.damageDice);
    currentRng = rng2;

    const newHp = Math.max(0, target.hp - damage);
    const killed = newHp <= 0;

    let combatants = updateCombatant(s.combatants, targetId, {
      hp: newHp,
      alive: !killed,
    });

    s = { ...s, combatants, rng: currentRng };
    s = addLog(
      s,
      `${attacker.name} hits ${target.name} for ${damage} damage!${killed ? ` ${target.name} falls!` : ""}`,
    );
    s = checkCombatVictory(s);
    if (s.phase === "ended") return s;
    s = advanceTurn(s);
    return s;
  });

/**
 * Dodge action: +2 AC until next turn
 */
const dodgeRule = rule<BFRPGCombatState>("dodge")
  .when((s) => s.phase === "active")
  .then((state) => {
    const current = getCurrentCombatant(state as CombatState) as
      | BFRPGCombatant
      | undefined;
    if (!current) return state;

    const combatants = updateCombatant(state.combatants, current.id, {
      dodgingThisRound: true,
    });

    let s: BFRPGCombatState = { ...state, combatants };
    s = addLog(s, `${current.name} dodges, gaining +2 AC this round.`);
    s = advanceTurn(s);
    return s;
  });

/**
 * BFRPG Combat System - extends TurnBasedCombat with BFRPG mechanics
 */
export const BFRPGCombat = extend(TurnBasedCombat, {
  remove: ["attack"],
  rules: [bfrpgAttackRule, dodgeRule] as any,
});
