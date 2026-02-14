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
  onFrame,
  getViewportSize,
  setCamera,
  drawText,
  isKeyPressed,
  isKeyDown,
  getMousePosition,
  createSolidTexture,
  drawSprite,
  setBackgroundColor,
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
  setPoolConfig,
  type InstanceId,
} from "@arcane/runtime/rendering";
import { createSlider, updateSlider, drawSlider } from "@arcane/runtime/ui";
import { createButton, updateButton, drawButton } from "@arcane/runtime/ui";
import { rgb } from "@arcane/runtime/ui";

// Scene state
let currentScene = 1;

// Create solid color textures for visuals
const whiteTexture = createSolidTexture(255, 255, 255, 255);
const redTexture = createSolidTexture(255, 100, 100, 255);
const greenTexture = createSolidTexture(100, 255, 100, 255);
const blueTexture = createSolidTexture(100, 100, 255, 255);
const yellowTexture = createSolidTexture(255, 255, 100, 255);
const purpleTexture = createSolidTexture(200, 100, 255, 255);

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

// Create a dummy sound (will be 0 in headless, but that's ok for demo)
const dummySound = loadSound("sound.wav");

function initScene1() {
  soundSources.length = 0;
  listenerPos = { x: 400, y: 300 };

  // Pre-place some sound sources
  soundSources.push({
    x: 200,
    y: 150,
    instanceId: playSoundAt(dummySound, { x: 200, y: 150, loop: true, volume: 0.8 }),
    color: redTexture,
  });
  soundSources.push({
    x: 600,
    y: 150,
    instanceId: playSoundAt(dummySound, { x: 600, y: 150, loop: true, volume: 0.8 }),
    color: greenTexture,
  });
  soundSources.push({
    x: 400,
    y: 450,
    instanceId: playSoundAt(dummySound, { x: 400, y: 450, loop: true, volume: 0.8 }),
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
      instanceId: playSoundAt(dummySound, { x: mouse.x, y: mouse.y, loop: true, volume: 0.8 }),
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
    drawSprite(source.color, source.x, source.y, { width: 32, height: 32 });

    // Draw distance indicator
    const dx = source.x - listenerPos.x;
    const dy = source.y - listenerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    drawText(`${Math.floor(dist)}`, source.x, source.y - 25, { size: 12, screenSpace: false });
  }

  // Draw listener
  drawSprite(whiteTexture, listenerPos.x, listenerPos.y, { width: 40, height: 40 });
  drawText("LISTENER", listenerPos.x - 30, listenerPos.y - 30, { size: 10, screenSpace: false });

  // HUD
  drawText("Scene 1: Spatial Audio", 10, 10, { size: 16, screenSpace: true });
  drawText("WASD: Move listener", 10, 30, { size: 12, screenSpace: true });
  drawText("Click: Place sound source", 10, 50, { size: 12, screenSpace: true });
  drawText(`Listener: (${Math.floor(listenerPos.x)}, ${Math.floor(listenerPos.y)})`, 10, 70, { size: 12, screenSpace: true });
  drawText(`Sources: ${soundSources.length}`, 10, 90, { size: 12, screenSpace: true });
  drawText("Press 2 or 3 to switch scenes", 10, vp.height - 20, { size: 12, screenSpace: true });
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
    drawSprite(zone.color, zone.x + zone.width / 2, zone.y + zone.height / 2, {
      width: zone.width,
      height: zone.height,
      opacity: 0.3,
    });
  }

  // Draw player
  drawSprite(whiteTexture, playerPos.x, playerPos.y, { width: 32, height: 32 });

  // HUD
  drawText("Scene 2: Music Crossfade", 10, 10, { size: 16, screenSpace: true });
  drawText("WASD: Move between zones", 10, 30, { size: 12, screenSpace: true });
  drawText(`Current Zone: ${currentZoneIndex + 1}`, 10, 50, { size: 12, screenSpace: true });
  drawText(`Crossfade: ${Math.floor(crossfadeProgress * 100)}%`, 10, 70, { size: 12, screenSpace: true });

  // Draw crossfade progress bar
  const barX = 10;
  const barY = 90;
  const barWidth = 200;
  const barHeight = 20;
  drawSprite(whiteTexture, barX + barWidth / 2, barY + barHeight / 2, {
    width: barWidth,
    height: barHeight,
    opacity: 0.3,
  });
  drawSprite(greenTexture, barX + (barWidth * crossfadeProgress) / 2, barY + barHeight / 2, {
    width: barWidth * crossfadeProgress,
    height: barHeight,
    opacity: 0.8,
  });

  drawText("Press 1 or 3 to switch scenes", 10, vp.height - 20, { size: 12, screenSpace: true });
}

//=============================================================================
// Scene 3: Mixer Panel
//=============================================================================

const masterSlider = createSlider({ x: 100, y: 100, width: 200, value: 1.0 });
const sfxSlider = createSlider({ x: 100, y: 160, width: 200, value: 1.0 });
const musicSlider = createSlider({ x: 100, y: 220, width: 200, value: 1.0 });
const ambientSlider = createSlider({ x: 100, y: 280, width: 200, value: 1.0 });
const voiceSlider = createSlider({ x: 100, y: 340, width: 200, value: 1.0 });

