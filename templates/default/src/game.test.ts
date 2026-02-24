/**
 * {{PROJECT_NAME}} - Game Logic Tests
 *
 * Run with: arcane test
 * Adapt these tests as you build your game logic.
 */

import { describe, it, assert } from "@arcane/runtime/testing";
import { initGame, tick } from "./game.ts";

describe("{{PROJECT_NAME}}", () => {
  it("creates initial state", () => {
    const state = initGame(42);
    assert.ok(state.rng, "state should have rng");
  });

  it("tick returns state", () => {
    const state = initGame(42);
    // Adapt this call as you change tick's signature
    const next = tick(state, 1 / 60);
    assert.ok(next, "tick should return state");
  });

  // Add your game-specific tests here:
  // it("player moves right", () => {
  //   let state = initGame(42);
  //   state = tick(state, 1/60, { left: false, right: true, ... });
  //   assert.ok(state.player.x > 0, "player should move right");
  // });
});
