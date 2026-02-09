import {
  createBreakoutGame, stepPhysics, movePaddle, launchBall,
  FIELD_W, FIELD_H, PADDLE_W, PADDLE_H, PADDLE_Y, PADDLE_SPEED, BALL_RADIUS,
} from "./breakout.ts";
import {
  onFrame, drawSprite, clearSprites, setCamera,
  isKeyDown, isKeyPressed, getDeltaTime, createSolidTexture,
} from "../../runtime/rendering/index.ts";

// Textures
const TEX_PADDLE = createSolidTexture("paddle", 220, 220, 240);
const TEX_BALL = createSolidTexture("ball", 255, 255, 255);
const TEX_BG = createSolidTexture("bg", 20, 20, 30);
const BRICK_COLORS = [
  createSolidTexture("brick_red", 255, 80, 80),
  createSolidTexture("brick_orange", 255, 160, 50),
  createSolidTexture("brick_yellow", 255, 230, 50),
  createSolidTexture("brick_green", 80, 220, 80),
  createSolidTexture("brick_cyan", 80, 220, 230),
  createSolidTexture("brick_blue", 80, 120, 255),
];

let state = createBreakoutGame();

// Center camera on field
setCamera(FIELD_W / 2, FIELD_H / 2, 1);

onFrame(() => {
  const dt = getDeltaTime();

  // Input
  if (isKeyDown("ArrowLeft") || isKeyDown("a")) {
    state = movePaddle(state, -PADDLE_SPEED * dt);
  }
  if (isKeyDown("ArrowRight") || isKeyDown("d")) {
    state = movePaddle(state, PADDLE_SPEED * dt);
  }
  if (isKeyPressed("Space")) {
    if (state.phase === "ready") {
      state = launchBall(state);
    } else if (state.phase === "won" || state.phase === "lost") {
      state = createBreakoutGame();
    }
  }

  // Physics
  state = stepPhysics(state, dt);

  // Render
  clearSprites();

  // Background
  drawSprite({ textureId: TEX_BG, x: 0, y: 0, w: FIELD_W, h: FIELD_H, layer: 0 });

  // Bricks
  for (const brick of state.bricks) {
    if (brick.hp <= 0) continue;
    const colorIdx = brick.row % BRICK_COLORS.length;
    drawSprite({
      textureId: BRICK_COLORS[colorIdx],
      x: brick.x, y: brick.y, w: brick.w, h: brick.h,
      layer: 1,
    });
  }

  // Paddle
  drawSprite({
    textureId: TEX_PADDLE,
    x: state.paddleX, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H,
    layer: 2,
  });

  // Ball
  drawSprite({
    textureId: TEX_BALL,
    x: state.ballX - BALL_RADIUS, y: state.ballY - BALL_RADIUS,
    w: BALL_RADIUS * 2, h: BALL_RADIUS * 2,
    layer: 3,
  });
});
