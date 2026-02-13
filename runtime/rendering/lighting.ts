const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_set_ambient_light ===
    "function";

// --- Existing point-light API (backward compatible) ---

/**
 * Set the ambient light color applied to all sprites.
 * (1, 1, 1) = full white (no darkening, the default).
 * (0, 0, 0) = complete darkness (only point lights visible).
 * No-op in headless mode.
 *
 * @param r - Red channel, 0.0-1.0.
 * @param g - Green channel, 0.0-1.0.
 * @param b - Blue channel, 0.0-1.0.
 */
export function setAmbientLight(r: number, g: number, b: number): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_ambient_light(r, g, b);
}

/**
 * Add a point light at a world position.
 * Point lights illuminate sprites within their radius, blending with the ambient light.
 * Must be called every frame (lights are cleared at frame start).
 * No-op in headless mode.
 *
 * @param x - Light center X in world units.
 * @param y - Light center Y in world units.
 * @param radius - Light radius in world units. Falloff is smooth to the edge.
 * @param r - Light color red channel, 0.0-1.0. Default: 1.
 * @param g - Light color green channel, 0.0-1.0. Default: 1.
 * @param b - Light color blue channel, 0.0-1.0. Default: 1.
 * @param intensity - Light brightness multiplier, 0.0+. Default: 1.
 */
export function addPointLight(
  x: number,
  y: number,
  radius: number,
  r: number = 1,
  g: number = 1,
  b: number = 1,
  intensity: number = 1,
): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_add_point_light(
    x,
    y,
    radius,
    r,
    g,
    b,
    intensity,
  );
}

/**
 * Clear all point lights for this frame.
 * Called automatically at frame start by the renderer; manual use is rarely needed.
 * No-op in headless mode.
 */
export function clearLights(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_lights();
}

// --- Global Illumination (Radiance Cascades) ---

/**
 * Enable Radiance Cascades global illumination.
 * When enabled, light propagates realistically through the scene:
 * emissive surfaces cast light, occluders block it, and light bounces.
 * Existing point lights and ambient light continue to work alongside GI.
 * No-op in headless mode.
 */
export function enableGlobalIllumination(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_enable_gi();
}

/**
 * Disable Radiance Cascades global illumination.
 * Falls back to the basic point-light system.
 * No-op in headless mode.
 */
export function disableGlobalIllumination(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_disable_gi();
}

/**
 * Set the global illumination intensity multiplier.
 * Higher values = brighter GI light. Default: 1.0.
 * No-op in headless mode.
 *
 * @param intensity - GI brightness, 0.0+. Default: 1.0.
 */
export function setGIIntensity(intensity: number): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_gi_intensity(intensity);
}

/** Options for GI quality. */
export interface GIQualityOptions {
  /** Probe spacing in pixels. Smaller = smoother but slower. Default: 8. */
  probeSpacing?: number;
  /** Ray march interval in pixels. Default: 4. */
  interval?: number;
  /** Number of cascade levels. More = longer light reach. Default: 4. Max: 5. */
  cascadeCount?: number;
}

/**
 * Set GI quality parameters.
 *
 * Controls the resolution and reach of the radiance cascades algorithm.
 * Smaller probeSpacing produces smoother light gradients but costs more GPU.
 * Call once at startup (persists across frames).
 *
 * No-op in headless mode.
 *
 * @param options - Quality configuration.
 */
export function setGIQuality(options: GIQualityOptions): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_gi_quality(
    options.probeSpacing ?? 0,
    options.interval ?? 0,
    options.cascadeCount ?? 0,
  );
}

// --- Emissive Surfaces ---

/** Options for an emissive surface. */
export interface EmissiveOptions {
  /** World X position. */
  x: number;
  /** World Y position. */
  y: number;
  /** Width in world units. */
  width: number;
  /** Height in world units. */
  height: number;
  /** Red channel, 0.0-1.0. Default: 1. */
  r?: number;
  /** Green channel, 0.0-1.0. Default: 1. */
  g?: number;
  /** Blue channel, 0.0-1.0. Default: 1. */
  b?: number;
  /** Emission intensity. Default: 1. */
  intensity?: number;
}

