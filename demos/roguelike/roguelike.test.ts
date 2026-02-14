// Type-check guard: ensures the visual entry point compiles (catches broken imports)
import "./roguelike.ts";

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { seed } from "../../runtime/state/index.ts";
import { generateDungeon, isWalkable, blocksVision, WALL, FLOOR, CORRIDOR, STAIRS_DOWN } from "./dungeon.ts";
import type { DungeonMap } from "./dungeon.ts";
import { computeFOV, createVisibilityMap } from "./fov.ts";
import { createRoguelikeGame, movePlayer } from "./roguelike.ts";
import type { RoguelikeState } from "./roguelike.ts";

// ---------------------------------------------------------------------------
// Dungeon generation
// ---------------------------------------------------------------------------

describe("Dungeon generation", () => {
  it("generates rooms", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    assert.ok(dungeon.rooms.length > 0, "Should generate at least one room");
  });

  it("all rooms have positive dimensions", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    for (const room of dungeon.rooms) {
      assert.ok(room.w > 0, `Room width should be positive, got ${room.w}`);
      assert.ok(room.h > 0, `Room height should be positive, got ${room.h}`);
    }
  });

  it("room tiles are floor tiles", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    for (const room of dungeon.rooms) {
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          const tile = dungeon.tiles[y][x];
          assert.ok(
            tile === FLOOR || tile === STAIRS_DOWN,
            `Tile at (${x},${y}) in room should be FLOOR or STAIRS, got ${tile}`
          );
        }
      }
    }
  });

  it("rooms are within map bounds", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    for (const room of dungeon.rooms) {
      assert.ok(room.x >= 0, "Room x should be >= 0");
      assert.ok(room.y >= 0, "Room y should be >= 0");
      assert.ok(room.x + room.w <= dungeon.width, "Room should not exceed map width");
      assert.ok(room.y + room.h <= dungeon.height, "Room should not exceed map height");
    }
  });

  it("all rooms are reachable via flood fill", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);

    // Flood fill from center of first room
    const firstRoom = dungeon.rooms[0];
    const startX = firstRoom.x + Math.floor(firstRoom.w / 2);
    const startY = firstRoom.y + Math.floor(firstRoom.h / 2);

    const reachable = floodFill(dungeon, startX, startY);

    // Check that center of every room is reachable
    for (let i = 0; i < dungeon.rooms.length; i++) {
      const room = dungeon.rooms[i];
      const cx = room.x + Math.floor(room.w / 2);
      const cy = room.y + Math.floor(room.h / 2);
      assert.ok(
        reachable[cy][cx],
        `Room ${i} center (${cx},${cy}) should be reachable from room 0`
      );
    }
  });

  it("deterministic: same seed produces same dungeon", () => {
    const rng1 = seed(123);
    const rng2 = seed(123);
    const [d1] = generateDungeon(rng1, 50, 40);
    const [d2] = generateDungeon(rng2, 50, 40);
    assert.equal(d1.rooms.length, d2.rooms.length);
    for (let y = 0; y < d1.height; y++) {
      for (let x = 0; x < d1.width; x++) {
        assert.equal(d1.tiles[y][x], d2.tiles[y][x]);
      }
    }
  });

  it("different seeds produce different dungeons", () => {
    const [d1] = generateDungeon(seed(1), 50, 40);
    const [d2] = generateDungeon(seed(999), 50, 40);
    let differences = 0;
    for (let y = 0; y < d1.height; y++) {
      for (let x = 0; x < d1.width; x++) {
        if (d1.tiles[y][x] !== d2.tiles[y][x]) differences++;
      }
    }
    assert.ok(differences > 0, "Different seeds should produce different dungeons");
  });

  it("stairs are placed in last room", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    const lastRoom = dungeon.rooms[dungeon.rooms.length - 1];
    const cx = lastRoom.x + Math.floor(lastRoom.w / 2);
    const cy = lastRoom.y + Math.floor(lastRoom.h / 2);
    assert.equal(dungeon.tiles[cy][cx], STAIRS_DOWN);
  });

  it("isWalkable returns correct values", () => {
    assert.ok(!isWalkable(WALL), "Wall should not be walkable");
    assert.ok(isWalkable(FLOOR), "Floor should be walkable");
    assert.ok(isWalkable(CORRIDOR), "Corridor should be walkable");
    assert.ok(isWalkable(STAIRS_DOWN), "Stairs should be walkable");
  });

  it("blocksVision returns correct values", () => {
    assert.ok(blocksVision(WALL), "Wall should block vision");
    assert.ok(!blocksVision(FLOOR), "Floor should not block vision");
    assert.ok(!blocksVision(CORRIDOR), "Corridor should not block vision");
  });
});

// ---------------------------------------------------------------------------
// FOV (Field of View)
// ---------------------------------------------------------------------------

