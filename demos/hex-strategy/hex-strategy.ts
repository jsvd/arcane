/**
 * Hex Strategy — Phase 24 Demo
 *
 * Hex grid with terrain types, unit selection, movement range highlight,
 * and click-to-move hex pathfinding.
 *
 * Controls:
 * - Click: Select unit / move selected unit
 * - Z/X: Zoom in/out
 * - R: Reset game
 */

import {
  drawSprite,
  setCamera,
  getCamera,
  isKeyPressed,
  createSolidTexture,
  getViewportSize,
  drawText,
  followTargetSmooth,
  getMouseWorldPosition,
  hex,
  hexEqual,
  hexToWorld,
  worldToHex,
  hexDistance,
  hexNeighbors,
  hexLineDraw,
  hexVertices,
} from "../../runtime/rendering/index.ts";
import { findHexPath, hexReachable, reachableToArray } from "../../runtime/pathfinding/index.ts";
import type { HexCoord, HexConfig } from "../../runtime/rendering/index.ts";
import type { HexPathGrid } from "../../runtime/pathfinding/index.ts";
import { updateTweens } from "../../runtime/tweening/index.ts";
import { createGame } from "../../runtime/game/index.ts";
import { rgb, drawPolygon } from "../../runtime/ui/index.ts";

// --- Hex config ---
const HEX_SIZE = 32;
const CONFIG: HexConfig = { hexSize: HEX_SIZE, orientation: "pointy" };
const MAP_RADIUS = 6; // hex map radius (creates ~127 tiles)

// --- Colors ---
const COL_GRASS = rgb(90, 160, 70);
const COL_GRASS_DARK = rgb(70, 130, 55);
const COL_FOREST = rgb(40, 100, 35);
const COL_FOREST_TREE = rgb(30, 80, 25);
const COL_MOUNTAIN = rgb(140, 130, 120);
const COL_MOUNTAIN_PEAK = rgb(200, 195, 190);
const COL_WATER = rgb(50, 100, 200);
const COL_WATER_SHINE = rgb(80, 140, 230);
const COL_SAND = rgb(220, 200, 150);

// --- Textures ---
const TEX_FOREST_TREE = createSolidTexture("forest_tree", COL_FOREST_TREE);
const TEX_MOUNTAIN_PEAK = createSolidTexture("mountain_peak", COL_MOUNTAIN_PEAK);
const TEX_WATER_SHINE = createSolidTexture("water_shine", COL_WATER_SHINE);

// Unit textures
const TEX_UNIT_BODY = createSolidTexture("unit_body", rgb(50, 120, 220));
const TEX_UNIT_HEAD = createSolidTexture("unit_head", rgb(230, 190, 150));
const TEX_UNIT_ENEMY = createSolidTexture("unit_enemy", rgb(200, 50, 50));
const TEX_UNIT_ENEMY_HEAD = createSolidTexture("unit_enemy_head", rgb(180, 140, 110));

// UI textures
const TEX_PATH_DOT = createSolidTexture("path_dot", rgb(255, 255, 100));
const TEX_SELECT = createSolidTexture("select", rgb(255, 220, 50));
const TEX_HUD_BG = createSolidTexture("hud_bg", rgb(20, 15, 30));
const TEX_WHITE = createSolidTexture("white", rgb(255, 255, 255));
const TEX_BLACK = createSolidTexture("black", rgb(0, 0, 0));

// --- Terrain types ---
type TerrainType = "grass" | "forest" | "mountain" | "water" | "sand";

const TERRAIN_COST: Record<TerrainType, number> = {
  grass: 1,
  forest: 2,
  mountain: 3,
  water: Infinity,
  sand: 1,
};

// --- Seeded hash for terrain generation ---
function hashHex(q: number, r: number, seed: number): number {
  let h = (q * 374761 + r * 668265 + seed * 982451) | 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return (h & 0x7fffffff) / 0x7fffffff;
}

// --- Map generation ---
const terrain = new Map<string, TerrainType>();

function hexKey(q: number, r: number): string { return `${q},${r}`; }

function generateMap(): void {
  terrain.clear();
  for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
    const rMin = Math.max(-MAP_RADIUS, -q - MAP_RADIUS);
    const rMax = Math.min(MAP_RADIUS, -q + MAP_RADIUS);
    for (let r = rMin; r <= rMax; r++) {
      const dist = hexDistance(hex(0, 0), hex(q, r));
      const h = hashHex(q, r, 42);

      let t: TerrainType;
      if (dist >= MAP_RADIUS && h < 0.5) {
        t = "water";
      } else if (h < 0.15) {
        t = "water";
      } else if (h < 0.30) {
        t = "mountain";
      } else if (h < 0.50) {
        t = "forest";
      } else if (h < 0.60) {
        t = "sand";
      } else {
        t = "grass";
      }
      terrain.set(hexKey(q, r), t);
    }
  }
  // Ensure start positions are grass
  terrain.set(hexKey(0, 0), "grass");
  terrain.set(hexKey(2, -1), "grass");
  terrain.set(hexKey(-2, 1), "grass");
  terrain.set(hexKey(1, 1), "grass");
  // Ensure enemy positions are walkable
  terrain.set(hexKey(-3, 0), "grass");
  terrain.set(hexKey(3, -3), "grass");
}

