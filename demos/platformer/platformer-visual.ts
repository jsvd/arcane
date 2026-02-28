import {
  createPlatformerGame, stepPhysics, movePlayer, jump,
  PLAYER_W, PLAYER_H,
} from "./platformer.ts";
import type { PlatformerState } from "./platformer.ts";
import {
  followTargetSmooth,
  isKeyDown, isKeyPressed,
  drawSprite,
} from "../../runtime/rendering/index.ts";
import { Colors, HUDLayout } from "../../runtime/ui/index.ts";
import { createGame, hud } from "../../runtime/game/index.ts";
import { rgb } from "../../runtime/ui/index.ts";

// --- Colors ---
const COL_PLAYER = rgb(100, 180, 255);
const COL_PLATFORM = rgb(80, 60, 40);
const COL_GROUND = rgb(60, 120, 40);
const COL_COIN = rgb(255, 220, 50);
const COL_BG = rgb(30, 30, 50);

// --- State ---
let state = createPlatformerGame();

// --- Game setup ---
const game = createGame({ name: "platformer", autoCamera: false });

game.state<PlatformerState>({
  get: () => state,
  set: (s) => { state = s; },
  describe: (s, opts) => {
    if (opts.verbosity === "minimal") {
      return `Score: ${s.score}, Lives: ${s.lives}, Phase: ${s.phase}`;
    }
    const coinsLeft = s.coins.filter((c) => !c.collected).length;
    return `Score: ${s.score} | Lives: ${s.lives} | Coins left: ${coinsLeft} | Phase: ${s.phase} | Pos: (${s.playerX.toFixed(0)},${s.playerY.toFixed(0)}) | OnGround: ${s.onGround}`;
  },
  actions: {
    jump: {
      handler: (s) => jump(s),
      description: "Jump (only works when on ground)",
    },
    moveLeft: {
      handler: (s) => movePlayer(s, -1, 1 / 60),
      description: "Move player left one step",
    },
    moveRight: {
      handler: (s) => movePlayer(s, 1, 1 / 60),
      description: "Move player right one step",
    },
  },
});

// --- Game loop ---
game.onFrame((ctx) => {
  if (state.phase === "playing") {
    // Input
    let dir: -1 | 0 | 1 = 0;
    if (isKeyDown("ArrowLeft") || isKeyDown("a")) dir = -1;
    if (isKeyDown("ArrowRight") || isKeyDown("d")) dir = 1;
    state = movePlayer(state, dir, ctx.dt);

    if (isKeyPressed("Space") || isKeyPressed("ArrowUp") || isKeyPressed("w")) {
      state = jump(state);
    }

    // Physics
    state = stepPhysics(state, ctx.dt);
  }

  // Restart
  if (isKeyPressed("r") || isKeyPressed("R")) {
    if (state.phase === "won" || state.phase === "dead") {
      state = createPlatformerGame();
    }
  }

  // Camera follows player with smooth interpolation
  const { width: vpW, height: vpH } = ctx.viewport;
  followTargetSmooth(
    Math.max(vpW / 2, Math.min(state.playerX, vpW / 2)),
    Math.max(vpH / 2, Math.min(state.playerY, vpH / 2)),
    1.0,   // zoom
    0.1,   // smoothness
  );

  // --- Render ---

  // Background
  drawSprite({ color: COL_BG, x: -100, y: -100, w: 1000, h: 800, layer: 0 });

  // Platforms
  for (const plat of state.platforms) {
    const col = plat.h >= 40 ? COL_GROUND : COL_PLATFORM;
    drawSprite({
      color: col,
      x: plat.x, y: plat.y, w: plat.w, h: plat.h,
      layer: 1,
    });
  }

  // Coins
  for (const coin of state.coins) {
    if (coin.collected) continue;
    drawSprite({
      color: COL_COIN,
      x: coin.x, y: coin.y, w: 16, h: 16,
      layer: 2,
    });
  }

  // Player
  const playerTint = state.facing === "left"
    ? { r: 0.8, g: 0.9, b: 1, a: 1 }
    : { r: 1, g: 1, b: 1, a: 1 };
  drawSprite({
    color: COL_PLAYER,
    x: state.playerX, y: state.playerY, w: PLAYER_W, h: PLAYER_H,
    layer: 3,
    tint: playerTint,
  });

  // --- HUD (screen space) ---

  // Score text
  hud.text(`Score: ${state.score}`, HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y);

  // Lives bar
  hud.bar(
    HUDLayout.TOP_LEFT.x,
    HUDLayout.TOP_LEFT.y + HUDLayout.LINE_HEIGHT,
    state.lives / 3,
  );

  // Phase indicator
  if (state.phase === "won") {
    hud.label("YOU WIN! Press R to restart", vpW / 2, vpH / 2 - 20, {
      textColor: Colors.WIN,
      padding: 12,
      align: "center",
    });
  } else if (state.phase === "dead") {
    hud.label("GAME OVER! Press R to restart", vpW / 2, vpH / 2 - 20, {
      textColor: Colors.LOSE,
      scale: 2,
      align: "center",
    });
  }
});
