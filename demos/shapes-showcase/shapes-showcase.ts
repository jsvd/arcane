/**
 * Shapes Showcase Demo - Phase 26
 *
 * Showcases all geometry-pipeline shape primitives:
 * - Filled shapes: circle, ellipse, triangle, sector (cone)
 * - Outlines: arc, ring
 * - Lines: drawLine (various thicknesses), capsule
 * - Polygons: hexagon, star
 *
 * Each shape pulses or rotates to demonstrate smooth GPU rendering.
 */

import {
  setCamera,
  getViewportSize,
  drawText,
} from "../../runtime/rendering/index.ts";
import {
  rgb,
  drawCircle,
  drawEllipse,
  drawRing,
  drawLine,
  drawTriangle,
  drawArc,
  drawSector,
  drawCapsule,
  drawPolygon,
} from "../../runtime/ui/index.ts";
import { createGame, drawColorSprite } from "../../runtime/game/index.ts";

// --- Layout ---
const { width: VPW, height: VPH } = getViewportSize();
const COL_BG = rgb(20, 22, 30);

// Section layout: 4 columns, 2 rows
const COL_WIDTH = VPW / 4;
const ROW_HEIGHT = VPH / 2;
const LABEL_OFFSET_Y = 65;

// Colors for each shape
const COL_CIRCLE = rgb(80, 180, 255);
const COL_ELLIPSE = rgb(160, 100, 255);
const COL_TRIANGLE = rgb(255, 120, 80);
const COL_SECTOR = rgb(255, 200, 60);
const COL_ARC = rgb(100, 255, 180);
const COL_RING = rgb(255, 80, 200);
const COL_LINE = rgb(200, 220, 255);
const COL_CAPSULE = rgb(80, 220, 140);
const COL_POLYGON = rgb(255, 160, 60);
const COL_STAR = rgb(255, 230, 80);

let time = 0;

/** Generate a regular polygon centered at (cx, cy) with rotation. */
function regularPolygon(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation: number,
): [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    verts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return verts;
}