generateMap();

// --- Units ---
interface Unit {
  q: number;
  r: number;
  worldX: number;
  worldY: number;
  movement: number;
  team: "player" | "enemy";
  moved: boolean;
}

const units: Unit[] = [
  { q: 0, r: 0, worldX: 0, worldY: 0, movement: 3, team: "player", moved: false },
  { q: 2, r: -1, worldX: 0, worldY: 0, movement: 4, team: "player", moved: false },
  { q: -3, r: 0, worldX: 0, worldY: 0, movement: 2, team: "enemy", moved: false },
  { q: 3, r: -3, worldX: 0, worldY: 0, movement: 3, team: "enemy", moved: false },
];

// Initialize world positions
for (const u of units) {
  const w = hexToWorld(hex(u.q, u.r), CONFIG);
  u.worldX = w.x;
  u.worldY = w.y;
}

// --- Game state ---
let selectedUnit: Unit | null = null;
let reachableCells = new Map<string, number>();
let currentPath: HexCoord[] = [];
let currentZoom = 1.0;
let turn = 1;

// --- Pathfinding grid ---
function getGrid(): HexPathGrid {
  return {
    isWalkable: (q, r) => {
      const t = terrain.get(hexKey(q, r));
      if (!t) return false;
      if (t === "water" || t === "mountain") return false;
      // Check for units occupying the cell
      for (const u of units) {
        if (u.q === q && u.r === r) return false;
      }
      return true;
    },
    cost: (q, r) => {
      const t = terrain.get(hexKey(q, r));
      return t ? TERRAIN_COST[t] : 1;
    },
  };
}

// --- Camera ---
setCamera(0, 0, 1.0);

// --- Input ---
function handleInput(): void {
  if (isKeyPressed("z")) currentZoom = Math.min(currentZoom * 1.3, 3.0);
  if (isKeyPressed("x")) currentZoom = Math.max(currentZoom / 1.3, 0.4);
  if (isKeyPressed("r")) resetGame();

  if (isKeyPressed("MouseLeft")) {
    const mouseWorld = getMouseWorldPosition();
    const clickedHex = worldToHex(mouseWorld.x, mouseWorld.y, CONFIG);

    // Check if we clicked a player unit
    const clickedUnit = units.find(
      (u) => u.q === clickedHex.q && u.r === clickedHex.r && u.team === "player" && !u.moved,
    );

    if (clickedUnit) {
      // Select this unit
      selectedUnit = clickedUnit;
      const grid = getGrid();
      // For reachability, make the selected unit's cell walkable
      const originalWalkable = grid.isWalkable;
      grid.isWalkable = (q, r) => {
        if (q === clickedUnit.q && r === clickedUnit.r) return true;
        return originalWalkable(q, r);
      };
      reachableCells = hexReachable(grid, hex(clickedUnit.q, clickedUnit.r), clickedUnit.movement);
      currentPath = [];
    } else if (selectedUnit && reachableCells.has(hexKey(clickedHex.q, clickedHex.r))) {
      // Move selected unit to clicked hex
      if (clickedHex.q !== selectedUnit.q || clickedHex.r !== selectedUnit.r) {
        // Check no other unit is there
        const occupied = units.some(
          (u) => u.q === clickedHex.q && u.r === clickedHex.r,
        );
        if (!occupied) {
          selectedUnit.q = clickedHex.q;
          selectedUnit.r = clickedHex.r;
          const w = hexToWorld(clickedHex, CONFIG);
          selectedUnit.worldX = w.x;
          selectedUnit.worldY = w.y;
          selectedUnit.moved = true;
        }
      }
      selectedUnit = null;
      reachableCells.clear();
      currentPath = [];

      // Check if all player units have moved
      if (units.filter((u) => u.team === "player").every((u) => u.moved)) {
        endTurn();
      }
    } else {
      // Deselect
      selectedUnit = null;
      reachableCells.clear();
      currentPath = [];
    }
  }
}

function endTurn(): void {
  turn++;
  for (const u of units) {
    u.moved = false;
  }
}

