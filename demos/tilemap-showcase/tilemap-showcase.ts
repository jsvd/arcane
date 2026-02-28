/**
 * Tilemap Showcase Demo — Phase 14: Tilemap Polish
 *
 * Demonstrates all Phase 14 tilemap features:
 * - Multiple tilemap layers (ground, walls, decoration, collision)
 * - Animated tiles (water ripple effect)
 * - Tile properties (walkable, damage, etc.)
 * - Auto-tiling (4-bit bitmask for walls)
 * - Per-layer parallax scrolling
 * - Layer visibility toggles
 * - Tile property queries at cursor position
 *
 * Controls:
 * - Arrow keys: Move camera
 * - Z/X: Zoom in/out
 * - 1: Toggle ground layer
 * - 2: Toggle walls layer
 * - 3: Toggle decoration layer
 * - 4: Toggle collision layer (normally invisible)
 * - P: Toggle parallax effect
 * - A: Re-apply auto-tiling
 */

import {
  setCamera,
  isKeyDown,
  isKeyPressed,
  createSolidTexture,
  getViewportSize,
  // Tilemap
  createLayeredTilemap,
  setLayerTile,
  getLayerTile,
  setLayerVisible,
  drawLayeredTilemap,
  fillLayerTiles,
  getLayerNames,
  // Animated tiles
  registerAnimatedTile,
  updateAnimatedTiles,
  clearAnimatedTiles,
  // Tile properties
  defineTileProperties,
  getTilePropertyAt,
  clearTileProperties,
  // Auto-tiling
  createAutotileMapping4,
  createAutotileRule,
  applyAutotile,
  drawSprite,
} from "../../runtime/rendering/index.ts";
import { createGame, hud } from "../../runtime/game/index.ts";
import { rgb } from "../../runtime/ui/types.ts";

// ---------------------------------------------------------------------------
// Tile IDs (simulated atlas: 8x8 = 64 tiles)
// ---------------------------------------------------------------------------

// Ground tiles
const TILE_GRASS = 1;
const TILE_DIRT = 2;
const TILE_SAND = 3;

// Water tiles (animated: cycles through 4 frames)
const TILE_WATER = 4; // base ID, frames 4-7
const TILE_WATER_F2 = 5;
const TILE_WATER_F3 = 6;
const TILE_WATER_F4 = 7;

// Wall tiles (auto-tiled, 16 variants for 4-bit bitmask)
const TILE_WALL_BASE = 8; // IDs 8-23 are wall variants

// Decoration tiles
const TILE_FLOWER = 24;
const TILE_BUSH = 25;
const TILE_ROCK = 26;
const TILE_SIGNPOST = 27;

// Collision marker
const TILE_COLLISION = 32;

// Atlas config: 8 columns x 8 rows = 64 tiles
const ATLAS_COLS = 8;
const ATLAS_ROWS = 8;
const TILE_SIZE = 16;

// Map dimensions
const MAP_W = 30;
const MAP_H = 22;

// ---------------------------------------------------------------------------
// Textures (solid-color placeholders)
// ---------------------------------------------------------------------------

const TEX_ATLAS = createSolidTexture("atlas", rgb(128, 128, 128));
const COL_CURSOR = rgb(255, 255, 0);

// ---------------------------------------------------------------------------
// Tile properties
// ---------------------------------------------------------------------------

function setupTileProperties(): void {
  clearTileProperties();

  defineTileProperties(TILE_GRASS, { walkable: true, name: "grass", speed: 1.0 });
  defineTileProperties(TILE_DIRT, { walkable: true, name: "dirt", speed: 0.9 });
  defineTileProperties(TILE_SAND, { walkable: true, name: "sand", speed: 0.7 });
  defineTileProperties(TILE_WATER, { walkable: false, name: "water", damage: 1 });
  defineTileProperties(TILE_COLLISION, { walkable: false, name: "collision", solid: true });

  // Wall variants all share the same properties
  for (let i = 0; i < 16; i++) {
    defineTileProperties(TILE_WALL_BASE + i, {
      walkable: false,
      name: "wall",
      solid: true,
      variant: i,
    });
  }

  defineTileProperties(TILE_FLOWER, { walkable: true, name: "flower", decorative: true });
  defineTileProperties(TILE_BUSH, { walkable: true, name: "bush", decorative: true });
  defineTileProperties(TILE_ROCK, { walkable: false, name: "rock", solid: true });
  defineTileProperties(TILE_SIGNPOST, { walkable: true, name: "signpost", interactable: true });
}