describe("FOV", () => {
  it("origin is always visible", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    const room = dungeon.rooms[0];
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    const fov = computeFOV(dungeon, cx, cy, 8);
    assert.ok(fov.visible[cy][cx], "Origin should be visible");
    assert.ok(fov.explored[cy][cx], "Origin should be explored");
  });

  it("adjacent floor tiles are visible", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    const room = dungeon.rooms[0];
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    const fov = computeFOV(dungeon, cx, cy, 8);

    // Check that all 4-directional neighbors that are floor are visible
    const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < dungeon.width && ny >= 0 && ny < dungeon.height) {
        if (dungeon.tiles[ny][nx] === FLOOR) {
          assert.ok(fov.visible[ny][nx], `Adjacent floor (${nx},${ny}) should be visible`);
        }
      }
    }
  });

  it("walls block vision beyond them", () => {
    // Create a small manual dungeon with a known layout
    const width = 10;
    const height = 10;
    const tiles: number[][] = [];
    for (let y = 0; y < height; y++) {
      tiles.push(new Array(width).fill(WALL));
    }
    // Room: floor from (1,1) to (3,3), wall at x=4, floor at (5,2)
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        tiles[y][x] = FLOOR;
      }
    }
    // Wall column at x=4 (already WALL)
    // Floor beyond wall
    tiles[2][5] = FLOOR;

    const dungeon: DungeonMap = { width, height, tiles, rooms: [{ x: 1, y: 1, w: 3, h: 3 }] };
    const fov = computeFOV(dungeon, 2, 2, 8);

    // The tile at (5,2) is behind the wall at (4,2), should not be visible
    assert.ok(!fov.visible[2][5], "Tile behind wall should not be visible");
  });

  it("explored tiles persist after recomputing", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    const room = dungeon.rooms[0];
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);

    // Compute FOV at original position
    const fov1 = computeFOV(dungeon, cx, cy, 8);

    // Count explored tiles
    let explored1 = 0;
    for (let y = 0; y < fov1.height; y++) {
      for (let x = 0; x < fov1.width; x++) {
        if (fov1.explored[y][x]) explored1++;
      }
    }

    // Recompute at a nearby position, reusing fov
    const fov2 = computeFOV(dungeon, cx + 1, cy, 8, fov1);

    // Explored count should be >= previous (we keep old explored tiles)
    let explored2 = 0;
    for (let y = 0; y < fov2.height; y++) {
      for (let x = 0; x < fov2.width; x++) {
        if (fov2.explored[y][x]) explored2++;
      }
    }
    assert.ok(explored2 >= explored1, "Explored count should not decrease");
  });

  it("larger radius covers more tiles", () => {
    const rng = seed(42);
    const [dungeon] = generateDungeon(rng, 50, 40);
    const room = dungeon.rooms[0];
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);

    const fovSmall = computeFOV(dungeon, cx, cy, 3);
    const fovLarge = computeFOV(dungeon, cx, cy, 12);

    let countSmall = 0;
    let countLarge = 0;
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (fovSmall.visible[y][x]) countSmall++;
        if (fovLarge.visible[y][x]) countLarge++;
      }
    }
    assert.ok(countLarge >= countSmall, "Larger radius should see at least as many tiles");
  });
});

// ---------------------------------------------------------------------------
// Game logic
// ---------------------------------------------------------------------------

