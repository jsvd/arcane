import { aabbOverlap } from "../../runtime/physics/index.ts";
import type { AABB } from "../../runtime/physics/index.ts";
import {
  platformerMove,
  platformerJump,
  platformerStep,
} from "../../runtime/game/index.ts";
import type { PlatformerState as ControllerState } from "../../runtime/game/index.ts";

// Constants
export const GRAVITY = 800;
export const JUMP_VEL = -450;
export const MOVE_SPEED = 200;
export const PLAYER_W = 24;
export const PLAYER_H = 32;
export const MAX_DT = 1 / 30;

/** Platformer controller config matching legacy constants. */
const PLAT_CONFIG = {
  gravity: GRAVITY,
  jumpForce: JUMP_VEL,
  walkSpeed: MOVE_SPEED,
  playerWidth: PLAYER_W,
  playerHeight: PLAYER_H,
};

export type Platform = { x: number; y: number; w: number; h: number };
export type Coin = { x: number; y: number; collected: boolean };

export type PlatformerState = {
  playerX: number;
  playerY: number;
  playerVX: number;
  playerVY: number;
  onGround: boolean;
  facing: "left" | "right";
  platforms: Platform[];
  coins: Coin[];
  score: number;
  lives: number;
  phase: "playing" | "won" | "dead";
};

export function buildLevel(): { platforms: Platform[]; coins: Coin[] } {
  const platforms: Platform[] = [
    // Ground
    { x: 0, y: 550, w: 800, h: 50 },
    // Floating platforms
    { x: 150, y: 430, w: 120, h: 16 },
    { x: 350, y: 350, w: 120, h: 16 },
    { x: 550, y: 270, w: 120, h: 16 },
    { x: 200, y: 200, w: 120, h: 16 },
    { x: 400, y: 130, w: 120, h: 16 },
    // Left ledge
    { x: 0, y: 300, w: 80, h: 16 },
    // Right ledge
    { x: 700, y: 400, w: 100, h: 16 },
  ];

  const coins: Coin[] = [
    { x: 195, y: 405, collected: false },
    { x: 395, y: 325, collected: false },
    { x: 595, y: 245, collected: false },
    { x: 245, y: 175, collected: false },
    { x: 445, y: 105, collected: false },
    { x: 30, y: 275, collected: false },
    { x: 740, y: 375, collected: false },
  ];

  return { platforms, coins };
}

export function createPlatformerGame(): PlatformerState {
  const { platforms, coins } = buildLevel();
  return {
    playerX: 100,
    playerY: 500,
    playerVX: 0,
    playerVY: 0,
    onGround: false,
    facing: "right",
    platforms,
    coins,
    score: 0,
    lives: 3,
    phase: "playing",
  };
}

/** Convert game state to internal controller state. */
function toController(state: PlatformerState): ControllerState {
  return {
    x: state.playerX,
    y: state.playerY,
    vx: state.playerVX,
    vy: state.playerVY,
    onGround: state.onGround,
    facingRight: state.facing === "right",
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    externalVx: 0,
    externalVy: 0,
  };
}

/** Sync controller state back to game state. */
function fromController(state: PlatformerState, ctrl: ControllerState): PlatformerState {
  return {
    ...state,
    playerX: ctrl.x,
    playerY: ctrl.y,
    playerVX: ctrl.vx,
    playerVY: ctrl.vy,
    onGround: ctrl.onGround,
    facing: ctrl.facingRight ? "right" : "left",
  };
}

export function applyGravity(state: PlatformerState, dt: number): PlatformerState {
  return {
    ...state,
    playerVY: state.playerVY + GRAVITY * dt,
  };
}

export function movePlayer(
  state: PlatformerState,
  direction: -1 | 0 | 1,
  _dt: number,
): PlatformerState {
  const ctrl = toController(state);
  const moved = platformerMove(ctrl, direction, false, PLAT_CONFIG);
  return fromController(state, moved);
}

export function jump(state: PlatformerState): PlatformerState {
  const ctrl = toController(state);
  const jumped = platformerJump(ctrl, PLAT_CONFIG);
  return fromController(state, jumped);
}

export function stepPhysics(state: PlatformerState, rawDt: number): PlatformerState {
  if (state.phase !== "playing") return state;
  const dt = Math.min(rawDt, MAX_DT);

  // Use platformer controller for physics + collision
  const ctrl = toController(state);
  const stepped = platformerStep(ctrl, dt, state.platforms, PLAT_CONFIG);
  let s = fromController(state, stepped);

  // Collect coins
  const pBox: AABB = { x: s.playerX, y: s.playerY, w: PLAYER_W, h: PLAYER_H };
  let score = s.score;
  const coins = s.coins.map((coin) => {
    if (coin.collected) return coin;
    const coinBox: AABB = { x: coin.x, y: coin.y, w: 16, h: 16 };
    if (aabbOverlap(pBox, coinBox)) {
      score += 100;
      return { ...coin, collected: true };
    }
    return coin;
  });
  s = { ...s, coins, score };

  // Check win condition
  if (coins.every((c) => c.collected)) {
    s = { ...s, phase: "won" };
  }

  // Boundary: fall off bottom = lose a life
  if (s.playerY > 650) {
    const newLives = s.lives - 1;
    if (newLives <= 0) {
      s = { ...s, lives: 0, phase: "dead" };
    } else {
      // Respawn
      s = {
        ...s,
        playerX: 100,
        playerY: 500,
        playerVX: 0,
        playerVY: 0,
        onGround: false,
        lives: newLives,
      };
    }
  }

  // Clamp horizontal position
  if (s.playerX < 0) s = { ...s, playerX: 0, playerVX: 0 };
  if (s.playerX + PLAYER_W > 800) s = { ...s, playerX: 800 - PLAYER_W, playerVX: 0 };

  return s;
}
