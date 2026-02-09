import {
  createPlatformerGame, stepPhysics, movePlayer, jump,
  PLAYER_W, PLAYER_H, MOVE_SPEED,
} from "./platformer.ts";
import type { PlatformerState } from "./platformer.ts";
import {
  onFrame, clearSprites, drawSprite, setCamera, followTarget,
  isKeyDown, isKeyPressed, getDeltaTime, createSolidTexture,
  createAnimation, playAnimation, updateAnimation, drawAnimatedSprite,
  loadSound, playSound,
  drawText, measureText,
} from "../../runtime/rendering/index.ts";
import { drawRect, drawBar, drawLabel } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";

// --- Textures ---
const TEX_PLAYER = createSolidTexture("player", 100, 180, 255);
const TEX_PLATFORM = createSolidTexture("platform", 80, 60, 40);
const TEX_GROUND = createSolidTexture("ground", 60, 120, 40);
const TEX_COIN = createSolidTexture("coin", 255, 220, 50);
const TEX_BG = createSolidTexture("bg", 30, 30, 50);

// --- State ---
let state = createPlatformerGame();

// --- Agent protocol ---
registerAgent<PlatformerState>({
  name: "platformer",
  getState: () => state,
  setState: (s) => { state = s; },
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

// --- Camera ---
setCamera(400, 300, 1);

// --- Game loop ---
onFrame(() => {
  const dt = getDeltaTime();

  if (state.phase === "playing") {
    // Input
    let dir: -1 | 0 | 1 = 0;
    if (isKeyDown("ArrowLeft") || isKeyDown("a")) dir = -1;
    if (isKeyDown("ArrowRight") || isKeyDown("d")) dir = 1;
    state = movePlayer(state, dir, dt);

    if (isKeyPressed("Space") || isKeyPressed("ArrowUp") || isKeyPressed("w")) {
      state = jump(state);
    }

    // Physics
    state = stepPhysics(state, dt);
  }

  // Restart
  if (isKeyPressed("r") || isKeyPressed("R")) {
    if (state.phase === "won" || state.phase === "dead") {
      state = createPlatformerGame();
    }
  }

  // Camera follows player
  followTarget(
    Math.max(400, Math.min(state.playerX, 400)),
    Math.max(300, Math.min(state.playerY, 300)),
  );

  // --- Render ---
  clearSprites();

  // Background
  drawSprite({ textureId: TEX_BG, x: -100, y: -100, w: 1000, h: 800, layer: 0 });

  // Platforms
  for (const plat of state.platforms) {
    const tex = plat.h >= 40 ? TEX_GROUND : TEX_PLATFORM;
    drawSprite({
      textureId: tex,
      x: plat.x, y: plat.y, w: plat.w, h: plat.h,
      layer: 1,
    });
  }

  // Coins
  for (const coin of state.coins) {
    if (coin.collected) continue;
    drawSprite({
      textureId: TEX_COIN,
      x: coin.x, y: coin.y, w: 16, h: 16,
      layer: 2,
    });
  }

  // Player
  const playerTint = state.facing === "left"
    ? { r: 0.8, g: 0.9, b: 1, a: 1 }
    : { r: 1, g: 1, b: 1, a: 1 };
  drawSprite({
    textureId: TEX_PLAYER,
    x: state.playerX, y: state.playerY, w: PLAYER_W, h: PLAYER_H,
    layer: 3,
    tint: playerTint,
  });

  // --- HUD (screen space) ---

  // Score text
  drawText(`Score: ${state.score}`, 10, 10, {
    scale: 2,
    tint: { r: 1, g: 1, b: 1, a: 1 },
    layer: 100,
    screenSpace: true,
  });

  // Lives bar
  drawBar(10, 35, 80, 12, state.lives / 3, {
    fillColor: { r: 0.2, g: 0.8, b: 0.2, a: 1 },
    bgColor: { r: 0.3, g: 0.1, b: 0.1, a: 0.8 },
    borderColor: { r: 0.6, g: 0.6, b: 0.6, a: 1 },
    borderWidth: 1,
    layer: 100,
    screenSpace: true,
  });

  // Phase indicator
  if (state.phase === "won") {
    drawLabel("YOU WIN! Press R to restart", 250, 280, {
      textColor: { r: 1, g: 1, b: 0, a: 1 },
      bgColor: { r: 0, g: 0.2, b: 0, a: 0.9 },
      padding: 8,
      scale: 2,
      layer: 110,
      screenSpace: true,
    });
  } else if (state.phase === "dead") {
    drawLabel("GAME OVER! Press R to restart", 240, 280, {
      textColor: { r: 1, g: 0.2, b: 0.2, a: 1 },
      bgColor: { r: 0.2, g: 0, b: 0, a: 0.9 },
      padding: 8,
      scale: 2,
      layer: 110,
      screenSpace: true,
    });
  }
});
