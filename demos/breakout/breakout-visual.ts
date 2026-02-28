/**
 * Breakout visual demo.
 *
 * Uses the TS-side collision logic for simplicity and reliability.
 */
import {
  createBreakoutGame, movePaddle, launchBall, stepPhysics,
  PADDLE_W, PADDLE_H, PADDLE_SPEED, BALL_RADIUS,
} from "./breakout.ts";
import type { BreakoutState } from "./breakout.ts";
import {
  isKeyDown, isKeyPressed, drawSprite,
} from "../../runtime/rendering/index.ts";
import { Colors, HUDLayout, rgb, drawCircle } from "../../runtime/ui/index.ts";
import { createGame, hud } from "../../runtime/game/index.ts";

// Colors
const COL_PADDLE = rgb(220, 220, 240);
const COL_BALL = rgb(255, 255, 255);
const COL_BG = rgb(20, 20, 30);
const BRICK_COLORS = [
  rgb(255, 80, 80),
  rgb(255, 160, 50),
  rgb(255, 230, 50),
  rgb(80, 220, 80),
  rgb(80, 220, 230),
  rgb(80, 120, 255),
];

// Defer viewport-dependent initialization until first frame
let state: BreakoutState = null!;
let initialized = false;

// Game setup
const game = createGame({ name: "breakout", maxDeltaTime: 1 / 30 });

game.state<BreakoutState>({
  get: () => state,
  set: (s) => { state = s; },
  describe: (s, opts) => {
    if (opts.verbosity === "minimal") {
      return `Score: ${s.score}, Lives: ${s.lives}, Phase: ${s.phase}`;
    }
    const bricksLeft = s.bricks.filter((b) => b.hp > 0).length;
    return `Score: ${s.score} | Lives: ${s.lives} | Bricks: ${bricksLeft} | Phase: ${s.phase} | Ball: (${s.ballX.toFixed(1)},${s.ballY.toFixed(1)}) | Paddle: ${s.paddleX.toFixed(1)}`;
  },
  actions: {
    moveLeft: {
      handler: (s) => movePaddle(s, -PADDLE_SPEED * (1 / 60)),
      description: "Move paddle left one step",
    },
    moveRight: {
      handler: (s) => movePaddle(s, PADDLE_SPEED * (1 / 60)),
      description: "Move paddle right one step",
    },
    launch: {
      handler: (s) => launchBall(s),
      description: "Launch the ball (only works in ready phase)",
    },
  },
});

game.onFrame((ctx) => {
  const { width, height } = ctx.viewport;

  // Initialize on first frame when viewport is valid
  if (!initialized) {
    state = createBreakoutGame(width, height);
    initialized = true;
  }

  // Input
  if (isKeyDown("ArrowLeft") || isKeyDown("a")) {
    state = movePaddle(state, -PADDLE_SPEED * ctx.dt);
  }
  if (isKeyDown("ArrowRight") || isKeyDown("d")) {
    state = movePaddle(state, PADDLE_SPEED * ctx.dt);
  }
  if (isKeyPressed("Space")) {
    if (state.phase === "ready") {
      state = launchBall(state);
    } else if (state.phase === "won" || state.phase === "lost") {
      state = createBreakoutGame(width, height);
    }
  }

  // Step TS-side physics (handles all collisions)
  if (state.phase === "playing") {
    state = stepPhysics(state, ctx.dt);
  }

  // Render

  // Background
  drawSprite({ color: COL_BG, x: 0, y: 0, w: state.fieldW, h: state.fieldH, layer: 0 });

  // Bricks
  for (const brick of state.bricks) {
    if (brick.hp <= 0) continue;
    const colorIdx = brick.row % BRICK_COLORS.length;
    drawSprite({
      color: BRICK_COLORS[colorIdx],
      x: brick.x, y: brick.y, w: brick.w, h: brick.h,
      layer: 1,
    });
  }

  // Paddle
  drawSprite({
    color: COL_PADDLE,
    x: state.paddleX, y: state.paddleY, w: PADDLE_W, h: PADDLE_H,
    layer: 2,
  });

  // Ball (circle)
  drawCircle(state.ballX, state.ballY, BALL_RADIUS, { color: COL_BALL, layer: 3 });

  // --- HUD (screen space) ---

  // Score and lives (top-left, above brick area)
  hud.text(`Score: ${state.score}`, HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y);
  hud.bar(
    HUDLayout.TOP_LEFT.x + 120,
    HUDLayout.TOP_LEFT.y + 4,
    state.lives / 3,
    { width: 60 },
  );

  // Bricks remaining (top-right)
  const bricksLeft = state.bricks.filter((b) => b.hp > 0).length;
  hud.text(`Bricks: ${bricksLeft}`, width - 120, HUDLayout.TOP_LEFT.y, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.INFO,
  });

  // Phase instructions (bottom center)
  if (state.phase === "ready") {
    hud.text("Press SPACE to launch", width / 2, height - 60, {
      scale: HUDLayout.SMALL_TEXT_SCALE,
      tint: Colors.WARNING,
      align: "center",
    });
  }

  // Win/lose screens
  if (state.phase === "won") {
    hud.label("VICTORY! Press SPACE to restart", width / 2, height / 2 - 20, {
      textColor: Colors.WIN,
      padding: 12,
      align: "center",
    });
  } else if (state.phase === "lost") {
    hud.label("GAME OVER! Press SPACE to restart", width / 2, height / 2 - 20, {
      textColor: Colors.LOSE,
      padding: 12,
      align: "center",
    });
  }
});
