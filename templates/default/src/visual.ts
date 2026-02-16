/**
 * {{PROJECT_NAME}} - Visual Layer
 * Entry point for `arcane dev`.
 */

import { createGame as initGame, drawColorSprite, hud } from "@arcane/runtime/game";
import { isKeyDown, setCamera, getViewportSize } from "@arcane/runtime/rendering";
import { rgb } from "@arcane/runtime/ui";
import { createGame, movePlayer } from "./game.ts";
import type { GameState } from "./game.ts";

// --- Constants ---

const CAMERA_ZOOM = 4.0;
const MOVE_SPEED = 100; // pixels per second

// --- Bootstrap ---

const game = initGame({ name: "{{PROJECT_NAME}}", zoom: CAMERA_ZOOM });

// --- State ---

const { width, height } = getViewportSize();
let state: GameState = createGame(42, width, height);

game.state<GameState>({
  get: () => state,
  set: (s) => { state = s; },
});

// --- Game Loop ---

game.onFrame((ctx) => {
  // Input
  let dx = 0, dy = 0;
  if (isKeyDown("ArrowLeft") || isKeyDown("a")) dx -= 1;
  if (isKeyDown("ArrowRight") || isKeyDown("d")) dx += 1;
  if (isKeyDown("ArrowUp") || isKeyDown("w")) dy -= 1;
  if (isKeyDown("ArrowDown") || isKeyDown("s")) dy += 1;

  // Update
  if (dx !== 0 || dy !== 0) {
    state = movePlayer(state, dx * MOVE_SPEED * ctx.dt, dy * MOVE_SPEED * ctx.dt);
  }

  // Camera — follow the player
  setCamera(state.player.x, state.player.y, CAMERA_ZOOM);

  // Render ground (fills viewport at current zoom)
  const groundSize = Math.max(ctx.viewport.width, ctx.viewport.height) / CAMERA_ZOOM;
  drawColorSprite({
    color: rgb(80, 80, 80),
    x: -groundSize / 2,
    y: -groundSize / 2,
    w: groundSize,
    h: groundSize,
    layer: 0,
  });

  // Render player
  drawColorSprite({
    color: rgb(60, 180, 255),
    x: state.player.x - 16,
    y: state.player.y - 16,
    w: 32,
    h: 32,
    layer: 1,
  });

  // HUD (screen-space by default)
  hud.text(`Score: ${state.score}`, 10, 10);
});
