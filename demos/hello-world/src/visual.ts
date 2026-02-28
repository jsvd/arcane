/**
 * demos/hello-world - Visual Layer
 *
 * Minimal starter: one colored rectangle + text on screen.
 * Entry point for `arcane dev`.
 */

import { createGame, hud } from "@arcane-engine/runtime/game";
import { drawRectangle, rgb } from "@arcane-engine/runtime/ui";
import { createGame as createGameState } from "./game.ts";
import type { GameState } from "./game.ts";

// --- State ---

let state: GameState = createGameState(42);

// --- Game Bootstrap ---

const game = createGame({ name: "demos/hello-world" });

game.state<GameState>({
  get: () => state,
  set: (s: GameState) => { state = s; },
  describe: (s: GameState, opts: { verbosity?: string }) => {
    if (opts.verbosity === "minimal") return "demos/hello-world is running";
    return JSON.stringify(s, null, 2);
  },
});

// --- Game Loop ---

game.onFrame(({ vpW, vpH }) => {
  // Centered colored rectangle
  const size = 64;
  drawRectangle(
    (vpW - size) / 2,
    (vpH - size) / 2,
    size,
    size,
    { color: rgb(60, 180, 255) },
  );

  // Title text
  hud.text("Hello, Arcane!", vpW / 2 - 80, vpH / 2 + 60, { scale: 2.5 });
});
