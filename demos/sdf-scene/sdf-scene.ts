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
  sdfCircle,
  sdfBox,
  sdfRoundedBox,
  sdfTriangle,
  sdfStar,
  sdfHeart,
  sdfUnion,
  sdfSmoothUnion,
  sdfOffset,
  sdfRound,
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
const gems: Array<{ x: number; y: number }> = [
  { x: 150, y: 410 },
  { x: 380, y: 350 },
  { x: 600, y: 390 },
  { x: 280, y: 270 },
  { x: 520, y: 230 },
  { x: 180, y: 190 },
  { x: 420, y: 150 },
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
  sdfSmoothUnion(
    8 * scale,
    sdfCircle(20 * scale),
    sdfOffset(sdfCircle(28 * scale), { x: 24 * scale, y: 4 * scale }),
    sdfOffset(sdfCircle(18 * scale), { x: -20 * scale, y: -2 * scale }),
    sdfOffset(sdfCircle(22 * scale), { x: 10 * scale, y: 12 * scale }),
  );

// Mountain range - rounded peaks with sharp valleys, overlapping bases
// Using union (sharp joins) with round() on individual peaks (soft tops)
// Wider bases ensure continuous mountain range with no gaps
const MOUNTAIN_BASE = -120; // Bottom of mountains (below screen)
const mountainPeaks = sdfUnion(
  // Tallest peak (center-left) - height 180, most rounded, wide base
  sdfOffset(sdfRound(sdfTriangle({ x: 0, y: 180 }, { x: -140, y: MOUNTAIN_BASE }, { x: 140, y: MOUNTAIN_BASE }), 25), { x: -60, y: 0 }),
  // Second tallest (center-right) - height 160, medium-high roundness
  sdfOffset(sdfRound(sdfTriangle({ x: 0, y: 160 }, { x: -130, y: MOUNTAIN_BASE }, { x: 130, y: MOUNTAIN_BASE }), 20), { x: 120, y: 0 }),
  // Medium peak (far left) - height 130, subtle roundness
  sdfOffset(sdfRound(sdfTriangle({ x: 0, y: 130 }, { x: -120, y: MOUNTAIN_BASE }, { x: 120, y: MOUNTAIN_BASE }), 12), { x: -250, y: 0 }),
  // Medium peak (far right) - height 140, moderate roundness
  sdfOffset(sdfRound(sdfTriangle({ x: 0, y: 140 }, { x: -125, y: MOUNTAIN_BASE }, { x: 125, y: MOUNTAIN_BASE }), 16), { x: 300, y: 0 }),
  // Left edge peak - height 100, minimal roundness, extends past screen
  sdfOffset(sdfRound(sdfTriangle({ x: 0, y: 100 }, { x: -130, y: MOUNTAIN_BASE }, { x: 130, y: MOUNTAIN_BASE }), 8), { x: -400, y: 0 }),
  // Right edge peak - height 110, light roundness, extends past screen
  sdfOffset(sdfRound(sdfTriangle({ x: 0, y: 110 }, { x: -130, y: MOUNTAIN_BASE }, { x: 130, y: MOUNTAIN_BASE }), 10), { x: 420, y: 0 }),
);
// Mountain vertical extent: from MOUNTAIN_BASE (-120) to tallest peak (180) = 300 units
// Bounds must cover half the screen width (400) to render the full range
const MOUNTAIN_HEIGHT = 180 - MOUNTAIN_BASE; // 300
const MOUNTAIN_BOUNDS = W / 2; // 400 - covers full screen width

// Bushy tree foliage - overlapping circles in a more organic arrangement
const foliageShape = (scale: number) =>
  sdfSmoothUnion(
    10 * scale, // Larger blend for softer, bushier look
    sdfCircle(26 * scale),                              // Center
    sdfOffset(sdfCircle(20 * scale), { x: -22 * scale, y: 0 }),      // Left
    sdfOffset(sdfCircle(20 * scale), { x: 22 * scale, y: 0 }),       // Right
    sdfOffset(sdfCircle(18 * scale), { x: -12 * scale, y: 16 * scale }),  // Upper-left
    sdfOffset(sdfCircle(18 * scale), { x: 12 * scale, y: 16 * scale }),   // Upper-right
    sdfOffset(sdfCircle(16 * scale), { x: 0, y: 22 * scale }),       // Top
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
    shape: sdfBox(W, H),
    fill: gradient("#1C3A5F", "#87CEEB", 90),
    position: { x: W / 2, y: H / 2 },
    layer: LAYERS.BACKGROUND - 10,
  });

  // =============================================
  // SUN (with animated glow)
  // =============================================
  sdfEntity({
    shape: sdfCircle(45),
    fill: glow("#FFD700", 333), // spread ≈ 50 / 0.15
    position: { x: 680, y: 80 },
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
      position: { x: driftX, y: cy },
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
    position: { x: W / 2, y: H - 120 },
    bounds: MOUNTAIN_BOUNDS,
    layer: LAYERS.BACKGROUND + 2,
  });

  // =============================================
  // TREES (static, in front of clouds)
  // =============================================
  for (const [tx, ty, scale] of trees) {
    // Trunk - darker brown
    sdfEntity({
      shape: sdfRoundedBox(10 * scale, 50 * scale, 4),
      fill: solid("#3a2510"),
      position: { x: tx, y: ty + 25 * scale },
      layer: LAYERS.GROUND - 2,
    });
    // Foliage - bright green, bushy shape
    sdfEntity({
      shape: foliageShape(scale),
      fill: solidOutline("#3a9a4a", "#1a6a2a", 2), // Brighter green with outline
      position: { x: tx, y: ty - 20 * scale },
      bounds: 50 * scale, // Explicit bounds for larger foliage
      layer: LAYERS.GROUND - 1,
    });
  }

  // =============================================
  // GROUND (static)
  // =============================================
  sdfEntity({
    shape: sdfBox(W, 60),
    fill: solidOutline("#5a8a3e", "#3d6b2a", 3),
    position: { x: W / 2, y: H - 30 },
    layer: LAYERS.GROUND,
  });

  // Grass detail strip
  sdfEntity({
    shape: sdfBox(W, 8),
    fill: solid("#6a9a4e"),
    position: { x: W / 2, y: H - 64 },
    layer: LAYERS.GROUND + 1,
  });

  // =============================================
  // PLATFORMS (static)
  // =============================================
  for (const [px, py, pw] of platforms) {
    sdfEntity({
      shape: sdfRound(sdfBox(pw, 12), 4),
      fill: solidOutline("#8B7355", "#5C4033", 2),
      position: { x: px, y: py },
      layer: LAYERS.ENTITIES,
    });
  }

  // =============================================
  // COLLECTIBLES (animated!)
  // =============================================

  // Gems - spinning and pulsing with visible glow
  for (let i = 0; i < gems.length; i++) {
    const { x: gx, y: gy } = gems[i];
    // Stagger animation phase for each gem
    const phase = i * 0.7;
    sdfEntity({
      shape: sdfStar(14, 4, 0.5),
      fill: glow("#00ffaa", 250), // spread ≈ 50 / 0.2
      position: { x: gx, y: gy + bob(time + phase, 2, 3) }, // Gentle bobbing
      rotation: spin(time + phase, 45), // Slow spin
      scale: pulse(time + phase, 3, 0.9, 1.1),
      bounds: 50, // Explicit bounds for glow
      layer: LAYERS.ENTITIES + 5,
    });
  }

  // Heart pickups - pulsing with breathing glow
  const heartPositions: Array<{ x: number; y: number }> = [
    { x: 480, y: 320 },
    { x: 220, y: 250 },
  ];
  for (let i = 0; i < heartPositions.length; i++) {
    const { x: hx, y: hy } = heartPositions[i];
    const phase = i * 1.2;
    sdfEntity({
      shape: sdfHeart(18),
      fill: glow("#ff3366", 333), // spread ≈ 50 / 0.15
      position: { x: hx, y: hy },
      scale: pulse(time + phase, 2.5, 0.95, 1.15),
      opacity: breathe(time + phase, 2.5, 0.75, 1.0),
      bounds: 70, // Large bounds for heart glow
      layer: LAYERS.ENTITIES + 5,
    });
  }

  // Big star bonus - prominent glow and spin
  sdfEntity({
    shape: sdfStar(22, 5, 0.4),
    fill: glow("#FFD700", 417), // spread ≈ 50 / 0.12
    position: { x: 420, y: 120 },
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
    shape: sdfCircle(12),
    fill: playerFill,
    position: { x: 120, y: 490 },
    layer: LAYERS.ENTITIES + 10,
  });

  // Body
  sdfEntity({
    shape: sdfRoundedBox(8, 22, 3),
    fill: playerFill,
    position: { x: 120, y: 520 },
    layer: LAYERS.ENTITIES + 10,
  });

  // Left leg
  sdfEntity({
    shape: sdfRoundedBox(5, 18, 2),
    fill: playerFill,
    position: { x: 112, y: 555 },
    layer: LAYERS.ENTITIES + 9,
  });

  // Right leg
  sdfEntity({
    shape: sdfRoundedBox(5, 18, 2),
    fill: playerFill,
    position: { x: 128, y: 555 },
    layer: LAYERS.ENTITIES + 9,
  });

  // Left arm
  sdfEntity({
    shape: sdfRoundedBox(4, 14, 2),
    fill: playerFill,
    position: { x: 100, y: 518 },
    layer: LAYERS.ENTITIES + 9,
  });

  // Right arm
  sdfEntity({
    shape: sdfRoundedBox(4, 14, 2),
    fill: playerFill,
    position: { x: 140, y: 518 },
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
