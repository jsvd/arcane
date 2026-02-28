/**
 * Lighting Showcase Demo — Phase 19: Lighting 2.0
 *
 * Demonstrates the full lighting system:
 * - Radiance Cascades global illumination
 * - Emissive surfaces (glowing tiles/objects)
 * - Occluders (walls that block light)
 * - Directional lights (sun/moon)
 * - Spot lights (flashlight cones)
 * - Point lights (classic falloff)
 * - Color temperature presets
 * - Day/night cycle
 * - Toggle between old point-lights and new GI
 *
 * Controls:
 * - Arrow keys: Move player/cursor
 * - G: Toggle GI on/off
 * - 1-5: Switch scenes (dungeon, lava, outdoor, neon, comparison)
 * - T: Cycle time of day (outdoor scene)
 * - +/-: Adjust GI intensity
 * - Mouse: Move spot light
 */

import {
  drawSprite,
  isKeyDown,
  isKeyPressed,
  createSolidTexture,
  drawText,
  setAmbientLight,
  addPointLight,
  clearLights,
  enableGlobalIllumination,
  disableGlobalIllumination,
  setGIIntensity,
  setGIQuality,
  addEmissive,
  clearEmissives,
  addOccluder,
  clearOccluders,
  addDirectionalLight,
  addSpotLight,
  colorTemp,
  setDayNightCycle,
  setBackgroundColor,
  getMousePosition,
} from "../../runtime/rendering/index.ts";
import { createGame, hud } from "../../runtime/game/index.ts";
import { drawLine, rgb } from "../../runtime/ui/index.ts";

// --- Textures ---
const TEX_WALL = createSolidTexture("wall", rgb(80, 80, 100));
const TEX_FLOOR = createSolidTexture("floor", rgb(60, 60, 70));
const TEX_EMISSIVE_WARM = createSolidTexture("em_warm", rgb(255, 160, 60));
const TEX_EMISSIVE_COOL = createSolidTexture("em_cool", rgb(60, 120, 255));
const TEX_EMISSIVE_LAVA = createSolidTexture("em_lava", rgb(255, 80, 20));
const TEX_EMISSIVE_NEON = createSolidTexture("em_neon", rgb(255, 50, 150));
const TEX_PLAYER = createSolidTexture("player", rgb(220, 200, 60));
const TEX_GRASS = createSolidTexture("grass", rgb(40, 120, 40));
const TEX_SKY = createSolidTexture("sky", rgb(100, 150, 220));

// Helper to reduce drawSprite boilerplate
function sprite(textureId: number, x: number, y: number, w: number, h: number, layer: number) {
  drawSprite({ textureId, x, y, w, h, layer });
}

// --- State ---
let giEnabled = true;
let giIntensity = 0.5;
let currentScene = 1; // 1-5
let timeOfDay = 0.5; // noon
let playerX = 200;
let playerY = 300;
let frameCount = 0;

// Enable GI on start with finer probe resolution for smoother gradients
enableGlobalIllumination();
setGIIntensity(0.5 * 0.5); // matches giIntensity^2 curve
setGIQuality({ probeSpacing: 4, cascadeCount: 5 });

// --- Scene builders ---

