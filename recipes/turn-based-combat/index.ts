export type {
  CombatPhase,
  Team,
  Combatant,
  CombatLogEntry,
  CombatState,
} from "./types.ts";

export {
  TurnBasedCombat,
  createCombatState,
  getCurrentCombatant,
  getValidTargets,
  isTeamDefeated,
} from "./combat.ts";