/** Generate a star polygon centered at (cx, cy). */
function starPolygon(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  rotation: number,
): [number, number][] {
  const verts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rotation + (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? outerR : innerR;
    verts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return verts;
}

// --- Game setup ---
const game = createGame({ name: "shapes-showcase", autoCamera: false });

game.onFrame((ctx) => {
  const dt = ctx.dt;
  time += dt;

  setCamera(VPW / 2, VPH / 2, 1);

  // Background
  drawColorSprite({ color: COL_BG, x: 0, y: 0, w: VPW, h: VPH, layer: 0 });

  // Grid lines
  for (let col = 1; col < 4; col++) {
    const x = col * COL_WIDTH;
    drawLine(x, 0, x, VPH, { color: rgb(40, 42, 55), thickness: 1, layer: 1 });
  }
  drawLine(0, ROW_HEIGHT, VPW, ROW_HEIGHT, { color: rgb(40, 42, 55), thickness: 1, layer: 1 });

  // Section headers
  drawText("Filled Shapes", 10, 8, { scale: 1.5, tint: { r: 0.7, g: 0.7, b: 0.8, a: 1 } });
  drawText("Outlines & Arcs", VPW / 2 + 10, 8, { scale: 1.5, tint: { r: 0.7, g: 0.7, b: 0.8, a: 1 } });
  drawText("Lines & Capsules", 10, ROW_HEIGHT + 8, { scale: 1.5, tint: { r: 0.7, g: 0.7, b: 0.8, a: 1 } });
  drawText("Polygons", VPW / 2 + 10, ROW_HEIGHT + 8, { scale: 1.5, tint: { r: 0.7, g: 0.7, b: 0.8, a: 1 } });

  // --- Row 1, Col 1: Circle ---
  const c1x = COL_WIDTH * 0.5;
  const c1y = ROW_HEIGHT * 0.55;
  const pulse1 = 30 + Math.sin(time * 2) * 8;
  drawCircle(c1x, c1y, pulse1, { color: COL_CIRCLE, layer: 2 });
  drawText("drawCircle", c1x - 36, c1y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 1, Col 2: Ellipse ---
  const c2x = COL_WIDTH * 1.5;
  const c2y = ROW_HEIGHT * 0.55;
  const pulseRx = 45 + Math.sin(time * 1.5) * 10;
  const pulseRy = 25 + Math.cos(time * 1.5) * 8;
  drawEllipse(c2x, c2y, pulseRx, pulseRy, { color: COL_ELLIPSE, layer: 2 });
  drawText("drawEllipse", c2x - 40, c2y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 1, Col 3: Triangle ---
  const c3x = COL_WIDTH * 2.5;
  const c3y = ROW_HEIGHT * 0.55;
  const triAngle = time * 0.8;
  const triR = 32;
  drawTriangle(
    c3x + Math.cos(triAngle) * triR,
    c3y + Math.sin(triAngle) * triR,
    c3x + Math.cos(triAngle + Math.PI * 2 / 3) * triR,
    c3y + Math.sin(triAngle + Math.PI * 2 / 3) * triR,
    c3x + Math.cos(triAngle + Math.PI * 4 / 3) * triR,
    c3y + Math.sin(triAngle + Math.PI * 4 / 3) * triR,
    { color: COL_TRIANGLE, layer: 2 },
  );
  drawText("drawTriangle", c3x - 44, c3y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 1, Col 4: Sector (cone) ---
  const c4x = COL_WIDTH * 3.5;
  const c4y = ROW_HEIGHT * 0.55;
  const sectorStart = time * 1.2;
  const sectorSpread = Math.PI / 3;
  drawSector(c4x, c4y, 40, sectorStart, sectorStart + sectorSpread, {
    color: COL_SECTOR,
    layer: 2,
  });
  drawText("drawSector", c4x - 36, c4y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 2, Col 1: Arc ---
  const r2c1x = COL_WIDTH * 0.5;
  const r2c1y = ROW_HEIGHT * 1.55;
  const arcStart = -Math.PI + time * 0.7;
  const arcEnd = arcStart + Math.PI * 1.2;
  drawArc(r2c1x, r2c1y, 35, arcStart, arcEnd, {
    color: COL_ARC,
    thickness: 4,
    layer: 2,
  });
  drawText("drawArc", r2c1x - 25, r2c1y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 2, Col 2: Ring ---
  const r2c2x = COL_WIDTH * 1.5;
  const r2c2y = ROW_HEIGHT * 1.55;
  const ringPulse = 5 + Math.sin(time * 3) * 3;
  drawRing(r2c2x, r2c2y, 22, 22 + ringPulse + 12, { color: COL_RING, layer: 2 });
  drawText("drawRing", r2c2x - 28, r2c2y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 2, Col 3: Lines + Capsule ---
  const r2c3x = COL_WIDTH * 2.5;
  const r2c3y = ROW_HEIGHT * 1.55;

  // Draw lines with increasing thickness
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const y = r2c3y - 30 + i * 12;
    const wobble = Math.sin(time * 2 + i) * 15;
    drawLine(r2c3x - 50, y, r2c3x + 50 + wobble, y, {
      color: COL_LINE,
      thickness: 1 + i * 1.5,
      layer: 2,
    });
  }
  drawText("drawLine", r2c3x - 28, r2c3y + LABEL_OFFSET_Y - 20, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // Capsule below
  const capAngle = time * 0.6;
  const capLen = 35;
  drawCapsule(
    r2c3x + Math.cos(capAngle) * capLen,
    r2c3y + 40 + Math.sin(capAngle) * capLen,
    r2c3x - Math.cos(capAngle) * capLen,
    r2c3y + 40 - Math.sin(capAngle) * capLen,
    8,
    { color: COL_CAPSULE, layer: 2 },
  );
  drawText("drawCapsule", r2c3x - 38, r2c3y + LABEL_OFFSET_Y + 30, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 2, Col 4: Polygons ---
  const r2c4x = COL_WIDTH * 3.5;
  const r2c4y = ROW_HEIGHT * 1.55;

  // Hexagon (rotating)
  const hexVerts = regularPolygon(r2c4x - 30, r2c4y - 15, 28, 6, time * 0.5);
  drawPolygon(hexVerts, { color: COL_POLYGON, layer: 2 });

  // Star (rotating opposite direction)
  const starVerts = starPolygon(r2c4x + 30, r2c4y + 15, 30, 14, 5, -time * 0.4);
  drawPolygon(starVerts, { color: COL_STAR, layer: 2 });

  drawText("drawPolygon", r2c4x - 38, r2c4y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // Title
  drawText("Shapes Showcase", VPW / 2 - 60, VPH - 18, {
    scale: 1.5,
    tint: { r: 0.5, g: 0.5, b: 0.6, a: 0.6 },
  });
});
