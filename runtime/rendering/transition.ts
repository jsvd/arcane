/**
 * Screen transitions: visual effects applied during scene changes.
 *
 * Transitions work as a timed overlay that covers the screen. At the midpoint
 * the actual scene swap happens (hidden behind the overlay). Each transition
 * type uses a different visual pattern to reveal/conceal.
 *
 * Built-in types:
 * - **fade** — simple alpha fade to/from a solid color
 * - **wipe** — horizontal sweep from left to right
 * - **circleIris** — expanding/contracting circle from center
 * - **diamond** — diamond-shaped iris
 * - **pixelate** — increasing pixel size that obscures the image
 *
 * Integrates with the scene manager: pass a {@link ScreenTransitionConfig} to
 * `pushScene()`, `popScene()`, or `replaceScene()` and the transition renders
 * automatically via {@link updateScreenTransition} / {@link drawScreenTransition}.
 *
 * @example
 * ```ts
 * import { startScreenTransition, updateScreenTransition, drawScreenTransition } from "./transition.ts";
 *
 * startScreenTransition("circleIris", 0.6, { color: { r: 0, g: 0, b: 0 } }, () => {
 *   // swap scene at midpoint
 * });
 * ```
 */

import { drawSprite } from "./sprites.ts";
import { createSolidTexture } from "./texture.ts";
import { getViewportSize } from "./input.ts";
import { getCamera } from "./camera.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Available screen transition visual patterns. */
export type ScreenTransitionType =
  | "fade"
  | "wipe"
  | "circleIris"
  | "diamond"
  | "pixelate";

