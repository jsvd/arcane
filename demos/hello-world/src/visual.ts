/**
 * demos/hello-world - Visual Layer
 *
 * Minimal starter: one colored rectangle + text on screen.
 * Entry point for `arcane dev`.
 */

import { createGame, hud } from "@arcane-engine/runtime/game";
import { drawRectangle, rgb } from "@arcane-engine/runtime/ui";
import { getViewportSize } from "@arcane-engine/runtime/rendering";
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

game.onFrame(() => {
  const { width, height } = getViewportSize();

  // Centered colored rectangle
  const size = 64;
  drawRectangle(
    (width - size) / 2,
    (height - size) / 2,
    size,
    size,
    { color: rgb(60, 180, 255) },
  );

  // Title text
  hud.text("Hello, Arcane!", width / 2 - 80, height / 2 + 60, { scale: 2.5 });
});
