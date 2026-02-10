import { describe, it, assert } from "../testing/harness.ts";
import {
  createAnimation,
  playAnimation,
  updateAnimation,
  getAnimationUV,
  drawAnimatedSprite,
  resetAnimation,
  stopAnimation,
} from "./animation.ts";

describe("animation", () => {
  it("createAnimation returns incrementing IDs", () => {
    const id1 = createAnimation(1, 32, 32, 4, 10);
    const id2 = createAnimation(2, 16, 16, 8, 12);
    assert.equal(id2, id1 + 1);
  });

  it("playAnimation returns initial state", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    const state = playAnimation(id);
    assert.equal(state.defId, id);
    assert.equal(state.elapsed, 0);
    assert.equal(state.frame, 0);
    assert.equal(state.finished, false);
  });

  it("updateAnimation advances frame correctly", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    const state = playAnimation(id);
    // At 10 fps, 0.15s = frame 1
    const next = updateAnimation(state, 0.15);
    assert.equal(next.frame, 1);
    assert.equal(next.finished, false);
  });

  it("updateAnimation loops back to frame 0", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    const state = playAnimation(id);
    // At 10 fps, 0.45s = frame 4, loops to 0
    const next = updateAnimation(state, 0.45);
    assert.equal(next.frame, 4 % 4);
    assert.equal(next.finished, false);
  });

  it("updateAnimation non-loop stops at last frame", () => {
    const id = createAnimation(1, 32, 32, 4, 10, { loop: false });
    const state = playAnimation(id);
    // At 10 fps, 1.0s = frame 10, clamped to frame 3
    const next = updateAnimation(state, 1.0);
    assert.equal(next.frame, 3);
  });

  it("updateAnimation non-loop sets finished=true", () => {
    const id = createAnimation(1, 32, 32, 4, 10, { loop: false });
    const state = playAnimation(id);
    const next = updateAnimation(state, 1.0);
    assert.equal(next.finished, true);
  });

  it("getAnimationUV returns correct UV for frame 0", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    const state = playAnimation(id);
    const uv = getAnimationUV(state);
    assert.equal(uv.x, 0);
    assert.equal(uv.y, 0);
    assert.equal(uv.w, 0.25);
    assert.equal(uv.h, 1);
  });

  it("getAnimationUV returns correct UV for frame N", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    let state = playAnimation(id);
    // Advance to frame 2: 0.25s at 10fps = frame 2
    state = updateAnimation(state, 0.25);
    assert.equal(state.frame, 2);
    const uv = getAnimationUV(state);
    assert.equal(uv.x, 0.5);
    assert.equal(uv.y, 0);
    assert.equal(uv.w, 0.25);
    assert.equal(uv.h, 1);
  });

  it("resetAnimation resets elapsed and frame", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    let state = playAnimation(id);
    state = updateAnimation(state, 0.25);
    assert.ok(state.elapsed > 0);
    const reset = resetAnimation(state);
    assert.equal(reset.elapsed, 0);
    assert.equal(reset.frame, 0);
    assert.equal(reset.finished, false);
    assert.equal(reset.defId, id);
  });

  it("stopAnimation sets finished", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    const state = playAnimation(id);
    const stopped = stopAnimation(state);
    assert.equal(stopped.finished, true);
    assert.equal(stopped.defId, id);
  });

  it("updateAnimation returns new object (immutability)", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    const state = playAnimation(id);
    const next = updateAnimation(state, 0.1);
    assert.notEqual(state, next);
    assert.equal(state.elapsed, 0);
    assert.equal(state.frame, 0);
  });

  it("drawAnimatedSprite doesn't throw (smoke test in headless)", () => {
    const id = createAnimation(1, 32, 32, 4, 10);
    const state = playAnimation(id);
    // Should not throw even in headless (drawSprite is a no-op)
    drawAnimatedSprite(state, 100, 200, 32, 32, { layer: 1 });
  });
});
