/**
 * Juice Showcase Demo - Phase 9
 *
 * Demonstrates all the "juice" features:
 * - Tweening with various easing functions
 * - Camera shake
 * - Screen flash
 * - Particle effects
 *
 * Controls:
 * - Click different buttons to trigger effects
 * - Space: Toggle juice on/off (compare before/after)
 */

import {
  onFrame,
  clearSprites,
  drawSprite,
  setCamera,
  getCamera,
  isKeyPressed,
  getDeltaTime,
  createSolidTexture,
  getMousePosition,
  getMouseWorldPosition,
  drawText,
} from "../../runtime/rendering/index.ts";
import { Colors, HUDLayout, drawPanel, drawLabel } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";
import {
  tween,
  updateTweens,
  easeInBounce,
  easeOutBounce,
  easeInElastic,
  easeOutElastic,
  easeInBack,
  easeOutBack,
  shakeCamera,
  getCameraShakeOffset,
  flashScreen,
  getScreenFlash,
} from "../../runtime/tweening/index.ts";
import {
  createEmitter,
  updateParticles,
  getAllParticles,
  addAffector,
} from "../../runtime/particles/index.ts";
import type { EmitterConfig } from "../../runtime/particles/index.ts";

// --- Textures ---
const TEX_BOX = createSolidTexture("box", 100, 150, 255);
const TEX_BUTTON = createSolidTexture("button", 80, 120, 200);
const TEX_PARTICLE = createSolidTexture("particle", 255, 255, 255);
const TEX_BG = createSolidTexture("bg", 40, 40, 50);

// --- State ---
interface DemoState {
  juiceEnabled: boolean;
  selectedTool: "none" | "explosion" | "trail";
  boxes: Array<{
    x: number;
    y: number;
    scale: number;
    targetScale: number;
  }>;
  buttons: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    action: () => void;
  }>;
}

const state: DemoState = {
  juiceEnabled: true,
  selectedTool: "none",
  boxes: [
    { x: 200, y: 250, scale: 1, targetScale: 1 },
    { x: 400, y: 250, scale: 1, targetScale: 1 },
    { x: 600, y: 250, scale: 1, targetScale: 1 },
  ],
  buttons: [],
};

// Initialize buttons
state.buttons = [
  {
    x: 40,
    y: 420,
    w: 110,
    h: 40,
    label: "Bounce",
    action: () => {
      if (state.juiceEnabled) {
        tween(state.boxes[0], { scale: 1.5 }, 0.5, {
          easing: easeOutBounce,
        });
        tween(state.boxes[0], { scale: 1 }, 0.5, {
          delay: 0.5,
          easing: easeInBounce,
        });
      }
    },
  },
  {
    x: 160,
    y: 420,
    w: 110,
    h: 40,
    label: "Elastic",
    action: () => {
      if (state.juiceEnabled) {
        tween(state.boxes[1], { scale: 1.5 }, 0.5, {
          easing: easeOutElastic,
        });
        tween(state.boxes[1], { scale: 1 }, 0.5, {
          delay: 0.5,
          easing: easeInElastic,
        });
      }
    },
  },
  {
    x: 280,
    y: 420,
    w: 110,
    h: 40,
    label: "Back",
    action: () => {
      if (state.juiceEnabled) {
        tween(state.boxes[2], { scale: 1.5 }, 0.5, {
          easing: easeOutBack,
        });
        tween(state.boxes[2], { scale: 1 }, 0.5, {
          delay: 0.5,
          easing: easeInBack,
        });
      }
    },
  },
  {
    x: 400,
    y: 420,
    w: 130,
    h: 40,
    label: "Camera Shake",
    action: () => {
      if (state.juiceEnabled) {
        shakeCamera(20, 0.5);
      }
    },
  },
  {
    x: 540,
    y: 420,
    w: 130,
    h: 40,
    label: "Screen Flash",
    action: () => {
      if (state.juiceEnabled) {
        flashScreen(1, 1, 1, 0.3, 0.5);
      }
    },
  },
  {
    x: 40,
    y: 470,
    w: 120,
    h: 40,
    label: "Explosion",
    action: () => {
      if (state.juiceEnabled) {
        state.selectedTool = "explosion";
      }
    },
  },
  {
    x: 170,
    y: 470,
    w: 120,
    h: 40,
    label: "Trail",
    action: () => {
      if (state.juiceEnabled) {
        state.selectedTool = "trail";
      }
    },
  },
];

