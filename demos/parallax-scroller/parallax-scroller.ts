/**
 * Parallax Scroller Demo — Phase 13: Camera Polish
 *
 * Showcases all Phase 13 camera features:
 * - 3-layer parallax background (far/mid/near)
 * - Camera bounds (stops at map edges)
 * - Camera deadzone (player can move in center without camera following)
 * - Smooth camera follow (exponential lerp)
 * - Smooth zoom (Z/X keys)
 * - HUD showing camera state, deadzone indicator
 *
 * Controls:
 * - Left/Right: Move player
 * - Up: Jump
 * - Z: Zoom in (smooth)
 * - X: Zoom out (smooth)
 * - D: Toggle deadzone
 * - B: Toggle bounds
 * - S: Toggle smooth follow (instant vs smooth)
 */

import {
  drawSprite,
  setCamera,
  getCamera,
  isKeyDown,
  isKeyPressed,
  createSolidTexture,
  getViewportSize,
  drawText,
  setCameraBounds,
  getCameraBounds,
  setCameraDeadzone,
  getCameraDeadzone,
  followTarget,
  followTargetSmooth,
  zoomTo,
  drawParallaxSprite,
} from "../../runtime/rendering/index.ts";
import { updateTweens, easeOutCubic } from "../../runtime/tweening/index.ts";
import {
  createGame, drawColorSprite,
  createPlatformerState, platformerMove, platformerJump, platformerStep,
} from "../../runtime/game/index.ts";
import type { PlatformerState, Platform as PlatPlatform } from "../../runtime/game/index.ts";
import { rgb } from "../../runtime/ui/types.ts";

// --- Map constants ---
const MAP_WIDTH = 3200;
const MAP_HEIGHT = 800;
const GROUND_Y = MAP_HEIGHT - 64;
const PLAYER_W = 24;
const PLAYER_H = 32;

const PLAT_CONFIG = {
  gravity: 1200,
  jumpForce: -500,
  walkSpeed: 300,
  playerWidth: PLAYER_W,
  playerHeight: PLAYER_H,
};

// --- Textures (solid colors for prototyping) ---
// Textures used by drawParallaxSprite (require real textureId)
const TEX_SKY_FAR = createSolidTexture("sky_far", rgb(20, 10, 60));
const TEX_MOUNTAINS = createSolidTexture("mountains", rgb(40, 30, 80));
const TEX_TREES = createSolidTexture("trees", rgb(20, 60, 30));
const TEX_STAR = createSolidTexture("star", rgb(255, 255, 200));

// Inline colors for drawSprite-only objects
const COL_GROUND = rgb(80, 60, 40);
const COL_PLATFORM = rgb(100, 80, 60);
const COL_PLAYER = rgb(80, 180, 255);
const COL_COIN = rgb(255, 220, 50);

// --- State ---
let pState: PlatformerState = createPlatformerState(200, GROUND_Y - PLAYER_H);
let playerCoins = 0;

// Toggle states
let useSmoothFollow = true;
let useDeadzone = true;
let useBounds = true;
let currentZoom = 1.0;

// Platforms (including ground as a platform for the controller)
const groundPlat: PlatPlatform = { x: 0, y: GROUND_Y, w: MAP_WIDTH, h: MAP_HEIGHT - GROUND_Y };
const floatingPlats: PlatPlatform[] = [
  { x: 400, y: GROUND_Y - 100, w: 128, h: 16 },
  { x: 700, y: GROUND_Y - 160, w: 96, h: 16 },
  { x: 1000, y: GROUND_Y - 120, w: 160, h: 16 },
  { x: 1350, y: GROUND_Y - 200, w: 128, h: 16 },
  { x: 1700, y: GROUND_Y - 140, w: 96, h: 16 },
  { x: 2000, y: GROUND_Y - 180, w: 160, h: 16 },
  { x: 2350, y: GROUND_Y - 100, w: 128, h: 16 },
  { x: 2700, y: GROUND_Y - 160, w: 96, h: 16 },
];
const allPlatforms: PlatPlatform[] = [groundPlat, ...floatingPlats];

// Coins (placed above floating platforms)
const coins = floatingPlats.map((p) => ({
  x: p.x + p.w / 2 - 8,
  y: p.y - 24,
  w: 16,
  h: 16,
  collected: false,
}));

// Stars (decorative, scattered across far background)
const stars: Array<{ x: number; y: number; size: number; brightness: number }> = [];
for (let i = 0; i < 80; i++) {
  stars.push({
    x: Math.random() * MAP_WIDTH * 2 - MAP_WIDTH * 0.5,
    y: Math.random() * (MAP_HEIGHT * 0.6),
    size: 1 + Math.random() * 3,
    brightness: 0.3 + Math.random() * 0.7,
  });
}

