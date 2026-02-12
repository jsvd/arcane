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
 * - R: Reset zoom
 */

import {
  onFrame,
  clearSprites,
  drawSprite,
  setCamera,
  getCamera,
  isKeyPressed,
  getDeltaTime,
  createSolidTexture,
  getViewportSize,
  drawText,
  setCameraBounds,
  followTargetSmooth,
  getMouseWorldPosition,
  setBackgroundColor,
} from "../../runtime/rendering/index.ts";
import { findPath } from "../../runtime/pathfinding/astar.ts";
import type { PathGrid } from "../../runtime/pathfinding/types.ts";
import { registerAgent } from "../../runtime/agent/index.ts";
import { updateTweens } from "../../runtime/tweening/tween.ts";

// --- Isometric constants ---
const TILE_W = 64; // Diamond width
const TILE_H = 32; // Diamond height (half of width)
const MAP_W = 16;
const MAP_H = 16;

// --- Coordinate transforms ---

/** Convert isometric grid (gx, gy) to world pixel position. */
function isoToWorld(gx: number, gy: number): { x: number; y: number } {
  return {
    x: (gx - gy) * (TILE_W / 2),
    y: (gx + gy) * (TILE_H / 2),
  };
}

/** Convert world pixel position to fractional isometric grid coordinates. */
function worldToIso(wx: number, wy: number): { x: number; y: number } {
  return {
    x: (wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2,
    y: (wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2,
  };
}

/** Convert world position to integer grid cell. */
function worldToGrid(wx: number, wy: number): { x: number; y: number } {
  const iso = worldToIso(wx, wy);
  return { x: Math.floor(iso.x), y: Math.floor(iso.y) };
}

/** Compute draw layer from grid Y for depth sorting. */
function depthLayer(gy: number): number {
  return Math.floor(gy * 10);
}

// --- Textures (solid colors) ---
const TEX_FLOOR_A = createSolidTexture("floor_a", 180, 160, 120);
const TEX_FLOOR_B = createSolidTexture("floor_b", 170, 150, 110);
const TEX_WALL = createSolidTexture("wall", 70, 65, 80);
const TEX_WALL_TOP = createSolidTexture("wall_top", 90, 85, 100);
const TEX_CRATE = createSolidTexture("crate", 160, 110, 60);
const TEX_CRATE_TOP = createSolidTexture("crate_top", 180, 130, 70);
const TEX_PLAYER = createSolidTexture("player", 60, 140, 255);
const TEX_PLAYER_HEAD = createSolidTexture("player_head", 80, 160, 255);
const TEX_COIN = createSolidTexture("coin", 255, 220, 50);
const TEX_HIGHLIGHT = createSolidTexture("highlight", 255, 255, 255);
const TEX_PATH = createSolidTexture("path_dot", 100, 200, 255);
const TEX_SHADOW = createSolidTexture("shadow", 0, 0, 0);
const TEX_HUD_BG = createSolidTexture("hud_bg", 20, 15, 30);

// --- Map definition ---
// 0 = floor, 1 = wall, 2 = crate
const TF = 0; // Floor
const TW = 1; // Wall
const TC = 2; // Crate

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

// Initialize player world position
const startWorld = isoToWorld(player.gx, player.gy);
player.x = startWorld.x;
player.y = startWorld.y;

// --- Camera setup ---
setBackgroundColor(0.08, 0.06, 0.12);

const mapCenter = isoToWorld(MAP_W / 2, MAP_H / 2);
setCamera(mapCenter.x, mapCenter.y, 1.0);

// Compute map world-space extents for camera bounds
const topCorner = isoToWorld(0, 0);
const rightCorner = isoToWorld(MAP_W, 0);
const bottomCorner = isoToWorld(MAP_W, MAP_H);
const leftCorner = isoToWorld(0, MAP_H);

const mapMinX = leftCorner.x;
const mapMaxX = rightCorner.x;
const mapMinY = topCorner.y;
const mapMaxY = bottomCorner.y;

setCameraBounds({
  minX: mapMinX - 100,
  minY: mapMinY - 100,
  maxX: mapMaxX + 100,
  maxY: mapMaxY + 100,
});

let currentZoom = 1.0;

// --- Input handling ---
function handleInput(): void {
  // Click to move
  if (isKeyPressed("MouseLeft")) {
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
          player.path = result.path.slice(1); // Skip current position
        }
      }
    }
  }

  // Zoom controls
  if (isKeyPressed("z")) {
    currentZoom = Math.min(currentZoom * 1.3, 3.0);
  }
  if (isKeyPressed("x")) {
    currentZoom = Math.max(currentZoom / 1.3, 0.5);
  }
  if (isKeyPressed("r")) {
    currentZoom = 1.0;
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
    // Reached waypoint
    player.x = nextWorld.x;
    player.y = nextWorld.y;
    player.gx = next.x;
    player.gy = next.y;
    player.path.shift();
  } else {
    // Interpolate toward waypoint
    const moveX = (dx / dist) * player.speed * dt;
    const moveY = (dy / dist) * player.speed * dt;
    player.x += moveX;
    player.y += moveY;
  }
}