// --- Particle Effects ---

function spawnExplosion(x: number, y: number) {
  const config: EmitterConfig = {
    shape: "point",
    x,
    y,
    mode: "burst",
    burstCount: 50,
    lifetime: [0.5, 1.5],
    velocityX: [-200, 200],
    velocityY: [-200, 200],
    rotation: [0, Math.PI * 2],
    rotationSpeed: [-5, 5],
    scale: [0.5, 1.5],
    scaleSpeed: [-1, -0.5],
    startColor: { r: 1, g: 0.8, b: 0.2, a: 1 },
    endColor: { r: 1, g: 0.2, b: 0, a: 0 },
    textureId: TEX_PARTICLE,
  };

  const emitter = createEmitter(config);
  addAffector(emitter, {
    type: "gravity",
    forceX: 0,
    forceY: 300,
  });
}

function spawnTrail(x: number, y: number) {
  const config: EmitterConfig = {
    shape: "point",
    x,
    y,
    mode: "continuous",
    rate: 30,
    lifetime: [0.3, 0.6],
    velocityX: [-20, 20],
    velocityY: [-20, 20],
    scale: [0.3, 0.8],
    scaleSpeed: [-0.5, -0.2],
    startColor: { r: 0.5, g: 0.8, b: 1, a: 1 },
    endColor: { r: 0.2, g: 0.4, b: 1, a: 0 },
    textureId: TEX_PARTICLE,
    maxParticles: 100,
  };

  createEmitter(config);
}

// --- Agent Protocol ---
registerAgent<DemoState>({
  name: "juice-showcase",
  getState: () => state,
  setState: (s) => {
    state.juiceEnabled = s.juiceEnabled;
  },
  describe: (s) => {
    return `Juice ${s.juiceEnabled ? "ENABLED" : "DISABLED"} | Click buttons to trigger effects`;
  },
  actions: {
    toggleJuice: {
      handler: (s) => {
        s.juiceEnabled = !s.juiceEnabled;
        return s;
      },
      description: "Toggle juice effects on/off",
    },
    triggerExplosion: {
      handler: (s, args) => {
        spawnExplosion(args.x as number, args.y as number);
        shakeCamera(15, 0.3);
        return s;
      },
      description: "Trigger explosion at position",
      args: [
        { name: "x", type: "number" },
        { name: "y", type: "number" },
      ],
    },
  },
});

// --- Camera Setup ---
setCamera(400, 300, 1);