// Mountain silhouettes (decorative shapes at different depths)
const mountains: Array<{ x: number; y: number; w: number; h: number }> = [];
for (let i = 0; i < 12; i++) {
  const w = 200 + Math.random() * 300;
  mountains.push({
    x: i * 500 - 400 + Math.random() * 200,
    y: MAP_HEIGHT - 200 - Math.random() * 200,
    w,
    h: 100 + Math.random() * 200,
  });
}

// Tree silhouettes (closer than mountains)
const trees: Array<{ x: number; y: number; w: number; h: number }> = [];
for (let i = 0; i < 30; i++) {
  const w = 30 + Math.random() * 60;
  trees.push({
    x: i * 120 - 200 + Math.random() * 80,
    y: GROUND_Y - 40 - Math.random() * 80,
    w,
    h: 40 + Math.random() * 80,
  });
}

// --- Initialize camera ---
setCameraBounds({ minX: 0, minY: 0, maxX: MAP_WIDTH, maxY: MAP_HEIGHT });
setCameraDeadzone({ width: 200, height: 100 });

// --- Game logic ---
function updatePlayer(dt: number): void {
  // Horizontal movement
  let dir: -1 | 0 | 1 = 0;
  if (isKeyDown("ArrowLeft") || isKeyDown("a")) dir = -1;
  if (isKeyDown("ArrowRight") || isKeyDown("d")) dir = 1;
  pState = platformerMove(pState, dir, false, PLAT_CONFIG);

  // Jump
  if (isKeyPressed("ArrowUp") || isKeyPressed("w") || isKeyPressed(" ")) {
    pState = platformerJump(pState, PLAT_CONFIG);
  }

  // Physics + collision (ground is included in allPlatforms)
  pState = platformerStep(pState, dt, allPlatforms, PLAT_CONFIG);

  // Clamp to map
  if (pState.x < 0) pState = { ...pState, x: 0, vx: 0 };
  if (pState.x + PLAYER_W > MAP_WIDTH) pState = { ...pState, x: MAP_WIDTH - PLAYER_W, vx: 0 };

  // Collect coins
  for (const coin of coins) {
    if (coin.collected) continue;
    if (
      pState.x + PLAYER_W > coin.x &&
      pState.x < coin.x + coin.w &&
      pState.y + PLAYER_H > coin.y &&
      pState.y < coin.y + coin.h
    ) {
      coin.collected = true;
      playerCoins++;
    }
  }
}

function handleInput(): void {
  // Zoom controls
  if (isKeyPressed("z")) {
    currentZoom = Math.min(currentZoom * 1.5, 4.0);
    zoomTo(currentZoom, 0.4, easeOutCubic);
  }
  if (isKeyPressed("x")) {
    currentZoom = Math.max(currentZoom / 1.5, 0.5);
    zoomTo(currentZoom, 0.4, easeOutCubic);
  }

  // Toggle deadzone
  if (isKeyPressed("f")) {
    useDeadzone = !useDeadzone;
    setCameraDeadzone(useDeadzone ? { width: 200, height: 100 } : null);
  }

  // Toggle bounds
  if (isKeyPressed("b")) {
    useBounds = !useBounds;
    setCameraBounds(
      useBounds ? { minX: 0, minY: 0, maxX: MAP_WIDTH, maxY: MAP_HEIGHT } : null,
    );
  }

  // Toggle smooth follow
  if (isKeyPressed("s")) {
    useSmoothFollow = !useSmoothFollow;
  }
}

function updateCamera(): void {
  const cam = getCamera();
  const targetZoom = cam.zoom; // zoom is managed by zoomTo tween

  if (useSmoothFollow) {
    followTargetSmooth(
      pState.x + PLAYER_W / 2,
      pState.y + PLAYER_H / 2,
      targetZoom,
      0.05,
    );
  } else {
    followTarget(
      pState.x + PLAYER_W / 2,
      pState.y + PLAYER_H / 2,
      targetZoom,
    );
  }
}

