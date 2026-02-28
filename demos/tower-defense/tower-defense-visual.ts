import {
  createTDGame, placeTower, sellTower, startWave, stepWave,
  TOWER_COSTS, TOWER_STATS,
} from "./tower-defense.ts";
import type { TDState, TowerType } from "./tower-defense.ts";
import {
  setCamera, isKeyPressed, getMouseWorldPosition,
  drawSprite,
} from "../../runtime/rendering/index.ts";
import { drawBar, Colors } from "../../runtime/ui/index.ts";
import { rgb } from "../../runtime/ui/types.ts";
import { createGame, hud } from "../../runtime/game/index.ts";
import type { Color } from "../../runtime/ui/types.ts";

// --- Colors ---
const COL_PATH = rgb(160, 130, 90);
const COL_BUILDABLE = rgb(60, 130, 60);
const COL_BLOCKED = rgb(80, 80, 80);
const COL_TOWER_ARROW = rgb(50, 100, 200);
const COL_TOWER_SLOW = rgb(50, 200, 200);
const COL_TOWER_SPLASH = rgb(200, 50, 50);
const COL_ENEMY_BASIC = rgb(200, 50, 50);
const COL_ENEMY_FAST = rgb(255, 150, 50);
const COL_ENEMY_TANK = rgb(150, 50, 150);
const COL_RANGE = rgb(255, 255, 255);

const TILE_SIZE = 48;

const TOWER_COLOR: Record<TowerType, Color> = {
  arrow: COL_TOWER_ARROW,
  slow: COL_TOWER_SLOW,
  splash: COL_TOWER_SPLASH,
};

const ENEMY_COLOR: Record<string, Color> = {
  basic: COL_ENEMY_BASIC,
  fast: COL_ENEMY_FAST,
  tank: COL_ENEMY_TANK,
};

// --- State ---
let state = createTDGame();
let selectedTower: TowerType = "arrow";

// --- Camera ---
const camX = (state.mapWidth * TILE_SIZE) / 2;
const camY = (state.mapHeight * TILE_SIZE) / 2;
setCamera(camX, camY, 1);

// --- Game setup ---
const game = createGame({ name: "tower-defense", autoCamera: false, autoClear: true });

game.state<TDState>({
  get: () => state,
  set: (s) => { state = s; },
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
game.onFrame((ctx) => {
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
    state = stepWave(state, ctx.dt);
  }

  // Restart
  if (isKeyPressed("r") || isKeyPressed("R")) {
    if (state.phase === "won" || state.phase === "lost") {
      state = createTDGame();
    }
  }

  // --- Render ---

  // Grid
  for (let y = 0; y < state.mapHeight; y++) {
    for (let x = 0; x < state.mapWidth; x++) {
      const cell = state.cells[y][x];
      let col = COL_BLOCKED;
      if (cell === 0) col = COL_PATH;
      else if (cell === 1) col = COL_BUILDABLE;
      drawSprite({
        color: col,
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
        color: COL_RANGE,
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
      color: TOWER_COLOR[tower.type],
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
      color: ENEMY_COLOR[enemy.type],
      x: enemy.pos.x * TILE_SIZE + offset,
      y: enemy.pos.y * TILE_SIZE + offset,
      w: size, h: size,
      layer: 3,
    });

    // Health bar (world-space, not HUD)
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

  hud.text(`${phaseText}  Wave: ${state.currentWave + 1}/${state.waves.length}`, 10, 10);

  hud.text(`Gold: ${state.gold}  Lives: ${state.lives}  Score: ${state.score}`, 10, 35, {
    tint: Colors.GOLD,
  });

  // Selected tower
  const costStr = `[${selectedTower.toUpperCase()}] Cost: ${TOWER_COSTS[selectedTower]}`;
  hud.text(`Tower: ${costStr}  (1=Arrow 2=Slow 3=Splash)`, 10, 60, {
    scale: 1.5,
    tint: Colors.INFO,
  });

  if (state.phase === "build" || state.phase === "between-waves") {
    hud.text("Space=Place  S=Sell  Enter=Start Wave", 10, 72.5, {
      scale: 1.5,
      tint: Colors.SUCCESS,
    });
  }

  if (state.phase === "won") {
    hud.label("VICTORY! Press R to restart", 400 - 150, 300 - 20, {
      textColor: Colors.WIN,
      bgColor: Colors.HUD_BG,
      padding: 12,
      scale: 3,
    });
  } else if (state.phase === "lost") {
    hud.label("DEFEATED! Press R to restart", 400 - 160, 300 - 20, {
      textColor: Colors.LOSE,
      bgColor: Colors.HUD_BG,
      padding: 12,
      scale: 3,
    });
  }
});
