/**
 * {{PROJECT_NAME}} - Visual Layer
 *
 * Entry point for `arcane dev`. Thin orchestrator:
 * bootstrap, input, frame loop. Delegates rendering to render.ts.
 * Game logic lives in game.ts — import pure functions from there.
 */

import { createGame } from "@arcane/runtime/game";
import {
  followTargetSmooth, getViewportSize,
  updateScreenTransition, drawScreenTransition,
} from "@arcane/runtime/rendering";
import { updateTweens, getCameraShakeOffset } from "@arcane/runtime/tweening";
import { updateParticles } from "@arcane/runtime/particles";
import { createInputMap, isActionDown, isActionPressed } from "@arcane/runtime/input";
import { ZOOM } from "./config.ts";
import { initGame, tick } from "./game.ts";
import { renderWorld, renderHud } from "./render.ts";
import type { GameState } from "./game.ts";

// --- Bootstrap ---

const game = createGame({ name: "{{PROJECT_NAME}}", zoom: ZOOM });

const { width: VPW, height: VPH } = getViewportSize();

// Input actions — keyboard + gamepad + touch in one place
const input = createInputMap({
  left:   ["ArrowLeft", "a", { type: "gamepadAxis", axis: "LeftStickX", direction: -1 }],
  right:  ["ArrowRight", "d", { type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
  up:     ["ArrowUp", "w", { type: "gamepadAxis", axis: "LeftStickY", direction: -1 }],
  down:   ["ArrowDown", "s", { type: "gamepadAxis", axis: "LeftStickY", direction: 1 }],
  action: ["Space", "Enter", "GamepadA"],
});

// --- State ---

let state: GameState = initGame(42);

game.state<GameState>({
  get: () => state,
  set: (s) => { state = s; },
});

// --- Game Loop ---

game.onFrame((ctx) => {
  // 1. Input — use action map (supports keyboard, gamepad, touch)
  //    isActionDown("left", input)    — held this frame
  //    isActionPressed("action", input) — just pressed this frame

  // 2. Update game logic (pure functions from game.ts)
  state = tick(state, ctx.dt);

  // 3. Camera — smooth follow with shake support
  //    For scrolling worlds: setCameraBounds({ minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H });
  const shake = getCameraShakeOffset();
  followTargetSmooth(VPW / 2 + shake.x, VPH / 2 + shake.y, ZOOM, 0.08);

  // 4. Subsystem updates — always call, they're no-ops when idle
  updateTweens(ctx.dt);
  updateParticles(ctx.dt);
  updateScreenTransition(ctx.dt);

  // 5. Render — delegates to render.ts
  renderWorld(state, VPW, VPH);
  renderHud(state);

  // 6. Transitions — no-op if inactive
  drawScreenTransition();
});