function resetGame(): void {
  turn = 1;
  currentZoom = 1.0;
  selectedUnit = null;
  reachableCells.clear();
  currentPath = [];

  units[0].q = 0; units[0].r = 0;
  units[1].q = 2; units[1].r = -1;
  units[2].q = -3; units[2].r = 0;
  units[3].q = 3; units[3].r = -3;

  for (const u of units) {
    const w = hexToWorld(hex(u.q, u.r), CONFIG);
    u.worldX = w.x;
    u.worldY = w.y;
    u.moved = false;
  }
}

// --- Rendering ---

function drawHexCell(q: number, r: number, t: TerrainType): void {
  const world = hexToWorld(hex(q, r), CONFIG);
  const verts = hexVertices(world.x, world.y, HEX_SIZE, CONFIG.orientation);
  const layer = 0;

  // Base terrain hexagon
  switch (t) {
    case "grass": {
      const col = ((q + r) % 2 === 0) ? COL_GRASS : COL_GRASS_DARK;
      drawPolygon(verts, { color: col, layer });
      break;
    }
    case "forest": {
      drawPolygon(verts, { color: COL_FOREST, layer });
      // Tree sprites
      const h = hashHex(q, r, 100);
      const treeX = world.x - 6 + h * 4;
      const treeY = world.y - 12;
      drawSprite({ textureId: TEX_FOREST_TREE, x: treeX - 4, y: treeY, w: 8, h: 12, layer: 2 });
      drawSprite({ textureId: TEX_FOREST_TREE, x: treeX + 4, y: treeY + 3, w: 6, h: 10, layer: 2 });
      break;
    }
    case "mountain": {
      drawPolygon(verts, { color: COL_MOUNTAIN, layer });
      // Peak
      drawSprite({ textureId: TEX_MOUNTAIN_PEAK, x: world.x - 8, y: world.y - 16, w: 16, h: 10, layer: 2 });
      break;
    }
    case "water": {
      drawPolygon(verts, { color: COL_WATER, layer });
      // Shine
      const shine = Math.sin(Date.now() / 800 + q * 0.5 + r * 0.3) * 0.3 + 0.3;
      drawSprite({ textureId: TEX_WATER_SHINE, x: world.x - 8, y: world.y - 4, w: 16, h: 6, layer: 1, opacity: shine });
      break;
    }
    case "sand": {
      drawPolygon(verts, { color: COL_SAND, layer });
      break;
    }
  }
}

function drawUnit(u: Unit): void {
  const layer = 100;
  const isSelected = selectedUnit === u;
  const bodyTex = u.team === "player" ? TEX_UNIT_BODY : TEX_UNIT_ENEMY;
  const headTex = u.team === "player" ? TEX_UNIT_HEAD : TEX_UNIT_ENEMY_HEAD;

  // Selection indicator
  if (isSelected) {
    drawSprite({ textureId: TEX_SELECT, x: u.worldX - 12, y: u.worldY - 2, w: 24, h: 8, layer: layer - 2, opacity: 0.6 });
  }

  // Shadow
  drawSprite({ textureId: TEX_BLACK, x: u.worldX - 8, y: u.worldY - 2, w: 16, h: 6, layer: layer - 1, opacity: 0.3 });

  // Body
  drawSprite({ textureId: bodyTex, x: u.worldX - 6, y: u.worldY - 20, w: 12, h: 18, layer });

  // Head
  drawSprite({ textureId: headTex, x: u.worldX - 5, y: u.worldY - 28, w: 10, h: 10, layer: layer + 1 });

  // Moved indicator (dimmed)
  if (u.moved && u.team === "player") {
    drawSprite({ textureId: TEX_BLACK, x: u.worldX - 8, y: u.worldY - 30, w: 16, h: 30, layer: layer + 2, opacity: 0.4 });
  }
}

function drawReachableHighlight(): void {
  for (const [key, remaining] of reachableCells) {
    const [q, r] = key.split(",").map(Number);
    if (selectedUnit && q === selectedUnit.q && r === selectedUnit.r) continue;
    const world = hexToWorld(hex(q, r), CONFIG);
    const verts = hexVertices(world.x, world.y, HEX_SIZE, CONFIG.orientation);
    const opacity = 0.15 + (remaining / (selectedUnit?.movement ?? 1)) * 0.15;
    const col = rgb(80, 220, 120);
    col.a = opacity;
    drawPolygon(verts, { color: col, layer: 50 });
  }
}