// --- Rendering ---
function render(): void {
  const vp = getViewportSize();
  const cam = getCamera();

  // Layer 0: Far sky (fixed)
  drawParallaxSprite({
    textureId: TEX_SKY_FAR,
    x: -MAP_WIDTH,
    y: -MAP_HEIGHT,
    w: MAP_WIDTH * 4,
    h: MAP_HEIGHT * 3,
    parallaxFactor: 0,
    layer: 0,
  });

  // Layer 1: Stars (very slow parallax)
  for (const star of stars) {
    drawParallaxSprite({
      textureId: TEX_STAR,
      x: star.x,
      y: star.y,
      w: star.size,
      h: star.size,
      parallaxFactor: 0.1,
      layer: 1,
      tint: { r: 1, g: 1, b: 0.9, a: star.brightness },
    });
  }

  // Layer 2: Mountains (slow parallax)
  for (const m of mountains) {
    drawParallaxSprite({
      textureId: TEX_MOUNTAINS,
      x: m.x,
      y: m.y,
      w: m.w,
      h: m.h,
      parallaxFactor: 0.3,
      layer: 2,
    });
  }

  // Layer 3: Trees (medium parallax)
  for (const t of trees) {
    drawParallaxSprite({
      textureId: TEX_TREES,
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h,
      parallaxFactor: 0.6,
      layer: 3,
    });
  }

  // Layer 4: Ground (moves with camera — factor 1.0, use normal drawSprite)
  drawColorSprite({
    color: COL_GROUND,
    x: 0,
    y: GROUND_Y,
    w: MAP_WIDTH,
    h: MAP_HEIGHT - GROUND_Y,
    layer: 4,
  });

  // Layer 5: Platforms
  for (const p of floatingPlats) {
    drawColorSprite({
      color: COL_PLATFORM,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      layer: 5,
    });
  }

  // Layer 6: Coins
  const time = Date.now() / 1000;
  for (const coin of coins) {
    if (coin.collected) continue;
    const bobY = Math.sin(time * 3 + coin.x * 0.1) * 4;
    drawColorSprite({
      color: COL_COIN,
      x: coin.x,
      y: coin.y + bobY,
      w: coin.w,
      h: coin.h,
      layer: 6,
    });
  }

  // Layer 7: Player
  drawColorSprite({
    color: COL_PLAYER,
    x: pState.x,
    y: pState.y,
    w: PLAYER_W,
    h: PLAYER_H,
    layer: 7,
  });

  // --- HUD (layer 100+, screen space) ---
  const hudX = cam.x - vp.width / (2 * cam.zoom);
  const hudY = cam.y - vp.height / (2 * cam.zoom);
  const scale = 1 / cam.zoom;

  // Info panel background
  drawSprite({
    textureId: TEX_SKY_FAR,
    x: hudX + 4 * scale,
    y: hudY + 4 * scale,
    w: 320 * scale,
    h: 120 * scale,
    layer: 100,
    tint: { r: 0, g: 0, b: 0, a: 0.6 },
  });

  const textScale = scale;
  drawText(`Coins: ${playerCoins}/${coins.length}`, hudX + 10 * scale, hudY + 10 * scale, {
    scale: textScale,
    layer: 101,
  });
  drawText(
    `Camera: (${cam.x.toFixed(0)}, ${cam.y.toFixed(0)}) zoom=${cam.zoom.toFixed(2)}`,
    hudX + 10 * scale,
    hudY + 24 * scale,
    { scale: textScale, layer: 101 },
  );
  drawText(
    `Smooth: ${useSmoothFollow ? "ON" : "OFF"}  Deadzone: ${useDeadzone ? "ON" : "OFF"}  Bounds: ${useBounds ? "ON" : "OFF"}`,
    hudX + 10 * scale,
    hudY + 38 * scale,
    { scale: textScale, layer: 101 },
  );
  drawText("Arrows=Move  Z/X=Zoom  S=Smooth  F=Deadzone  B=Bounds", hudX + 10 * scale, hudY + 52 * scale, {
    scale: textScale * 0.9,
    layer: 101,
    color: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
  });

  // Deadzone indicator (subtle rectangle in center of screen)
  if (useDeadzone) {
    const dz = getCameraDeadzone();
    if (dz) {
      const dzX = cam.x - dz.width / 2;
      const dzY = cam.y - dz.height / 2;
      drawSprite({
        textureId: TEX_STAR,
        x: dzX,
        y: dzY,
        w: dz.width,
        h: dz.height,
        layer: 99,
        tint: { r: 1, g: 1, b: 0, a: 0.08 },
      });
    }
  }
}

// --- Game bootstrap ---
const app = createGame({ name: "parallax-scroller", autoCamera: false });

// --- Frame loop ---
app.onFrame((ctx) => {
  updateTweens(ctx.dt);
  handleInput();
  updatePlayer(ctx.dt);
  updateCamera();
  render();
});

// --- Agent state ---
type ParallaxState = {
  player: { x: number; y: number; coins: number };
  camera: ReturnType<typeof getCamera>;
  bounds: ReturnType<typeof getCameraBounds>;
  deadzone: ReturnType<typeof getCameraDeadzone>;
  smoothFollow: boolean;
  settings: { useSmoothFollow: boolean; useDeadzone: boolean; useBounds: boolean; currentZoom: number };
};

app.state<ParallaxState>({
  get: () => ({
    player: { x: pState.x, y: pState.y, coins: playerCoins },
    camera: getCamera(),
    bounds: getCameraBounds(),
    deadzone: getCameraDeadzone(),
    smoothFollow: useSmoothFollow,
    settings: { useSmoothFollow, useDeadzone, useBounds, currentZoom },
  }),
  set: (s) => {
    pState = { ...pState, x: s.player.x, y: s.player.y };
    playerCoins = s.player.coins;
  },
});
