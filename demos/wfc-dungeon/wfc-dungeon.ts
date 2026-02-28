/**
 * WFC Dungeon Demo — Phase 18: Procedural Generation
 *
 * Demonstrates Wave Function Collapse procedural dungeon generation:
 * - WFC generates wall/floor layout with adjacency rules
 * - Post-processing places entrance, exit, decorations on floor tiles
 * - Reachability constraint ensures all walkable tiles are connected
 * - Border constraint forces walls on all edges
 * - Regenerate on R keypress
 *
 * Controls:
 * - R: Regenerate dungeon
 * - Arrow keys: Pan camera
 * - Z/X: Zoom in/out
 */

import {
  drawSprite,
  setCamera,
  getCamera,
  isKeyDown,
  isKeyPressed,
  createSolidTexture,
} from "../../runtime/rendering/index.ts";
import {
  generate,
  countTile,
} from "../../runtime/procgen/index.ts";
import type { TileSet, WFCGrid, WFCResult } from "../../runtime/procgen/index.ts";
import { createRng } from "../../runtime/state/rng.ts";
import { createGame, hud } from "../../runtime/game/index.ts";
import { rgb } from "../../runtime/ui/index.ts";

// ---------------------------------------------------------------------------
// Tile IDs (for display — WFC only uses WALL=0, FLOOR=1)
// ---------------------------------------------------------------------------

const WALL = 0;
const FLOOR = 1;
const ENTRANCE = 2;
const EXIT = 3;
const DECORATION = 4;

// ---------------------------------------------------------------------------
// Tileset definition — WFC only places walls and floors
// ---------------------------------------------------------------------------

// Floors prefer to cluster: floors neighbor floors or walls.
// Walls can neighbor anything.
const tileset: TileSet = {
  tiles: {
    [WALL]: { north: [WALL, FLOOR], east: [WALL, FLOOR], south: [WALL, FLOOR], west: [WALL, FLOOR] },
    [FLOOR]: { north: [WALL, FLOOR], east: [WALL, FLOOR], south: [WALL, FLOOR], west: [WALL, FLOOR] },
  },
  weights: {
    [WALL]: 3,
    [FLOOR]: 5,
  },
};

// ---------------------------------------------------------------------------
// Post-processing: enforce border, keep largest region, place features
// ---------------------------------------------------------------------------

