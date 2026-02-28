// Arcane Engine — Particles Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/particles

declare module "@arcane/runtime/particles" {
  /**
   * Particle system type definitions.
   *
   * Particles are small, short-lived visual elements (sparks, smoke, debris, etc.)
   * spawned by {@link Emitter}s and optionally modified by {@link Affector}s.
   */
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

  /**
   * Particle emitter implementation.
   *
   * Manages a global list of emitters. Call {@link updateParticles} once per frame
   * to spawn new particles and advance existing ones. Then read particles via
   * {@link getAliveParticles} for rendering.
   */
  /**
   * Set the maximum total alive particles across all emitters.
   * When the cap is reached, new particles are silently dropped.
   * Default: 10000.
   *
   * @param n - Maximum particle count. Must be > 0.
   */
  export declare function setMaxTotalParticles(n: number): void;
  /**
   * Get the current maximum total particle cap.
   *
   * @returns The maximum allowed alive particles across all emitters.
   */
  export declare function getMaxTotalParticles(): number;
  /**
   * Get the current total alive particle count across all emitters.
   *
   * @returns Number of alive particles across all emitters.
   */
  export declare function getTotalParticleCount(): number;
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
   * const sparks = spawnEmitter({
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
  export declare function spawnEmitter(config: EmitterConfig): Emitter;
  /**
   * Remove an emitter from the global update list.
   * Its particles will no longer be updated or included in {@link getAliveParticles}.
   *
   * @param emitter - The emitter to remove.
   */
  export declare function removeEmitter(emitter: Emitter): void;
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
  export declare function updateParticles(dt: number): void;
  /**
   * Collect all alive particles from all active emitters.
   *
   * Use this each frame to get the particles to render (e.g., via drawSprite).
   *
   * @returns A new array of all alive {@link Particle} instances across all emitters.
   */
  export declare function getAliveParticles(): Particle[];
  /**
   * Add a particle affector to an emitter.
   * Affectors modify particle acceleration each frame (gravity, wind, attraction, etc.).
   *
   * @param emitter - The emitter to add the affector to.
   * @param affector - The affector configuration. See {@link Affector} for field details.
   */
  export declare function addAffector(emitter: Emitter, affector: Affector): void;
  /**
   * Remove all emitters and their particles from the global update list.
   * Also clears all managed bursts.
   */
  export declare function clearEmitters(): void;
  /**
   * Get the number of emitters currently in the global update list.
   * Useful for debugging and testing.
   *
   * @returns Count of registered emitters (active or inactive).
   */
  export declare function getEmitterCount(): number;
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
  export declare function drawAllParticles(options?: {
      radius?: number;
      size?: number;
      layer?: number;
      textureId?: number;
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
  }): void;
  /**
   * Convenience API: draw a burst of particles at a position.
   *
   * Creates a one-shot burst emitter, updates it, draws it, and cleans up automatically.
   * Perfect for one-off effects like explosions, impacts, or coin pickups.
   *
   * @param x - World X position.
   * @param y - World Y position.
   * @param options - Burst options (count, colors, velocities, etc.).
   * @param options.count - Number of particles to spawn. Default: 10.
   * @param options.lifetime - Particle lifetime range [min, max] in seconds. Default: [0.5, 1].
   * @param options.velocityX - Horizontal velocity range [min, max]. Default: [-50, 50].
   * @param options.velocityY - Vertical velocity range [min, max]. Default: [-50, 50].
   * @param options.startColor - Starting color. Default: white.
   * @param options.endColor - Ending color. Default: transparent.
   * @param options.textureId - Texture ID for sprite rendering. If omitted, renders as circles.
   * @param options.size - Particle size (sprite mode). Default: 8.
   * @param options.radius - Particle radius (circle mode). Default: 3.
   * @param options.layer - Draw layer. Default: 5.
   * @param options.scale - Scale range [min, max]. Default: [1, 1].
   * @param options.rotation - Rotation range [min, max] in radians. Default: [0, 0].
   * @param options.rotationSpeed - Rotation speed range [min, max]. Default: [0, 0].
   * @param options.accelerationY - Vertical acceleration (gravity). Default: [0, 0].
   *
   * @example
   * ```ts
   * // Explosion effect
   * drawBurst(player.x, player.y, {
   *   count: 30,
   *   velocityX: [-100, 100],
   *   velocityY: [-100, -20],
   *   startColor: { r: 1, g: 0.5, b: 0, a: 1 },
   *   endColor: { r: 0.5, g: 0, b: 0, a: 0 },
   * });
   * ```
   */
  export declare function drawBurst(x: number, y: number, options?: {
      count?: number;
      lifetime?: [number, number];
      velocityX?: [number, number];
      velocityY?: [number, number];
      startColor?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      endColor?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      textureId?: number;
      size?: number;
      radius?: number;
      layer?: number;
      scale?: [number, number];
      rotation?: [number, number];
      rotationSpeed?: [number, number];
      accelerationY?: [number, number];
  }): void;
  /**
   * Convenience API: draw a continuous particle stream at a position.
   *
   * Manages a persistent emitter under the hood, keyed by `id`.
   * On the first call, creates the emitter. On subsequent calls, updates and draws it.
   * The emitter persists across frames until you stop calling this function or call `stopContinuous(id)`.
   *
   * @param id - Unique identifier for this continuous effect (e.g., "jetpack", "torch-flame").
   * @param x - Current world X position.
   * @param y - Current world Y position.
   * @param dt - Delta time in seconds.
   * @param options - Emitter options (rate, colors, velocities, etc.).
   * @param options.rate - Particles per second. Default: 10.
   * @param options.lifetime - Particle lifetime range [min, max] in seconds. Default: [0.5, 1].
   * @param options.velocityX - Horizontal velocity range [min, max]. Default: [-20, 20].
   * @param options.velocityY - Vertical velocity range [min, max]. Default: [-50, -20].
   * @param options.startColor - Starting color. Default: white.
   * @param options.endColor - Ending color. Default: transparent.
   * @param options.textureId - Texture ID for sprite rendering. If omitted, renders as circles.
   * @param options.size - Particle size (sprite mode). Default: 8.
   * @param options.radius - Particle radius (circle mode). Default: 3.
   * @param options.layer - Draw layer. Default: 5.
   * @param options.maxParticles - Maximum alive particles for this emitter. Default: unlimited.
   *
   * @example
   * ```ts
   * // Rocket jetpack flame
   * onFrame((dt) => {
   *   drawContinuous("jetpack", player.x, player.y + 16, dt, {
   *     rate: 30,
   *     velocityY: [20, 40],
   *     startColor: { r: 1, g: 0.5, b: 0, a: 1 },
   *     endColor: { r: 0.3, g: 0, b: 0, a: 0 },
   *   });
   * });
   * ```
   */
  export declare function drawContinuous(id: string, x: number, y: number, dt: number, options?: {
      rate?: number;
      lifetime?: [number, number];
      velocityX?: [number, number];
      velocityY?: [number, number];
      startColor?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      endColor?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      textureId?: number;
      size?: number;
      radius?: number;
      layer?: number;
      maxParticles?: number;
  }): void;
  /**
   * Stop a continuous particle effect and remove its managed emitter.
   *
   * @param id - The unique identifier passed to drawContinuous().
   *
   * @example
   * ```ts
   * // Stop the jetpack effect when player lands
   * if (player.onGround) {
   *   stopContinuous("jetpack");
   * }
   * ```
   */
  export declare function stopContinuous(id: string): void;
  /**
   * Spawn a self-destructing particle burst at a position.
   *
   * Creates an emitter that emits `count` particles over `duration` seconds,
   * then automatically stops spawning and cleans up once all particles die.
   * Uses the Rust particle backend when available; falls back to TS emitters
   * in headless mode.
   *
   * Managed bursts are updated and drawn inside {@link updateParticles} —
   * no per-frame bookkeeping needed.
   *
   * @param x - World X position.
   * @param y - World Y position.
   * @param opts - Burst configuration. See {@link BurstOptions}.
   *
   * @example
   * // Explosion on hit
   * spawnBurst(enemy.x, enemy.y, {
   *   count: 30,
   *   speedMax: 250,
   *   gravityY: 400,
   *   lifetime: [0.3, 1.0],
   * });
   */
  export declare function spawnBurst(x: number, y: number, opts?: BurstOptions): void;
  /**
   * Get the number of active managed bursts.
   * Useful for testing and debugging.
   *
   * @returns Number of active managed burst emitters.
   */
  export declare function getManagedBurstCount(): number;

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
  /**
   * Options for quick particle functions. Unset fields use preset defaults.
   *
   * This is a simplified interface — not the same as {@link EmitterConfig}.
   * Use the `speed` multiplier (not `velocityX`/`velocityY` ranges directly).
   * For full control over emitter shape, affectors, and all config fields,
   * use {@link spawnEmitter} directly.
   */
  export type ParticleOptions = {
      /** Number of particles (burst) or rate (stream). */
      count?: number;
      /** Start color. */
      color?: Color;
      /** End color. */
      endColor?: Color;
      /**
       * Speed multiplier (scales velocity range). Default: 1.
       *
       * @remarks
       * This multiplies the preset's built-in velocity ranges, NOT an absolute speed.
       * The "sparks" preset has ±120 px/s velocity, so `speed: 10` = ±1200 px/s.
       * For gentle or precise particle motion, specify `velocityX`/`velocityY` directly
       * and omit `speed`.
       */
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
  export declare const ParticlePresets: {
      /** Small brown/tan particles, fast fade. Good for footsteps, impacts on ground. */
      readonly dust: {
          readonly startColor: {
              readonly r: 0.6;
              readonly g: 0.5;
              readonly b: 0.3;
              readonly a: 0.8;
          };
          readonly endColor: {
              readonly r: 0.5;
              readonly g: 0.4;
              readonly b: 0.3;
              readonly a: 0;
          };
          readonly lifetime: [number, number];
          readonly velocityX: [number, number];
          readonly velocityY: [number, number];
          readonly scale: [number, number];
          readonly count: 8;
      };
      /** Orange-to-red, rising particles with additive feel. */
      readonly fire: {
          readonly startColor: {
              readonly r: 1;
              readonly g: 0.7;
              readonly b: 0.1;
              readonly a: 1;
          };
          readonly endColor: {
              readonly r: 0.8;
              readonly g: 0.1;
              readonly b: 0;
              readonly a: 0;
          };
          readonly lifetime: [number, number];
          readonly velocityX: [number, number];
          readonly velocityY: [number, number];
          readonly scale: [number, number];
          readonly count: 15;
      };
      /** Bright yellow-to-red, fast, scattered. Good for hits and explosions. */
      readonly sparks: {
          readonly startColor: {
              readonly r: 1;
              readonly g: 0.9;
              readonly b: 0.3;
              readonly a: 1;
          };
          readonly endColor: {
              readonly r: 1;
              readonly g: 0.2;
              readonly b: 0;
              readonly a: 0;
          };
          readonly lifetime: [number, number];
          readonly velocityX: [number, number];
          readonly velocityY: [number, number];
          readonly scale: [number, number];
          readonly count: 12;
      };
      /** Gray, slow, rising. Good for chimneys, aftermath of fire. */
      readonly smoke: {
          readonly startColor: {
              readonly r: 0.5;
              readonly g: 0.5;
              readonly b: 0.5;
              readonly a: 0.6;
          };
          readonly endColor: {
              readonly r: 0.3;
              readonly g: 0.3;
              readonly b: 0.3;
              readonly a: 0;
          };
          readonly lifetime: [number, number];
          readonly velocityX: [number, number];
          readonly velocityY: [number, number];
          readonly scale: [number, number];
          readonly scaleSpeed: [number, number];
          readonly count: 6;
      };
  };
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
   * burstParticles(x, y, { color: rgb(0, 255, 0) });
   */
  export declare function burstParticles(x: number, y: number, options?: ParticleOptions): Emitter;
  /**
   * Create a continuous particle stream at a position.
   *
   * @remarks
   * **Do not call this every frame.** Each call creates a new continuous emitter.
   * Calling `streamParticles()` inside `onFrame()` creates unbounded emitters and
   * leaks particles. Call once (on init or on event), then move the returned emitter
   * via `emitter.config.x`/`emitter.config.y`. For repeated one-shot effects
   * (movement trails, impacts), use {@link burstParticles} instead.
   *
   * @param x - World X position.
   * @param y - World Y position.
   * @param options - Override preset defaults. Use `preset` to pick a base config.
   * @returns The created emitter. Move it by updating `emitter.config.x/y`.
   *
   * @example
   * // Call once:
   * const smoke = streamParticles(chimney.x, chimney.y, { preset: "smoke" });
   * // Move each frame:
   * smoke.config.x = chimney.x;
   * smoke.config.y = chimney.y;
   */
  export declare function streamParticles(x: number, y: number, options?: ParticleOptions): Emitter;

}
