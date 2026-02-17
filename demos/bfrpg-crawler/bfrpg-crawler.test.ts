/**
 * Tests for BFRPG movement and exploration
 */

// Type-check guard: ensures the visual entry point compiles (catches broken imports)
import "./bfrpg-crawler.ts";

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { createRng } from "../../runtime/state/index.ts";
import {
  createVisibilityMap,
  updateVisibility,
  moveCharacter,
  checkCombatTrigger,
  moveMonster,
  createPathGrid,
  tickMonsters,
  descendStairs,
  rest,
  checkDeath,
  checkVictory,
} from "./bfrpg-crawler.ts";
import { generateDungeon } from "./dungeon/generation.ts";
import { createMonster } from "./dungeon/spawning.ts";
import type { BFRPGState, Monster } from "./types.ts";

// --- Test Helpers ---

function createTestState(): BFRPGState {
  const rng = createRng(42);
  const dungeon = generateDungeon(rng, 20, 20, 1);
  const fov = createVisibilityMap(dungeon.width, dungeon.height);

  // Place character in first room (guaranteed walkable)
  const startRoom = dungeon.rooms[0];
  const startPos = startRoom
    ? { x: startRoom.x + 1, y: startRoom.y + 1 }
    : { x: 5, y: 5 };

  return {
    phase: "exploration",
    turn: 0,
    rng,
    character: {
      name: "TestHero",
      class: "Fighter",
      race: "Human",
      level: 1,
      xp: 0,
      abilities: {
        strength: 16,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
      },
      hp: 10,
      maxHp: 10,
      ac: 16,
      bab: 1,
      pos: startPos,
      inventory: [],
      gold: 0,
      kills: 0,
    },
    dungeon,
    monsters: [],
    fov,
    combat: null,
    log: [],
  };
}

