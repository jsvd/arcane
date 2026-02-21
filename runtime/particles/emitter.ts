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
import { drawSprite as _drawSprite } from "../rendering/sprites.ts";
import { lerpColorInto } from "../ui/colors.ts";
import { drawCircle } from "../ui/shapes.ts";

/** Lazily-created default 1x1 white texture for particles. */
let _defaultParticleTexture: number | undefined;

/** Active emitters being updated each frame. */
const emitters: Emitter[] = [];

/** Counter for generating unique emitter IDs. */
let emitterIdCounter = 0;

/** Maximum total alive particles across all emitters. */
let _maxTotalParticles = 10000;

/** Current total alive particle count across all emitters. */
let _totalAliveCount = 0;

/** Whether the 80% capacity warning has been logged. Reset on clearEmitters(). */
let _warnedAt80Pct = false;

/**
 * Set the maximum total alive particles across all emitters.
 * When the cap is reached, new particles are silently dropped.
 * Default: 10000.
 *
 * @param n - Maximum particle count. Must be > 0.
 */
export function setMaxTotalParticles(n: number): void {
  _maxTotalParticles = n;
}

/**
 * Get the current maximum total particle cap.
 *
 * @returns The maximum allowed alive particles across all emitters.
 */
export function getMaxTotalParticles(): number {
  return _maxTotalParticles;
}

/**
 * Get the current total alive particle count across all emitters.
 *
 * @returns Number of alive particles across all emitters.
 */
export function getTotalParticleCount(): number {
  return _totalAliveCount;
}

/**
 * Create a new particle emitter and add it to the global update list.
 *
 * The emitter immediately begins spawning particles according to its
 * configuration (mode, rate, shape, etc.).
 *
 * @param config - Emitter configuration describing shape, mode, particle properties, and colors.
 * @returns The created {@link Emitter} instance.
 *
 * To move the emitter after creation, update `emitter.config.x` and `emitter.config.y`.
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
 * Spawn a single particle from an emitter
 */
