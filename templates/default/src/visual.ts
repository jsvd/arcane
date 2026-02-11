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
  getViewportSize,
  isKeyDown,
} from "@arcane/runtime/rendering";
import { registerAgent } from "@arcane/runtime/agent";
import { createGame, movePlayer } from "./game.ts";
import type { GameState } from "./game.ts";

// --- Constants ---

const CAMERA_ZOOM = 4.0;
const MOVE_SPEED = 100; // pixels per second

// --- Textures ---

const TEX_PLAYER = createSolidTexture("player", 60, 180, 255);
const TEX_GROUND = createSolidTexture("ground", 80, 80, 80);

// --- State ---

// Get actual viewport dimensions for resolution-independent game
const { width, height } = getViewportSize();
let state: GameState = createGame(42, width, height);

// --- Agent Protocol ---

registerAgent({
  name: "{{PROJECT_NAME}}",
  getState: () => state,
  setState: (s: GameState) => { state = s; },
});

// --- Game Loop ---

onFrame(() => {
  const dt = getDeltaTime();

  // Input
  let dx = 0;
  let dy = 0;
  if (isKeyDown("ArrowLeft") || isKeyDown("a")) dx -= 1;
  if (isKeyDown("ArrowRight") || isKeyDown("d")) dx += 1;
  if (isKeyDown("ArrowUp") || isKeyDown("w")) dy -= 1;
  if (isKeyDown("ArrowDown") || isKeyDown("s")) dy += 1;

  // Update
  if (dx !== 0 || dy !== 0) {
    state = movePlayer(state, dx * MOVE_SPEED * dt, dy * MOVE_SPEED * dt);
  }

  // Camera
  setCamera(state.player.x, state.player.y, CAMERA_ZOOM);

  // Render ground (fills viewport at current zoom)
  const groundSize = Math.max(state.viewportW, state.viewportH) / CAMERA_ZOOM;
  drawSprite({
    textureId: TEX_GROUND,
    x: -groundSize / 2,
    y: -groundSize / 2,
    w: groundSize,
    h: groundSize,
    layer: 0,
  });

  // Render player
  drawSprite({
    textureId: TEX_PLAYER,
    x: state.player.x - 16,
    y: state.player.y - 16,
    w: 32,
    h: 32,
    layer: 1,
  });

  // Render HUD
  const font = getDefaultFont();
  drawText(`Score: ${state.score}`, 10, 10, {
    font,
    scale: 2.0,
    screenSpace: true,
  });
});
