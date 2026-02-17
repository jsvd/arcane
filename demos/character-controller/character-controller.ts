/**
 * Character Controller demo — Animation State Machine showcase.
 *
 * Demonstrates:
 * - Animation FSM with idle, walk, jump, fall, attack states
 * - Smooth crossfade blending between states
 * - Frame events (attack hitbox spawns on frame 2)
 * - Speed multiplier (walk animation speeds up with movement)
 * - Simple platformer physics (gravity, ground detection)
 */
import {
  drawSprite,
  setCamera,
  isKeyDown,
  isKeyPressed,
  getViewportSize,
  createSolidTexture,
  createAnimation,
  addFrameEvent,
  createAnimationFSM,
  getCurrentState,
  isBlending,
  getBlendProgress,
  updateFSM,
  drawFSMSprite,
} from "../../runtime/rendering/index.ts";
import type { FSMState } from "../../runtime/rendering/index.ts";
import {
  createGame, hud,
  createPlatformerState, platformerMove, platformerJump, platformerStep,
} from "../../runtime/game/index.ts";
import type { PlatformerState, Platform as PlatPlatform } from "../../runtime/game/index.ts";

// --- Constants ---
const GROUND_Y = 400;
const PLAYER_W = 48;
const PLAYER_H = 64;
const ATTACK_DURATION = 0.3; // seconds
const HITBOX_W = 40;
const HITBOX_H = 48;

const PLAT_CONFIG = {
  gravity: 800,
  jumpForce: -350,
  walkSpeed: 200,
  playerWidth: PLAYER_W,
  playerHeight: PLAYER_H,
};

// --- Textures (solid colors for prototyping) ---
const TEX_PLAYER_IDLE = createSolidTexture("player_idle", 100, 150, 255);
const TEX_PLAYER_WALK = createSolidTexture("player_walk", 80, 130, 235);
const TEX_PLAYER_JUMP = createSolidTexture("player_jump", 120, 170, 255);
const TEX_PLAYER_FALL = createSolidTexture("player_fall", 90, 140, 245);
const TEX_PLAYER_ATTACK = createSolidTexture("player_attack", 255, 100, 100);
const TEX_GROUND = createSolidTexture("cc_ground", 60, 120, 40);
const TEX_PLATFORM = createSolidTexture("cc_platform", 80, 60, 40);
const TEX_BG = createSolidTexture("cc_bg", 25, 25, 45);
const TEX_HITBOX = createSolidTexture("cc_hitbox", 255, 50, 50);
const TEX_ENEMY = createSolidTexture("cc_enemy", 200, 50, 50);

// --- Animations ---
// Each animation uses a solid-color texture as a 1-frame "spritesheet" for prototyping.
// In a real game, these would be multi-frame spritesheets.
const idleAnim = createAnimation(TEX_PLAYER_IDLE, 48, 64, 4, 4);
const walkAnim = createAnimation(TEX_PLAYER_WALK, 48, 64, 6, 10);
const jumpAnim = createAnimation(TEX_PLAYER_JUMP, 48, 64, 2, 8, { loop: false });
const fallAnim = createAnimation(TEX_PLAYER_FALL, 48, 64, 2, 6);
const attackAnim = createAnimation(TEX_PLAYER_ATTACK, 48, 64, 4, 12, { loop: false });

// --- Frame events: attack hitbox on frame 2 ---
let activeHitbox: { x: number; y: number; w: number; h: number; timer: number } | null = null;

addFrameEvent(attackAnim, 1, () => {
  // Spawn hitbox in front of the character
  const hbX = pState.facingRight
    ? pState.x + PLAYER_W
    : pState.x - HITBOX_W;
  activeHitbox = { x: hbX, y: pState.y + 8, w: HITBOX_W, h: HITBOX_H, timer: 0.1 };
});

// --- Platforms ---
const platforms: PlatPlatform[] = [
  { x: 0, y: GROUND_Y, w: 1600, h: 40 },        // ground
  { x: 200, y: 320, w: 120, h: 16 },              // platform 1
  { x: 450, y: 260, w: 150, h: 16 },              // platform 2
  { x: 700, y: 200, w: 100, h: 16 },              // platform 3
  { x: 900, y: 300, w: 160, h: 16 },              // platform 4
];

