import { describe, it, assert } from "../../../runtime/testing/harness.ts";
import { createRng } from "../../../runtime/state/index.ts";
import {
  pickMonsterType,
  createMonster,
  spawnMonsters,
  isInRoom,
  findRoomAtPosition,
} from "./spawning.ts";
import type { Room, Vec2 } from "../types.ts";

describe("Monster Spawning", () => {
  describe("pickMonsterType", () => {
    it("should only pick Rat or Kobold on floor 1", () => {
      const rng = createRng(42);

      const types = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const monsterType = pickMonsterType(rng, 1);
        types.add(monsterType);
      }

      // Should only have floor 1 monsters
      assert.ok(types.has("Giant Rat") || types.has("Kobold"));
      assert.ok(!types.has("Goblin"));
      assert.ok(!types.has("Skeleton"));
      assert.ok(!types.has("Orc"));
    });

    it("should include Goblin and Skeleton on floor 2", () => {
      const rng = createRng(42);

      const types = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const monsterType = pickMonsterType(rng, 2);
        types.add(monsterType);
      }

      // Should have floor 2 monsters (with enough iterations)
      assert.ok(types.has("Goblin") || types.has("Skeleton"));
      assert.ok(!types.has("Orc")); // Orc only on floor 3+
    });

    it("should include Orc on floor 3+", () => {
      const rng = createRng(42);

      const types = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const monsterType = pickMonsterType(rng, 3);
        types.add(monsterType);
      }

      // Should eventually find an Orc with enough iterations
      assert.ok(types.has("Orc"));
    });
  });

  describe("createMonster", () => {
    it("should create a monster with correct type", () => {
      const rng = createRng(42);
      const monster = createMonster("test1", "Giant Rat", { x: 5, y: 5 }, rng);

      assert.equal(monster.id, "test1");
      assert.equal(monster.type, "Giant Rat");
      assert.equal(monster.pos.x, 5);
      assert.equal(monster.pos.y, 5);
      assert.equal(monster.alive, true);
    });

    it("should roll HP from monster hit dice", () => {
      const rng = createRng(42);
      const monster = createMonster("test2", "Giant Rat", { x: 0, y: 0 }, rng);

      // Giant Rat has 1d4 HP
      assert.ok(monster.hp >= 1 && monster.hp <= 4);
      assert.equal(monster.hp, monster.maxHp);
    });

    it("should apply monster template stats", () => {
      const rng = createRng(42);
      const kobold = createMonster("kobold1", "Kobold", { x: 0, y: 0 }, rng);

      assert.equal(kobold.ac, 12);
      assert.equal(kobold.attackBonus, 0);
      assert.equal(kobold.damage, "1d4");
    });

    it("should throw error for unknown monster type", () => {
      const rng = createRng(42);

      assert.throws(() => {
        createMonster("invalid", "InvalidMonster" as any, { x: 0, y: 0 }, rng);
      });
    });
  });

  describe("spawnMonsters", () => {
    it("should never spawn in first room", () => {
      const rooms: Room[] = [
        { x: 5, y: 5, w: 4, h: 4 },
        { x: 15, y: 15, w: 4, h: 4 },
        { x: 25, y: 25, w: 4, h: 4 },
      ];

      // Run multiple times to be sure
      for (let i = 0; i < 10; i++) {
        const rng = createRng(42 + i);
        const monsters = spawnMonsters(rng, rooms, 1);

        const firstRoom = rooms[0];
        for (const monster of monsters) {
          const inFirstRoom = isInRoom(monster.pos, firstRoom);
          assert.ok(!inFirstRoom, "Monster spawned in first room!");
        }
      }
    });

    it("should spawn 0-2 monsters per room", () => {
      const rng = createRng(123); // Use different seed to get spawns

      const rooms: Room[] = [
        { x: 5, y: 5, w: 4, h: 4 },   // First room (skip)
        { x: 15, y: 5, w: 4, h: 4 },
        { x: 25, y: 5, w: 4, h: 4 },
        { x: 5, y: 15, w: 4, h: 4 },
        { x: 15, y: 15, w: 4, h: 4 },
      ];

      const monsters = spawnMonsters(rng, rooms, 1);

      // Count monsters per room
      const monstersPerRoom = new Map<number, number>();
      for (let i = 1; i < rooms.length; i++) {
        monstersPerRoom.set(i, 0);
      }

      for (const monster of monsters) {
        for (let i = 1; i < rooms.length; i++) {
          if (isInRoom(monster.pos, rooms[i])) {
            monstersPerRoom.set(i, (monstersPerRoom.get(i) || 0) + 1);
          }
        }
      }

      // Each room should have 0, 1, or 2 monsters
      for (const [roomIndex, count] of monstersPerRoom.entries()) {
        assert.ok(count >= 0 && count <= 2, `Room ${roomIndex} has ${count} monsters`);
      }
    });

    it("should generate unique monster IDs", () => {
      const rng = createRng(456);

      const rooms: Room[] = [
        { x: 5, y: 5, w: 4, h: 4 },
        { x: 15, y: 15, w: 4, h: 4 },
        { x: 25, y: 25, w: 4, h: 4 },
        { x: 5, y: 25, w: 4, h: 4 },
      ];

      const monsters = spawnMonsters(rng, rooms, 1);

      const ids = monsters.map((m) => m.id);
      const uniqueIds = new Set(ids);

      assert.equal(ids.length, uniqueIds.size);
    });

    it("should respect floor-based monster types", () => {
      const rng = createRng(789);

      const rooms: Room[] = Array.from({ length: 10 }, (_, i) => ({
        x: i * 10,
        y: 0,
        w: 4,
        h: 4,
      }));

      // Floor 1 should only have Rat/Kobold
      const monsters1 = spawnMonsters(rng, rooms, 1);
      for (const monster of monsters1) {
        assert.ok(
          monster.type === "Giant Rat" || monster.type === "Kobold",
          `Unexpected monster on floor 1: ${monster.type}`,
        );
      }
    });

    it("should place monsters within room bounds", () => {
      const rng = createRng(999);

      const rooms: Room[] = [
        { x: 5, y: 5, w: 4, h: 4 },
        { x: 15, y: 15, w: 6, h: 6 },
        { x: 25, y: 25, w: 5, h: 5 },
      ];

      const monsters = spawnMonsters(rng, rooms, 1);

      for (const monster of monsters) {
        let foundRoom = false;
        for (let i = 1; i < rooms.length; i++) {
          if (isInRoom(monster.pos, rooms[i])) {
            foundRoom = true;
            break;
          }
        }
        assert.ok(foundRoom, `Monster at (${monster.pos.x}, ${monster.pos.y}) is not in any room`);
      }
    });
  });

  describe("isInRoom", () => {
    it("should return true for positions inside room", () => {
      const room: Room = { x: 5, y: 5, w: 4, h: 4 };

      assert.ok(isInRoom({ x: 5, y: 5 }, room));
      assert.ok(isInRoom({ x: 7, y: 7 }, room));
      assert.ok(isInRoom({ x: 8, y: 8 }, room));
    });

    it("should return false for positions outside room", () => {
      const room: Room = { x: 5, y: 5, w: 4, h: 4 };

      assert.ok(!isInRoom({ x: 4, y: 5 }, room));
      assert.ok(!isInRoom({ x: 5, y: 4 }, room));
      assert.ok(!isInRoom({ x: 9, y: 5 }, room));
      assert.ok(!isInRoom({ x: 5, y: 9 }, room));
    });
  });

  describe("findRoomAtPosition", () => {
    it("should find the room containing a position", () => {
      const rooms: Room[] = [
        { x: 5, y: 5, w: 4, h: 4 },
        { x: 15, y: 15, w: 4, h: 4 },
      ];

      const room1 = findRoomAtPosition({ x: 7, y: 7 }, rooms);
      const room2 = findRoomAtPosition({ x: 17, y: 17 }, rooms);

      assert.ok(room1 !== null);
      assert.equal(room1?.x, 5);
      assert.ok(room2 !== null);
      assert.equal(room2?.x, 15);
    });

    it("should return null if position is not in any room", () => {
      const rooms: Room[] = [
        { x: 5, y: 5, w: 4, h: 4 },
        { x: 15, y: 15, w: 4, h: 4 },
      ];

      const room = findRoomAtPosition({ x: 0, y: 0 }, rooms);
      assert.equal(room, null);
    });
  });
});
