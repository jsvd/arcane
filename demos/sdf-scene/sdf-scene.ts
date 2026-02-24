/**
 * SDF Scene Demo
 *
 * A complete platformer scene built entirely with the TypeScript SDF API.
 * No image assets. Tests that the full pipeline works end-to-end:
 * TS composition -> WGSL generation -> Rust rendering.
 *
 * Features animated collectibles using the ergonomic API helpers.
 *
 * Run: arcane dev demos/sdf-scene/sdf-scene.ts
 */

import { drawText, getDeltaTime } from "../../runtime/rendering/index.ts";
import { createGame } from "../../runtime/game/index.ts";
import {
  circle,
  box,
  roundedBox,
  triangle,
  star,
  heart,
  union,
  smoothUnion,
  offset,
  round,
  sdfEntity,
  clearSdfEntities,
  flushSdfEntities,
  // New API helpers
  solid,
  glow,
  gradient,
  solidOutline,
  pulse,
  spin,
  bob,
  breathe,
  LAYERS,
} from "../../runtime/rendering/sdf.ts";

// Viewport dimensions
const W = 800;
const H = 600;

// Platform positions [x, y, halfWidth]
const platforms: Array<[number, number, number]> = [
  [150, 440, 90],
  [380, 380, 80],
  [600, 420, 100],
  [280, 300, 110],
  [520, 260, 85],
  [180, 220, 75],
  [420, 180, 95],
];

// Gem positions (above each platform)
const gems: Array<[number, number]> = [
  [150, 410],
  [380, 350],
  [600, 390],
  [280, 270],
  [520, 230],
  [180, 190],
  [420, 150],
];

// Cloud positions [x, y, scale]
const clouds: Array<[number, number, number]> = [
  [100, 70, 1.2],
  [320, 100, 1.0],
  [550, 60, 1.4],
  [720, 120, 0.9],
];

// Tree positions [x, y, scale]
const trees: Array<[number, number, number]> = [
  [80, 510, 1.0],
  [720, 510, 1.2],
  [450, 515, 0.8],
];

// =============================================
// SHAPE BUILDERS (reusable across frames)
// =============================================

const cloudShape = (scale: number) =>
  smoothUnion(
    8 * scale,
    circle(20 * scale),
    offset(circle(28 * scale), 24 * scale, 4 * scale),
    offset(circle(18 * scale), -20 * scale, -2 * scale),
    offset(circle(22 * scale), 10 * scale, 12 * scale),
  );

// Mountain range - rounded peaks with sharp valleys, overlapping bases
// Using union (sharp joins) with round() on individual peaks (soft tops)
// Wider bases ensure continuous mountain range with no gaps
const MOUNTAIN_BASE = -120; // Bottom of mountains (below screen)
const mountainPeaks = union(
  // Tallest peak (center-left) - height 180, most rounded, wide base
  offset(round(triangle([0, 180], [-140, MOUNTAIN_BASE], [140, MOUNTAIN_BASE]), 25), -60, 0),
  // Second tallest (center-right) - height 160, medium-high roundness
  offset(round(triangle([0, 160], [-130, MOUNTAIN_BASE], [130, MOUNTAIN_BASE]), 20), 120, 0),
  // Medium peak (far left) - height 130, subtle roundness
  offset(round(triangle([0, 130], [-120, MOUNTAIN_BASE], [120, MOUNTAIN_BASE]), 12), -250, 0),
  // Medium peak (far right) - height 140, moderate roundness
  offset(round(triangle([0, 140], [-125, MOUNTAIN_BASE], [125, MOUNTAIN_BASE]), 16), 300, 0),
  // Left edge peak - height 100, minimal roundness, extends past screen
  offset(round(triangle([0, 100], [-130, MOUNTAIN_BASE], [130, MOUNTAIN_BASE]), 8), -400, 0),
  // Right edge peak - height 110, light roundness, extends past screen
  offset(round(triangle([0, 110], [-130, MOUNTAIN_BASE], [130, MOUNTAIN_BASE]), 10), 420, 0),
);
// Mountain vertical extent: from MOUNTAIN_BASE (-120) to tallest peak (180) = 300 units
// Bounds must cover half the screen width (400) to render the full range
const MOUNTAIN_HEIGHT = 180 - MOUNTAIN_BASE; // 300
const MOUNTAIN_BOUNDS = W / 2; // 400 - covers full screen width

