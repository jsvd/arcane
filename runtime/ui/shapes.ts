/**
 * Shape drawing primitives: circle, ellipse, ring, line, triangle, arc,
 * sector, capsule, and polygon.
 *
 * When running with the renderer (`arcane dev`), shapes are drawn via the
 * geometry GPU pipeline (op_geo_triangle / op_geo_line) for efficient
 * triangle-list rendering. In headless mode, all functions are no-ops
 * (after logging draw calls for visual testing).
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

import type { Color, ShapeOptions, LineOptions, ArcOptions, SectorOptions, EllipseOptions, RingOptions, CapsuleOptions, PolygonOptions } from "./types.ts";
import { _logDrawCall } from "../testing/visual.ts";
import { getCamera } from "../rendering/camera.ts";
import { _warnColor } from "./colors.ts";

// --- Detect geometry ops availability ---

const _ops = (globalThis as any).Deno?.core?.ops;
const hasGeoOps =
  typeof _ops?.op_geo_triangle === "function";

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };

/** Convert a screen-space point to world-space coordinates. */
function toWorldPoint(sx: number, sy: number, screenSpace: boolean): { x: number; y: number } {
  if (!screenSpace) return { x: sx, y: sy };
  const cam = getCamera();
  return {
    x: cam.x + sx / cam.zoom,
    y: cam.y + sy / cam.zoom,
  };
}

/** Convert a screen-space length to world-space length. */
function toWorldLength(len: number, screenSpace: boolean): number {
  if (!screenSpace) return len;
  const cam = getCamera();
  return len / cam.zoom;
}

// Number of segments for circle approximation (64 gives smooth circles)
const CIRCLE_SEGMENTS = 64;

/**
 * Draw a filled circle as a triangle fan via the geometry pipeline.
 * No-op in headless mode.
 *
 * @param cx - Center X position.
 * @param cy - Center Y position.
 * @param radius - Circle radius.
 * @param options - Color, layer, screenSpace.
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

  _warnColor(options?.color, "drawCircle");
  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;
  const step = (Math.PI * 2) / CIRCLE_SEGMENTS;
  const c = toWorldPoint(cx, cy, ss);
  const wr = toWorldLength(radius, ss);

  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a0 = step * i;
    const a1 = step * (i + 1);
    _ops.op_geo_triangle(
      c.x, c.y,
      c.x + Math.cos(a0) * wr, c.y + Math.sin(a0) * wr,
      c.x + Math.cos(a1) * wr, c.y + Math.sin(a1) * wr,
      r, g, b, a,
      layer,
    );
  }
}

/**
 * Draw a filled ellipse as a triangle fan via the geometry pipeline.
 * No-op in headless mode.
 *
 * @param cx - Center X position.
 * @param cy - Center Y position.
 * @param rx - Horizontal radius.
 * @param ry - Vertical radius.
 * @param options - Color, layer, screenSpace.
 *
 * @example
 * drawEllipse(200, 150, 60, 30, { color: { r: 0, g: 0.5, b: 1, a: 1 } });
 */
export function drawEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  options?: EllipseOptions,
): void {
  const layer = options?.layer ?? 0;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "ellipse",
    cx,
    cy,
    rx,
    ry,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;
  const step = (Math.PI * 2) / CIRCLE_SEGMENTS;
  const c = toWorldPoint(cx, cy, ss);
  const wrx = toWorldLength(rx, ss);
  const wry = toWorldLength(ry, ss);

  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a0 = step * i;
    const a1 = step * (i + 1);
    _ops.op_geo_triangle(
      c.x, c.y,
      c.x + Math.cos(a0) * wrx, c.y + Math.sin(a0) * wry,
      c.x + Math.cos(a1) * wrx, c.y + Math.sin(a1) * wry,
      r, g, b, a,
      layer,
    );
  }
}

/**
 * Draw a filled ring (annulus) via the geometry pipeline.
 * The ring is the area between innerRadius and outerRadius.
 * No-op in headless mode.
 *
 * @param cx - Center X position.
 * @param cy - Center Y position.
 * @param innerRadius - Inner radius (hole).
 * @param outerRadius - Outer radius.
 * @param options - Color, layer, screenSpace.
 *
 * @example
 * drawRing(200, 200, 30, 50, { color: { r: 1, g: 1, b: 0, a: 0.8 } });
 */