describe("Roguelike game logic", () => {
  it("player starts in first room", () => {
    const state = createRoguelikeGame(42);
    const room = state.dungeon.rooms[0];
    const cx = room.x + Math.floor(room.w / 2);
    const cy = room.y + Math.floor(room.h / 2);
    assert.equal(state.player.pos.x, cx);
    assert.equal(state.player.pos.y, cy);
  });

  it("player starts with correct stats", () => {
    const state = createRoguelikeGame(42);
    assert.equal(state.player.hp, 20);
    assert.equal(state.player.maxHp, 20);
    assert.equal(state.player.attack, 5);
    assert.equal(state.phase, "playing");
  });

  it("enemies are placed in dungeon", () => {
    const state = createRoguelikeGame(42);
    assert.ok(state.entities.length > 0, "Should have enemies");
    for (const enemy of state.entities) {
      assert.equal(enemy.type, "enemy");
      assert.ok(enemy.hp > 0, "Enemies should start with positive HP");
    }
  });

  it("cannot walk through walls", () => {
    const state = createRoguelikeGame(42);
    // Find a wall adjacent to player
    const { x, y } = state.player.pos;
    const directions: Array<{ dir: "up" | "down" | "left" | "right"; dx: number; dy: number }> = [
      { dir: "up", dx: 0, dy: -1 },
      { dir: "down", dx: 0, dy: 1 },
      { dir: "left", dx: -1, dy: 0 },
      { dir: "right", dx: 1, dy: 0 },
    ];

    for (const { dir, dx, dy } of directions) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= 0 && tx < state.dungeon.width && ty >= 0 && ty < state.dungeon.height) {
        if (state.dungeon.tiles[ty][tx] === WALL) {
          const newState = movePlayer(state, dir);
          assert.equal(newState.player.pos.x, x, "Should not move into wall");
          assert.equal(newState.player.pos.y, y, "Should not move into wall");
          return;
        }
      }
    }
    // If no wall found adjacent (unlikely in center of room), test still passes
    assert.ok(true, "No adjacent wall found to test against");
  });

  it("bump attack damages enemy", () => {
    const state = createRoguelikeGame(42);
    // Place a test enemy adjacent to player
    const testState = placeEnemyNextToPlayer(state);
    if (!testState) {
      assert.ok(true, "Could not place enemy adjacent to player");
      return;
    }

    const { state: stateWithEnemy, direction, enemyIdx } = testState;
    const enemyHpBefore = stateWithEnemy.entities[enemyIdx].hp;
    const newState = movePlayer(stateWithEnemy, direction);
    const enemyHpAfter = newState.entities[enemyIdx].hp;

    assert.ok(
      enemyHpAfter < enemyHpBefore,
      `Enemy HP should decrease: ${enemyHpBefore} -> ${enemyHpAfter}`
    );
  });

  it("enemy dies at 0 HP", () => {
    const state = createRoguelikeGame(42);
    const testState = placeEnemyNextToPlayer(state);
    if (!testState) {
      assert.ok(true, "Could not place enemy adjacent to player");
      return;
    }

    const { state: stateWithEnemy, direction, enemyIdx } = testState;
    // Set enemy HP to 1 so one hit kills it
    const entities = [...stateWithEnemy.entities];
    entities[enemyIdx] = { ...entities[enemyIdx], hp: 1 };
    const weakEnemyState = { ...stateWithEnemy, entities };

    const newState = movePlayer(weakEnemyState, direction);
    assert.ok(newState.entities[enemyIdx].hp <= 0, "Enemy should be dead");
    assert.ok(
      newState.messages.some(m => m.includes("defeated")),
      "Should have defeat message"
    );
  });

  it("player death sets phase to dead", () => {
    const state = createRoguelikeGame(42);
    // Set player HP very low and place strong enemy adjacent
    const testState = placeEnemyNextToPlayer(state);
    if (!testState) {
      assert.ok(true, "Could not place enemy adjacent to player");
      return;
    }

    const { state: stateWithEnemy, enemyIdx } = testState;
    // Set player HP to 1, enemy attack to 20
    const deadlyState: RoguelikeState = {
      ...stateWithEnemy,
      player: { ...stateWithEnemy.player, hp: 1 },
      entities: stateWithEnemy.entities.map((e, i) =>
        i === enemyIdx ? { ...e, attack: 20 } : e
      ),
    };

    // Wait a turn so enemy attacks
    const newState = movePlayer(deadlyState, "wait");
    assert.equal(newState.phase, "dead");
    assert.ok(
      newState.messages.some(m => m.includes("slain")),
      "Should have death message"
    );
  });

  it("wait command advances turn", () => {
    const state = createRoguelikeGame(42);
    const newState = movePlayer(state, "wait");
    assert.equal(newState.turn, state.turn + 1);
  });

  it("stairs set phase to won", () => {
    const state = createRoguelikeGame(42);
    // Find stairs and teleport player adjacent to them
    let stairsX = -1, stairsY = -1;
    for (let y = 0; y < state.dungeon.height; y++) {
      for (let x = 0; x < state.dungeon.width; x++) {
        if (state.dungeon.tiles[y][x] === STAIRS_DOWN) {
          stairsX = x;
          stairsY = y;
        }
      }
    }
    assert.ok(stairsX >= 0 && stairsY >= 0, "Stairs should exist");

    // Place player one step left of stairs, clear any enemies
    const stairsState: RoguelikeState = {
      ...state,
      player: { ...state.player, pos: { x: stairsX - 1, y: stairsY } },
      entities: [],
      fov: computeFOV(state.dungeon, stairsX - 1, stairsY, 8),
    };

    // Make sure the tile left of stairs is walkable
    if (isWalkable(state.dungeon.tiles[stairsY][stairsX - 1])) {
      const newState = movePlayer(stairsState, "right");
      assert.equal(newState.phase, "won");
      assert.ok(
        newState.messages.some(m => m.includes("win")),
        "Should have win message"
      );
    } else {
      // Try from above
      const aboveState: RoguelikeState = {
        ...state,
        player: { ...state.player, pos: { x: stairsX, y: stairsY - 1 } },
        entities: [],
        fov: computeFOV(state.dungeon, stairsX, stairsY - 1, 8),
      };
      if (isWalkable(state.dungeon.tiles[stairsY - 1][stairsX])) {
        const newState = movePlayer(aboveState, "down");
        assert.equal(newState.phase, "won");
      } else {
        assert.ok(true, "Could not position player adjacent to stairs on walkable tile");
      }
    }
  });

  it("moving onto walkable tile changes player position", () => {
    const state = createRoguelikeGame(42);
    const { x, y } = state.player.pos;

    // Find a walkable adjacent tile
    const directions: Array<{ dir: "up" | "down" | "left" | "right"; dx: number; dy: number }> = [
      { dir: "right", dx: 1, dy: 0 },
      { dir: "left", dx: -1, dy: 0 },
      { dir: "down", dx: 0, dy: 1 },
      { dir: "up", dx: 0, dy: -1 },
    ];

    for (const { dir, dx, dy } of directions) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= 0 && tx < state.dungeon.width && ty >= 0 && ty < state.dungeon.height) {
        if (isWalkable(state.dungeon.tiles[ty][tx])) {
          // Make sure no enemy is there
          const hasEnemy = state.entities.some(
            e => e.hp > 0 && e.pos.x === tx && e.pos.y === ty
          );
          if (!hasEnemy) {
            const newState = movePlayer(state, dir);
            assert.equal(newState.player.pos.x, tx);
            assert.equal(newState.player.pos.y, ty);
            return;
          }
        }
      }
    }
    assert.ok(true, "No free walkable adjacent tile found");
  });

  it("deterministic: same seed produces same game", () => {
    const s1 = createRoguelikeGame(777);
    const s2 = createRoguelikeGame(777);
    assert.equal(s1.player.pos.x, s2.player.pos.x);
    assert.equal(s1.player.pos.y, s2.player.pos.y);
    assert.equal(s1.entities.length, s2.entities.length);
    assert.equal(s1.dungeon.rooms.length, s2.dungeon.rooms.length);
  });

  it("phase prevents movement when dead", () => {
    const state = createRoguelikeGame(42);
    const deadState: RoguelikeState = { ...state, phase: "dead" };
    const newState = movePlayer(deadState, "right");
    assert.equal(newState.player.pos.x, deadState.player.pos.x);
    assert.equal(newState.player.pos.y, deadState.player.pos.y);
  });

  it("phase prevents movement when won", () => {
    const state = createRoguelikeGame(42);
    const wonState: RoguelikeState = { ...state, phase: "won" };
    const newState = movePlayer(wonState, "right");
    assert.equal(newState.player.pos.x, wonState.player.pos.x);
    assert.equal(newState.player.pos.y, wonState.player.pos.y);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function floodFill(dungeon: DungeonMap, startX: number, startY: number): boolean[][] {
  const visited: boolean[][] = [];
  for (let y = 0; y < dungeon.height; y++) {
    visited.push(new Array(dungeon.width).fill(false));
  }

  const queue: Array<[number, number]> = [[startX, startY]];
  visited[startY][startX] = true;

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < dungeon.width && ny >= 0 && ny < dungeon.height &&
          !visited[ny][nx] && isWalkable(dungeon.tiles[ny][nx])) {
        visited[ny][nx] = true;
        queue.push([nx, ny]);
      }
    }
  }

  return visited;
}