const testSfxButton = createButton({ x: 450, y: 160, width: 120, height: 30, label: "Test SFX" });
const testMusicButton = createButton({ x: 450, y: 220, width: 120, height: 30, label: "Test Music" });
const testAmbientButton = createButton({ x: 450, y: 280, width: 120, height: 30, label: "Test Ambient" });
const testVoiceButton = createButton({ x: 450, y: 340, width: 120, height: 30, label: "Test Voice" });

function initScene3() {
  // Reset all sliders
  masterSlider.value = 1.0;
  sfxSlider.value = 1.0;
  musicSlider.value = 1.0;
  ambientSlider.value = 1.0;
  voiceSlider.value = 1.0;
}

function updateScene3() {
  const mouse = getMousePosition();
  const mouseDown = isMouseButtonPressed(0);

  // Update sliders
  updateSlider(masterSlider, mouse.x, mouse.y, mouseDown);
  updateSlider(sfxSlider, mouse.x, mouse.y, mouseDown);
  updateSlider(musicSlider, mouse.x, mouse.y, mouseDown);
  updateSlider(ambientSlider, mouse.x, mouse.y, mouseDown);
  updateSlider(voiceSlider, mouse.x, mouse.y, mouseDown);

  // Apply bus volumes
  setBusVolume("sfx", sfxSlider.value);
  setBusVolume("music", musicSlider.value);
  setBusVolume("ambient", ambientSlider.value);
  setBusVolume("voice", voiceSlider.value);

  // Update buttons
  if (updateButton(testSfxButton, mouse.x, mouse.y, mouseDown)) {
    playSound(dummySound, { bus: "sfx", pitchVariation: 0.2 });
  }
  if (updateButton(testMusicButton, mouse.x, mouse.y, mouseDown)) {
    playSound(dummySound, { bus: "music", loop: true });
  }
  if (updateButton(testAmbientButton, mouse.x, mouse.y, mouseDown)) {
    playSound(dummySound, { bus: "ambient", loop: true });
  }
  if (updateButton(testVoiceButton, mouse.x, mouse.y, mouseDown)) {
    playSound(dummySound, { bus: "voice" });
  }
}

function drawScene3() {
  const vp = getViewportSize();
  setCamera(vp.width / 2, vp.height / 2);

  // HUD
  drawText("Scene 3: Mixer Panel", 10, 10, { size: 16, screenSpace: true });
  drawText("Adjust bus volumes and test sounds", 10, 30, { size: 12, screenSpace: true });

  // Slider labels
  drawText("Master Volume:", 100, 85, { size: 12, screenSpace: true });
  drawText("SFX Bus:", 100, 145, { size: 12, screenSpace: true });
  drawText("Music Bus:", 100, 205, { size: 12, screenSpace: true });
  drawText("Ambient Bus:", 100, 265, { size: 12, screenSpace: true });
  drawText("Voice Bus:", 100, 325, { size: 12, screenSpace: true });

  // Slider values
  drawText(`${Math.floor(masterSlider.value * 100)}%`, 320, 100, { size: 12, screenSpace: true });
  drawText(`${Math.floor(sfxSlider.value * 100)}%`, 320, 160, { size: 12, screenSpace: true });
  drawText(`${Math.floor(musicSlider.value * 100)}%`, 320, 220, { size: 12, screenSpace: true });
  drawText(`${Math.floor(ambientSlider.value * 100)}%`, 320, 280, { size: 12, screenSpace: true });
  drawText(`${Math.floor(voiceSlider.value * 100)}%`, 320, 340, { size: 12, screenSpace: true });

  // Draw sliders
  drawSlider(masterSlider, whiteTexture, greenTexture);
  drawSlider(sfxSlider, whiteTexture, redTexture);
  drawSlider(musicSlider, whiteTexture, blueTexture);
  drawSlider(ambientSlider, whiteTexture, purpleTexture);
  drawSlider(voiceSlider, whiteTexture, yellowTexture);

  // Draw buttons
  drawButton(testSfxButton, whiteTexture, redTexture);
  drawButton(testMusicButton, whiteTexture, blueTexture);
  drawButton(testAmbientButton, whiteTexture, purpleTexture);
  drawButton(testVoiceButton, whiteTexture, yellowTexture);

  drawText("Press 1 or 2 to switch scenes", 10, vp.height - 20, { size: 12, screenSpace: true });
}

//=============================================================================
// Main Loop
//=============================================================================

// Initialize first scene
initScene1();

onFrame((dt: number) => {
  setBackgroundColor(30 / 255, 30 / 255, 40 / 255);

  // Scene switching
  if (isKeyPressed("1")) {
    currentScene = 1;
    initScene1();
  } else if (isKeyPressed("2")) {
    currentScene = 2;
    initScene2();
  } else if (isKeyPressed("3")) {
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
