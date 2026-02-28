/**
 * Shader Showcase Demo - Phase 28
 *
 * Demonstrates the shader authoring experience:
 * - Effect presets (one-liner factories)
 * - Auto-injected built-in uniforms (time, resolution, mouse)
 * - Named uniform API (setShaderUniform)
 *
 * Controls:
 * - Keys 1-8: Select effect
 * - Mouse: Affects some effects (hologram, water)
 * - Space: Reset effect parameters to defaults
 */

import {
  getViewportSize,
  loadTexture,
  drawSprite,
  isKeyPressed,
  getMousePosition,
  getDeltaTime,
  setBackgroundColor,
  drawText,
  getDefaultFont,
  onFrame,
  createSolidTexture,
} from "../../runtime/rendering/index.ts";
import {
  outlineEffect,
  flashEffect,
  dissolveEffect,
  pixelateEffect,
  hologramEffect,
  waterEffect,
  glowEffect,
  grayscaleEffect,
  type ShaderEffect,
} from "../../runtime/rendering/effects.ts";
import { rgb } from "../../runtime/ui/types.ts";

// --- Setup ---
const vp = getViewportSize();
setBackgroundColor({ r: 0.08, g: 0.08, b: 0.12 });

// Load a sprite to apply effects to
const spriteTex = createSolidTexture("demo-sprite", rgb(80, 160, 255));

// Get bitmap font for HUD
const font = getDefaultFont();

// --- Create all effect presets ---
interface EffectEntry {
  name: string;
  key: string;
  effect: ShaderEffect;
  description: string;
  animate?: (dt: number, elapsed: number) => void;
}

const effects: EffectEntry[] = [
  {
    name: "Outline",
    key: "1",
    effect: outlineEffect({ color: [1, 0.3, 0.1, 1], width: 2.0 }),
    description: "4-neighbor edge detection outline",
  },
  {
    name: "Flash",
    key: "2",
    effect: flashEffect({ color: [1, 1, 1], intensity: 0 }),
    description: "Mix with solid color (pulsing)",
    animate(dt, elapsed) {
      const intensity = (Math.sin(elapsed * 3) * 0.5 + 0.5) * 0.8;
      this.effect.set("intensity", intensity);
    },
  },
  {
    name: "Dissolve",
    key: "3",
    effect: dissolveEffect({ edgeColor: [1, 0.5, 0], edgeWidth: 0.05 }),
    description: "Noise threshold dissolve with edge glow",
    animate(dt, elapsed) {
      // Ping-pong dissolve threshold
      const t = (Math.sin(elapsed * 0.8) * 0.5 + 0.5);
      this.effect.set("threshold", t);
    },
  },
  {
    name: "Pixelate",
    key: "4",
    effect: pixelateEffect({ pixelSize: 8 }),
    description: "UV grid snapping pixelation",
    animate(dt, elapsed) {
      const size = 2 + Math.abs(Math.sin(elapsed * 1.5)) * 14;
      this.effect.set("pixelSize", size);
    },
  },
  {
    name: "Hologram",
    key: "5",
    effect: hologramEffect({ speed: 2, lineSpacing: 100, aberration: 0.005 }),
    description: "Scanlines + chromatic aberration + flicker",
  },
  {
    name: "Water",
    key: "6",
    effect: waterEffect({ amplitude: 0.02, frequency: 10, speed: 2 }),
    description: "Sine wave UV distortion",
  },
  {
    name: "Glow",
    key: "7",
    effect: glowEffect({ color: [0.3, 0.7, 1], radius: 3, intensity: 1.5 }),
    description: "Multi-sample outer glow",
    animate(dt, elapsed) {
      const intensity = 1.0 + Math.sin(elapsed * 2) * 0.5;
      this.effect.set("glowIntensity", intensity);
    },
  },
  {
    name: "Grayscale",
    key: "8",
    effect: grayscaleEffect({ amount: 1.0 }),
    description: "Luminance-weighted desaturation",
    animate(dt, elapsed) {
      const amount = (Math.sin(elapsed * 1.2) * 0.5 + 0.5);
      this.effect.set("amount", amount);
    },
  },
];

// --- State ---
let currentIndex = 0;
let elapsed = 0;

// --- Frame loop ---
onFrame(() => {
  const dt = getDeltaTime();
  elapsed += dt;
  const mouse = getMousePosition();

  // Handle input: keys 1-8 to select effect
  for (let i = 0; i < effects.length; i++) {
    if (isKeyPressed(`Digit${i + 1}`)) {
      currentIndex = i;
    }
  }

  // Reset on Space
  if (isKeyPressed("Space")) {
    elapsed = 0;
  }

  const current = effects[currentIndex];

  // Animate current effect
  if (current.animate) {
    current.animate(dt, elapsed);
  }

  // Draw the sprite with current effect
  const spriteSize = 200;
  const cx = vp.width / 2;
  const cy = vp.height / 2 - 20;

  drawSprite({
    textureId: spriteTex,
    x: cx - spriteSize / 2,
    y: cy - spriteSize / 2,
    w: spriteSize,
    h: spriteSize,
    shaderId: current.effect.shaderId,
    layer: 0,
  });

  // --- HUD ---

  // Effect name
  drawText(`Effect: ${current.name}`, 20, 20, {
    font, scale: 2, tint: { r: 1, g: 1, b: 1, a: 1 }, screenSpace: true, layer: 100,
  });

  // Description
  drawText(current.description, 20, 46, {
    font, scale: 1, tint: { r: 0.7, g: 0.7, b: 0.7, a: 1 }, screenSpace: true, layer: 100,
  });

  // Controls
  drawText("Keys 1-8: Select effect | Space: Reset", 20, vp.height - 30, {
    font, scale: 1, tint: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, screenSpace: true, layer: 100,
  });

  // Effect list
  for (let i = 0; i < effects.length; i++) {
    const isActive = i === currentIndex;
    const tint = isActive
      ? { r: 1, g: 0.8, b: 0.2, a: 1 }
      : { r: 0.4, g: 0.4, b: 0.4, a: 1 };
    drawText(`${i + 1}. ${effects[i].name}`, vp.width - 150, 20 + i * 18, {
      font, scale: 1, tint, screenSpace: true, layer: 100,
    });
  }
});
