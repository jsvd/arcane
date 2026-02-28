// MSDF Text Showcase — Demonstrates MSDF text rendering with effects
// Run with: arcane dev demos/msdf-text-showcase/msdf-text-showcase.ts

import {
  isKeyPressed,
  drawText,
  getDefaultFont,
  getDefaultMSDFFont,
  loadMSDFFont,
} from "../../runtime/rendering/index.ts";
import type { MSDFFont } from "../../runtime/rendering/index.ts";
import { createGame } from "../../runtime/game/index.ts";

// --- State ---

let currentSection = 1;
const totalSections = 7;

// Custom font (loaded lazily)
let robotoFont: MSDFFont | null = null;
let robotoLoadAttempted = false;

// Interactive mode state (section 6)
let interactiveScale = 2.0;
let interactiveShadowOffsetX = 2.0;
let interactiveShadowOffsetY = 2.0;
let interactiveOutlineWidth = 1.0;
let interactiveShadowSoftness = 1.0;

// --- Helpers ---

const white = { r: 1, g: 1, b: 1, a: 1 };
const gray = { r: 0.6, g: 0.6, b: 0.6, a: 1 };
const red = { r: 1, g: 0.2, b: 0.2, a: 1 };
const green = { r: 0.2, g: 1, b: 0.3, a: 1 };
const blue = { r: 0.3, g: 0.4, b: 1, a: 1 };
const yellow = { r: 1, g: 0.9, b: 0.2, a: 1 };
const cyan = { r: 0.2, g: 0.9, b: 1, a: 1 };
const magenta = { r: 1, g: 0.2, b: 0.8, a: 1 };
const orange = { r: 1, g: 0.6, b: 0.1, a: 1 };
const black = { r: 0, g: 0, b: 0, a: 1 };
const blackAlpha = { r: 0, g: 0, b: 0, a: 0.6 };

function drawTitle(title: string) {
  const msdf = getDefaultMSDFFont();
  drawText(title, 20, 16, {
    msdfFont: msdf,
    scale: 2.5,
    tint: yellow,
    screenSpace: true,
    layer: 200,
  });
}

function drawHelpBar(vpH: number) {
  drawText(
    `[1-7] Switch section  Current: ${currentSection}/${totalSections}`,
    20,
    vpH - 24,
    { font: getDefaultFont(), scale: 2, tint: gray, screenSpace: true, layer: 200 },
  );
}

// --- Section Renderers ---

function drawSection1_Comparison(vpW: number) {
  drawTitle("1: Bitmap vs MSDF Comparison");

  const bitmap = getDefaultFont();
  const msdf = getDefaultMSDFFont();
  const halfW = vpW / 2;

  // Column headers
  drawText("BITMAP FONT", 40, 70, {
    font: bitmap,
    scale: 2,
    tint: cyan,
    screenSpace: true,
    layer: 200,
  });
  drawText("MSDF FONT", halfW + 40, 70, {
    msdfFont: msdf,
    scale: 1.5,
    tint: cyan,
    screenSpace: true,
    layer: 200,
  });

  const scales = [1, 2, 4];
  let y = 110;

  for (const s of scales) {
    const label = `Scale ${s}x:`;

    // Bitmap side
    drawText(label, 40, y, {
      font: bitmap,
      scale: 1,
      tint: gray,
      screenSpace: true,
      layer: 200,
    });
    drawText("Hello Arcane!", 40, y + 16, {
      font: bitmap,
      scale: s,
      tint: white,
      screenSpace: true,
      layer: 200,
    });

    // MSDF side
    drawText(label, halfW + 40, y, {
      font: bitmap,
      scale: 1,
      tint: gray,
      screenSpace: true,
      layer: 200,
    });
    drawText("Hello Arcane!", halfW + 40, y + 16, {
      msdfFont: msdf,
      scale: s * 0.8,
      tint: white,
      screenSpace: true,
      layer: 200,
    });

    y += 20 + s * 14;
  }

  // Explanation
  drawText("Bitmap fonts become pixelated at higher scales.", 40, y + 20, {
    font: bitmap,
    scale: 1,
    tint: gray,
    screenSpace: true,
    layer: 200,
  });
  drawText("MSDF fonts stay crisp at any scale!", 40, y + 34, {
    msdfFont: msdf,
    scale: 1.2,
    tint: green,
    screenSpace: true,
    layer: 200,
  });
}