// ---------------------------------------------------------------------------
// Animated tiles
// ---------------------------------------------------------------------------

function setupAnimatedTiles(): void {
  clearAnimatedTiles();
  registerAnimatedTile(TILE_WATER, [TILE_WATER, TILE_WATER_F2, TILE_WATER_F3, TILE_WATER_F4], 0.3);
}

// ---------------------------------------------------------------------------
// Auto-tiling
// ---------------------------------------------------------------------------

function createWallAutotileRule() {
  // 4-bit wall tiles: bitmask -> atlas tile ID
  // Index = bitmask value (0-15), value = tile ID
  const wallTileIds = Array.from({ length: 16 }, (_, i) => TILE_WALL_BASE + i);
  const mapping = createAutotileMapping4(wallTileIds);

  // All wall base + variant IDs are members
  const memberIds = Array.from({ length: 16 }, (_, i) => TILE_WALL_BASE + i);
  return createAutotileRule(memberIds, 4, mapping, TILE_WALL_BASE);
}

// ---------------------------------------------------------------------------
// Map generation
// ---------------------------------------------------------------------------

const tilemapOpts = {
  textureId: TEX_ATLAS,
  width: MAP_W,
  height: MAP_H,
  tileSize: TILE_SIZE,
  atlasColumns: ATLAS_COLS,
  atlasRows: ATLAS_ROWS,
};

const map = createLayeredTilemap(tilemapOpts, [
  ["ground", { zOrder: 0, parallaxFactor: 1.0 }],
  ["walls", { zOrder: 10, parallaxFactor: 1.0 }],
  ["decoration", { zOrder: 20, parallaxFactor: 1.0 }],
  ["collision", { zOrder: -1, visible: false, parallaxFactor: 1.0 }],
]);