export function drawRing(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  options?: RingOptions,
): void {
  const layer = options?.layer ?? 0;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "ring",
    cx,
    cy,
    innerRadius,
    outerRadius,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;
  const step = (Math.PI * 2) / CIRCLE_SEGMENTS;
  const c = toWorldPoint(cx, cy, ss);
  const wir = toWorldLength(innerRadius, ss);
  const wor = toWorldLength(outerRadius, ss);

  // Each segment of the ring is a quad (2 triangles) between inner and outer arcs
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a0 = step * i;
    const a1 = step * (i + 1);
    const cos0 = Math.cos(a0);
    const sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1);
    const sin1 = Math.sin(a1);

    const ox0 = c.x + cos0 * wor;
    const oy0 = c.y + sin0 * wor;
    const ox1 = c.x + cos1 * wor;
    const oy1 = c.y + sin1 * wor;
    const ix0 = c.x + cos0 * wir;
    const iy0 = c.y + sin0 * wir;
    const ix1 = c.x + cos1 * wir;
    const iy1 = c.y + sin1 * wir;

    // Two triangles per segment: (outer0, outer1, inner0) and (inner0, outer1, inner1)
    _ops.op_geo_triangle(ox0, oy0, ox1, oy1, ix0, iy0, r, g, b, a, layer);
    _ops.op_geo_triangle(ix0, iy0, ox1, oy1, ix1, iy1, r, g, b, a, layer);
  }
}

/**
 * Draw a line between two points as a thick quad via the geometry pipeline.
 * No-op in headless mode.
 *
 * @param x1 - Start X.
 * @param y1 - Start Y.
 * @param x2 - End X.
 * @param y2 - End Y.
 * @param options - Color, thickness, layer, screenSpace.
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

  _warnColor(options?.color, "drawLine");
  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const p1 = toWorldPoint(x1, y1, ss);
  const p2 = toWorldPoint(x2, y2, ss);
  const wt = toWorldLength(thickness, ss);
  _ops.op_geo_line(
    p1.x, p1.y, p2.x, p2.y, wt,
    color.r, color.g, color.b, color.a ?? 1,
    layer,
  );
}

/**
 * Draw a filled triangle via the geometry pipeline (single triangle).
 * No-op in headless mode.
 *
 * @param x1 - First vertex X.
 * @param y1 - First vertex Y.
 * @param x2 - Second vertex X.
 * @param y2 - Second vertex Y.
 * @param x3 - Third vertex X.
 * @param y3 - Third vertex Y.
 * @param options - Color, layer, screenSpace.
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

  _warnColor(options?.color, "drawTriangle");
  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const p1 = toWorldPoint(x1, y1, ss);
  const p2 = toWorldPoint(x2, y2, ss);
  const p3 = toWorldPoint(x3, y3, ss);
  _ops.op_geo_triangle(
    p1.x, p1.y, p2.x, p2.y, p3.x, p3.y,
    color.r, color.g, color.b, color.a ?? 1,
    layer,
  );
}

/**
 * Draw an arc (partial circle outline) using line segments.
 * No-op in headless mode.
 *
 * Angles are in radians, measured clockwise from the positive X axis.
 *
 * @param cx - Center X.
 * @param cy - Center Y.
 * @param radius - Arc radius.
 * @param startAngle - Start angle in radians.
 * @param endAngle - End angle in radians.
 * @param options - Color, thickness, layer, screenSpace.
 *
 * @example
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

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;
  const c = toWorldPoint(cx, cy, ss);
  const wr = toWorldLength(radius, ss);
  const wt = toWorldLength(thickness, ss);

  const sweep = Math.abs(endAngle - startAngle);
  const segments = Math.max(8, Math.ceil(sweep * wr * 0.5));
  const step = (endAngle - startAngle) / segments;

  let prevX = c.x + Math.cos(startAngle) * wr;
  let prevY = c.y + Math.sin(startAngle) * wr;

  for (let i = 1; i <= segments; i++) {
    const angle = startAngle + step * i;
    const nextX = c.x + Math.cos(angle) * wr;
    const nextY = c.y + Math.sin(angle) * wr;

    _ops.op_geo_line(prevX, prevY, nextX, nextY, wt, r, g, b, a, layer);

    prevX = nextX;
    prevY = nextY;
  }
}

/**
 * Draw a filled sector (pie/cone shape) using a triangle fan.
 * No-op in headless mode.
 *
 * Angles are in radians, measured clockwise from the positive X axis.
 *
 * @param cx - Center X.
 * @param cy - Center Y.
 * @param radius - Sector radius.
 * @param startAngle - Start angle in radians.
 * @param endAngle - End angle in radians.
 * @param options - Color, layer, screenSpace.
 *
 * @example
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

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;
  const c = toWorldPoint(cx, cy, ss);
  const wr = toWorldLength(radius, ss);

  const sweep = Math.abs(endAngle - startAngle);
  const segments = Math.max(8, Math.ceil(sweep * wr * 0.5));
  const step = (endAngle - startAngle) / segments;

  for (let i = 0; i < segments; i++) {
    const a0 = startAngle + step * i;
    const a1 = startAngle + step * (i + 1);
    _ops.op_geo_triangle(
      c.x, c.y,
      c.x + Math.cos(a0) * wr, c.y + Math.sin(a0) * wr,
      c.x + Math.cos(a1) * wr, c.y + Math.sin(a1) * wr,
      r, g, b, a,
      layer,
    );
  }
}

/**
 * Draw a filled capsule (rectangle with half-circle caps).
 * No-op in headless mode.
 *
 * The capsule extends from (x1,y1) to (x2,y2) with the given radius.
 *
 * @param x1 - Start center X.
 * @param y1 - Start center Y.
 * @param x2 - End center X.
 * @param y2 - End center Y.
 * @param radius - Cap radius (and half-width of the body).
 * @param options - Color, layer, screenSpace.
 *
 * @example
 * drawCapsule(100, 200, 300, 200, 15, { color: { r: 0, g: 0.8, b: 0.2, a: 1 } });
 */
