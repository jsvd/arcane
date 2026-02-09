import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { aabbOverlap, circleAABBOverlap, circleAABBResolve } from "../../runtime/physics/aabb.ts";
import {
  createBreakoutGame, stepPhysics, movePaddle, launchBall, buildLevel,
  FIELD_W, FIELD_H, PADDLE_W, PADDLE_Y, BALL_RADIUS, BALL_SPEED,
  BRICK_ROWS, BRICK_COLS, BRICK_W, BRICK_H, BRICK_TOP, BRICK_LEFT, BRICK_GAP,
} from "./breakout.ts";
import type { BreakoutState } from "./breakout.ts";

// ---------------------------------------------------------------------------
// AABB overlap
// ---------------------------------------------------------------------------

describe("aabbOverlap", () => {
  it("detects overlapping boxes", () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    assert.ok(aabbOverlap(a, b));
  });

  it("returns false for non-overlapping boxes", () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 20, y: 20, w: 10, h: 10 };
    assert.ok(!aabbOverlap(a, b));
  });

  it("returns false for edge-touching boxes (no overlap)", () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 10, y: 0, w: 10, h: 10 };
    assert.ok(!aabbOverlap(a, b));
  });

  it("detects contained box", () => {
    const outer = { x: 0, y: 0, w: 100, h: 100 };
    const inner = { x: 10, y: 10, w: 5, h: 5 };
    assert.ok(aabbOverlap(outer, inner));
    assert.ok(aabbOverlap(inner, outer));
  });
});

// ---------------------------------------------------------------------------
// Circle-AABB overlap
// ---------------------------------------------------------------------------

describe("circleAABBOverlap", () => {
  it("detects circle inside box", () => {
    const box = { x: 0, y: 0, w: 100, h: 100 };
    assert.ok(circleAABBOverlap(50, 50, 5, box));
  });

  it("returns false for circle far outside", () => {
    const box = { x: 0, y: 0, w: 10, h: 10 };
    assert.ok(!circleAABBOverlap(50, 50, 5, box));
  });

  it("detects circle touching edge", () => {
    const box = { x: 10, y: 0, w: 10, h: 10 };
    // Circle at (5, 5) with radius 5 touches left edge at x=10
    assert.ok(circleAABBOverlap(5, 5, 5, box));
  });

  it("returns false for circle just missing corner", () => {
    const box = { x: 10, y: 10, w: 10, h: 10 };
    // Circle at (0, 0) with radius 5 — distance to corner (10,10) is ~14.14 > 5
    assert.ok(!circleAABBOverlap(0, 0, 5, box));
  });
});

// ---------------------------------------------------------------------------
// Circle-AABB resolve
// ---------------------------------------------------------------------------

describe("circleAABBResolve", () => {
  it("returns null when no collision", () => {
    const box = { x: 0, y: 0, w: 10, h: 10 };
    const result = circleAABBResolve(50, 50, 5, box);
    assert.equal(result, null);
  });

  it("returns upward normal for collision from above", () => {
    const box = { x: 0, y: 10, w: 20, h: 10 };
    // Circle at (10, 8) with radius 5 overlaps top edge of box
    const result = circleAABBResolve(10, 8, 5, box);
    assert.ok(result !== null);
    assert.equal(result!.nx, 0);
    assert.ok(result!.ny < 0, "normal should point upward (negative y)");
  });

  it("returns rightward normal for collision from right", () => {
    const box = { x: 0, y: 0, w: 10, h: 20 };
    // Circle at (12, 10) with radius 5 overlaps right edge
    const result = circleAABBResolve(12, 10, 5, box);
    assert.ok(result !== null);
    assert.ok(result!.nx > 0, "normal should point right");
  });

  it("handles circle center inside box", () => {
    const box = { x: 0, y: 0, w: 20, h: 20 };
    // Circle center at exact center of box
    const result = circleAABBResolve(10, 10, 5, box);
    assert.ok(result !== null);
    // Should push out along some axis
    const mag = Math.sqrt(result!.nx * result!.nx + result!.ny * result!.ny);
    assert.ok(mag > 0.99 && mag < 1.01, "normal should be unit length");
  });
});

// ---------------------------------------------------------------------------
// buildLevel
// ---------------------------------------------------------------------------

