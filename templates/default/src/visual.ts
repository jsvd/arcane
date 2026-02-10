/**
 * {{PROJECT_NAME}} - Visual Layer
 *
 * This file contains rendering and input handling.
 * Entry point for `arcane dev`.
 */

import {
  onFrame,
  getDeltaTime,
  drawSprite,
  setCamera,
  createSolidTexture,
  drawText,
  getDefaultFont,
} from "@arcane-engine/runtime/rendering";
import { registerAgent } from "@arcane-engine/runtime/agent";
import { createGame } from "./game.ts";
import type { GameState } from "./game.ts";

// --- Constants ---

const CAMERA_ZOOM = 4.0;

// --- Textures ---

const TEX_PLAYER = createSolidTexture("player", 60, 180, 255);

// --- State ---

let state: GameState = createGame(42);

// --- Agent Protocol ---

registerAgent({
  name: "{{PROJECT_NAME}}",
  getState: () => state,
  setState: (s: GameState) => {
    state = s;
  },
  describe: (s, opts) => {
    if (opts.verbosity === "minimal") {
      return "{{PROJECT_NAME}} is running";
    }
    return JSON.stringify(s, null, 2);
  },
});

// --- Game Loop ---

onFrame(() => {
  const dt = getDeltaTime();

  // Set camera
  setCamera(0, 0, CAMERA_ZOOM);

  // Render example sprite
  drawSprite({
    textureId: TEX_PLAYER,
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
