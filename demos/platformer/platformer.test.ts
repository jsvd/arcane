// Type-check guard: ensures the visual entry point compiles (catches broken imports)
import "./platformer.ts";

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  createPlatformerGame,
  applyGravity,
  movePlayer,
  jump,
  stepPhysics,
  GRAVITY,
  JUMP_VEL,
  MOVE_SPEED,
  PLAYER_W,
  PLAYER_H,
} from "./platformer.ts";
import type { PlatformerState } from "./platformer.ts";

describe("platformer", () => {
  it("createPlatformerGame returns valid initial state", () => {
    const state = createPlatformerGame();
    assert.equal(state.phase, "playing");
    assert.equal(state.score, 0);
    assert.equal(state.lives, 3);
    assert.ok(state.platforms.length > 0);
    assert.ok(state.coins.length > 0);
    assert.equal(state.coins.every((c) => !c.collected), true);
  });

  it("gravity increases downward velocity", () => {
    const state = createPlatformerGame();
    const after = applyGravity(state, 1 / 60);
    assert.ok(after.playerVY > state.playerVY);
    // Should be approximately GRAVITY / 60
    const expected = state.playerVY + GRAVITY * (1 / 60);
    assert.ok(Math.abs(after.playerVY - expected) < 0.001);
  });

  it("jump from ground sets upward velocity", () => {
    const state: PlatformerState = {
      ...createPlatformerGame(),
      onGround: true,
    };
    const after = jump(state);
    assert.equal(after.playerVY, JUMP_VEL);
    assert.equal(after.onGround, false);
  });

  it("cannot double jump", () => {
    const state: PlatformerState = {
      ...createPlatformerGame(),
      onGround: false,
      playerVY: -100,
    };
    const after = jump(state);
    assert.equal(after.playerVY, -100);
  });

  it("movePlayer sets velocity and facing", () => {
    const state = createPlatformerGame();
    const right = movePlayer(state, 1, 1 / 60);
    assert.equal(right.facing, "right");
    assert.equal(right.playerVX, MOVE_SPEED);

    const left = movePlayer(state, -1, 1 / 60);
    assert.equal(left.facing, "left");
    assert.equal(left.playerVX, -MOVE_SPEED);
  });

  it("movePlayer with 0 direction preserves facing", () => {
    const state: PlatformerState = { ...createPlatformerGame(), facing: "left" };
    const after = movePlayer(state, 0, 1 / 60);
    assert.equal(after.facing, "left");
    assert.equal(after.playerVX, 0);
  });

  it("player lands on platform", () => {
    // Place player just above ground platform (y=550)
    const state: PlatformerState = {
      ...createPlatformerGame(),
      playerY: 550 - PLAYER_H - 1,
      playerVY: 100, // falling
    };
    const after = stepPhysics(state, 1 / 60);
    // Should land on the ground
    assert.equal(after.onGround, true);
    assert.equal(after.playerVY, 0);
    assert.equal(after.playerY, 550 - PLAYER_H);
  });

  it("coin collection increases score", () => {
    const state = createPlatformerGame();
    // Move player exactly onto first coin
    const coin = state.coins[0];
    const s: PlatformerState = {
      ...state,
      playerX: coin.x - PLAYER_W / 2 + 8,
      playerY: coin.y - PLAYER_H / 2 + 8,
      playerVY: 0,
      onGround: true,
    };
    const after = stepPhysics(s, 1 / 60);
    assert.ok(after.score > 0);
    assert.ok(after.coins.some((c) => c.collected));
  });

  it("falling off bottom loses a life", () => {
    const state: PlatformerState = {
      ...createPlatformerGame(),
      playerY: 660, // below boundary
    };
    const after = stepPhysics(state, 1 / 60);
    assert.equal(after.lives, 2);
    // Should respawn
    assert.equal(after.playerY, 500);
  });

  it("losing all lives ends the game", () => {
    const state: PlatformerState = {
      ...createPlatformerGame(),
      playerY: 660,
      lives: 1,
    };
    const after = stepPhysics(state, 1 / 60);
    assert.equal(after.lives, 0);
    assert.equal(after.phase, "dead");
  });

  it("collecting all coins wins the game", () => {
    const state = createPlatformerGame();
    // Collect all coins except one, then collect the last
    const allButLast = state.coins.map((c, i) =>
      i < state.coins.length - 1 ? { ...c, collected: true } : c
    );
    const lastCoin = allButLast[allButLast.length - 1];
    const s: PlatformerState = {
      ...state,
      coins: allButLast,
      playerX: lastCoin.x - PLAYER_W / 2 + 8,
      playerY: lastCoin.y - PLAYER_H / 2 + 8,
      playerVY: 0,
      onGround: true,
    };
    const after = stepPhysics(s, 1 / 60);
    assert.equal(after.phase, "won");
  });

  it("horizontal position is clamped to bounds", () => {
    const state: PlatformerState = {
      ...createPlatformerGame(),
      playerX: -10,
      onGround: true,
    };
    const after = stepPhysics(state, 1 / 60);
    assert.ok(after.playerX >= 0);

    const right: PlatformerState = {
      ...createPlatformerGame(),
      playerX: 810,
      onGround: true,
    };
    const afterRight = stepPhysics(right, 1 / 60);
    assert.ok(afterRight.playerX + PLAYER_W <= 800);
  });
});
