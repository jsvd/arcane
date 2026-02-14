/**
 * Gamepad Platformer Demo — Phase 25: Input Systems
 *
 * A simple platformer that responds to keyboard, gamepad, and touch input
 * via the action mapping system. Demonstrates:
 * - Input action mapping (keyboard + gamepad bindings)
 * - Gamepad analog stick movement
 * - Rebindable controls
 * - Touch input queries
 */

import {
  drawSprite,
  clearSprites,
  loadTexture,
  createSolidTexture,
  onFrame,
  getDeltaTime,
  setCamera,
  getViewportSize,
  setBackgroundColor,
  drawText,
  getDefaultFont,
  isKeyPressed,
  isGamepadConnected,
  getGamepadName,
  getGamepadAxis,
  isTouchActive,
  getTouchPosition,
} from "../../runtime/rendering/index.ts";

import {
  createInputMap,
  isActionDown,
  isActionPressed,
  getActionValue,
  createInputBuffer,
  updateInputBuffer,
  checkCombo,
  consumeCombo,
} from "../../runtime/input/index.ts";

import { registerAgent } from "../../runtime/agent/protocol.ts";

// --- Game Constants ---
const GRAVITY = 800;
const JUMP_SPEED = -350;
const MOVE_SPEED = 200;
const GROUND_Y = 450;
const PLATFORM_H = 20;

// --- State ---
interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: number; // 1 or -1
  width: number;
  height: number;
}