// --- Game Loop ---
onFrame(() => {
  const dt = getDeltaTime();

  // Toggle juice with space
  if (isKeyPressed("Space")) {
    state.juiceEnabled = !state.juiceEnabled;
  }

  // Update systems
  updateTweens(dt);
  updateParticles(dt);

  // Check button clicks (screen space coordinates)
  const mouse = getMousePosition();
  if (isKeyPressed("MouseLeft")) {
    console.log(`[CLICK] Screen mouse: (${mouse.x.toFixed(0)}, ${mouse.y.toFixed(0)})`);

    let clickedButton = false;
    for (const button of state.buttons) {
      const inBounds =
        mouse.x >= button.x &&
        mouse.x <= button.x + button.w &&
        mouse.y >= button.y &&
        mouse.y <= button.y + button.h;

      if (inBounds) {
        console.log(`[CLICK] Hit button: ${button.label} at (${button.x}, ${button.y}) size (${button.w}x${button.h})`);
        button.action();
        clickedButton = true;
        break;
      }
    }

    if (!clickedButton) {
      console.log(`[CLICK] No button hit. Buttons:`, state.buttons.map(b =>
        `${b.label}:(${b.x},${b.y},${b.w}x${b.h})`
      ));
    }

    // If clicked outside buttons and a tool is selected, spawn particles
    if (!clickedButton && state.selectedTool !== "none") {
      const worldMouse = getMouseWorldPosition();
      console.log(`[TOOL] Spawning ${state.selectedTool} at world (${worldMouse.x.toFixed(0)}, ${worldMouse.y.toFixed(0)})`);
      if (state.selectedTool === "explosion") {
        spawnExplosion(worldMouse.x, worldMouse.y);
        shakeCamera(15, 0.3);
        flashScreen(1, 0.5, 0, 0.2, 0.4);
      } else if (state.selectedTool === "trail") {
        spawnTrail(worldMouse.x, worldMouse.y);
      }
      state.selectedTool = "none"; // Reset tool after use
    }
  }

  // Apply camera shake
  const camera = getCamera();
  const shakeOffset = getCameraShakeOffset();
  setCamera(
    400 + shakeOffset.x,
    300 + shakeOffset.y,
    camera.zoom
  );

  // --- Render ---
  clearSprites();

  // Background
  drawSprite({ textureId: TEX_BG, x: 0, y: 0, w: 800, h: 600, layer: 0 });

  // Boxes (tween targets)
  for (const box of state.boxes) {
    const size = 64 * box.scale;
    drawSprite({
      textureId: TEX_BOX,
      x: box.x - size / 2,
      y: box.y - size / 2,
      w: size,
      h: size,
      layer: 1,
    });
  }

  // Buttons (screen space UI)
  const screenMouse = getMousePosition();
  for (const button of state.buttons) {
    const isHovered =
      screenMouse.x >= button.x &&
      screenMouse.x <= button.x + button.w &&
      screenMouse.y >= button.y &&
      screenMouse.y <= button.y + button.h;

    // Highlight selected tool
    const isSelected =
      (state.selectedTool === "explosion" && button.label === "Explosion") ||
      (state.selectedTool === "trail" && button.label === "Trail");

    const fillColor = isSelected
      ? Colors.SUCCESS
      : isHovered
      ? Colors.PRIMARY
      : Colors.HUD_BG;

    drawPanel(button.x, button.y, button.w, button.h, {
      fillColor,
      borderColor: Colors.HUD_BG_LIGHT,
      borderWidth: 2,
      layer: 2,
      screenSpace: true,
    });

    drawText(button.label, button.x + 10, button.y + 12, {
      scale: 1.5,
      tint: Colors.WHITE,
      layer: 3,
      screenSpace: true,
    });
  }

  // Particles
  const particles = getAllParticles();
  for (const particle of particles) {
    const size = 8 * particle.scale;
    drawSprite({
      textureId: particle.textureId,
      x: particle.x - size / 2,
      y: particle.y - size / 2,
      w: size,
      h: size,
      rotation: particle.rotation,
      tint: particle.color,
      layer: 4,
    });
  }

  // Screen flash overlay
  const flash = getScreenFlash();
  if (flash) {
    drawPanel(0, 0, 800, 600, {
      fillColor: { ...flash, a: flash.opacity },
      borderWidth: 0,
      layer: 100,
      screenSpace: true,
    });
  }

  // --- HUD ---
  const statusText = state.juiceEnabled ? "JUICE: ON" : "JUICE: OFF";
  const statusColor = state.juiceEnabled ? Colors.SUCCESS : Colors.DANGER;

  drawLabel(statusText, HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y, {
    textColor: statusColor,
    bgColor: Colors.HUD_BG,
    padding: 8,
    scale: HUDLayout.TEXT_SCALE,
    layer: 110,
    screenSpace: true,
  });

  drawText("Space: Toggle Juice | Click buttons to trigger effects", HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y + 40, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.LIGHT_GRAY,
    layer: 110,
    screenSpace: true,
  });

  // Particle count
  drawText(`Particles: ${particles.length}`, HUDLayout.TOP_RIGHT.x - 100, HUDLayout.TOP_LEFT.y, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.INFO,
    layer: 110,
    screenSpace: true,
  });

  // Debug: Mouse position
  const debugMouse = getMousePosition();
  drawText(`Mouse: (${Math.floor(debugMouse.x)}, ${Math.floor(debugMouse.y)})`, HUDLayout.TOP_RIGHT.x - 150, HUDLayout.TOP_LEFT.y + 20, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.WARNING,
    layer: 110,
    screenSpace: true,
  });

  // Instructions at bottom
  drawPanel(HUDLayout.BOTTOM_LEFT.x, HUDLayout.BOTTOM_LEFT.y - 40, 780, 30, {
    fillColor: Colors.HUD_BG,
    borderColor: Colors.HUD_BG_LIGHT,
    borderWidth: 1,
    layer: 110,
    screenSpace: true,
  });

  drawText("Tip: Click 'Explosion' or 'Trail', then click anywhere to spawn particles", HUDLayout.BOTTOM_LEFT.x + 10, HUDLayout.BOTTOM_LEFT.y - 30, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.LIGHT_GRAY,
    layer: 111,
    screenSpace: true,
  });
});
