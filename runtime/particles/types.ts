/**
 * Particle system type definitions.
 *
 * Particles are small, short-lived visual elements (sparks, smoke, debris, etc.)
 * spawned by {@link Emitter}s and optionally modified by {@link Affector}s.
 */

import type { Color } from "../ui/types.ts";

/**
 * A single particle managed by an emitter.
 *
 * Particles are pooled and reused. Check `alive` before rendering.
 * Color interpolates from `startColor` to `endColor` over the particle's lifetime.
 */
export interface Particle {
  /** X position in world pixels. */
  x: number;
  /** Y position in world pixels. */
  y: number;

  /** X velocity in pixels per second. */
  vx: number;
  /** Y velocity in pixels per second. */
  vy: number;

  /** X acceleration in pixels per second squared. Reset each frame after affectors run. */
  ax: number;
  /** Y acceleration in pixels per second squared. Reset each frame after affectors run. */
  ay: number;

  /** Current rotation in radians. */
  rotation: number;

  /** Rotation speed in radians per second. */
  rotationSpeed: number;

  /** Current scale multiplier. 1.0 = original size. */
  scale: number;

  /** Scale change rate per second (positive = growing, negative = shrinking). */
  scaleSpeed: number;

  /** Current interpolated color (between startColor and endColor based on age/lifetime). */
  color: Color;

  /** Color at birth (age = 0). */
  startColor: Color;

  /** Color at death (age = lifetime). */
  endColor: Color;

  /** Total lifetime in seconds. The particle dies when age >= lifetime. */
  lifetime: number;

  /** Seconds since this particle was spawned. */
  age: number;

  /** Whether this particle is alive and should be updated/rendered. */
  alive: boolean;

  /** Texture ID used to render this particle via drawSprite(). */
  textureId: number;
}

/**
 * Shape of the emitter's spawn area.
 * - `"point"` — all particles spawn at the emitter's (x, y).
 * - `"line"` — particles spawn along a line from (x, y) to (x2, y2).
 * - `"area"` — particles spawn randomly within a rectangle.
 * - `"ring"` — particles spawn in an annular region between innerRadius and outerRadius.
 */
export type EmitterShape = "point" | "line" | "area" | "ring";

/**
 * How the emitter spawns particles.
 * - `"continuous"` — spawns at a steady rate (particles/second) every frame.
 * - `"burst"` — spawns `burstCount` particles all at once, then stops.
 * - `"one-shot"` — spawns a single particle, then stops.
 */
export type EmissionMode = "continuous" | "burst" | "one-shot";

/**
 * Configuration for creating a particle emitter via {@link spawnEmitter}.
 *
 * Range fields like `lifetime`, `velocityX`, etc. are `[min, max]` tuples.
 * Each spawned particle picks a random value within the range.
 */
export interface EmitterConfig {
  /** Shape of the spawn area. See {@link EmitterShape}. */
  shape: EmitterShape;

  /** X position of the emitter in world pixels. */
  x: number;
  /** Y position of the emitter in world pixels. */
  y: number;

  /** Shape-specific parameters. Which fields are used depends on `shape`. */
  shapeParams?: {
    /** End X for "line" shape. Default: same as emitter x. */
    x2?: number;
    /** End Y for "line" shape. Default: same as emitter y. */
    y2?: number;

    /** Width in pixels for "area" shape. Default: 100. */
    width?: number;
    /** Height in pixels for "area" shape. Default: 100. */
    height?: number;

    /** Inner radius in pixels for "ring" shape. Default: 0. */
    innerRadius?: number;
    /** Outer radius in pixels for "ring" shape. Default: 50. */
    outerRadius?: number;
  };

  /** How particles are spawned. See {@link EmissionMode}. */
  mode: EmissionMode;

  /** Spawn rate in particles per second. Used when mode is "continuous". Default: 10. */
  rate?: number;

  /** Number of particles to spawn at once. Used when mode is "burst". Default: 10. */
  burstCount?: number;

  /** Particle lifetime range [min, max] in seconds. Each particle gets a random value in range. */
  lifetime: [number, number];

  /** Initial X velocity range [min, max] in pixels/second. */
  velocityX: [number, number];
  /** Initial Y velocity range [min, max] in pixels/second. */
  velocityY: [number, number];

  /** Initial X acceleration range [min, max] in pixels/second^2. Optional. */
  accelerationX?: [number, number];
  /** Initial Y acceleration range [min, max] in pixels/second^2. Optional. */
  accelerationY?: [number, number];

  /** Initial rotation range [min, max] in radians. Optional. */
  rotation?: [number, number];

  /** Rotation speed range [min, max] in radians/second. Optional. */
  rotationSpeed?: [number, number];

  /** Initial scale range [min, max]. 1.0 = original size. Optional. */
  scale?: [number, number];

  /** Scale change rate range [min, max] per second. Optional. */
  scaleSpeed?: [number, number];