function drawSection2_Outlines() {
  drawTitle("2: Outline Effects (MSDF)");

  const msdf = getDefaultMSDFFont();
  let y = 80;

  // Thin outline - red
  drawText("Thin outline (0.5)", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: white,
    screenSpace: true,
    layer: 200,
    outline: { width: 0.5, color: red },
  });
  y += 50;

  // Medium outline - blue
  drawText("Medium outline (1.0)", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: white,
    screenSpace: true,
    layer: 200,
    outline: { width: 1.0, color: blue },
  });
  y += 50;

  // Thick outline - green
  drawText("Thick outline (2.0)", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: white,
    screenSpace: true,
    layer: 200,
    outline: { width: 2.0, color: green },
  });
  y += 50;

  // Dark outline on colored text
  drawText("Dark outline on gold", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: yellow,
    screenSpace: true,
    layer: 200,
    outline: { width: 1.0, color: { r: 0.1, g: 0.05, b: 0, a: 1 } },
  });
  y += 50;

  // Bright outline on dark text
  drawText("Neon glow effect", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: { r: 0.1, g: 0.1, b: 0.15, a: 1 },
    screenSpace: true,
    layer: 200,
    outline: { width: 1.5, color: cyan },
  });
}

function drawSection3_Shadows() {
  drawTitle("3: Shadow Effects (MSDF)");

  const msdf = getDefaultMSDFFont();
  let y = 80;

  // Hard shadow
  drawText("Hard shadow (softness 1.0)", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: white,
    screenSpace: true,
    layer: 200,
    shadow: {
      offsetX: 3,
      offsetY: 3,
      color: blackAlpha,
      softness: 1.0,
    },
  });
  y += 55;

  // Soft shadow
  drawText("Soft shadow (softness 3.0)", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: white,
    screenSpace: true,
    layer: 200,
    shadow: {
      offsetX: 4,
      offsetY: 4,
      color: blackAlpha,
      softness: 3.0,
    },
  });
  y += 55;

  // Large offset shadow
  drawText("Large offset shadow", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: white,
    screenSpace: true,
    layer: 200,
    shadow: {
      offsetX: 6,
      offsetY: 6,
      color: { r: 0, g: 0, b: 0, a: 0.8 },
      softness: 2.0,
    },
  });
  y += 55;

  // Colored shadow
  drawText("Colored drop shadow", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: yellow,
    screenSpace: true,
    layer: 200,
    shadow: {
      offsetX: 3,
      offsetY: 3,
      color: { r: 0.5, g: 0.2, b: 0, a: 0.7 },
      softness: 2.0,
    },
  });
}

function drawSection4_Combined() {
  drawTitle("4: Combined Outline + Shadow");

  const msdf = getDefaultMSDFFont();
  let y = 80;

  // Classic game title look
  drawText("EPIC QUEST", 40, y, {
    msdfFont: msdf,
    scale: 3.5,
    tint: yellow,
    screenSpace: true,
    layer: 200,
    outline: { width: 1.0, color: { r: 0.4, g: 0.2, b: 0, a: 1 } },
    shadow: {
      offsetX: 4,
      offsetY: 4,
      color: { r: 0, g: 0, b: 0, a: 0.7 },
      softness: 2.0,
    },
  });
  y += 70;

  // Frosty / icy style
  drawText("Frozen Depths", 40, y, {
    msdfFont: msdf,
    scale: 3.0,
    tint: { r: 0.8, g: 0.9, b: 1, a: 1 },
    screenSpace: true,
    layer: 200,
    outline: { width: 0.8, color: { r: 0.1, g: 0.3, b: 0.6, a: 1 } },
    shadow: {
      offsetX: 3,
      offsetY: 3,
      color: { r: 0, g: 0.1, b: 0.3, a: 0.6 },
      softness: 2.5,
    },
  });
  y += 60;

  // Fire / lava style
  drawText("INFERNO", 40, y, {
    msdfFont: msdf,
    scale: 3.5,
    tint: { r: 1, g: 0.8, b: 0.2, a: 1 },
    screenSpace: true,
    layer: 200,
    outline: { width: 1.2, color: { r: 0.8, g: 0.1, b: 0, a: 1 } },
    shadow: {
      offsetX: 3,
      offsetY: 5,
      color: { r: 0.3, g: 0, b: 0, a: 0.8 },
      softness: 3.0,
    },
  });
  y += 70;

  // Clean UI style
  drawText("Settings Menu", 40, y, {
    msdfFont: msdf,
    scale: 2.5,
    tint: white,
    screenSpace: true,
    layer: 200,
    outline: { width: 0.5, color: { r: 0, g: 0, b: 0, a: 0.8 } },
    shadow: {
      offsetX: 2,
      offsetY: 2,
      color: { r: 0, g: 0, b: 0, a: 0.4 },
      softness: 1.5,
    },
  });
}