function postProcess(grid: WFCGrid, placementSeed: number): WFCGrid {
  const { width: w, height: h, tiles } = grid;

  // 1. Force border to walls
  for (let x = 0; x < w; x++) {
    tiles[0][x] = WALL;
    tiles[h - 1][x] = WALL;
  }
  for (let y = 0; y < h; y++) {
    tiles[y][0] = WALL;
    tiles[y][w - 1] = WALL;
  }

  // 2. Flood-fill to find connected floor regions, keep only the largest
  const visited = Array.from({ length: h }, () => new Array(w).fill(false));
  const regions: { x: number; y: number }[][] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] === FLOOR && !visited[y][x]) {
        const region: { x: number; y: number }[] = [];
        const stack = [{ x, y }];
        while (stack.length > 0) {
          const p = stack.pop()!;
          if (p.x < 0 || p.x >= w || p.y < 0 || p.y >= h) continue;
          if (visited[p.y][p.x] || tiles[p.y][p.x] !== FLOOR) continue;
          visited[p.y][p.x] = true;
          region.push(p);
          stack.push({ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y });
          stack.push({ x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 });
        }
        regions.push(region);
      }
    }
  }

  // Keep only the largest region, fill smaller ones with walls
  if (regions.length > 1) {
    regions.sort((a, b) => b.length - a.length);
    for (let i = 1; i < regions.length; i++) {
      for (const p of regions[i]) {
        tiles[p.y][p.x] = WALL;
      }
    }
  }

  const floors = regions.length > 0 ? [...regions[0]] : [];
  if (floors.length < 3) return grid;

  // 3. Place entrance, exit, decorations using seeded PRNG
  const rng = createRng(placementSeed);

  // Entrance — random floor tile
  let idx = rng.int(0, floors.length - 1);
  const entrance = floors[idx];
  tiles[entrance.y][entrance.x] = ENTRANCE;
  floors.splice(idx, 1);

  // Exit — far from entrance
  floors.sort((a, b) => {
    const da = Math.abs(a.x - entrance.x) + Math.abs(a.y - entrance.y);
    const db = Math.abs(b.x - entrance.x) + Math.abs(b.y - entrance.y);
    return db - da;
  });
  const farPool = Math.max(1, Math.floor(floors.length * 0.2));
  idx = rng.int(0, farPool - 1);
  const exit = floors[idx];
  tiles[exit.y][exit.x] = EXIT;
  floors.splice(idx, 1);

  // Decorations — 10% of remaining floors
  const decoCount = Math.max(1, Math.floor(floors.length * 0.1));
  for (let i = 0; i < decoCount && floors.length > 0; i++) {
    idx = rng.int(0, floors.length - 1);
    const deco = floors[idx];
    tiles[deco.y][deco.x] = DECORATION;
    floors.splice(idx, 1);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Generation state
// ---------------------------------------------------------------------------

const GRID_W = 20;
const GRID_H = 15;
const TILE_SIZE = 24;

let currentSeed = 42;
let currentResult: WFCResult | null = null;
let statusText = "Press R to generate";

function generateDungeon(): void {
  statusText = "Generating...";
  const result = generate({
    tileset,
    width: GRID_W,
    height: GRID_H,
    seed: currentSeed,
  });

  if (result.success && result.grid) {
    // Post-process: place entrance, exit, decorations
    postProcess(result.grid, currentSeed * 7 + 13);
    currentResult = result;
    const floorCount = countTile(result.grid, FLOOR);
    statusText =
      `Seed: ${currentSeed} | ` +
      `${result.elapsed}ms | ` +
      `Retries: ${result.retries} | ` +
      `Floors: ${floorCount}`;
  } else {
    currentResult = result;
    statusText = `FAILED (seed ${currentSeed}, ${result.retries} retries, ${result.elapsed}ms)`;
  }
}

// ---------------------------------------------------------------------------
// Tile colors (solid color textures)
// ---------------------------------------------------------------------------

let texWall = 0;
let texFloor = 0;
let texEntrance = 0;
let texExit = 0;
let texDecoration = 0;

function initTextures(): void {
  texWall = createSolidTexture("wall", rgb(40, 40, 50));
  texFloor = createSolidTexture("floor", rgb(180, 170, 140));
  texEntrance = createSolidTexture("entrance", rgb(80, 200, 80));
  texExit = createSolidTexture("exit", rgb(200, 80, 80));
  texDecoration = createSolidTexture("decoration", rgb(100, 80, 160));
}

function tileTexture(tileId: number): number {
  switch (tileId) {
    case WALL: return texWall;
    case FLOOR: return texFloor;
    case ENTRANCE: return texEntrance;
    case EXIT: return texExit;
    case DECORATION: return texDecoration;
    default: return texWall;
  }
}

// ---------------------------------------------------------------------------
// Frame loop
// ---------------------------------------------------------------------------

let initialized = false;

const game = createGame({ name: "wfc-dungeon" });

game.state({
  get: () => ({
    seed: currentSeed,
    success: currentResult?.success ?? false,
    grid: currentResult?.grid
      ? { width: currentResult.grid.width, height: currentResult.grid.height }
      : null,
  }),
  set: () => {},
  actions: {
    regenerate: {
      description: "Generate a new dungeon with the next seed",
      handler: (s: any) => {
        currentSeed++;
        generateDungeon();
        return s;
      },
    },
  },
  describe: () => {
    const status = currentResult?.success ? "success" : "failed";
    const grid = currentResult?.grid
      ? `${currentResult.grid.width}x${currentResult.grid.height}`
      : "none";
    return `WFC Dungeon Generator | ${status} | seed=${currentSeed} | grid=${grid}`;
  },
});

game.onFrame((ctx) => {
  if (!initialized) {
    initTextures();
    generateDungeon();
    initialized = true;
  }

  const dt = ctx.dt;
  const { vpW, vpH } = ctx;

  // Input: regenerate
  if (isKeyPressed("r")) {
    currentSeed++;
    generateDungeon();
  }

  // Input: camera pan
  const cam = getCamera();
  const panSpeed = 200 * dt;
  let camX = cam.x;
  let camY = cam.y;
  if (isKeyDown("ArrowLeft")) camX -= panSpeed;
  if (isKeyDown("ArrowRight")) camX += panSpeed;
  if (isKeyDown("ArrowUp")) camY -= panSpeed;
  if (isKeyDown("ArrowDown")) camY += panSpeed;

  // Input: zoom
  let zoom = cam.zoom;
  if (isKeyDown("z")) zoom = Math.min(zoom + dt, 3);
  if (isKeyDown("x")) zoom = Math.max(zoom - dt, 0.5);
  setCamera(camX, camY, zoom);

  // Draw dungeon grid
  if (currentResult?.grid) {
    const grid = currentResult.grid;
    const offsetX = (vpW - GRID_W * TILE_SIZE) / 2;
    const offsetY = (vpH - GRID_H * TILE_SIZE) / 2 + 20;

    for (let gy = 0; gy < grid.height; gy++) {
      for (let gx = 0; gx < grid.width; gx++) {
        const tileId = grid.tiles[gy][gx];
        drawSprite({
          textureId: tileTexture(tileId),
          x: offsetX + gx * TILE_SIZE,
          y: offsetY + gy * TILE_SIZE,
          w: TILE_SIZE,
          h: TILE_SIZE,
          layer: 0,
        });
      }
    }
  }

  // Draw status text
  hud.text(statusText, 10, 10);
  hud.text("R: Regenerate | Arrows: Pan | Z/X: Zoom", 10, 26);

  // Draw legend
  const legendX = vpW - 160;
  hud.text("Legend:", legendX, 10);
  drawSprite({ textureId: texWall, x: legendX, y: 26, w: 12, h: 12, layer: 100 });
  hud.text("Wall", legendX + 16, 26);
  drawSprite({ textureId: texFloor, x: legendX, y: 42, w: 12, h: 12, layer: 100 });
  hud.text("Floor", legendX + 16, 42);
  drawSprite({ textureId: texEntrance, x: legendX, y: 58, w: 12, h: 12, layer: 100 });
  hud.text("Entrance", legendX + 16, 58);
  drawSprite({ textureId: texExit, x: legendX, y: 74, w: 12, h: 12, layer: 100 });
  hud.text("Exit", legendX + 16, 74);
  drawSprite({ textureId: texDecoration, x: legendX, y: 90, w: 12, h: 12, layer: 100 });
  hud.text("Decor", legendX + 16, 90);
});
