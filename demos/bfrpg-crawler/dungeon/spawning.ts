import { randomInt, rollDice } from "../../../runtime/state/index.ts";
import type { PRNGState } from "../../../runtime/state/index.ts";
import type { Monster, MonsterType, Room, Vec2 } from "../types.ts";
import monsterData from "../data/monsters.json" with { type: "json" };
import { roomCenter } from "./generation.ts";

// --- Monster Type Selection ---

/**
 * Pick a monster type appropriate for the current floor.
 *
 * Floor scaling:
 * - Floor 1: Giant Rat, Kobold
 * - Floor 2+: Goblin, Skeleton
 * - Floor 3+: Orc
 *
 * @param rng - Random number generator state
 * @param floor - Current dungeon floor
 * @returns Tuple of [MonsterType, updated RNG state]
 */
export function pickMonsterType(rng: PRNGState, floor: number): [MonsterType, PRNGState] {
  let pool: MonsterType[] = [];

  if (floor === 1) {
    pool = ["Giant Rat", "Kobold"];
  } else if (floor === 2) {
    pool = ["Giant Rat", "Kobold", "Goblin", "Skeleton"];
  } else {
    pool = ["Giant Rat", "Kobold", "Goblin", "Skeleton", "Orc"];
  }

  const [index, nextRng] = randomInt(rng, 0, pool.length - 1);
  return [pool[index], nextRng];
}

// --- Monster Creation ---

/**
 * Create a monster instance.
 *
 * @param id - Unique identifier for the monster
 * @param type - Monster type (must exist in monsters.json)
 * @param pos - Position in the dungeon
 * @param rng - Random number generator state
 * @returns Tuple of [Monster, updated RNG state]
 */
export function createMonster(
  id: string,
  type: MonsterType,
  pos: Vec2,
  rng: PRNGState,
): [Monster, PRNGState] {
  const template = monsterData[type];
  if (!template) {
    throw new Error(`Unknown monster type: ${type}`);
  }

  // Roll HP from hit dice
  const [hp, nextRng] = rollDice(rng, template.hitDice);

  return [
    {
      id,
      type,
      pos,
      hp,
      maxHp: hp,
      ac: template.armorClass,
      attackBonus: template.attackBonus,
      damage: template.damage,
      alive: true,
    },
    nextRng,
  ];
}

// --- Monster Spawning ---

/**
 * Spawn monsters in dungeon rooms.
 *
 * Spawning rules:
 * - 30% chance per room
 * - 1-2 monsters per room
 * - Never in first room (player starts there)
 *
 * @param rng - Random number generator state
 * @param rooms - List of rooms in the dungeon
 * @param floor - Current dungeon floor
 * @returns Tuple of [Monster array, updated RNG state]
 */
export function spawnMonsters(
  rng: PRNGState,
  rooms: Room[],
  floor: number,
): [Monster[], PRNGState] {
  const monsters: Monster[] = [];
  let currentRng = rng;
  let monsterId = 0;

  // Skip first room (player starts there)
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];

    // 30% chance to spawn
    const [roll, nextRng1] = randomInt(currentRng, 1, 100);
    currentRng = nextRng1;

    if (roll <= 30) {
      // Spawn 1-2 monsters
      const [count, nextRng2] = randomInt(currentRng, 1, 2);
      currentRng = nextRng2;

      for (let j = 0; j < count; j++) {
        // Pick monster type for current floor
        const [monsterType, nextRng3] = pickMonsterType(currentRng, floor);
        currentRng = nextRng3;

        // Place at random position in room
        const [offsetX, nextRng4] = randomInt(currentRng, 0, room.w - 1);
        currentRng = nextRng4;
        const [offsetY, nextRng5] = randomInt(currentRng, 0, room.h - 1);
        currentRng = nextRng5;

        const pos: Vec2 = {
          x: room.x + offsetX,
          y: room.y + offsetY,
        };

        // Create monster
        const [monster, nextRng6] = createMonster(`monster_${monsterId}`, monsterType, pos, currentRng);
        currentRng = nextRng6;
        monsters.push(monster);
        monsterId++;
      }
    }
  }

  return [monsters, currentRng];
}

/**
 * Check if a position is inside a room.
 */
export function isInRoom(pos: Vec2, room: Room): boolean {
  return (
    pos.x >= room.x &&
    pos.x < room.x + room.w &&
    pos.y >= room.y &&
    pos.y < room.y + room.h
  );
}

/**
 * Find which room contains a position (if any).
 */
export function findRoomAtPosition(pos: Vec2, rooms: Room[]): Room | null {
  for (const room of rooms) {
    if (isInRoom(pos, room)) {
      return room;
    }
  }
  return null;
}
