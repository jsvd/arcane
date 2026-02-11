/**
 * Sprite Demo - Asset Loading Validation
 *
 * Demonstrates loading real sprite sheets and sound effects.
 * Falls back to colored squares if assets are missing.
 */

import {
  onFrame,
  clearSprites,
  drawSprite,
  setCamera,
  isKeyDown,
  isKeyPressed,
  getDeltaTime,
  loadTexture,
  createSolidTexture,
  loadSound,
  playSound,
  drawText,
} from "../../runtime/rendering/index.ts";
import {
  createAnimation,
  playAnimation,
  updateAnimation,
  drawAnimatedSprite,
  resetAnimation,
} from "../../runtime/rendering/index.ts";
import { Colors } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";

// --- Types ---
type State = {
  x: number;
  y: number;
  facingRight: boolean;
  walkAnim: any; // AnimationState
  isWalking: boolean;
  assetsLoaded: boolean;
};

// --- Asset Loading ---
// Try to load real assets, fall back to placeholders
// Paths are relative to the entry script directory
const SPRITE_PATH = "assets/character.png";
const SOUND_PATH = "assets/jump.wav";

let characterTexture = 0;
let jumpSound = 0;
let assetsExist = false;

// Try loading sprite sheet
try {
  characterTexture = loadTexture(SPRITE_PATH);
  if (characterTexture > 0) {
    console.log("✓ Loaded sprite sheet:", SPRITE_PATH);
    assetsExist = true;
  }
} catch (e) {
  console.log("ℹ Sprite sheet not found, using placeholder");
}

// Fallback to solid color if no sprite sheet
if (characterTexture === 0) {
  characterTexture = createSolidTexture("player", 50, 150, 255);
}

// Try loading sound
try {
  jumpSound = loadSound(SOUND_PATH);
  if (jumpSound > 0) {
    console.log("✓ Loaded sound:", SOUND_PATH);
  }
} catch (e) {
  console.log("ℹ Sound not found, will be silent");
}

// --- Animation Setup ---
// Real sprite is 192×128 (6 frames × 4 rows = 32×32 per frame)
// This demonstrates multi-row spritesheet support detected by arcane assets inspect
//
// Spritesheet grid layout:
//   Row 0: Idle animations (frames 0-5)
//   Row 1: Walk animations (frames 6-11)
//   Row 2: Jump animations (frames 12-17)
//   Row 3: Fall/death animations (frames 18-23)
//
// Detected by: arcane assets inspect --json
// Output: { "likely_grid": [6, 4], "likely_frame_count": 24 }
//
const FRAME_SIZE = 32;
const COLS = 6;
const ROWS = 4;
const WALK_FPS = 10;

// For real asset: use all 24 frames in a 6×4 grid
// For placeholder: still works with single-row fallback
const walkAnimDef = createAnimation(
  characterTexture,
  FRAME_SIZE,
  FRAME_SIZE,
  assetsExist ? COLS * ROWS : 4,
  WALK_FPS,
  assetsExist ? { loop: true, cols: COLS, rows: ROWS } : { loop: true },
);

// --- Initial State ---
const state: State = {
  x: 400,
  y: 300,
  facingRight: true,
  walkAnim: playAnimation(walkAnimDef),
  isWalking: false,
  assetsLoaded: assetsExist,
};

// --- Camera ---
setCamera(400, 300, 1);

// --- Agent Protocol ---
registerAgent<State>({
  name: "sprite-demo",
  getState: () => state,
  setState: (s) => {
    state.x = s.x;
    state.y = s.y;
    state.facingRight = s.facingRight;
    state.isWalking = s.isWalking;
  },
  describe: (s) => {
    const assetStatus = s.assetsLoaded ? "real assets" : "placeholder";
    return `Character at (${s.x.toFixed(0)}, ${s.y.toFixed(0)}), facing ${s.facingRight ? "right" : "left"}, ${s.isWalking ? "walking" : "idle"} [${assetStatus}]`;
  },
  actions: {
    move: {
      handler: (s, args) => {
        s.x = args.x as number;
        s.y = args.y as number;
        return s;
      },
      description: "Move character to position",
      args: [
        { name: "x", type: "number" },
        { name: "y", type: "number" },
      ],
    },
    jump: {
      handler: (s) => {
        if (jumpSound > 0) {
          playSound(jumpSound, { volume: 0.5 });
        }
        return s;
      },
      description: "Play jump sound",
    },
  },
});

