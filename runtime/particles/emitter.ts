/**
 * Particle emitter implementation.
 *
 * Manages a global list of emitters. Call {@link updateParticles} once per frame
 * to spawn new particles and advance existing ones. Then read particles via
 * {@link getAllParticles} for rendering.
 */

import type {
  Particle,
  Emitter,
  EmitterConfig,
  Affector,
} from "./types.ts";
import { createSolidTexture } from "../rendering/texture.ts";

/** Lazily-created default 1x1 white texture for particles. */
let _defaultParticleTexture: number | undefined;

/** Active emitters being updated each frame. */
const emitters: Emitter[] = [];

/** Counter for generating unique emitter IDs. */
let emitterIdCounter = 0;

/**
 * Create a new particle emitter and add it to the global update list.
 *
 * The emitter immediately begins spawning particles according to its
 * configuration (mode, rate, shape, etc.).
 *
 * @param config - Emitter configuration describing shape, mode, particle properties, and colors.
 * @returns The created {@link Emitter} instance.
 *
 * @example
 * ```ts
 * const sparks = createEmitter({
 *   shape: "point",
 *   x: 100, y: 100,
 *   mode: "burst",
 *   burstCount: 20,
 *   lifetime: [0.3, 0.8],
 *   velocityX: [-50, 50],
 *   velocityY: [-100, -20],
 *   startColor: { r: 1, g: 0.8, b: 0, a: 1 },
 *   endColor: { r: 1, g: 0, b: 0, a: 0 },
 *   textureId: sparkTexture,
 * });
 * ```
 */
export function createEmitter(config: EmitterConfig): Emitter {
  const emitter: Emitter = {
    id: `emitter_${emitterIdCounter++}`,
    config,
    particles: [],
    pool: [],
    affectors: [],
    emissionAccumulator: 0,
    active: true,
    used: false,
  };

  emitters.push(emitter);
  return emitter;
}

/**
 * Remove an emitter from the global update list.
 * Its particles will no longer be updated or included in {@link getAllParticles}.
 *
 * @param emitter - The emitter to remove.
 */
export function removeEmitter(emitter: Emitter): void {
  const index = emitters.indexOf(emitter);
  if (index !== -1) {
    emitters.splice(index, 1);
  }
}

/**
 * Get a particle from the pool or create a new one
 */
function getParticle(emitter: Emitter): Particle {
  // Try to reuse from pool
  for (const p of emitter.pool) {
    if (!p.alive) {
      p.alive = true;
      return p;
    }
  }

  // Create new particle
  const particle: Particle = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    rotation: 0,
    rotationSpeed: 0,
    scale: 1,
    scaleSpeed: 0,
    color: { r: 1, g: 1, b: 1, a: 1 },
    startColor: { r: 1, g: 1, b: 1, a: 1 },
    endColor: { r: 1, g: 1, b: 1, a: 1 },
    lifetime: 1,
    age: 0,
    alive: true,
    textureId: 0,
  };

  emitter.pool.push(particle);
  return particle;
}

/**
 * Random number in range [min, max]
 */
function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Interpolate between colors based on t (0 to 1)
 */
function lerpColor(start: any, end: any, t: number) {
  return {
    r: start.r + (end.r - start.r) * t,
    g: start.g + (end.g - start.g) * t,
    b: start.b + (end.b - start.b) * t,
    a: start.a + (end.a - start.a) * t,
  };
}

/**
 * Spawn a single particle from an emitter
 */
function spawnParticle(emitter: Emitter): void {
  const { config } = emitter;

  // Check max particles limit
  const aliveCount = emitter.particles.filter((p) => p.alive).length;
  if (config.maxParticles && aliveCount >= config.maxParticles) {
    return;
  }

  const particle = getParticle(emitter);

  // Set position based on emitter shape
  switch (config.shape) {
    case "point":
      particle.x = config.x;
      particle.y = config.y;
      break;

    case "line": {
      const t = Math.random();
      const x2 = config.shapeParams?.x2 ?? config.x;
      const y2 = config.shapeParams?.y2 ?? config.y;
      particle.x = config.x + (x2 - config.x) * t;
      particle.y = config.y + (y2 - config.y) * t;
      break;
    }

    case "area": {
      const w = config.shapeParams?.width ?? 100;
      const h = config.shapeParams?.height ?? 100;
      particle.x = config.x + Math.random() * w;
      particle.y = config.y + Math.random() * h;
      break;
    }

    case "ring": {
      const inner = config.shapeParams?.innerRadius ?? 0;
      const outer = config.shapeParams?.outerRadius ?? 50;
      const angle = Math.random() * Math.PI * 2;
      const radius = randomRange(inner, outer);
      particle.x = config.x + Math.cos(angle) * radius;
      particle.y = config.y + Math.sin(angle) * radius;
      break;
    }
  }

  // Set velocity
  particle.vx = randomRange(config.velocityX[0], config.velocityX[1]);
  particle.vy = randomRange(config.velocityY[0], config.velocityY[1]);

  // Set acceleration
  if (config.accelerationX) {
    particle.ax = randomRange(config.accelerationX[0], config.accelerationX[1]);
  }
  if (config.accelerationY) {
    particle.ay = randomRange(config.accelerationY[0], config.accelerationY[1]);
  }

  // Set rotation
  if (config.rotation) {
    particle.rotation = randomRange(config.rotation[0], config.rotation[1]);
  }
  if (config.rotationSpeed) {
    particle.rotationSpeed = randomRange(config.rotationSpeed[0], config.rotationSpeed[1]);
  }

  // Set scale
  if (config.scale) {
    particle.scale = randomRange(config.scale[0], config.scale[1]);
  }
  if (config.scaleSpeed) {
    particle.scaleSpeed = randomRange(config.scaleSpeed[0], config.scaleSpeed[1]);
  }

  // Set colors
  particle.startColor = { ...config.startColor };
  particle.endColor = { ...config.endColor };
  particle.color = { ...config.startColor };

  // Set lifetime
  particle.lifetime = randomRange(config.lifetime[0], config.lifetime[1]);
  particle.age = 0;

  // Set texture (lazy-create default white texture if omitted)
  if (config.textureId !== undefined) {
    particle.textureId = config.textureId;
  } else {
    if (_defaultParticleTexture === undefined) {
      _defaultParticleTexture = createSolidTexture("__particle_default", { r: 1, g: 1, b: 1, a: 1 });
    }
    particle.textureId = _defaultParticleTexture;
  }

  // Add to active particles
  if (!emitter.particles.includes(particle)) {
    emitter.particles.push(particle);
  }
}