function drawDungeonScene(dt: number, VPW: number, VPH: number) {
  setBackgroundColor({ r: 0.02, g: 0.02, b: 0.05 });
  setAmbientLight(0.05, 0.05, 0.08);

  // Floor (covers entire room behind everything)
  for (let y = 0; y < VPH; y += 32) {
    for (let x = 0; x < VPW; x += 32) {
      sprite(TEX_FLOOR, x, y, 32, 32, -10);
    }
  }

  // Walls on left and right
  for (let y = 0; y < VPH; y += 32) {
    sprite(TEX_WALL, 0, y, 32, 32, -5);
    sprite(TEX_WALL, 32, y, 32, 32, -5);
    sprite(TEX_WALL, VPW - 32, y, 32, 32, -5);
    sprite(TEX_WALL, VPW - 64, y, 32, 32, -5);

    // Occluders for walls
    addOccluder({ x: 0, y, width: 64, height: 32 });
    addOccluder({ x: VPW - 64, y, width: 64, height: 32 });
  }

  // Central pillar (free-standing — casts shadows)
  const pillarX = VPW / 2 - 32;
  const pillarY = VPH / 2 - 64;
  const pillarH = 128;
  for (let y = pillarY; y < pillarY + pillarH; y += 32) {
    sprite(TEX_WALL, pillarX, y, 64, 32, -5);
  }
  addOccluder({ x: pillarX, y: pillarY, width: 64, height: pillarH });

  // Torch emissives on walls
  const torchColor = colorTemp.torch;
  const flicker = 0.9 + Math.sin(frameCount * 0.1) * 0.1;

  // Left wall torches
  sprite(TEX_EMISSIVE_WARM, 64, 150, 16, 16, 0);
  addEmissive({
    x: 64, y: 150, width: 16, height: 16,
    r: torchColor[0], g: torchColor[1], b: torchColor[2],
    intensity: 3.0 * flicker,
  });

  sprite(TEX_EMISSIVE_WARM, 64, 400, 16, 16, 0);
  addEmissive({
    x: 64, y: 400, width: 16, height: 16,
    r: torchColor[0], g: torchColor[1], b: torchColor[2],
    intensity: 3.0 * flicker,
  });

  // Right wall torches
  sprite(TEX_EMISSIVE_WARM, VPW - 80, 150, 16, 16, 0);
  addEmissive({
    x: VPW - 80, y: 150, width: 16, height: 16,
    r: torchColor[0], g: torchColor[1], b: torchColor[2],
    intensity: 3.0 * flicker,
  });

  sprite(TEX_EMISSIVE_WARM, VPW - 80, 400, 16, 16, 0);
  addEmissive({
    x: VPW - 80, y: 400, width: 16, height: 16,
    r: torchColor[0], g: torchColor[1], b: torchColor[2],
    intensity: 3.0 * flicker,
  });

  // Point lights (local torch glow, dim — GI handles the rest)
  addPointLight(72, 158, 120, torchColor[0], torchColor[1], torchColor[2], flicker * 0.5);
  addPointLight(72, 408, 120, torchColor[0], torchColor[1], torchColor[2], flicker * 0.5);
  addPointLight(VPW - 72, 158, 120, torchColor[0], torchColor[1], torchColor[2], flicker * 0.5);
  addPointLight(VPW - 72, 408, 120, torchColor[0], torchColor[1], torchColor[2], flicker * 0.5);
}

function drawLavaScene(dt: number, VPW: number, VPH: number) {
  setBackgroundColor({ r: 0.05, g: 0.01, b: 0.0 });
  setAmbientLight(0.08, 0.03, 0.02);

  // Stone floor
  for (let x = 0; x < VPW; x += 32) {
    sprite(TEX_FLOOR, x, 0, 32, 32, -10);
    sprite(TEX_FLOOR, x, 32, 32, 32, -10);
  }

  // Lava river in the middle
  const lavaY = VPH / 2 - 16;
  for (let x = 0; x < VPW; x += 32) {
    const pulse = 0.7 + Math.sin(frameCount * 0.05 + x * 0.02) * 0.3;
    sprite(TEX_EMISSIVE_LAVA, x, lavaY, 32, 64, 0);

    addEmissive({
      x, y: lavaY, width: 32, height: 64,
      r: 1.0, g: 0.3, b: 0.05,
      intensity: 1.5 * pulse,
    });
  }

  // Stone platforms above and below lava
  for (let x = 64; x < VPW - 64; x += 96) {
    sprite(TEX_WALL, x, lavaY - 48, 64, 32, -5);
    addOccluder({ x, y: lavaY - 48, width: 64, height: 32 });

    sprite(TEX_WALL, x + 32, lavaY + 80, 64, 32, -5);
    addOccluder({ x: x + 32, y: lavaY + 80, width: 64, height: 32 });
  }

  // Walls
  for (let y = 0; y < VPH; y += 32) {
    sprite(TEX_WALL, 0, y, 32, 32, -5);
    sprite(TEX_WALL, VPW - 32, y, 32, 32, -5);
    addOccluder({ x: 0, y, width: 32, height: 32 });
    addOccluder({ x: VPW - 32, y, width: 32, height: 32 });
  }
}

