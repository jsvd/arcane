import { describe, it, assert } from "../testing/harness.ts";
import { burstParticles, streamParticles, ParticlePresets } from "./presets.ts";
import { updateParticles, getAliveParticles, clearEmitters, getEmitterCount } from "./emitter.ts";

describe("Particle Presets", () => {
  it("ParticlePresets has all expected keys", () => {
    assert.ok(ParticlePresets.dust, "should have dust preset");
    assert.ok(ParticlePresets.fire, "should have fire preset");
    assert.ok(ParticlePresets.sparks, "should have sparks preset");
    assert.ok(ParticlePresets.smoke, "should have smoke preset");
  });

  it("burstParticles creates a burst emitter with default preset", () => {
    clearEmitters();
    const emitter = burstParticles(100, 200);
    assert.ok(emitter.id);
    assert.equal(emitter.config.mode, "burst");
    assert.equal(emitter.config.x, 100);
    assert.equal(emitter.config.y, 200);
    assert.equal(getEmitterCount(), 1);
  });

  it("burstParticles spawns particles on update", () => {
    clearEmitters();
    burstParticles(0, 0);
    updateParticles(0);
    const particles = getAliveParticles();
    assert.ok(particles.length > 0, "should have spawned particles");
  });

  it("burstParticles accepts preset override", () => {
    clearEmitters();
    const emitter = burstParticles(0, 0, { preset: "dust" });
    assert.equal(emitter.config.burstCount, ParticlePresets.dust.count);
  });

  it("burstParticles accepts count override", () => {
    clearEmitters();
    const emitter = burstParticles(0, 0, { count: 42 });
    assert.equal(emitter.config.burstCount, 42);
  });

  it("burstParticles accepts color override", () => {
    clearEmitters();
    const color = { r: 0, g: 1, b: 0, a: 1 };
    const emitter = burstParticles(0, 0, { color });
    assert.equal(emitter.config.startColor.g, 1);
  });

  it("burstParticles applies speed multiplier", () => {
    clearEmitters();
    const emitter = burstParticles(0, 0, { speed: 2 });
    // Default sparks velocityX is [-120, 120], with speed 2 should be [-240, 240]
    assert.equal(emitter.config.velocityX[0], -240);
    assert.equal(emitter.config.velocityX[1], 240);
  });

  it("burstParticles adds gravity affector when specified", () => {
    clearEmitters();
    const emitter = burstParticles(0, 0, { gravity: 300 });
    assert.equal(emitter.affectors.length, 1);
    assert.equal(emitter.affectors[0].type, "gravity");
    assert.equal(emitter.affectors[0].forceY, 300);
  });

  it("streamParticles creates a continuous emitter", () => {
    clearEmitters();
    const emitter = streamParticles(50, 75);
    assert.equal(emitter.config.mode, "continuous");
    assert.equal(emitter.config.x, 50);
    assert.equal(emitter.config.y, 75);
  });

  it("streamParticles uses fire preset by default", () => {
    clearEmitters();
    const emitter = streamParticles(0, 0);
    assert.equal(emitter.config.rate, ParticlePresets.fire.count);
  });

  it("streamParticles accepts preset and count overrides", () => {
    clearEmitters();
    const emitter = streamParticles(0, 0, { preset: "smoke", count: 20 });
    assert.equal(emitter.config.rate, 20);
    // Smoke colors
    assert.ok(Math.abs(emitter.config.startColor.r - 0.5) < 0.01);
  });

  it("streamParticles spawns particles over time", () => {
    clearEmitters();
    streamParticles(0, 0, { preset: "fire" });
    // Use a small dt so particles survive the update (fire lifetime is 0.3-0.8s).
    // With rate=15 and dt=0.1, accumulator reaches 1.5 -> spawns 1 particle.
    updateParticles(0.1);
    const particles = getAliveParticles();
    assert.ok(particles.length > 0, "should have spawned particles after 0.1 second");
  });

  it("burstParticles accepts velocityX/velocityY overrides", () => {
    clearEmitters();
    const emitter = burstParticles(0, 0, {
      velocityX: [0, 50],
      velocityY: [-200, -100],
    });
    assert.equal(emitter.config.velocityX[0], 0);
    assert.equal(emitter.config.velocityX[1], 50);
    assert.equal(emitter.config.velocityY[0], -200);
    assert.equal(emitter.config.velocityY[1], -100);
  });

  it("burstParticles velocity overrides are affected by speed multiplier", () => {
    clearEmitters();
    const emitter = burstParticles(0, 0, {
      velocityX: [0, 50],
      speed: 2,
    });
    assert.equal(emitter.config.velocityX[0], 0);
    assert.equal(emitter.config.velocityX[1], 100);
  });

  it("burstParticles accepts scale override", () => {
    clearEmitters();
    const emitter = burstParticles(0, 0, { scale: [2, 4] });
    assert.ok(emitter.config.scale);
    assert.equal(emitter.config.scale![0], 2);
    assert.equal(emitter.config.scale![1], 4);
  });

  it("streamParticles accepts velocityY override for directional effects", () => {
    clearEmitters();
    const emitter = streamParticles(0, 0, {
      velocityX: [-5, 5],
      velocityY: [50, 100],
    });
    // Should use the overridden values, not the fire preset
    assert.equal(emitter.config.velocityY[0], 50);
    assert.equal(emitter.config.velocityY[1], 100);
  });

  it("streamParticles accepts scale override", () => {
    clearEmitters();
    const emitter = streamParticles(0, 0, { scale: [0.1, 0.3] });
    assert.ok(emitter.config.scale);
    assert.equal(emitter.config.scale![0], 0.1);
    assert.equal(emitter.config.scale![1], 0.3);
  });
});