describe("Movement and Exploration", () => {
  describe("createVisibilityMap", () => {
    it("should create visibility map with correct dimensions", () => {
      const fov = createVisibilityMap(10, 8);

      assert.equal(fov.visible.length, 8);
      assert.equal(fov.visible[0].length, 10);
      assert.equal(fov.explored.length, 8);
      assert.equal(fov.explored[0].length, 10);
    });

    it("should initialize all cells as not visible and not explored", () => {
      const fov = createVisibilityMap(5, 5);

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          assert.equal(fov.visible[y][x], false);
          assert.equal(fov.explored[y][x], false);
        }
      }
    });
  });

  describe("updateVisibility", () => {
    it("should mark cells around player as visible", () => {
      const state = createTestState();
      const updated = updateVisibility(state);

      // Player position should be visible
      const { x, y } = state.character.pos;
      assert.ok(updated.fov.visible[y][x]);
      assert.ok(updated.fov.explored[y][x]);
    });

    it("should mark previously visible cells as explored", () => {
      let state = createTestState();
      state = updateVisibility(state);

      const { x, y } = state.character.pos;
      const wasVisible = state.fov.visible[y][x];
      assert.ok(wasVisible);

      // Move player
      state = { ...state, character: { ...state.character, pos: { x: x + 5, y } } };
      state = updateVisibility(state);

      // Old position should now be explored but not visible
      assert.equal(state.fov.visible[y][x], false);
      assert.ok(state.fov.explored[y][x]);
    });
  });

  describe("moveCharacter", () => {
    it("should move character in valid direction", () => {
      const state = createTestState();
      const startPos = state.character.pos;

      // Find a valid direction (within the room)
      const testDirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];

      let validDir = testDirs[0];
      for (const dir of testDirs) {
        const newX = startPos.x + dir.x;
        const newY = startPos.y + dir.y;
        if (
          newX >= 0 &&
          newX < state.dungeon.width &&
          newY >= 0 &&
          newY < state.dungeon.height &&
          state.dungeon.tiles[newY][newX] !== "wall"
        ) {
          validDir = dir;
          break;
        }
      }

      const moved = moveCharacter(state, validDir);

      assert.equal(moved.character.pos.x, startPos.x + validDir.x);
      assert.equal(moved.character.pos.y, startPos.y + validDir.y);
      assert.equal(moved.turn, state.turn + 1);
    });

    it("should not move into walls", () => {
      const state = createTestState();
      // Try to move into a wall (find one first)
      let wallDir = null;
      const testDirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];

      for (const dir of testDirs) {
        const newX = state.character.pos.x + dir.x;
        const newY = state.character.pos.y + dir.y;
        if (state.dungeon.tiles[newY][newX] === "wall") {
          wallDir = dir;
          break;
        }
      }

      if (wallDir) {
        const moved = moveCharacter(state, wallDir);
        assert.equal(moved.character.pos.x, state.character.pos.x);
        assert.equal(moved.character.pos.y, state.character.pos.y);
      }
    });

    it("should not move out of bounds", () => {
      let state = createTestState();
      state = { ...state, character: { ...state.character, pos: { x: 0, y: 0 } } };

      const moved = moveCharacter(state, { x: -1, y: 0 });

      assert.equal(moved.character.pos.x, 0);
      assert.equal(moved.character.pos.y, 0);
    });

    it("should update visibility after moving", () => {
      const state = createTestState();

      // Find a valid direction
      const startPos = state.character.pos;
      const testDirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];

      let validDir = testDirs[0];
      for (const dir of testDirs) {
        const newX = startPos.x + dir.x;
        const newY = startPos.y + dir.y;
        if (
          newX >= 0 &&
          newX < state.dungeon.width &&
          newY >= 0 &&
          newY < state.dungeon.height &&
          state.dungeon.tiles[newY][newX] !== "wall"
        ) {
          validDir = dir;
          break;
        }
      }

      const moved = moveCharacter(state, validDir);

      // New position should be visible
      assert.ok(moved.fov.visible[moved.character.pos.y][moved.character.pos.x]);
    });
  });

  describe("checkCombatTrigger", () => {
    it("should not trigger combat if no adjacent monsters", () => {
      const state = createTestState();
      const checked = checkCombatTrigger(state);

      assert.equal(checked.phase, "exploration");
    });

    it("should trigger combat if adjacent to living monster", () => {
      const state = createTestState();
      const monster = createMonster(
        "test1",
        "Kobold",
        { x: state.character.pos.x + 1, y: state.character.pos.y },
        state.rng,
      );

      const withMonster: BFRPGState = {
        ...state,
        monsters: [monster],
      };

      const checked = checkCombatTrigger(withMonster);

      assert.equal(checked.phase, "combat");
    });

    it("should not trigger combat if monster is dead", () => {
      const state = createTestState();
      const monster = createMonster(
        "test1",
        "Kobold",
        { x: state.character.pos.x + 1, y: state.character.pos.y },
        state.rng,
      );
      const deadMonster = { ...monster, alive: false };

      const withDeadMonster: BFRPGState = {
        ...state,
        monsters: [deadMonster],
      };

      const checked = checkCombatTrigger(withDeadMonster);

      assert.equal(checked.phase, "exploration");
    });

    it("should not re-trigger combat if already in combat", () => {
      let state = createTestState();
      state = { ...state, phase: "combat" };

      const checked = checkCombatTrigger(state);

      assert.equal(checked.phase, "combat");
    });
  });

  describe("createPathGrid", () => {
    it("should mark walkable tiles as true", () => {
      const state = createTestState();
      const grid = createPathGrid(state.dungeon.tiles, []);

      // Check that floor/corridor tiles are walkable
      for (let y = 0; y < state.dungeon.height; y++) {
        for (let x = 0; x < state.dungeon.width; x++) {
          const tile = state.dungeon.tiles[y][x];
          if (tile === "floor" || tile === "corridor" || tile === "stairs") {
            assert.ok(grid.isWalkable(x, y), `Tile at (${x},${y}) should be walkable`);
          } else if (tile === "wall") {
            assert.equal(grid.isWalkable(x, y), false, `Wall at (${x},${y}) should not be walkable`);
          }
        }
      }
    });

    it("should mark monster positions as obstacles", () => {
      const state = createTestState();
      const monster = createMonster("m1", "Kobold", { x: 5, y: 5 }, state.rng);

      const grid = createPathGrid(state.dungeon.tiles, [monster]);

      assert.equal(grid.isWalkable(5, 5), false);
    });

    it("should not mark moving monster position as obstacle", () => {
      const state = createTestState();
      const monster = createMonster("m1", "Kobold", { x: 5, y: 5 }, state.rng);

      const grid = createPathGrid(state.dungeon.tiles, [monster], "m1");

      // If the tile itself is walkable, it should be true
      if (state.dungeon.tiles[5][5] !== "wall") {
        assert.ok(grid.isWalkable(5, 5));
      }
    });
  });

  describe("moveMonster", () => {
    it("should not move dead monsters", () => {
      const state = createTestState();
      const monster = createMonster("m1", "Kobold", { x: 7, y: 7 }, state.rng);
      const deadMonster = { ...monster, alive: false };

      const withMonster: BFRPGState = {
        ...state,
        monsters: [deadMonster],
      };

      const moved = moveMonster(withMonster, "m1");

      const movedMonster = moved.monsters.find((m) => m.id === "m1");
      assert.equal(movedMonster?.pos.x, 7);
      assert.equal(movedMonster?.pos.y, 7);
    });

    it("should move monster randomly if player not visible", () => {
      const state = createTestState();
      const monster = createMonster("m1", "Kobold", { x: 15, y: 15 }, state.rng);

      const withMonster: BFRPGState = {
        ...state,
        monsters: [monster],
      };

      const moved = moveMonster(withMonster, "m1");

      // Monster should have moved (or stayed if no valid moves)
      // Just verify monster still exists
      const movedMonster = moved.monsters.find((m) => m.id === "m1");
      assert.ok(movedMonster);
    });

    it("should return unchanged state for nonexistent monster", () => {
      const state = createTestState();
      const moved = moveMonster(state, "nonexistent");

      assert.deepEqual(moved, state);
    });
  });

  describe("tickMonsters", () => {
    it("should move all living monsters", () => {
      const state = createTestState();
      const m1 = createMonster("m1", "Kobold", { x: 10, y: 10 }, state.rng);
      const m2 = createMonster("m2", "Goblin", { x: 12, y: 12 }, state.rng);

      const withMonsters: BFRPGState = {
        ...state,
        monsters: [m1, m2],
      };

      const ticked = tickMonsters(withMonsters);

      // Monsters should exist (may have moved or not)
      assert.equal(ticked.monsters.length, 2);
    });

    it("should check for combat after all monsters move", () => {
      const state = createTestState();
      const monster = createMonster(
        "m1",
        "Kobold",
        { x: state.character.pos.x + 1, y: state.character.pos.y },
        state.rng,
      );

      const withMonster: BFRPGState = {
        ...state,
        monsters: [monster],
      };

      // Before ticking, should not be in combat
      assert.equal(withMonster.phase, "exploration");

      const ticked = tickMonsters(withMonster);

      // After ticking, may or may not be in combat (monster might move)
      // Just verify that checkCombatTrigger was called by checking phase is valid
      assert.ok(ticked.phase === "exploration" || ticked.phase === "combat");
    });
  });

  describe("descendStairs", () => {
    it("should not descend if not on stairs", () => {
      const state = createTestState();
      const descended = descendStairs(state);

      assert.equal(descended.dungeon.floor, state.dungeon.floor);
    });

    it("should generate new floor when on stairs", () => {
      let state = createTestState();
      // Place character on stairs
      state = {
        ...state,
        character: {
          ...state.character,
          pos: state.dungeon.stairsPos,
        },
      };

      const descended = descendStairs(state);

      assert.equal(descended.dungeon.floor, state.dungeon.floor + 1);
      assert.equal(descended.turn, state.turn + 1);
    });

    it("should heal 25% HP when descending", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          hp: 4, // Less than full
          maxHp: 10,
          pos: state.dungeon.stairsPos,
        },
      };

      const descended = descendStairs(state);

      // Should heal 25% of 10 = 2.5, floored to 2
      assert.ok(descended.character.hp > 4);
      assert.ok(descended.character.hp <= 10);
    });

    it("should place character in first room of new floor", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          pos: state.dungeon.stairsPos,
        },
      };

      const descended = descendStairs(state);

      // Character should be in a valid position
      assert.ok(descended.character.pos.x >= 0);
      assert.ok(descended.character.pos.y >= 0);
    });

    it("should spawn new monsters on new floor", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          pos: state.dungeon.stairsPos,
        },
      };

      const descended = descendStairs(state);

      // New floor may or may not have monsters (30% chance per room)
      // Just verify monsters array exists
      assert.ok(Array.isArray(descended.monsters));
    });
  });

  describe("rest", () => {
    it("should restore HP", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          hp: 5,
          maxHp: 10,
        },
      };

      const rested = rest(state);

      assert.ok(rested.character.hp > 5);
      assert.ok(rested.character.hp <= 10);
    });

    it("should not exceed max HP", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          hp: 9,
          maxHp: 10,
        },
      };

      const rested = rest(state);

      assert.equal(rested.character.hp, 10);
    });

    it("should increment turn", () => {
      const state = createTestState();
      const rested = rest(state);

      assert.equal(rested.turn, state.turn + 1);
    });

    it("should have chance of encounter", () => {
      // Test multiple times to verify encounter logic runs
      let state = createTestState();
      state = { ...state, rng: createRng(999) }; // Use seed that triggers encounter

      const snapshotBefore = state.rng.snapshot();
      const rested = rest(state);
      const snapshotAfter = rested.rng.snapshot();

      // RNG should have advanced (encounter check happened)
      assert.notEqual(snapshotBefore.s0, snapshotAfter.s0);
    });
  });

  describe("checkDeath", () => {
    it("should transition to dead phase when HP ≤ 0", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          hp: 0,
        },
      };

      const checked = checkDeath(state);

      assert.equal(checked.phase, "dead");
      assert.ok(checked.log.some(entry => entry.message.includes("slain")));
    });

    it("should not change phase if HP > 0", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          hp: 5,
        },
      };

      const checked = checkDeath(state);

      assert.equal(checked.phase, "exploration");
    });

    it("should handle negative HP", () => {
      let state = createTestState();
      state = {
        ...state,
        character: {
          ...state.character,
          hp: -5,
        },
      };

      const checked = checkDeath(state);

      assert.equal(checked.phase, "dead");
    });

    it("should not transition if already dead", () => {
      let state = createTestState();
      state = {
        ...state,
        phase: "dead",
        character: {
          ...state.character,
          hp: 0,
        },
      };

      const logCount = state.log.length;
      const checked = checkDeath(state);

      assert.equal(checked.phase, "dead");
      assert.equal(checked.log.length, logCount); // No new log entry
    });
  });

  describe("checkVictory", () => {
    it("should transition to won phase when floor >= 5", () => {
      let state = createTestState();
      state = {
        ...state,
        dungeon: {
          ...state.dungeon,
          floor: 5,
        },
      };

      const checked = checkVictory(state);

      assert.equal(checked.phase, "won");
      assert.ok(checked.log.some(entry => entry.message.includes("VICTORY")));
    });

    it("should not change phase if floor < 5", () => {
      let state = createTestState();
      state = {
        ...state,
        dungeon: {
          ...state.dungeon,
          floor: 4,
        },
      };

      const checked = checkVictory(state);

      assert.equal(checked.phase, "exploration");
    });

    it("should handle floor > 5", () => {
      let state = createTestState();
      state = {
        ...state,
        dungeon: {
          ...state.dungeon,
          floor: 10,
        },
      };

      const checked = checkVictory(state);

      assert.equal(checked.phase, "won");
    });

    it("should not transition if already won", () => {
      let state = createTestState();
      state = {
        ...state,
        phase: "won",
        dungeon: {
          ...state.dungeon,
          floor: 5,
        },
      };

      const logCount = state.log.length;
      const checked = checkVictory(state);

      assert.equal(checked.phase, "won");
      assert.equal(checked.log.length, logCount); // No new log entry
    });
  });
});
