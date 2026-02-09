import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { parseLevel, buildMove, createSokobanGame } from "./sokoban.ts";

// Simple 1-box level (solvable in 2 moves: up, up)
//  ####
//  #. #
//  #$ #
//  #@ #
//  ####
// Player at (1,3), box at (1,2), goal at (1,1)
// Solution: up (push box to 1,1) — actually that's 1 push.
// Make it 2: player pushes box up twice.
const LEVEL_1 = `####
#. #
#  #
#$ #
#@ #
####`;
// Player at (1,4), box at (1,3), goal at (1,1)
// Solution: up, up (push box from 1,3 to 1,2, then 1,2 to 1,1)

// Level with two boxes:
//  ######
//  #    #
//  # $$ #
//  # .. #
//  # @  #
//  ######
const LEVEL_2 = `######
#    #
# $$ #
# .. #
# @  #
######`;

describe("parseLevel", () => {
  it("parses dimensions", () => {
    const state = parseLevel(LEVEL_1);
    assert.equal(state.width, 4);
    assert.equal(state.height, 6);
  });

  it("finds the player", () => {
    const state = parseLevel(LEVEL_1);
    assert.deepEqual(state.player, { x: 1, y: 4 });
  });

  it("finds boxes", () => {
    const state = parseLevel(LEVEL_1);
    assert.equal(state.boxes.length, 1);
    assert.deepEqual(state.boxes[0], { x: 1, y: 3 });
  });

  it("finds goals", () => {
    const state = parseLevel(LEVEL_1);
    assert.equal(state.goals.length, 1);
    assert.deepEqual(state.goals[0], { x: 1, y: 1 });
  });

  it("identifies walls", () => {
    const state = parseLevel(LEVEL_1);
    assert.equal(state.tiles[0][0], "wall");
    assert.equal(state.tiles[1][1], "floor");
  });

  it("starts with 0 moves and not won", () => {
    const state = parseLevel(LEVEL_1);
    assert.equal(state.moves, 0);
    assert.equal(state.won, false);
  });

  it("handles box on goal (*)", () => {
    const state = parseLevel("#*#");
    assert.equal(state.boxes.length, 1);
    assert.equal(state.goals.length, 1);
    assert.deepEqual(state.boxes[0], state.goals[0]);
  });

  it("handles player on goal (+)", () => {
    const state = parseLevel("#+#");
    assert.equal(state.goals.length, 1);
    assert.deepEqual(state.player, state.goals[0]);
  });
});

describe("buildMove", () => {
  it("returns mutations for a valid move", () => {
    const state = parseLevel(LEVEL_1);
    const mutations = buildMove(state, "up");
    assert.ok(mutations.length > 0);
  });

  it("returns empty for move into wall", () => {
    const state = parseLevel(LEVEL_1);
    const mutations = buildMove(state, "left");
    assert.equal(mutations.length, 0);
  });

  it("returns empty for pushing box into wall", () => {
    // Tiny level: wall-box-player-wall vertically
    const level = `###
#.#
#$#
#@#
###`;
    const state = parseLevel(level);
    // Player at (1,3), box at (1,2), goal at (1,1)
    // Push up: box goes to (1,1) — that's the goal, valid
    // Push box again: would go to (1,0) which is wall
    const game = createSokobanGame(level);
    game.move("up"); // push box to (1,1)
    assert.equal(game.store.getState().won, true);

    // Now test a level where push into wall is immediate
    const level2 = `###
#$#
#@#
###`;
    const state2 = parseLevel(level2);
    // Box at (1,1), player at (1,2), walls all around
    // Push up: box would go to (1,0) which is wall
    const mutations = buildMove(state2, "up");
    assert.equal(mutations.length, 0);
  });
});