function placeEnemyNextToPlayer(state: RoguelikeState): {
  state: RoguelikeState;
  direction: "up" | "down" | "left" | "right";
  enemyIdx: number;
} | null {
  const { x, y } = state.player.pos;
  const directions: Array<{ dir: "up" | "down" | "left" | "right"; dx: number; dy: number }> = [
    { dir: "right", dx: 1, dy: 0 },
    { dir: "left", dx: -1, dy: 0 },
    { dir: "down", dx: 0, dy: 1 },
    { dir: "up", dx: 0, dy: -1 },
  ];

  for (const { dir, dx, dy } of directions) {
    const tx = x + dx;
    const ty = y + dy;
    if (tx >= 0 && tx < state.dungeon.width && ty >= 0 && ty < state.dungeon.height &&
        isWalkable(state.dungeon.tiles[ty][tx])) {
      // Place a test enemy there
      const testEnemy = {
        id: "test_enemy",
        type: "enemy" as const,
        pos: { x: tx, y: ty },
        hp: 10,
        maxHp: 10,
        attack: 2,
        glyph: "T",
        name: "test goblin",
      };
      const entities = [...state.entities, testEnemy];
      // Make sure enemy is visible in FOV
      const fov = computeFOV(state.dungeon, x, y, 8);
      return {
        state: { ...state, entities, fov },
        direction: dir,
        enemyIdx: entities.length - 1,
      };
    }
  }
  return null;
}
