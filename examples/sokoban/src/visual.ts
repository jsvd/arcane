/**
 * Sokoban Visual Layer
 *
 * Renders the Sokoban game using solid-color textures.
 * Run with: arcane dev
 */

import { createGame, type SokobanState } from "./game.ts";
import type { Vec2 } from "@arcane/runtime/state";
import {
  onFrame,
  drawSprite,
  setCamera,
  isKeyPressed,
  createSolidTexture,
} from "@arcane/runtime/rendering";
import { registerAgent } from "@arcane/runtime/agent";

// --- Constants ---

const TILE_SIZE = 32;

// --- Level ---

const LEVEL = `
#######
#     #
# .$. #
# $.$ #
# .$. #
#  @  #
#######
`;

// --- Initialize game ---

const game = createGame(LEVEL.trim());

// --- Create textures ---

createSolidTexture("wall", 0.31, 0.31, 0.39, 1.0);    // Dark gray-blue
createSolidTexture("floor", 0.16, 0.16, 0.20, 1.0);   // Darker gray
createSolidTexture("player", 0.20, 0.59, 1.0, 1.0);   // Blue
createSolidTexture("box", 0.78, 0.59, 0.20, 1.0);     // Brown/gold
createSolidTexture("goal", 1.0, 0.31, 0.31, 1.0);     // Red
createSolidTexture("boxOnGoal", 0.20, 0.78, 0.20, 1.0); // Green

// --- Agent Protocol ---

registerAgent({
  name: "sokoban",
  getState: () => game.store.getState(),
  setState: (s) => game.store.setState(s),
  describe: (options) => {
    const state = game.store.getState();
    const boxesOnGoals = state.goals.filter((g) =>
      state.boxes.some((b) => b.x === g.x && b.y === g.y)
    ).length;

    if (options?.verbosity === "detailed") {
      return `Sokoban - Moves: ${state.moves}, Boxes on goals: ${boxesOnGoals}/${state.goals.length}, Won: ${state.won}`;
    }

    return state.won
      ? `Victory in ${state.moves} moves!`
      : `${boxesOnGoals}/${state.goals.length} boxes placed`;
  },
});

// --- Input handling ---

const KEY_MAP: Record<string, "up" | "down" | "left" | "right"> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

// --- Frame loop ---

onFrame(() => {
  const state = game.store.getState();

  // Handle input
  for (const [key, dir] of Object.entries(KEY_MAP)) {
    if (isKeyPressed(key)) {
      game.move(dir);
      break; // one move per frame
    }
  }

  // Undo with 'z'
  if (isKeyPressed("z")) {
    game.undo();
  }

  // Reset with 'r'
  if (isKeyPressed("r")) {
    game.reset();
  }

  // Center camera on the grid
  const centerX = (state.width * TILE_SIZE) / 2;
  const centerY = (state.height * TILE_SIZE) / 2;
  setCamera(centerX, centerY, 2.0);

  // Draw tiles
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = state.tiles[y][x];

      const textureId = tile === "wall" ? "wall" : "floor";
      drawSprite(textureId, px, py, {
        width: TILE_SIZE,
        height: TILE_SIZE,
      });
    }
  }

  // Draw goals (behind boxes/player)
  for (const goal of state.goals) {
    drawSprite("goal", goal.x * TILE_SIZE + 4, goal.y * TILE_SIZE + 4, {
      width: TILE_SIZE - 8,
      height: TILE_SIZE - 8,
    });
  }

  // Draw boxes
  for (const box of state.boxes) {
    const onGoal = state.goals.some((g: Vec2) => g.x === box.x && g.y === box.y);
    const textureId = onGoal ? "boxOnGoal" : "box";

    drawSprite(textureId, box.x * TILE_SIZE + 2, box.y * TILE_SIZE + 2, {
      width: TILE_SIZE - 4,
      height: TILE_SIZE - 4,
    });
  }

  // Draw player (on top)
  drawSprite("player", state.player.x * TILE_SIZE + 4, state.player.y * TILE_SIZE + 4, {
    width: TILE_SIZE - 8,
    height: TILE_SIZE - 8,
  });
});
