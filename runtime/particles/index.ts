/**
 * Particle system
 *
 * Provides particle emitters with various shapes, emission modes, and affectors.
 */

export type {
  Particle,
  EmitterShape,
  EmissionMode,
  EmitterConfig,
  AffectorType,
  Affector,
  Emitter,
  BurstOptions,
} from "./types.ts";

export {
  spawnEmitter,
  removeEmitter,
  updateParticles,
  getAliveParticles,
  addAffector,
  clearEmitters,
  getEmitterCount,
  setMaxTotalParticles,
  getMaxTotalParticles,
  getTotalParticleCount,
  drawAllParticles,
  // Convenience API
  drawBurst,
  drawContinuous,
  stopContinuous,
  // Self-destructing bursts
  spawnBurst,
  getManagedBurstCount,
} from "./emitter.ts";

// Presets
export type { ParticleOptions } from "./presets.ts";
export { burstParticles, streamParticles, ParticlePresets } from "./presets.ts";
