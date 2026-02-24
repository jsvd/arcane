/**
 * SDF Effects Demo
 *
 * Showcases 9 unique SDF capabilities in a 3x3 grid using the ergonomic API helpers:
 *
 * Row 1 - Fill Types:
 *   - Cosine Palette: distance-based rainbow coloring
 *   - Gradient: linear color gradient fill
 *   - Glow: soft glow/bloom effect
 *
 * Row 2 - Shape Animations:
 *   - Pulsing: animated scale (using pulse() helper)
 *   - Spinning: animated rotation (using spin() helper)
 *   - Breathing: scale + glow combination (using breathe() helper)
 *
 * Row 3 - Domain Transforms:
 *   - Repeat: infinite tiling pattern
 *   - Mirror: X-axis symmetry
 *   - Onion: concentric ring outlines (using outlineN() helper)
 *
 * Run: arcane dev demos/sdf-effects/sdf-effects.ts
 */

import { drawText, getDeltaTime } from "../../runtime/rendering/index.ts";
import { createGame } from "../../runtime/game/index.ts";
import {
  circle,
  triangle,
  star,
  heart,
  smoothUnion,
  offset,
  mirrorX,
  repeat,
  round,
  outlineN,
  sdfEntity,
  // Fill shorthand functions
  solid,
  glow,
  gradient,
  cosinePalette,
  // Animation helpers
  pulse,
  spin,
  breathe,
  // Frame management
  createSdfFrame,
  // Layout helpers
  createGrid,
  // Layer constants
  LAYERS,
} from "../../runtime/rendering/sdf.ts";

// Viewport size
const W = 800;
const H = 600;

// Layout: 3 columns x 3 rows using createGrid helper
const COL = W / 3;
const ROW = H / 3;
const GRID = createGrid(3, 3, COL, ROW, COL / 2, ROW / 2 + 20);

let time = 0;

const game = createGame({
  name: "sdf-effects",
  background: { r: 12 / 255, g: 12 / 255, b: 20 / 255 },
});

game.onFrame((_ctx) => {
  const dt = getDeltaTime();
  time += dt;

  // Use createSdfFrame to automatically handle clear + flush
  createSdfFrame(() => {
    // ===== Row 1: Fill Types =====

    // 1. Cosine Palette - distance-based rainbow coloring
    sdfEntity({
      shape: smoothUnion(
        8,
        circle(40),
        offset(circle(30), 30, 10),
        offset(circle(25), -20, 20),
      ),
      fill: cosinePalette(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [1.0, 1.0, 1.0],
        [0.0, 0.33, 0.67],
      ),
      position: [GRID[0][0], GRID[0][1]],
      layer: LAYERS.ENTITIES,
    });

    // 2. Gradient Fill - equilateral triangle (blue to red)
    // bounds=43 for width, but triangle Y extent is ±37, so scale=43/37
    sdfEntity({
      shape: triangle([0, 37], [-43, -37], [43, -37]),
      fill: gradient("#000066", "#ff0000", 90, 43 / 37),
      position: [GRID[1][0], GRID[1][1]],
      bounds: 43,
      layer: LAYERS.ENTITIES,
    });

    // 3. Glow Heart - pulsing glow effect (using breathe() helper)
    sdfEntity({
      shape: heart(30),
      fill: glow("#ff3366", 0.25),
      position: [GRID[2][0], GRID[2][1]],
      scale: pulse(time, 3, 1.0, 1.15),
      opacity: breathe(time, 3, 0.7, 1.0),
      bounds: 90,
      layer: LAYERS.ENTITIES,
    });

    // ===== Row 2: Shape Animations =====

    // 4. Pulsing Star - animated scale (using pulse() helper)
    sdfEntity({
      shape: star(30, 5, 0.4),
      fill: glow("#FFD700", 0.8),
      position: [GRID[3][0], GRID[3][1]],
      scale: pulse(time, 4, 0.7, 1.3),
      layer: LAYERS.ENTITIES,
    });

    // 5. Spinning Star - animated rotation (using spin() helper)
    sdfEntity({
      shape: star(35, 6, 0.5),
      fill: solid("#e74c3c"),
      position: [GRID[4][0], GRID[4][1]],
      rotation: spin(time, 60),
      layer: LAYERS.ENTITIES,
    });

    // 6. Breathing Circle - glow pulse (using breathe() helper)
    sdfEntity({
      shape: circle(25),
      fill: glow("#3498db", 0.25),
      position: [GRID[5][0], GRID[5][1]],
      scale: pulse(time, 2, 1.0, 1.2),
      opacity: breathe(time, 2, 0.7, 1.0),
      bounds: 80,
      layer: LAYERS.ENTITIES,
    });

    // ===== Row 3: Domain Transforms =====

    // 7. Repeat Pattern - infinite tiling (using spin() helper)
    sdfEntity({
      shape: repeat(circle(8), 30, 30),
      fill: solid("#2ecc71"),
      position: [GRID[6][0], GRID[6][1]],
      rotation: spin(time, 20),
      bounds: 100,
      layer: LAYERS.ENTITIES,
    });

    // 8. Mirror X - symmetry transform (using spin() helper)
    sdfEntity({
      shape: mirrorX(offset(star(20, 5, 0.4), 30, 0)),
      fill: solid("#9b59b6"),
      position: [GRID[7][0], GRID[7][1]],
      rotation: spin(time, 30),
      layer: LAYERS.ENTITIES,
    });

    // 9. Onion Rings - using outlineN() helper for concise nesting
    sdfEntity({
      shape: outlineN(circle(45), 8, 3),
      fill: solid("#e67e22"),
      position: [GRID[8][0], GRID[8][1]],
      scale: pulse(time, 2.5, 0.85, 1.15),
      layer: LAYERS.ENTITIES,
    });
  });

  // Title and FPS
  drawText("SDF Effects - 9 Unique Capabilities", W / 2 - 120, 15, {
    tint: { r: 1, g: 1, b: 1, a: 0.9 },
  });

  const fps = dt > 0 ? Math.round(1 / dt) : 0;
  drawText(`FPS: ${fps}`, 10, 15, {
    tint: { r: 0.5, g: 1, b: 0.5, a: 0.8 },
  });

  // Labels - use grid positions for consistency
  const LABEL_OFFSET = -65;
  const labels = [
    "Cosine Palette",
    "Gradient",
    "Glow",
    "Pulsing",
    "Spinning",
    "Breathing",
    "Repeat",
    "Mirror",
    "Onion",
  ];

  for (let i = 0; i < labels.length; i++) {
    const [x, y] = GRID[i];
    const label = labels[i];
    drawText(
      label,
      x - label.length * 3,
      y + LABEL_OFFSET,
      { tint: { r: 0.7, g: 0.7, b: 0.7, a: 1 } },
    );
  }
});
