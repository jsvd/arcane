import { createRoguelikeGame, movePlayer } from "./roguelike.ts";
import type { Direction, RoguelikeState } from "./roguelike.ts";
import { WALL, FLOOR, CORRIDOR, STAIRS_DOWN } from "./dungeon.ts";
import {
  onFrame, drawSprite, clearSprites, setCamera,
  isKeyPressed, createSolidTexture,
  createTilemap, setTile, drawTilemap,
  setAmbientLight, addPointLight, clearLights,
} from "../../runtime/rendering/index.ts";
import type { TilemapId } from "../../runtime/rendering/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";

const TILE_SIZE = 16;
const SEED = 12345;

// Textures -- solid colors for tiles
const TEX_WALL = createSolidTexture("wall_tile", 60, 60, 80);
const TEX_FLOOR = createSolidTexture("floor_tile", 140, 120, 100);
const TEX_CORRIDOR = createSolidTexture("corridor_tile", 120, 110, 90);
const TEX_STAIRS = createSolidTexture("stairs_tile", 255, 255, 100);
const TEX_PLAYER = createSolidTexture("player", 60, 180, 255);
const TEX_ENEMY = createSolidTexture("enemy", 255, 60, 60);
const TEX_EXPLORED = createSolidTexture("explored", 40, 40, 55);

let state = createRoguelikeGame(SEED);

// Agent protocol
registerAgent<RoguelikeState>({
  name: "roguelike",
  getState: () => state,
  setState: (s) => { state = s; },
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

onFrame(() => {
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
  clearSprites();

  const { dungeon, fov, entities, player } = state;

  // Draw tiles
  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (fov.visible[y][x]) {
        // Currently visible -- full brightness
        let tex: number;
        if (tile === WALL) tex = TEX_WALL;
        else if (tile === FLOOR) tex = TEX_FLOOR;
        else if (tile === CORRIDOR) tex = TEX_CORRIDOR;
        else if (tile === STAIRS_DOWN) tex = TEX_STAIRS;
        else tex = TEX_FLOOR;

        drawSprite({ textureId: tex, x: px, y: py, w: TILE_SIZE, h: TILE_SIZE, layer: 0 });
      } else if (fov.explored[y][x]) {
        // Explored but not visible -- dark tint
        drawSprite({
          textureId: TEX_EXPLORED,
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
      textureId: TEX_ENEMY,
      x: entity.pos.x * TILE_SIZE + 2,
      y: entity.pos.y * TILE_SIZE + 2,
      w: TILE_SIZE - 4,
      h: TILE_SIZE - 4,
      layer: 2,
    });
  }

  // Draw player
  drawSprite({
    textureId: TEX_PLAYER,
    x: player.pos.x * TILE_SIZE + 2,
    y: player.pos.y * TILE_SIZE + 2,
    w: TILE_SIZE - 4,
    h: TILE_SIZE - 4,
    layer: 3,
  });
});
