/**
 * {{PROJECT_NAME}} - Visual Layer
 *
 * Entry point for `arcane dev`. Handles rendering, input, camera, audio.
 * Game logic lives in game.ts — import pure functions from there.
 */

import { createGame, drawColorSprite, hud } from "@arcane/runtime/game";
import {
  followTargetSmooth, setCameraBounds, getViewportSize,
  updateScreenTransition, drawScreenTransition,
} from "@arcane/runtime/rendering";
import { updateTweens, getCameraShakeOffset } from "@arcane/runtime/tweening";
import { updateParticles } from "@arcane/runtime/particles";
import { createInputMap, isActionDown, isActionPressed } from "@arcane/runtime/input";
import { rgb } from "@arcane/runtime/ui";
import { initGame, tick } from "./game.ts";
import type { GameState } from "./game.ts";

// --- Constants ---

const ZOOM = 1.0;

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
  //    For scrolling worlds, add bounds: setCameraBounds({ minX: 0, minY: 0, maxX: WORLD_W, maxY: WORLD_H });
  const shake = getCameraShakeOffset();
  followTargetSmooth(VPW / 2 + shake.x, VPH / 2 + shake.y, ZOOM, 0.08);

  // 4. Subsystem updates — always call, they're no-ops when idle
  updateTweens(ctx.dt);
  updateParticles(ctx.dt);
  updateScreenTransition(ctx.dt);

  // 5. Render
  //    drawColorSprite({ color: rgb(60, 180, 255), x: 10, y: 10, w: 32, h: 32, layer: 1 });
  //    drawCircle(x, y, radius, { color: rgb(255, 80, 80) });
  //    For sprites: loadTexture("player.png") then drawSprite({ textureId, x, y, w, h, layer: 1 });
  //    For hit effects: impact(x, y, { shake: true, hitstop: 3 }); — one call, multiple effects
  //    For particles: createEmitter({ shape: "point", x, y, mode: "burst", burstCount: 20 });

  // 6. Transitions — no-op if inactive
  //    Start one with: startScreenTransition("fade", 0.5, {}, () => { /* midpoint */ });
  drawScreenTransition();

  // 7. HUD (screen-space, not affected by camera)
  hud.text("{{PROJECT_NAME}}", 10, 10);
  hud.text(`${ctx.viewport.width}x${ctx.viewport.height}`, 10, 30, { scale: 0.8 });
});
