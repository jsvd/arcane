/**
 * {{PROJECT_NAME}} - Game Logic
 *
 * Pure functions only: state in, state out. No rendering imports.
 * This file runs headlessly in tests — keep it free of side effects.
 */

import { createRng } from "@arcane/runtime/state";
import type { Rng } from "@arcane/runtime/state";
// Import constants from config.ts as needed:
// import { SPEED } from "./config.ts";  // uncomment when you add SPEED to config.ts

// --- Types ---

/** Add fields as you build (e.g., direction, jump, run). */
export type Input = {
  // direction?: -1 | 0 | 1;
  // jump?: boolean;
};

export type GameState = {
  rng: Rng;
  // Add your game state fields here
};

// --- Functions ---

/** Create initial game state. */
export function initGame(seedValue: number): GameState {
  return {
    rng: createRng(seedValue),
  };
}

/** Advance game logic by one tick. Pure function: returns new state.
 *  Add fields to Input as needed — existing call sites won't break. */
export function tick(state: GameState, _dt: number, _input: Input = {}): GameState {
  // Update your game logic here
  return state;
}
