import type { Rng } from "../../../runtime/state/index.ts";
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
 * @param rng - Mutable random number generator
 * @param floor - Current dungeon floor
 * @returns Selected MonsterType
 */
export function pickMonsterType(rng: Rng, floor: number): MonsterType {
  let pool: MonsterType[] = [];

  if (floor === 1) {
    pool = ["Giant Rat", "Kobold"];
  } else if (floor === 2) {
    pool = ["Giant Rat", "Kobold", "Goblin", "Skeleton"];
  } else {
    pool = ["Giant Rat", "Kobold", "Goblin", "Skeleton", "Orc"];
  }

  const index = rng.int(0, pool.length - 1);
  return pool[index];
}

// --- Monster Creation ---

/**
 * Create a monster instance.
 *
 * @param id - Unique identifier for the monster
 * @param type - Monster type (must exist in monsters.json)
 * @param pos - Position in the dungeon
 * @param rng - Mutable random number generator
 * @returns Created Monster
 */
export function createMonster(
  id: string,
  type: MonsterType,
  pos: Vec2,
  rng: Rng,
): Monster {
  const template = monsterData[type];
  if (!template) {
    throw new Error(`Unknown monster type: ${type}`);
  }

  // Roll HP from hit dice
  const hp = rng.roll(template.hitDice);

  return {
    id,
    type,
    pos,
    hp,
    maxHp: hp,
    ac: template.armorClass,
    attackBonus: template.attackBonus,
    damage: template.damage,
    alive: true,
  };
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
 * @param rng - Mutable random number generator
 * @param rooms - List of rooms in the dungeon
 * @param floor - Current dungeon floor
 * @returns Array of spawned monsters
 */
export function spawnMonsters(
  rng: Rng,
  rooms: Room[],
  floor: number,
): Monster[] {
  const monsters: Monster[] = [];
  let monsterId = 0;

  // Skip first room (player starts there)
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];

    // 30% chance to spawn
    const roll = rng.int(1, 100);

    if (roll <= 30) {
      // Spawn 1-2 monsters
      const count = rng.int(1, 2);

      for (let j = 0; j < count; j++) {
        // Pick monster type for current floor
        const monsterType = pickMonsterType(rng, floor);

        // Place at random position in room
        const offsetX = rng.int(0, room.w - 1);
        const offsetY = rng.int(0, room.h - 1);

        const pos: Vec2 = {
          x: room.x + offsetX,
          y: room.y + offsetY,
        };

        // Create monster
        const monster = createMonster(`monster_${monsterId}`, monsterType, pos, rng);
        monsters.push(monster);
        monsterId++;
      }
    }
  }

  return monsters;
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
