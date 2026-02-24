/**
 * Juice Showcase Demo - Phase 9 (updated for Phase 26)
 *
 * Demonstrates all the "juice" features:
 * - Tweening with various easing functions
 * - Camera shake
 * - Screen flash
 * - Rust-native particle effects (high-performance backend)
 * - Geometry-pipeline shapes: ring shockwaves, sector hit cones
 *
 * Controls:
 * - Click different buttons to trigger effects
 * - Space: Toggle juice on/off (compare before/after)
 */

import {
  setCamera,
  getCamera,
  isKeyPressed,
  createSolidTexture,
  getMousePosition,
  getMouseWorldPosition,
} from "../../runtime/rendering/index.ts";
import { Colors, HUDLayout, drawPanel, rgb, drawRing, drawSector } from "../../runtime/ui/index.ts";
import { createGame, hud, drawColorSprite } from "../../runtime/game/index.ts";
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
  createRustEmitter,
  updateAllRustEmitters,
  drawRustEmitter,
  destroyRustEmitter,
  getRustEmitterParticleCount,
  setRustEmitterSpawnRate,
} from "../../runtime/particles/index.ts";

// --- Textures ---
const TEX_PARTICLE = createSolidTexture("particle", rgb(255, 255, 255));

// --- Shockwave ring effects ---
type ShockwaveRing = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
};
let shockwaves: ShockwaveRing[] = [];

// --- Hit cone effects ---
type HitCone = {
  x: number;
  y: number;
  angle: number;
  radius: number;
  life: number;
  maxLife: number;
};
let hitCones: HitCone[] = [];

// --- Rust emitter tracking ---
let activeRustEmitters: number[] = [];