// --- Game Loop ---
const MOVE_SPEED = 150; // pixels per second

onFrame(() => {
  const dt = getDeltaTime();

  // --- Input ---
  let dx = 0;
  let dy = 0;

  if (isKeyDown("ArrowLeft")) dx -= 1;
  if (isKeyDown("ArrowRight")) dx += 1;
  if (isKeyDown("ArrowUp")) dy -= 1;
  if (isKeyDown("ArrowDown")) dy += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // Update position
  state.x += dx * MOVE_SPEED * dt;
  state.y += dy * MOVE_SPEED * dt;

  // Update facing direction
  if (dx > 0) state.facingRight = true;
  if (dx < 0) state.facingRight = false;

  // Update walk state
  const wasWalking = state.isWalking;
  state.isWalking = dx !== 0 || dy !== 0;

  // Reset animation when starting/stopping
  if (state.isWalking && !wasWalking) {
    state.walkAnim = resetAnimation(state.walkAnim);
  }

  // Update animation when walking
  if (state.isWalking) {
    state.walkAnim = updateAnimation(state.walkAnim, dt);
  }

  // Play sound on spacebar
  if (isKeyPressed("Space")) {
    if (jumpSound > 0) {
      playSound(jumpSound, { volume: 0.5 });
    }
  }

  // Reset position
  if (isKeyPressed("r") || isKeyPressed("R")) {
    state.x = 400;
    state.y = 300;
  }

  // --- Render ---
  clearSprites();

  // Draw character
  if (state.isWalking) {
    // Animated sprite when walking
    drawAnimatedSprite(
      state.walkAnim,
      state.x - FRAME_SIZE / 2,
      state.y - FRAME_SIZE / 2,
      FRAME_SIZE,
      FRAME_SIZE,
      {
        layer: 1,
        // TODO: Add flipX support to SpriteOptions
      },
    );
  } else {
    // Static idle frame (frame 0)
    drawSprite({
      textureId: characterTexture,
      x: state.x - FRAME_SIZE / 2,
      y: state.y - FRAME_SIZE / 2,
      w: FRAME_SIZE,
      h: FRAME_SIZE,
      uv: assetsExist ? { x: 0, y: 0, w: 1 / 6, h: 1 / 4 } : undefined, // First frame (top-left) of 6×4 grid
      layer: 1,
      // TODO: Add flipX support to SpriteOptions
    });
  }

  // --- HUD ---
  const assetStatus = state.assetsLoaded
    ? "✓ Real assets loaded (192×128 spritesheet)"
    : "ℹ Using placeholders (see README.md)";

  drawText(assetStatus, 10, 10, {
    scale: 1,
    tint: state.assetsLoaded ? Colors.SUCCESS : Colors.WARNING,
    layer: 100,
    screenSpace: true,
  });

  // Show detected spritesheet grid info (what arcane assets inspect shows)
  if (state.assetsLoaded) {
    drawText(`Grid: ${COLS} cols × ${ROWS} rows = ${COLS * ROWS} frames @ ${FRAME_SIZE}×${FRAME_SIZE} px`, 10, 25, {
      scale: 0.8,
      tint: Colors.LIGHT_GRAY,
      layer: 100,
      screenSpace: true,
    });
  }

  drawText("Arrow Keys: Move  |  Space: Sound  |  R: Reset", 10, 40, {
    scale: 1,
    tint: Colors.LIGHT_GRAY,
    layer: 100,
    screenSpace: true,
  });

  const statusText = state.isWalking ? "Walking (Row 1)" : "Idle (Row 0)";
  drawText(`Status: ${statusText}`, 10, 55, {
    scale: 1,
    tint: Colors.INFO,
    layer: 100,
    screenSpace: true,
  });

  if (state.assetsLoaded && state.isWalking) {
    const frameNum = state.walkAnim.frame;
    const row = Math.floor(frameNum / COLS);
    const col = frameNum % COLS;
    drawText(`Frame: ${frameNum + 1}/${COLS * ROWS} (col ${col}, row ${row})`, 10, 70, {
      scale: 0.8,
      tint: Colors.LIGHT_GRAY,
      layer: 100,
      screenSpace: true,
    });
  }
});