function drawSection5_Colors() {
  drawTitle("5: Tint Color Palette");

  const msdf = getDefaultMSDFFont();
  const sampleText = "Arcane Engine";

  const colors: Array<{ name: string; color: typeof white }> = [
    { name: "White", color: white },
    { name: "Red", color: red },
    { name: "Green", color: green },
    { name: "Blue", color: blue },
    { name: "Yellow", color: yellow },
    { name: "Cyan", color: cyan },
    { name: "Magenta", color: magenta },
    { name: "Orange", color: orange },
  ];

  let y = 80;
  for (const entry of colors) {
    drawText(`${entry.name}: ${sampleText}`, 40, y, {
      msdfFont: msdf,
      scale: 2.0,
      tint: entry.color,
      screenSpace: true,
      layer: 200,
    });
    y += 40;
  }

  // Gradient-like demonstration with multiple tints in a row
  y += 10;
  drawText("Color mixing with outlines:", 40, y, {
    font: getDefaultFont(),
    scale: 1,
    tint: gray,
    screenSpace: true,
    layer: 200,
  });
  y += 18;

  const gradientColors = [red, orange, yellow, green, cyan, blue, magenta];
  let x = 40;
  for (const c of gradientColors) {
    drawText("*", x, y, {
      msdfFont: msdf,
      scale: 3.0,
      tint: c,
      screenSpace: true,
      layer: 200,
      outline: { width: 0.8, color: black },
    });
    x += 30;
  }
}

function drawSection6_Interactive() {
  drawTitle("6: Interactive Mode");

  const msdf = getDefaultMSDFFont();

  // Handle input
  if (isKeyPressed("=") || isKeyPressed("+")) {
    interactiveScale = Math.min(8, interactiveScale + 0.5);
  }
  if (isKeyPressed("-")) {
    interactiveScale = Math.max(0.5, interactiveScale - 0.5);
  }

  if (isKeyPressed("ArrowRight")) {
    interactiveShadowOffsetX += 1;
  }
  if (isKeyPressed("ArrowLeft")) {
    interactiveShadowOffsetX -= 1;
  }
  if (isKeyPressed("ArrowDown")) {
    interactiveShadowOffsetY += 1;
  }
  if (isKeyPressed("ArrowUp")) {
    interactiveShadowOffsetY -= 1;
  }

  if (isKeyPressed("p")) {
    interactiveOutlineWidth = Math.min(3, interactiveOutlineWidth + 0.25);
  }
  if (isKeyPressed("o")) {
    interactiveOutlineWidth = Math.max(0, interactiveOutlineWidth - 0.25);
  }

  if (isKeyPressed("]")) {
    interactiveShadowSoftness = Math.min(5, interactiveShadowSoftness + 0.25);
  }
  if (isKeyPressed("[")) {
    interactiveShadowSoftness = Math.max(0.5, interactiveShadowSoftness - 0.25);
  }

  // Draw the sample text with current params
  const sampleY = 120;
  drawText("Live Preview!", 40, sampleY, {
    msdfFont: msdf,
    scale: interactiveScale,
    tint: white,
    screenSpace: true,
    layer: 200,
    outline:
      interactiveOutlineWidth > 0
        ? { width: interactiveOutlineWidth, color: cyan }
        : undefined,
    shadow: {
      offsetX: interactiveShadowOffsetX,
      offsetY: interactiveShadowOffsetY,
      color: blackAlpha,
      softness: interactiveShadowSoftness,
    },
  });

  // HUD showing current parameters
  const bitmap = getDefaultFont();
  const paramY = 300;
  const params = [
    `Scale: ${interactiveScale.toFixed(1)}   (+/- to adjust)`,
    `Shadow Offset: (${interactiveShadowOffsetX.toFixed(0)}, ${interactiveShadowOffsetY.toFixed(0)})   (Arrow keys)`,
    `Outline Width: ${interactiveOutlineWidth.toFixed(2)}   (O/P to adjust)`,
    `Shadow Softness: ${interactiveShadowSoftness.toFixed(2)}   ([ / ] to adjust)`,
  ];

  for (let i = 0; i < params.length; i++) {
    drawText(params[i], 40, paramY + i * 20, {
      font: bitmap,
      scale: 2,
      tint: green,
      screenSpace: true,
      layer: 200,
    });
  }
}

