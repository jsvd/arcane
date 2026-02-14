/**
 * Floating text / damage numbers.
 *
 * Auto-animating text that rises and fades. Used for damage numbers, XP gains,
 * status messages, item pickups. Internally manages a pool of active instances
 * that auto-remove on completion.
 *
 * @example
 * ```ts
 * // Spawn a red damage number
 * spawnFloatingText(enemy.x, enemy.y, "-25", {
 *   color: { r: 1, g: 0.2, b: 0.2, a: 1 },
 *   rise: 40,
 *   duration: 0.8,
 * });
 *
 * // In your game loop:
 * updateFloatingTexts(dt);
 * drawFloatingTexts();
 * ```
 */

import { drawText } from "./text.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for spawning floating text. */
export type FloatingTextOptions = {
  /** Text color. Default: white. */
  color?: { r: number; g: number; b: number; a: number };
  /** Total rise distance in world units. Default: 30. */
  rise?: number;
  /** Animation duration in seconds. Default: 1.0. */
  duration?: number;
  /** Text scale multiplier. Default: 1. */
  scale?: number;
  /** Draw layer. Default: 150. */
  layer?: number;
  /** If true, coordinates are screen-space. Default: false. */
  screenSpace?: boolean;
  /** Initial horizontal velocity (drift) in units/sec. Default: 0. */
  driftX?: number;
  /** Easing for the fade: "linear" or "easeOut". Default: "easeOut". */
  fadeEasing?: "linear" | "easeOut";
  /** If true, text scales up briefly at spawn (pop effect). Default: false. */
  pop?: boolean;
};

/** An active floating text instance. */
type FloatingTextInstance = {
  text: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  rise: number;
  duration: number;
  elapsed: number;
  scale: number;
  baseScale: number;
  color: { r: number; g: number; b: number; a: number };
  layer: number;
  screenSpace: boolean;
  driftX: number;
  fadeEasing: "linear" | "easeOut";
  pop: boolean;
  alive: boolean;
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Active floating text instances. */
const instances: FloatingTextInstance[] = [];

/** Object pool for reuse. */
const pool: FloatingTextInstance[] = [];

/** Maximum pool size. */
const MAX_POOL_SIZE = 64;

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function getInstance(): FloatingTextInstance {
  if (pool.length > 0) {
    return pool.pop()!;
  }
  return {
    text: "",
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    rise: 30,
    duration: 1.0,
    elapsed: 0,
    scale: 1,
    baseScale: 1,
    color: { r: 1, g: 1, b: 1, a: 1 },
    layer: 150,
    screenSpace: false,
    driftX: 0,
    fadeEasing: "easeOut",
    pop: false,
    alive: false,
  };
}

function recycleInstance(inst: FloatingTextInstance): void {
  inst.alive = false;
  if (pool.length < MAX_POOL_SIZE) {
    pool.push(inst);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Spawn a floating text that rises and fades automatically.
 *
 * @param x - World X position (or screen X if screenSpace).
 * @param y - World Y position (or screen Y if screenSpace).
 * @param text - The text to display.
 * @param options - Animation and styling options.
 */
export function spawnFloatingText(
  x: number,
  y: number,
  text: string,
  options?: FloatingTextOptions,
): void {
  const inst = getInstance();
  inst.text = text;
  inst.startX = x;
  inst.startY = y;
  inst.currentX = x;
  inst.currentY = y;
  inst.rise = options?.rise ?? 30;
  inst.duration = options?.duration ?? 1.0;
  inst.elapsed = 0;
  inst.baseScale = options?.scale ?? 1;
  inst.scale = inst.baseScale;
  inst.color = options?.color
    ? { ...options.color }
    : { r: 1, g: 1, b: 1, a: 1 };
  inst.layer = options?.layer ?? 150;
  inst.screenSpace = options?.screenSpace ?? false;
  inst.driftX = options?.driftX ?? 0;
  inst.fadeEasing = options?.fadeEasing ?? "easeOut";
  inst.pop = options?.pop ?? false;
  inst.alive = true;

  instances.push(inst);
}

/**
 * Update all active floating texts. Call once per frame.
 *
 * @param dt - Delta time in seconds.
 */
export function updateFloatingTexts(dt: number): void {
  for (let i = instances.length - 1; i >= 0; i--) {
    const inst = instances[i];
    if (!inst.alive) {
      instances.splice(i, 1);
      recycleInstance(inst);
      continue;
    }

    inst.elapsed += dt;

    if (inst.elapsed >= inst.duration) {
      instances.splice(i, 1);
      recycleInstance(inst);
      continue;
    }

    const t = inst.elapsed / inst.duration; // 0-1 progress

    // Rise: ease out (decelerate)
    const riseT = 1 - (1 - t) * (1 - t); // easeOutQuad
    inst.currentY = inst.startY - inst.rise * riseT;
    inst.currentX = inst.startX + inst.driftX * t;

    // Pop effect: brief scale up at start
    if (inst.pop) {
      const popPhase = Math.min(t * 5, 1); // first 20% of duration
      if (popPhase < 1) {
        inst.scale = inst.baseScale * (1 + 0.5 * Math.sin(popPhase * Math.PI));
      } else {
        inst.scale = inst.baseScale;
      }
    }

    // Fade
    let alpha: number;
    if (inst.fadeEasing === "linear") {
      alpha = 1 - t;
    } else {
      // easeOut fade: stays opaque longer, fades quickly at end
      alpha = 1 - t * t;
    }
    inst.color.a = Math.max(0, alpha);
  }
}

/**
 * Draw all active floating texts. Call once per frame after update.
 * No-op in headless mode (drawText is no-op).
 */
export function drawFloatingTexts(): void {
  for (const inst of instances) {
    if (!inst.alive) continue;

    drawText(inst.text, inst.currentX, inst.currentY, {
      scale: inst.scale,
      tint: inst.color,
      layer: inst.layer,
      screenSpace: inst.screenSpace,
    });
  }
}

/**
 * Get the number of active floating text instances.
 * @returns Active count.
 */
export function getFloatingTextCount(): number {
  return instances.filter((i) => i.alive).length;
}

/**
 * Remove all active floating texts immediately.
 */
export function clearFloatingTexts(): void {
  for (let i = instances.length - 1; i >= 0; i--) {
    recycleInstance(instances[i]);
  }
  instances.length = 0;
}

/**
 * Reset all state. For testing only.
 */
export function _resetFloatingTexts(): void {
  instances.length = 0;
  pool.length = 0;
}