  /** Color at particle birth. RGBA with components 0.0..1.0. */
  startColor: Color;

  /** Color at particle death. Interpolated linearly from startColor over lifetime. */
  endColor: Color;

  /** Texture ID for rendering particles. Obtain via loadTexture() or createSolidTexture(). If omitted, uses a default 1x1 white texture. */
  textureId?: number;

  /** Maximum alive particles for this emitter. New particles are not spawned if at limit. Default: unlimited. */
  maxParticles?: number;
}

/**
 * Types of particle affectors that modify particle behavior each frame.
 * - `"gravity"` — constant downward (or any direction) force.
 * - `"wind"` — constant directional force (same as gravity, semantic distinction).
 * - `"attractor"` — pulls particles toward a point.
 * - `"repulsor"` — pushes particles away from a point.
 * - `"turbulence"` — random jitter applied to acceleration each frame.
 */
export type AffectorType = "gravity" | "wind" | "attractor" | "repulsor" | "turbulence";

/**
 * A particle affector that modifies particle acceleration each frame.
 * Attach to an emitter via {@link addAffector}.
 *
 * Which fields are used depends on `type`:
 * - gravity/wind: `forceX`, `forceY`
 * - attractor/repulsor: `centerX`, `centerY`, `strength`, `radius`
 * - turbulence: `turbulence`
 */
export interface Affector {
  /** The type of force this affector applies. See {@link AffectorType}. */
  type: AffectorType;

  /** X component of force vector. Used by "gravity" and "wind". Default: 0. */
  forceX?: number;
  /** Y component of force vector. Used by "gravity" and "wind". Default: 0. */
  forceY?: number;

  /** X position of attraction/repulsion center. Used by "attractor" and "repulsor". Default: 0. */
  centerX?: number;
  /** Y position of attraction/repulsion center. Used by "attractor" and "repulsor". Default: 0. */
  centerY?: number;

  /** Force strength for attractor/repulsor. Higher = stronger pull/push. Default: 100. */
  strength?: number;

  /** Effect radius in pixels for attractor/repulsor. 0 = infinite range. Default: 0. */
  radius?: number;

  /** Turbulence intensity. Higher = more random jitter. Default: 10. */
  turbulence?: number;
}

/**
 * Options for {@link spawnBurst}: a self-destructing particle burst.
 *
 * Creates a Rust-native (or TS-native in headless) emitter that emits
 * `count` particles over `duration` seconds, then automatically cleans up
 * once all particles have died.
 */
export interface BurstOptions {
  /** Number of particles to emit. Default: 20. */
  count?: number;
  /** Emission window in seconds. Default: 0.1. */
  duration?: number;
  /** Particle lifetime [min, max] in seconds. Default: [0.5, 1.5]. */
  lifetime?: [number, number];
  /** Minimum initial speed in pixels/second. Default: 50. */
  speedMin?: number;
  /** Maximum initial speed in pixels/second. Default: 200. */
  speedMax?: number;
  /** Emission direction in radians. Default: 0. */
  direction?: number;
  /** Spread angle in radians. Default: Math.PI * 2 (full circle). */
  spread?: number;
  /** Minimum scale. Default: 0.5. */
  scaleMin?: number;
  /** Maximum scale. Default: 1.5. */
  scaleMax?: number;
  /** Starting alpha. Default: 1. */
  alphaStart?: number;
  /** Ending alpha (at death). Default: 0. */
  alphaEnd?: number;
  /** Gravity X acceleration. Default: 0. */
  gravityX?: number;
  /** Gravity Y acceleration. Default: 300. */
  gravityY?: number;
  /** Texture ID for particle rendering. Default: 0. */
  textureId?: number;
  /** Sprite size in pixels. Default: 8. */
  size?: number;
  /** Draw layer. Default: 5. */
  layer?: number;
}

/**
 * A particle emitter instance returned by {@link spawnEmitter}.
 *
 * Manages a pool of particles and spawns them according to its config.
 * Updated each frame by {@link updateParticles}.
 */
export interface Emitter {
  /** Unique identifier, auto-generated as "emitter_0", "emitter_1", etc. */
  id: string;

  /** The emitter's configuration (shape, mode, ranges, colors, etc.). */
  config: EmitterConfig;

  /** All particles (alive and dead) managed by this emitter. */
  particles: Particle[];

  /** Object pool for particle reuse to reduce GC pressure. */
  pool: Particle[];

  /** Affectors that modify this emitter's particles each frame. */
  affectors: Affector[];

  /** Internal accumulator for continuous emission rate timing. */
  emissionAccumulator: number;

  /** Whether the emitter is actively spawning particles. Set to false to pause spawning. */
  active: boolean;

  /** Whether the emitter has fired (used by "burst" and "one-shot" modes to prevent re-firing). */
  used: boolean;
}