function drawSection7_CustomFont() {
  drawTitle("7: Custom Font (Roboto)");

  const bitmap = getDefaultFont();

  // Load the custom font on first visit (lazy loading)
  if (!robotoLoadAttempted) {
    robotoLoadAttempted = true;
    try {
      // Load Roboto MSDF font from local files (paths relative to this demo's dir)
      robotoFont = loadMSDFFont(
        "fonts/roboto-msdf.png",
        "fonts/Roboto-Regular.json",
      );
    } catch (err) {
      console.error("Failed to load Roboto font:", err);
    }
  }

  if (!robotoFont) {
    drawText("Loading Roboto font...", 40, 100, {
      font: bitmap,
      scale: 2,
      tint: gray,
      screenSpace: true,
      layer: 200,
    });
    return;
  }

  // Roboto has lineHeight=63 at native size 48, scale accordingly
  const baseLineHeight = 63;
  let y = 70;

  // Scale 0.5 - smaller text
  drawText("Roboto Regular - Scale 0.5", 40, y, {
    msdfFont: robotoFont,
    scale: 0.5,
    tint: white,
    screenSpace: true,
    layer: 200,
  });
  y += baseLineHeight * 0.5 + 5;

  // Scale 1.0
  drawText("Roboto Regular - Scale 1.0", 40, y, {
    msdfFont: robotoFont,
    scale: 1.0,
    tint: white,
    screenSpace: true,
    layer: 200,
  });
  y += baseLineHeight * 1.0 + 5;

  // Scale 1.5
  drawText("Roboto Regular - Scale 1.5", 40, y, {
    msdfFont: robotoFont,
    scale: 1.5,
    tint: cyan,
    screenSpace: true,
    layer: 200,
    outline: { width: 1.0, color: { r: 0, g: 0.2, b: 0.4, a: 1 } },
  });
  y += baseLineHeight * 1.5 + 5;

  // Scale 2.0 with shadow
  drawText("Roboto with Shadow", 40, y, {
    msdfFont: robotoFont,
    scale: 2.0,
    tint: yellow,
    screenSpace: true,
    layer: 200,
    shadow: {
      offsetX: 3,
      offsetY: 3,
      color: blackAlpha,
      softness: 2.0,
    },
  });
  y += baseLineHeight * 2.0 + 10;

  // Character set at scale 1.0
  drawText("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 40, y, {
    msdfFont: robotoFont,
    scale: 1.0,
    tint: green,
    screenSpace: true,
    layer: 200,
  });
  y += baseLineHeight * 1.0;

  drawText("abcdefghijklmnopqrstuvwxyz 0123456789", 40, y, {
    msdfFont: robotoFont,
    scale: 1.0,
    tint: orange,
    screenSpace: true,
    layer: 200,
  });
}

// --- Game Bootstrap ---

const game = createGame({ name: "msdf-text-showcase", background: { r: 38 / 255, g: 38 / 255, b: 51 / 255 } });

// --- Main Frame Loop ---

game.onFrame((ctx) => {
  const { vpW, vpH } = ctx;

  // Section switching with number keys
  if (isKeyPressed("1")) currentSection = 1;
  if (isKeyPressed("2")) currentSection = 2;
  if (isKeyPressed("3")) currentSection = 3;
  if (isKeyPressed("4")) currentSection = 4;
  if (isKeyPressed("5")) currentSection = 5;
  if (isKeyPressed("6")) currentSection = 6;
  if (isKeyPressed("7")) currentSection = 7;

  // Draw active section
  switch (currentSection) {
    case 1:
      drawSection1_Comparison(vpW);
      break;
    case 2:
      drawSection2_Outlines();
      break;
    case 3:
      drawSection3_Shadows();
      break;
    case 4:
      drawSection4_Combined();
      break;
    case 5:
      drawSection5_Colors();
      break;
    case 6:
      drawSection6_Interactive();
      break;
    case 7:
      drawSection7_CustomFont();
      break;
  }

  // Always draw the help bar
  drawHelpBar(vpH);
});

// --- Agent Registration ---

type MSDFState = { section: number };

game.state<MSDFState>({
  get: () => ({ section: currentSection }),
  set: (s) => { currentSection = s.section; },
  describe: (s) => `MSDF text showcase | Section ${s.section}/${totalSections}`,
});
