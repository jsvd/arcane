/**
 * Isometric Dungeon Explorer — Isometric 2.5D Demo
 *
 * Showcases isometric coordinate transforms, depth-based sprite sorting,
 * click-to-move pathfinding, coin collection, and smooth camera follow.
 *
 * Controls:
 * - Click: Move to tile (pathfinding)
 * - Z: Zoom in
 * - X: Zoom out
 * - R: Reset game
 */

import {
  drawSprite,
  setCamera,
  getCamera,
  isKeyPressed,
  isMouseButtonPressed,
  createSolidTexture,
  drawText,
  setCameraBounds,
  trackTarget,
  getMouseWorldPosition,
  getViewportSize,
} from "../../runtime/rendering/index.ts";
import { findPath } from "../../runtime/pathfinding/index.ts";
import type { PathGrid } from "../../runtime/pathfinding/index.ts";
import { updateTweens } from "../../runtime/tweening/index.ts";
import { createGame, createSpriteGroup, drawSpriteGroup, getSpritePart } from "../../runtime/game/index.ts";
import { drawLine, rgb } from "../../runtime/ui/index.ts";

// --- Isometric constants ---
const TILE_W = 64; // Diamond width
const TILE_H = 32; // Diamond height (half of width)
const MAP_W = 16;
const MAP_H = 16;

// --- Coordinate transforms ---