export function drawCapsule(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  radius: number,
  options?: CapsuleOptions,
): void {
  const layer = options?.layer ?? 0;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "capsule",
    x1,
    y1,
    x2,
    y2,
    radius,
    layer,
    screenSpace: ss,
  } as any);

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;
  const p1 = toWorldPoint(x1, y1, ss);
  const p2 = toWorldPoint(x2, y2, ss);
  const wr = toWorldLength(radius, ss);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular direction
  let nx: number, ny: number;
  if (len < 1e-8) {
    // Degenerate case: just draw a circle
    const step = (Math.PI * 2) / CIRCLE_SEGMENTS;
    for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
      const a0 = step * i;
      const a1 = step * (i + 1);
      _ops.op_geo_triangle(
        p1.x, p1.y,
        p1.x + Math.cos(a0) * wr, p1.y + Math.sin(a0) * wr,
        p1.x + Math.cos(a1) * wr, p1.y + Math.sin(a1) * wr,
        r, g, b, a, layer,
      );
    }
    return;
  }

  nx = -dy / len;
  ny = dx / len;

  // Rectangle body (2 triangles)
  const rx1 = p1.x + nx * wr;
  const ry1 = p1.y + ny * wr;
  const rx2 = p1.x - nx * wr;
  const ry2 = p1.y - ny * wr;
  const rx3 = p2.x - nx * wr;
  const ry3 = p2.y - ny * wr;
  const rx4 = p2.x + nx * wr;
  const ry4 = p2.y + ny * wr;

  _ops.op_geo_triangle(rx1, ry1, rx2, ry2, rx3, ry3, r, g, b, a, layer);
  _ops.op_geo_triangle(rx1, ry1, rx3, ry3, rx4, ry4, r, g, b, a, layer);

  // Half-circle cap at (p1.x, p1.y): faces away from (p2.x, p2.y)
  const halfSegs = CIRCLE_SEGMENTS / 2;
  const baseAngle = Math.atan2(ny, nx); // angle of perpendicular
  const capStep = Math.PI / halfSegs;

  // Cap at start: semicircle from baseAngle to baseAngle + PI
  for (let i = 0; i < halfSegs; i++) {
    const a0 = baseAngle + capStep * i;
    const a1 = baseAngle + capStep * (i + 1);
    _ops.op_geo_triangle(
      p1.x, p1.y,
      p1.x + Math.cos(a0) * wr, p1.y + Math.sin(a0) * wr,
      p1.x + Math.cos(a1) * wr, p1.y + Math.sin(a1) * wr,
      r, g, b, a, layer,
    );
  }

  // Cap at end: semicircle from baseAngle + PI to baseAngle + 2*PI
  for (let i = 0; i < halfSegs; i++) {
    const a0 = baseAngle + Math.PI + capStep * i;
    const a1 = baseAngle + Math.PI + capStep * (i + 1);
    _ops.op_geo_triangle(
      p2.x, p2.y,
      p2.x + Math.cos(a0) * wr, p2.y + Math.sin(a0) * wr,
      p2.x + Math.cos(a1) * wr, p2.y + Math.sin(a1) * wr,
      r, g, b, a, layer,
    );
  }
}

