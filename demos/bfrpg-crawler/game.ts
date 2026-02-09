/**
 * BFRPG Dungeon Crawler - Game Initialization
 */

import { seed } from "../../runtime/state/index.ts";
import type { BFRPGState } from "./types.ts";
import { generateDungeon } from "./dungeon/generation.ts";
import { spawnMonsters } from "./dungeon/spawning.ts";
import { createCharacter } from "./character/creation.ts";
import { createVisibilityMap, updateVisibility } from "./bfrpg-crawler.ts";

/**
 * Create a new BFRPG game state.
 */
export function createGame(
  name: string,
  className: "Fighter" | "Cleric" | "MagicUser" | "Thief",
  raceName: "Human" | "Dwarf" | "Elf" | "Halfling",
  gameSeed: number,
): BFRPGState {
  let rng = seed(gameSeed);

  // Create character
  const [character, rng2] = createCharacter(rng, {
    name,
    race: raceName,
    class: className,
    level: 1,
  });
  rng = rng2;

  // Generate dungeon
  const [dungeon, rng3] = generateDungeon(rng, 60, 40, 1);
  rng = rng3;

  // Spawn monsters
  const [monsters, rng4] = spawnMonsters(rng, dungeon.rooms, 1);
  rng = rng4;

  // Place character in first room
  const startPos = dungeon.rooms[0]
    ? { x: dungeon.rooms[0].x + 1, y: dungeon.rooms[0].y + 1 }
    : { x: 1, y: 1 };

  // Create initial visibility map
  const fov = createVisibilityMap(dungeon.width, dungeon.height);

  let state: BFRPGState = {
    phase: "exploration",
    turn: 0,
    rng,
    character: {
      name: character.name,
      race: character.race,
      class: character.class,
      level: character.level,
      xp: 0,
      abilities: character.abilities,
      hp: character.currentHp,
      maxHp: character.maxHp,
      ac: character.armorClass,
      bab: character.baseAttackBonus,
      pos: startPos,
      inventory: character.equipment.map((eq, idx) => ({
        id: `item_${idx}`,
        name: eq,
        type: "weapon" as const,
        weight: 1,
        equipped: true,
      })),
      gold: 0,
      kills: 0,
    },
    dungeon,
    monsters,
    fov,
    combat: null,
    log: [
      { turn: 0, message: `${name} the ${raceName} ${className} enters the dungeon...` },
    ],
  };

  // Update initial visibility
  state = updateVisibility(state);

  return state;
}