function spawnParticle(emitter: Emitter): void {
  const { config } = emitter;

  // Global particle cap — drop new particles when at capacity
  if (_totalAliveCount >= _maxTotalParticles) {
    return;
  }

  // Warn once at 80% capacity
  if (!_warnedAt80Pct && _totalAliveCount >= _maxTotalParticles * 0.8) {
    _warnedAt80Pct = true;
    console.warn(`[arcane] Particle count (${_totalAliveCount}) exceeds 80% of max (${_maxTotalParticles})`);
  }

  // Check per-emitter max particles limit
  const aliveCount = emitter.particles.filter((p) => p.alive).length;
  if (config.maxParticles && aliveCount >= config.maxParticles) {
    return;
  }

  const particle = getParticle(emitter);
  _totalAliveCount++;

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
    _totalAliveCount--;
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

  // Interpolate color over lifetime (mutates particle.color in place — zero allocation)
  const t = particle.age / particle.lifetime;
  lerpColorInto(particle.color, particle.startColor, particle.endColor, t);

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
  _totalAliveCount = 0;
  _warnedAt80Pct = false;
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

// --- Rust-native particle emitters ---
// These use the Rust particle simulation backend for better performance.
// The TS-native emitters above are still available for headless mode and tests.

const hasParticleOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_create_emitter === "function";

/** Active Rust emitter IDs for bulk update. */
const _rustEmitterIds: number[] = [];

/** Cached positions for Rust emitters: id -> { x, y }. */
const _rustEmitterPositions: Map<number, { x: number; y: number }> = new Map();

/**
 * Rust emitter configuration for op_create_emitter.
 * Matches the JSON fields expected by the Rust parser.
 */
export interface RustEmitterConfig {
  /** Spawn rate in particles per second. Default: 10. */
  spawnRate?: number;
  /** Minimum particle lifetime in seconds. Default: 0.5. */
  lifetimeMin?: number;
  /** Maximum particle lifetime in seconds. Default: 1.5. */
  lifetimeMax?: number;
  /** Minimum initial speed in pixels/second. Default: 20. */
  speedMin?: number;
  /** Maximum initial speed in pixels/second. Default: 80. */
  speedMax?: number;
  /** Emission direction in radians. Default: -PI/2 (upward). */
  direction?: number;
  /** Spread angle in radians. Default: PI. */
  spread?: number;
  /** Minimum scale. Default: 1. */
  scaleMin?: number;
  /** Maximum scale. Default: 1. */
  scaleMax?: number;
  /** Starting alpha. Default: 1. */
  alphaStart?: number;
  /** Ending alpha (at death). Default: 0. */
  alphaEnd?: number;
  /** Gravity X acceleration. Default: 0. */
  gravityX?: number;
  /** Gravity Y acceleration. Default: 0. */
  gravityY?: number;
  /** Texture ID for particle rendering. Default: 0. */
  textureId?: number;
  /** Initial world X position. Default: 0. */
  x?: number;
  /** Initial world Y position. Default: 0. */
  y?: number;
}

/**
 * Create a Rust-native particle emitter for high-performance simulation.
 * The simulation runs entirely in Rust; TS reads back sprite data for rendering.
 *
 * Returns a numeric emitter ID. Use updateRustEmitter() and drawRustEmitter()
 * each frame.
 *
 * @param config - Emitter configuration.
 * @returns Numeric emitter ID, or 0 if Rust ops are not available.
 */
export function createRustEmitter(config: RustEmitterConfig): number {
  if (!hasParticleOps) return 0;

  const json = JSON.stringify({
    spawnRate: config.spawnRate ?? 10,
    lifetimeMin: config.lifetimeMin ?? 0.5,
    lifetimeMax: config.lifetimeMax ?? 1.5,
    speedMin: config.speedMin ?? 20,
    speedMax: config.speedMax ?? 80,
    direction: config.direction ?? -Math.PI / 2,
    spread: config.spread ?? Math.PI,
    scaleMin: config.scaleMin ?? 1,
    scaleMax: config.scaleMax ?? 1,
    alphaStart: config.alphaStart ?? 1,
    alphaEnd: config.alphaEnd ?? 0,
    gravityX: config.gravityX ?? 0,
    gravityY: config.gravityY ?? 0,
    textureId: config.textureId ?? 0,
  });

  const id: number = (globalThis as any).Deno.core.ops.op_create_emitter(json);
  _rustEmitterIds.push(id);
  _rustEmitterPositions.set(id, { x: config.x ?? 0, y: config.y ?? 0 });
  return id;
}

/**
 * Update a Rust-native emitter's simulation (spawn, integrate, cull).
 *
 * @param id - Emitter ID from createRustEmitter().
 * @param dt - Delta time in seconds.
 * @param x - Current emitter world X position (for spawning).
 * @param y - Current emitter world Y position (for spawning).
 */
export function updateRustEmitter(id: number, dt: number, x?: number, y?: number): void {
  if (!hasParticleOps || id === 0) return;

  const pos = _rustEmitterPositions.get(id);
  const cx = x ?? pos?.x ?? 0;
  const cy = y ?? pos?.y ?? 0;
  if (pos) {
    pos.x = cx;
    pos.y = cy;
  }

  (globalThis as any).Deno.core.ops.op_update_emitter(id, dt, cx, cy);
}

/**
 * Get the number of live particles in a Rust-native emitter.
 *
 * @param id - Emitter ID from createRustEmitter().
 * @returns Number of alive particles, or 0 if unavailable.
 */
export function getRustEmitterParticleCount(id: number): number {
  if (!hasParticleOps || id === 0) return 0;
  return (globalThis as any).Deno.core.ops.op_get_emitter_particle_count(id) as number;
}

/**
 * Read packed sprite data from a Rust-native emitter.
 * Returns a Float32Array with 6 floats per particle:
 * [x, y, angle, scale, alpha, texture_id_bits]
 *
 * @param id - Emitter ID from createRustEmitter().
 * @returns Float32Array of particle sprite data, or null if unavailable.
 */
export function getRustEmitterSpriteData(id: number): Float32Array | null {
  if (!hasParticleOps || id === 0) return null;

  const bytes: Uint8Array = (globalThis as any).Deno.core.ops.op_get_emitter_sprite_data(id);
  if (!bytes || bytes.length === 0) return null;

  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
}

/**
 * Draw all particles from a Rust-native emitter using drawSprite().
 * Reads the packed sprite data from Rust and issues one drawSprite() per particle.
 *
 * @param id - Emitter ID from createRustEmitter().
 * @param opts - Optional overrides for particle size and layer.
 */
export function drawRustEmitter(
  id: number,
  opts?: { w?: number; h?: number; layer?: number },
): void {
  const data = getRustEmitterSpriteData(id);
  if (!data) return;

  const pSize = opts?.w ?? 8;
  const pSizeH = opts?.h ?? pSize;
  const pLayer = opts?.layer ?? 0;
  const PARTICLE_STRIDE = 6;
  const count = data.length / PARTICLE_STRIDE;

  for (let i = 0; i < count; i++) {
    const base = i * PARTICLE_STRIDE;
    const x = data[base];
    const y = data[base + 1];
    const angle = data[base + 2];
    const scale = data[base + 3];
    const alpha = data[base + 4];
    // texture_id stored as f32 bit pattern
    const view = new DataView(data.buffer, data.byteOffset);
    const texId = view.getUint32((base + 5) * 4, true);

    _drawSprite({
      textureId: texId,
      x: x - (pSize * scale) / 2,
      y: y - (pSizeH * scale) / 2,
      w: pSize * scale,
      h: pSizeH * scale,
      layer: pLayer,
      rotation: angle,
      opacity: alpha,
      tint: { r: 1, g: 1, b: 1, a: alpha },
    });
  }
}

/**
 * Destroy a Rust-native emitter and free its resources.
 *
 * @param id - Emitter ID from createRustEmitter().
 */
export function destroyRustEmitter(id: number): void {
  if (!hasParticleOps || id === 0) return;
  (globalThis as any).Deno.core.ops.op_destroy_emitter(id);

  const idx = _rustEmitterIds.indexOf(id);
  if (idx !== -1) _rustEmitterIds.splice(idx, 1);
  _rustEmitterPositions.delete(id);
}

/**
 * Update all registered Rust-native emitters.
 * Convenience function that calls updateRustEmitter for each active emitter.
 *
 * @param dt - Delta time in seconds.
 */
export function updateAllRustEmitters(dt: number): void {
  for (const id of _rustEmitterIds) {
    const pos = _rustEmitterPositions.get(id);
    updateRustEmitter(id, dt, pos?.x ?? 0, pos?.y ?? 0);
  }
}

/**
 * Set the world position of a Rust-native emitter (for spawning).
 *
 * @param id - Emitter ID from createRustEmitter().
 * @param x - World X position.
 * @param y - World Y position.
 */
export function setRustEmitterPosition(id: number, x: number, y: number): void {
  const pos = _rustEmitterPositions.get(id);
  if (pos) {
    pos.x = x;
    pos.y = y;
  }
}

/**
 * Draw all alive TS particles.
 *
 * By default, particles render as filled circles via the geometry pipeline.
 * When a `textureId` is provided (either per-emitter via `EmitterConfig.textureId`
 * or globally via the `textureId` option), particles render as textured sprites
 * instead, supporting rotation, blend modes, and higher visual quality.
 *
 * @param options - Rendering overrides.
 * @param options.radius - Circle radius for each particle (circle mode). Default: 3.
 * @param options.size - Sprite size in pixels (sprite mode). Default: 8.
 * @param options.layer - Draw layer. Default: 5.
 * @param options.textureId - Force all particles to render as sprites with this texture.
 *   When omitted, particles from emitters with `textureId` in their config render as
 *   sprites; all others render as circles.
 * @param options.blendMode - Blend mode for sprite particles. Default: "alpha".
 */
export function drawAllParticles(options?: {
  radius?: number;
  size?: number;
  layer?: number;
  textureId?: number;
  blendMode?: "alpha" | "additive" | "multiply" | "screen";
}): void {
  const radius = options?.radius ?? 3;
  const spriteSize = options?.size ?? 8;
  const layer = options?.layer ?? 5;
  const globalTexId = options?.textureId;
  const blendMode = options?.blendMode;

  for (const emitter of emitters) {
    // Determine if this emitter's particles should render as sprites
    const emitterTexId = globalTexId ?? emitter.config.textureId;
    const useSprite = emitterTexId !== undefined;

    for (const p of emitter.particles) {
      if (!p.alive) continue;

      if (useSprite) {
        const sz = spriteSize * p.scale;
        _drawSprite({
          textureId: emitterTexId!,
          x: p.x - sz / 2,
          y: p.y - sz / 2,
          w: sz,
          h: sz,
          layer,
          rotation: p.rotation,
          tint: p.color,
          opacity: p.color.a,
          blendMode: blendMode ?? "alpha",
        });
      } else {
        drawCircle(p.x, p.y, radius * p.scale, { color: p.color, layer });
      }
    }
  }
}