// Bushy tree foliage - overlapping circles in a more organic arrangement
const foliageShape = (scale: number) =>
  smoothUnion(
    10 * scale, // Larger blend for softer, bushier look
    circle(26 * scale),                              // Center
    offset(circle(20 * scale), -22 * scale, 0),      // Left
    offset(circle(20 * scale), 22 * scale, 0),       // Right
    offset(circle(18 * scale), -12 * scale, 16 * scale),  // Upper-left
    offset(circle(18 * scale), 12 * scale, 16 * scale),   // Upper-right
    offset(circle(16 * scale), 0, 22 * scale),       // Top
  );

// =============================================
// GAME SETUP
// =============================================

const game = createGame({
  name: "sdf-scene",
  background: { r: 0.04, g: 0.04, b: 0.06 },
});

let time = 0;

game.onFrame((_ctx) => {
  const dt = getDeltaTime();
  time += dt;

  // Clear previous frame's entities
  clearSdfEntities();

  // =============================================
  // SKY BACKGROUND (static)
  // =============================================
  sdfEntity({
    shape: box(W, H),
    fill: gradient("#1C3A5F", "#87CEEB", 90),
    position: [W / 2, H / 2],
    layer: LAYERS.BACKGROUND - 10,
  });

  // =============================================
  // SUN (with animated glow)
  // =============================================
  sdfEntity({
    shape: circle(45),
    fill: glow("#FFD700", 0.15), // Lower intensity = bigger glow
    position: [680, 80],
    scale: pulse(time, 0.5, 0.95, 1.05), // Subtle pulse
    opacity: breathe(time, 0.3, 0.85, 1.0),
    bounds: 200, // Large bounds for sun glow
    layer: LAYERS.BACKGROUND,
  });

  // =============================================
  // CLOUDS (slow drift animation, in front of mountains)
  // =============================================
  for (const [cx, cy, scale] of clouds) {
    // Slow horizontal drift with wraparound
    const driftX = ((cx + time * 8) % (W + 100)) - 50;
    sdfEntity({
      shape: cloudShape(scale),
      fill: solid("#ffffffee"),
      position: [driftX, cy],
      layer: LAYERS.BACKGROUND + 4, // In front of mountains (2), behind trees (8)
    });
  }

  // =============================================
  // MOUNTAINS - smooth peaks with green to white gradient
  // =============================================
  sdfEntity({
    shape: mountainPeaks,
    // Forest green at base, snow white at peaks
    // Scale = bounds / actual_half_height to fit gradient properly
    fill: gradient("#2d5a27", "#f8f8ff", 90, MOUNTAIN_BOUNDS / (MOUNTAIN_HEIGHT / 2)),
    position: [W / 2, H - 120],
    bounds: MOUNTAIN_BOUNDS,
    layer: LAYERS.BACKGROUND + 2,
  });

  // =============================================
  // TREES (static, in front of clouds)
  // =============================================
  for (const [tx, ty, scale] of trees) {
    // Trunk - darker brown
    sdfEntity({
      shape: roundedBox(10 * scale, 50 * scale, 4),
      fill: solid("#3a2510"),
      position: [tx, ty + 25 * scale],
      layer: LAYERS.GROUND - 2,
    });
    // Foliage - bright green, bushy shape
    sdfEntity({
      shape: foliageShape(scale),
      fill: solidOutline("#3a9a4a", "#1a6a2a", 2), // Brighter green with outline
      position: [tx, ty - 20 * scale],
      bounds: 50 * scale, // Explicit bounds for larger foliage
      layer: LAYERS.GROUND - 1,
    });
  }

  // =============================================
  // GROUND (static)
  // =============================================
  sdfEntity({
    shape: box(W, 60),
    fill: solidOutline("#5a8a3e", "#3d6b2a", 3),
    position: [W / 2, H - 30],
    layer: LAYERS.GROUND,
  });

  // Grass detail strip
  sdfEntity({
    shape: box(W, 8),
    fill: solid("#6a9a4e"),
    position: [W / 2, H - 64],
    layer: LAYERS.GROUND + 1,
  });

  // =============================================
  // PLATFORMS (static)
  // =============================================
  for (const [px, py, pw] of platforms) {
    sdfEntity({
      shape: round(box(pw, 12), 4),
      fill: solidOutline("#8B7355", "#5C4033", 2),
      position: [px, py],
      layer: LAYERS.ENTITIES,
    });
  }

  // =============================================
  // COLLECTIBLES (animated!)
  // =============================================

  // Gems - spinning and pulsing with visible glow
  for (let i = 0; i < gems.length; i++) {
    const [gx, gy] = gems[i];
    // Stagger animation phase for each gem
    const phase = i * 0.7;
    sdfEntity({
      shape: star(14, 4, 0.5),
      fill: glow("#00ffaa", 0.2), // Lower intensity = bigger glow
      position: [gx, gy + bob(time + phase, 2, 3)], // Gentle bobbing
      rotation: spin(time + phase, 45), // Slow spin
      scale: pulse(time + phase, 3, 0.9, 1.1),
      bounds: 50, // Explicit bounds for glow
      layer: LAYERS.ENTITIES + 5,
    });
  }

  // Heart pickups - pulsing with breathing glow
  const heartPositions: Array<[number, number]> = [
    [480, 320],
    [220, 250],
  ];
  for (let i = 0; i < heartPositions.length; i++) {
    const [hx, hy] = heartPositions[i];
    const phase = i * 1.2;
    sdfEntity({
      shape: heart(18),
      fill: glow("#ff3366", 0.15), // Lower intensity = bigger glow
      position: [hx, hy],
      scale: pulse(time + phase, 2.5, 0.95, 1.15),
      opacity: breathe(time + phase, 2.5, 0.75, 1.0),
      bounds: 70, // Large bounds for heart glow
      layer: LAYERS.ENTITIES + 5,
    });
  }

  // Big star bonus - prominent glow and spin
  sdfEntity({
    shape: star(22, 5, 0.4),
    fill: glow("#FFD700", 0.12), // Even lower intensity for big glow
    position: [420, 120],
    rotation: spin(time, 30),
    scale: pulse(time, 2, 0.9, 1.2),
    opacity: breathe(time, 1.5, 0.8, 1.0),
    bounds: 100, // Very large bounds for star glow
    layer: LAYERS.FOREGROUND,
  });

  // =============================================
  // PLAYER (static stick figure)
  // =============================================
  const playerFill = solidOutline("#4488ff", "#2255cc", 2);

  // Head
  sdfEntity({
    shape: circle(12),
    fill: playerFill,
    position: [120, 490],
    layer: LAYERS.ENTITIES + 10,
  });

  // Body
  sdfEntity({
    shape: roundedBox(8, 22, 3),
    fill: playerFill,
    position: [120, 520],
    layer: LAYERS.ENTITIES + 10,
  });

  // Left leg
  sdfEntity({
    shape: roundedBox(5, 18, 2),
    fill: playerFill,
    position: [112, 555],
    layer: LAYERS.ENTITIES + 9,
  });

  // Right leg
  sdfEntity({
    shape: roundedBox(5, 18, 2),
    fill: playerFill,
    position: [128, 555],
    layer: LAYERS.ENTITIES + 9,
  });

  // Left arm
  sdfEntity({
    shape: roundedBox(4, 14, 2),
    fill: playerFill,
    position: [100, 518],
    layer: LAYERS.ENTITIES + 9,
  });

  // Right arm
  sdfEntity({
    shape: roundedBox(4, 14, 2),
    fill: playerFill,
    position: [140, 518],
    layer: LAYERS.ENTITIES + 9,
  });

  // Flush all entities to GPU
  flushSdfEntities();

  // UI overlay - dark text to contrast with light sky
  // Shadow/outline effect: draw dark text slightly offset, then light text on top
  drawText("SDF Scene - No Image Assets Used", W / 2 - 139, 16, {
    tint: { r: 0, g: 0, b: 0, a: 0.7 },
  });
  drawText("SDF Scene - No Image Assets Used", W / 2 - 140, 15, {
    tint: { r: 1, g: 1, b: 1, a: 1 },
  });

  // FPS counter with shadow
  const fps = dt > 0 ? Math.round(1 / dt) : 0;
  drawText(`FPS: ${fps}`, 11, 16, {
    tint: { r: 0, g: 0, b: 0, a: 0.7 },
  });
  drawText(`FPS: ${fps}`, 10, 15, {
    tint: { r: 0.3, g: 1, b: 0.3, a: 1 },
  });
});
