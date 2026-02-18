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

import type { Color, ShapeOptions, LineOptions, ArcOptions, SectorOptions } from "./types.ts";
import { drawSprite } from "../rendering/sprites.ts";
import { createSolidTexture, uploadRgbaTexture } from "../rendering/texture.ts";
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
  tex = createSolidTexture(key, color);
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

// Cached circle texture (64x64 white circle with anti-aliased alpha)
let _circleTexId: number | undefined;

function getCircleTexture(): number {
  if (_circleTexId !== undefined) return _circleTexId;
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  const radiusPx = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Anti-alias: 1px feather at the edge
      const alpha = Math.max(0, Math.min(1, radiusPx - dist));
      const idx = (y * size + x) * 4;
      pixels[idx] = 255;     // R
      pixels[idx + 1] = 255; // G
      pixels[idx + 2] = 255; // B
      pixels[idx + 3] = Math.round(alpha * 255); // A
    }
  }
  _circleTexId = uploadRgbaTexture("__circle_64", size, size, pixels);
  return _circleTexId;
}

/**
 * Draw a filled circle as a single tinted sprite (GPU-efficient).
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
  const layer = options?.layer ?? 0;
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
  const tex = getCircleTexture();
  const diameter = radius * 2;
  const pos = toWorld(cx - radius, cy - radius, diameter, diameter, ss);
  drawSprite({
    textureId: tex,
    x: pos.x,
    y: pos.y,
    w: pos.w,
    h: pos.h,
    layer,
    tint: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
  });
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
  const layer = options?.layer ?? 0;
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
  const layer = options?.layer ?? 0;
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

/**
 * Draw an arc (partial circle outline) using line segments.
 * No-op in headless mode.
 *
 * Angles are in radians, measured clockwise from the positive X axis
 * (right). A full circle is `0` to `Math.PI * 2`.
 *
 * @param cx - Center X position (screen pixels if screenSpace, world units otherwise).
 * @param cy - Center Y position (screen pixels if screenSpace, world units otherwise).
 * @param radius - Arc radius in pixels (screenSpace) or world units.
 * @param startAngle - Start angle in radians (0 = right, PI/2 = down).
 * @param endAngle - End angle in radians. Must be >= startAngle.
 * @param options - Color, thickness, layer, and screenSpace options.
 *
 * @example
 * // Shield indicator (90-degree arc above player)
 * drawArc(player.x, player.y, 24, -Math.PI * 0.75, -Math.PI * 0.25, {
 *   color: { r: 0.3, g: 0.8, b: 1, a: 0.8 }, thickness: 3,
 * });
 */