function generateMap(): void {
  // Fill ground layer with grass
  fillLayerTiles(map, "ground", 0, 0, MAP_W, MAP_H, TILE_GRASS);

  // Add some dirt patches
  fillLayerTiles(map, "ground", 8, 10, 14, 15, TILE_DIRT);
  fillLayerTiles(map, "ground", 18, 5, 24, 9, TILE_DIRT);

  // Add sand border near water
  fillLayerTiles(map, "ground", 0, 16, MAP_W, 17, TILE_SAND);

  // Add water at the bottom
  fillLayerTiles(map, "ground", 0, 17, MAP_W, MAP_H, TILE_WATER);

  // Build walls (will be auto-tiled)
  // Outer walls
  for (let x = 0; x < MAP_W; x++) {
    setLayerTile(map, "walls", x, 0, TILE_WALL_BASE);
    setLayerTile(map, "collision", x, 0, TILE_COLLISION);
  }
  for (let y = 0; y < 16; y++) {
    setLayerTile(map, "walls", 0, y, TILE_WALL_BASE);
    setLayerTile(map, "walls", MAP_W - 1, y, TILE_WALL_BASE);
    setLayerTile(map, "collision", 0, y, TILE_COLLISION);
    setLayerTile(map, "collision", MAP_W - 1, y, TILE_COLLISION);
  }

  // Interior walls (rooms)
  for (let y = 3; y < 8; y++) {
    setLayerTile(map, "walls", 10, y, TILE_WALL_BASE);
    setLayerTile(map, "collision", 10, y, TILE_COLLISION);
  }
  for (let x = 10; x < 16; x++) {
    setLayerTile(map, "walls", x, 3, TILE_WALL_BASE);
    setLayerTile(map, "collision", x, 3, TILE_COLLISION);
  }

  // Second room
  for (let y = 6; y < 14; y++) {
    setLayerTile(map, "walls", 20, y, TILE_WALL_BASE);
    setLayerTile(map, "collision", 20, y, TILE_COLLISION);
  }
  for (let x = 20; x < 27; x++) {
    setLayerTile(map, "walls", x, 6, TILE_WALL_BASE);
    setLayerTile(map, "collision", x, 6, TILE_COLLISION);
  }
  for (let x = 20; x < 27; x++) {
    setLayerTile(map, "walls", x, 13, TILE_WALL_BASE);
    setLayerTile(map, "collision", x, 13, TILE_COLLISION);
  }
  for (let y = 6; y < 14; y++) {
    setLayerTile(map, "walls", 26, y, TILE_WALL_BASE);
    setLayerTile(map, "collision", 26, y, TILE_COLLISION);
  }

  // Decoration layer
  setLayerTile(map, "decoration", 5, 5, TILE_FLOWER);
  setLayerTile(map, "decoration", 6, 5, TILE_FLOWER);
  setLayerTile(map, "decoration", 7, 8, TILE_BUSH);
  setLayerTile(map, "decoration", 15, 10, TILE_ROCK);
  setLayerTile(map, "decoration", 16, 10, TILE_ROCK);
  setLayerTile(map, "decoration", 4, 12, TILE_SIGNPOST);
  setLayerTile(map, "decoration", 12, 5, TILE_BUSH);
  setLayerTile(map, "decoration", 22, 8, TILE_FLOWER);
  setLayerTile(map, "decoration", 23, 9, TILE_FLOWER);
  setLayerTile(map, "decoration", 24, 10, TILE_BUSH);

  // Apply auto-tiling to walls
  applyWallAutotiling();
}

function applyWallAutotiling(): void {
  const rule = createWallAutotileRule();

  const getTileFn = (gx: number, gy: number): number => {
    return getLayerTile(map, "walls", gx, gy);
  };

  const setTileFn = (gx: number, gy: number, tileId: number): void => {
    setLayerTile(map, "walls", gx, gy, tileId);
  };

  applyAutotile(MAP_W, MAP_H, getTileFn, setTileFn, rule);
}

// ---------------------------------------------------------------------------
// Camera state
// ---------------------------------------------------------------------------

let cameraX = MAP_W * TILE_SIZE / 2;
let cameraY = MAP_H * TILE_SIZE / 2;
let cameraZoom = 2.0;
let parallaxEnabled = true;

// Cursor (grid position)
let cursorGX = Math.floor(MAP_W / 2);
let cursorGY = Math.floor(MAP_H / 2);

