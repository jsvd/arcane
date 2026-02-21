/**
 * {{PROJECT_NAME}} - Game Logic
 *
 * Pure functions only: state in, state out. No rendering imports.
 * This file runs headlessly in tests — keep it free of side effects.
 */

import { createRng } from "@arcane/runtime/state";
import type { Rng } from "@arcane/runtime/state";
import { SPEED } from "./config.ts";

// --- Types ---

export type GameState = {
  rng: Rng;
  x: number;
  y: number;
  score: number;
  // Add your game state here
};

// --- Functions ---

/** Create initial game state. */
export function initGame(seedValue: number): GameState {
  return {
    rng: createRng(seedValue),
    x: 0,
    y: 0,
    score: 0,
  };
}

/** Advance game logic by one tick. Pure function: returns new state. */
export function tick(state: GameState, _dt: number): GameState {
  // Update your game logic here
  // Example: return { ...state, x: state.x + SPEED * _dt };
  return state;
}
