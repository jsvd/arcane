/**
 * Juice & game feel combinators.
 *
 * High-level APIs that orchestrate multiple subsystems (camera shake, screen
 * flash, particles, audio, frame freeze) in a single call. These are the
 * "one call, big payoff" functions that make a game *feel good*.
 *
 * @example
 * ```ts
 * // On enemy hit: shake + flash + particles + sound in one call
 * impact(enemy.x, enemy.y, {
 *   shake: { intensity: 6, duration: 0.2 },
 *   flash: { r: 1, g: 1, b: 1, duration: 0.1 },
 *   hitstop: 3,
 * });
 * ```
 */

import { shakeCamera } from "../tweening/helpers.ts";
import { flashScreen } from "../tweening/helpers.ts";
import { createEmitter } from "../particles/emitter.ts";
import type { EmitterConfig } from "../particles/types.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Camera shake options for impact(). */
export type ImpactShake = {
  /** Shake intensity in pixels. Default: 8. */
  intensity?: number;
  /** Shake duration in seconds. Default: 0.15. */
  duration?: number;
};

/** Screen flash options for impact(). */
export type ImpactFlash = {
  /** Red component 0-1. Default: 1. */
  r?: number;
  /** Green component 0-1. Default: 1. */
  g?: number;
  /** Blue component 0-1. Default: 1. */
  b?: number;
  /** Flash duration in seconds. Default: 0.1. */
  duration?: number;
  /** Initial opacity 0-1. Default: 0.6. */
  opacity?: number;
};

/** Particle burst options for impact(). */
export type ImpactParticles = {
  /** Number of particles. Default: 15. */
  count?: number;
  /** Particle lifetime range [min, max] in seconds. Default: [0.2, 0.5]. */
  lifetime?: [number, number];
  /** Horizontal velocity range. Default: [-100, 100]. */
  velocityX?: [number, number];
  /** Vertical velocity range. Default: [-100, 100]. */
  velocityY?: [number, number];
  /** Particle color. Default: white. */
  color?: { r: number; g: number; b: number; a: number };
  /** End color for fade. Optional. */
  endColor?: { r: number; g: number; b: number; a: number };
  /** Particle size range. Default: [2, 6]. */
  size?: [number, number];
  /** Texture for particles. Uses solid white if not specified. */
  textureId?: number;
};

/** Sound options for impact(). */
export type ImpactSound = {
  /** Sound to play. The user should pass the sound ID from loadSound(). */
  soundId: number;
  /** Volume 0-1. Default: 1. */
  volume?: number;
};

/** Full configuration for the impact() combinator. All fields optional. */
export type ImpactConfig = {
  /** Camera shake. Pass true for defaults, or an ImpactShake for custom. */
  shake?: boolean | ImpactShake;
  /** Hitstop: freeze gameplay for N frames (60 FPS assumed). Default: 0. */
  hitstop?: number;
  /** Screen flash. Pass true for defaults, or an ImpactFlash for custom. */
  flash?: boolean | ImpactFlash;
  /** Particle burst at the impact point. Pass true for defaults, or config. */
  particles?: boolean | ImpactParticles;
  /** Sound to play. */
  sound?: ImpactSound;
};

// ---------------------------------------------------------------------------
// Hitstop state
// ---------------------------------------------------------------------------

let hitstopFramesRemaining = 0;

/**
 * Check whether hitstop is active. When true, gameplay should freeze but
 * UI and particles can continue updating.
 *
 * @returns True if hitstop is in effect.
 */
export function isHitstopActive(): boolean {
  return hitstopFramesRemaining > 0;
}

/**
 * Get remaining hitstop frames.
 * @returns Number of frames remaining.
 */
export function getHitstopFrames(): number {
  return hitstopFramesRemaining;
}

/**
 * Consume one hitstop frame. Call this once per game frame in your update loop.
 * While hitstop is active, skip gameplay updates but continue rendering.
 *
 * @returns True if hitstop was active (frame was consumed), false if not.
 *
 * @example
 * ```ts
 * onFrame(() => {
 *   if (!consumeHitstopFrame()) {
 *     // Normal gameplay update
 *     updateGameplay(dt);
 *   }
 *   // Always render (including during hitstop)
 *   renderGame();
 *   updateTweens(dt); // tweens run during hitstop
 *   updateParticles(dt); // particles run during hitstop
 * });
 * ```
 */
export function consumeHitstopFrame(): boolean {
  if (hitstopFramesRemaining <= 0) return false;
  hitstopFramesRemaining--;
  return true;
}