// Layer visibility
const layerVisibility: Record<string, boolean> = {
  ground: true,
  walls: true,
  decoration: true,
  collision: false,
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

setupTileProperties();
setupAnimatedTiles();
generateMap();

// ---------------------------------------------------------------------------
// Game bootstrap
// ---------------------------------------------------------------------------

const game = createGame({ name: "tilemap-showcase", autoCamera: false });

// ---------------------------------------------------------------------------
// Frame callback
// ---------------------------------------------------------------------------

game.onFrame((ctx) => {
  const dt = ctx.dt;
  const { width: vpW, height: vpH } = ctx.viewport;

  // Update animated tiles
  updateAnimatedTiles(dt);

  // --- Input ---
  const CAMERA_SPEED = 200;
  if (isKeyDown("ArrowLeft")) cameraX -= CAMERA_SPEED * dt;
  if (isKeyDown("ArrowRight")) cameraX += CAMERA_SPEED * dt;
  if (isKeyDown("ArrowUp")) cameraY -= CAMERA_SPEED * dt;
  if (isKeyDown("ArrowDown")) cameraY += CAMERA_SPEED * dt;

  if (isKeyDown("z")) cameraZoom = Math.min(4.0, cameraZoom + 2.0 * dt);
  if (isKeyDown("x")) cameraZoom = Math.max(0.5, cameraZoom - 2.0 * dt);

  // Toggle layers
  if (isKeyPressed("1")) {
    layerVisibility.ground = !layerVisibility.ground;
    setLayerVisible(map, "ground", layerVisibility.ground);
  }
  if (isKeyPressed("2")) {
    layerVisibility.walls = !layerVisibility.walls;
    setLayerVisible(map, "walls", layerVisibility.walls);
  }
  if (isKeyPressed("3")) {
    layerVisibility.decoration = !layerVisibility.decoration;
    setLayerVisible(map, "decoration", layerVisibility.decoration);
  }
  if (isKeyPressed("4")) {
    layerVisibility.collision = !layerVisibility.collision;
    setLayerVisible(map, "collision", layerVisibility.collision);
  }

  // Toggle parallax
  if (isKeyPressed("p")) parallaxEnabled = !parallaxEnabled;

  // Re-apply auto-tiling
  if (isKeyPressed("a")) applyWallAutotiling();

  // Move cursor (WASD)
  if (isKeyPressed("w") && cursorGY > 0) cursorGY--;
  if (isKeyPressed("s") && cursorGY < MAP_H - 1) cursorGY++;
  if (isKeyPressed("a") && cursorGX > 0) cursorGX--;
  if (isKeyPressed("d") && cursorGX < MAP_W - 1) cursorGX++;

  // --- Set camera ---
  setCamera(cameraX, cameraY, cameraZoom);

  // --- Render ---

  // Draw all tilemap layers
  const camX = parallaxEnabled ? cameraX : 0;
  const camY = parallaxEnabled ? cameraY : 0;
  drawLayeredTilemap(map, 0, 0, 0, camX, camY);

  // Draw cursor highlight
  const cursorWorldX = cursorGX * TILE_SIZE;
  const cursorWorldY = cursorGY * TILE_SIZE;
  drawSprite({
    color: COL_CURSOR,
    x: cursorWorldX,
    y: cursorWorldY,
    w: TILE_SIZE,
    h: TILE_SIZE,
    layer: 50,
    opacity: 0.4,
  });

  // --- HUD (screen-space) ---
  const hudX = 10;
  const hudScale = 1.5;
  const smallScale = hudScale * 0.9;

  // Title
  hud.text("Tilemap Showcase", hudX, 10, { scale: hudScale, layer: 200 });

  // Layer status
  const layers = getLayerNames(map);
  let yOff = 25;
  for (let i = 0; i < layers.length; i++) {
    const name = layers[i];
    const vis = layerVisibility[name] ?? true;
    const label = `[${i + 1}] ${name}: ${vis ? "ON" : "OFF"}`;
    hud.text(label, hudX, yOff, {
      scale: smallScale,
      layer: 200,
      tint: vis ? { r: 0.5, g: 1, b: 0.5, a: 1 } : { r: 0.5, g: 0.5, b: 0.5, a: 1 },
    });
    yOff += 13;
  }

  // Parallax status
  hud.text(`[P] Parallax: ${parallaxEnabled ? "ON" : "OFF"}`, hudX, yOff, { scale: smallScale, layer: 200 });
  yOff += 18;

  // Cursor info
  hud.text(`Cursor: (${cursorGX}, ${cursorGY})`, hudX, yOff, { scale: smallScale, layer: 200 });
  yOff += 13;

  // Tile property at cursor
  const groundProp = getTilePropertyAt(map, "ground", cursorGX, cursorGY, "name");
  const wallProp = getTilePropertyAt(map, "walls", cursorGX, cursorGY, "name");
  const decoProp = getTilePropertyAt(map, "decoration", cursorGX, cursorGY, "name");
  const walkable = getTilePropertyAt(map, "collision", cursorGX, cursorGY, "solid");

  hud.text(`Ground: ${groundProp ?? "empty"}`, hudX, yOff, { scale: smallScale, layer: 200 });
  yOff += 13;
  hud.text(`Wall: ${wallProp ?? "empty"}`, hudX, yOff, { scale: smallScale, layer: 200 });
  yOff += 13;
  hud.text(`Deco: ${decoProp ?? "empty"}`, hudX, yOff, { scale: smallScale, layer: 200 });
  yOff += 13;
  hud.text(`Solid: ${walkable === true ? "YES" : "no"}`, hudX, yOff, {
    scale: smallScale,
    layer: 200,
    tint: walkable ? { r: 1, g: 0.3, b: 0.3, a: 1 } : { r: 0.5, g: 1, b: 0.5, a: 1 },
  });

  // Controls (bottom)
  hud.text("Arrows=Camera Z/X=Zoom WASD=Cursor", hudX, vpH - 20, {
    scale: hudScale * 0.8,
    layer: 200,
    tint: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
  });
});

// ---------------------------------------------------------------------------
// Agent protocol (wired via game.state())
// ---------------------------------------------------------------------------

type ShowcaseState = {
  camera: { x: number; y: number; zoom: number };
  cursor: { gx: number; gy: number };
  layers: Record<string, boolean>;
  parallax: boolean;
  mapSize: { w: number; h: number; tileSize: number };
};

game.state<ShowcaseState>({
  get: () => ({
    camera: { x: cameraX, y: cameraY, zoom: cameraZoom },
    cursor: { gx: cursorGX, gy: cursorGY },
    layers: layerVisibility,
    parallax: parallaxEnabled,
    mapSize: { w: MAP_W, h: MAP_H, tileSize: TILE_SIZE },
  }),
  set: (s) => {
    cameraX = s.camera.x;
    cameraY = s.camera.y;
    cameraZoom = s.camera.zoom;
    cursorGX = s.cursor.gx;
    cursorGY = s.cursor.gy;
  },
  describe: () => {
    const lines = [
      `Tilemap Showcase (${MAP_W}x${MAP_H} tiles, ${TILE_SIZE}px)`,
      `Camera: (${Math.round(cameraX)}, ${Math.round(cameraY)}) zoom=${cameraZoom.toFixed(1)}`,
      `Cursor: (${cursorGX}, ${cursorGY})`,
      `Layers: ${Object.entries(layerVisibility).map(([k, v]) => `${k}=${v ? "on" : "off"}`).join(", ")}`,
      `Parallax: ${parallaxEnabled ? "on" : "off"}`,
    ];
    return lines.join("\n");
  },
  actions: {
    "toggle-ground": {
      handler: (s) => {
        layerVisibility.ground = !layerVisibility.ground;
        setLayerVisible(map, "ground", layerVisibility.ground);
        return s;
      },
      description: "Toggle ground layer",
    },
    "toggle-walls": {
      handler: (s) => {
        layerVisibility.walls = !layerVisibility.walls;
        setLayerVisible(map, "walls", layerVisibility.walls);
        return s;
      },
      description: "Toggle walls layer",
    },
    "toggle-decoration": {
      handler: (s) => {
        layerVisibility.decoration = !layerVisibility.decoration;
        setLayerVisible(map, "decoration", layerVisibility.decoration);
        return s;
      },
      description: "Toggle decoration layer",
    },
    "toggle-collision": {
      handler: (s) => {
        layerVisibility.collision = !layerVisibility.collision;
        setLayerVisible(map, "collision", layerVisibility.collision);
        return s;
      },
      description: "Toggle collision layer",
    },
    "toggle-parallax": {
      handler: (s) => {
        parallaxEnabled = !parallaxEnabled;
        return s;
      },
      description: "Toggle parallax",
    },
    "reapply-autotile": {
      handler: (s) => {
        applyWallAutotiling();
        return s;
      },
      description: "Re-apply auto-tiling",
    },
  },
});