interface Platform {
  x: number;
  y: number;
  w: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

let player: Player = {
  x: 100,
  y: 400,
  vx: 0,
  vy: 0,
  grounded: false,
  facing: 1,
  width: 32,
  height: 32,
};

const platforms: Platform[] = [
  { x: 0, y: GROUND_Y, w: 800 },
  { x: 200, y: 350, w: 120 },
  { x: 400, y: 280, w: 120 },
  { x: 600, y: 210, w: 120 },
  { x: 150, y: 150, w: 150 },
];

const coins: Coin[] = [
  { x: 250, y: 320, collected: false },
  { x: 450, y: 250, collected: false },
  { x: 650, y: 180, collected: false },
  { x: 200, y: 120, collected: false },
];

let score = 0;
let comboTriggered = false;
let comboTimer = 0;
let showRebind = false;

// --- Input setup ---
const inputMap = createInputMap({
  moveLeft: ["a", "ArrowLeft", "GamepadDPadLeft",
    { type: "gamepadAxis", axis: "LeftStickX", direction: -1, threshold: 0.3 }],
  moveRight: ["d", "ArrowRight", "GamepadDPadRight",
    { type: "gamepadAxis", axis: "LeftStickX", direction: 1, threshold: 0.3 }],
  jump: ["Space", "w", "ArrowUp", "GamepadA"],
  dash: ["Shift", "GamepadX"],
});

const buffer = createInputBuffer(1.0);
const dashCombo = { sequence: ["moveRight", "moveRight", "dash"], window: 0.8 };

// --- Textures ---
const playerTex = createSolidTexture("player", 60, 150, 255, 255);
const platformTex = createSolidTexture("platform", 100, 180, 100, 255);
const coinTex = createSolidTexture("coin", 255, 220, 50, 255);
const bgTex = createSolidTexture("bg", 30, 30, 50, 255);

// --- Agent ---
registerAgent({
  name: "gamepad-platformer",
  getState: () => ({ player, score, coins, showRebind }),
  actions: {
    jump: { description: "Make player jump", handler: () => {
      if (player.grounded) {
        player.vy = JUMP_SPEED;
        player.grounded = false;
      }
    }},
    toggleRebind: { description: "Toggle rebind screen", handler: () => {
      showRebind = !showRebind;
    }},
  },
});

let font: any = null;

// --- Game loop ---
onFrame(() => {
  const dt = getDeltaTime();
  const vpw = getViewportSize().width;
  const vph = getViewportSize().height;
  if (!font) font = getDefaultFont();

  setCamera(vpw / 2, vph / 2);
  setBackgroundColor(0.08, 0.08, 0.12);

  // Update input buffer
  let time = performance.now() / 1000;
  updateInputBuffer(buffer, inputMap, time);

  // Check dash combo
  if (checkCombo(buffer, dashCombo, time)) {
    consumeCombo(buffer, dashCombo);
    comboTriggered = true;
    comboTimer = 1.0;
    player.vx = player.facing * 600;
  }

  if (comboTimer > 0) comboTimer -= dt;

  // --- Movement ---
  let moveX = 0;
  if (isActionDown("moveLeft", inputMap)) moveX -= 1;
  if (isActionDown("moveRight", inputMap)) moveX += 1;

  // Also blend gamepad analog stick (gives smoother control)
  const stickX = getGamepadAxis("LeftStickX");
  if (Math.abs(stickX) > 0.3) {
    moveX = stickX;
  }

  // Touch movement (left half = left, right half = right)
  if (isTouchActive()) {
    const touch = getTouchPosition(0);
    if (touch.x < vpw / 3) moveX = -1;
    else if (touch.x > vpw * 2 / 3) moveX = 1;
    else if (player.grounded) {
      // Touch center = jump
      player.vy = JUMP_SPEED;
      player.grounded = false;
    }
  }

  player.vx = moveX * MOVE_SPEED;
  if (moveX > 0) player.facing = 1;
  if (moveX < 0) player.facing = -1;

  // Jump
  if (isActionPressed("jump", inputMap) && player.grounded) {
    player.vy = JUMP_SPEED;
    player.grounded = false;
  }

  // Physics
  player.vy += GRAVITY * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Platform collision
  player.grounded = false;
  for (const plat of platforms) {
    if (
      player.x + player.width / 2 > plat.x &&
      player.x - player.width / 2 < plat.x + plat.w &&
      player.y + player.height > plat.y &&
      player.y + player.height < plat.y + PLATFORM_H + player.vy * dt + 5 &&
      player.vy >= 0
    ) {
      player.y = plat.y - player.height;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Clamp to screen
  if (player.x < 0) player.x = 0;
  if (player.x > vpw - player.width) player.x = vpw - player.width;

  // Coin collection
  for (const coin of coins) {
    if (coin.collected) continue;
    const dx = player.x + player.width / 2 - coin.x;
    const dy = player.y + player.height / 2 - coin.y;
    if (Math.sqrt(dx * dx + dy * dy) < 24) {
      coin.collected = true;
      score += 10;
    }
  }

  // --- Render ---
  clearSprites();

  // Background
  drawSprite(bgTex, 0, 0, vpw, vph, -10);

  // Platforms
  for (const plat of platforms) {
    drawSprite(platformTex, plat.x, plat.y, plat.w, PLATFORM_H, 0);
  }

  // Coins
  for (const coin of coins) {
    if (!coin.collected) {
      drawSprite(coinTex, coin.x - 8, coin.y - 8, 16, 16, 1);
    }
  }

  // Player
  const flashColor = comboTimer > 0 ? 0.5 + Math.sin(comboTimer * 20) * 0.5 : 0;
  drawSprite(playerTex, player.x, player.y, player.width, player.height, 2, {
    tintR: 1,
    tintG: comboTimer > 0 ? flashColor : 1,
    tintB: comboTimer > 0 ? flashColor : 1,
    flipX: player.facing < 0,
  });

  // --- HUD ---
  if (font) {
    drawText(`Score: ${score}`, 10, 10, font, { scale: 2 });

    const gpConnected = isGamepadConnected();
    const gpName = gpConnected ? getGamepadName() : "None";
    drawText(`Gamepad: ${gpConnected ? gpName : "Not connected"}`, 10, 30, font, { scale: 1 });

    drawText("WASD/Arrows/Gamepad: Move | Space/A: Jump", 10, vph - 30, font, { scale: 1 });
    drawText("R: Toggle rebind | Right,Right,Shift: Dash combo", 10, vph - 18, font, { scale: 1 });

    if (comboTriggered && comboTimer > 0) {
      drawText("DASH!", player.x - 10, player.y - 20, font, {
        scale: 2,
        tintR: 1,
        tintG: 0.8,
        tintB: 0.2,
      });
    }

    // Touch indicator
    if (isTouchActive()) {
      drawText("Touch active", 10, 50, font, { scale: 1 });
    }

    // Rebind screen overlay
    if (showRebind) {
      drawSprite(createSolidTexture("overlay", 0, 0, 0, 180), 0, 0, vpw, vph, 100);
      drawText("REBIND CONTROLS", vpw / 2 - 60, 100, font, { scale: 2 });
      drawText("(rebinding UI placeholder)", vpw / 2 - 80, 140, font, { scale: 1 });
      drawText("Press R to close", vpw / 2 - 50, 180, font, { scale: 1 });
    }
  }

  // Toggle rebind screen
  if (isKeyPressed("r")) {
    showRebind = !showRebind;
  }
});
