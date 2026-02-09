import { aabbOverlap } from "../../runtime/physics/index.ts";
import type { AABB } from "../../runtime/physics/index.ts";

// Constants
export const GRAVITY = 800;
export const JUMP_VEL = -350;
export const MOVE_SPEED = 200;
export const PLAYER_W = 24;
export const PLAYER_H = 32;
export const MAX_DT = 1 / 30;

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

export function applyGravity(state: PlatformerState, dt: number): PlatformerState {
  return {
    ...state,
    playerVY: state.playerVY + GRAVITY * dt,
  };
}

export function movePlayer(
  state: PlatformerState,
  direction: -1 | 0 | 1,
  dt: number,
): PlatformerState {
  const vx = direction * MOVE_SPEED;
  const facing: "left" | "right" =
    direction < 0 ? "left" : direction > 0 ? "right" : state.facing;
  return {
    ...state,
    playerVX: vx,
    playerX: state.playerX + vx * dt,
    facing,
  };
}

export function jump(state: PlatformerState): PlatformerState {
  if (!state.onGround) return state;
  return {
    ...state,
    playerVY: JUMP_VEL,
    onGround: false,
  };
}

function playerAABB(state: PlatformerState): AABB {
  return { x: state.playerX, y: state.playerY, w: PLAYER_W, h: PLAYER_H };
}

export function stepPhysics(state: PlatformerState, rawDt: number): PlatformerState {
  if (state.phase !== "playing") return state;
  const dt = Math.min(rawDt, MAX_DT);

  let s = applyGravity(state, dt);

  // Move vertically
  s = { ...s, playerY: s.playerY + s.playerVY * dt };

  // Platform collision (vertical)
  let onGround = false;
  const pBox = playerAABB(s);
  for (const plat of s.platforms) {
    if (!aabbOverlap(pBox, plat)) continue;

    if (s.playerVY > 0) {
      // Falling: land on top
      const prevBottom = state.playerY + PLAYER_H;
      if (prevBottom <= plat.y + 2) {
        s = { ...s, playerY: plat.y - PLAYER_H, playerVY: 0 };
        onGround = true;
      }
    } else if (s.playerVY < 0) {
      // Hitting head on bottom of platform
      const prevTop = state.playerY;
      if (prevTop >= plat.y + plat.h - 2) {
        s = { ...s, playerY: plat.y + plat.h, playerVY: 0 };
      }
    }
  }
  s = { ...s, onGround };

  // Collect coins
  const pBoxFinal = playerAABB(s);
  let score = s.score;
  const coins = s.coins.map((coin) => {
    if (coin.collected) return coin;
    const coinBox: AABB = { x: coin.x, y: coin.y, w: 16, h: 16 };
    if (aabbOverlap(pBoxFinal, coinBox)) {
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
