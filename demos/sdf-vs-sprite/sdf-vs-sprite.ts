/**
 * SDF vs Sprite Comparison Demo
 *
 * Visual comparison of SDF rendering vs traditional sprites and geometry.
 * Shows how antialiasing behavior differs between rendering methods,
 * especially at different zoom levels.
 *
 * Controls:
 * - UP/DOWN: Zoom in/out
 * - LEFT/RIGHT: Adjust scale multiplier
 * - R: Reset zoom and scale
 *
 * Run: arcane dev demos/sdf-vs-sprite/sdf-vs-sprite.ts
 */

import { onFrame } from "../../runtime/rendering/loop.ts";
import { drawText } from "../../runtime/rendering/text.ts";
import { setCamera } from "../../runtime/rendering/camera.ts";
import { isKeyPressed, isKeyDown } from "../../runtime/rendering/input.ts";
import { drawCircle, drawLine } from "../../runtime/ui/shapes.ts";
import { drawColorSprite } from "../../runtime/game/color-sprite.ts";
import {
  sdfCircle,
  sdfBox,
  sdfStar,
  sdfHeart,
  sdfEntity,
  clearSdfEntities,
  flushSdfEntities,
} from "../../runtime/rendering/sdf.ts";

// --- State ---
let zoom = 1.0;
let scaleMultiplier = 1.0;

// --- Colors ---
const RED = { r: 0.9, g: 0.2, b: 0.2, a: 1 };
const GREEN = { r: 0.2, g: 0.8, b: 0.3, a: 1 };
const BLUE = { r: 0.2, g: 0.4, b: 0.9, a: 1 };
const YELLOW = { r: 0.95, g: 0.8, b: 0.2, a: 1 };
const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const GRAY = { r: 0.3, g: 0.3, b: 0.35, a: 1 };

// Layout
const COL_WIDTH = 140;
const ROW_HEIGHT = 100;
const START_X = 80;
const START_Y = 80;

