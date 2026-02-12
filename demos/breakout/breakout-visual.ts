/**
 * Breakout visual demo — retrofitted with Rust physics engine (Phase 11).
 *
 * Ball, paddle, walls, and bricks are all physics bodies.
 * The paddle-angle mechanic (launch angle based on hit position) is
 * applied on top of the physics contacts.
 */
import {
  createBreakoutGame, movePaddle, launchBall, buildLevel,
  PADDLE_W, PADDLE_H, PADDLE_SPEED, BALL_RADIUS, BALL_SPEED,
} from "./breakout.ts";
import type { BreakoutState, Brick } from "./breakout.ts";
import {
  onFrame, drawSprite, clearSprites, setCamera,
  isKeyDown, isKeyPressed, getDeltaTime, createSolidTexture,
  drawText, getViewportSize,
} from "../../runtime/rendering/index.ts";
import { drawBar, drawLabel, Colors, HUDLayout } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";
import {
  createPhysicsWorld,
  stepPhysics as physicsStep,
  destroyPhysicsWorld,
  createBody,
  removeBody,
  getBodyState,
  setBodyVelocity,
  setBodyPosition,
  setKinematicVelocity,
  getContacts,
} from "../../runtime/physics/index.ts";
import type { BodyId } from "../../runtime/physics/index.ts";

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

const { width, height } = getViewportSize();
let state = createBreakoutGame(width, height);

// Physics body tracking
let ballBody: BodyId = 0;
let paddleBody: BodyId = 0;
const brickBodies: Map<BodyId, number> = new Map(); // bodyId → brick index
let wallTopBody: BodyId = 0;
let wallLeftBody: BodyId = 0;
let wallRightBody: BodyId = 0;

function initPhysicsWorld(): void {
  destroyPhysicsWorld();
  brickBodies.clear();

  // No gravity for breakout — ball moves in straight lines
  createPhysicsWorld({ gravityX: 0, gravityY: 0 });

  const fw = state.fieldW;
  const fh = state.fieldH;

  // Walls (static AABBs)
  wallTopBody = createBody({
    type: "static",
    shape: { type: "aabb", halfW: fw / 2, halfH: 10 },
    x: fw / 2,
    y: -10,
    material: { restitution: 1.0, friction: 0 },
  });
  wallLeftBody = createBody({
    type: "static",
    shape: { type: "aabb", halfW: 10, halfH: fh / 2 },
    x: -10,
    y: fh / 2,
    material: { restitution: 1.0, friction: 0 },
  });
  wallRightBody = createBody({
    type: "static",
    shape: { type: "aabb", halfW: 10, halfH: fh / 2 },
    x: fw + 10,
    y: fh / 2,
    material: { restitution: 1.0, friction: 0 },
  });

  // Paddle (kinematic AABB)
  paddleBody = createBody({
    type: "kinematic",
    shape: { type: "aabb", halfW: PADDLE_W / 2, halfH: PADDLE_H / 2 },
    x: state.paddleX + PADDLE_W / 2,
    y: state.paddleY + PADDLE_H / 2,
    material: { restitution: 1.0, friction: 0 },
  });

  // Ball (dynamic circle)
  ballBody = createBody({
    type: "dynamic",
    shape: { type: "circle", radius: BALL_RADIUS },
    x: state.ballX,
    y: state.ballY,
    mass: 1.0,
    material: { restitution: 1.0, friction: 0 },
  });

  // Bricks (static AABBs)
  for (let i = 0; i < state.bricks.length; i++) {
    const brick = state.bricks[i];
    if (brick.hp <= 0) continue;
    const bx = brick.x + brick.w / 2;
    const by = brick.y + brick.h / 2;
    const bid = createBody({
      type: "static",
      shape: { type: "aabb", halfW: brick.w / 2, halfH: brick.h / 2 },
      x: bx,
      y: by,
      material: { restitution: 1.0, friction: 0 },
    });
    brickBodies.set(bid, i);
  }
}

// Initialize physics
initPhysicsWorld();

// Sync ball position to physics on launch
function syncBallToPhysics(): void {
  setBodyPosition(ballBody, state.ballX, state.ballY);
  setBodyVelocity(ballBody, state.ballVX, state.ballVY);
}

// Agent protocol
registerAgent<BreakoutState>({
  name: "breakout",
  getState: () => state,
  setState: (s) => { state = s; },
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
      handler: (s) => {
        if (s.phase !== "ready") return s;
        const ns = launchBall(s);
        syncBallToPhysics();
        return ns;
      },
      description: "Launch the ball (only works in ready phase)",
    },
  },
});