// --- Coin collection ---
function checkCoins(): void {
  for (const coin of coins) {
    if (coin.collected) continue;
    if (coin.gx === player.gx && coin.gy === player.gy) {
      coin.collected = true;
      score++;
    }
  }
}

// --- Camera update ---
function updateCamera(): void {
  followTargetSmooth(player.x, player.y, currentZoom, 0.05);
}

// --- Rendering ---

/** Draw an isometric diamond (floor tile) as two triangles approximated by a flat rect. */
function drawIsoFloor(gx: number, gy: number): void {
  const world = isoToWorld(gx, gy);
  const layer = depthLayer(gy);
  const tex = (gx + gy) % 2 === 0 ? TEX_FLOOR_A : TEX_FLOOR_B;

  drawSprite({
    textureId: tex,
    x: world.x - TILE_W / 2,
    y: world.y - TILE_H / 2,
    w: TILE_W,
    h: TILE_H,
    layer,
  });
}

/** Draw a wall block (floor + vertical face). */
function drawWall(gx: number, gy: number): void {
  const world = isoToWorld(gx, gy);
  const layer = depthLayer(gy);
  const wallHeight = 32;

  // Wall top face
  drawSprite({
    textureId: TEX_WALL_TOP,
    x: world.x - TILE_W / 2,
    y: world.y - TILE_H / 2 - wallHeight,
    w: TILE_W,
    h: TILE_H,
    layer: layer + 2,
  });

  // Wall front face
  drawSprite({
    textureId: TEX_WALL,
    x: world.x - TILE_W / 2,
    y: world.y - wallHeight,
    w: TILE_W,
    h: wallHeight,
    layer: layer + 1,
  });
}

/** Draw a crate (floor + small raised box). */
function drawCrate(gx: number, gy: number): void {
  const world = isoToWorld(gx, gy);
  const layer = depthLayer(gy);
  const crateH = 24;
  const inset = 8;

  // Draw floor under crate
  drawIsoFloor(gx, gy);

  // Crate front
  drawSprite({
    textureId: TEX_CRATE,
    x: world.x - TILE_W / 2 + inset,
    y: world.y - crateH,
    w: TILE_W - inset * 2,
    h: crateH,
    layer: layer + 1,
  });

  // Crate top
  drawSprite({
    textureId: TEX_CRATE_TOP,
    x: world.x - TILE_W / 2 + inset,
    y: world.y - TILE_H / 2 - crateH + 4,
    w: TILE_W - inset * 2,
    h: TILE_H - 4,
    layer: layer + 2,
  });
}

