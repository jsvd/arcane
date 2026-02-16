import { describe, it, assert } from "../testing/harness.ts";
import {
  createCollisionRegistry,
  onBodyCollision,
  onCollision,
  removeBodyCollisions,
  processCollisions,
} from "./collision.ts";

describe("collision registry", () => {
  it("should create empty registry", () => {
    const reg = createCollisionRegistry();
    assert.equal(reg._bodyCallbacks.size, 0);
    assert.equal(reg._pairCallbacks.size, 0);
  });

  it("should register body collision callbacks", () => {
    const reg = createCollisionRegistry();
    let called = false;
    onBodyCollision(reg, 1, () => { called = true; });
    assert.equal(reg._bodyCallbacks.size, 1);
    assert.equal(reg._bodyCallbacks.get(1)!.length, 1);
  });

  it("should register pair collision callbacks with sorted key", () => {
    const reg = createCollisionRegistry();
    onCollision(reg, 5, 3, () => {});
    assert.ok(reg._pairCallbacks.has("3_5"), "key should be sorted");
    assert.ok(!reg._pairCallbacks.has("5_3"), "unsorted key should not exist");
  });

  it("should support multiple callbacks per body", () => {
    const reg = createCollisionRegistry();
    onBodyCollision(reg, 1, () => {});
    onBodyCollision(reg, 1, () => {});
    assert.equal(reg._bodyCallbacks.get(1)!.length, 2);
  });

  it("should remove body callbacks and related pair callbacks", () => {
    const reg = createCollisionRegistry();
    onBodyCollision(reg, 1, () => {});
    onCollision(reg, 1, 2, () => {});
    onCollision(reg, 3, 1, () => {});
    onCollision(reg, 2, 3, () => {});
    removeBodyCollisions(reg, 1);
    assert.equal(reg._bodyCallbacks.has(1), false);
    assert.equal(reg._pairCallbacks.size, 1);
    assert.ok(reg._pairCallbacks.has("2_3"), "unrelated pair should remain");
  });

  it("processCollisions should be callable with no contacts (headless)", () => {
    const reg = createCollisionRegistry();
    onBodyCollision(reg, 1, () => {});
    processCollisions(reg);
    assert.ok(true, "no crash with empty contacts");
  });
});