/** Configuration for a screen transition. */
export type ScreenTransitionConfig = {
  /** Transition visual pattern. Default: "fade". */
  type?: ScreenTransitionType;
  /** Total duration in seconds. Default: 0.5. */
  duration?: number;
  /** Overlay color. Default: black. */
  color?: { r: number; g: number; b: number };
  /** Draw layer for the overlay. Default: 250. */
  layer?: number;
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let active = false;
let elapsed = 0;
let duration = 0.5;
let phase: "out" | "in" = "out";
let transType: ScreenTransitionType = "fade";
let color = { r: 0, g: 0, b: 0 };
let layer = 250;
let midpointAction: (() => void) | null = null;
let onCompleteAction: (() => void) | null = null;

/** Solid color texture cache for the overlay. */
const texCache = new Map<string, number>();
function getColorTex(r: number, g: number, b: number): number {
  const key = `trans_${r}_${g}_${b}`;
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
 * Start a screen transition. At the midpoint (half duration), `onMidpoint`
 * is called — this is where you swap scenes. The transition then plays in
 * reverse to reveal the new scene.
 *
 * @param type - Visual pattern.
 * @param dur - Duration in seconds.
 * @param config - Color and layer overrides.
 * @param onMidpoint - Callback executed at the midpoint (scene swap).
 * @param onComplete - Callback executed when the transition finishes.
 */
export function startScreenTransition(
  type: ScreenTransitionType,
  dur: number,
  config?: { color?: { r: number; g: number; b: number }; layer?: number },
  onMidpoint?: () => void,
  onComplete?: () => void,
): void {
  active = true;
  elapsed = 0;
  duration = Math.max(0.001, dur);
  phase = "out";
  transType = type;
  color = config?.color ?? { r: 0, g: 0, b: 0 };
  layer = config?.layer ?? 250;
  midpointAction = onMidpoint ?? null;
  onCompleteAction = onComplete ?? null;
}

/**
 * Advance the transition timer. Call once per frame.
 *
 * @param dt - Delta time in seconds.
 */
export function updateScreenTransition(dt: number): void {
  if (!active) return;

  elapsed += dt;
  const halfDuration = duration / 2;

  if (phase === "out" && elapsed >= halfDuration) {
    if (midpointAction) {
      midpointAction();
      midpointAction = null;
    }
    phase = "in";
  }

  if (elapsed >= duration) {
    active = false;
    elapsed = 0;
    if (onCompleteAction) {
      onCompleteAction();
      onCompleteAction = null;
    }
  }
}

/**
 * Draw the transition overlay. Call after scene rendering each frame.
 * No-op when no transition is active.
 */
export function drawScreenTransition(): void {
  if (!active) return;

  const halfDuration = duration / 2;
  let progress: number; // 0 = fully transparent, 1 = fully opaque

  if (phase === "out") {
    progress = halfDuration > 0 ? Math.min(elapsed / halfDuration, 1) : 1;
  } else {
    const inElapsed = elapsed - halfDuration;
    progress = halfDuration > 0 ? Math.max(1 - inElapsed / halfDuration, 0) : 0;
  }

  switch (transType) {
    case "fade":
      drawFade(progress);
      break;
    case "wipe":
      drawWipe(progress);
      break;
    case "circleIris":
      drawCircleIris(progress);
      break;
    case "diamond":
      drawDiamond(progress);
      break;
    case "pixelate":
      drawPixelate(progress);
      break;
  }
}

/**
 * Check whether a screen transition is currently active.
 * @returns True if transitioning.
 */
export function isScreenTransitionActive(): boolean {
  return active;
}

/**
 * Get the current transition progress (0-1). During "out" phase, 0->1.
 * During "in" phase, 1->0. Returns 0 when no transition is active.
 */
export function getScreenTransitionProgress(): number {
  if (!active) return 0;
  const halfDuration = duration / 2;
  if (phase === "out") {
    return halfDuration > 0 ? Math.min(elapsed / halfDuration, 1) : 1;
  }
  const inElapsed = elapsed - halfDuration;
  return halfDuration > 0 ? Math.max(1 - inElapsed / halfDuration, 0) : 0;
}

/**
 * Reset transition state. For testing only.
 */
export function _resetScreenTransition(): void {
  active = false;
  elapsed = 0;
  duration = 0.5;
  phase = "out";
  transType = "fade";
  color = { r: 0, g: 0, b: 0 };
  layer = 250;
  midpointAction = null;
  onCompleteAction = null;
}

// ---------------------------------------------------------------------------
// Screen-space helpers
// ---------------------------------------------------------------------------

/** Convert screen-space rect to world-space for drawSprite. */
function screenToWorld(sx: number, sy: number, sw: number, sh: number) {
  const cam = getCamera();
  const { width: vpW, height: vpH } = getViewportSize();
  return {
    x: sx / cam.zoom + cam.x - vpW / (2 * cam.zoom),
    y: sy / cam.zoom + cam.y - vpH / (2 * cam.zoom),
    w: sw / cam.zoom,
    h: sh / cam.zoom,
  };
}

// ---------------------------------------------------------------------------
// Transition renderers
// ---------------------------------------------------------------------------

function drawFade(progress: number): void {
  const tex = getColorTex(color.r, color.g, color.b);
  const { width: vpW, height: vpH } = getViewportSize();
  const world = screenToWorld(0, 0, vpW, vpH);
  drawSprite({
    textureId: tex,
    x: world.x,
    y: world.y,
    w: world.w,
    h: world.h,
    layer,
    opacity: progress,
  });
}

function drawWipe(progress: number): void {
  const tex = getColorTex(color.r, color.g, color.b);
  const { width: vpW, height: vpH } = getViewportSize();
  const wipeW = vpW * progress;
  const world = screenToWorld(0, 0, wipeW, vpH);
  drawSprite({
    textureId: tex,
    x: world.x,
    y: world.y,
    w: world.w,
    h: world.h,
    layer,
  });
}

function drawCircleIris(progress: number): void {
  // Approximate a circle iris with overlapping rects forming a frame.
  // At progress=1, the entire screen is covered. At progress=0, nothing.
  // We draw 4 rects leaving a circular hole approximated by border insets.
  const tex = getColorTex(color.r, color.g, color.b);
  const { width: vpW, height: vpH } = getViewportSize();
  const maxRadius = Math.sqrt((vpW / 2) ** 2 + (vpH / 2) ** 2);
  const radius = maxRadius * (1 - progress);

  // Cover the screen, leaving a circle-ish hole via 4 border rects
  // Top
  const topH = Math.max(0, vpH / 2 - radius);
  if (topH > 0) {
    const w = screenToWorld(0, 0, vpW, topH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
  // Bottom
  const botY = vpH / 2 + radius;
  const botH = Math.max(0, vpH - botY);
  if (botH > 0) {
    const w = screenToWorld(0, botY, vpW, botH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
  // Left
  const leftW = Math.max(0, vpW / 2 - radius);
  const midTop = topH;
  const midH = vpH - topH - botH;
  if (leftW > 0 && midH > 0) {
    const w = screenToWorld(0, midTop, leftW, midH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
  // Right
  const rightX = vpW / 2 + radius;
  const rightW = Math.max(0, vpW - rightX);
  if (rightW > 0 && midH > 0) {
    const w = screenToWorld(rightX, midTop, rightW, midH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
}

function drawDiamond(progress: number): void {
  // Similar to circleIris but with diamond shape — approximate with 4 triangular rects
  const tex = getColorTex(color.r, color.g, color.b);
  const { width: vpW, height: vpH } = getViewportSize();
  const maxSize = Math.max(vpW, vpH);
  const holeSize = maxSize * (1 - progress);

  // Diamond approximated: top/bottom/left/right bands narrowing toward center
  const cx = vpW / 2;
  const cy = vpH / 2;
  const halfW = holeSize / 2;
  const halfH = holeSize / 2;

  // Top region
  const topH = Math.max(0, cy - halfH);
  if (topH > 0) {
    const w = screenToWorld(0, 0, vpW, topH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
  // Bottom region
  const botY = cy + halfH;
  const botH = Math.max(0, vpH - botY);
  if (botH > 0) {
    const w = screenToWorld(0, botY, vpW, botH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
  // Left region (middle strip)
  const leftW = Math.max(0, cx - halfW);
  const midTop = topH;
  const midH = vpH - topH - botH;
  if (leftW > 0 && midH > 0) {
    const w = screenToWorld(0, midTop, leftW, midH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
  // Right region (middle strip)
  const rightX = cx + halfW;
  const rightW = Math.max(0, vpW - rightX);
  if (rightW > 0 && midH > 0) {
    const w = screenToWorld(rightX, midTop, rightW, midH);
    drawSprite({ textureId: tex, x: w.x, y: w.y, w: w.w, h: w.h, layer });
  }
}

function drawPixelate(progress: number): void {
  // Pixelate: draw a grid of colored rects that get bigger as progress increases.
  // At progress=1, rects are huge = solid color. At progress=0, invisible.
  if (progress <= 0) return;

  const tex = getColorTex(color.r, color.g, color.b);
  const { width: vpW, height: vpH } = getViewportSize();

  // Grid size ranges from 2x2 (almost invisible) to screen-filling
  const minBlockSize = 4;
  const maxBlockSize = Math.max(vpW, vpH);
  const blockSize = minBlockSize + (maxBlockSize - minBlockSize) * progress * progress;

  // For large block sizes, just draw a single rect
  if (blockSize >= Math.min(vpW, vpH) / 2) {
    const world = screenToWorld(0, 0, vpW, vpH);
    drawSprite({
      textureId: tex,
      x: world.x,
      y: world.y,
      w: world.w,
      h: world.h,
      layer,
      opacity: progress,
    });
    return;
  }

  // Draw scattered blocks with alpha proportional to progress
  const cols = Math.ceil(vpW / blockSize);
  const rows = Math.ceil(vpH / blockSize);
  const alpha = Math.min(progress * 1.5, 1); // fade in faster than grow
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const sx = gx * blockSize;
      const sy = gy * blockSize;
      const sw = Math.min(blockSize, vpW - sx);
      const sh = Math.min(blockSize, vpH - sy);
      const world = screenToWorld(sx, sy, sw, sh);
      drawSprite({
        textureId: tex,
        x: world.x,
        y: world.y,
        w: world.w,
        h: world.h,
        layer,
        opacity: alpha,
      });
    }
  }
}