function isoToWorld(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

function worldToIso(wx: number, wy: number): { x: number; y: number } {
  return {
    x: (wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2,
    y: (wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2,
  };
}

function worldToGrid(wx: number, wy: number): { x: number; y: number } {
  const iso = worldToIso(wx, wy + TILE_H / 2);
  return { x: Math.floor(iso.x), y: Math.floor(iso.y) };
}

function depthLayer(gy: number): number {
  return Math.floor(gy * 10);
}

// --- Textures (expanded palette) ---
// Floor
const TEX_FLOOR_A = createSolidTexture("floor_a", rgb(185, 165, 125));
const TEX_FLOOR_B = createSolidTexture("floor_b", rgb(175, 155, 115));
const TEX_FLOOR_EDGE = createSolidTexture("floor_edge", rgb(140, 125, 95));
const TEX_FLOOR_HI = createSolidTexture("floor_hi", rgb(200, 180, 140));
const TEX_FLOOR_CRACK = createSolidTexture("floor_crack", rgb(130, 115, 85));
const TEX_FLOOR_PEBBLE = createSolidTexture("floor_pebble", rgb(160, 142, 108));

// Wall
const TEX_BRICK_A = createSolidTexture("brick_a", rgb(90, 75, 95));
const TEX_BRICK_B = createSolidTexture("brick_b", rgb(80, 65, 85));
const TEX_BRICK_C = createSolidTexture("brick_c", rgb(100, 85, 105));
const TEX_MORTAR = createSolidTexture("mortar", rgb(55, 50, 60));
const TEX_WALL_SHADOW = createSolidTexture("wall_shadow", rgb(45, 40, 55));
const TEX_WALL_TOP_A = createSolidTexture("wall_top_a", rgb(95, 88, 105));
const TEX_WALL_TOP_B = createSolidTexture("wall_top_b", rgb(85, 78, 95));
const TEX_WALL_TOP_EDGE = createSolidTexture("wall_top_edge", rgb(110, 100, 120));

// Crate
const TEX_WOOD_A = createSolidTexture("wood_a", rgb(160, 112, 60));
const TEX_WOOD_B = createSolidTexture("wood_b", rgb(145, 100, 50));
const TEX_WOOD_HI = createSolidTexture("wood_hi", rgb(185, 135, 75));
const TEX_WOOD_DARK = createSolidTexture("wood_dark", rgb(120, 82, 40));
const TEX_METAL = createSolidTexture("metal", rgb(100, 95, 85));
const TEX_METAL_HI = createSolidTexture("metal_hi", rgb(140, 135, 125));
const TEX_CRATE_TOP_A = createSolidTexture("crate_top_a", rgb(180, 130, 70));
const TEX_CRATE_TOP_B = createSolidTexture("crate_top_b", rgb(170, 122, 62));

// Player
const TEX_SKIN = createSolidTexture("skin", rgb(230, 190, 150));
const TEX_HAIR = createSolidTexture("hair", rgb(60, 40, 25));
const TEX_SHIRT = createSolidTexture("shirt", rgb(50, 120, 220));
const TEX_SHIRT_HI = createSolidTexture("shirt_hi", rgb(70, 145, 240));
const TEX_SHIRT_DARK = createSolidTexture("shirt_dark", rgb(35, 95, 180));
const TEX_PANTS = createSolidTexture("pants", rgb(60, 60, 75));
const TEX_PANTS_HI = createSolidTexture("pants_hi", rgb(75, 75, 90));
const TEX_BOOTS = createSolidTexture("boots", rgb(70, 50, 35));
const TEX_BELT = createSolidTexture("belt", rgb(100, 70, 40));
const TEX_EYE = createSolidTexture("eye", rgb(255, 255, 255));
const TEX_PUPIL = createSolidTexture("pupil", rgb(30, 30, 40));

// Coin
const TEX_GOLD_A = createSolidTexture("gold_a", rgb(255, 210, 50));
const TEX_GOLD_B = createSolidTexture("gold_b", rgb(230, 185, 35));
const TEX_GOLD_DARK = createSolidTexture("gold_dark", rgb(190, 150, 25));
const TEX_GOLD_HI = createSolidTexture("gold_hi", rgb(255, 240, 130));
const TEX_GOLD_SHINE = createSolidTexture("gold_shine", rgb(255, 255, 220));

// Utility
const TEX_WHITE = createSolidTexture("white", rgb(255, 255, 255));
const TEX_BLACK = createSolidTexture("black", rgb(0, 0, 0));
const TEX_PATH_DOT = createSolidTexture("path_dot", rgb(100, 200, 255));
const TEX_HUD_BG = createSolidTexture("hud_bg", rgb(20, 15, 30));

// --- Seeded PRNG for consistent per-tile details ---
function hashTile(gx: number, gy: number, seed: number): number {
  let h = (gx * 374761 + gy * 668265 + seed * 982451) | 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff;
}

// --- Map definition ---
const TF = 0;
const TW = 1;
const TC = 2;

// prettier-ignore
const mapData: number[][] = [
  [TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW],
  [TW,TF,TF,TF,TF,TF,TW,TF,TF,TF,TF,TF,TF,TF,TF,TW],
  [TW,TF,TF,TF,TF,TF,TW,TF,TF,TF,TF,TF,TF,TF,TF,TW],
  [TW,TF,TF,TC,TF,TF,TF,TF,TF,TC,TF,TF,TF,TF,TF,TW],
  [TW,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TC,TF,TF,TW],
  [TW,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TW],
  [TW,TW,TW,TF,TF,TF,TW,TW,TW,TF,TF,TF,TF,TF,TF,TW],
  [TW,TF,TF,TF,TF,TF,TW,TF,TF,TF,TF,TW,TW,TW,TF,TW],
  [TW,TF,TF,TF,TF,TF,TW,TF,TF,TF,TF,TW,TF,TF,TF,TW],
  [TW,TF,TC,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TW],
  [TW,TF,TF,TF,TF,TF,TF,TF,TF,TC,TF,TF,TF,TC,TF,TW],
  [TW,TF,TF,TF,TW,TW,TF,TF,TF,TF,TF,TF,TF,TF,TF,TW],
  [TW,TF,TF,TF,TW,TF,TF,TF,TF,TF,TF,TW,TF,TF,TF,TW],
  [TW,TF,TF,TF,TF,TF,TF,TC,TF,TF,TF,TW,TF,TF,TF,TW],
  [TW,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TF,TW],
  [TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW,TW],
];

function isWalkable(gx: number, gy: number): boolean {
  if (gx < 0 || gy < 0 || gx >= MAP_W || gy >= MAP_H) return false;
  return mapData[gy][gx] === TF;
}

// --- Pathfinding grid ---
const pathGrid: PathGrid = {
  width: MAP_W,
  height: MAP_H,
  isWalkable: (x, y) => isWalkable(x, y),
};

// --- Coins ---
interface Coin {
  gx: number;
  gy: number;
  collected: boolean;
}

const coins: Coin[] = [
  { gx: 2, gy: 1, collected: false },
  { gx: 5, gy: 2, collected: false },
  { gx: 8, gy: 1, collected: false },
  { gx: 13, gy: 2, collected: false },
  { gx: 1, gy: 5, collected: false },
  { gx: 7, gy: 4, collected: false },
  { gx: 14, gy: 5, collected: false },
  { gx: 2, gy: 8, collected: false },
  { gx: 8, gy: 7, collected: false },
  { gx: 14, gy: 8, collected: false },
  { gx: 5, gy: 10, collected: false },
  { gx: 12, gy: 12, collected: false },
  { gx: 1, gy: 14, collected: false },
  { gx: 9, gy: 14, collected: false },
  { gx: 14, gy: 14, collected: false },
];

let score = 0;

// --- Player state ---
const player = {
  gx: 1,
  gy: 1,
  x: 0,
  y: 0,
  path: [] as Array<{ x: number; y: number }>,
  speed: 150,
};

const startWorld = isoToWorld(player.gx, player.gy);
player.x = startWorld.x;
player.y = startWorld.y;

// --- Camera setup ---

const mapCenter = isoToWorld(MAP_W / 2, MAP_H / 2);
const isoVp = getViewportSize();
setCamera(mapCenter.x - isoVp.width / 2, mapCenter.y - isoVp.height / 2, 1.0);

const topCorner = isoToWorld(0, 0);
const rightCorner = isoToWorld(MAP_W, 0);
const bottomCorner = isoToWorld(MAP_W, MAP_H);
const leftCorner = isoToWorld(0, MAP_H);

setCameraBounds({
  minX: leftCorner.x - 100,
  minY: topCorner.y - 100,
  maxX: rightCorner.x + 100,
  maxY: bottomCorner.y + 100,
});

let currentZoom = 1.0;

// --- Input handling ---
function handleInput(): void {
  if (isMouseButtonPressed(0)) {
    const mouseWorld = getMouseWorldPosition();
    const grid = worldToGrid(mouseWorld.x, mouseWorld.y);
    if (grid.x >= 0 && grid.x < MAP_W && grid.y >= 0 && grid.y < MAP_H) {
      if (isWalkable(grid.x, grid.y)) {
        const result = findPath(
          pathGrid,
          { x: player.gx, y: player.gy },
          { x: grid.x, y: grid.y },
        );
        if (result.found && result.path.length > 1) {
          player.path = result.path.slice(1);
        }
      }
    }
  }

  if (isKeyPressed("z")) {
    currentZoom = Math.min(currentZoom * 1.3, 3.0);
  }
  if (isKeyPressed("x")) {
    currentZoom = Math.max(currentZoom / 1.3, 0.5);
  }
  if (isKeyPressed("r")) {
    currentZoom = 1.0;
    player.gx = 1;
    player.gy = 1;
    const resetWorld = isoToWorld(1, 1);
    player.x = resetWorld.x;
    player.y = resetWorld.y;
    player.path = [];
    for (const coin of coins) {
      coin.collected = false;
    }
    score = 0;
  }
}

// --- Movement ---
function updatePlayer(dt: number): void {
  if (player.path.length === 0) return;

  const next = player.path[0];
  const nextWorld = isoToWorld(next.x, next.y);
  const dx = nextWorld.x - player.x;
  const dy = nextWorld.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < player.speed * dt) {
    player.x = nextWorld.x;
    player.y = nextWorld.y;
    player.gx = next.x;
    player.gy = next.y;
    player.path.shift();
  } else {
    player.x += (dx / dist) * player.speed * dt;
    player.y += (dy / dist) * player.speed * dt;
  }
}

function checkCoins(): void {
  for (const coin of coins) {
    if (coin.collected) continue;
    if (coin.gx === player.gx && coin.gy === player.gy) {
      coin.collected = true;
      score++;
    }
  }
}

// Declarative camera tracking — zoom is a getter since user can change it
trackTarget(() => ({ x: player.x, y: player.y }), { zoom: () => currentZoom, smoothness: 0.05 });

// =====================================================================
// Detailed rendering — each element composed of many small sprites
// =====================================================================

function drawIsoFloor(gx: number, gy: number): void {
  const world = isoToWorld(gx, gy);
  const layer = depthLayer(gy);
  const baseX = world.x - TILE_W / 2;
  const baseY = world.y - TILE_H / 2;
  const tex = (gx + gy) % 2 === 0 ? TEX_FLOOR_A : TEX_FLOOR_B;

  // Base fill
  drawSprite({ textureId: tex, x: baseX, y: baseY, w: TILE_W, h: TILE_H, layer });

  // Stone edge lines (left and bottom edges of diamond — darker grout)
  drawSprite({ textureId: TEX_FLOOR_EDGE, x: baseX, y: baseY, w: TILE_W, h: 1, layer: layer + 1 });
  drawSprite({ textureId: TEX_FLOOR_EDGE, x: baseX, y: baseY, w: 1, h: TILE_H, layer: layer + 1 });

  // Highlight edge (top-right — catches light)
  drawSprite({ textureId: TEX_FLOOR_HI, x: baseX + TILE_W - 1, y: baseY, w: 1, h: TILE_H, layer: layer + 1, opacity: 0.4 });
  drawSprite({ textureId: TEX_FLOOR_HI, x: baseX, y: baseY + TILE_H - 1, w: TILE_W, h: 1, layer: layer + 1, opacity: 0.4 });

  // Deterministic cracks and pebbles using tile hash
  const h1 = hashTile(gx, gy, 1);
  const h2 = hashTile(gx, gy, 2);
  const h3 = hashTile(gx, gy, 3);
  const h4 = hashTile(gx, gy, 4);

  if (h1 > 0.5) {
    // Small crack line
    const cx = baseX + 8 + h2 * 40;
    const cy = baseY + 4 + h3 * 18;
    drawSprite({ textureId: TEX_FLOOR_CRACK, x: cx, y: cy, w: 8 + h4 * 10, h: 1, layer: layer + 1, opacity: 0.5 });
  }
  if (h2 > 0.6) {
    // Pebble
    const px = baseX + 10 + h3 * 38;
    const py = baseY + 6 + h1 * 16;
    drawSprite({ textureId: TEX_FLOOR_PEBBLE, x: px, y: py, w: 3, h: 2, layer: layer + 1, opacity: 0.6 });
  }
  if (h3 > 0.7) {
    // Second pebble
    const px = baseX + 20 + h4 * 25;
    const py = baseY + 8 + h2 * 14;
    drawSprite({ textureId: TEX_FLOOR_PEBBLE, x: px, y: py, w: 2, h: 2, layer: layer + 1, opacity: 0.5 });
  }
}

function drawWall(gx: number, gy: number): void {
  const world = isoToWorld(gx, gy);
  const layer = depthLayer(gy);
  const wallH = 32;
  const frontX = world.x - TILE_W / 2;
  const frontY = world.y - wallH;
  const topX = world.x - TILE_W / 2;
  const topY = world.y - TILE_H / 2 - wallH;

  // --- Wall front face: brick pattern ---
  // Base dark fill
  drawSprite({ textureId: TEX_MORTAR, x: frontX, y: frontY, w: TILE_W, h: wallH, layer: layer + 1 });

  // Brick rows (4 rows of bricks)
  const brickH = 6;
  const mortarH = 2;
  for (let row = 0; row < 4; row++) {
    const rowY = frontY + row * (brickH + mortarH) + 1;
    const brickW = 14;
    const offset = row % 2 === 0 ? 0 : brickW / 2 + 1;

    for (let bx = 0; bx < TILE_W; bx += brickW + 2) {
      const x = frontX + bx + offset;
      const w = Math.min(brickW, frontX + TILE_W - x);
      if (w <= 0 || x >= frontX + TILE_W) continue;

      // Alternate brick colors based on position
      const h = hashTile(gx * 10 + bx, gy * 10 + row, 7);
      const brickTex = h < 0.33 ? TEX_BRICK_A : h < 0.66 ? TEX_BRICK_B : TEX_BRICK_C;
      drawSprite({ textureId: brickTex, x, y: rowY, w, h: brickH, layer: layer + 2 });

      // Brick highlight (top edge)
      if (w > 3) {
        drawSprite({ textureId: TEX_WALL_TOP_EDGE, x: x + 1, y: rowY, w: w - 2, h: 1, layer: layer + 3, opacity: 0.3 });
      }
    }
  }

  // Left edge shadow
  drawSprite({ textureId: TEX_WALL_SHADOW, x: frontX, y: frontY, w: 2, h: wallH, layer: layer + 3, opacity: 0.5 });

  // --- Wall top face ---
  drawSprite({ textureId: TEX_WALL_TOP_A, x: topX, y: topY, w: TILE_W, h: TILE_H, layer: layer + 4 });

  // Top surface detail: two-tone pattern
  drawSprite({ textureId: TEX_WALL_TOP_B, x: topX + 4, y: topY + 2, w: TILE_W - 8, h: TILE_H - 4, layer: layer + 5 });

  // Top edge highlight
  drawSprite({ textureId: TEX_WALL_TOP_EDGE, x: topX, y: topY, w: TILE_W, h: 1, layer: layer + 6, opacity: 0.5 });
  drawSprite({ textureId: TEX_WALL_TOP_EDGE, x: topX + TILE_W - 1, y: topY, w: 1, h: TILE_H, layer: layer + 6, opacity: 0.3 });
}

function drawCrate(gx: number, gy: number): void {
  const world = isoToWorld(gx, gy);
  const layer = depthLayer(gy);
  const crateH = 24;
  const inset = 8;
  const cx = world.x - TILE_W / 2 + inset;
  const cw = TILE_W - inset * 2;

  // Floor under crate
  drawIsoFloor(gx, gy);

  // --- Front face: wood planks ---
  drawSprite({ textureId: TEX_WOOD_A, x: cx, y: world.y - crateH, w: cw, h: crateH, layer: layer + 1 });

  // Horizontal plank lines
  const plankH = 5;
  for (let i = 0; i < 4; i++) {
    const py = world.y - crateH + i * (plankH + 1) + 1;
    const woodTex = i % 2 === 0 ? TEX_WOOD_A : TEX_WOOD_B;
    drawSprite({ textureId: woodTex, x: cx + 1, y: py, w: cw - 2, h: plankH, layer: layer + 2 });
    // Plank highlight
    drawSprite({ textureId: TEX_WOOD_HI, x: cx + 2, y: py, w: cw - 4, h: 1, layer: layer + 3, opacity: 0.3 });
  }

  // Vertical metal bands
  drawSprite({ textureId: TEX_METAL, x: cx + 6, y: world.y - crateH + 1, w: 2, h: crateH - 2, layer: layer + 4 });
  drawSprite({ textureId: TEX_METAL, x: cx + cw - 8, y: world.y - crateH + 1, w: 2, h: crateH - 2, layer: layer + 4 });
  // Band highlights
  drawSprite({ textureId: TEX_METAL_HI, x: cx + 6, y: world.y - crateH + 1, w: 1, h: crateH - 2, layer: layer + 5, opacity: 0.5 });
  drawSprite({ textureId: TEX_METAL_HI, x: cx + cw - 8, y: world.y - crateH + 1, w: 1, h: crateH - 2, layer: layer + 5, opacity: 0.5 });

  // Front face shadow (bottom)
  drawSprite({ textureId: TEX_WOOD_DARK, x: cx, y: world.y - 2, w: cw, h: 2, layer: layer + 3, opacity: 0.5 });

  // --- Top face ---
  const topY = world.y - TILE_H / 2 - crateH + 4;
  drawSprite({ textureId: TEX_CRATE_TOP_A, x: cx, y: topY, w: cw, h: TILE_H - 4, layer: layer + 6 });

  // Top plank lines
  for (let i = 0; i < 3; i++) {
    const lx = cx + 4 + i * 15;
    drawSprite({ textureId: TEX_CRATE_TOP_B, x: lx, y: topY + 1, w: 1, h: TILE_H - 6, layer: layer + 7, opacity: 0.4 });
  }

  // Top highlight edge
  drawSprite({ textureId: TEX_WOOD_HI, x: cx, y: topY, w: cw, h: 1, layer: layer + 7, opacity: 0.4 });

  // Cross brace on top
  const crossLen = cw - 6;
  drawSprite({ textureId: TEX_WOOD_DARK, x: cx + 3, y: topY + (TILE_H - 4) / 2 - 1, w: crossLen, h: 2, layer: layer + 8, opacity: 0.5 });
}

// --- Player sprite group ---
// All part offsets are relative to group origin (player's foot position).
// Bob animation is applied by shifting the draw Y; arm swing updates 4 parts per frame.
const playerGroup = createSpriteGroup([
  // Boots
  { name: "bootL", offsetX: -5, offsetY: -6, w: 4, h: 6, textureId: TEX_BOOTS, layerOffset: 0 },
  { name: "bootR", offsetX: 1, offsetY: -6, w: 4, h: 6, textureId: TEX_BOOTS, layerOffset: 0 },
  // Pants
  { name: "pantsL", offsetX: -5, offsetY: -14, w: 4, h: 9, textureId: TEX_PANTS, layerOffset: 0 },
  { name: "pantsR", offsetX: 1, offsetY: -14, w: 4, h: 9, textureId: TEX_PANTS, layerOffset: 0 },
  { name: "pantsHi", offsetX: -5, offsetY: -14, w: 1, h: 8, textureId: TEX_PANTS_HI, layerOffset: 1, opacity: 0.3 },
  // Belt
  { name: "belt", offsetX: -6, offsetY: -16, w: 12, h: 2, textureId: TEX_BELT, layerOffset: 1 },
  { name: "buckle", offsetX: -1, offsetY: -16, w: 2, h: 2, textureId: TEX_GOLD_A, layerOffset: 2 },
  // Torso
  { name: "torso", offsetX: -6, offsetY: -26, w: 12, h: 10, textureId: TEX_SHIRT, layerOffset: 0 },
  { name: "shirtHi", offsetX: -5, offsetY: -25, w: 4, h: 8, textureId: TEX_SHIRT_HI, layerOffset: 1, opacity: 0.5 },
  { name: "shirtDark", offsetX: 2, offsetY: -24, w: 3, h: 6, textureId: TEX_SHIRT_DARK, layerOffset: 1, opacity: 0.3 },
  // Arms (dynamic offsetY: armSwing applied per frame)
  { name: "armL", offsetX: -9, offsetY: -24, w: 3, h: 8, textureId: TEX_SHIRT, layerOffset: -1 },
  { name: "armR", offsetX: 6, offsetY: -24, w: 3, h: 8, textureId: TEX_SHIRT, layerOffset: -1 },
  // Hands (dynamic offsetY: armSwing applied per frame)
  { name: "handL", offsetX: -9, offsetY: -17, w: 3, h: 3, textureId: TEX_SKIN, layerOffset: -1 },
  { name: "handR", offsetX: 6, offsetY: -17, w: 3, h: 3, textureId: TEX_SKIN, layerOffset: -1 },
  // Neck
  { name: "neck", offsetX: -2, offsetY: -29, w: 4, h: 3, textureId: TEX_SKIN, layerOffset: 0 },
  // Head
  { name: "head", offsetX: -5, offsetY: -38, w: 10, h: 10, textureId: TEX_SKIN, layerOffset: 2 },
  // Hair
  { name: "hairTop", offsetX: -5, offsetY: -39, w: 10, h: 4, textureId: TEX_HAIR, layerOffset: 3 },
  { name: "hairSide", offsetX: -5, offsetY: -36, w: 2, h: 3, textureId: TEX_HAIR, layerOffset: 3 },
  // Eyes
  { name: "eyeL", offsetX: -3, offsetY: -34, w: 3, h: 2, textureId: TEX_EYE, layerOffset: 3 },
  { name: "eyeR", offsetX: 1, offsetY: -34, w: 3, h: 2, textureId: TEX_EYE, layerOffset: 3 },
  { name: "pupilL", offsetX: -2, offsetY: -34, w: 2, h: 2, textureId: TEX_PUPIL, layerOffset: 4 },
  { name: "pupilR", offsetX: 2, offsetY: -34, w: 2, h: 2, textureId: TEX_PUPIL, layerOffset: 4 },
], 0); // baseLayer set dynamically before draw

// Cache part references for per-frame arm swing updates
const armLPart = getSpritePart(playerGroup, "armL")!;
const armRPart = getSpritePart(playerGroup, "armR")!;
const handLPart = getSpritePart(playerGroup, "handL")!;
const handRPart = getSpritePart(playerGroup, "handR")!;

function drawPlayer(px: number, py: number, layer: number, time: number): void {
  const moving = player.path.length > 0;
  const bob = moving ? Math.sin(time * 8) * 1.5 : 0;
  const armSwing = moving ? Math.sin(time * 8) * 2 : 0;

  // Shadow (not part of group — no bob)
  drawSprite({ textureId: TEX_BLACK, x: px - 10, y: py - 2, w: 20, h: 8, layer: layer - 1, opacity: 0.35 });

  // Update dynamic arm/hand offsets
  armLPart.offsetY = -24 + armSwing;
  armRPart.offsetY = -24 - armSwing;
  handLPart.offsetY = -17 + armSwing;
  handRPart.offsetY = -17 - armSwing;

  // Set the group's base layer to match depth-sorted layer
  playerGroup.baseLayer = layer;

  // Draw group at foot position, shifted up by bob
  drawSpriteGroup(playerGroup, px, py + bob);
}

function drawCoin(cx: number, cy: number, layer: number, time: number, seed: number): void {
  const bobY = Math.sin(time * 3 + seed) * 3;
  const y = cy - 14 + bobY;
  const sparkle = Math.sin(time * 5 + seed * 2) * 0.5 + 0.5;

  // Shadow on ground
  drawSprite({ textureId: TEX_BLACK, x: cx - 5, y: cy - 2, w: 10, h: 5, layer: layer - 1, opacity: 0.25 });

  // Coin body (stacked rects to approximate circle)
  drawSprite({ textureId: TEX_GOLD_DARK, x: cx - 5, y: y + 1, w: 10, h: 10, layer }); // outer ring
  drawSprite({ textureId: TEX_GOLD_A, x: cx - 4, y: y + 2, w: 8, h: 8, layer: layer + 1 }); // face
  drawSprite({ textureId: TEX_GOLD_B, x: cx - 3, y: y, w: 6, h: 2, layer }); // top edge
  drawSprite({ textureId: TEX_GOLD_B, x: cx - 3, y: y + 10, w: 6, h: 2, layer }); // bottom edge

  // Inner detail ($ symbol approximation)
  drawSprite({ textureId: TEX_GOLD_DARK, x: cx - 2, y: y + 3, w: 4, h: 1, layer: layer + 2, opacity: 0.5 });
  drawSprite({ textureId: TEX_GOLD_DARK, x: cx - 2, y: y + 5, w: 4, h: 1, layer: layer + 2, opacity: 0.5 });
  drawSprite({ textureId: TEX_GOLD_DARK, x: cx - 2, y: y + 7, w: 4, h: 1, layer: layer + 2, opacity: 0.5 });

  // Highlight/shine
  drawSprite({ textureId: TEX_GOLD_HI, x: cx - 3, y: y + 2, w: 3, h: 3, layer: layer + 3, opacity: 0.5 });
  // Sparkle
  drawSprite({ textureId: TEX_GOLD_SHINE, x: cx - 3, y: y + 2, w: 2, h: 1, layer: layer + 4, opacity: sparkle * 0.8 });
}

// --- Main render ---

function render(): void {
  const time = Date.now() / 1000;

  // 1. Tiles
  for (let gy = 0; gy < MAP_H; gy++) {
    for (let gx = 0; gx < MAP_W; gx++) {
      const tile = mapData[gy][gx];
      if (tile === TW) {
        drawWall(gx, gy);
      } else if (tile === TC) {
        drawCrate(gx, gy);
      } else {
        drawIsoFloor(gx, gy);
      }
    }
  }

  // 2. Path preview (diamond dots)
  for (let i = 0; i < player.path.length; i++) {
    const step = player.path[i];
    const world = isoToWorld(step.x, step.y);
    const layer = depthLayer(step.y) + 3;
    const pulse = 0.3 + Math.sin(time * 4 + i * 0.5) * 0.15;
    drawSprite({ textureId: TEX_PATH_DOT, x: world.x - 4, y: world.y - 4, w: 8, h: 4, layer, opacity: pulse });
    drawSprite({ textureId: TEX_PATH_DOT, x: world.x - 2, y: world.y - 6, w: 4, h: 2, layer, opacity: pulse * 0.7 });
    drawSprite({ textureId: TEX_PATH_DOT, x: world.x - 2, y: world.y, w: 4, h: 2, layer, opacity: pulse * 0.7 });
  }

  // 3. Coins
  for (const coin of coins) {
    if (coin.collected) continue;
    const world = isoToWorld(coin.gx, coin.gy);
    const layer = depthLayer(coin.gy) + 4;
    drawCoin(world.x, world.y, layer, time, coin.gx * 1.7 + coin.gy * 2.3);
  }

  // 4. Player
  const playerIso = worldToIso(player.x, player.y);
  const playerLayer = depthLayer(playerIso.y) + 5;
  drawPlayer(player.x, player.y, playerLayer, time);

  // 5. Mouse hover highlight
  const mouseWorld = getMouseWorldPosition();
  const hoverGrid = worldToGrid(mouseWorld.x, mouseWorld.y);
  if (hoverGrid.x >= 0 && hoverGrid.x < MAP_W && hoverGrid.y >= 0 && hoverGrid.y < MAP_H) {
    const hWorld = isoToWorld(hoverGrid.x, hoverGrid.y);
    const walk = isWalkable(hoverGrid.x, hoverGrid.y);
    const tint = walk
      ? { r: 0.3, g: 1.0, b: 0.3, a: 0.2 }
      : { r: 1.0, g: 0.3, b: 0.3, a: 0.2 };

    // Diamond fill
    const hx = hWorld.x - TILE_W / 2;
    const hy = hWorld.y - TILE_H / 2;
    drawSprite({ textureId: TEX_WHITE, x: hx, y: hy, w: TILE_W, h: TILE_H, layer: 9000, tint });
    // Diamond outline using drawLine (proper diamond edges)
    const lineColor = { r: tint.r, g: tint.g, b: tint.b, a: tint.a * 2 };
    const cx = hWorld.x;
    const cy = hWorld.y;
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    drawLine(cx, cy - hh, cx + hw, cy, { color: lineColor, layer: 9001 }); // top -> right
    drawLine(cx + hw, cy, cx, cy + hh, { color: lineColor, layer: 9001 }); // right -> bottom
    drawLine(cx, cy + hh, cx - hw, cy, { color: lineColor, layer: 9001 }); // bottom -> left
    drawLine(cx - hw, cy, cx, cy - hh, { color: lineColor, layer: 9001 }); // left -> top
  }

  // 6. HUD
  const cam = getCamera();
  const scale = 1 / cam.zoom;
  const hudX = cam.x;
  const hudY = cam.y;

  // HUD background with border
  const bgX = hudX + 6 * scale;
  const bgY = hudY + 6 * scale;
  const bgW = 270 * scale;
  const bgH = 52 * scale;
  drawSprite({ textureId: TEX_BLACK, x: bgX - 1 * scale, y: bgY - 1 * scale, w: bgW + 2 * scale, h: bgH + 2 * scale, layer: 9499, opacity: 0.6 });
  drawSprite({ textureId: TEX_HUD_BG, x: bgX, y: bgY, w: bgW, h: bgH, layer: 9500, opacity: 0.85 });
  // Subtle top highlight
  drawSprite({ textureId: TEX_WHITE, x: bgX, y: bgY, w: bgW, h: 1 * scale, layer: 9501, opacity: 0.1 });

  const totalCoins = coins.length;
  const allCollected = score === totalCoins;

  drawText(
    allCollected ? `All ${totalCoins} coins collected!` : `Coins: ${score} / ${totalCoins}`,
    hudX + 12 * scale,
    hudY + 12 * scale,
    {
      scale,
      layer: 9600,
      color: allCollected
        ? { r: 1, g: 0.9, b: 0.2, a: 1 }
        : { r: 1, g: 1, b: 1, a: 1 },
    },
  );

  drawText("Click=Move  Z/X=Zoom  R=Reset", hudX + 12 * scale, hudY + 28 * scale, {
    scale: scale * 0.8,
    layer: 9600,
    color: { r: 0.6, g: 0.6, b: 0.6, a: 1 },
  });
}

// --- Game bootstrap ---
const game = createGame({
  name: "isometric-dungeon",
  background: { r: 15 / 255, g: 10 / 255, b: 26 / 255 },
});

game.state({
  get: () => ({
    player: { gx: player.gx, gy: player.gy, x: player.x, y: player.y },
    score,
    totalCoins: coins.length,
    camera: getCamera(),
    zoom: currentZoom,
  }),
  set: () => {},
});

game.onFrame((ctx) => {
  updateTweens(ctx.dt);
  handleInput();
  updatePlayer(ctx.dt);
  checkCoins();
  render();
});