function drawPathPreview(): void {
  if (!selectedUnit) return;
  const mouseWorld = getMouseWorldPosition();
  const hoverHex = worldToHex(mouseWorld.x, mouseWorld.y, CONFIG);
  const hoverKey = hexKey(hoverHex.q, hoverHex.r);

  if (reachableCells.has(hoverKey) && !hexEqual(hoverHex, hex(selectedUnit.q, selectedUnit.r))) {
    // Draw path preview using hexLineDraw for a quick line
    const grid = getGrid();
    const originalWalkable = grid.isWalkable;
    grid.isWalkable = (q, r) => {
      if (q === selectedUnit!.q && r === selectedUnit!.r) return true;
      return originalWalkable(q, r);
    };
    const result = findHexPath(grid, hex(selectedUnit.q, selectedUnit.r), hoverHex);
    if (result.found) {
      for (let i = 1; i < result.path.length; i++) {
        const world = hexToWorld(result.path[i], CONFIG);
        const pulse = 0.5 + Math.sin(Date.now() / 200 + i) * 0.2;
        drawSprite({
          textureId: TEX_PATH_DOT,
          x: world.x - 4,
          y: world.y - 4,
          w: 8,
          h: 8,
          layer: 60,
          opacity: pulse,
        });
      }
    }
  }
}

function drawHoverHighlight(): void {
  const mouseWorld = getMouseWorldPosition();
  const hoverHex = worldToHex(mouseWorld.x, mouseWorld.y, CONFIG);
  if (terrain.has(hexKey(hoverHex.q, hoverHex.r))) {
    const world = hexToWorld(hoverHex, CONFIG);
    const verts = hexVertices(world.x, world.y, HEX_SIZE, CONFIG.orientation);
    const col = rgb(100, 200, 255);
    col.a = 0.15;
    drawPolygon(verts, { color: col, layer: 40 });
  }
}

function drawHUD(): void {
  const cam = getCamera();
  const vp = getViewportSize();
  const scale = 1 / cam.zoom;
  const hudX = cam.x;
  const hudY = cam.y;

  // HUD background
  const bgW = 280 * scale;
  const bgH = 52 * scale;
  drawSprite({ textureId: TEX_BLACK, x: hudX + 5 * scale, y: hudY + 5 * scale, w: bgW + 2 * scale, h: bgH + 2 * scale, layer: 9499, opacity: 0.6 });
  drawSprite({ textureId: TEX_HUD_BG, x: hudX + 6 * scale, y: hudY + 6 * scale, w: bgW, h: bgH, layer: 9500, opacity: 0.85 });

  const playerUnits = units.filter((u) => u.team === "player");
  const unmoved = playerUnits.filter((u) => !u.moved).length;
  const statusText = selectedUnit
    ? `Selected: Unit (mv=${selectedUnit.movement})`
    : `Turn ${turn} | ${unmoved}/${playerUnits.length} units ready`;

  drawText(statusText, hudX + 12 * scale, hudY + 12 * scale, {
    scale,
    layer: 9600,
    color: { r: 1, g: 1, b: 1, a: 1 },
  });

  // Terrain info
  const mouseWorld = getMouseWorldPosition();
  const hoverHex = worldToHex(mouseWorld.x, mouseWorld.y, CONFIG);
  const t = terrain.get(hexKey(hoverHex.q, hoverHex.r));
  const terrainText = t ? `Hex(${hoverHex.q},${hoverHex.r}) ${t} cost=${TERRAIN_COST[t]}` : "";

  drawText(terrainText, hudX + 12 * scale, hudY + 28 * scale, {
    scale: scale * 0.8,
    layer: 9600,
    color: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
  });
}

function render(): void {
  // Draw terrain
  for (const [key, t] of terrain) {
    const [q, r] = key.split(",").map(Number);
    drawHexCell(q, r, t);
  }

  // Draw reachable highlight
  if (selectedUnit) {
    drawReachableHighlight();
    drawPathPreview();
  }

  // Hover highlight
  drawHoverHighlight();

  // Draw units
  for (const u of units) {
    drawUnit(u);
  }

  // HUD
  drawHUD();
}

// --- Camera follow ---
function updateCamera(): void {
  if (selectedUnit) {
    followTargetSmooth(selectedUnit.worldX, selectedUnit.worldY, currentZoom, 0.03);
  } else {
    const cam = getCamera();
    setCamera(cam.x, cam.y, currentZoom);
  }
}

// --- Game bootstrap ---
const game = createGame({
  name: "hex-strategy",
  background: { r: 13 / 255, g: 20 / 255, b: 38 / 255 },
});

game.state({
  get: () => ({
    turn,
    units: units.map((u) => ({
      q: u.q,
      r: u.r,
      team: u.team,
      movement: u.movement,
      moved: u.moved,
    })),
    selectedUnit: selectedUnit ? { q: selectedUnit.q, r: selectedUnit.r } : null,
    zoom: currentZoom,
    camera: getCamera(),
  }),
  set: () => {},
});

game.onFrame((ctx) => {
  updateTweens(ctx.dt);
  handleInput();
  updateCamera();
  render();
});
