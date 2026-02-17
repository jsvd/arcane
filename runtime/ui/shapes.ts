/**
 * Shape drawing primitives: circle, line, and triangle.
 *
 * Rendered via drawSprite() with cached solid textures — same pattern
 * as the rectangle/panel/bar primitives in primitives.ts.
 *
 * @example
 * ```ts
 * import { drawCircle, drawLine, drawTriangle } from "@arcane/runtime/ui";
 *
 * drawCircle(100, 100, 30, { color: { r: 1, g: 0, b: 0, a: 1 } });
 * drawLine(0, 0, 200, 150, { color: { r: 0, g: 1, b: 0, a: 1 }, thickness: 3 });
 * drawTriangle(50, 10, 10, 90, 90, 90, { color: { r: 0, g: 0, b: 1, a: 1 } });
 * ```
 */

import type { Color, ShapeOptions, LineOptions } from "./types.ts";
import { drawSprite } from "../rendering/sprites.ts";
import { createSolidTexture } from "../rendering/texture.ts";
import { getCamera } from "../rendering/camera.ts";
import { getViewportSize } from "../rendering/input.ts";
import { _logDrawCall } from "../testing/visual.ts";

// --- Internal helpers (duplicated from primitives.ts to keep module self-contained) ---

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_draw_sprite === "function";

const textureCache = new Map<string, number>();

function getColorTexture(color: Color): number {
  const key = `${color.r}_${color.g}_${color.b}_${color.a}`;
  let tex = textureCache.get(key);
  if (tex !== undefined) return tex;
  tex = createSolidTexture(
    key,
    Math.round(color.r * 255),
    Math.round(color.g * 255),
    Math.round(color.b * 255),
    Math.round(color.a * 255),
  );
  textureCache.set(key, tex);
  return tex;
}

function toWorld(
  sx: number, sy: number, sw: number, sh: number, screenSpace: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!screenSpace) return { x: sx, y: sy, w: sw, h: sh };
  const cam = getCamera();
  const { width: vpW, height: vpH } = getViewportSize();
  return {
    x: sx / cam.zoom + cam.x - vpW / (2 * cam.zoom),
    y: sy / cam.zoom + cam.y - vpH / (2 * cam.zoom),
    w: sw / cam.zoom,
    h: sh / cam.zoom,
  };
}

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };

/**
 * Draw a filled circle using scanline fill (one drawSprite per pixel row).
 * No-op in headless mode.
 *
 * @param cx - Center X position (screen pixels if screenSpace, world units otherwise).
 * @param cy - Center Y position (screen pixels if screenSpace, world units otherwise).
 * @param radius - Circle radius in pixels (screenSpace) or world units.
 * @param options - Color, layer, and screenSpace options.
 *
 * @example
 * drawCircle(200, 150, 40, { color: { r: 1, g: 0, b: 0, a: 1 } });
 */
export function drawCircle(
  cx: number,
  cy: number,
  radius: number,
  options?: ShapeOptions,
): void {
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "circle",
    cx,
    cy,
    radius,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasRenderOps) return;

  const color = options?.color ?? WHITE;
  const tex = getColorTexture(color);
  const r = Math.round(radius);

  for (let dy = -r; dy <= r; dy++) {
    const halfW = Math.sqrt(radius * radius - dy * dy);
    if (halfW <= 0) continue;
    const stripeX = cx - halfW;
    const stripeY = cy + dy;
    const stripeW = halfW * 2;
    const stripeH = 1;
    const pos = toWorld(stripeX, stripeY, stripeW, stripeH, ss);
    const posX = pos.x;
    const posY = pos.y;
    const posW = pos.w;
    const posH = pos.h;
    drawSprite({ textureId: tex, x: posX, y: posY, w: posW, h: posH, layer });
  }
}

/**
 * Draw a line between two points as a rotated rectangle.
 * No-op in headless mode.
 *
 * @param x1 - Start X position (screen pixels if screenSpace, world units otherwise).
 * @param y1 - Start Y position (screen pixels if screenSpace, world units otherwise).
 * @param x2 - End X position.
 * @param y2 - End Y position.
 * @param options - Color, thickness, layer, and screenSpace options.
 *
 * @example
 * drawLine(10, 10, 200, 150, { color: { r: 0, g: 1, b: 0, a: 1 }, thickness: 2 });
 */
