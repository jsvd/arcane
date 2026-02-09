/**
 * Sokoban Visual Demo — Phase 2a
 *
 * Run with: cargo run -- dev demos/sokoban/sokoban-visual.ts
 *
 * Renders the Sokoban game using the Arcane rendering API.
 * Uses solid-color placeholder textures (no art assets needed).
 */

import { createSokobanGame, buildMove } from "./sokoban.ts";
import type { Direction, SokobanState } from "./sokoban.ts";
import type { Vec2 } from "../../runtime/state/types.ts";
import {
  onFrame,
  drawSprite,
  clearSprites,
  setCamera,
  isKeyPressed,
  createSolidTexture,
} from "../../runtime/rendering/index.ts";

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

const game = createSokobanGame(LEVEL.trim());

// --- Create placeholder textures (solid colors) ---

const TEX_WALL = createSolidTexture("wall", 80, 80, 100);
const TEX_FLOOR = createSolidTexture("floor", 40, 40, 50);
const TEX_PLAYER = createSolidTexture("player", 50, 150, 255);
const TEX_BOX = createSolidTexture("box", 200, 150, 50);
const TEX_GOAL = createSolidTexture("goal", 255, 80, 80);
const TEX_BOX_ON_GOAL = createSolidTexture("box_on_goal", 50, 200, 50);

// --- Input handling ---

const KEY_MAP: Record<string, Direction> = {
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
  const state = game.store.getState() as SokobanState;

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

  // Get fresh state after potential move
  const current = game.store.getState() as SokobanState;

  // Center camera on the grid
  const centerX = (current.width * TILE_SIZE) / 2;
  const centerY = (current.height * TILE_SIZE) / 2;
  setCamera(centerX, centerY, 1);

  // Clear previous frame
  clearSprites();

  // Draw tiles
  for (let y = 0; y < current.height; y++) {
    for (let x = 0; x < current.width; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = current.tiles[y][x];

      if (tile === "wall") {
        drawSprite({
          textureId: TEX_WALL,
          x: px,
          y: py,
          w: TILE_SIZE,
          h: TILE_SIZE,
          layer: 0,
        });
      } else {
        drawSprite({
          textureId: TEX_FLOOR,
          x: px,
          y: py,
          w: TILE_SIZE,
          h: TILE_SIZE,
          layer: 0,
        });
      }
    }
  }

  // Draw goals (layer 1, behind boxes/player)
  for (const goal of current.goals) {
    drawSprite({
      textureId: TEX_GOAL,
      x: goal.x * TILE_SIZE + 4,
      y: goal.y * TILE_SIZE + 4,
      w: TILE_SIZE - 8,
      h: TILE_SIZE - 8,
      layer: 1,
    });
  }

  // Draw boxes (layer 2)
  for (const box_ of current.boxes) {
    const onGoal = current.goals.some(
      (g: Vec2) => g.x === box_.x && g.y === box_.y,
    );
    drawSprite({
      textureId: onGoal ? TEX_BOX_ON_GOAL : TEX_BOX,
      x: box_.x * TILE_SIZE + 2,
      y: box_.y * TILE_SIZE + 2,
      w: TILE_SIZE - 4,
      h: TILE_SIZE - 4,
      layer: 2,
    });
  }

  // Draw player (layer 3, on top)
  drawSprite({
    textureId: TEX_PLAYER,
    x: current.player.x * TILE_SIZE + 4,
    y: current.player.y * TILE_SIZE + 4,
    w: TILE_SIZE - 8,
    h: TILE_SIZE - 8,
    layer: 3,
  });
});
