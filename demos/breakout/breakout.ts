import { circleAABBOverlap, circleAABBResolve } from "../../runtime/physics/index.ts";
import type { AABB } from "../../runtime/physics/index.ts";

// Game constants (not resolution-dependent)
export const PADDLE_W = 100;
export const PADDLE_H = 14;
export const PADDLE_SPEED = 500;
export const BALL_RADIUS = 6;
export const BALL_SPEED = 350;
export const BRICK_W = 60;
export const BRICK_H = 20;
export const BRICK_GAP = 4;
export const BRICK_ROWS = 6;
export const BRICK_COLS = 11;
export const BRICK_TOP = 50;

export type Brick = { x: number; y: number; w: number; h: number; hp: number; row: number };

export type BreakoutState = {
  // Viewport dimensions (resolution-adaptive)
  fieldW: number;
  fieldH: number;
  paddleY: number;
  brickLeft: number;
  // Game state
  paddleX: number;
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  bricks: Brick[];
  score: number;
  lives: number;
  phase: "ready" | "playing" | "won" | "lost";
};

export function buildLevel(brickLeft: number): Brick[] {
  const bricks: Brick[] = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: brickLeft + col * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        hp: 1,
        row,
      });
    }
  }
  return bricks;
}

export function createBreakoutGame(fieldW = 800, fieldH = 600): BreakoutState {
  const paddleY = fieldH - 40;
  const brickLeft = (fieldW - BRICK_COLS * (BRICK_W + BRICK_GAP) + BRICK_GAP) / 2;

  return {
    fieldW,
    fieldH,
    paddleY,
    brickLeft,
    paddleX: fieldW / 2 - PADDLE_W / 2,
    ballX: fieldW / 2,
    ballY: paddleY - BALL_RADIUS - 1,
    ballVX: 0,
    ballVY: 0,
    bricks: buildLevel(brickLeft),
    score: 0,
    lives: 3,
    phase: "ready",
  };
}

export function launchBall(state: BreakoutState): BreakoutState {
  if (state.phase !== "ready") return state;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
  return {
    ...state,
    phase: "playing",
    ballVX: Math.cos(angle) * BALL_SPEED,
    ballVY: Math.sin(angle) * BALL_SPEED,
  };
}

export function movePaddle(state: BreakoutState, dx: number): BreakoutState {
  const newX = Math.max(0, Math.min(state.fieldW - PADDLE_W, state.paddleX + dx));
  const result = { ...state, paddleX: newX };
  // In ready phase, ball follows paddle
  if (state.phase === "ready") {
    result.ballX = newX + PADDLE_W / 2;
    result.ballY = state.paddleY - BALL_RADIUS - 1;
  }
  return result;
}

export function stepPhysics(state: BreakoutState, dt: number): BreakoutState {
  if (state.phase !== "playing") return state;

  let { ballX, ballY, ballVX, ballVY, bricks, score, lives } = state;
  let phase: "ready" | "playing" | "won" | "lost" = state.phase;
  const paddleX = state.paddleX;

  // Move ball
  ballX += ballVX * dt;
  ballY += ballVY * dt;

  // Wall collisions (left, right, top)
  if (ballX - BALL_RADIUS < 0) {
    ballX = BALL_RADIUS;
    ballVX = Math.abs(ballVX);
  }
  if (ballX + BALL_RADIUS > state.fieldW) {
    ballX = state.fieldW - BALL_RADIUS;
    ballVX = -Math.abs(ballVX);
  }
  if (ballY - BALL_RADIUS < 0) {
    ballY = BALL_RADIUS;
    ballVY = Math.abs(ballVY);
  }

  // Paddle collision
  const paddleBox: AABB = { x: paddleX, y: state.paddleY, w: PADDLE_W, h: PADDLE_H };
  if (ballVY > 0 && circleAABBOverlap(ballX, ballY, BALL_RADIUS, paddleBox)) {
    ballY = state.paddleY - BALL_RADIUS;
    // Angle depends on where ball hits paddle (-60deg to +60deg)
    const hitPos = (ballX - paddleX) / PADDLE_W; // 0..1
    const angle = (hitPos - 0.5) * (Math.PI * 2 / 3); // -60deg to +60deg
    const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    ballVX = Math.sin(angle) * speed;
    ballVY = -Math.cos(angle) * speed;
  }

  // Brick collisions
  const newBricks: Brick[] = [];
  for (const brick of bricks) {
    if (brick.hp <= 0) {
      newBricks.push(brick);
      continue;
    }
    const brickBox: AABB = { x: brick.x, y: brick.y, w: brick.w, h: brick.h };
    const normal = circleAABBResolve(ballX, ballY, BALL_RADIUS, brickBox);
    if (normal) {
      // Reflect ball
      if (Math.abs(normal.nx) > Math.abs(normal.ny)) {
        ballVX = Math.abs(ballVX) * (normal.nx > 0 ? 1 : -1);
      } else {
        ballVY = Math.abs(ballVY) * (normal.ny > 0 ? 1 : -1);
      }
      newBricks.push({ ...brick, hp: brick.hp - 1 });
      score += 10;
    } else {
      newBricks.push(brick);
    }
  }
  bricks = newBricks;

  // Bottom boundary — lose life
  if (ballY + BALL_RADIUS > state.fieldH) {
    lives--;
    if (lives <= 0) {
      phase = "lost";
    } else {
      // Reset ball position
      return {
        ...state,
        ballX: state.paddleX + PADDLE_W / 2,
        ballY: state.paddleY - BALL_RADIUS - 1,
        ballVX: 0,
        ballVY: 0,
        bricks,
        score,
        lives,
        phase: "ready",
      };
    }
  }

  // Win condition
  const aliveBricks = bricks.filter(b => b.hp > 0);
  if (aliveBricks.length === 0) {
    phase = "won";
  }

  return { ...state, ballX, ballY, ballVX, ballVY, bricks, score, lives, phase };
}
