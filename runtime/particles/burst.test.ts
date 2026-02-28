import { describe, it, assert } from "../testing/harness.ts";
import {
  spawnBurst,
  getManagedBurstCount,
  updateParticles,
  clearEmitters,
} from "./emitter.ts";

describe("spawnBurst", () => {
  it("creates a managed burst", () => {
    clearEmitters();
    spawnBurst(100, 200);
    assert.equal(getManagedBurstCount(), 1);
    clearEmitters();
  });

  it("auto-cleans up after particles die (TS fallback)", () => {
    clearEmitters();
    spawnBurst(50, 50, {
      count: 5,
      duration: 0.01,
      lifetime: [0.01, 0.02],
    });
    assert.equal(getManagedBurstCount(), 1);

    // Advance time well past duration + lifetime
    for (let i = 0; i < 60; i++) {
      updateParticles(0.1); // 6 seconds total
    }

    assert.equal(getManagedBurstCount(), 0);
    clearEmitters();
  });

  it("accepts custom options", () => {
    clearEmitters();
    spawnBurst(200, 300, {
      count: 50,
      duration: 0.2,
      lifetime: [1, 2],
      speedMin: 10,
      speedMax: 100,
      direction: Math.PI / 2,
      spread: Math.PI,
      scaleMin: 1,
      scaleMax: 2,
      alphaStart: 0.8,
      alphaEnd: 0.1,
      gravityX: 10,
      gravityY: 500,
      size: 16,
      layer: 10,
    });
    assert.equal(getManagedBurstCount(), 1);
    clearEmitters();
  });

  it("clearEmitters clears managed bursts", () => {
    clearEmitters();
    spawnBurst(0, 0);
    spawnBurst(100, 100);
    assert.equal(getManagedBurstCount(), 2);
    clearEmitters();
    assert.equal(getManagedBurstCount(), 0);
  });
});
