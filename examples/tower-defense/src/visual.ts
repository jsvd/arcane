/**
 * Tower Defense Visual Layer
 *
 * Renders the tower defense game with towers, enemies, and UI.
 * Run with: arcane dev
 */

import {
  createGame,
  updateGame,
  placeTower,
  type GameState,
} from "./game.ts";
import {
  onFrame,
  drawSprite,
  setCamera,
  createSolidTexture,
  getDeltaTime,
  getMousePosition,
  isKeyPressed,
} from "@arcane-engine/runtime/rendering";
import { drawLabel, drawBar, rgb } from "@arcane-engine/runtime/ui";
import { registerAgent } from "@arcane-engine/runtime/agent";

// --- Constants ---

const TILE_SIZE = 32;

// --- Initialize game ---

let state = createGame();

// --- Create textures ---

createSolidTexture("floor", 0.2, 0.25, 0.2, 1.0);      // Dark green
createSolidTexture("wall", 0.15, 0.15, 0.15, 1.0);     // Dark gray
createSolidTexture("start", 0.3, 0.7, 0.3, 1.0);       // Green
createSolidTexture("goal", 0.7, 0.3, 0.3, 1.0);        // Red
createSolidTexture("tower", 0.5, 0.5, 0.7, 1.0);       // Blue-gray
createSolidTexture("enemy", 0.9, 0.3, 0.3, 1.0);       // Red
createSolidTexture("towerRange", 0.3, 0.3, 0.8, 0.2);  // Transparent blue

// --- Agent Protocol ---

registerAgent({
  name: "tower-defense",
  getState: () => state,
  setState: (s) => (state = s),
  describe: (options) => {
    if (state.gameOver) {
      return `Game Over! Reached wave ${state.wave}`;
    }

    if (options?.verbosity === "detailed") {
      return `Wave ${state.wave}, Lives: ${state.lives}, Gold: ${state.gold}, Enemies: ${state.enemies.length}, Towers: ${state.towers.length}`;
    }

    return `Wave ${state.wave}, Lives: ${state.lives}`;
  },
});

// --- Input ---

let selectedTile: { x: number; y: number } | null = null;

// --- Frame Loop ---

onFrame(() => {
  const dt = getDeltaTime();

  // Update game logic
  state = updateGame(state, dt);

  // Handle mouse input for tower placement
  const mouse = getMousePosition();
  const tileX = Math.floor(mouse.x / TILE_SIZE);
  const tileY = Math.floor(mouse.y / TILE_SIZE);

  if (
    tileX >= 0 &&
    tileX < state.width &&
    tileY >= 0 &&
    tileY < state.height
  ) {
    selectedTile = { x: tileX, y: tileY };

    if (isKeyPressed(" ")) {
      state = placeTower(state, { x: tileX, y: tileY });
    }
  }

  // Center camera on map
  const centerX = (state.width * TILE_SIZE) / 2;
  const centerY = (state.height * TILE_SIZE) / 2;
  setCamera(centerX, centerY, 1.5);

  // Draw tiles
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = state.tiles[y][x];

      let textureId = "floor";
      if (tile === "wall") textureId = "wall";
      else if (tile === "start") textureId = "start";
      else if (tile === "goal") textureId = "goal";

      drawSprite(textureId, px, py, {
        width: TILE_SIZE,
        height: TILE_SIZE,
      });

      // Highlight selected tile
      if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
        createSolidTexture("highlight", 1.0, 1.0, 1.0, 0.3);
        drawSprite("highlight", px, py, {
          width: TILE_SIZE,
          height: TILE_SIZE,
        });
      }
    }
  }

  // Draw tower ranges (when hovering)
  if (selectedTile) {
    const tower = state.towers.find(
      (t) => t.position.x === selectedTile!.x && t.position.y === selectedTile!.y
    );
    if (tower) {
      const rangePx = tower.range * TILE_SIZE;
      drawSprite(
        "towerRange",
        tower.position.x * TILE_SIZE - rangePx + TILE_SIZE / 2,
        tower.position.y * TILE_SIZE - rangePx + TILE_SIZE / 2,
        {
          width: rangePx * 2,
          height: rangePx * 2,
        }
      );
    }
  }

  // Draw towers
  for (const tower of state.towers) {
    drawSprite(
      "tower",
      tower.position.x * TILE_SIZE + 2,
      tower.position.y * TILE_SIZE + 2,
      {
        width: TILE_SIZE - 4,
        height: TILE_SIZE - 4,
      }
    );
  }

  // Draw enemies
  for (const enemy of state.enemies) {
    drawSprite(
      "enemy",
      enemy.position.x * TILE_SIZE + 4,
      enemy.position.y * TILE_SIZE + 4,
      {
        width: TILE_SIZE - 8,
        height: TILE_SIZE - 8,
      }
    );

    // HP bar above enemy
    const barWidth = TILE_SIZE - 8;
    const barHeight = 4;
    const barX = enemy.position.x * TILE_SIZE + 4;
    const barY = enemy.position.y * TILE_SIZE;

    drawBar(
      barX,
      barY,
      barWidth,
      barHeight,
      enemy.hp / enemy.maxHp,
      rgb(200, 50, 50),
      rgb(50, 50, 50)
    );
  }

  // UI
  drawLabel(`Wave: ${state.wave}`, 10, 10, {
    textColor: rgb(255, 255, 255),
    scale: 2.0,
  });

  drawLabel(`Lives: ${state.lives}`, 10, 30, {
    textColor: state.lives <= 5 ? rgb(255, 100, 100) : rgb(255, 255, 255),
    scale: 2.0,
  });

  drawLabel(`Gold: ${state.gold}`, 10, 50, {
    textColor: rgb(255, 215, 0),
    scale: 2.0,
  });

  drawLabel(`Towers: ${state.towers.length}`, 10, 70, {
    textColor: rgb(200, 200, 255),
    scale: 1.5,
  });

  drawLabel("Space: Place Tower (50g)", 10, 100, {
    textColor: rgb(200, 200, 200),
    scale: 1.5,
  });

  if (state.gameOver) {
    drawLabel(
      `GAME OVER - Wave ${state.wave}`,
      200,
      250,
      {
        textColor: rgb(255, 50, 50),
        scale: 3.0,
      }
    );
  }
});
