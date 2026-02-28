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
  sdfCircle,
  sdfTriangle,
  sdfStar,
  sdfHeart,
  sdfSmoothUnion,
  sdfOffset,
  sdfMirrorX,
  sdfRepeat,
  sdfRound,
  sdfOutlineN,
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
      shape: sdfSmoothUnion(
        8,
        sdfCircle(40),
        sdfOffset(sdfCircle(30), { x: 30, y: 10 }),
        sdfOffset(sdfCircle(25), { x: -20, y: 20 }),
      ),
      fill: cosinePalette(
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [1.0, 1.0, 1.0],
        [0.0, 0.33, 0.67],
      ),
      position: { x: GRID[0][0], y: GRID[0][1] },
      layer: LAYERS.ENTITIES,
    });

    // 2. Gradient Fill - equilateral triangle (blue to red)
    // bounds=43 for width, but triangle Y extent is ±37, so scale=43/37
    sdfEntity({
      shape: sdfTriangle({ x: 0, y: 37 }, { x: -43, y: -37 }, { x: 43, y: -37 }),
      fill: gradient("#000066", "#ff0000", 90, 43 / 37),
      position: { x: GRID[1][0], y: GRID[1][1] },
      bounds: 43,
      layer: LAYERS.ENTITIES,
    });

    // 3. Glow Heart - pulsing glow effect (using breathe() helper)
    sdfEntity({
      shape: sdfHeart(30),
      fill: glow("#ff3366", 200),
      position: { x: GRID[2][0], y: GRID[2][1] },
      scale: pulse(time, 3, 1.0, 1.15),
      opacity: breathe(time, 3, 0.7, 1.0),
      // bounds auto-calculated: heart size + glow spread * 2 for proper glow rendering
      layer: LAYERS.ENTITIES,
    });

    // ===== Row 2: Shape Animations =====

    // 4. Pulsing Star - animated scale (using pulse() helper)
    sdfEntity({
      shape: sdfStar(30, 5, 0.4),
      fill: glow("#FFD700", 63),
      position: { x: GRID[3][0], y: GRID[3][1] },
      scale: pulse(time, 4, 0.7, 1.3),
      layer: LAYERS.ENTITIES,
    });

    // 5. Spinning Star - animated rotation (using spin() helper)
    sdfEntity({
      shape: sdfStar(35, 6, 0.5),
      fill: solid("#e74c3c"),
      position: { x: GRID[4][0], y: GRID[4][1] },
      rotation: spin(time, 60),
      layer: LAYERS.ENTITIES,
    });

    // 6. Breathing Circle - glow pulse (using breathe() helper)
    sdfEntity({
      shape: sdfCircle(25),
      fill: glow("#3498db", 200),
      position: { x: GRID[5][0], y: GRID[5][1] },
      scale: pulse(time, 2, 1.0, 1.2),
      opacity: breathe(time, 2, 0.7, 1.0),
      bounds: 80,
      layer: LAYERS.ENTITIES,
    });

    // ===== Row 3: Domain Transforms =====

    // 7. Repeat Pattern - infinite tiling (using spin() helper)
    sdfEntity({
      shape: sdfRepeat(sdfCircle(8), { x: 30, y: 30 }),
      fill: solid("#2ecc71"),
      position: { x: GRID[6][0], y: GRID[6][1] },
      rotation: spin(time, 20),
      bounds: 100,
      layer: LAYERS.ENTITIES,
    });

    // 8. Mirror X - symmetry transform (using spin() helper)
    sdfEntity({
      shape: sdfMirrorX(sdfOffset(sdfStar(20, 5, 0.4), { x: 30, y: 0 })),
      fill: solid("#9b59b6"),
      position: { x: GRID[7][0], y: GRID[7][1] },
      rotation: spin(time, 30),
      layer: LAYERS.ENTITIES,
    });

    // 9. Onion Rings - using outlineN() helper for concise nesting
    sdfEntity({
      shape: sdfOutlineN(sdfCircle(45), 8, 3),
      fill: solid("#e67e22"),
      position: { x: GRID[8][0], y: GRID[8][1] },
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
