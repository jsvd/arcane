/**
 * demos/hello-world - Visual Layer
 *
 * This file contains rendering and input handling.
 * Entry point for `arcane dev`.
 */

import {
  drawText,
  getDefaultFont,
  setCamera,
} from "@arcane-engine/runtime/rendering";
import { createGame as initGame, drawColorSprite } from "../../../runtime/game/index.ts";
import { rgb } from "../../../runtime/ui/types.ts";
import { createGame } from "./game.ts";
import type { GameState } from "./game.ts";

// --- Constants ---

const CAMERA_ZOOM = 1.0;

// --- State ---

let state: GameState = createGame(42);

// --- Game Bootstrap ---

const game = initGame({ name: "demos/hello-world", autoClear: true, autoCamera: false });

game.state<GameState>({
  get: () => state,
  set: (s: GameState) => {
    state = s;
  },
  describe: (s: GameState, opts: { verbosity?: string }) => {
    if (opts.verbosity === "minimal") {
      return "demos/hello-world is running";
    }
    return JSON.stringify(s, null, 2);
  },
});

// --- Game Loop ---

game.onFrame((ctx) => {
  // Set camera
  setCamera(0, 0, CAMERA_ZOOM);

  // Render example sprite
  drawColorSprite({
    color: rgb(60, 180, 255),
    x: 0,
    y: 0,
    w: 32,
    h: 32,
  });

  // Render example text
  const font = getDefaultFont();
  drawText("Hello, Arcane!", -100, 50, {
    font,
    scale: 2.0,
  });
});