function render(): void {
  clearSprites();
  const time = Date.now() / 1000;

  // 1. Tiles — render back to front (ascending gy)
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

  // 2. Path preview dots
  for (const step of player.path) {
    const world = isoToWorld(step.x, step.y);
    const layer = depthLayer(step.y) + 3;
    drawSprite({
      textureId: TEX_PATH,
      x: world.x - 4,
      y: world.y - 4,
      w: 8,
      h: 8,
      layer,
      opacity: 0.5,
    });
  }

  // 3. Coins
  for (const coin of coins) {
    if (coin.collected) continue;
    const world = isoToWorld(coin.gx, coin.gy);
    const layer = depthLayer(coin.gy) + 4;
    const bobY = Math.sin(time * 3 + coin.gx * 1.7 + coin.gy * 2.3) * 3;

    // Shadow
    drawSprite({
      textureId: TEX_SHADOW,
      x: world.x - 6,
      y: world.y - 2,
      w: 12,
      h: 6,
      layer: layer - 1,
      opacity: 0.3,
    });

    // Coin
    drawSprite({
      textureId: TEX_COIN,
      x: world.x - 6,
      y: world.y - 16 + bobY,
      w: 12,
      h: 12,
      layer,
    });
  }

  // 4. Player
  const playerIso = worldToIso(player.x, player.y);
  const playerLayer = depthLayer(playerIso.y) + 5;

  // Player shadow
  drawSprite({
    textureId: TEX_SHADOW,
    x: player.x - 10,
    y: player.y - 3,
    w: 20,
    h: 8,
    layer: playerLayer - 1,
    opacity: 0.4,
  });

  // Player body
  drawSprite({
    textureId: TEX_PLAYER,
    x: player.x - 8,
    y: player.y - 28,
    w: 16,
    h: 24,
    layer: playerLayer,
  });

  // Player head
  drawSprite({
    textureId: TEX_PLAYER_HEAD,
    x: player.x - 6,
    y: player.y - 38,
    w: 12,
    h: 12,
    layer: playerLayer + 1,
  });

  // 5. Mouse hover highlight
  const mouseWorld = getMouseWorldPosition();
  const hoverGrid = worldToGrid(mouseWorld.x, mouseWorld.y);
  if (
    hoverGrid.x >= 0 &&
    hoverGrid.x < MAP_W &&
    hoverGrid.y >= 0 &&
    hoverGrid.y < MAP_H
  ) {
    const hWorld = isoToWorld(hoverGrid.x, hoverGrid.y);
    const isWalk = isWalkable(hoverGrid.x, hoverGrid.y);

    drawSprite({
      textureId: TEX_HIGHLIGHT,
      x: hWorld.x - TILE_W / 2,
      y: hWorld.y - TILE_H / 2,
      w: TILE_W,
      h: TILE_H,
      layer: 9000,
      tint: isWalk
        ? { r: 0.3, g: 1, b: 0.3, a: 0.25 }
        : { r: 1, g: 0.3, b: 0.3, a: 0.25 },
    });
  }

  // 6. HUD
  const cam = getCamera();
  const vp = getViewportSize();
  const scale = 1 / cam.zoom;
  const hudX = cam.x - (vp.width / 2) * scale;
  const hudY = cam.y - (vp.height / 2) * scale;

  // HUD background
  drawSprite({
    textureId: TEX_HUD_BG,
    x: hudX + 6 * scale,
    y: hudY + 6 * scale,
    w: 260 * scale,
    h: 52 * scale,
    layer: 9500,
    opacity: 0.8,
  });

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

// --- Frame loop ---
onFrame(() => {
  const dt = getDeltaTime();
  updateTweens(dt);
  handleInput();
  updatePlayer(dt);
  checkCoins();
  updateCamera();
  render();
});

// --- Agent registration ---
registerAgent({
  getState: () => ({
    player: { gx: player.gx, gy: player.gy, x: player.x, y: player.y },
    score,
    totalCoins: coins.length,
    camera: getCamera(),
    zoom: currentZoom,
  }),
  actions: [
    { name: "reset", description: "Reset zoom to 1x" },
  ],
});