/**
 * Start a hitstop (frame freeze) for the specified number of frames.
 * If a hitstop is already active, the larger value wins.
 *
 * @param frames - Number of frames to freeze. At 60 FPS, 3 frames = 50ms.
 */
export function hitstop(frames: number): void {
  hitstopFramesRemaining = Math.max(hitstopFramesRemaining, Math.round(frames));
}

// ---------------------------------------------------------------------------
// Impact combinator
// ---------------------------------------------------------------------------

/**
 * Orchestrated "impact" juice: combine camera shake, hitstop, screen flash,
 * particle burst, and sound in a single call. All parameters are optional —
 * mix and match freely.
 *
 * @param x - World X position of the impact.
 * @param y - World Y position of the impact.
 * @param config - Which effects to trigger and their parameters.
 *
 * @example
 * ```ts
 * // Full juice on enemy death
 * impact(enemy.x, enemy.y, {
 *   shake: { intensity: 10, duration: 0.3 },
 *   hitstop: 4,
 *   flash: { r: 1, g: 0.8, b: 0.2, duration: 0.15 },
 *   particles: { count: 25, color: rgb(255, 128, 0) },
 * });
 *
 * // Minimal hit feedback
 * impact(x, y, { shake: true, hitstop: 2 });
 * ```
 */
export function impact(x: number, y: number, config: ImpactConfig): void {
  // Camera shake
  if (config.shake) {
    const shake = config.shake === true ? {} : config.shake;
    const intensity = shake.intensity ?? 8;
    const duration = shake.duration ?? 0.15;
    shakeCamera(intensity, duration);
  }

  // Hitstop
  if (config.hitstop && config.hitstop > 0) {
    hitstop(config.hitstop);
  }

  // Screen flash
  if (config.flash) {
    const flash = config.flash === true ? {} : config.flash;
    const r = flash.r ?? 1;
    const g = flash.g ?? 1;
    const b = flash.b ?? 1;
    const duration = flash.duration ?? 0.1;
    const opacity = flash.opacity ?? 0.6;
    flashScreen(r, g, b, duration, opacity);
  }

  // Particle burst
  if (config.particles) {
    const p = config.particles === true ? {} : config.particles;
    const count = p.count ?? 15;
    const lifetime = p.lifetime ?? [0.2, 0.5];
    const vx = p.velocityX ?? [-100, 100];
    const vy = p.velocityY ?? [-100, 100];
    const color = p.color ?? { r: 1, g: 1, b: 1, a: 1 };
    const size = p.size ?? [2, 6];

    const endColor = p.endColor ?? { r: color.r, g: color.g, b: color.b, a: 0 };
    const emitterConfig: EmitterConfig = {
      shape: "point",
      x,
      y,
      mode: "burst",
      burstCount: count,
      lifetime,
      velocityX: vx,
      velocityY: vy,
      startColor: color,
      endColor,
      scale: [size[0] / 4, size[1] / 4],
      textureId: p.textureId ?? 0,
    };
    createEmitter(emitterConfig);
  }

  // Sound playback
  if (config.sound) {
    // In headless mode, playSound is a no-op. We use dynamic import-style
    // call to avoid circular deps, but since playSound is a simple op wrapper,
    // we call it via the global Deno ops if available.
    const ops = (globalThis as any).Deno?.core?.ops;
    if (ops?.op_play_sound_ex) {
      const vol = config.sound.volume ?? 1;
      ops.op_play_sound_ex(config.sound.soundId, vol, 0, 0, 0, "sfx");
    }
  }
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * Light hit impact preset: small shake + brief flash.
 * @param x - World X position.
 * @param y - World Y position.
 */
export function impactLight(x: number, y: number): void {
  impact(x, y, {
    shake: { intensity: 4, duration: 0.1 },
    flash: { duration: 0.08, opacity: 0.3 },
    hitstop: 2,
  });
}

/**
 * Heavy hit impact preset: big shake + long flash + particles.
 * @param x - World X position.
 * @param y - World Y position.
 */
export function impactHeavy(x: number, y: number): void {
  impact(x, y, {
    shake: { intensity: 12, duration: 0.3 },
    flash: { r: 1, g: 0.8, b: 0.3, duration: 0.2, opacity: 0.7 },
    hitstop: 5,
    particles: { count: 25, color: { r: 1, g: 0.6, b: 0.1, a: 1 } },
  });
}

/**
 * Reset juice state. For testing only.
 */
export function _resetJuice(): void {
  hitstopFramesRemaining = 0;
}
