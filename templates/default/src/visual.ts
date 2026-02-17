/**
 * {{PROJECT_NAME}} - Visual Layer
 * Entry point for `arcane dev`.
 */

import { createGame, drawColorSprite, hud } from "@arcane/runtime/game";
import { followTargetSmooth, getViewportSize } from "@arcane/runtime/rendering";
import { updateTweens } from "@arcane/runtime/tweening";
import { updateParticles } from "@arcane/runtime/particles";
import { updateScreenTransition, drawScreenTransition } from "@arcane/runtime/rendering";
import { createInputMap, isActionDown } from "@arcane/runtime/input";
import { rgb } from "@arcane/runtime/ui";
import { createGame as newGame, movePlayer } from "./game.ts";
import type { GameState } from "./game.ts";

// --- Constants ---

const CAMERA_ZOOM = 4.0;
const MOVE_SPEED = 100; // pixels per second

// --- Bootstrap ---

const game = createGame({ name: "{{PROJECT_NAME}}", zoom: CAMERA_ZOOM });

// Input actions — supports keyboard + gamepad + touch in one place
const input = createInputMap({
  left:  ["ArrowLeft", "a", { type: "gamepadAxis", axis: "LeftStickX", direction: -1 }],
  right: ["ArrowRight", "d", { type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
  up:    ["ArrowUp", "w", { type: "gamepadAxis", axis: "LeftStickY", direction: -1 }],
  down:  ["ArrowDown", "s", { type: "gamepadAxis", axis: "LeftStickY", direction: 1 }],
});

// --- State ---

const { width, height } = getViewportSize();
let state: GameState = newGame(42, width, height);

game.state<GameState>({
  get: () => state,
  set: (s) => { state = s; },
});

// --- Game Loop ---

game.onFrame((ctx) => {
  // 1. Input — use action map, not raw keys
  let dx = 0, dy = 0;
  if (isActionDown("left", input)) dx -= 1;
  if (isActionDown("right", input)) dx += 1;
  if (isActionDown("up", input)) dy -= 1;
  if (isActionDown("down", input)) dy += 1;

  // 2. Update (pure functions from game.ts)
  if (dx !== 0 || dy !== 0) {
    state = movePlayer(state, dx * MOVE_SPEED * ctx.dt, dy * MOVE_SPEED * ctx.dt);
  }

  // 3. Camera — smooth follow with bounds
  followTargetSmooth(state.player.x, state.player.y, CAMERA_ZOOM, 0.08);

  // 4. Update subsystems — always call these, they're no-ops when idle
  updateTweens(ctx.dt);
  updateParticles(ctx.dt);
  updateScreenTransition(ctx.dt);

  // 5. Render
  const groundSize = Math.max(ctx.viewport.width, ctx.viewport.height) / CAMERA_ZOOM;
  drawColorSprite({
    color: rgb(80, 80, 80),
    x: -groundSize / 2,
    y: -groundSize / 2,
    w: groundSize,
    h: groundSize,
    layer: 0,
  });

  drawColorSprite({
    color: rgb(60, 180, 255),
    x: state.player.x - 16,
    y: state.player.y - 16,
    w: 32,
    h: 32,
    layer: 1,
  });

  // 6. Transitions overlay (no-op if inactive)
  drawScreenTransition();

  // 7. HUD (screen-space by default)
  hud.text(`Score: ${state.score}`, 10, 10);
});
