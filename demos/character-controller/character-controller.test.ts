// Type-check guard: ensures the visual entry point compiles (catches broken imports)
import "./character-controller.ts";

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  createAnimation,
  onFrameEvent,
  playAnimation,
  updateAnimationWithEvents,
  createAnimationFSM,
  getCurrentState,
  isBlending,
  updateFSM,
} from "../../runtime/rendering/index.ts";
import type { FSMConfig } from "../../runtime/rendering/index.ts";

/**
 * Tests for the character controller demo's animation FSM configuration.
 * Validates the state machine transitions match the expected platformer behavior.
 */

function makeCharacterFSM(): ReturnType<typeof createAnimationFSM> {
  const idleAnim = createAnimation(0, 48, 64, 4, 4);
  const walkAnim = createAnimation(0, 48, 64, 6, 10);
  const jumpAnim = createAnimation(0, 48, 64, 2, 8, { loop: false });
  const fallAnim = createAnimation(0, 48, 64, 2, 6);
  const attackAnim = createAnimation(0, 48, 64, 4, 12, { loop: false });

  return createAnimationFSM({
    states: {
      idle: { animationId: idleAnim },
      walk: { animationId: walkAnim },
      jump: { animationId: jumpAnim },
      fall: { animationId: fallAnim },
      attack: { animationId: attackAnim },
    },
    transitions: [
      { from: "any", to: "attack", condition: { type: "trigger", param: "attack" }, priority: 20, blendDuration: 0.05 },
      { from: "attack", to: "idle", condition: { type: "animationFinished" }, blendDuration: 0.1 },
      { from: "idle", to: "jump", condition: { type: "boolean", param: "jumping" }, priority: 10, blendDuration: 0.05 },
      { from: "walk", to: "jump", condition: { type: "boolean", param: "jumping" }, priority: 10, blendDuration: 0.05 },
      { from: "jump", to: "fall", condition: { type: "boolean", param: "falling" }, priority: 5, blendDuration: 0.1 },
      { from: "fall", to: "idle", condition: { type: "boolean", param: "grounded" }, priority: 5, blendDuration: 0.08 },
      { from: "jump", to: "idle", condition: { type: "boolean", param: "grounded" }, priority: 5, blendDuration: 0.08 },
      { from: "idle", to: "walk", condition: { type: "boolean", param: "moving" }, priority: 1, blendDuration: 0.1 },
      { from: "walk", to: "idle", condition: { type: "boolean", param: "moving", negate: true }, priority: 1, blendDuration: 0.1 },
    ],
    initialState: "idle",
    defaultBlendDuration: 0.1,
  });
}

describe("character controller FSM", () => {
  it("starts in idle state", () => {
    const fsm = makeCharacterFSM();
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("idle -> walk when moving", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { moving: true, grounded: true });
    assert.equal(getCurrentState(fsm), "walk");
  });

  it("walk -> idle when stopped", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { moving: true, grounded: true });
    assert.equal(getCurrentState(fsm), "walk");
    fsm = updateFSM(fsm, 0.016, { moving: false, grounded: true });
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("idle -> jump when jumping", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { jumping: true });
    assert.equal(getCurrentState(fsm), "jump");
  });

  it("walk -> jump when jumping while moving", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { moving: true });
    assert.equal(getCurrentState(fsm), "walk");
    fsm = updateFSM(fsm, 0.016, { jumping: true, moving: true });
    assert.equal(getCurrentState(fsm), "jump");
  });

  it("jump -> fall when velocity changes", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { jumping: true });
    assert.equal(getCurrentState(fsm), "jump");
    fsm = updateFSM(fsm, 0.016, { falling: true });
    assert.equal(getCurrentState(fsm), "fall");
  });

  it("fall -> idle when landing", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { jumping: true });
    fsm = updateFSM(fsm, 0.016, { falling: true });
    assert.equal(getCurrentState(fsm), "fall");
    fsm = updateFSM(fsm, 0.016, { grounded: true });
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("attack from idle", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { attack: true });
    assert.equal(getCurrentState(fsm), "attack");
  });

  it("attack from walk (interrupts)", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { moving: true });
    assert.equal(getCurrentState(fsm), "walk");
    fsm = updateFSM(fsm, 0.016, { attack: true });
    assert.equal(getCurrentState(fsm), "attack");
  });

  it("attack -> idle when finished", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { attack: true });
    assert.equal(getCurrentState(fsm), "attack");
    // Advance past attack animation (4 frames at 12fps = 0.33s)
    fsm = updateFSM(fsm, 0.5, {});
    assert.equal(fsm.animation.finished, true);
    fsm = updateFSM(fsm, 0.016, {});
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("all transitions use blending", () => {
    let fsm = makeCharacterFSM();
    fsm = updateFSM(fsm, 0.016, { moving: true });
    assert.equal(isBlending(fsm), true);
  });

  it("full jump cycle: idle -> jump -> fall -> idle", () => {
    let fsm = makeCharacterFSM();

    // Start jump
    fsm = updateFSM(fsm, 0.016, { jumping: true });
    assert.equal(getCurrentState(fsm), "jump");

    // Peak of jump, start falling
    fsm = updateFSM(fsm, 0.016, { falling: true });
    assert.equal(getCurrentState(fsm), "fall");

    // Land
    fsm = updateFSM(fsm, 0.016, { grounded: true });
    assert.equal(getCurrentState(fsm), "idle");
  });
});

describe("character controller frame events", () => {
  it("attack frame event fires on correct frame", () => {
    const fired: number[] = [];
    const attackAnim = createAnimation(0, 48, 64, 4, 12, {
      loop: false,
      events: [{ frame: 1, callback: (f) => fired.push(f) }],
    });

    let state = playAnimation(attackAnim);
    // At 12fps, frame 1 is at 1/12 = 0.083s
    state = updateAnimationWithEvents(state, 0.1);
    assert.equal(fired.length, 1);
    assert.equal(fired[0], 1);
  });
});
