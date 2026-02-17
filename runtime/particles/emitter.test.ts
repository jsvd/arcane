/**
 * Tests for particle system
 */

import { describe, it, assert } from "../testing/harness.ts";
import {
  createEmitter,
  removeEmitter,
  updateParticles,
  getAllParticles,
  addAffector,
  clearEmitters,
  getEmitterCount,
} from "./emitter.ts";
import type { EmitterConfig } from "./types.ts";

describe("Particle System", () => {
  it("should create an emitter", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 100,
      y: 100,
      mode: "burst",
      burstCount: 10,
      lifetime: [1, 2],
      velocityX: [-50, 50],
      velocityY: [-50, 50],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    const emitter = createEmitter(config);
    assert.ok(emitter.id);
    assert.equal(getEmitterCount(), 1);
  });

  it("should emit particles in burst mode", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 100,
      y: 100,
      mode: "burst",
      burstCount: 10,
      lifetime: [1, 1],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    createEmitter(config);
    updateParticles(0.1);

    const particles = getAllParticles();
    assert.equal(particles.length, 10);
  });

  it("should emit particles continuously", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 100,
      y: 100,
      mode: "continuous",
      rate: 10, // 10 particles per second
      lifetime: [10, 10], // Long lifetime so they don't die during test
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    createEmitter(config);

    // After 1 second, should have ~10 particles
    updateParticles(1.0);
    const particles = getAllParticles();
    assert.ok(particles.length >= 9 && particles.length <= 11, `Expected ~10 particles, got ${particles.length}`);
  });

  it("should update particle positions", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 0,
      y: 0,
      mode: "one-shot",
      lifetime: [10, 10], // Long lifetime
      velocityX: [100, 100], // Constant velocity
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    createEmitter(config);
    updateParticles(0); // Spawn particle

    const particles1 = getAllParticles();
    assert.equal(particles1.length, 1);
    const initialX = particles1[0].x;

    // Update for 1 second
    updateParticles(1.0);

    const particles2 = getAllParticles();
    assert.equal(particles2.length, 1);

    // Should have moved 100 pixels to the right
    const expectedX = initialX + 100;
    assert.ok(Math.abs(particles2[0].x - expectedX) < 1, `Expected x ~${expectedX}, got ${particles2[0].x}`);
  });

  it("should kill particles after lifetime", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 0,
      y: 0,
      mode: "burst",
      burstCount: 5,
      lifetime: [0.5, 0.5],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    createEmitter(config);
    updateParticles(0);

    assert.equal(getAllParticles().length, 5);

    // After 0.6 seconds, all should be dead
    updateParticles(0.6);
    assert.equal(getAllParticles().length, 0);
  });

  it("should interpolate colors over lifetime", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 0,
      y: 0,
      mode: "one-shot",
      lifetime: [1, 1],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 0, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    createEmitter(config);
    updateParticles(0);

    const particles = getAllParticles();
    assert.equal(particles.length, 1);

    // At start, color should be red
    assert.ok(Math.abs(particles[0].color.r - 1) < 0.1);
    assert.ok(Math.abs(particles[0].color.g - 0) < 0.1);

    // After 0.5 seconds, color should be halfway
    updateParticles(0.5);
    assert.ok(Math.abs(particles[0].color.r - 0.5) < 0.1);
    assert.ok(Math.abs(particles[0].color.g - 0.5) < 0.1);
  });

  it("should apply gravity affector", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 0,
      y: 0,
      mode: "one-shot",
      lifetime: [10, 10],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    const emitter = createEmitter(config);
    addAffector(emitter, {
      type: "gravity",
      forceX: 0,
      forceY: 100, // Downward gravity
    });

    updateParticles(0);

    const particles = getAllParticles();
    const initialY = particles[0].y;

    // After 1 second with gravity, should have fallen
    updateParticles(1.0);
    assert.ok(particles[0].y > initialY, "Particle should have fallen");
  });

  it("should remove emitters", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 0,
      y: 0,
      mode: "burst",
      burstCount: 5,
      lifetime: [1, 1],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    const emitter = createEmitter(config);
    assert.equal(getEmitterCount(), 1);

    removeEmitter(emitter);
    assert.equal(getEmitterCount(), 0);
  });

  it("should respect maxParticles limit", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 0,
      y: 0,
      mode: "continuous",
      rate: 100,
      lifetime: [10, 10], // Long lifetime so they don't die
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
      maxParticles: 10,
    };

    createEmitter(config);
    updateParticles(1.0); // Try to spawn 100 particles

    const particles = getAllParticles();
    assert.ok(particles.length <= 10, `Should not exceed maxParticles, got ${particles.length}`);
  });

  it("should spawn particles in area shape", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "area",
      x: 100,
      y: 100,
      shapeParams: { width: 50, height: 50 },
      mode: "burst",
      burstCount: 10,
      lifetime: [1, 1],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    createEmitter(config);
    updateParticles(0);

    const particles = getAllParticles();

    // All particles should be within the area
    for (const p of particles) {
      assert.ok(p.x >= 100 && p.x <= 150);
      assert.ok(p.y >= 100 && p.y <= 150);
    }
  });

  it("should use default texture when textureId is omitted", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "point",
      x: 0,
      y: 0,
      mode: "burst",
      burstCount: 3,
      lifetime: [1, 1],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      // textureId omitted — should use default
    };

    createEmitter(config);
    updateParticles(0);

    const particles = getAllParticles();
    assert.equal(particles.length, 3);
    // In headless mode, default texture returns 0 (no-op createSolidTexture)
    // Just verify particles were created without error
    for (const p of particles) {
      assert.ok(p.alive);
    }
  });

  it("should spawn particles in ring shape", () => {
    clearEmitters();

    const config: EmitterConfig = {
      shape: "ring",
      x: 0,
      y: 0,
      shapeParams: { innerRadius: 10, outerRadius: 20 },
      mode: "burst",
      burstCount: 10,
      lifetime: [1, 1],
      velocityX: [0, 0],
      velocityY: [0, 0],
      startColor: { r: 1, g: 0, b: 0, a: 1 },
      endColor: { r: 1, g: 1, b: 0, a: 0 },
      textureId: 1,
    };

    createEmitter(config);
    updateParticles(0);

    const particles = getAllParticles();

    // All particles should be within the ring
    for (const p of particles) {
      const dist = Math.sqrt(p.x * p.x + p.y * p.y);
      assert.ok(dist >= 10 && dist <= 20, `Particle at distance ${dist} should be in ring [10, 20]`);
    }
  });
});