describe("buildLevel", () => {
  it("creates the right number of bricks", () => {
    const bricks = buildLevel();
    assert.equal(bricks.length, BRICK_ROWS * BRICK_COLS);
  });

  it("places first brick at expected position", () => {
    const bricks = buildLevel();
    const first = bricks[0];
    assert.equal(first.x, BRICK_LEFT);
    assert.equal(first.y, BRICK_TOP);
    assert.equal(first.w, BRICK_W);
    assert.equal(first.h, BRICK_H);
    assert.equal(first.hp, 1);
    assert.equal(first.row, 0);
  });

  it("spaces bricks correctly", () => {
    const bricks = buildLevel();
    const row0col0 = bricks[0];
    const row0col1 = bricks[1];
    assert.equal(row0col1.x - row0col0.x, BRICK_W + BRICK_GAP);
    const row1col0 = bricks[BRICK_COLS];
    assert.equal(row1col0.y - row0col0.y, BRICK_H + BRICK_GAP);
  });
});

// ---------------------------------------------------------------------------
// createBreakoutGame
// ---------------------------------------------------------------------------

describe("createBreakoutGame", () => {
  it("returns correct initial state", () => {
    const state = createBreakoutGame();
    assert.equal(state.phase, "ready");
    assert.equal(state.lives, 3);
    assert.equal(state.score, 0);
    assert.equal(state.ballVX, 0);
    assert.equal(state.ballVY, 0);
    assert.equal(state.bricks.length, BRICK_ROWS * BRICK_COLS);
  });

  it("centers paddle horizontally", () => {
    const state = createBreakoutGame();
    assert.equal(state.paddleX, FIELD_W / 2 - PADDLE_W / 2);
  });

  it("places ball above paddle", () => {
    const state = createBreakoutGame();
    assert.ok(state.ballY < PADDLE_Y);
    assert.equal(state.ballY, PADDLE_Y - BALL_RADIUS - 1);
  });
});

// ---------------------------------------------------------------------------
// movePaddle
// ---------------------------------------------------------------------------

describe("movePaddle", () => {
  it("moves paddle by dx", () => {
    const state = createBreakoutGame();
    const moved = movePaddle(state, 50);
    assert.equal(moved.paddleX, state.paddleX + 50);
  });

  it("clamps paddle to left edge", () => {
    const state = createBreakoutGame();
    const moved = movePaddle(state, -10000);
    assert.equal(moved.paddleX, 0);
  });

  it("clamps paddle to right edge", () => {
    const state = createBreakoutGame();
    const moved = movePaddle(state, 10000);
    assert.equal(moved.paddleX, FIELD_W - PADDLE_W);
  });

  it("ball follows paddle in ready phase", () => {
    const state = createBreakoutGame();
    const moved = movePaddle(state, 50);
    assert.equal(moved.ballX, moved.paddleX + PADDLE_W / 2);
  });

  it("ball does not follow paddle in playing phase", () => {
    let state = createBreakoutGame();
    state = launchBall(state);
    const origBallX = state.ballX;
    const moved = movePaddle(state, 50);
    assert.equal(moved.ballX, origBallX);
  });
});

// ---------------------------------------------------------------------------
// stepPhysics — wall bounce
// ---------------------------------------------------------------------------

describe("stepPhysics wall bounce", () => {
  it("bounces off left wall", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: BALL_RADIUS + 1,
      ballY: 300,
      ballVX: -500,
      ballVY: 0,
      bricks: [],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.ok(next.ballVX > 0, "ball should bounce right");
    assert.ok(next.ballX >= BALL_RADIUS, "ball should not penetrate wall");
  });

  it("bounces off right wall", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: FIELD_W - BALL_RADIUS - 1,
      ballY: 300,
      ballVX: 500,
      ballVY: 0,
      bricks: [],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.ok(next.ballVX < 0, "ball should bounce left");
  });

  it("bounces off top wall", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: 400,
      ballY: BALL_RADIUS + 1,
      ballVX: 0,
      ballVY: -500,
      bricks: [],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.ok(next.ballVY > 0, "ball should bounce down");
  });

  it("preserves speed through wall bounce", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: BALL_RADIUS + 1,
      ballY: 300,
      ballVX: -300,
      ballVY: 200,
      bricks: [],
    };
    const speedBefore = Math.sqrt(state.ballVX ** 2 + state.ballVY ** 2);
    const next = stepPhysics(state, 1 / 60);
    const speedAfter = Math.sqrt(next.ballVX ** 2 + next.ballVY ** 2);
    // Speed should be preserved (only direction changes on wall bounce)
    assert.ok(Math.abs(speedBefore - speedAfter) < 1, "speed should be preserved");
  });
});

// ---------------------------------------------------------------------------
// stepPhysics — paddle collision
// ---------------------------------------------------------------------------

