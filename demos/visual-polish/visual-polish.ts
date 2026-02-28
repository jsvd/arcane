/**
 * Visual Polish & Juice Demo
 *
 * Showcases Phase 22-23 features:
 * - Screen transitions between scenes
 * - Nine-slice UI panels
 * - Trail/ribbon renderer
 * - Impact combinator (shake + hitstop + flash + particles)
 * - Floating damage numbers
 * - Typewriter dialogue text
 * - Sprite shadows
 *
 * NOTE: This demo uses only createSolidTexture() (not loadTexture()), so there's
 * no texture filtering to toggle. See sprite-demo for filtering demonstration.
 *
 * Controls:
 *   1-5 = Trigger different transition types
 *   SPACE = Hit the target (impact + damage number)
 *   T = Start/skip typewriter dialogue
 *   R = Reset all effects
 */

import {
  drawSprite,
  setCamera,
  getViewportSize,
  isKeyPressed,
  createSolidTexture,
  setBackgroundColor,
  getMouseWorldPosition,
} from "../../runtime/rendering/index.ts";
import { createGame, hud } from "../../runtime/game/index.ts";
import { rgb } from "../../runtime/ui/index.ts";
import { updateTweens } from "../../runtime/tweening/tween.ts";
import { updateParticles, getAliveParticles } from "../../runtime/particles/emitter.ts";
import { getCameraShakeOffset } from "../../runtime/tweening/helpers.ts";

// Phase 22 imports
import {
  startScreenTransition,
  updateScreenTransition,
  drawScreenTransition,
  isScreenTransitionActive,
} from "../../runtime/rendering/transition.ts";
import type { ScreenTransitionType } from "../../runtime/rendering/transition.ts";
import {
  createTrail,
  updateTrail,
  drawTrail,
} from "../../runtime/rendering/trail.ts";

// Phase 23 imports
import {
  impact,
  _consumeHitstopFrame,
  isHitstopActive,
} from "../../runtime/rendering/juice.ts";
import {
  spawnFloatingText,
  updateFloatingTexts,
  drawFloatingTexts,
} from "../../runtime/rendering/floatingtext.ts";
import {
  createTypewriter,
  updateTypewriter,
  drawTypewriter,
  skipTypewriter,
  isTypewriterComplete,
  resetTypewriter,
} from "../../runtime/rendering/typewriter.ts";

// -- Setup --
const VPW = 800;
const VPH = 600;

// Solid color textures
const whiteTex = createSolidTexture("white", rgb(255, 255, 255));
const redTex = createSolidTexture("red", rgb(220, 60, 60));
const greenTex = createSolidTexture("green", rgb(60, 200, 80));
const blueTex = createSolidTexture("blue", rgb(60, 80, 220));
const panelTex = createSolidTexture("panel", rgb(40, 40, 60));
const goldTex = createSolidTexture("gold", rgb(255, 200, 50));

// Trail
const trail = createTrail({
  maxLength: 40,
  width: 6,
  color: { r: 0.2, g: 0.6, b: 1, a: 0.9 },
  endColor: { r: 0.8, g: 0.2, b: 1, a: 0 },
  maxAge: 0.8,
  layer: 3,
  blendMode: "additive",
  minDistance: 3,
});

// Typewriter
const dialogueLines = [
  "The ancient door creaks open...",
  "A chill wind blows from the darkness beyond.",
  "You steel your nerves and step inside.",
];
let currentLine = 0;
let typewriter = createTypewriter(dialogueLines[0], {
  speed: 40,
  punctuationPause: 0.2,
  onComplete: () => { /* line complete */ },
});

// Target for impact testing
const target = { x: VPW / 2, y: VPH / 2 - 50, hp: 100 };
let hitCount = 0;

// Scene counter for transitions
let sceneIndex = 0;
const sceneColors = [
  { r: 0.05, g: 0.05, b: 0.1 },
  { r: 0.1, g: 0.05, b: 0.05 },
  { r: 0.05, g: 0.1, b: 0.05 },
];

const game = createGame({ background: { r: 20 / 255, g: 20 / 255, b: 41 / 255 } });