describe("createSokobanGame", () => {
  it("creates a game from a level string", () => {
    const game = createSokobanGame(LEVEL_1);
    const state = game.store.getState();
    assert.equal(state.width, 4);
    assert.equal(state.moves, 0);
  });

  it("renders the initial level back to text", () => {
    const game = createSokobanGame(LEVEL_1);
    const rendered = game.render();
    assert.equal(rendered, LEVEL_1);
  });

  describe("movement", () => {
    it("moves the player on empty floor", () => {
      const game = createSokobanGame(LEVEL_1);
      const moved = game.move("right");
      assert.equal(moved, true);
      assert.deepEqual(game.store.getState().player, { x: 2, y: 4 });
      assert.equal(game.store.getState().moves, 1);
    });

    it("rejects invalid moves into walls", () => {
      const game = createSokobanGame(LEVEL_1);
      const moved = game.move("left");
      assert.equal(moved, false);
      assert.equal(game.store.getState().moves, 0);
    });

    it("pushes a box", () => {
      const game = createSokobanGame(LEVEL_1);
      // Player at (1,4), box at (1,3). Move up pushes box to (1,2).
      game.move("up");

      const state = game.store.getState();
      assert.deepEqual(state.boxes[0], { x: 1, y: 2 });
      assert.deepEqual(state.player, { x: 1, y: 3 });
      assert.equal(state.moves, 1);
    });

    it("prevents moves after winning", () => {
      const game = createSokobanGame(LEVEL_1);
      // Solution: up (push box to 1,2), up (push box to 1,1 = goal)
      game.move("up");
      game.move("up");

      assert.equal(game.store.getState().won, true);

      const moved = game.move("up");
      assert.equal(moved, false);
    });
  });

  describe("undo", () => {
    it("undoes the last move", () => {
      const game = createSokobanGame(LEVEL_1);
      game.move("right");
      assert.equal(game.store.getState().moves, 1);

      const undone = game.undo();
      assert.equal(undone, true);
      assert.equal(game.store.getState().moves, 0);
      assert.deepEqual(game.store.getState().player, { x: 1, y: 4 });
    });

    it("undoes multiple moves", () => {
      const game = createSokobanGame(LEVEL_1);
      game.move("up");
      game.move("up");

      game.undo();
      game.undo();

      assert.equal(game.store.getState().moves, 0);
      assert.deepEqual(game.store.getState().player, { x: 1, y: 4 });
    });

    it("returns false when nothing to undo", () => {
      const game = createSokobanGame(LEVEL_1);
      assert.equal(game.undo(), false);
    });

    it("undoes box pushes correctly", () => {
      const game = createSokobanGame(LEVEL_1);
      const originalBox = game.store.getState().boxes[0];

      game.move("up"); // pushes box

      game.undo();
      assert.deepEqual(game.store.getState().boxes[0], originalBox);
    });
  });

  describe("reset", () => {
    it("resets to the initial state", () => {
      const game = createSokobanGame(LEVEL_1);
      game.move("up");
      game.move("up");

      game.reset();
      assert.equal(game.store.getState().moves, 0);
      assert.deepEqual(game.store.getState().player, { x: 1, y: 4 });
    });

    it("clears undo history", () => {
      const game = createSokobanGame(LEVEL_1);
      game.move("up");
      game.reset();

      assert.equal(game.undo(), false);
    });
  });

  describe("win detection", () => {
    it("detects win when all boxes are on goals", () => {
      const game = createSokobanGame(LEVEL_1);
      // Solution: up, up (push box from 1,3 -> 1,2 -> 1,1 = goal)
      game.move("up");
      game.move("up");

      assert.equal(game.store.getState().won, true);
    });

    it("does not detect win when boxes are off goals", () => {
      const game = createSokobanGame(LEVEL_1);
      game.move("up"); // box at (1,2), not at goal (1,1) yet

      assert.equal(game.store.getState().won, false);
    });
  });

  describe("two-box level", () => {
    it("parses two boxes and two goals", () => {
      const state = parseLevel(LEVEL_2);
      assert.equal(state.boxes.length, 2);
      assert.equal(state.goals.length, 2);
    });

    it("renders the initial state", () => {
      const game = createSokobanGame(LEVEL_2);
      assert.equal(game.render(), LEVEL_2);
    });
  });

  describe("render", () => {
    it("shows player on goal as +", () => {
      // Use a level where player can step onto a goal
      const level = `####
#. #
#  #
#@ #
####`;
      const game = createSokobanGame(level);
      game.move("up");
      game.move("up"); // player now at (1,1) which is the goal
      const rendered = game.render();
      assert.ok(rendered.includes("+"), "Player on goal should show as +");
    });

    it("shows box on goal as *", () => {
      const game = createSokobanGame(LEVEL_1);
      game.move("up");
      game.move("up"); // box pushed to (1,1) = goal
      const rendered = game.render();
      assert.ok(rendered.includes("*"), "Box on goal should show as *");
    });
  });
});