describe("stepPhysics paddle collision", () => {
  it("reflects ball upward on paddle hit", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      paddleX: 350,
      ballX: 400, // center of paddle
      ballY: PADDLE_Y - BALL_RADIUS + 2, // just above paddle
      ballVX: 0,
      ballVY: 300,
      bricks: [],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.ok(next.ballVY < 0, "ball should go upward after paddle hit");
  });

  it("angles ball based on hit position", () => {
    // Hit left side of paddle
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      paddleX: 350,
      ballX: 355, // near left edge of paddle
      ballY: PADDLE_Y - BALL_RADIUS + 2,
      ballVX: 0,
      ballVY: 300,
      bricks: [],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.ok(next.ballVX < 0, "ball should angle left when hitting left side");
  });
});

// ---------------------------------------------------------------------------
// stepPhysics — brick collision
// ---------------------------------------------------------------------------

describe("stepPhysics brick collision", () => {
  it("destroys brick and adds score", () => {
    const brick = { x: 390, y: 200, w: BRICK_W, h: BRICK_H, hp: 1, row: 0 };
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: 400,
      ballY: 200 + BRICK_H + BALL_RADIUS - 1, // just below brick
      ballVX: 0,
      ballVY: -300,
      bricks: [brick],
    };
    const next = stepPhysics(state, 1 / 60);
    const hitBrick = next.bricks[0];
    assert.equal(hitBrick.hp, 0);
    assert.equal(next.score, 10);
  });

  it("reflects ball on brick hit", () => {
    const brick = { x: 390, y: 200, w: BRICK_W, h: BRICK_H, hp: 1, row: 0 };
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: 400,
      ballY: 200 + BRICK_H + BALL_RADIUS - 1,
      ballVX: 0,
      ballVY: -300,
      bricks: [brick],
    };
    const next = stepPhysics(state, 1 / 60);
    // After hitting brick from below, ball should now move downward
    assert.ok(next.ballVY > 0, "ball should bounce after brick hit");
  });
});

// ---------------------------------------------------------------------------
// stepPhysics — bottom boundary / lose life
// ---------------------------------------------------------------------------

describe("stepPhysics bottom boundary", () => {
  it("loses a life when ball falls below field", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: 400,
      ballY: FIELD_H - BALL_RADIUS - 1,
      ballVX: 0,
      ballVY: 500,
      bricks: [{ x: 100, y: 100, w: BRICK_W, h: BRICK_H, hp: 1, row: 0 }],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.equal(next.lives, state.lives - 1);
    assert.equal(next.phase, "ready");
    assert.equal(next.ballVX, 0);
    assert.equal(next.ballVY, 0);
  });

  it("transitions to lost when last life is used", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      lives: 1,
      ballX: 400,
      ballY: FIELD_H - BALL_RADIUS - 1,
      ballVX: 0,
      ballVY: 500,
      bricks: [{ x: 100, y: 100, w: BRICK_W, h: BRICK_H, hp: 1, row: 0 }],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.equal(next.lives, 0);
    assert.equal(next.phase, "lost");
  });
});

// ---------------------------------------------------------------------------
// stepPhysics — win condition
// ---------------------------------------------------------------------------

describe("stepPhysics win condition", () => {
  it("transitions to won when all bricks destroyed", () => {
    // Single brick that the ball will hit this frame
    const brick = { x: 395, y: 295, w: BRICK_W, h: BRICK_H, hp: 1, row: 0 };
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: 400,
      ballY: 295 + BRICK_H + BALL_RADIUS - 1,
      ballVX: 0,
      ballVY: -300,
      bricks: [brick],
    };
    const next = stepPhysics(state, 1 / 60);
    assert.equal(next.phase, "won");
  });
});

// ---------------------------------------------------------------------------
// stepPhysics — dt clamping / frame-rate independence
// ---------------------------------------------------------------------------

describe("stepPhysics frame-rate independence", () => {
  it("clamps large dt to MAX_DT", () => {
    const state: BreakoutState = {
      ...createBreakoutGame(),
      phase: "playing",
      ballX: 400,
      ballY: 300,
      ballVX: 200,
      ballVY: -200,
      bricks: [],
    };
    // A huge dt should produce same result as MAX_DT (1/30)
    const huge = stepPhysics(state, 1.0);
    const capped = stepPhysics(state, 1 / 30);
    assert.equal(huge.ballX, capped.ballX);
    assert.equal(huge.ballY, capped.ballY);
  });

  it("does not update when not in playing phase", () => {
    const state = createBreakoutGame(); // phase is "ready"
    const next = stepPhysics(state, 1 / 60);
    assert.equal(next.ballX, state.ballX);
    assert.equal(next.ballY, state.ballY);
  });
});
