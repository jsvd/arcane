/**
 * Audio Showcase Demo
 *
 * Three interactive scenes demonstrating Phase 20 audio features:
 * - Scene 1: Spatial Audio visualization with WASD movement
 * - Scene 2: Music Crossfade between colored zones
 * - Scene 3: Mixer Panel with bus controls and test sounds
 *
 * Controls:
 * - 1/2/3: Switch between scenes
 * - Scene 1: WASD to move listener, Click to place sound sources
 * - Scene 2: WASD to move through zones, music crossfades automatically
 * - Scene 3: Mouse to interact with sliders and buttons
 */

import {
  getViewportSize,
  setCamera,
  drawText,
  isKeyPressed,
  isKeyDown,
  getMousePosition,
  createSolidTexture,
  drawSprite,
  isMouseButtonDown,
  isMouseButtonPressed,
} from "@arcane/runtime/rendering";
import {
  loadSound,
  playSound,
  playSoundAt,
  setListenerPosition,
  updateSpatialAudio,
  crossfadeMusic,
  setBusVolume,
  getBusVolume,
  stopAll,
  setPoolConfig,
  type InstanceId,
} from "@arcane/runtime/rendering";
import { createSlider, drawSlider } from "@arcane/runtime/ui";
import { createButton, drawButton } from "@arcane/runtime/ui";
import { rgb } from "@arcane/runtime/ui";
import { createGame, hud, captureInput, autoUpdateSlider, autoUpdateButton } from "../../runtime/game/index.ts";

// Scene state
let currentScene = 1;

// Create solid color textures for visuals
const whiteTexture = createSolidTexture("white", rgb(255, 255, 255));
const redTexture = createSolidTexture("red", rgb(255, 100, 100));
const greenTexture = createSolidTexture("green", rgb(100, 255, 100));
const blueTexture = createSolidTexture("blue", rgb(100, 100, 255));
const yellowTexture = createSolidTexture("yellow", rgb(255, 255, 100));
const purpleTexture = createSolidTexture("purple", rgb(200, 100, 255));

//=============================================================================
// Scene 1: Spatial Audio
//=============================================================================

type SoundSource = {
  x: number;
  y: number;
  instanceId: InstanceId;
  color: number; // texture id
};

const soundSources: SoundSource[] = [];
let listenerPos = { x: 400, y: 300 };
const LISTENER_SPEED = 200;

// Load sounds — each button gets a distinct sound
const spatialSound = loadSound("sound.ogg");
const sfxSound = loadSound("sfx.ogg");
const musicSound = loadSound("zone1.ogg");
const ambientSound = loadSound("ambient.ogg");
const voiceSound = loadSound("voice.ogg");

function initScene1() {
  soundSources.length = 0;
  listenerPos = { x: 400, y: 300 };

  // Pre-place some sound sources
  soundSources.push({
    x: 200,
    y: 150,
    instanceId: playSoundAt(spatialSound, { x: 200, y: 150, loop: true, volume: 0.8 }),
    color: redTexture,
  });
  soundSources.push({
    x: 600,
    y: 150,
    instanceId: playSoundAt(spatialSound, { x: 600, y: 150, loop: true, volume: 0.8 }),
    color: greenTexture,
  });
  soundSources.push({
    x: 400,
    y: 450,
    instanceId: playSoundAt(spatialSound, { x: 400, y: 450, loop: true, volume: 0.8 }),
    color: blueTexture,
  });
}

function updateScene1(dt: number) {
  // WASD movement
  if (isKeyDown("w") || isKeyDown("ArrowUp")) {
    listenerPos.y -= LISTENER_SPEED * dt;
  }
  if (isKeyDown("s") || isKeyDown("ArrowDown")) {
    listenerPos.y += LISTENER_SPEED * dt;
  }
  if (isKeyDown("a") || isKeyDown("ArrowLeft")) {
    listenerPos.x -= LISTENER_SPEED * dt;
  }
  if (isKeyDown("d") || isKeyDown("ArrowRight")) {
    listenerPos.x += LISTENER_SPEED * dt;
  }

  // Click to place new sound source
  if (isMouseButtonPressed(0)) {
    const mouse = getMousePosition();
    const colors = [redTexture, greenTexture, blueTexture, yellowTexture, purpleTexture];
    const color = colors[soundSources.length % colors.length];

    soundSources.push({
      x: mouse.x,
      y: mouse.y,
      instanceId: playSoundAt(spatialSound, { x: mouse.x, y: mouse.y, loop: true, volume: 0.8 }),
      color,
    });
  }

  // Update spatial audio with listener position
  setListenerPosition(listenerPos.x, listenerPos.y);
  updateSpatialAudio();
}

