/**
 * Shapes Showcase Demo - Phase 26
 *
 * Showcases all geometry-pipeline shape primitives rendered via GPU:
 * - Filled shapes: circle, ellipse, rectangle
 * - Arcs & sectors: arc (with thickness), ring, sector
 * - Lines & capsules: lines (various angles/thicknesses), capsule
 * - Polygons: triangle, hexagon, star
 *
 * Each shape animates to demonstrate smooth GPU rendering with the
 * geometry pipeline (op_geo_triangle / op_geo_line).
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
  drawRectangle,
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
const COL_RECTANGLE = rgb(100, 220, 120);
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
  drawText("Arcs & Sectors", VPW / 2 + 10, 8, { scale: 1.5, tint: { r: 0.7, g: 0.7, b: 0.8, a: 1 } });
  drawText("Lines & Capsules", 10, ROW_HEIGHT + 8, { scale: 1.5, tint: { r: 0.7, g: 0.7, b: 0.8, a: 1 } });
  drawText("Polygons", VPW / 2 + 10, ROW_HEIGHT + 8, { scale: 1.5, tint: { r: 0.7, g: 0.7, b: 0.8, a: 1 } });

  // --- Row 1, Col 1: Circle ---
  const c1x = COL_WIDTH * 0.5;
  const c1y = ROW_HEIGHT * 0.55;
  const pulse1 = 30 + Math.sin(time * 2) * 8;
  drawCircle(c1x, c1y, pulse1, { color: COL_CIRCLE, layer: 2 });
  drawText("drawCircle", c1x - 36, c1y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 1, Col 2: Ellipse + Rectangle ---
  const c2x = COL_WIDTH * 1.5;
  const c2y1 = ROW_HEIGHT * 0.35;
  const pulseRx = 45 + Math.sin(time * 1.5) * 10;
  const pulseRy = 25 + Math.cos(time * 1.5) * 8;
  drawEllipse(c2x, c2y1, pulseRx, pulseRy, { color: COL_ELLIPSE, layer: 2 });
  drawText("drawEllipse", c2x - 40, c2y1 + 40, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // Rectangle below
  const c2y2 = ROW_HEIGHT * 0.75;
  const rectW = 60 + Math.sin(time * 1.8) * 15;
  const rectH = 40 + Math.cos(time * 1.8) * 10;
  drawRectangle(c2x - rectW / 2, c2y2 - rectH / 2, rectW, rectH, { color: COL_RECTANGLE, layer: 2 });
  drawText("drawRectangle", c2x - 50, c2y2 + 35, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 1, Col 3: Arc (with thickness) ---
  const c3x = COL_WIDTH * 2.5;
  const c3y = ROW_HEIGHT * 0.55;
  const arcStart = -Math.PI + time * 0.7;
  const arcEnd = arcStart + Math.PI * 1.2;
  const arcThickness = 3 + Math.sin(time * 2.5) * 2;
  drawArc(c3x, c3y, 35, arcStart, arcEnd, {
    color: COL_ARC,
    thickness: arcThickness,
    layer: 2,
  });
  drawText("drawArc", c3x - 25, c3y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 1, Col 4: Ring + Sector ---
  const c4x = COL_WIDTH * 3.5;
  const c4y = ROW_HEIGHT * 0.35;
  const ringPulse = 5 + Math.sin(time * 3) * 3;
  drawRing(c4x, c4y, 22, 22 + ringPulse + 12, { color: COL_RING, layer: 2 });
  drawText("drawRing", c4x - 28, c4y + 55, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  const c4y2 = ROW_HEIGHT * 0.75;
  const sectorStart = time * 1.2;
  const sectorSpread = Math.PI / 3;
  drawSector(c4x, c4y2, 40, sectorStart, sectorStart + sectorSpread, {
    color: COL_SECTOR,
    layer: 2,
  });
  drawText("drawSector", c4x - 36, c4y2 + 55, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 2, Col 1: Lines (various angles & thicknesses) ---
  const r2c1x = COL_WIDTH * 0.5;
  const r2c1y = ROW_HEIGHT * 1.55;

  // Draw lines with various angles and thicknesses
  const lineAngles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];
  for (let i = 0; i < lineAngles.length; i++) {
    const angle = lineAngles[i] + Math.sin(time + i) * 0.2;
    const len = 45 + Math.sin(time * 1.5 + i) * 10;
    const thickness = 1 + i * 0.8;
    const x1 = r2c1x + Math.cos(angle) * len;
    const y1 = r2c1y + Math.sin(angle) * len;
    const x2 = r2c1x - Math.cos(angle) * len;
    const y2 = r2c1y - Math.sin(angle) * len;
    drawLine(x1, y1, x2, y2, {
      color: COL_LINE,
      thickness,
      layer: 2,
    });
  }
  drawText("drawLine", r2c1x - 28, r2c1y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 2, Col 2: Capsule ---
  const r2c2x = COL_WIDTH * 1.5;
  const r2c2y = ROW_HEIGHT * 1.55;
  const capAngle = time * 0.6;
  const capLen = 35;
  drawCapsule(
    r2c2x + Math.cos(capAngle) * capLen,
    r2c2y + Math.sin(capAngle) * capLen,
    r2c2x - Math.cos(capAngle) * capLen,
    r2c2y - Math.sin(capAngle) * capLen,
    8,
    { color: COL_CAPSULE, layer: 2 },
  );
  drawText("drawCapsule", r2c2x - 38, r2c2y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

  // --- Row 2, Col 3: Triangle ---
  const r2c3x = COL_WIDTH * 2.5;
  const r2c3y = ROW_HEIGHT * 1.55;
  const triAngle = time * 0.8;
  const triR = 32;
  drawTriangle(
    r2c3x + Math.cos(triAngle) * triR,
    r2c3y + Math.sin(triAngle) * triR,
    r2c3x + Math.cos(triAngle + Math.PI * 2 / 3) * triR,
    r2c3y + Math.sin(triAngle + Math.PI * 2 / 3) * triR,
    r2c3x + Math.cos(triAngle + Math.PI * 4 / 3) * triR,
    r2c3y + Math.sin(triAngle + Math.PI * 4 / 3) * triR,
    { color: COL_TRIANGLE, layer: 2 },
  );
  drawText("drawTriangle", r2c3x - 44, r2c3y + LABEL_OFFSET_Y, { tint: { r: 0.6, g: 0.6, b: 0.7, a: 1 } });

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

  // Title and legend
  drawText("Shapes Showcase", VPW / 2 - 60, VPH - 28, {
    scale: 1.5,
    tint: { r: 0.5, g: 0.5, b: 0.6, a: 0.6 },
  });
  drawText("All shapes rendered via GPU geometry pipeline (op_geo_triangle / op_geo_line)", VPW / 2 - 215, VPH - 10, {
    scale: 0.75,
    tint: { r: 0.4, g: 0.4, b: 0.5, a: 0.5 },
  });
});