/**
 * Add an emissive surface that radiates light in GI mode.
 * Emissive surfaces act as area light sources when GI is enabled.
 * Must be called every frame (cleared at frame start).
 * No-op in headless mode or when GI is disabled.
 *
 * @param options - Emissive surface configuration.
 */
export function addEmissive(options: EmissiveOptions): void {
  if (!hasRenderOps) return;
  const r = options.r ?? 1;
  const g = options.g ?? 1;
  const b = options.b ?? 1;
  const intensity = options.intensity ?? 1;
  (globalThis as any).Deno.core.ops.op_add_emissive(
    options.x,
    options.y,
    options.width,
    options.height,
    r,
    g,
    b,
    intensity,
  );
}

/**
 * Clear all emissive surfaces for this frame.
 * No-op in headless mode.
 */
export function clearEmissives(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_emissives();
}

// --- Occluders ---

/** Options for an occluder (light-blocking rectangle). */
export interface OccluderOptions {
  /** World X position. */
  x: number;
  /** World Y position. */
  y: number;
  /** Width in world units. */
  width: number;
  /** Height in world units. */
  height: number;
}

/**
 * Add a rectangular occluder that blocks light in GI mode.
 * Occluders cast shadows when light rays encounter them.
 * Must be called every frame (cleared at frame start).
 * No-op in headless mode or when GI is disabled.
 *
 * @param options - Occluder rectangle.
 */
export function addOccluder(options: OccluderOptions): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_add_occluder(
    options.x,
    options.y,
    options.width,
    options.height,
  );
}

/**
 * Clear all occluders for this frame.
 * No-op in headless mode.
 */
export function clearOccluders(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_clear_occluders();
}

// --- Directional Lights ---

/** Options for a directional light (infinite parallel rays). */
export interface DirectionalLightOptions {
  /** Light direction angle in radians. 0 = right, PI/2 = down. */
  angle: number;
  /** Red channel, 0.0-1.0. Default: 1. */
  r?: number;
  /** Green channel, 0.0-1.0. Default: 1. */
  g?: number;
  /** Blue channel, 0.0-1.0. Default: 1. */
  b?: number;
  /** Light brightness. Default: 1. */
  intensity?: number;
}

/**
 * Add a directional light (sun/moon — infinite distance, parallel rays).
 * Directional lights affect the entire scene uniformly from a given angle.
 * Must be called every frame (cleared with clearLights()).
 * No-op in headless mode.
 *
 * @param options - Directional light configuration.
 */
export function addDirectionalLight(options: DirectionalLightOptions): void {
  if (!hasRenderOps) return;
  const r = options.r ?? 1;
  const g = options.g ?? 1;
  const b = options.b ?? 1;
  const intensity = options.intensity ?? 1;
  (globalThis as any).Deno.core.ops.op_add_directional_light(
    options.angle,
    r,
    g,
    b,
    intensity,
  );
}

// --- Spot Lights ---

/** Options for a spot light (positioned cone of light). */
export interface SpotLightOptions {
  /** World X position. */
  x: number;
  /** World Y position. */
  y: number;
  /** Direction angle in radians. 0 = right, PI/2 = down. */
  angle: number;
  /** Cone half-angle spread in radians. Default: 0.5 (about 28 degrees). */
  spread?: number;
  /** Light range in world units. Default: 200. */
  range?: number;
  /** Red channel, 0.0-1.0. Default: 1. */
  r?: number;
  /** Green channel, 0.0-1.0. Default: 1. */
  g?: number;
  /** Blue channel, 0.0-1.0. Default: 1. */
  b?: number;
  /** Light brightness. Default: 1. */
  intensity?: number;
}

/**
 * Add a spot light (positioned cone of light, like a flashlight).
 * Must be called every frame (cleared with clearLights()).
 * No-op in headless mode.
 *
 * @param options - Spot light configuration.
 */
export function addSpotLight(options: SpotLightOptions): void {
  if (!hasRenderOps) return;
  const spread = options.spread ?? 0.5;
  const range = options.range ?? 200;
  const r = options.r ?? 1;
  const g = options.g ?? 1;
  const b = options.b ?? 1;
  const intensity = options.intensity ?? 1;
  (globalThis as any).Deno.core.ops.op_add_spot_light(
    options.x,
    options.y,
    options.angle,
    spread,
    range,
    r,
    g,
    b,
    intensity,
  );
}

