/**
 * Sokoban Visual Demo — Phase 2a
 *
 * Run with: cargo run -- dev demos/sokoban/sokoban-visual.ts
 *
 * Renders the Sokoban game using the Arcane rendering API.
 * Uses solid-color placeholder textures (no art assets needed).
 */

import { createSokobanGame } from "./sokoban.ts";
import type { Direction, SokobanState } from "./sokoban.ts";
import type { Vec2 } from "../../runtime/state/index.ts";
import {
  setCamera,
  isKeyPressed,
  getViewportSize,
  drawSprite,
} from "../../runtime/rendering/index.ts";
import { Colors, HUDLayout } from "../../runtime/ui/index.ts";
import { createGame, hud } from "../../runtime/game/index.ts";
import { rgb } from "../../runtime/ui/types.ts";

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

// --- Colors for placeholder tiles ---

const COL_WALL = rgb(80, 80, 100);
const COL_FLOOR = rgb(40, 40, 50);
const COL_PLAYER = rgb(50, 150, 255);
const COL_BOX = rgb(200, 150, 50);
const COL_GOAL = rgb(255, 80, 80);
const COL_BOX_ON_GOAL = rgb(50, 200, 50);

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

// --- Game Bootstrap ---

const app = createGame({ name: "sokoban" });

// --- Frame loop ---

app.onFrame((ctx) => {
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

  // Center camera on the grid using viewport size
  const { width: vpW, height: vpH } = getViewportSize();
  setCamera(vpW / 2, vpH / 2, 1);

  // Draw tiles
  for (let y = 0; y < current.height; y++) {
    for (let x = 0; x < current.width; x++) {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      const tile = current.tiles[y][x];

      if (tile === "wall") {
        drawSprite({
          color: COL_WALL,
          x: px,
          y: py,
          w: TILE_SIZE,
          h: TILE_SIZE,
          layer: 0,
        });
      } else {
        drawSprite({
          color: COL_FLOOR,
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
      color: COL_GOAL,
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
      color: onGoal ? COL_BOX_ON_GOAL : COL_BOX,
      x: box_.x * TILE_SIZE + 2,
      y: box_.y * TILE_SIZE + 2,
      w: TILE_SIZE - 4,
      h: TILE_SIZE - 4,
      layer: 2,
    });
  }

  // Draw player (layer 3, on top)
  drawSprite({
    color: COL_PLAYER,
    x: current.player.x * TILE_SIZE + 4,
    y: current.player.y * TILE_SIZE + 4,
    w: TILE_SIZE - 8,
    h: TILE_SIZE - 8,
    layer: 3,
  });

  // --- HUD (screen space) ---

  // Move counter
  hud.text(`Moves: ${current.moves}`, HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y);

  // Progress bar (boxes on goals)
  const boxesOnGoals = current.boxes.filter((box: Vec2) =>
    current.goals.some((g: Vec2) => g.x === box.x && g.y === box.y)
  ).length;
  const progress = current.goals.length > 0 ? boxesOnGoals / current.goals.length : 0;
  hud.bar(
    HUDLayout.TOP_LEFT.x,
    HUDLayout.TOP_LEFT.y + HUDLayout.LINE_HEIGHT,
    progress,
    { width: 100 },
  );

  // Progress text
  hud.text(`${boxesOnGoals}/${current.goals.length} boxes`, HUDLayout.TOP_LEFT.x + 105, HUDLayout.TOP_LEFT.y + HUDLayout.LINE_HEIGHT, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
  });

  // Controls hint
  hud.text("WASD/Arrows=Move  Z=Undo  R=Reset", HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y + HUDLayout.LINE_HEIGHT * 2, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.LIGHT_GRAY,
  });

  // Victory screen
  if (current.won) {
    hud.label(`VICTORY! ${current.moves} moves`, vpW / 2, vpH / 2 - 20, {
      textColor: Colors.WIN,
      padding: 12,
      align: "center",
    });
  }
});
