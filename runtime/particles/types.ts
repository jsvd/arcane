/**
 * Particle system type definitions
 */

import type { Color } from "../ui/types.ts";

/**
 * A single particle
 */
export interface Particle {
  /** Position */
  x: number;
  y: number;

  /** Velocity (pixels per second) */
  vx: number;
  vy: number;

  /** Acceleration (pixels per second squared) */
  ax: number;
  ay: number;

  /** Rotation in radians */
  rotation: number;

  /** Rotation velocity (radians per second) */
  rotationSpeed: number;

  /** Scale */
  scale: number;

  /** Scale velocity (per second) */
  scaleSpeed: number;

  /** Color */
  color: Color;

  /** Start color (for interpolation) */
  startColor: Color;

  /** End color (for interpolation) */
  endColor: Color;

  /** Lifetime in seconds */
  lifetime: number;

  /** Age in seconds */
  age: number;

  /** Whether this particle is alive */
  alive: boolean;

  /** Texture ID for rendering */
  textureId: number;
}

/**
 * Emitter shape types
 */
export type EmitterShape = "point" | "line" | "area" | "ring";

/**
 * Emission mode
 */
export type EmissionMode = "continuous" | "burst" | "one-shot";

/**
 * Particle emitter configuration
 */
export interface EmitterConfig {
  /** Emitter shape */
  shape: EmitterShape;

  /** Position */
  x: number;
  y: number;

  /** Shape-specific parameters */
  shapeParams?: {
    /** Line: end point (x2, y2) */
    x2?: number;
    y2?: number;

    /** Area: width and height */
    width?: number;
    height?: number;

    /** Ring: inner and outer radius */
    innerRadius?: number;
    outerRadius?: number;
  };

  /** Emission mode */
  mode: EmissionMode;

  /** Emission rate (particles per second, for continuous mode) */
  rate?: number;

  /** Burst count (for burst mode) */
  burstCount?: number;

  /** Particle lifetime range [min, max] seconds */
  lifetime: [number, number];

  /** Initial velocity range */
  velocityX: [number, number];
  velocityY: [number, number];

  /** Initial acceleration */
  accelerationX?: [number, number];
  accelerationY?: [number, number];

  /** Initial rotation range (radians) */
  rotation?: [number, number];

  /** Rotation speed range (radians per second) */
  rotationSpeed?: [number, number];

  /** Initial scale range */
  scale?: [number, number];

  /** Scale speed range (per second) */
  scaleSpeed?: [number, number];

  /** Start color */
  startColor: Color;

  /** End color (for interpolation over lifetime) */
  endColor: Color;

  /** Texture ID for particles */
  textureId: number;

  /** Maximum number of particles this emitter can have alive */
  maxParticles?: number;
}

/**
 * Affector types
 */
export type AffectorType = "gravity" | "wind" | "attractor" | "repulsor" | "turbulence";

/**
 * Particle affector (modifies particle behavior)
 */
export interface Affector {
  type: AffectorType;

  /** Gravity/wind: force vector */
  forceX?: number;
  forceY?: number;

  /** Attractor/repulsor: center point */
  centerX?: number;
  centerY?: number;

  /** Attractor/repulsor: strength */
  strength?: number;

  /** Attractor/repulsor: radius (0 = infinite) */
  radius?: number;

  /** Turbulence: strength */
  turbulence?: number;
}

/**
 * Particle emitter
 */
export interface Emitter {
  /** Unique ID */
  id: string;

  /** Configuration */
  config: EmitterConfig;

  /** Particles managed by this emitter */
  particles: Particle[];

  /** Particle pool for reuse */
  pool: Particle[];

  /** Affectors affecting this emitter's particles */
  affectors: Affector[];

  /** Time accumulator for emission rate */
  emissionAccumulator: number;

  /** Whether emitter is active */
  active: boolean;

  /** Whether emitter has been used (for one-shot mode) */
  used: boolean;
}
