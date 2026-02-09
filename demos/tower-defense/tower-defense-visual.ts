import {
  createTDGame, placeTower, sellTower, startWave, stepWave,
  TOWER_COSTS, TOWER_STATS,
} from "./tower-defense.ts";
import type { TDState, TowerType } from "./tower-defense.ts";
import {
  onFrame, clearSprites, drawSprite, setCamera,
  isKeyDown, isKeyPressed, getDeltaTime, createSolidTexture,
  getMouseWorldPosition, drawText,
} from "../../runtime/rendering/index.ts";
import { drawRect, drawBar, drawLabel } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";

// --- Textures ---
const TEX_PATH = createSolidTexture("path", 160, 130, 90);
const TEX_BUILDABLE = createSolidTexture("buildable", 60, 130, 60);
const TEX_BLOCKED = createSolidTexture("blocked", 80, 80, 80);
const TEX_TOWER_ARROW = createSolidTexture("tower-arrow", 50, 100, 200);
const TEX_TOWER_SLOW = createSolidTexture("tower-slow", 50, 200, 200);
const TEX_TOWER_SPLASH = createSolidTexture("tower-splash", 200, 50, 50);
const TEX_ENEMY_BASIC = createSolidTexture("enemy-basic", 200, 50, 50);
const TEX_ENEMY_FAST = createSolidTexture("enemy-fast", 255, 150, 50);
const TEX_ENEMY_TANK = createSolidTexture("enemy-tank", 150, 50, 150);
const TEX_RANGE = createSolidTexture("range", 255, 255, 255);

const TILE_SIZE = 48;

const TOWER_TEX: Record<TowerType, number> = {
  arrow: TEX_TOWER_ARROW,
  slow: TEX_TOWER_SLOW,
  splash: TEX_TOWER_SPLASH,
};

const ENEMY_TEX: Record<string, number> = {
  basic: TEX_ENEMY_BASIC,
  fast: TEX_ENEMY_FAST,
  tank: TEX_ENEMY_TANK,
};

// --- State ---
let state = createTDGame();
let selectedTower: TowerType = "arrow";

// --- Camera ---
const camX = (state.mapWidth * TILE_SIZE) / 2;
const camY = (state.mapHeight * TILE_SIZE) / 2;
setCamera(camX, camY, 1);

// --- Agent protocol ---
registerAgent<TDState>({
  name: "tower-defense",
  getState: () => state,
  setState: (s) => { state = s; },
  describe: (s, opts) => {
    if (opts.verbosity === "minimal") {
      return `Wave: ${s.currentWave + 1}/${s.waves.length}, Gold: ${s.gold}, Lives: ${s.lives}, Phase: ${s.phase}`;
    }
    const alive = s.enemies.filter((e) => e.alive).length;
    return `Wave: ${s.currentWave + 1}/${s.waves.length} | Gold: ${s.gold} | Lives: ${s.lives} | Score: ${s.score} | Towers: ${s.towers.length} | Enemies alive: ${alive} | Phase: ${s.phase}`;
  },
  actions: {
    placeTower: {
      handler: (s, args) => placeTower(s, args.x as number, args.y as number, args.type as TowerType),
      description: "Place a tower at (x, y) of given type",
      args: [
        { name: "x", type: "number" },
        { name: "y", type: "number" },
        { name: "type", type: "arrow | slow | splash" },
      ],
    },
    startWave: {
      handler: (s) => startWave(s),
      description: "Start the next wave",
    },
    sellTower: {
      handler: (s, args) => sellTower(s, args.towerId as string),
      description: "Sell a tower by ID",
      args: [
        { name: "towerId", type: "string" },
      ],
    },
  },
});