onFrame(() => {
  setCamera(state.fieldW / 2, state.fieldH / 2, 1);
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
      syncBallToPhysics();
    } else if (state.phase === "won" || state.phase === "lost") {
      state = createBreakoutGame(width, height);
      initPhysicsWorld();
    }
  }

  // Update paddle physics body to match game state
  const paddleCenterX = state.paddleX + PADDLE_W / 2;
  const paddleCenterY = state.paddleY + PADDLE_H / 2;
  setBodyPosition(paddleBody, paddleCenterX, paddleCenterY);

  if (state.phase === "playing") {
    // Step Rust physics
    physicsStep(dt);

    // Read ball position from physics
    const ballState = getBodyState(ballBody);
    state = { ...state, ballX: ballState.x, ballY: ballState.y, ballVX: ballState.vx, ballVY: ballState.vy };

    // Process contacts
    const contacts = getContacts();
    for (const contact of contacts) {
      const aIsball = contact.bodyA === ballBody;
      const bIsBall = contact.bodyB === ballBody;
      if (!aIsball && !bIsBall) continue;

      const otherId = aIsball ? contact.bodyB : contact.bodyA;

      // Paddle hit: apply angle mechanic
      if (otherId === paddleBody) {
        const hitPos = (state.ballX - state.paddleX) / PADDLE_W;
        const angle = (hitPos - 0.5) * (Math.PI * 2 / 3);
        const speed = Math.sqrt(state.ballVX * state.ballVX + state.ballVY * state.ballVY);
        const clampedSpeed = Math.max(speed, BALL_SPEED);
        const newVX = Math.sin(angle) * clampedSpeed;
        const newVY = -Math.cos(angle) * clampedSpeed;
        setBodyVelocity(ballBody, newVX, newVY);
        state = { ...state, ballVX: newVX, ballVY: newVY };
      }

      // Brick hit: destroy brick
      if (brickBodies.has(otherId)) {
        const brickIdx = brickBodies.get(otherId)!;
        if (state.bricks[brickIdx].hp > 0) {
          const newBricks = [...state.bricks];
          newBricks[brickIdx] = { ...newBricks[brickIdx], hp: 0 };
          state = { ...state, bricks: newBricks, score: state.score + 10 };
          removeBody(otherId);
          brickBodies.delete(otherId);
        }
      }
    }

    // Bottom boundary — lose life
    if (state.ballY + BALL_RADIUS > state.fieldH) {
      state = { ...state, lives: state.lives - 1 };
      if (state.lives <= 0) {
        state = { ...state, phase: "lost" };
      } else {
        state = {
          ...state,
          ballX: state.paddleX + PADDLE_W / 2,
          ballY: state.paddleY - BALL_RADIUS - 1,
          ballVX: 0,
          ballVY: 0,
          phase: "ready",
        };
        setBodyPosition(ballBody, state.ballX, state.ballY);
        setBodyVelocity(ballBody, 0, 0);
      }
    }

    // Win condition
    const aliveBricks = state.bricks.filter(b => b.hp > 0);
    if (aliveBricks.length === 0 && state.phase === "playing") {
      state = { ...state, phase: "won" };
    }
  } else if (state.phase === "ready") {
    // Ball follows paddle
    const bx = state.paddleX + PADDLE_W / 2;
    const by = state.paddleY - BALL_RADIUS - 1;
    state = { ...state, ballX: bx, ballY: by };
    setBodyPosition(ballBody, bx, by);
    setBodyVelocity(ballBody, 0, 0);
  }

  // Render
  clearSprites();

  // Background
  drawSprite({ textureId: TEX_BG, x: 0, y: 0, w: state.fieldW, h: state.fieldH, layer: 0 });

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
    x: state.paddleX, y: state.paddleY, w: PADDLE_W, h: PADDLE_H,
    layer: 2,
  });

  // Ball
  drawSprite({
    textureId: TEX_BALL,
    x: state.ballX - BALL_RADIUS, y: state.ballY - BALL_RADIUS,
    w: BALL_RADIUS * 2, h: BALL_RADIUS * 2,
    layer: 3,
  });

  // --- HUD (screen space) ---

  // Score
  drawText(`Score: ${state.score}`, HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y, {
    scale: HUDLayout.TEXT_SCALE,
    tint: Colors.WHITE,
    layer: 100,
    screenSpace: true,
  });

  // Lives bar
  drawBar(
    HUDLayout.TOP_LEFT.x,
    HUDLayout.TOP_LEFT.y + HUDLayout.LINE_HEIGHT,
    80,
    12,
    state.lives / 3,
    {
      fillColor: Colors.SUCCESS,
      bgColor: Colors.HUD_BG,
      borderColor: Colors.LIGHT_GRAY,
      borderWidth: 1,
      layer: 100,
      screenSpace: true,
    }
  );

  // Bricks remaining
  const bricksLeft = state.bricks.filter((b) => b.hp > 0).length;
  drawText(`Bricks: ${bricksLeft}`, HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y + HUDLayout.LINE_HEIGHT * 2, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.INFO,
    layer: 100,
    screenSpace: true,
  });

  // Phase instructions
  if (state.phase === "ready") {
    drawText("Press SPACE to launch", HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y + HUDLayout.LINE_HEIGHT * 2.5, {
      scale: HUDLayout.SMALL_TEXT_SCALE,
      tint: Colors.WARNING,
      layer: 100,
      screenSpace: true,
    });
  }

  // Win/lose screens
  if (state.phase === "won") {
    drawLabel("VICTORY! Press SPACE to restart", HUDLayout.CENTER.x - 180, HUDLayout.CENTER.y - 20, {
      textColor: Colors.WIN,
      bgColor: Colors.HUD_BG,
      padding: 12,
      scale: HUDLayout.TEXT_SCALE,
      layer: 110,
      screenSpace: true,
    });
  } else if (state.phase === "lost") {
    drawLabel("GAME OVER! Press SPACE to restart", HUDLayout.CENTER.x - 190, HUDLayout.CENTER.y - 20, {
      textColor: Colors.LOSE,
      bgColor: Colors.HUD_BG,
      padding: 12,
      scale: HUDLayout.TEXT_SCALE,
      layer: 110,
      screenSpace: true,
    });
  }
});
