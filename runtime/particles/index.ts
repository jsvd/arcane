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
} from "./types.ts";

export {
  createEmitter,
  removeEmitter,
  updateParticles,
  getAllParticles,
  addAffector,
  clearEmitters,
  getEmitterCount,
  setMaxTotalParticles,
  getMaxTotalParticles,
  getTotalParticleCount,
  // Rust-native emitters (high-performance backend)
  createRustEmitter,
  updateRustEmitter,
  getRustEmitterParticleCount,
  getRustEmitterSpriteData,
  drawRustEmitter,
  destroyRustEmitter,
  updateAllRustEmitters,
  setRustEmitterPosition,
} from "./emitter.ts";
export type { RustEmitterConfig } from "./emitter.ts";

// Presets
export type { ParticleOptions } from "./presets.ts";
export { burstParticles, streamParticles, ParticlePresets } from "./presets.ts";
