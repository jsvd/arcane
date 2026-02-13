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
  createAnimation,
  playAnimation,
  updateAnimation,
  drawAnimatedSprite,
  resetAnimation,
} from "../../runtime/rendering/index.ts";
import type { AnimationState } from "../../runtime/rendering/index.ts";
import { Colors } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";

// --- Types ---
type State = {
  x: number;
  y: number;
  dirX: number;     // -1, 0, or 1 (left, idle, right)
  dirY: number;     // -1, 0, or 1 (up, idle, down)
  walkAnim: AnimationState;
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
// Real sprite is 256×128 (8 frames per direction × 4 directions = 32×32 per frame)
//
// Spritesheet grid layout (detected by arcane assets inspect):
//   Row 0: Up/North animations (frames 0-7)
//   Row 1: Down/South animations (frames 8-15)
//   Row 2: Left/West animations (frames 16-23)
//   Row 3: Right/East animations (frames 24-31)
//
// Detected by: arcane assets inspect --json
// Output: { "likely_grid": [8, 4], "likely_frame_count": 32 }
//
const FRAME_SIZE = 32;        // Size in spritesheet (32×32)
const DISPLAY_SIZE = 96;       // Size to draw (3x bigger)
const COLS = 8;               // 8 animation frames per direction
const ROWS = 4;               // 4 directions (up, down, left, right)
const WALK_FPS = 10;

// Create animation
const walkAnimDef = createAnimation(
  characterTexture,
  FRAME_SIZE,
  FRAME_SIZE,
  assetsExist ? 8 : 4,   // 8 frames per direction for real sprite, 4 for placeholder
  WALK_FPS,
  { loop: true }
);

// --- Initial State ---
const state: State = {
  x: 400,
  y: 300,
  dirX: 0,  // not moving horizontally
  dirY: 0,  // not moving vertically (start facing down)
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
    state.dirX = s.dirX;
    state.dirY = s.dirY;
    state.isWalking = s.isWalking;
  },
  describe: (s) => {
    const assetStatus = s.assetsLoaded ? "real assets" : "placeholder";
    const dir = s.dirY === -1 ? "up" : s.dirY === 1 ? "down" : s.dirX === -1 ? "left" : s.dirX === 1 ? "right" : "idle";
    return `Character at (${s.x.toFixed(0)}, ${s.y.toFixed(0)}), facing ${dir}, ${s.isWalking ? "walking" : "idle"} [${assetStatus}]`;
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

  // Update facing direction (which row to show)
  // Prioritize vertical over horizontal for direction
  if (dy !== 0) {
    state.dirY = dy > 0 ? 1 : -1;  // 1 = down, -1 = up
    state.dirX = 0;
  } else if (dx !== 0) {
    state.dirX = dx > 0 ? 1 : -1;  // 1 = right, -1 = left
    state.dirY = 0;
  }

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

  // Draw character (3x bigger than spritesheet size)
  // Determine which row based on direction
  let row = 1;  // Default: down/south (row 1)
  if (state.dirY === -1) row = 1;      // Up/North (row 1) - swapped
  else if (state.dirY === 1) row = 0;   // Down/South (row 0) - swapped
  else if (state.dirX === -1) row = 2;  // Left/West (row 2)
  else if (state.dirX === 1) row = 3;   // Right/East (row 3)

  const uvY = row / ROWS;
  const uvH = 1 / ROWS;

  if (state.isWalking) {
    // Animated sprite when walking - manually calculate UV for current frame
    if (assetsExist) {
      const frameNum = state.walkAnim.frame;
      const uvX = (frameNum % COLS) / COLS;
      const uvW = 1 / COLS;

      drawSprite({
        textureId: characterTexture,
        x: state.x - DISPLAY_SIZE / 2,
        y: state.y - DISPLAY_SIZE / 2,
        w: DISPLAY_SIZE,
        h: DISPLAY_SIZE,
        uv: { x: uvX, y: uvY, w: uvW, h: uvH },
        layer: 1,
      });
    } else {
      // Placeholder animation
      drawAnimatedSprite(
        state.walkAnim,
        state.x - DISPLAY_SIZE / 2,
        state.y - DISPLAY_SIZE / 2,
        DISPLAY_SIZE,
        DISPLAY_SIZE,
        {
          layer: 1,
        },
      );
    }
  } else {
    // Static idle frame (frame 0) - show first frame of current direction
    const idleUvX = 0;
    drawSprite({
      textureId: characterTexture,
      x: state.x - DISPLAY_SIZE / 2,
      y: state.y - DISPLAY_SIZE / 2,
      w: DISPLAY_SIZE,
      h: DISPLAY_SIZE,
      uv: assetsExist ? { x: idleUvX, y: uvY, w: 1 / COLS, h: uvH } : undefined,
      layer: 1,
    });
  }

  // --- HUD ---
  const assetStatus = state.assetsLoaded
    ? "✓ Real assets loaded (256×128 spritesheet)"
    : "ℹ Using placeholders (see README.md)";

  drawText(assetStatus, 10, 10, {
    scale: 2,
    tint: state.assetsLoaded ? Colors.SUCCESS : Colors.WARNING,
    layer: 100,
    screenSpace: true,
  });

  // Show detected spritesheet grid info (what arcane assets inspect shows)
  if (state.assetsLoaded) {
    drawText(`Grid: ${COLS} cols × ${ROWS} rows = ${COLS * ROWS} frames @ ${FRAME_SIZE}×${FRAME_SIZE} px`, 10, 35, {
      scale: 1.5,
      tint: Colors.LIGHT_GRAY,
      layer: 100,
      screenSpace: true,
    });
  }

  drawText("Arrow Keys: Move  |  Space: Sound  |  R: Reset", 10, 60, {
    scale: 1.5,
    tint: Colors.LIGHT_GRAY,
    layer: 100,
    screenSpace: true,
  });

  const dirText = state.dirY === -1 ? "Up" : state.dirY === 1 ? "Down" : state.dirX === -1 ? "Left" : state.dirX === 1 ? "Right" : "Idle";
  const statusText = state.isWalking ? `Walking ${dirText}` : `Idle (${dirText})`;
  drawText(`Status: ${statusText}`, 10, 85, {
    scale: 2,
    tint: Colors.INFO,
    layer: 100,
    screenSpace: true,
  });

  if (state.assetsLoaded && state.isWalking) {
    const frameNum = state.walkAnim.frame;
    const dirRow = state.dirY === -1 ? 0 : state.dirY === 1 ? 1 : state.dirX === -1 ? 2 : 3;
    drawText(`Frame: ${frameNum + 1}/${COLS} from Row ${dirRow}`, 10, 110, {
      scale: 1.5,
      tint: Colors.LIGHT_GRAY,
      layer: 100,
      screenSpace: true,
    });
  }
});
