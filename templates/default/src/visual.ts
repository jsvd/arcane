/**
 * {{PROJECT_NAME}} - Visual Layer
 *
 * Entry point for `arcane dev`. Thin orchestrator:
 * bootstrap, input, frame loop. Delegates rendering to render.ts.
 * Game logic lives in game.ts — import pure functions from there.
 */

import { createGame } from "@arcane/runtime/game";
import { followTargetWithShake } from "@arcane/runtime/rendering";
import { createInputMap, isActionDown, isActionPressed, WASD_ARROWS } from "@arcane/runtime/input";
import { initGame, tick } from "./game.ts";
import { renderWorld, renderHud } from "./render.ts";
import { ZOOM, BG_COLOR } from "./config.ts";
import type { GameState } from "./game.ts";

// --- Bootstrap ---

const game = createGame({
  name: "{{PROJECT_NAME}}",
  zoom: ZOOM,
  autoCamera: false,   // we drive the camera via followTargetWithShake below
  background: BG_COLOR,
  // autoSubsystems: true (default) — updateTweens, updateParticles,
  // updateScreenTransition, drawScreenTransition, drawScreenFlash are automatic.
});

// Input actions — keyboard + gamepad + touch in one place
// Extend via spread: createInputMap({ ...WASD_ARROWS, shoot: ["x", "GamepadX"] })
const input = createInputMap(WASD_ARROWS);

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
  //    Adapt this call as you change tick's signature
  state = tick(state, ctx.dt);

  // 3. Camera — smooth follow with shake
  //    Adapt to your state structure (e.g., state.player.x, state.ship.pos.x)
  //    For scrolling worlds: setCameraBounds({ minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H });
  // followTargetWithShake(state.x, state.y, ZOOM, 0.08);

  // 4. Render — delegates to render.ts
  renderWorld(state, ctx.viewport.width, ctx.viewport.height);
  renderHud(state);

  // Subsystem updates (tweens, particles, transitions, flash) are automatic
  // via autoSubsystems. No manual calls needed.
});
