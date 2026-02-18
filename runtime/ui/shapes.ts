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

// --- Detect geometry ops availability ---

const _ops = (globalThis as any).Deno?.core?.ops;
const hasGeoOps =
  typeof _ops?.op_geo_triangle === "function";

const WHITE: Color = { r: 1, g: 1, b: 1, a: 1 };

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

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;
  const step = (Math.PI * 2) / CIRCLE_SEGMENTS;

  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a0 = step * i;
    const a1 = step * (i + 1);
    _ops.op_geo_triangle(
      cx, cy,
      cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius,
      cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius,
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

  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a0 = step * i;
    const a1 = step * (i + 1);
    _ops.op_geo_triangle(
      cx, cy,
      cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry,
      cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry,
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

  // Each segment of the ring is a quad (2 triangles) between inner and outer arcs
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a0 = step * i;
    const a1 = step * (i + 1);
    const cos0 = Math.cos(a0);
    const sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1);
    const sin1 = Math.sin(a1);

    const ox0 = cx + cos0 * outerRadius;
    const oy0 = cy + sin0 * outerRadius;
    const ox1 = cx + cos1 * outerRadius;
    const oy1 = cy + sin1 * outerRadius;
    const ix0 = cx + cos0 * innerRadius;
    const iy0 = cy + sin0 * innerRadius;
    const ix1 = cx + cos1 * innerRadius;
    const iy1 = cy + sin1 * innerRadius;

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

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  _ops.op_geo_line(
    x1, y1, x2, y2, thickness,
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

  if (!hasGeoOps) return;

  const color = options?.color ?? WHITE;
  _ops.op_geo_triangle(
    x1, y1, x2, y2, x3, y3,
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

  const sweep = Math.abs(endAngle - startAngle);
  const segments = Math.max(8, Math.ceil(sweep * radius * 0.5));
  const step = (endAngle - startAngle) / segments;

  let prevX = cx + Math.cos(startAngle) * radius;
  let prevY = cy + Math.sin(startAngle) * radius;

  for (let i = 1; i <= segments; i++) {
    const angle = startAngle + step * i;
    const nextX = cx + Math.cos(angle) * radius;
    const nextY = cy + Math.sin(angle) * radius;

    _ops.op_geo_line(prevX, prevY, nextX, nextY, thickness, r, g, b, a, layer);

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

  const sweep = Math.abs(endAngle - startAngle);
  const segments = Math.max(8, Math.ceil(sweep * radius * 0.5));
  const step = (endAngle - startAngle) / segments;

  for (let i = 0; i < segments; i++) {
    const a0 = startAngle + step * i;
    const a1 = startAngle + step * (i + 1);
    _ops.op_geo_triangle(
      cx, cy,
      cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius,
      cx + Math.cos(a1) * radius, cy + Math.sin(a1) * radius,
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

  const dx = x2 - x1;
  const dy = y2 - y1;
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
        x1, y1,
        x1 + Math.cos(a0) * radius, y1 + Math.sin(a0) * radius,
        x1 + Math.cos(a1) * radius, y1 + Math.sin(a1) * radius,
        r, g, b, a, layer,
      );
    }
    return;
  }

  nx = -dy / len;
  ny = dx / len;

  // Rectangle body (2 triangles)
  const rx1 = x1 + nx * radius;
  const ry1 = y1 + ny * radius;
  const rx2 = x1 - nx * radius;
  const ry2 = y1 - ny * radius;
  const rx3 = x2 - nx * radius;
  const ry3 = y2 - ny * radius;
  const rx4 = x2 + nx * radius;
  const ry4 = y2 + ny * radius;

  _ops.op_geo_triangle(rx1, ry1, rx2, ry2, rx3, ry3, r, g, b, a, layer);
  _ops.op_geo_triangle(rx1, ry1, rx3, ry3, rx4, ry4, r, g, b, a, layer);

  // Half-circle cap at (x1, y1): faces away from (x2, y2)
  const halfSegs = CIRCLE_SEGMENTS / 2;
  const baseAngle = Math.atan2(ny, nx); // angle of perpendicular
  const capStep = Math.PI / halfSegs;

  // Cap at start: semicircle from baseAngle to baseAngle + PI
  for (let i = 0; i < halfSegs; i++) {
    const a0 = baseAngle + capStep * i;
    const a1 = baseAngle + capStep * (i + 1);
    _ops.op_geo_triangle(
      x1, y1,
      x1 + Math.cos(a0) * radius, y1 + Math.sin(a0) * radius,
      x1 + Math.cos(a1) * radius, y1 + Math.sin(a1) * radius,
      r, g, b, a, layer,
    );
  }

  // Cap at end: semicircle from baseAngle + PI to baseAngle + 2*PI
  for (let i = 0; i < halfSegs; i++) {
    const a0 = baseAngle + Math.PI + capStep * i;
    const a1 = baseAngle + Math.PI + capStep * (i + 1);
    _ops.op_geo_triangle(
      x2, y2,
      x2 + Math.cos(a0) * radius, y2 + Math.sin(a0) * radius,
      x2 + Math.cos(a1) * radius, y2 + Math.sin(a1) * radius,
      r, g, b, a, layer,
    );
  }
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

  if (!hasGeoOps || vertices.length < 3) return;

  const color = options?.color ?? WHITE;
  const r = color.r;
  const g = color.g;
  const b = color.b;
  const a = color.a ?? 1;

  const [fx, fy] = vertices[0];
  for (let i = 1; i < vertices.length - 1; i++) {
    const [x2, y2] = vertices[i];
    const [x3, y3] = vertices[i + 1];
    _ops.op_geo_triangle(fx, fy, x2, y2, x3, y3, r, g, b, a, layer);
  }
}