// --- Enemies (simple stationary targets) ---
type Enemy = { x: number; y: number; w: number; h: number; alive: boolean };
const enemies: Enemy[] = [
  { x: 500, y: GROUND_Y - 40, w: 32, h: 40, alive: true },
  { x: 750, y: 200 - 40, w: 32, h: 40, alive: true },
  { x: 1000, y: GROUND_Y - 40, w: 32, h: 40, alive: true },
];

// --- Player state (uses platformer controller) ---
let pState: PlatformerState = createPlatformerState(100, GROUND_Y - PLAYER_H);
pState = { ...pState, onGround: true };
let attackCooldown = 0;
let score = 0;

// --- Animation FSM ---
let fsm: FSMState = createAnimationFSM({
  states: {
    idle: { animationId: idleAnim },
    walk: { animationId: walkAnim },
    jump: { animationId: jumpAnim },
    fall: { animationId: fallAnim },
    attack: { animationId: attackAnim },
  },
  transitions: [
    // Attack (highest priority, from any state)
    { from: "any", to: "attack", condition: { type: "trigger", param: "attack" }, priority: 20, blendDuration: 0.05 },
    { from: "attack", to: "idle", condition: { type: "animationFinished" }, blendDuration: 0.1 },

    // Air states (high priority)
    { from: "idle", to: "jump", condition: { type: "boolean", param: "jumping" }, priority: 10, blendDuration: 0.05 },
    { from: "walk", to: "jump", condition: { type: "boolean", param: "jumping" }, priority: 10, blendDuration: 0.05 },
    { from: "jump", to: "fall", condition: { type: "boolean", param: "falling" }, priority: 5, blendDuration: 0.1 },
    { from: "fall", to: "idle", condition: { type: "boolean", param: "grounded" }, priority: 5, blendDuration: 0.08 },
    { from: "jump", to: "idle", condition: { type: "boolean", param: "grounded" }, priority: 5, blendDuration: 0.08 },

    // Ground movement
    { from: "idle", to: "walk", condition: { type: "boolean", param: "moving" }, priority: 1, blendDuration: 0.1 },
    { from: "walk", to: "idle", condition: { type: "boolean", param: "moving", negate: true }, priority: 1, blendDuration: 0.1 },
  ],
  initialState: "idle",
  defaultBlendDuration: 0.1,
});

// --- Collision ---
function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// --- Camera setup ---
const vpSize = getViewportSize();
const vpW = vpSize.width || 800;
const vpH = vpSize.height || 600;
setCamera(vpW / 2, vpH / 2, 1);

// --- Game bootstrap ---
const game = createGame({ name: "character-controller", autoCamera: false });

game.state({
  get: () => ({
    playerX: pState.x, playerY: pState.y,
    velX: pState.vx, velY: pState.vy,
    onGround: pState.onGround, facingRight: pState.facingRight,
    currentState: getCurrentState(fsm),
    isBlending: isBlending(fsm),
    blendProgress: getBlendProgress(fsm),
    score,
    enemiesAlive: enemies.filter(e => e.alive).length,
  }),
  set: () => {},
  describe: (s: any) => {
    return `Player at (${s.playerX.toFixed(0)}, ${s.playerY.toFixed(0)}) | State: ${s.currentState} | Score: ${s.score} | Enemies: ${s.enemiesAlive}`;
  },
  actions: {
    jump: { handler: (s: any) => s, description: "Jump" },
    attack: { handler: (s: any) => s, description: "Attack" },
  },
});

