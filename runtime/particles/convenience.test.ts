/**
 * Test convenience particle API (drawBurst, drawContinuous, stopContinuous)
 */

import { it, assert } from "../testing/harness.ts";
import { drawBurst, drawContinuous, stopContinuous, getEmitterCount, clearEmitters } from "./emitter.ts";

it("drawBurst spawns and removes particles", () => {
  clearEmitters();

  // Draw a burst - should create an emitter, spawn particles, draw them, and remove the emitter
  drawBurst(100, 100, {
    count: 5,
    lifetime: [0.5, 1],
    velocityX: [-10, 10],
    velocityY: [-10, 10],
  });

  // Emitter should be removed immediately after drawing
  assert.equal(getEmitterCount(), 0, "Burst emitter should be removed after drawing");
});

it("drawContinuous manages persistent emitter", () => {
  clearEmitters();

  // First call creates emitter
  drawContinuous("test-stream", 50, 50, 0.016, {
    rate: 10,
    lifetime: [0.5, 1],
  });

  assert.equal(getEmitterCount(), 1, "Should create one emitter");

  // Second call reuses same emitter
  drawContinuous("test-stream", 60, 60, 0.016, {
    rate: 10,
    lifetime: [0.5, 1],
  });

  assert.equal(getEmitterCount(), 1, "Should reuse existing emitter");

  // Different ID creates new emitter
  drawContinuous("test-stream-2", 70, 70, 0.016, {
    rate: 10,
    lifetime: [0.5, 1],
  });

  assert.equal(getEmitterCount(), 2, "Different ID should create new emitter");
});

it("stopContinuous removes managed emitter", () => {
  clearEmitters();

  drawContinuous("removable", 100, 100, 0.016, {
    rate: 10,
  });

  assert.equal(getEmitterCount(), 1, "Should have one emitter");

  stopContinuous("removable");

  assert.equal(getEmitterCount(), 0, "stopContinuous should remove emitter");
});

it("drawContinuous updates position", () => {
  clearEmitters();

  // Create emitter at (10, 10)
  drawContinuous("moving", 10, 10, 0.016, {
    rate: 1,
  });

  // Move to (20, 20)
  drawContinuous("moving", 20, 20, 0.016, {
    rate: 1,
  });

  // Position should be updated (we can't directly test this without accessing internals,
  // but at least verify it doesn't crash or create duplicate emitters)
  assert.equal(getEmitterCount(), 1, "Should still have one emitter after position update");
});
