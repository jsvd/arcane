/**
 * {{PROJECT_NAME}} - Game Logic Tests
 *
 * Run with: arcane test
 */

import { describe, it, assert } from "@arcane/runtime/testing";
import { createGame, movePlayer } from "./game.ts";

describe("{{PROJECT_NAME}}", () => {
  it("creates initial state", () => {
    const state = createGame(42);
    assert.equal(state.player.x, 0);
    assert.equal(state.player.y, 0);
    assert.equal(state.score, 0);
  });

  it("moves player", () => {
    const state = createGame(42);
    const moved = movePlayer(state, 10, -5);
    assert.equal(moved.player.x, 10);
    assert.equal(moved.player.y, -5);
  });

  it("preserves score when moving", () => {
    const state = { ...createGame(42), score: 100 };
    const moved = movePlayer(state, 1, 0);
    assert.equal(moved.score, 100);
  });
});
