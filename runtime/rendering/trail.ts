/**
 * Trail / ribbon renderer.
 *
 * Creates a ribbon that follows a moving point. Internally stores a list of
 * points. Each frame new points are added and old ones expire. The trail is
 * rendered as a sequence of sprite quads connecting adjacent points, with
 * configurable width, color fade, and opacity.
 *
 * This is a TS-only feature — no Rust/GPU changes needed. Each trail segment
 * is drawn as a rotated sprite quad.
 *
 * @example
 * ```ts
 * const trail = createTrail({ maxLength: 20, width: 8, color: { r: 1, g: 0.5, b: 0, a: 1 } });
 *
 * onFrame(() => {
 *   updateTrail(trail, mouseX, mouseY);
 *   drawTrail(trail);
 * });
 * ```
 */

import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";
import { createSolidTexture } from "./texture.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single point in the trail. */
export type TrailPoint = {
  x: number;
  y: number;
  age: number; // seconds since added
};

/** Configuration for creating a trail. */
export type TrailConfig = {
  /** Maximum number of points before oldest are removed. Default: 30. */
  maxLength?: number;
  /** Width of the ribbon in world units. Default: 8. */
  width?: number;
  /** RGBA color of the trail. Default: white. */
  color?: { r: number; g: number; b: number; a: number };
  /** End color (fades from color to endColor along the trail). Optional. */
  endColor?: { r: number; g: number; b: number; a: number };
  /** Maximum lifetime per point in seconds. Points older than this are removed. Default: 1.0. */
  maxAge?: number;
  /** Draw layer. Default: 0. */
  layer?: number;
  /** Optional texture for the trail segments. Uses solid color if not provided. */
  textureId?: TextureId;
  /** Blend mode for trail segments. Default: "alpha". */
  blendMode?: "alpha" | "additive" | "multiply" | "screen";
  /** Minimum distance between consecutive points. Default: 2. */
  minDistance?: number;
};

/** A trail instance with state. */
export type Trail = {
  config: Required<Omit<TrailConfig, "textureId" | "endColor">> & {
    textureId: TextureId | null;
    endColor: { r: number; g: number; b: number; a: number } | null;
  };
  points: TrailPoint[];
  active: boolean;
};

// ---------------------------------------------------------------------------
// Solid texture cache
// ---------------------------------------------------------------------------

const texCache = new Map<string, number>();
function getSolidTex(r: number, g: number, b: number): number {
  const key = `trail_${r}_${g}_${b}`;
  let t = texCache.get(key);
  if (t !== undefined) return t;
  t = createSolidTexture(key, { r, g, b, a: 1 });
  texCache.set(key, t);
  return t;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new trail instance.
 *
 * @param config - Trail configuration.
 * @returns A new Trail ready for updateTrail/drawTrail.
 */
export function createTrail(config?: TrailConfig): Trail {
  const defaultColor = { r: 1, g: 1, b: 1, a: 1 };
  return {
    config: {
      maxLength: config?.maxLength ?? 30,
      width: config?.width ?? 8,
      color: config?.color ?? defaultColor,
      endColor: config?.endColor ?? null,
      maxAge: config?.maxAge ?? 1.0,
      layer: config?.layer ?? 0,
      textureId: config?.textureId ?? null,
      blendMode: config?.blendMode ?? "alpha",
      minDistance: config?.minDistance ?? 2,
    },
    points: [],
    active: true,
  };
}

/**
 * Add a new point to the trail head and age existing points.
 * Points that exceed maxAge or when the trail exceeds maxLength are removed.
 *
 * @param trail - The trail instance.
 * @param x - World X position.
 * @param y - World Y position.
 * @param dt - Delta time in seconds (for aging points). Default: 1/60.
 */
export function updateTrail(trail: Trail, x: number, y: number, dt: number = 1 / 60): void {
  if (!trail.active) return;

  // Age existing points
  for (const p of trail.points) {
    p.age += dt;
  }

  // Remove expired points
  trail.points = trail.points.filter((p) => p.age < trail.config.maxAge);

  // Check minimum distance from head
  if (trail.points.length > 0) {
    const head = trail.points[0];
    const dx = x - head.x;
    const dy = y - head.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < trail.config.minDistance) return;
  }

  // Add new point at the head (index 0)
  trail.points.unshift({ x, y, age: 0 });

  // Trim to max length
  while (trail.points.length > trail.config.maxLength) {
    trail.points.pop();
  }
}

/**
 * Draw the trail as a series of rotated sprite quads connecting adjacent points.
 * No-op in headless mode (drawSprite is no-op).
 *
 * @param trail - The trail instance.
 */
export function drawTrail(trail: Trail): void {
  const points = trail.points;
  if (points.length < 2) return;

  const cfg = trail.config;
  const tex = cfg.textureId ?? getSolidTex(cfg.color.r, cfg.color.g, cfg.color.b);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    // Segment center
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;

    // Segment length and angle
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Progress along trail: 0 at head, 1 at tail
    const progress = i / (points.length - 1);
    const ageFactor = Math.max(0, 1 - a.age / cfg.maxAge);

    // Width tapers toward tail
    const width = cfg.width * (1 - progress * 0.5) * ageFactor;

    // Color interpolation
    let r = cfg.color.r;
    let g = cfg.color.g;
    let b2 = cfg.color.b;
    let alpha = cfg.color.a;

    if (cfg.endColor) {
      r = cfg.color.r + (cfg.endColor.r - cfg.color.r) * progress;
      g = cfg.color.g + (cfg.endColor.g - cfg.color.g) * progress;
      b2 = cfg.color.b + (cfg.endColor.b - cfg.color.b) * progress;
      alpha = cfg.color.a + (cfg.endColor.a - cfg.color.a) * progress;
    }

    // Fade with age
    alpha *= ageFactor;

    if (width <= 0 || alpha <= 0) continue;

    drawSprite({
      textureId: tex,
      x: cx - length / 2,
      y: cy - width / 2,
      w: length,
      h: width,
      layer: cfg.layer,
      rotation: angle,
      originX: 0.5,
      originY: 0.5,
      opacity: alpha,
      tint: { r, g, b: b2, a: 1 },
      blendMode: cfg.blendMode,
    });
  }
}

/**
 * Clear all points from a trail.
 *
 * @param trail - The trail instance.
 */
export function clearTrail(trail: Trail): void {
  trail.points = [];
}

/**
 * Pause a trail — stops adding new points but keeps rendering existing ones.
 *
 * @param trail - The trail instance.
 */
export function pauseTrail(trail: Trail): void {
  trail.active = false;
}

/**
 * Resume a paused trail.
 *
 * @param trail - The trail instance.
 */
export function resumeTrail(trail: Trail): void {
  trail.active = true;
}

/**
 * Get the number of points currently in the trail.
 *
 * @param trail - The trail instance.
 * @returns Point count.
 */
export function getTrailPointCount(trail: Trail): number {
  return trail.points.length;
}