// --- Game loop ---
game.onFrame((ctx) => {
  const dt = ctx.dt;

  // --- Input ---
  let moveDir = 0;
  if (isKeyDown("ArrowLeft") || isKeyDown("a")) moveDir = -1;
  if (isKeyDown("ArrowRight") || isKeyDown("d")) moveDir = 1;

  const wantJump = isKeyPressed("Space") || isKeyPressed("ArrowUp") || isKeyPressed("w");
  const wantAttack = isKeyPressed("x") || isKeyPressed("j");

  // --- Physics (via platformer controller) ---
  const inAttack = getCurrentState(fsm) === "attack";

  // Horizontal movement (locked during attack)
  if (!inAttack) {
    pState = platformerMove(pState, moveDir as (-1 | 0 | 1), false, PLAT_CONFIG);
  } else {
    pState = platformerMove(pState, 0, false, PLAT_CONFIG);
  }

  // Jump
  let triggerJump = false;
  if (wantJump && !inAttack) {
    const before = pState;
    pState = platformerJump(pState, PLAT_CONFIG);
    triggerJump = pState.vy < before.vy;
  }

  // Attack
  let triggerAttack = false;
  if (wantAttack && attackCooldown <= 0) {
    triggerAttack = true;
    attackCooldown = ATTACK_DURATION + 0.1;
  }
  if (attackCooldown > 0) attackCooldown -= dt;

  // Gravity + movement + platform collision
  pState = platformerStep(pState, dt, platforms, PLAT_CONFIG);

  // World bounds
  if (pState.x < 0) pState = { ...pState, x: 0, vx: 0 };
  if (pState.x > 1560) pState = { ...pState, x: 1560, vx: 0 };
  if (pState.y > GROUND_Y + 100) {
    // Fell off screen, respawn
    pState = { ...pState, x: 100, y: GROUND_Y - PLAYER_H, vx: 0, vy: 0, onGround: true };
  }

  // --- Hitbox logic ---
  if (activeHitbox) {
    activeHitbox.timer -= dt;
    // Update hitbox position to follow player if attacking
    if (getCurrentState(fsm) === "attack") {
      activeHitbox.x = pState.facingRight ? pState.x + PLAYER_W : pState.x - HITBOX_W;
      activeHitbox.y = pState.y + 8;
    }
    // Check enemy collision
    for (const enemy of enemies) {
      if (
        enemy.alive &&
        rectOverlap(
          activeHitbox.x, activeHitbox.y, activeHitbox.w, activeHitbox.h,
          enemy.x, enemy.y, enemy.w, enemy.h,
        )
      ) {
        enemy.alive = false;
        score += 100;
      }
    }
    if (activeHitbox.timer <= 0) {
      activeHitbox = null;
    }
  }

  // --- Update FSM ---
  const isMoving = Math.abs(pState.vx) > 10;
  const isFalling = pState.vy > 50 && !pState.onGround;
  const isJumping = pState.vy < -10 && !pState.onGround;

  fsm = updateFSM(fsm, dt, {
    moving: isMoving,
    jumping: isJumping,
    falling: isFalling,
    grounded: pState.onGround,
    attack: triggerAttack,
  });

  // --- Render ---

  // Background
  drawSprite({ textureId: TEX_BG, x: 0, y: 0, w: 1600, h: 600, layer: -10 });

  // Platforms
  for (const plat of platforms) {
    const tex = plat.h > 20 ? TEX_GROUND : TEX_PLATFORM;
    drawSprite({ textureId: tex, x: plat.x, y: plat.y, w: plat.w, h: plat.h, layer: 0 });
  }

  // Enemies
  for (const enemy of enemies) {
    if (enemy.alive) {
      drawSprite({ textureId: TEX_ENEMY, x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h, layer: 1 });
    }
  }

  // Active hitbox (debug visualization)
  if (activeHitbox) {
    drawSprite({
      textureId: TEX_HITBOX,
      x: activeHitbox.x, y: activeHitbox.y,
      w: activeHitbox.w, h: activeHitbox.h,
      layer: 5,
      tint: { r: 1, g: 0.3, b: 0.3, a: 0.5 },
    });
  }

  // Player (via FSM)
  drawFSMSprite(fsm, pState.x, pState.y, PLAYER_W, PLAYER_H, {
    layer: 2,
    flipX: !pState.facingRight,
  });

  // --- HUD ---
  const state = getCurrentState(fsm);
  const blending = isBlending(fsm);
  const blendProg = getBlendProgress(fsm);

  hud.text(`State: ${state}${blending ? ` (blend ${(blendProg * 100).toFixed(0)}%)` : ""}`, 10, 10);
  hud.text(`Score: ${score}`, 10, 30);
  hud.text(`Vel: (${pState.vx.toFixed(0)}, ${pState.vy.toFixed(0)})`, 10, 50);
  hud.text(`Ground: ${pState.onGround}`, 10, 70);
  hud.text("Arrows/WASD: move  |  Space/Up: jump  |  X/J: attack", 10, 560, { scale: 1.5 });
});
