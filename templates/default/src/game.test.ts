/**
 * {{PROJECT_NAME}} - Game Logic Tests
 *
 * Run with: arcane test
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
    const next = tick(state, 1 / 60);
    assert.ok(next, "tick should return state");
  });
});