function drawScene1() {
  const vp = getViewportSize();
  setCamera(vp.width / 2, vp.height / 2);

  // Draw sound sources
  for (const source of soundSources) {
    drawSprite({ textureId: source.color, x: source.x, y: source.y, w: 32, h: 32 });

    // Draw distance indicator
    const dx = source.x - listenerPos.x;
    const dy = source.y - listenerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    drawText(`${Math.floor(dist)}`, source.x, source.y - 25, { size: 12, screenSpace: false });
  }

  // Draw listener
  drawSprite({ textureId: whiteTexture, x: listenerPos.x, y: listenerPos.y, w: 40, h: 40 });
  drawText("LISTENER", listenerPos.x - 30, listenerPos.y - 30, { size: 10, screenSpace: false });

  // HUD
  hud.text("Scene 1: Spatial Audio", 10, 10, { scale: 2 });
  hud.text("WASD: Move listener", 10, 30, { scale: 1 });
  hud.text("Click: Place sound source", 10, 50, { scale: 1 });
  hud.text(`Listener: (${Math.floor(listenerPos.x)}, ${Math.floor(listenerPos.y)})`, 10, 70, { scale: 1 });
  hud.text(`Sources: ${soundSources.length}`, 10, 90, { scale: 1 });
  hud.text("Press 2 or 3 to switch scenes", 10, vp.height - 20, { scale: 1 });
}

//=============================================================================
// Scene 2: Music Crossfade
//=============================================================================

type Zone = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  musicPath: string;
};

const zones: Zone[] = [
  { x: 0, y: 0, width: 400, height: 600, color: redTexture, musicPath: "zone1.ogg" },
  { x: 400, y: 0, width: 400, height: 600, color: greenTexture, musicPath: "zone2.ogg" },
];

let playerPos = { x: 200, y: 300 };
let currentZoneIndex = 0;
let crossfadeProgress = 1.0; // 0 = starting crossfade, 1 = complete
let lastCrossfadeTime = 0;
const CROSSFADE_DURATION = 2000; // ms

function initScene2() {
  playerPos = { x: 200, y: 300 };
  currentZoneIndex = 0;
  crossfadeProgress = 1.0;
  // Start music in first zone
  crossfadeMusic(zones[0].musicPath, 0, 0.8);
}

function updateScene2(dt: number) {
  const PLAYER_SPEED = 150;

  // WASD movement
  if (isKeyDown("w") || isKeyDown("ArrowUp")) {
    playerPos.y -= PLAYER_SPEED * dt;
  }
  if (isKeyDown("s") || isKeyDown("ArrowDown")) {
    playerPos.y += PLAYER_SPEED * dt;
  }
  if (isKeyDown("a") || isKeyDown("ArrowLeft")) {
    playerPos.x -= PLAYER_SPEED * dt;
  }
  if (isKeyDown("d") || isKeyDown("ArrowRight")) {
    playerPos.x += PLAYER_SPEED * dt;
  }

  // Clamp to zones
  playerPos.x = Math.max(0, Math.min(800, playerPos.x));
  playerPos.y = Math.max(0, Math.min(600, playerPos.y));

  // Detect zone change
  let newZoneIndex = currentZoneIndex;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    if (
      playerPos.x >= z.x &&
      playerPos.x < z.x + z.width &&
      playerPos.y >= z.y &&
      playerPos.y < z.y + z.height
    ) {
      newZoneIndex = i;
      break;
    }
  }

  if (newZoneIndex !== currentZoneIndex) {
    currentZoneIndex = newZoneIndex;
    crossfadeMusic(zones[currentZoneIndex].musicPath, CROSSFADE_DURATION, 0.8);
    crossfadeProgress = 0.0;
    lastCrossfadeTime = Date.now();
  }

  // Update crossfade progress
  if (crossfadeProgress < 1.0) {
    const elapsed = Date.now() - lastCrossfadeTime;
    crossfadeProgress = Math.min(1.0, elapsed / CROSSFADE_DURATION);
  }
}

function drawScene2() {
  const vp = getViewportSize();
  setCamera(vp.width / 2, vp.height / 2);

  // Draw zones
  for (const zone of zones) {
    drawSprite({
      textureId: zone.color,
      x: zone.x + zone.width / 2,
      y: zone.y + zone.height / 2,
      w: zone.width,
      h: zone.height,
      opacity: 0.3,
    });
  }

  // Draw player
  drawSprite({ textureId: whiteTexture, x: playerPos.x, y: playerPos.y, w: 32, h: 32 });

  // HUD
  hud.text("Scene 2: Music Crossfade", 10, 10, { scale: 2 });
  hud.text("WASD: Move between zones", 10, 30, { scale: 1 });
  hud.text(`Current Zone: ${currentZoneIndex + 1}`, 10, 50, { scale: 1 });
  hud.text(`Crossfade: ${Math.floor(crossfadeProgress * 100)}%`, 10, 70, { scale: 1 });

  // Draw crossfade progress bar
  const barX = 10;
  const barY = 90;
  const barWidth = 200;
  const barHeight = 20;
  drawSprite({
    textureId: whiteTexture,
    x: barX + barWidth / 2,
    y: barY + barHeight / 2,
    w: barWidth,
    h: barHeight,
    opacity: 0.3,
  });
  drawSprite({
    textureId: greenTexture,
    x: barX + (barWidth * crossfadeProgress) / 2,
    y: barY + barHeight / 2,
    w: barWidth * crossfadeProgress,
    h: barHeight,
    opacity: 0.8,
  });

  hud.text("Press 1 or 3 to switch scenes", 10, vp.height - 20, { scale: 1 });
}

