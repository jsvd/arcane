/**
 * SDF Primitives Demo
 *
 * Visual showcase of every SDF primitive rendered in a grid.
 * Each shape is labeled and rendered in a distinct color.
 * Purpose: visual verification that every SDF primitive port is correct.
 *
 * Run: arcane dev demos/sdf-primitives/sdf-primitives.ts
 */

import { drawText } from "../../runtime/rendering/index.ts";
import { createGame } from "../../runtime/game/index.ts";
import {
  circle,
  box,
  roundedBox,
  ellipse,
  segment,
  triangle,
  egg,
  heart,
  moon,
  hexagon,
  pentagon,
  star,
  cross,
  ring,
  sdfEntity,
  flushSdfEntities,
} from "../../runtime/rendering/sdf.ts";

// --- Layout ---
const COLS = 5;
const ROWS = 4;
const CELL_W = 80;
const CELL_H = 75;
const MARGIN = 10;
const START_X = 40;
const START_Y = 40;

// Color palette for distinct shapes
const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#2980b9", "#27ae60", "#8e44ad",
  "#16a085", "#d35400", "#c0392b", "#2c3e50", "#f1c40f",
  "#7f8c8d", "#e91e63", "#00bcd4", "#ff5722", "#795548",
];

// Define all primitives with their shapes and labels
const primitives: Array<{ label: string; shape: ReturnType<typeof circle> }> = [
  { label: "circle", shape: circle(20) },
  { label: "box", shape: box(30, 20) },
  { label: "rounded_box", shape: roundedBox(30, 20, 5) },
  { label: "ellipse", shape: ellipse(28, 14) },
  { label: "segment", shape: segment([-15, -10], [15, 10]) },
  { label: "triangle", shape: triangle([0, 18], [-16, -10], [16, -10]) },
  { label: "egg", shape: egg(16, 8) },
  { label: "heart", shape: heart(16) },
  { label: "moon", shape: moon(8, 18, 14) },
  { label: "hexagon", shape: hexagon(18) },
  { label: "pentagon", shape: pentagon(18) },
  { label: "star(5)", shape: star(18, 5, 0.4) },
  { label: "star(6)", shape: star(18, 6, 0.5) },
  { label: "cross", shape: cross(20, 6, 2) },
  { label: "ring", shape: ring(16, 3) },
];

// Create SDF entities in a grid
for (let i = 0; i < primitives.length; i++) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = START_X + col * CELL_W + CELL_W / 2;
  const y = START_Y + row * CELL_H + CELL_H / 2;

  sdfEntity({
    shape: primitives[i].shape,
    fill: { type: "solid", color: COLORS[i % COLORS.length] },
    position: [x, y],
    layer: 0,
  });
}

// Game setup
const game = createGame({
  name: "sdf-primitives",
  background: { r: 15 / 255, g: 15 / 255, b: 22 / 255 },
});

game.onFrame((_ctx) => {
  flushSdfEntities();

  // Draw labels for each primitive
  for (let i = 0; i < primitives.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = START_X + col * CELL_W + CELL_W / 2;
    const y = START_Y + row * CELL_H - 2;

    drawText(primitives[i].label, x - primitives[i].label.length * 3, y, {
      tint: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
    });
  }

  // Title
  drawText("SDF Primitives Gallery", 120, START_Y + ROWS * CELL_H + 10, {
    tint: { r: 1, g: 1, b: 1, a: 1 },
  });
});