// --- Game loop ---
onFrame(() => {
  const dt = getDeltaTime();

  // --- Input ---
  if (isKeyPressed("1")) selectedTower = "arrow";
  if (isKeyPressed("2")) selectedTower = "slow";
  if (isKeyPressed("3")) selectedTower = "splash";

  // Mouse to grid (in world coordinates)
  const mouse = getMouseWorldPosition();
  const gridX = Math.floor(mouse.x / TILE_SIZE);
  const gridY = Math.floor(mouse.y / TILE_SIZE);
  const validGrid = gridX >= 0 && gridX < state.mapWidth && gridY >= 0 && gridY < state.mapHeight;

  if (state.phase === "build" || state.phase === "between-waves") {
    // Place tower
    if (isKeyPressed("Space") && validGrid) {
      state = placeTower(state, gridX, gridY, selectedTower);
    }

    // Sell tower under cursor
    if (isKeyPressed("s") || isKeyPressed("S")) {
      if (validGrid) {
        const tower = state.towers.find((t) => t.pos.x === gridX && t.pos.y === gridY);
        if (tower) state = sellTower(state, tower.id);
      }
    }

    // Start wave
    if (isKeyPressed("Enter")) {
      state = startWave(state);
    }
  }

  // Wave simulation
  if (state.phase === "wave") {
    state = stepWave(state, dt);
  }

  // Restart
  if (isKeyPressed("r") || isKeyPressed("R")) {
    if (state.phase === "won" || state.phase === "lost") {
      state = createTDGame();
    }
  }

  // --- Render ---
  clearSprites();

  // Grid
  for (let y = 0; y < state.mapHeight; y++) {
    for (let x = 0; x < state.mapWidth; x++) {
      const cell = state.cells[y][x];
      let tex = TEX_BLOCKED;
      if (cell === 0) tex = TEX_PATH;
      else if (cell === 1) tex = TEX_BUILDABLE;
      drawSprite({
        textureId: tex,
        x: x * TILE_SIZE, y: y * TILE_SIZE,
        w: TILE_SIZE - 1, h: TILE_SIZE - 1,
        layer: 0,
      });
    }
  }

  // Range preview (build phase, hovering buildable cell)
  if ((state.phase === "build" || state.phase === "between-waves") && validGrid) {
    if (state.cells[gridY][gridX] === 1) {
      const range = TOWER_STATS[selectedTower].range * TILE_SIZE;
      drawSprite({
        textureId: TEX_RANGE,
        x: gridX * TILE_SIZE + TILE_SIZE / 2 - range,
        y: gridY * TILE_SIZE + TILE_SIZE / 2 - range,
        w: range * 2, h: range * 2,
        layer: 1,
        tint: { r: 1, g: 1, b: 1, a: 0.15 },
      });
    }
  }

  // Towers
  for (const tower of state.towers) {
    drawSprite({
      textureId: TOWER_TEX[tower.type],
      x: tower.pos.x * TILE_SIZE + 4,
      y: tower.pos.y * TILE_SIZE + 4,
      w: TILE_SIZE - 8, h: TILE_SIZE - 8,
      layer: 2,
    });
  }

  // Enemies
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const size = enemy.type === "tank" ? 32 : enemy.type === "fast" ? 20 : 24;
    const offset = (TILE_SIZE - size) / 2;
    drawSprite({
      textureId: ENEMY_TEX[enemy.type],
      x: enemy.pos.x * TILE_SIZE + offset,
      y: enemy.pos.y * TILE_SIZE + offset,
      w: size, h: size,
      layer: 3,
    });

    // Health bar
    if (enemy.hp < enemy.maxHp) {
      drawBar(
        enemy.pos.x * TILE_SIZE + 4,
        enemy.pos.y * TILE_SIZE - 6,
        TILE_SIZE - 8, 4,
        enemy.hp / enemy.maxHp,
        {
          fillColor: { r: 0.2, g: 0.8, b: 0.2, a: 1 },
          bgColor: { r: 0.5, g: 0.1, b: 0.1, a: 0.8 },
          layer: 4,
        },
      );
    }
  }

  // --- HUD (screen-space) ---
  const phaseText = state.phase === "build" || state.phase === "between-waves"
    ? "BUILD"
    : state.phase === "wave"
      ? "WAVE"
      : state.phase.toUpperCase();

  drawText(`${phaseText}  Wave: ${state.currentWave + 1}/${state.waves.length}`, 10, 10, {
    scale: 2, tint: { r: 1, g: 1, b: 1, a: 1 }, layer: 100, screenSpace: true,
  });

  drawText(`Gold: ${state.gold}  Lives: ${state.lives}  Score: ${state.score}`, 10, 35, {
    scale: 2, tint: { r: 1, g: 0.9, b: 0.3, a: 1 }, layer: 100, screenSpace: true,
  });

  // Selected tower
  const costStr = `[${selectedTower.toUpperCase()}] Cost: ${TOWER_COSTS[selectedTower]}`;
  drawText(`Tower: ${costStr}  (1=Arrow 2=Slow 3=Splash)`, 10, 60, {
    scale: 1, tint: { r: 0.8, g: 0.8, b: 1, a: 1 }, layer: 100, screenSpace: true,
  });

  if (state.phase === "build" || state.phase === "between-waves") {
    drawText("Space=Place  S=Sell  Enter=Start Wave", 10, 80, {
      scale: 1, tint: { r: 0.6, g: 0.9, b: 0.6, a: 1 }, layer: 100, screenSpace: true,
    });
  }

  if (state.phase === "won") {
    drawLabel("VICTORY! Press R to restart", 200, 200, {
      textColor: { r: 1, g: 1, b: 0, a: 1 },
      bgColor: { r: 0, g: 0.3, b: 0, a: 0.9 },
      padding: 12, scale: 3, layer: 110, screenSpace: true,
    });
  } else if (state.phase === "lost") {
    drawLabel("DEFEATED! Press R to restart", 200, 200, {
      textColor: { r: 1, g: 0.2, b: 0.2, a: 1 },
      bgColor: { r: 0.3, g: 0, b: 0, a: 0.9 },
      padding: 12, scale: 3, layer: 110, screenSpace: true,
    });
  }
});