//=============================================================================
// Scene 3: Mixer Panel
//=============================================================================

// createSlider(x, y, w, min, max, value, label?)
const masterSlider = createSlider(100, 100, 200, 0, 1, 1.0, "Master");
const sfxSlider = createSlider(100, 160, 200, 0, 1, 1.0, "SFX");
const musicSlider = createSlider(100, 220, 200, 0, 1, 1.0, "Music");
const ambientSlider = createSlider(100, 280, 200, 0, 1, 1.0, "Ambient");
const voiceSlider = createSlider(100, 340, 200, 0, 1, 1.0, "Voice");

// createButton(x, y, w, h, label)
const testSfxButton = createButton(450, 160, 120, 30, "Test SFX");
const testMusicButton = createButton(450, 220, 120, 30, "Test Music");
const testAmbientButton = createButton(450, 280, 120, 30, "Test Ambient");
const testVoiceButton = createButton(450, 340, 120, 30, "Test Voice");

function initScene3() {
  // Reset all sliders
  masterSlider.value = 1.0;
  sfxSlider.value = 1.0;
  musicSlider.value = 1.0;
  ambientSlider.value = 1.0;
  voiceSlider.value = 1.0;
}

function updateScene3() {
  const input = captureInput();

  // Update sliders
  autoUpdateSlider(masterSlider, input);
  autoUpdateSlider(sfxSlider, input);
  autoUpdateSlider(musicSlider, input);
  autoUpdateSlider(ambientSlider, input);
  autoUpdateSlider(voiceSlider, input);

  // Apply bus volumes
  setBusVolume("sfx", sfxSlider.value);
  setBusVolume("music", musicSlider.value);
  setBusVolume("ambient", ambientSlider.value);
  setBusVolume("voice", voiceSlider.value);

  // Update buttons
  autoUpdateButton(testSfxButton, input);
  autoUpdateButton(testMusicButton, input);
  autoUpdateButton(testAmbientButton, input);
  autoUpdateButton(testVoiceButton, input);

  if (testSfxButton.clicked) {
    playSound(sfxSound, { bus: "sfx", pitchVariation: 0.2 });
  }
  if (testMusicButton.clicked) {
    playSound(musicSound, { bus: "music", loop: true });
  }
  if (testAmbientButton.clicked) {
    playSound(ambientSound, { bus: "ambient", loop: true });
  }
  if (testVoiceButton.clicked) {
    playSound(voiceSound, { bus: "voice" });
  }
}

function drawScene3() {
  const vp = getViewportSize();
  setCamera(vp.width / 2, vp.height / 2);

  // HUD
  hud.text("Scene 3: Mixer Panel", 10, 10, { scale: 2 });
  hud.text("Adjust bus volumes and test sounds", 10, 30, { scale: 1 });

  // Slider values (labels are built into the sliders via createSlider)
  hud.text(`${Math.floor(masterSlider.value * 100)}%`, 320, 105, { scale: 1 });
  hud.text(`${Math.floor(sfxSlider.value * 100)}%`, 320, 165, { scale: 1 });
  hud.text(`${Math.floor(musicSlider.value * 100)}%`, 320, 225, { scale: 1 });
  hud.text(`${Math.floor(ambientSlider.value * 100)}%`, 320, 285, { scale: 1 });
  hud.text(`${Math.floor(voiceSlider.value * 100)}%`, 320, 345, { scale: 1 });

  // Draw sliders
  drawSlider(masterSlider);
  drawSlider(sfxSlider);
  drawSlider(musicSlider);
  drawSlider(ambientSlider);
  drawSlider(voiceSlider);

  // Draw buttons
  drawButton(testSfxButton);
  drawButton(testMusicButton);
  drawButton(testAmbientButton);
  drawButton(testVoiceButton);

  hud.text("Press 1 or 2 to switch scenes", 10, vp.height - 20, { scale: 1 });
}

//=============================================================================
// Main Loop
//=============================================================================

// Initialize first scene
initScene1();

const game = createGame({ background: { r: 30 / 255, g: 30 / 255, b: 40 / 255 } });

game.onFrame((ctx) => {
  const dt = ctx.dt;

  // Scene switching
  if (isKeyPressed("1") && currentScene !== 1) {
    stopAll();
    currentScene = 1;
    initScene1();
  } else if (isKeyPressed("2") && currentScene !== 2) {
    stopAll();
    currentScene = 2;
    initScene2();
  } else if (isKeyPressed("3") && currentScene !== 3) {
    stopAll();
    currentScene = 3;
    initScene3();
  }

  // Update current scene
  if (currentScene === 1) {
    updateScene1(dt);
    drawScene1();
  } else if (currentScene === 2) {
    updateScene2(dt);
    drawScene2();
  } else if (currentScene === 3) {
    updateScene3();
    drawScene3();
  }
});
