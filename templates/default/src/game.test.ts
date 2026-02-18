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

  it("tick advances one frame", () => {
    const state = initGame(42);
    // Adapt this call if you change tick's signature (e.g., tick(state, ctx))
    const next = tick(state, 1 / 60);
    assert.ok(next, "tick should return state");
    assert.ok(next.rng, "returned state should preserve rng");
  });
});