// --- Color Temperature Presets ---

/** Color temperature presets as [r, g, b] tuples (0.0-1.0 range). */
export const colorTemp = {
  /** Warm candlelight (1800K). */
  candlelight: [1.0, 0.58, 0.16] as [number, number, number],
  /** Warm incandescent (2700K). */
  incandescent: [1.0, 0.71, 0.42] as [number, number, number],
  /** Warm white (3000K). */
  warmWhite: [1.0, 0.76, 0.5] as [number, number, number],
  /** Neutral daylight (5500K). */
  daylight: [1.0, 0.96, 0.9] as [number, number, number],
  /** Cool fluorescent (6500K). */
  fluorescent: [0.9, 0.94, 1.0] as [number, number, number],
  /** Cool moonlight (7500K). */
  moonlight: [0.78, 0.86, 1.0] as [number, number, number],
  /** Vibrant neon pink. */
  neonPink: [1.0, 0.2, 0.6] as [number, number, number],
  /** Vibrant neon blue. */
  neonBlue: [0.2, 0.4, 1.0] as [number, number, number],
  /** Vibrant neon green. */
  neonGreen: [0.2, 1.0, 0.4] as [number, number, number],
  /** Fire/torch (warm orange). */
  torch: [1.0, 0.65, 0.25] as [number, number, number],
  /** Magical purple glow. */
  magic: [0.7, 0.3, 1.0] as [number, number, number],
  /** Blood red. */
  blood: [0.9, 0.1, 0.1] as [number, number, number],
};

// --- Day/Night Cycle ---

/** Options for the day/night cycle helper. */
export interface DayNightOptions {
  /** Time of day, 0.0-1.0. 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk. */
  timeOfDay: number;
  /** Overall brightness multiplier. Default: 1. */
  intensity?: number;
}

/**
 * Set ambient and directional lighting based on time of day.
 * This is a convenience helper that calls setAmbientLight() and
 * optionally addDirectionalLight() to simulate a day/night cycle.
 *
 * @param options - Day/night configuration.
 */
export function setDayNightCycle(options: DayNightOptions): void {
  const t = options.timeOfDay % 1.0;
  const intensity = options.intensity ?? 1.0;

  // Smoothly interpolate ambient and sun color based on time
  // Night (0.0, 1.0): dark blue ambient, no sun
  // Dawn (0.25): warm orange tint, low sun
  // Noon (0.5): bright white, strong sun
  // Dusk (0.75): warm orange tint, low sun

  // Sun elevation: peaks at noon (0.5), zero at midnight (0.0/1.0)
  const sunElevation = Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  const isDaytime = sunElevation > 0.05;

  // Ambient color: interpolate from night blue to daylight white
  const nightAmbient = [0.05, 0.05, 0.15];
  const dayAmbient = [0.6, 0.65, 0.7];
  const ambientR =
    (nightAmbient[0] + (dayAmbient[0] - nightAmbient[0]) * sunElevation) *
    intensity;
  const ambientG =
    (nightAmbient[1] + (dayAmbient[1] - nightAmbient[1]) * sunElevation) *
    intensity;
  const ambientB =
    (nightAmbient[2] + (dayAmbient[2] - nightAmbient[2]) * sunElevation) *
    intensity;

  setAmbientLight(
    Math.min(ambientR, 1),
    Math.min(ambientG, 1),
    Math.min(ambientB, 1),
  );

  // Directional sun/moon light
  if (isDaytime) {
    // Sun angle: rises from left (-PI) at dawn, overhead at noon, sets right (0) at dusk
    const sunAngle = -Math.PI + t * Math.PI * 2;

    // Sun color: warm at horizon, white at peak
    const horizonFactor = 1 - sunElevation;
    const sunR = Math.min(1.0, 0.8 + horizonFactor * 0.2);
    const sunG = Math.min(1.0, 0.75 + sunElevation * 0.25);
    const sunB = Math.min(1.0, 0.5 + sunElevation * 0.5);

    addDirectionalLight({
      angle: sunAngle,
      r: sunR,
      g: sunG,
      b: sunB,
      intensity: sunElevation * 0.8 * intensity,
    });
  }
}
