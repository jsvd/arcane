/**
 * demos/hello-world - Game Logic
 *
 * This file contains your game's pure logic functions.
 * All functions are pure: state in, state out.
 */

import { createRng } from "@arcane-engine/runtime/state";
import type { Rng } from "@arcane-engine/runtime/state";

// --- Types ---

export type GameState = {
  rng: Rng;
  // Add your game state here
};

// --- Functions ---

/**
 * Create initial game state
 */
export function createGame(seedValue: number): GameState {
  return {
    rng: createRng(seedValue),
  };
}

/**
 * Update game state (example)
 */
export function updateGame(state: GameState): GameState {
  // Add your game logic here
  return state;
}
