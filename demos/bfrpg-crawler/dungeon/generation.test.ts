import { describe, it, assert } from "../../../runtime/testing/harness.ts";
import { createRng } from "../../../runtime/state/index.ts";
import {
  generateDungeon,
  isWalkable,
  blocksVision,
  carveRoom,
  placeStairs,
  roomCenter,
} from "./generation.ts";
import type { Room, TileType } from "../types.ts";

describe("Dungeon Generation", () => {
  describe("generateDungeon", () => {
    it("should create a dungeon with specified dimensions", () => {
      const rng = createRng(42);
      const dungeon = generateDungeon(rng, 60, 40, 1);

      assert.equal(dungeon.width, 60);
      assert.equal(dungeon.height, 40);
      assert.equal(dungeon.tiles.length, 40);
      assert.equal(dungeon.tiles[0].length, 60);
    });

    it("should generate rooms", () => {
      const rng = createRng(42);
      const dungeon = generateDungeon(rng, 60, 40, 1);

      assert.ok(dungeon.rooms.length > 0);
    });

    it("should place stairs in last room", () => {
      const rng = createRng(42);
      const dungeon = generateDungeon(rng, 60, 40, 1);

      const { stairsPos } = dungeon;
      assert.equal(dungeon.tiles[stairsPos.y][stairsPos.x], "stairs");
    });

    it("should create rooms within size constraints", () => {
      const rng = createRng(42);
      const minSize = 4;
      const maxSize = 10;
      const dungeon = generateDungeon(rng, 60, 40, 1, { minRoomSize: minSize, maxRoomSize: maxSize });

      for (const room of dungeon.rooms) {
        assert.ok(room.w >= minSize && room.w <= maxSize);
        assert.ok(room.h >= minSize && room.h <= maxSize);
      }
    });

    it("should ensure all rooms are connected (path validation)", () => {
      const rng = createRng(42);
      const dungeon = generateDungeon(rng, 60, 40, 1);

      // Use BFS to check connectivity from first room to all others
      const visited = new Set<string>();
      const queue: { x: number; y: number }[] = [];

      // Start from first room center
      if (dungeon.rooms.length > 0) {
        const start = roomCenter(dungeon.rooms[0]);
        queue.push(start);
        visited.add(`${start.x},${start.y}`);
      }

      while (queue.length > 0) {
        const current = queue.shift()!;

        // Check all 4 directions
        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
        ];

        for (const neighbor of neighbors) {
          const key = `${neighbor.x},${neighbor.y}`;
          if (
            neighbor.x >= 0 &&
            neighbor.x < dungeon.width &&
            neighbor.y >= 0 &&
            neighbor.y < dungeon.height &&
            !visited.has(key) &&
            isWalkable(dungeon.tiles[neighbor.y][neighbor.x])
          ) {
            visited.add(key);
            queue.push(neighbor);
          }
        }
      }

      // Check that all room centers are reachable
      for (const room of dungeon.rooms) {
        const center = roomCenter(room);
        const key = `${center.x},${center.y}`;
        assert.ok(visited.has(key), `Room at (${room.x},${room.y}) is not connected`);
      }
    });

    it("should track current floor number", () => {
      const rng = createRng(42);
      const dungeon1 = generateDungeon(rng, 60, 40, 1);
      const dungeon2 = generateDungeon(rng, 60, 40, 5);

      assert.equal(dungeon1.floor, 1);
      assert.equal(dungeon2.floor, 5);
    });
  });

  describe("carveRoom", () => {
    it("should carve floor tiles in room area", () => {
      const tiles: TileType[][] = [];
      for (let y = 0; y < 20; y++) {
        tiles.push(new Array(20).fill("wall"));
      }

      const room: Room = { x: 5, y: 5, w: 4, h: 4 };
      carveRoom(tiles, room);

      // Check room interior is floor
      for (let y = 5; y < 9; y++) {
        for (let x = 5; x < 9; x++) {
          assert.equal(tiles[y][x], "floor");
        }
      }

      // Check surroundings are still wall
      assert.equal(tiles[4][5], "wall");
      assert.equal(tiles[5][4], "wall");
      assert.equal(tiles[9][5], "wall");
      assert.equal(tiles[5][9], "wall");
    });
  });

  describe("placeStairs", () => {
    it("should place stairs at room center", () => {
      const tiles: TileType[][] = [];
      for (let y = 0; y < 20; y++) {
        tiles.push(new Array(20).fill("wall"));
      }

      const room: Room = { x: 5, y: 5, w: 4, h: 4 };
      carveRoom(tiles, room);
      const stairsPos = placeStairs(tiles, room);

      assert.equal(stairsPos.x, 7); // 5 + floor(4/2)
      assert.equal(stairsPos.y, 7); // 5 + floor(4/2)
      assert.equal(tiles[stairsPos.y][stairsPos.x], "stairs");
    });
  });

  describe("isWalkable", () => {
    it("should return true for walkable tiles", () => {
      assert.ok(isWalkable("floor"));
      assert.ok(isWalkable("corridor"));
      assert.ok(isWalkable("stairs"));
    });

    it("should return false for walls", () => {
      assert.ok(!isWalkable("wall"));
    });
  });

  describe("blocksVision", () => {
    it("should return true for walls", () => {
      assert.ok(blocksVision("wall"));
    });

    it("should return false for transparent tiles", () => {
      assert.ok(!blocksVision("floor"));
      assert.ok(!blocksVision("corridor"));
      assert.ok(!blocksVision("stairs"));
    });
  });

  describe("roomCenter", () => {
    it("should calculate room center correctly", () => {
      const room: Room = { x: 5, y: 5, w: 4, h: 4 };
      const center = roomCenter(room);

      assert.equal(center.x, 7); // 5 + floor(4/2)
      assert.equal(center.y, 7);
    });

    it("should handle odd dimensions", () => {
      const room: Room = { x: 0, y: 0, w: 5, h: 7 };
      const center = roomCenter(room);

      assert.equal(center.x, 2); // 0 + floor(5/2)
      assert.equal(center.y, 3); // 0 + floor(7/2)
    });
  });
});
