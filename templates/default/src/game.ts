/**
 * {{PROJECT_NAME}} - Game Logic
 *
 * This file contains your game's pure logic functions.
 * All functions are pure: state in, state out.
 */

import { seed } from "@arcane/runtime/state";
import type { PRNGState } from "@arcane/runtime/state";

// --- Types ---

export type GameState = {
  player: { x: number; y: number };
  score: number;
  rng: PRNGState;
};

// --- Functions ---

/** Create initial game state. */
export function createGame(seedValue: number): GameState {
  return {
    player: { x: 0, y: 0 },
    score: 0,
    rng: seed(seedValue),
  };
}

/** Move the player by a delta. Pure function: returns new state. */
export function movePlayer(state: GameState, dx: number, dy: number): GameState {
  return {
    ...state,
    player: {
      x: state.player.x + dx,
      y: state.player.y + dy,
    },
  };
}
