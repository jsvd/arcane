/**
 * WFC Dungeon Demo — Phase 18: Procedural Generation
 *
 * Demonstrates Wave Function Collapse procedural dungeon generation:
 * - Tileset: walls, floors, doors, decorations (solid color textures)
 * - Reachability constraint (all walkable tiles connected)
 * - Exactly one entrance and one exit
 * - Border constraint (walls on all edges)
 * - Regenerate on R keypress
 * - Visualize as tilemap grid
 * - Show constraint satisfaction status
 *
 * Controls:
 * - R: Regenerate dungeon
 * - Arrow keys: Pan camera
 * - Z/X: Zoom in/out
 */

import {
  onFrame,
  clearSprites,
  drawSprite,
  setCamera,
  getCamera,
  isKeyDown,
  isKeyPressed,
  getDeltaTime,
  createSolidTexture,
  getViewportSize,
  drawText,
} from "../../runtime/rendering/index.ts";
import {
  generate,
  reachability,
  exactCount,
  border,
  countTile,
  findTile,
} from "../../runtime/procgen/index.ts";
import type { TileSet, WFCGrid, WFCResult } from "../../runtime/procgen/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";

// ---------------------------------------------------------------------------
// Tile IDs
// ---------------------------------------------------------------------------

const WALL = 0;
const FLOOR = 1;
const ENTRANCE = 2;
const EXIT = 3;
const DECORATION = 4;

// ---------------------------------------------------------------------------
// Tileset definition
// ---------------------------------------------------------------------------

// Walls can neighbor anything. Floors can neighbor anything.
// Entrance/exit/decoration act like floor for adjacency.
const allTiles = [WALL, FLOOR, ENTRANCE, EXIT, DECORATION];

const tileset: TileSet = {
  tiles: {
    [WALL]: { north: allTiles, east: allTiles, south: allTiles, west: allTiles },
    [FLOOR]: { north: allTiles, east: allTiles, south: allTiles, west: allTiles },
    [ENTRANCE]: { north: allTiles, east: allTiles, south: allTiles, west: allTiles },
    [EXIT]: { north: allTiles, east: allTiles, south: allTiles, west: allTiles },
    [DECORATION]: { north: allTiles, east: allTiles, south: allTiles, west: allTiles },
  },
  weights: {
    [WALL]: 4,
    [FLOOR]: 8,
    [ENTRANCE]: 1,
    [EXIT]: 1,
    [DECORATION]: 2,
  },
};

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

const constraints = [
  border(WALL),
  exactCount(ENTRANCE, 1),
  exactCount(EXIT, 1),
  reachability((id) => id !== WALL),
];

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
    constraints,
    maxRetries: 500,
    maxBacktracks: 5000,
  });
  currentResult = result;

  if (result.success && result.grid) {
    const entrances = findTile(result.grid, ENTRANCE);
    const exits = findTile(result.grid, EXIT);
    const floorCount = countTile(result.grid, FLOOR);
    statusText =
      `Seed: ${currentSeed} | ` +
      `${result.elapsed}ms | ` +
      `Retries: ${result.retries} | ` +
      `Floors: ${floorCount} | ` +
      `Entrance: (${entrances[0]?.x},${entrances[0]?.y}) | ` +
      `Exit: (${exits[0]?.x},${exits[0]?.y})`;
  } else {
    statusText = `Generation FAILED (seed ${currentSeed}, ${result.retries} retries, ${result.elapsed}ms)`;
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
  texWall = createSolidTexture(40, 40, 50, 255);       // dark gray
  texFloor = createSolidTexture(180, 170, 140, 255);    // tan
  texEntrance = createSolidTexture(80, 200, 80, 255);   // green
  texExit = createSolidTexture(200, 80, 80, 255);       // red
  texDecoration = createSolidTexture(100, 80, 160, 255); // purple
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

onFrame(() => {
  if (!initialized) {
    initTextures();
    generateDungeon();
    const { width: vpw, height: vph } = getViewportSize();
    setCamera(vpw / 2, vph / 2);
    initialized = true;
  }

  const dt = getDeltaTime();
  clearSprites();

  // Input: regenerate
  if (isKeyPressed("KeyR")) {
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
  if (isKeyDown("KeyZ")) zoom = Math.min(zoom + dt, 3);
  if (isKeyDown("KeyX")) zoom = Math.max(zoom - dt, 0.5);
  setCamera(camX, camY, zoom);

  // Draw dungeon grid
  if (currentResult?.grid) {
    const grid = currentResult.grid;
    const { width: vpw, height: vph } = getViewportSize();
    const offsetX = (vpw - GRID_W * TILE_SIZE) / 2;
    const offsetY = (vph - GRID_H * TILE_SIZE) / 2 + 20;

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tileId = grid.tiles[y][x];
        drawSprite(
          tileTexture(tileId),
          offsetX + x * TILE_SIZE + TILE_SIZE / 2,
          offsetY + y * TILE_SIZE + TILE_SIZE / 2,
          { layer: 0, scaleX: TILE_SIZE, scaleY: TILE_SIZE },
        );
      }
    }
  }

  // Draw status text
  drawText(statusText, 10, 10, { layer: 100 });
  drawText("R: Regenerate | Arrows: Pan | Z/X: Zoom", 10, 26, { layer: 100 });

  // Draw legend
  const { width: vpw } = getViewportSize();
  const legendX = vpw - 160;
  drawText("Legend:", legendX, 10, { layer: 100 });
  drawSprite(texWall, legendX + 8, 30, { layer: 100, scaleX: 12, scaleY: 12 });
  drawText("Wall", legendX + 20, 26, { layer: 100 });
  drawSprite(texFloor, legendX + 8, 46, { layer: 100, scaleX: 12, scaleY: 12 });
  drawText("Floor", legendX + 20, 42, { layer: 100 });
  drawSprite(texEntrance, legendX + 8, 62, { layer: 100, scaleX: 12, scaleY: 12 });
  drawText("Entrance", legendX + 20, 58, { layer: 100 });
  drawSprite(texExit, legendX + 8, 78, { layer: 100, scaleX: 12, scaleY: 12 });
  drawText("Exit", legendX + 20, 74, { layer: 100 });
  drawSprite(texDecoration, legendX + 8, 94, { layer: 100, scaleX: 12, scaleY: 12 });
  drawText("Decor", legendX + 20, 90, { layer: 100 });
});

// ---------------------------------------------------------------------------
// Agent protocol
// ---------------------------------------------------------------------------

registerAgent({
  name: "wfc-dungeon",
  version: "1.0.0",
  actions: {
    regenerate: {
      description: "Generate a new dungeon with the next seed",
      execute: () => {
        currentSeed++;
        generateDungeon();
        return `Generated dungeon with seed ${currentSeed}`;
      },
    },
  },
  describe: () => ({
    scene: "WFC Dungeon Generator",
    status: currentResult?.success ? "success" : "failed",
    seed: currentSeed,
    grid: currentResult?.grid
      ? `${currentResult.grid.width}x${currentResult.grid.height}`
      : "none",
  }),
});