// --- State ---
interface DemoState {
  juiceEnabled: boolean;
  selectedTool: "none" | "explosion" | "trail" | "shockwave" | "hitcone";
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
        tween(state.boxes[0], { scale: 2.5 }, 1.0, {
          easing: easeOutBounce,
        });
        tween(state.boxes[0], { scale: 1 }, 1.0, {
          delay: 1.0,
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
        tween(state.boxes[1], { scale: 2.5 }, 1.0, {
          easing: easeOutElastic,
        });
        tween(state.boxes[1], { scale: 1 }, 1.0, {
          delay: 1.0,
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
        tween(state.boxes[2], { scale: 2.5 }, 1.0, {
          easing: easeOutBack,
        });
        tween(state.boxes[2], { scale: 1 }, 1.0, {
          delay: 1.0,
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
  {
    x: 300,
    y: 470,
    w: 130,
    h: 40,
    label: "Shockwave",
    action: () => {
      if (state.juiceEnabled) {
        state.selectedTool = "shockwave";
      }
    },
  },
  {
    x: 440,
    y: 470,
    w: 120,
    h: 40,
    label: "Hit Cone",
    action: () => {
      if (state.juiceEnabled) {
        state.selectedTool = "hitcone";
      }
    },
  },
];

// --- Particle Effects (Rust-native emitters) ---

// Track emitters that need delayed spawn rate cutoff
const emitterStopTimers: Map<number, number> = new Map();

function spawnExplosion(x: number, y: number) {
  const id = createRustEmitter({
    spawnRate: 300, // spawn many particles quickly
    lifetimeMin: 0.5,
    lifetimeMax: 1.5,
    speedMin: 50,
    speedMax: 200,
    direction: 0,
    spread: Math.PI * 2, // full circle
    scaleMin: 0.5,
    scaleMax: 1.5,
    alphaStart: 1,
    alphaEnd: 0,
    gravityX: 0,
    gravityY: 300,
    textureId: TEX_PARTICLE,
    x,
    y,
  });
  activeRustEmitters.push(id);
  // Schedule spawn rate cutoff after 0.15 seconds (burst duration)
  emitterStopTimers.set(id, 0.15);

  // Also spawn a shockwave ring at the same location
  shockwaves.push({
    x,
    y,
    radius: 5,
    maxRadius: 80,
    life: 0.4,
    maxLife: 0.4,
  });
}

function spawnTrail(x: number, y: number) {
  const id = createRustEmitter({
    spawnRate: 100, // continuous trail effect
    lifetimeMin: 0.3,
    lifetimeMax: 0.6,
    speedMin: 5,
    speedMax: 20,
    direction: -Math.PI / 2,
    spread: Math.PI,
    scaleMin: 0.3,
    scaleMax: 0.8,
    alphaStart: 1,
    alphaEnd: 0,
    textureId: TEX_PARTICLE,
    x,
    y,
  });
  activeRustEmitters.push(id);
  // Schedule spawn rate cutoff after 0.5 seconds
  emitterStopTimers.set(id, 0.5);
}

function spawnShockwave(x: number, y: number) {
  shockwaves.push({
    x,
    y,
    radius: 5,
    maxRadius: 120,
    life: 0.6,
    maxLife: 0.6,
  });
}

function spawnHitCone(x: number, y: number) {
  hitCones.push({
    x,
    y,
    angle: -Math.PI / 2, // point upward
    radius: 80,
    life: 0.3,
    maxLife: 0.3,
  });
}

// --- Game Bootstrap ---
const game = createGame({ name: "juice-showcase" });

game.state<DemoState>({
  get: () => state,
  set: (s) => {
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

// --- Game Loop ---
game.onFrame((ctx) => {
  const dt = ctx.dt;
  const VPW = ctx.viewport.width;
  const VPH = ctx.viewport.height;

  // Toggle juice with space
  if (isKeyPressed("Space")) {
    state.juiceEnabled = !state.juiceEnabled;
  }

  // Update systems
  updateTweens(dt);
  updateAllRustEmitters(dt);

  // Update shockwave rings
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.life -= dt;
    const t = 1 - sw.life / sw.maxLife;
    sw.radius = sw.maxRadius * t;
    if (sw.life <= 0) shockwaves.splice(i, 1);
  }

  // Update hit cones
  for (let i = hitCones.length - 1; i >= 0; i--) {
    const hc = hitCones[i];
    hc.life -= dt;
    if (hc.life <= 0) hitCones.splice(i, 1);
  }

  // Update emitter stop timers (for burst effects)
  for (const [id, remaining] of emitterStopTimers.entries()) {
    const newTime = remaining - dt;
    if (newTime <= 0) {
      setRustEmitterSpawnRate(id, 0);
      emitterStopTimers.delete(id);
    } else {
      emitterStopTimers.set(id, newTime);
    }
  }

  // Clean up finished Rust emitters (after ~2 seconds)
  for (let i = activeRustEmitters.length - 1; i >= 0; i--) {
    const id = activeRustEmitters[i];
    if (getRustEmitterParticleCount(id) === 0) {
      destroyRustEmitter(id);
      emitterStopTimers.delete(id);
      activeRustEmitters.splice(i, 1);
    }
  }

  // Check button clicks (screen space coordinates)
  const mouse = getMousePosition();
  if (isKeyPressed("MouseLeft")) {
    let clickedButton = false;
    for (const button of state.buttons) {
      if (
        mouse.x >= button.x &&
        mouse.x <= button.x + button.w &&
        mouse.y >= button.y &&
        mouse.y <= button.y + button.h
      ) {
        button.action();
        clickedButton = true;
        break;
      }
    }

    // If clicked outside buttons and a tool is selected, spawn effects
    if (!clickedButton && state.selectedTool !== "none") {
      const worldMouse = getMouseWorldPosition();
      if (state.selectedTool === "explosion") {
        spawnExplosion(worldMouse.x, worldMouse.y);
        shakeCamera(15, 0.3);
        flashScreen(1, 0.5, 0, 0.2, 0.4);
      } else if (state.selectedTool === "trail") {
        spawnTrail(worldMouse.x, worldMouse.y);
      } else if (state.selectedTool === "shockwave") {
        spawnShockwave(worldMouse.x, worldMouse.y);
        shakeCamera(8, 0.2);
      } else if (state.selectedTool === "hitcone") {
        spawnHitCone(worldMouse.x, worldMouse.y);
        flashScreen(1, 0.2, 0.2, 0.15, 0.3);
      }
      state.selectedTool = "none"; // Reset tool after use
    }
  }

  // Apply camera shake
  const camera = getCamera();
  const shakeOffset = getCameraShakeOffset();
  setCamera(
    VPW / 2 + shakeOffset.x,
    VPH / 2 + shakeOffset.y,
    camera.zoom
  );

  // --- Render ---

  // Background
  drawColorSprite({ color: { r: 0.157, g: 0.157, b: 0.196, a: 1 }, x: 0, y: 0, w: VPW, h: VPH, layer: 0 });

  // Boxes (tween targets)
  for (const box of state.boxes) {
    const size = 64 * box.scale;
    drawColorSprite({
      color: { r: 0.392, g: 0.588, b: 1, a: 1 },
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
      (state.selectedTool === "trail" && button.label === "Trail") ||
      (state.selectedTool === "shockwave" && button.label === "Shockwave") ||
      (state.selectedTool === "hitcone" && button.label === "Hit Cone");

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

    hud.text(button.label, button.x + 10, button.y + 12, {
      scale: 1.5,
      layer: 3,
    });
  }

  // Rust-native particles
  let totalParticles = 0;
  for (const emitterId of activeRustEmitters) {
    drawRustEmitter(emitterId, { w: 8, h: 8, layer: 4 });
    totalParticles += getRustEmitterParticleCount(emitterId);
  }

  // Shockwave rings (expanding ring effect)
  for (const sw of shockwaves) {
    const t = 1 - sw.life / sw.maxLife;
    const alpha = 1 - t; // fade out as it expands
    const thickness = Math.max(2, (1 - t) * 8);
    const inner = Math.max(0, sw.radius - thickness);
    drawRing(sw.x, sw.y, inner, sw.radius, {
      color: { r: 1, g: 0.8, b: 0.3, a: alpha * 0.8 },
      layer: 5,
    });
  }

  // Hit cone indicators (sector flash)
  for (const hc of hitCones) {
    const alpha = hc.life / hc.maxLife;
    drawSector(hc.x, hc.y, hc.radius, hc.angle - Math.PI / 4, hc.angle + Math.PI / 4, {
      color: { r: 1, g: 0.2, b: 0.2, a: alpha * 0.4 },
      layer: 5,
    });
  }

  // Screen flash overlay
  const flash = getScreenFlash();
  if (flash) {
    hud.overlay({ ...flash, a: flash.opacity }, { layer: 100 });
  }

  // --- HUD ---
  const statusText = state.juiceEnabled ? "JUICE: ON" : "JUICE: OFF";
  const statusColor = state.juiceEnabled ? Colors.SUCCESS : Colors.DANGER;

  hud.label(statusText, HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y, {
    textColor: statusColor,
  });

  hud.text("Space: Toggle Juice | Click buttons to trigger effects", HUDLayout.TOP_LEFT.x, HUDLayout.TOP_LEFT.y + 40, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.LIGHT_GRAY,
    layer: 110,
  });

  // Particle count (Rust-native)
  hud.text(`Particles: ${totalParticles}`, HUDLayout.TOP_RIGHT.x - 100, HUDLayout.TOP_LEFT.y, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.INFO,
    layer: 110,
  });

  // Instructions at bottom
  drawPanel(HUDLayout.BOTTOM_LEFT.x, HUDLayout.BOTTOM_LEFT.y - 40, VPW - 20, 30, {
    fillColor: Colors.HUD_BG,
    borderColor: Colors.HUD_BG_LIGHT,
    borderWidth: 1,
    layer: 110,
    screenSpace: true,
  });

  hud.text("Tip: Click a tool button, then click anywhere to trigger the effect", HUDLayout.BOTTOM_LEFT.x + 10, HUDLayout.BOTTOM_LEFT.y - 30, {
    scale: HUDLayout.SMALL_TEXT_SCALE,
    tint: Colors.LIGHT_GRAY,
    layer: 111,
  });
});
