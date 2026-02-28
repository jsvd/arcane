import { createRoguelikeGame, movePlayer } from "./roguelike.ts";
import type { Direction, RoguelikeState } from "./roguelike.ts";
import { WALL, FLOOR, CORRIDOR, STAIRS_DOWN } from "./dungeon.ts";
import {
  setCamera, isKeyPressed,
  setAmbientLight, addPointLight, clearLights,
  drawSprite,
} from "../../runtime/rendering/index.ts";
import { Colors } from "../../runtime/ui/index.ts";
import { rgb } from "../../runtime/ui/types.ts";
import { createGame, hud } from "../../runtime/game/index.ts";

const TILE_SIZE = 16;
const SEED = 12345;

// Colors for tiles
const COL_WALL = rgb(60, 60, 80);
const COL_FLOOR = rgb(140, 120, 100);
const COL_CORRIDOR = rgb(120, 110, 90);
const COL_STAIRS = rgb(255, 255, 100);
const COL_PLAYER = rgb(60, 180, 255);
const COL_ENEMY = rgb(255, 60, 60);
const COL_EXPLORED = rgb(40, 40, 55);

let state = createRoguelikeGame(SEED);

// --- Game setup ---
const game = createGame({ name: "roguelike", autoCamera: false, autoClear: true });

game.state<RoguelikeState>({
  get: () => state,
  set: (s) => { state = s; },
  describe: (s, opts) => {
    if (opts.verbosity === "minimal") {
      return `Turn ${s.turn}, HP: ${s.player.hp}/${s.player.maxHp}, Phase: ${s.phase}`;
    }
    const alive = s.entities.filter((e) => e.hp > 0).length;
    return `Turn ${s.turn} | HP: ${s.player.hp}/${s.player.maxHp} | Pos: (${s.player.pos.x},${s.player.pos.y}) | Enemies alive: ${alive} | Phase: ${s.phase}`;
  },
  actions: {
    move: {
      handler: (s, args) => movePlayer(s, (args.direction as Direction) ?? "wait"),
      description: "Move the player in a direction",
      args: [{ name: "direction", type: "string", description: "up, down, left, right, or wait" }],
    },
    wait: {
      handler: (s) => movePlayer(s, "wait"),
      description: "Wait one turn",
    },
  },
});

// Input mapping
const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  Space: "wait",
};

game.onFrame(() => {
  // Handle input
  for (const [key, dir] of Object.entries(KEY_MAP)) {
    if (isKeyPressed(key)) {
      state = movePlayer(state, dir);
      break;
    }
  }

  // Camera follows player
  setCamera(
    state.player.pos.x * TILE_SIZE + TILE_SIZE / 2,
    state.player.pos.y * TILE_SIZE + TILE_SIZE / 2,
    2,
  );

  // Lighting
  clearLights();
  setAmbientLight(0.05, 0.05, 0.08);
  addPointLight(
    state.player.pos.x * TILE_SIZE + TILE_SIZE / 2,
    state.player.pos.y * TILE_SIZE + TILE_SIZE / 2,
    TILE_SIZE * 10,
    1.0, 0.9, 0.7,
    1.0,
  );

  // Render
  const { dungeon, fov, entities, player } = state;

  // Draw tiles
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (fov.visible[y][x]) {
        // Currently visible -- full brightness
        let col = COL_FLOOR;
        if (tile === WALL) col = COL_WALL;
        else if (tile === FLOOR) col = COL_FLOOR;
        else if (tile === CORRIDOR) col = COL_CORRIDOR;
        else if (tile === STAIRS_DOWN) col = COL_STAIRS;

        drawSprite({ color: col, x: px, y: py, w: TILE_SIZE, h: TILE_SIZE, layer: 0 });
      } else if (fov.explored[y][x]) {
        // Explored but not visible -- dark tint
        drawSprite({
          color: COL_EXPLORED,
          x: px, y: py, w: TILE_SIZE, h: TILE_SIZE,
          layer: 0,
        });
      }
      // Unexplored: draw nothing
    }
  }

  // Draw entities
  for (const entity of entities) {
    if (entity.hp <= 0) continue;
    if (!fov.visible[entity.pos.y]?.[entity.pos.x]) continue;

    drawSprite({
      color: COL_ENEMY,
      x: entity.pos.x * TILE_SIZE + 2,
      y: entity.pos.y * TILE_SIZE + 2,
      w: TILE_SIZE - 4,
      h: TILE_SIZE - 4,
      layer: 2,
    });
  }

  // Draw player
  drawSprite({
    color: COL_PLAYER,
    x: player.pos.x * TILE_SIZE + 2,
    y: player.pos.y * TILE_SIZE + 2,
    w: TILE_SIZE - 4,
    h: TILE_SIZE - 4,
    layer: 3,
  });

  // --- HUD (screen space) ---

  // Turn counter
  hud.text(`Turn: ${state.turn}`, 10, 10);

  // HP bar
  const hpRatio = state.player.hp / state.player.maxHp;
  const hpColor = hpRatio > 0.5 ? Colors.SUCCESS : hpRatio > 0.25 ? Colors.WARNING : Colors.DANGER;
  hud.bar(
    10,
    35,
    hpRatio,
    {
      width: 100,
      height: 12,
      fillColor: hpColor,
      bgColor: Colors.HUD_BG,
      borderColor: Colors.LIGHT_GRAY,
      borderWidth: 1,
    }
  );

  // HP text
  hud.text(`HP: ${state.player.hp}/${state.player.maxHp}`, 115, 35, {
    scale: 1.5,
  });

  // Enemies alive
  const alive = state.entities.filter((e) => e.hp > 0).length;
  hud.text(`Enemies: ${alive}`, 10, 60, {
    scale: 1.5,
    tint: Colors.INFO,
  });

  // Controls hint
  hud.text("WASD/Arrows=Move  Space=Wait", 10, 72.5, {
    scale: 1.5,
    tint: Colors.LIGHT_GRAY,
  });

  // Game over screen
  if (state.phase === "lost") {
    hud.label("DEFEATED! Refresh to restart", 400 - 160, 300 - 20, {
      textColor: Colors.LOSE,
      bgColor: Colors.HUD_BG,
      padding: 12,
    });
  }
});