export function drawArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  options?: ArcOptions,
): void {
  const layer = options?.layer ?? 0;
  const ss = options?.screenSpace ?? false;
  const thickness = options?.thickness ?? 2;

  _logDrawCall({
    type: "arc",
    cx,
    cy,
    radius,
    startAngle,
    endAngle,
    thickness,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasRenderOps) return;

  const color = options?.color ?? WHITE;
  const tex = getColorTexture(color);

  // Number of segments scales with arc length for smooth appearance
  const sweep = Math.abs(endAngle - startAngle);
  const segments = Math.max(8, Math.ceil(sweep * radius * 0.5));
  const step = (endAngle - startAngle) / segments;

  let prevX = cx + Math.cos(startAngle) * radius;
  let prevY = cy + Math.sin(startAngle) * radius;

  for (let i = 1; i <= segments; i++) {
    const angle = startAngle + step * i;
    const nextX = cx + Math.cos(angle) * radius;
    const nextY = cy + Math.sin(angle) * radius;

    const dx = nextX - prevX;
    const dy = nextY - prevY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const segAngle = Math.atan2(dy, dx);

    const midX = (prevX + nextX) / 2;
    const midY = (prevY + nextY) / 2;

    const rectX = midX - length / 2;
    const rectY = midY - thickness / 2;
    const pos = toWorld(rectX, rectY, length, thickness, ss);
    drawSprite({
      textureId: tex,
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      layer,
      rotation: segAngle,
      originX: 0.5,
      originY: 0.5,
    });

    prevX = nextX;
    prevY = nextY;
  }
}

/**
 * Draw a filled sector (pie/cone shape) using a triangle fan.
 * No-op in headless mode.
 *
 * A sector is a "pie slice" from the center to the arc — useful for
 * FOV cones, attack arcs, and minimap indicators.
 *
 * Angles are in radians, measured clockwise from the positive X axis
 * (right). A full circle is `0` to `Math.PI * 2`.
 *
 * @param cx - Center X position (screen pixels if screenSpace, world units otherwise).
 * @param cy - Center Y position (screen pixels if screenSpace, world units otherwise).
 * @param radius - Sector radius in pixels (screenSpace) or world units.
 * @param startAngle - Start angle in radians (0 = right, PI/2 = down).
 * @param endAngle - End angle in radians. Must be >= startAngle.
 * @param options - Color, layer, and screenSpace options.
 *
 * @example
 * // Attack cone indicator
 * drawSector(player.x, player.y, 60, -Math.PI / 4, Math.PI / 4, {
 *   color: { r: 1, g: 0.2, b: 0.2, a: 0.3 }, layer: 2,
 * });
 */
export function drawSector(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  options?: SectorOptions,
): void {
  const layer = options?.layer ?? 0;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "sector",
    cx,
    cy,
    radius,
    startAngle,
    endAngle,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasRenderOps) return;

  const color = options?.color ?? WHITE;
  const tex = getColorTexture(color);

  // Triangle fan: each triangle shares the center point.
  // Number of triangles scales with arc length for smooth appearance.
  const sweep = Math.abs(endAngle - startAngle);
  const segments = Math.max(8, Math.ceil(sweep * radius * 0.5));
  const step = (endAngle - startAngle) / segments;

  for (let i = 0; i < segments; i++) {
    const a0 = startAngle + step * i;
    const a1 = startAngle + step * (i + 1);

    const x1 = cx + Math.cos(a0) * radius;
    const y1 = cy + Math.sin(a0) * radius;
    const x2 = cx + Math.cos(a1) * radius;
    const y2 = cy + Math.sin(a1) * radius;

    // Sort three vertices by Y for scanline fill
    const verts: [number, number][] = [[cx, cy], [x1, y1], [x2, y2]];
    verts.sort((a, b) => a[1] - b[1]);

    const [vTop, vMid, vBot] = verts;
    const startY = Math.ceil(vTop[1]);
    const endY = Math.floor(vBot[1]);

    for (let scanY = startY; scanY <= endY; scanY++) {
      let xLeft = Infinity;
      let xRight = -Infinity;

      // Edge: top -> bot
      if (vBot[1] !== vTop[1]) {
        const t = (scanY - vTop[1]) / (vBot[1] - vTop[1]);
        const ex = vTop[0] + t * (vBot[0] - vTop[0]);
        if (ex < xLeft) xLeft = ex;
        if (ex > xRight) xRight = ex;
      }

      // Edge: top -> mid
      if (scanY <= vMid[1] && vMid[1] !== vTop[1]) {
        const t = (scanY - vTop[1]) / (vMid[1] - vTop[1]);
        const ex = vTop[0] + t * (vMid[0] - vTop[0]);
        if (ex < xLeft) xLeft = ex;
        if (ex > xRight) xRight = ex;
      }

      // Edge: mid -> bot
      if (scanY >= vMid[1] && vBot[1] !== vMid[1]) {
        const t = (scanY - vMid[1]) / (vBot[1] - vMid[1]);
        const ex = vMid[0] + t * (vBot[0] - vMid[0]);
        if (ex < xLeft) xLeft = ex;
        if (ex > xRight) xRight = ex;
      }

      if (xLeft >= xRight) continue;

      const stripeW = xRight - xLeft;
      const pos = toWorld(xLeft, scanY, stripeW, 1, ss);
      drawSprite({ textureId: tex, x: pos.x, y: pos.y, w: pos.w, h: pos.h, layer });
    }
  }
}