export function drawLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: LineOptions,
): void {
  const thickness = options?.thickness ?? 1;
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "line",
    x1,
    y1,
    x2,
    y2,
    thickness,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasRenderOps) return;

  const color = options?.color ?? WHITE;
  const tex = getColorTexture(color);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // toWorld converts top-left corner + dimensions; we need to position
  // the rect so its center is at midpoint. drawSprite with originX/Y 0.5
  // rotates around the center of the rect, so we pass x/y as the top-left
  // of the unrotated rect (centered at midpoint).
  const rectX = midX - length / 2;
  const rectY = midY - thickness / 2;
  const pos = toWorld(rectX, rectY, length, thickness, ss);
  const posX = pos.x;
  const posY = pos.y;
  const posW = pos.w;
  const posH = pos.h;
  drawSprite({
    textureId: tex,
    x: posX,
    y: posY,
    w: posW,
    h: posH,
    layer,
    rotation: angle,
    originX: 0.5,
    originY: 0.5,
  });
}

/**
 * Draw a filled triangle using scanline fill.
 * Vertices are sorted by Y, then edges are interpolated per row.
 * No-op in headless mode.
 *
 * @param x1 - First vertex X.
 * @param y1 - First vertex Y.
 * @param x2 - Second vertex X.
 * @param y2 - Second vertex Y.
 * @param x3 - Third vertex X.
 * @param y3 - Third vertex Y.
 * @param options - Color, layer, and screenSpace options.
 *
 * @example
 * drawTriangle(100, 10, 50, 90, 150, 90, { color: { r: 0, g: 0, b: 1, a: 1 } });
 */
export function drawTriangle(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  options?: ShapeOptions,
): void {
  const layer = options?.layer ?? 90;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "triangle",
    x1,
    y1,
    x2,
    y2,
    x3,
    y3,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasRenderOps) return;

  const color = options?.color ?? WHITE;
  const tex = getColorTexture(color);

  // Sort vertices by Y coordinate (ascending)
  const verts: [number, number][] = [[x1, y1], [x2, y2], [x3, y3]];
  verts.sort((a, b) => a[1] - b[1]);

  const [vTop, vMid, vBot] = verts;
  const topX = vTop[0];
  const topY = vTop[1];
  const midX = vMid[0];
  const midY = vMid[1];
  const botX = vBot[0];
  const botY = vBot[1];

  const startY = Math.ceil(topY);
  const endY = Math.floor(botY);

  for (let scanY = startY; scanY <= endY; scanY++) {
    // Compute X range at this scanline by interpolating edges
    let xLeft = Infinity;
    let xRight = -Infinity;

    // Edge: top -> bot (always spans full height)
    if (botY !== topY) {
      const t = (scanY - topY) / (botY - topY);
      const ex = topX + t * (botX - topX);
      if (ex < xLeft) xLeft = ex;
      if (ex > xRight) xRight = ex;
    }

    // Edge: top -> mid (upper half)
    if (scanY <= midY && midY !== topY) {
      const t = (scanY - topY) / (midY - topY);
      const ex = topX + t * (midX - topX);
      if (ex < xLeft) xLeft = ex;
      if (ex > xRight) xRight = ex;
    }

    // Edge: mid -> bot (lower half)
    if (scanY >= midY && botY !== midY) {
      const t = (scanY - midY) / (botY - midY);
      const ex = midX + t * (botX - midX);
      if (ex < xLeft) xLeft = ex;
      if (ex > xRight) xRight = ex;
    }

    if (xLeft >= xRight) continue;

    const stripeW = xRight - xLeft;
    const pos = toWorld(xLeft, scanY, stripeW, 1, ss);
    const posX = pos.x;
    const posY = pos.y;
    const posW = pos.w;
    const posH = pos.h;
    drawSprite({ textureId: tex, x: posX, y: posY, w: posW, h: posH, layer });
  }
}