game.onFrame((ctx) => {
  const dt = ctx.dt;
  const { width: vpW, height: vpH } = ctx.viewport;

  // Apply camera shake
  const shake = getCameraShakeOffset();
  if (shake.x !== 0 || shake.y !== 0) {
    setCamera(shake.x, shake.y);
  }

  // -- Input --

  // Transition keys 1-5
  const transTypes: ScreenTransitionType[] = ["fade", "wipe", "circleIris", "diamond", "pixelate"];
  for (let i = 0; i < 5; i++) {
    if (isKeyPressed(`${i + 1}`) && !isScreenTransitionActive()) {
      const type = transTypes[i];
      sceneIndex = (sceneIndex + 1) % sceneColors.length;
      const nextColor = sceneColors[sceneIndex];
      startScreenTransition(type, 0.6, { color: { r: 0, g: 0, b: 0 } }, () => {
        setBackgroundColor(nextColor);
      });
    }
  }

  // Space = hit target
  if (isKeyPressed("Space")) {
    hitCount++;
    const dmg = 10 + Math.floor(Math.random() * 20);
    target.hp = Math.max(0, target.hp - dmg);

    // Impact juice!
    impact(target.x, target.y, {
      shake: { intensity: 6, duration: 0.15 },
      hitstop: 3,
      flash: { r: 1, g: 0.9, b: 0.7, duration: 0.08, opacity: 0.4 },
      particles: {
        count: 12,
        color: { r: 1, g: 0.8, b: 0.3, a: 1 },
        velocityX: [-80, 80],
        velocityY: [-120, -20],
        lifetime: [0.2, 0.5],
      },
    });

    // Floating damage number
    const offsetX = (Math.random() - 0.5) * 30;
    spawnFloatingText(target.x + offsetX, target.y - 20, `-${dmg}`, {
      color: { r: 1, g: 0.3, b: 0.2, a: 1 },
      rise: 40,
      duration: 0.8,
      scale: 2,
      pop: true,
    });

    // Reset HP if dead
    if (target.hp <= 0) {
      target.hp = 100;
      spawnFloatingText(target.x, target.y + 40, "RESPAWN!", {
        color: { r: 0.3, g: 1, b: 0.3, a: 1 },
        rise: 30,
        duration: 1.2,
        scale: 1.5,
      });
    }
  }

  // T = typewriter
  if (isKeyPressed("t")) {
    if (isTypewriterComplete(typewriter)) {
      currentLine = (currentLine + 1) % dialogueLines.length;
      resetTypewriter(typewriter, dialogueLines[currentLine]);
    } else {
      skipTypewriter(typewriter);
    }
  }

  // R = reset
  if (isKeyPressed("r")) {
    target.hp = 100;
    hitCount = 0;
  }

  // -- Update --
  const hitstopFrozen = _consumeHitstopFrame();

  if (!hitstopFrozen) {
    // Normal gameplay updates (frozen during hitstop)
  }

  // These always update (even during hitstop)
  updateTweens(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateTypewriter(typewriter, dt);
  updateScreenTransition(dt);

  // Trail follows mouse
  const mouse = getMouseWorldPosition();
  updateTrail(trail, mouse.x, mouse.y, dt);

  // -- Render --

  // Ground
  drawSprite({
    textureId: panelTex,
    x: 0,
    y: vpH - 80,
    w: vpW,
    h: 80,
    layer: 0,
    tint: { r: 0.3, g: 0.4, b: 0.3, a: 1 },
  });

  // Target with shadow
  const targetSize = 48;
  drawSprite({
    textureId: redTex,
    x: target.x - targetSize / 2,
    y: target.y - targetSize / 2,
    w: targetSize,
    h: targetSize,
    layer: 2,
    shadow: { offsetX: 3, offsetY: 6, scaleY: 0.4 },
  });

  // HP bar above target
  const hpBarW = 60;
  const hpFill = target.hp / 100;
  drawSprite({
    textureId: redTex,
    x: target.x - hpBarW / 2,
    y: target.y - targetSize / 2 - 12,
    w: hpBarW,
    h: 6,
    layer: 4,
    tint: { r: 0.3, g: 0.1, b: 0.1, a: 0.8 },
  });
  drawSprite({
    textureId: greenTex,
    x: target.x - hpBarW / 2,
    y: target.y - targetSize / 2 - 12,
    w: hpBarW * hpFill,
    h: 6,
    layer: 5,
  });

  // Trail
  drawTrail(trail);

  // Dialogue box background (solid color panel)
  drawSprite({
    textureId: panelTex,
    x: 50,
    y: vpH - 160,
    w: vpW - 100,
    h: 70,
    layer: 80,
    tint: { r: 0.6, g: 0.6, b: 0.8, a: 0.95 },
  });

  // Typewriter text inside dialogue box
  drawTypewriter(typewriter, 66, vpH - 148, {
    scale: 1,
    layer: 85,
    tint: { r: 0.9, g: 0.9, b: 1, a: 1 },
  });

  // Floating texts
  drawFloatingTexts();

  // Particles
  for (const p of getAliveParticles()) {
    const size = 4 * p.scale;
    drawSprite({
      textureId: p.textureId,
      x: p.x - size / 2,
      y: p.y - size / 2,
      w: size,
      h: size,
      layer: 6,
      rotation: p.rotation,
      tint: p.color,
    });
  }

  // HUD
  hud.label(`HP: ${target.hp}/100  Hits: ${hitCount}`, 10, 10, { scale: 1 });

  hud.text("1-5: Transitions  SPACE: Hit  T: Dialogue  R: Reset", 10, vpH - 20, {
    scale: 1,
    tint: { r: 0.7, g: 0.7, b: 0.7, a: 0.8 },
  });

  // Hitstop indicator
  if (isHitstopActive()) {
    hud.text("HITSTOP!", vpW / 2 - 30, 40, {
      scale: 2,
      layer: 110,
      tint: { r: 1, g: 1, b: 0, a: 1 },
    });
  }

  // Screen transition overlay (always last)
  drawScreenTransition();
});