/**
 * Draw a filled rectangle via two triangles in the geometry pipeline.
 * No-op in headless mode.
 *
 * This is the geometry-pipeline equivalent of drawRect() but uses layer 0
 * by default (same as other shapes), not layer 90.
 *
 * @param x - Top-left X position.
 * @param y - Top-left Y position.
 * @param w - Width.
 * @param h - Height.
 * @param options - Color, layer, screenSpace.
 *
 * @example
 * drawRectangle(100, 50, 200, 100, { color: rgb(220, 50, 50) });
 */
export function drawRectangle(
  x: number,
  y: number,
  w: number,
  h: number,
  options?: ShapeOptions,
): void {
  const layer = options?.layer ?? 0;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "rectangle",
    x,
    y,
    w,
    h,
    layer,
    screenSpace: ss,
  } as any);

  _warnColor(options?.color, "drawRectangle");
  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;

  const p0 = toWorldPoint(x, y, ss);
  const p1 = toWorldPoint(x + w, y, ss);
  const p2 = toWorldPoint(x + w, y + h, ss);
  const p3 = toWorldPoint(x, y + h, ss);

  // Two triangles: (p0, p1, p2) and (p0, p2, p3)
  _ops.op_geo_triangle(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, r, g, b, a, layer);
  _ops.op_geo_triangle(p0.x, p0.y, p2.x, p2.y, p3.x, p3.y, r, g, b, a, layer);
}

/**
 * Draw a filled convex polygon via triangle fan.
 * No-op in headless mode.
 *
 * Vertices should be in order (CW or CCW). The polygon is triangulated
 * as a fan from the first vertex.
 *
 * @param vertices - Array of [x, y] pairs.
 * @param options - Color, layer, screenSpace.
 *
 * @example
 * drawPolygon([[100,50],[150,150],[50,150]], { color: { r: 1, g: 0.5, b: 0, a: 1 } });
 */
export function drawPolygon(
  vertices: [number, number][],
  options?: PolygonOptions,
): void {
  const layer = options?.layer ?? 0;
  const ss = options?.screenSpace ?? false;

  _logDrawCall({
    type: "polygon",
    vertices,
    layer,
    screenSpace: ss,
  } as any);

  _warnColor(options?.color, "drawPolygon");
  if (!hasGeoOps || vertices.length < 3) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;

  const f = toWorldPoint(vertices[0][0], vertices[0][1], ss);
  for (let i = 1; i < vertices.length - 1; i++) {
    const v2 = toWorldPoint(vertices[i][0], vertices[i][1], ss);
    const v3 = toWorldPoint(vertices[i + 1][0], vertices[i + 1][1], ss);
    _ops.op_geo_triangle(f.x, f.y, v2.x, v2.y, v3.x, v3.y, r, g, b, a, layer);
  }
}
