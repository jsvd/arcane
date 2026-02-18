/**
 * Particle preset configurations and convenience functions.
 *
 * Provides ready-to-use emitter configs for common effects and
 * quick-fire functions that create emitters with minimal boilerplate.
 *
 * @example
 * ```ts
 * import { burstParticles, streamParticles, ParticlePresets } from "@arcane/runtime/particles";
 *
 * // One-shot burst at position
 * burstParticles(100, 200);
 *
 * // Continuous fire stream
 * const fire = streamParticles(x, y, { preset: "fire" });
 * ```
 */

import type { EmitterConfig, Emitter } from "./types.ts";
import type { Color } from "../ui/types.ts";
import { createEmitter, addAffector } from "./emitter.ts";

/** Options for quick particle functions. Unset fields use preset defaults. */
export type ParticleOptions = {
  /** Number of particles (burst) or rate (stream). */
  count?: number;
  /** Start color. */
  color?: Color;
  /** End color. */
  endColor?: Color;
  /** Speed multiplier (scales velocity range). Default: 1. */
  speed?: number;
  /** Particle lifetime range [min, max] in seconds. */
  lifetime?: [number, number];
  /** Downward gravity force. 0 = none. */
  gravity?: number;
  /** Texture ID. If omitted, uses default white texture. */
  textureId?: number;
  /** Preset name to use as base config. Default: "sparks". */
  preset?: keyof typeof ParticlePresets;
  /** Override X velocity range [min, max] in pixels/second. Replaces preset velocity (speed multiplier still applies). */
  velocityX?: [number, number];
  /** Override Y velocity range [min, max] in pixels/second. Replaces preset velocity (speed multiplier still applies). */
  velocityY?: [number, number];
  /** Override scale range [min, max]. 1.0 = original size. */
  scale?: [number, number];
};

/** Pre-built emitter configurations for common effects. */
export const ParticlePresets = {
  /** Small brown/tan particles, fast fade. Good for footsteps, impacts on ground. */
  dust: {
    startColor: { r: 0.6, g: 0.5, b: 0.3, a: 0.8 },
    endColor: { r: 0.5, g: 0.4, b: 0.3, a: 0 },
    lifetime: [0.2, 0.5] as [number, number],
    velocityX: [-30, 30] as [number, number],
    velocityY: [-40, -10] as [number, number],
    scale: [0.3, 0.8] as [number, number],
    count: 8,
  },

  /** Orange-to-red, rising particles with additive feel. */
  fire: {
    startColor: { r: 1, g: 0.7, b: 0.1, a: 1 },
    endColor: { r: 0.8, g: 0.1, b: 0, a: 0 },
    lifetime: [0.3, 0.8] as [number, number],
    velocityX: [-20, 20] as [number, number],
    velocityY: [-80, -30] as [number, number],
    scale: [0.5, 1.2] as [number, number],
    count: 15,
  },

  /** Bright yellow-to-red, fast, scattered. Good for hits and explosions. */
  sparks: {
    startColor: { r: 1, g: 0.9, b: 0.3, a: 1 },
    endColor: { r: 1, g: 0.2, b: 0, a: 0 },
    lifetime: [0.2, 0.6] as [number, number],
    velocityX: [-120, 120] as [number, number],
    velocityY: [-120, 120] as [number, number],
    scale: [0.3, 0.6] as [number, number],
    count: 12,
  },

  /** Gray, slow, rising. Good for chimneys, aftermath of fire. */
  smoke: {
    startColor: { r: 0.5, g: 0.5, b: 0.5, a: 0.6 },
    endColor: { r: 0.3, g: 0.3, b: 0.3, a: 0 },
    lifetime: [0.8, 2.0] as [number, number],
    velocityX: [-10, 10] as [number, number],
    velocityY: [-30, -10] as [number, number],
    scale: [0.8, 1.5] as [number, number],
    scaleSpeed: [0.3, 0.8] as [number, number],
    count: 6,
  },
} as const;

/**
 * Create a one-shot burst of particles at a position.
 *
 * @param x - World X position.
 * @param y - World Y position.
 * @param options - Override preset defaults. Use `preset` to pick a base config.
 * @returns The created emitter.
 *
 * @example
 * burstParticles(enemy.x, enemy.y); // default sparks
 * burstParticles(x, y, { preset: "dust", count: 20 });
 * burstParticles(x, y, { color: { r: 0, g: 1, b: 0, a: 1 } });
 */
export function burstParticles(x: number, y: number, options?: ParticleOptions): Emitter {
  const preset = ParticlePresets[options?.preset ?? "sparks"];
  const speed = options?.speed ?? 1;
  const vx = options?.velocityX ?? preset.velocityX;
  const vy = options?.velocityY ?? preset.velocityY;

  const config: EmitterConfig = {
    shape: "point",
    x,
    y,
    mode: "burst",
    burstCount: options?.count ?? preset.count,
    lifetime: options?.lifetime ?? [...preset.lifetime],
    velocityX: [vx[0] * speed, vx[1] * speed],
    velocityY: [vy[0] * speed, vy[1] * speed],
    startColor: options?.color ?? { ...preset.startColor },
    endColor: options?.endColor ?? { ...preset.endColor },
    textureId: options?.textureId,
    scale: options?.scale ? [...options.scale] : [...preset.scale],
  };

  const emitter = createEmitter(config);

  if (options?.gravity) {
    addAffector(emitter, { type: "gravity", forceX: 0, forceY: options.gravity });
  }

  return emitter;
}

/**
 * Create a continuous particle stream at a position.
 *
 * @param x - World X position.
 * @param y - World Y position.
 * @param options - Override preset defaults. Use `preset` to pick a base config.
 * @returns The created emitter. Move it by updating `emitter.config.x/y`.
 *
 * @example
 * const smoke = streamParticles(chimney.x, chimney.y, { preset: "smoke" });
 * const fire = streamParticles(torch.x, torch.y, { preset: "fire", count: 30 });
 */
export function streamParticles(x: number, y: number, options?: ParticleOptions): Emitter {
  const preset = ParticlePresets[options?.preset ?? "fire"];
  const speed = options?.speed ?? 1;
  const vx = options?.velocityX ?? preset.velocityX;
  const vy = options?.velocityY ?? preset.velocityY;

  const config: EmitterConfig = {
    shape: "point",
    x,
    y,
    mode: "continuous",
    rate: options?.count ?? preset.count,
    lifetime: options?.lifetime ?? [...preset.lifetime],
    velocityX: [vx[0] * speed, vx[1] * speed],
    velocityY: [vy[0] * speed, vy[1] * speed],
    startColor: options?.color ?? { ...preset.startColor },
    endColor: options?.endColor ?? { ...preset.endColor },
    textureId: options?.textureId,
    scale: options?.scale ? [...options.scale] : [...preset.scale],
  };

  const emitter = createEmitter(config);

  if (options?.gravity) {
    addAffector(emitter, { type: "gravity", forceX: 0, forceY: options.gravity });
  }

  return emitter;
}
