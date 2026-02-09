import type { PRNGState } from "../../runtime/state/index.ts";

// --- Core Types ---

export type Vec2 = { x: number; y: number };

export type Phase = "creation" | "exploration" | "combat" | "dead" | "won";

export type ClassName = "Fighter" | "Cleric" | "MagicUser" | "Thief";
export type RaceName = "Human" | "Dwarf" | "Elf" | "Halfling";
export type MonsterType = "Giant Rat" | "Kobold" | "Goblin" | "Skeleton" | "Orc";

export type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";

export type AbilityScores = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

// --- Character ---

export type Character = {
  name: string;
  class: ClassName;
  race: RaceName;
  level: number;
  xp: number;

  abilities: AbilityScores;

  hp: number;
  maxHp: number;
  ac: number;
  bab: number;

  pos: Vec2;

  inventory: Item[];
  gold: number;

  kills: number;
};

// --- Equipment & Items ---

export type ItemType = "weapon" | "armor" | "consumable" | "misc";

export type Item = {
  id: string;
  name: string;
  type: ItemType;
  weight: number;
  equipped: boolean;

  // Weapon properties
  damage?: string;
  attackBonus?: number;

  // Armor properties
  acBonus?: number;
};

// --- Monsters ---

export type Monster = {
  id: string;
  type: MonsterType;
  pos: Vec2;

  hp: number;
  maxHp: number;
  ac: number;
  attackBonus: number;
  damage: string;

  alive: boolean;
};

// --- Dungeon ---

export type TileType = "wall" | "floor" | "corridor" | "stairs";

export type Room = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DungeonState = {
  width: number;
  height: number;
  tiles: TileType[][];
  rooms: Room[];
  stairsPos: Vec2;
  floor: number;
};

// --- FOV ---

export type VisibilityMap = {
  visible: boolean[][];
  explored: boolean[][];
};

// --- Combat ---

export type CombatantId = string;

export type Combatant = {
  id: CombatantId;
  name: string;
  team: "player" | "enemy";
  hp: number;
  maxHp: number;
  ac: number;
  attackBonus: number;
  damage: string;
  speed: number;
  alive: boolean;
  initiative: number;
  defendingThisRound: boolean;
};

export type CombatPhase = "initiative" | "active" | "ended";

export type CombatState = {
  phase: CombatPhase;
  combatants: Combatant[];
  turnOrder: CombatantId[];
  currentIndex: number;
  round: number;
  log: LogEntry[];
  rng: PRNGState;
};

// --- Log ---

export type LogEntry = {
  turn?: number;
  round?: number;
  message: string;
};

// --- Root State ---

export type BFRPGState = {
  phase: Phase;
  turn: number;
  rng: PRNGState;

  character: Character;
  dungeon: DungeonState;
  monsters: Monster[];
  fov: VisibilityMap;

  combat: CombatState | null;

  log: LogEntry[];
};