function drawOutdoorScene(dt: number, VPW: number, VPH: number) {

  // Use day/night cycle
  setDayNightCycle({ timeOfDay });

  // Sky (clear for day, dark for night)
  const skyBrightness = Math.sin(timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
  setBackgroundColor({
    r: 0.05 + skyBrightness * 0.35,
    g: 0.05 + skyBrightness * 0.5,
    b: 0.15 + skyBrightness * 0.55,
  });

  // Ground
  for (let x = 0; x < VPW; x += 32) {
    sprite(TEX_GRASS, x, VPH - 32, 32, 32, -10);
    sprite(TEX_GRASS, x, VPH - 64, 32, 32, -10);
  }

  // House with windows (emissive at night)
  const houseX = VPW / 2 - 96;
  const houseY = VPH - 64 - 128;

  for (let dy = 0; dy < 128; dy += 32) {
    for (let dx = 0; dx < 192; dx += 32) {
      sprite(TEX_WALL, houseX + dx, houseY + dy, 32, 32, -5);
    }
  }
  addOccluder({ x: houseX, y: houseY, width: 192, height: 128 });

  // Windows glow at night
  const windowGlow = Math.max(0, 1 - skyBrightness * 2);
  if (windowGlow > 0.1) {
    const warmColor = colorTemp.incandescent;

    sprite(TEX_EMISSIVE_WARM, houseX + 32, houseY + 32, 24, 24, 0);
    addEmissive({
      x: houseX + 32, y: houseY + 32, width: 24, height: 24,
      r: warmColor[0], g: warmColor[1], b: warmColor[2],
      intensity: windowGlow * 2.0,
    });

    sprite(TEX_EMISSIVE_WARM, houseX + 128, houseY + 32, 24, 24, 0);
    addEmissive({
      x: houseX + 128, y: houseY + 32, width: 24, height: 24,
      r: warmColor[0], g: warmColor[1], b: warmColor[2],
      intensity: windowGlow * 2.0,
    });
  }

  // Trees as occluders
  for (const treeX of [100, 250, 550, 650]) {
    for (let dy = 0; dy < 96; dy += 32) {
      sprite(TEX_WALL, treeX, VPH - 64 - 96 + dy, 32, 32, -3);
    }
    addOccluder({ x: treeX, y: VPH - 64 - 96, width: 32, height: 96 });
  }
}

function drawNeonScene(dt: number, VPW: number, VPH: number) {
  setBackgroundColor({ r: 0.02, g: 0.02, b: 0.04 });
  setAmbientLight(0.03, 0.03, 0.05);

  // Floor
  for (let x = 0; x < VPW; x += 32) {
    sprite(TEX_FLOOR, x, VPH - 32, 32, 32, -10);
  }

  // Neon signs
  const neonColors = [
    colorTemp.neonPink,
    colorTemp.neonBlue,
    colorTemp.neonGreen,
    colorTemp.magic,
  ];
  const neonTextures = [TEX_EMISSIVE_NEON, TEX_EMISSIVE_COOL, TEX_EMISSIVE_WARM, TEX_EMISSIVE_WARM];

  for (let i = 0; i < 4; i++) {
    const nx = 100 + i * 160;
    const ny = 100 + Math.sin(frameCount * 0.03 + i) * 20;
    const pulse = 0.7 + Math.sin(frameCount * 0.08 + i * 1.5) * 0.3;
    const color = neonColors[i];

    sprite(neonTextures[i], nx, ny, 80, 20, 0);
    addEmissive({
      x: nx, y: ny, width: 80, height: 20,
      r: color[0], g: color[1], b: color[2],
      intensity: 3.0 * pulse,
    });

    addPointLight(nx + 40, ny + 10, 200, color[0], color[1], color[2], pulse * 1.5);
  }

  // Building walls with windows
  for (let bx = 0; bx < VPW; bx += 200) {
    for (let by = 200; by < VPH - 32; by += 32) {
      sprite(TEX_WALL, bx, by, 32, 32, -5);
      sprite(TEX_WALL, bx + 160, by, 32, 32, -5);
      addOccluder({ x: bx, y: by, width: 32, height: 32 });
      addOccluder({ x: bx + 160, y: by, width: 32, height: 32 });
    }
  }
}

function drawComparisonScene(dt: number, VPW: number, VPH: number) {
  setBackgroundColor({ r: 0.02, g: 0.02, b: 0.05 });
  setAmbientLight(0.05, 0.05, 0.08);

  const halfW = VPW / 2;

  // Divider line
  drawLine(halfW, 0, halfW, VPH, { color: { r: 1, g: 0.63, b: 0.24, a: 1 }, thickness: 2, layer: 10 });

  // Both sides: same dungeon layout
  for (const side of [0, halfW]) {
    // Floor
    for (let x = side; x < side + halfW; x += 32) {
      sprite(TEX_FLOOR, x, VPH - 32, 32, 32, -10);
    }

    // Walls
    for (let y = 0; y < VPH; y += 32) {
      sprite(TEX_WALL, side, y, 32, 32, -5);
      addOccluder({ x: side, y, width: 32, height: 32 });
    }

    // Pillar
    const px = side + halfW / 2 - 16;
    for (let dy = 0; dy < 96; dy += 32) {
      sprite(TEX_WALL, px, VPH / 2 - 48 + dy, 32, 32, -5);
    }
    addOccluder({ x: px, y: VPH / 2 - 48, width: 32, height: 96 });

    // Torches
    const torchX = side + 40;
    const flicker = 0.9 + Math.sin(frameCount * 0.1) * 0.1;
    const tc = colorTemp.torch;
    sprite(TEX_EMISSIVE_WARM, torchX, 200, 12, 12, 0);
    addPointLight(torchX + 6, 206, 120, tc[0], tc[1], tc[2], flicker);

    if (side === halfW) {
      // Right side: GI emissives
      addEmissive({
        x: torchX, y: 200, width: 12, height: 12,
        r: tc[0], g: tc[1], b: tc[2],
        intensity: 3.0 * flicker,
      });
    }
  }

  // Labels
  drawText("Point Lights Only", 30, 20, { scale: 2 });
  drawText("+ Radiance Cascades GI", halfW + 30, 20, { scale: 2 });
}

// --- Game bootstrap ---

const game = createGame({ name: "lighting-showcase" });

game.state({
  get: () => ({
    scene: currentScene,
    giEnabled,
    giIntensity,
    timeOfDay,
    playerX,
    playerY,
  }),
  set: () => {},
});

game.onFrame((ctx) => {
  const dt = ctx.dt;
  frameCount++;

  const { vpW: VPW, vpH: VPH } = ctx;

  clearLights();
  clearEmissives();
  clearOccluders();

  // Toggle GI
  if (isKeyPressed("g")) {
    giEnabled = !giEnabled;
    if (giEnabled) {
      enableGlobalIllumination();
    } else {
      disableGlobalIllumination();
    }
  }

  // Adjust GI intensity (exponential curve: displayed 0-5 maps to actual 0-25)
  if (isKeyDown("Equal") || isKeyDown("+")) {
    giIntensity = Math.min(giIntensity + dt * 2, 5.0);
  }
  if (isKeyDown("Minus") || isKeyDown("-")) {
    giIntensity = Math.max(giIntensity - dt * 2, 0.0);
  }
  setGIIntensity(giIntensity * giIntensity);

  // Scene switching
  if (isKeyPressed("1")) currentScene = 1;
  if (isKeyPressed("2")) currentScene = 2;
  if (isKeyPressed("3")) currentScene = 3;
  if (isKeyPressed("4")) currentScene = 4;
  if (isKeyPressed("5")) currentScene = 5;

  // Time of day (outdoor scene)
  if (isKeyPressed("t")) {
    timeOfDay = (timeOfDay + 0.125) % 1.0;
  }

  // Player movement with collision
  const speed = 200 * dt;
  let newX = playerX;
  let newY = playerY;
  if (isKeyDown("ArrowLeft")) newX -= speed;
  if (isKeyDown("ArrowRight")) newX += speed;
  if (isKeyDown("ArrowUp")) newY -= speed;
  if (isKeyDown("ArrowDown")) newY += speed;

  // Player half-size (16x16 sprite)
  const ph = 8;
  // Wall thickness on each side
  const wallW = 64;
  // Pillar bounds (scene 1 only)
  const pillarL = VPW / 2 - 32;
  const pillarR = VPW / 2 + 32;
  const pillarT = VPH / 2 - 64;
  const pillarB = pillarT + 128;

  // Clamp to walls
  newX = Math.max(wallW + ph, Math.min(VPW - wallW - ph, newX));
  newY = Math.max(ph, Math.min(VPH - ph, newY));

  // Pillar collision (dungeon scene)
  if (currentScene === 1) {
    if (newX + ph > pillarL && newX - ph < pillarR &&
        newY + ph > pillarT && newY - ph < pillarB) {
      // Push out on the axis with least penetration
      const overlapL = (newX + ph) - pillarL;
      const overlapR = pillarR - (newX - ph);
      const overlapT = (newY + ph) - pillarT;
      const overlapB = pillarB - (newY - ph);
      const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
      if (minOverlap === overlapL) newX = pillarL - ph;
      else if (minOverlap === overlapR) newX = pillarR + ph;
      else if (minOverlap === overlapT) newY = pillarT - ph;
      else newY = pillarB + ph;
    }
  }

  playerX = newX;
  playerY = newY;

  // Draw current scene
  switch (currentScene) {
    case 1:
      drawDungeonScene(dt, VPW, VPH);
      break;
    case 2:
      drawLavaScene(dt, VPW, VPH);
      break;
    case 3:
      drawOutdoorScene(dt, VPW, VPH);
      break;
    case 4:
      drawNeonScene(dt, VPW, VPH);
      break;
    case 5:
      drawComparisonScene(dt, VPW, VPH);
      break;
  }

  // Draw player with lantern glow
  sprite(TEX_PLAYER, playerX - 8, playerY - 8, 16, 16, 5);
  addPointLight(playerX, playerY, 80, 0.9, 0.8, 0.6, 0.5);

  // Spot light following mouse (flashlight cone)
  const mouse = getMousePosition();
  if (mouse.x > 0 && mouse.y > 0) {
    const angle = Math.atan2(mouse.y - playerY, mouse.x - playerX);
    addSpotLight({
      x: playerX,
      y: playerY,
      angle,
      spread: 0.6,
      range: 300,
      r: 0.9,
      g: 0.9,
      b: 1.0,
      intensity: 0.6,
    });
  }

  // HUD
  const sceneName = ["", "Dungeon", "Lava", "Outdoor", "Neon", "Comparison"][currentScene];
  hud.text(`Scene: ${sceneName} (1-5)`, 10, 10, { scale: 1 });
  hud.text(`GI: ${giEnabled ? "ON" : "OFF"} (G)`, 10, 24, { scale: 1 });
  hud.text(`Intensity: ${giIntensity.toFixed(1)} (+/-)`, 10, 38, { scale: 1 });
  if (currentScene === 3) {
    const timeLabel = ["Midnight", "Dawn", "Morning", "Noon", "Afternoon", "Dusk", "Evening", "Night"][
      Math.floor(timeOfDay * 8) % 8
    ];
    hud.text(`Time: ${timeLabel} (T)`, 10, 52, { scale: 1 });
  }
});