/**
 * Emit particles based on emitter mode and rate
 */
function emitParticles(emitter: Emitter, dt: number): void {
  const { config, used } = emitter;

  if (!emitter.active) return;

  switch (config.mode) {
    case "continuous": {
      const rate = config.rate ?? 10;
      emitter.emissionAccumulator += dt * rate;

      while (emitter.emissionAccumulator >= 1) {
        spawnParticle(emitter);
        emitter.emissionAccumulator -= 1;
      }
      break;
    }

    case "burst": {
      if (!used) {
        const count = config.burstCount ?? 10;
        for (let i = 0; i < count; i++) {
          spawnParticle(emitter);
        }
        emitter.used = true;
      }
      break;
    }

    case "one-shot": {
      if (!used) {
        spawnParticle(emitter);
        emitter.used = true;
      }
      break;
    }
  }
}

/**
 * Update a single particle
 */
function updateParticle(particle: Particle, dt: number, affectors: Affector[]): void {
  // Age the particle
  particle.age += dt;

  if (particle.age >= particle.lifetime) {
    particle.alive = false;
    return;
  }

  // Apply affectors
  for (const affector of affectors) {
    switch (affector.type) {
      case "gravity":
      case "wind": {
        particle.ax += affector.forceX ?? 0;
        particle.ay += affector.forceY ?? 0;
        break;
      }

      case "attractor":
      case "repulsor": {
        const dx = (affector.centerX ?? 0) - particle.x;
        const dy = (affector.centerY ?? 0) - particle.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (affector.radius === 0 || dist < affector.radius!) {
          const strength = affector.strength ?? 100;
          const force = (affector.type === "attractor" ? 1 : -1) * strength / Math.max(distSq, 1);
          particle.ax += (dx / dist) * force;
          particle.ay += (dy / dist) * force;
        }
        break;
      }

      case "turbulence": {
        const turb = affector.turbulence ?? 10;
        particle.ax += (Math.random() - 0.5) * turb;
        particle.ay += (Math.random() - 0.5) * turb;
        break;
      }
    }
  }

  // Update velocity
  particle.vx += particle.ax * dt;
  particle.vy += particle.ay * dt;

  // Update position
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;

  // Update rotation
  particle.rotation += particle.rotationSpeed * dt;

  // Update scale
  particle.scale += particle.scaleSpeed * dt;

  // Interpolate color over lifetime
  const t = particle.age / particle.lifetime;
  particle.color = lerpColor(particle.startColor, particle.endColor, t);

  // Reset acceleration (will be reapplied by affectors next frame)
  particle.ax = 0;
  particle.ay = 0;
}

/**
 * Update all emitters and their particles by one frame.
 *
 * Spawns new particles based on each emitter's mode and rate, then
 * advances all alive particles (velocity, position, rotation, scale,
 * color interpolation, affectors, lifetime). Dead particles are marked
 * `alive = false` and returned to the pool.
 *
 * Call this once per frame in your game loop.
 *
 * @param dt - Elapsed time since last frame in seconds. Must be >= 0.
 */
export function updateParticles(dt: number): void {
  for (const emitter of emitters) {
    // Emit new particles
    emitParticles(emitter, dt);

    // Update existing particles
    for (const particle of emitter.particles) {
      if (particle.alive) {
        updateParticle(particle, dt, emitter.affectors);
      }
    }
  }
}

/**
 * Collect all alive particles from all active emitters.
 *
 * Use this each frame to get the particles to render (e.g., via drawSprite).
 *
 * @returns A new array of all alive {@link Particle} instances across all emitters.
 */
export function getAllParticles(): Particle[] {
  const result: Particle[] = [];
  for (const emitter of emitters) {
    for (const particle of emitter.particles) {
      if (particle.alive) {
        result.push(particle);
      }
    }
  }
  return result;
}

/**
 * Add a particle affector to an emitter.
 * Affectors modify particle acceleration each frame (gravity, wind, attraction, etc.).
 *
 * @param emitter - The emitter to add the affector to.
 * @param affector - The affector configuration. See {@link Affector} for field details.
 */
export function addAffector(emitter: Emitter, affector: Affector): void {
  emitter.affectors.push(affector);
}

/**
 * Remove all emitters and their particles from the global update list.
 */
export function clearEmitters(): void {
  emitters.length = 0;
}

/**
 * Get the number of emitters currently in the global update list.
 * Useful for debugging and testing.
 *
 * @returns Count of registered emitters (active or inactive).
 */
export function getEmitterCount(): number {
  return emitters.length;
}
