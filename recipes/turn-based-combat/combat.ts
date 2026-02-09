import { system, rule } from "../../runtime/systems/index.ts";
import { rollDice, seed as seedPrng } from "../../runtime/state/prng.ts";
import type { CombatState, Combatant, Team } from "./types.ts";

// --- Query functions ---

export function getCurrentCombatant(state: CombatState): Combatant | undefined {
  const id = state.turnOrder[state.currentIndex];
  return state.combatants.find((c) => c.id === id);
}

export function getValidTargets(state: CombatState): readonly Combatant[] {
  const current = getCurrentCombatant(state);
  if (!current) return [];
  return state.combatants.filter((c) => c.alive && c.team !== current.team);
}

export function isTeamDefeated(state: CombatState, team: Team): boolean {
  return state.combatants.filter((c) => c.team === team).every((c) => !c.alive);
}

// --- Factory ---

export function createCombatState(
  combatants: readonly Combatant[],
  seed: number,
): CombatState {
  return {
    phase: "initiative",
    combatants: combatants.map((c) => ({
      ...c,
      alive: c.hp > 0,
      initiative: 0,
      defendingThisRound: false,
    })),
    turnOrder: [],
    currentIndex: 0,
    round: 1,
    log: [],
    rng: seedPrng(seed),
  };
}

// --- Internal helpers ---

function updateCombatant(
  combatants: readonly Combatant[],
  id: string,
  patch: Partial<Combatant>,
): readonly Combatant[] {
  return combatants.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

function addLog(state: CombatState, message: string): CombatState {
  return { ...state, log: [...state.log, { round: state.round, message }] };
}

function advanceTurn(state: CombatState): CombatState {
  let idx = state.currentIndex;
  const len = state.turnOrder.length;

  // Move to next index
  idx = (idx + 1) % len;

  // Check if we wrapped around (new round)
  if (idx === 0) {
    state = endOfRound(state);
    return state;
  }

  // Skip dead combatants
  let checked = 0;
  while (checked < len) {
    const id = state.turnOrder[idx];
    const combatant = state.combatants.find((c) => c.id === id);
    if (combatant && combatant.alive) break;
    idx = (idx + 1) % len;
    if (idx === 0) {
      state = endOfRound(state);
      return state;
    }
    checked++;
  }

  return { ...state, currentIndex: idx };
}

function checkVictory(state: CombatState): CombatState {
  const playerDefeated = isTeamDefeated(state, "player");
  const enemyDefeated = isTeamDefeated(state, "enemy");

  if (playerDefeated) {
    state = addLog(state, "Enemy team wins!");
    return { ...state, phase: "ended" };
  }
  if (enemyDefeated) {
    state = addLog(state, "Player team wins!");
    return { ...state, phase: "ended" };
  }
  return state;
}

function rollInitiative(state: CombatState): CombatState {
  let rng = state.rng;
  const withInitiative: Combatant[] = [];

  for (const c of state.combatants) {
    if (!c.alive) {
      withInitiative.push({ ...c, initiative: -1 });
      continue;
    }
    const [roll, nextRng] = rollDice(rng, "1d20");
    rng = nextRng;
    withInitiative.push({ ...c, initiative: roll + c.speed });
  }

  // Sort alive combatants by initiative descending
  const sorted = withInitiative
    .filter((c) => c.alive)
    .sort((a, b) => b.initiative - a.initiative);
  const turnOrder = sorted.map((c) => c.id);

  return {
    ...state,
    combatants: withInitiative,
    turnOrder,
    currentIndex: 0,
    rng,
  };
}

function endOfRound(state: CombatState): CombatState {
  // Clear defending flags
  const combatants = state.combatants.map((c) => ({
    ...c,
    defendingThisRound: false,
  }));

  let newState: CombatState = {
    ...state,
    combatants,
    round: state.round + 1,
  };

  newState = addLog(newState, `Round ${newState.round} begins.`);

  // Re-roll initiative
  newState = rollInitiative(newState);

  return newState;
}

// --- Rules ---

const rollInitiativeRule = rule<CombatState>("roll-initiative")
  .when((s) => s.phase === "initiative")
  .then((state) => {
    let s = rollInitiative(state);
    s = { ...s, phase: "active" };
    s = addLog(s, "Combat begins! Initiative rolled.");
    return s;
  });

const attackRule = rule<CombatState>("attack")
  .when((s) => s.phase === "active")
  .then((state, args) => {
    const targetId = args.targetId as string;
    const attacker = getCurrentCombatant(state);
    const target = state.combatants.find((c) => c.id === targetId);

    if (!attacker || !target || !target.alive) return state;

    const effectiveDefense = target.defendingThisRound
      ? target.defense * 2
      : target.defense;
    const damage = Math.max(1, attacker.attack - effectiveDefense);
    const newHp = Math.max(0, target.hp - damage);
    const killed = newHp <= 0;

    let combatants = updateCombatant(state.combatants, targetId, {
      hp: newHp,
      alive: !killed,
    });

    let s: CombatState = { ...state, combatants };
    s = addLog(
      s,
      `${attacker.name} attacks ${target.name} for ${damage} damage.${killed ? ` ${target.name} is defeated!` : ""}`,
    );
    s = checkVictory(s);
    if (s.phase === "ended") return s;
    s = advanceTurn(s);
    return s;
  });

const defendRule = rule<CombatState>("defend")
  .when((s) => s.phase === "active")
  .then((state) => {
    const current = getCurrentCombatant(state);
    if (!current) return state;

    const combatants = updateCombatant(state.combatants, current.id, {
      defendingThisRound: true,
    });

    let s: CombatState = { ...state, combatants };
    s = addLog(s, `${current.name} takes a defensive stance.`);
    s = advanceTurn(s);
    return s;
  });

const skipRule = rule<CombatState>("skip")
  .when((s) => s.phase === "active")
  .then((state) => {
    const current = getCurrentCombatant(state);
    if (!current) return state;

    let s = addLog(state, `${current.name} skips their turn.`);
    s = advanceTurn(s);
    return s;
  });

// --- System ---

export const TurnBasedCombat = system<CombatState>("turn-based-combat", [
  rollInitiativeRule,
  attackRule,
  defendRule,
  skipRule,
]);