function frame(): void {
  // --- Input handling ---
  if (isKeyDown("ArrowUp")) {
    zoom *= 1.02;
  }
  if (isKeyDown("ArrowDown")) {
    zoom *= 0.98;
  }
  if (isKeyPressed("ArrowRight")) {
    scaleMultiplier = Math.min(scaleMultiplier + 0.5, 8);
  }
  if (isKeyPressed("ArrowLeft")) {
    scaleMultiplier = Math.max(scaleMultiplier - 0.5, 0.5);
  }
  if (isKeyPressed("r")) {
    zoom = 1.0;
    scaleMultiplier = 1.0;
  }

  // Clamp zoom
  zoom = Math.max(0.25, Math.min(zoom, 8.0));

  // Set camera
  setCamera(200, 180, zoom);

  // Clear SDF entities for this frame
  clearSdfEntities();

  const baseSize = 25 * scaleMultiplier;

  // --- Header ---
  drawText(`SDF vs Sprite Comparison`, 10, 10, {
    scale: 1.5,
    tint: WHITE,
    screenSpace: true,
    layer: 200,
  });
  drawText(`Zoom: ${zoom.toFixed(2)}x | Scale: ${scaleMultiplier.toFixed(1)}x`, 10, 30, {
    scale: 1,
    tint: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
    screenSpace: true,
    layer: 200,
  });
  drawText(`UP/DOWN: zoom | LEFT/RIGHT: scale | R: reset`, 10, 45, {
    scale: 0.8,
    tint: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
    screenSpace: true,
    layer: 200,
  });

  // --- Column headers ---
  const colLabels = ["SDF Shape", "Geo Shape", "Sprite"];
  for (let c = 0; c < colLabels.length; c++) {
    drawText(colLabels[c], START_X + c * COL_WIDTH - 30, START_Y - 35, {
      scale: 1,
      tint: YELLOW,
      layer: 100,
    });
  }

  // --- Row 1: Circles ---
  const row1Y = START_Y;
  drawText("Circle", 10, row1Y + 10, { scale: 0.9, tint: GRAY, layer: 100 });

  // SDF circle
  sdfEntity({
    shape: sdfCircle(baseSize),
    fill: { type: "solid", color: "#e74c3c" },
    position: { x: START_X, y: row1Y },
    layer: 10,
  });

  // Geometry circle (triangle fan)
  drawCircle(START_X + COL_WIDTH, row1Y, baseSize, { color: RED, layer: 10 });

  // Sprite (square approximation)
  drawColorSprite({
    color: RED,
    x: START_X + 2 * COL_WIDTH - baseSize,
    y: row1Y - baseSize,
    w: baseSize * 2,
    h: baseSize * 2,
    layer: 10,
  });

  // --- Row 2: Boxes/Squares ---
  const row2Y = START_Y + ROW_HEIGHT;
  drawText("Box", 10, row2Y + 10, { scale: 0.9, tint: GRAY, layer: 100 });

  // SDF box
  sdfEntity({
    shape: sdfBox(baseSize * 1.5, baseSize),
    fill: { type: "solid", color: "#3498db" },
    position: { x: START_X, y: row2Y },
    layer: 10,
  });

  // Geometry - use lines to draw a rectangle outline (no filled rect in shapes)
  const geoBoxX = START_X + COL_WIDTH;
  const geoBoxW = baseSize * 1.5;
  const geoBoxH = baseSize;
  // Draw filled rect using 2 triangles would require direct op calls, use lines for outline
  drawLine(geoBoxX - geoBoxW, row2Y - geoBoxH, geoBoxX + geoBoxW, row2Y - geoBoxH, { color: BLUE, thickness: 2, layer: 10 });
  drawLine(geoBoxX + geoBoxW, row2Y - geoBoxH, geoBoxX + geoBoxW, row2Y + geoBoxH, { color: BLUE, thickness: 2, layer: 10 });
  drawLine(geoBoxX + geoBoxW, row2Y + geoBoxH, geoBoxX - geoBoxW, row2Y + geoBoxH, { color: BLUE, thickness: 2, layer: 10 });
  drawLine(geoBoxX - geoBoxW, row2Y + geoBoxH, geoBoxX - geoBoxW, row2Y - geoBoxH, { color: BLUE, thickness: 2, layer: 10 });

  // Sprite box
  drawColorSprite({
    color: BLUE,
    x: START_X + 2 * COL_WIDTH - geoBoxW,
    y: row2Y - geoBoxH,
    w: geoBoxW * 2,
    h: geoBoxH * 2,
    layer: 10,
  });

  // --- Row 3: Stars (SDF only - no equivalent in geo/sprite) ---
  const row3Y = START_Y + ROW_HEIGHT * 2;
  drawText("Star", 10, row3Y + 10, { scale: 0.9, tint: GRAY, layer: 100 });

  // SDF star
  sdfEntity({
    shape: sdfStar(baseSize, 5, 0.4),
    fill: { type: "solid", color: "#2ecc71" },
    position: { x: START_X, y: row3Y },
    layer: 10,
  });

  // Geometry - draw simple 5-pointed star outline
  const starX = START_X + COL_WIDTH;
  const outerR = baseSize;
  const innerR = baseSize * 0.4;
  for (let i = 0; i < 5; i++) {
    const angle1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const angle2 = ((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2;
    const angle3 = ((i + 1) * 2 * Math.PI) / 5 - Math.PI / 2;
    const x1 = starX + Math.cos(angle1) * outerR;
    const y1 = row3Y + Math.sin(angle1) * outerR;
    const x2 = starX + Math.cos(angle2) * innerR;
    const y2 = row3Y + Math.sin(angle2) * innerR;
    const x3 = starX + Math.cos(angle3) * outerR;
    const y3 = row3Y + Math.sin(angle3) * outerR;
    drawLine(x1, y1, x2, y2, { color: GREEN, thickness: 2, layer: 10 });
    drawLine(x2, y2, x3, y3, { color: GREEN, thickness: 2, layer: 10 });
  }

  // N/A for sprite
  drawText("N/A", START_X + 2 * COL_WIDTH - 10, row3Y, { scale: 0.8, tint: GRAY, layer: 100 });

  // --- Row 4: Heart (SDF special shape) ---
  const row4Y = START_Y + ROW_HEIGHT * 3;
  drawText("Heart", 10, row4Y + 10, { scale: 0.9, tint: GRAY, layer: 100 });

  // SDF heart
  sdfEntity({
    shape: sdfHeart(baseSize * 0.8),
    fill: { type: "solid", color: "#e91e63" },
    position: { x: START_X, y: row4Y },
    layer: 10,
  });

  // Geometry/Sprite: N/A
  drawText("N/A", START_X + COL_WIDTH - 10, row4Y, { scale: 0.8, tint: GRAY, layer: 100 });
  drawText("N/A", START_X + 2 * COL_WIDTH - 10, row4Y, { scale: 0.8, tint: GRAY, layer: 100 });

  // --- Observations panel ---
  const obsY = 320;
  drawText("Observations:", 10, obsY, {
    scale: 1,
    tint: YELLOW,
    screenSpace: true,
    layer: 200,
  });
  drawText("- SDF shapes have soft/fuzzy edges (fixed 2px AA range)", 10, obsY + 18, {
    scale: 0.8,
    tint: WHITE,
    screenSpace: true,
    layer: 200,
  });
  drawText("- Geometry shapes are aliased (no AA, hard edges)", 10, obsY + 33, {
    scale: 0.8,
    tint: WHITE,
    screenSpace: true,
    layer: 200,
  });
  drawText("- Sprites are pixel-perfect at 1:1, blur when scaled", 10, obsY + 48, {
    scale: 0.8,
    tint: WHITE,
    screenSpace: true,
    layer: 200,
  });
  drawText("- Zoom in to see the AA differences more clearly", 10, obsY + 63, {
    scale: 0.8,
    tint: { r: 0.6, g: 0.6, b: 0.6, a: 1 },
    screenSpace: true,
    layer: 200,
  });

  // Flush SDF entities
  flushSdfEntities();
}

// Start the frame loop
onFrame(frame);
