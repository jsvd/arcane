import type { PRNGState } from "../../runtime/state/prng.ts";

export type CombatPhase = "initiative" | "active" | "ended";
export type Team = "player" | "enemy";

export type Combatant = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  team: Team;
  alive: boolean;
  initiative: number;
  defendingThisRound: boolean;
};

export type CombatLogEntry = {
  round: number;
  message: string;
};

export type CombatState = {
  phase: CombatPhase;
  combatants: readonly Combatant[];
  turnOrder: readonly string[];
  currentIndex: number;
  round: number;
  log: readonly CombatLogEntry[];
  rng: PRNGState;
};
