/**
 * UI Showcase Demo — Phase 16
 *
 * Demonstrates all interactive UI widgets:
 * - Buttons with hover/press/disabled states
 * - Checkboxes and radio groups
 * - Sliders for volume/brightness
 * - Text input field
 * - Layout helpers and focus system
 *
 * Run: cargo run -- dev demos/ui-showcase/ui-showcase.ts
 */

import {
  isKeyPressed,
  drawText,
} from "../../runtime/rendering/index.ts";
import {
  drawRect,
  drawPanel,
  Colors,
  withAlpha,
  createButton,
  drawButton,
  createCheckbox,
  drawCheckbox,
  createRadioGroup,
  updateRadioGroup,
  drawRadioGroup,
  createSlider,
  drawSlider,
  createTextInput,
  updateTextInput,
  drawTextInput,
  createFocusManager,
  registerFocusable,
  verticalStack,
  anchorPosition,
} from "../../runtime/ui/index.ts";
import type { TextInputKeyEvent } from "../../runtime/ui/index.ts";
import {
  createGame,
  captureInput,
  autoUpdateButton,
  autoUpdateSlider,
  autoUpdateCheckbox,
  autoUpdateFocus,
  hud,
} from "../../runtime/game/index.ts";
import type { FrameInput } from "../../runtime/game/index.ts";

// ---- State ----
type Page = "menu" | "settings" | "profile";

let currentPage: Page = "menu";
let totalTime = 0;
let statusMessage = "";
let statusTimer = 0;

// ---- Focus system ----
const focus = createFocusManager();

// ---- Menu page widgets ----
const startBtn = createButton(0, 0, 180, 36, "Start Game", {
  textScale: 2,
  normalColor: { r: 0.2, g: 0.5, b: 0.3, a: 0.95 },
  hoverColor: { r: 0.3, g: 0.65, b: 0.4, a: 0.95 },
  pressedColor: { r: 0.15, g: 0.4, b: 0.25, a: 0.95 },
});
const settingsBtn = createButton(0, 0, 180, 36, "Settings", { textScale: 2 });
const profileBtn = createButton(0, 0, 180, 36, "Profile", { textScale: 2 });
const disabledBtn = createButton(0, 0, 180, 36, "Locked", { textScale: 2 });
disabledBtn.disabled = true;

registerFocusable(focus, startBtn);
registerFocusable(focus, settingsBtn);
registerFocusable(focus, profileBtn);
registerFocusable(focus, disabledBtn);

// ---- Settings page widgets ----
const masterVol = createSlider(0, 0, 220, 0, 100, 80, "Master Volume", {
  showValue: true,
  decimals: 0,
  textScale: 1,
});
const sfxVol = createSlider(0, 0, 220, 0, 100, 60, "SFX Volume", {
  showValue: true,
  decimals: 0,
  textScale: 1,
});
const musicVol = createSlider(0, 0, 220, 0, 100, 40, "Music Volume", {
  showValue: true,
  decimals: 0,
  textScale: 1,
});

const fullscreenCb = createCheckbox(0, 0, "Fullscreen");
const vSyncCb = createCheckbox(0, 0, "V-Sync", true);
const showFpsCb = createCheckbox(0, 0, "Show FPS");

const qualityRadio = createRadioGroup(0, 0, ["Low", "Medium", "High", "Ultra"], 2);

const settingsBackBtn = createButton(0, 0, 120, 30, "< Back", { textScale: 1 });

// ---- Profile page widgets ----
const nameInput = createTextInput(0, 0, 220, "Enter name");
const classRadio = createRadioGroup(0, 0, ["Warrior", "Mage", "Rogue", "Ranger"], 0);
const saveProfileBtn = createButton(0, 0, 140, 30, "Save Profile", { textScale: 1 });
const profileBackBtn = createButton(0, 0, 120, 30, "< Back", { textScale: 1 });

// ---- Collected key events for text input ----
const TRACKED_KEYS = [
  "a","b","c","d","e","f","g","h","i","j","k","l","m",
  "n","o","p","q","r","s","t","u","v","w","x","y","z",
  "A","B","C","D","E","F","G","H","I","J","K","L","M",
  "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
  "0","1","2","3","4","5","6","7","8","9",
  " ","_","-",".",
  "Backspace","Delete","ArrowLeft","ArrowRight","Home","End",
];

function collectKeyEvents(): TextInputKeyEvent[] {
  const events: TextInputKeyEvent[] = [];
  for (const k of TRACKED_KEYS) {
    if (isKeyPressed(k)) {
      events.push({ key: k, pressed: true });
    }
  }
  return events;
}

function showStatus(msg: string): void {
  statusMessage = msg;
  statusTimer = 2.0;
}

// ---- Game bootstrap ----
const game = createGame({ name: "ui-showcase" });

game.state({
  get: () => ({
    page: currentPage,
    menu: {
      startClicked: startBtn.clicked,
      startHovered: startBtn.hovered,
    },
    settings: {
      masterVolume: masterVol.value,
      sfxVolume: sfxVol.value,
      musicVolume: musicVol.value,
      fullscreen: fullscreenCb.checked,
      vSync: vSyncCb.checked,
      showFps: showFpsCb.checked,
      quality: qualityRadio.options[qualityRadio.selectedIndex],
    },
    profile: {
      name: nameInput.text,
      class: classRadio.options[classRadio.selectedIndex],
    },
    status: statusMessage,
  }),
  set: () => {},
  describe: (state) => {
    const s = state as any;
    return `UI Showcase — ${s.page}\nVolume: ${s.settings.masterVolume}%\nProfile: ${s.profile.name || "(empty)"} the ${s.profile.class}`;
  },
});

// ---- Game loop ----
game.onFrame((ctx) => {
  totalTime += ctx.dt;

  if (statusTimer > 0) {
    statusTimer -= ctx.dt;
    if (statusTimer <= 0) statusMessage = "";
  }

  const input = captureInput();

  // Focus system
  autoUpdateFocus(focus, input);

  // Background
  hud.overlay({ r: 0.08, g: 0.08, b: 0.12, a: 1 }, { layer: 0 });

  // Title
  drawText("UI Showcase", 10, 10, {
    scale: 3,
    tint: Colors.PRIMARY,
    layer: 100,
    screenSpace: true,
  });

  // Page indicator
  const pageNames: Record<Page, string> = {
    menu: "Main Menu",
    settings: "Settings",
    profile: "Player Profile",
  };
  drawText(pageNames[currentPage], 10, 40, {
    scale: 1,
    tint: Colors.LIGHT_GRAY,
    layer: 100,
    screenSpace: true,
  });

  // Status message
  if (statusMessage) {
    const alpha = Math.min(1, statusTimer);
    drawText(statusMessage, ctx.viewport.width / 2 - statusMessage.length * 4, ctx.viewport.height - 30, {
      scale: 1,
      tint: { ...Colors.SUCCESS, a: alpha },
      layer: 110,
      screenSpace: true,
    });
  }

  // Render current page
  switch (currentPage) {
    case "menu":
      renderMenuPage(input, ctx.viewport.width, ctx.viewport.height);
      break;
    case "settings":
      renderSettingsPage(input, ctx.viewport.width, ctx.viewport.height);
      break;
    case "profile":
      renderProfilePage(input, ctx.viewport.width, ctx.viewport.height);
      break;
  }

  // Controls hint
  drawText("Tab: cycle focus | Enter: activate | Esc: back", 10, ctx.viewport.height - 14, {
    scale: 1,
    tint: withAlpha(Colors.GRAY, 0.6),
    layer: 100,
    screenSpace: true,
  });
});

function renderMenuPage(
  input: FrameInput,
  vpW: number, vpH: number,
): void {
  // Center the buttons
  const pos = anchorPosition("center", vpW, vpH, 180, 200);
  const positions = verticalStack(pos.x, pos.y, 36, 4, 12);

  startBtn.x = positions[0].x;
  startBtn.y = positions[0].y;
  settingsBtn.x = positions[1].x;
  settingsBtn.y = positions[1].y;
  profileBtn.x = positions[2].x;
  profileBtn.y = positions[2].y;
  disabledBtn.x = positions[3].x;
  disabledBtn.y = positions[3].y;

  autoUpdateButton(startBtn, input);
  autoUpdateButton(settingsBtn, input);
  autoUpdateButton(profileBtn, input);
  autoUpdateButton(disabledBtn, input);

  if (startBtn.clicked) showStatus("Game started! (demo)");
  if (settingsBtn.clicked) currentPage = "settings";
  if (profileBtn.clicked) currentPage = "profile";

  drawButton(startBtn);
  drawButton(settingsBtn);
  drawButton(profileBtn);
  drawButton(disabledBtn);

  // Description panel
  drawPanel(pos.x - 10, pos.y + 210, 200, 60, {
    fillColor: withAlpha(Colors.HUD_BG, 0.7),
    borderColor: Colors.DARK_GRAY,
    borderWidth: 1,
    layer: 90,
    screenSpace: true,
  });
  drawText("Buttons support hover,", pos.x, pos.y + 220, {
    scale: 1, tint: Colors.LIGHT_GRAY, layer: 95, screenSpace: true,
  });
  drawText("press, disabled states", pos.x, pos.y + 232, {
    scale: 1, tint: Colors.LIGHT_GRAY, layer: 95, screenSpace: true,
  });
  drawText("and Tab focus navigation", pos.x, pos.y + 244, {
    scale: 1, tint: Colors.LIGHT_GRAY, layer: 95, screenSpace: true,
  });
}

function renderSettingsPage(
  input: FrameInput,
  vpW: number, vpH: number,
): void {
  const left = 80;
  const startY = 80;

  // Audio section
  drawText("Audio", left, startY, {
    scale: 2, tint: Colors.WARNING, layer: 100, screenSpace: true,
  });

  masterVol.x = left;
  masterVol.y = startY + 30;
  sfxVol.x = left;
  sfxVol.y = startY + 80;
  musicVol.x = left;
  musicVol.y = startY + 130;

  autoUpdateSlider(masterVol, input);
  autoUpdateSlider(sfxVol, input);
  autoUpdateSlider(musicVol, input);

  drawSlider(masterVol);
  drawSlider(sfxVol);
  drawSlider(musicVol);

  // Display section (right column)
  const rightCol = vpW / 2 + 20;

  drawText("Display", rightCol, startY, {
    scale: 2, tint: Colors.WARNING, layer: 100, screenSpace: true,
  });

  fullscreenCb.x = rightCol;
  fullscreenCb.y = startY + 35;
  vSyncCb.x = rightCol;
  vSyncCb.y = startY + 60;
  showFpsCb.x = rightCol;
  showFpsCb.y = startY + 85;

  autoUpdateCheckbox(fullscreenCb, input);
  autoUpdateCheckbox(vSyncCb, input);
  autoUpdateCheckbox(showFpsCb, input);

  drawCheckbox(fullscreenCb);
  drawCheckbox(vSyncCb);
  drawCheckbox(showFpsCb);

  // Quality section
  drawText("Quality", rightCol, startY + 120, {
    scale: 2, tint: Colors.WARNING, layer: 100, screenSpace: true,
  });

  qualityRadio.x = rightCol;
  qualityRadio.y = startY + 150;

  updateRadioGroup(qualityRadio, input.mouseX, input.mouseY, input.mouseDown,
    input.arrowUpPressed, input.arrowDownPressed);
  drawRadioGroup(qualityRadio);

  // Back button
  settingsBackBtn.x = left;
  settingsBackBtn.y = vpH - 60;
  autoUpdateButton(settingsBackBtn, input);
  if (settingsBackBtn.clicked || isKeyPressed("Escape")) {
    currentPage = "menu";
  }
  drawButton(settingsBackBtn);

  // Status
  if (masterVol.changed || sfxVol.changed || musicVol.changed) {
    showStatus("Volume updated");
  }
  if (fullscreenCb.toggled) showStatus(fullscreenCb.checked ? "Fullscreen ON" : "Fullscreen OFF");
  if (vSyncCb.toggled) showStatus(vSyncCb.checked ? "V-Sync ON" : "V-Sync OFF");
  if (showFpsCb.toggled) showStatus(showFpsCb.checked ? "FPS display ON" : "FPS display OFF");
  if (qualityRadio.changed) showStatus("Quality: " + qualityRadio.options[qualityRadio.selectedIndex]);
}

function renderProfilePage(
  input: FrameInput,
  vpW: number, vpH: number,
): void {
  const left = vpW / 2 - 120;
  const startY = 80;

  // Name input
  drawText("Player Name", left, startY, {
    scale: 2, tint: Colors.INFO, layer: 100, screenSpace: true,
  });

  nameInput.x = left;
  nameInput.y = startY + 30;
  const keys = collectKeyEvents();
  updateTextInput(nameInput, input.mouseX, input.mouseY, input.mouseDown, keys);
  drawTextInput(nameInput, totalTime);

  // Class selection
  drawText("Character Class", left, startY + 80, {
    scale: 2, tint: Colors.INFO, layer: 100, screenSpace: true,
  });

  classRadio.x = left;
  classRadio.y = startY + 110;
  updateRadioGroup(classRadio, input.mouseX, input.mouseY, input.mouseDown,
    input.arrowUpPressed, input.arrowDownPressed);
  drawRadioGroup(classRadio);

  // Buttons
  saveProfileBtn.x = left;
  saveProfileBtn.y = startY + 220;
  autoUpdateButton(saveProfileBtn, input);
  if (saveProfileBtn.clicked) {
    const name = nameInput.text || "Unnamed Hero";
    const cls = classRadio.options[classRadio.selectedIndex];
    showStatus("Saved: " + name + " the " + cls);
  }
  drawButton(saveProfileBtn);

  profileBackBtn.x = left;
  profileBackBtn.y = vpH - 60;
  autoUpdateButton(profileBackBtn, input);
  if (profileBackBtn.clicked || isKeyPressed("Escape")) {
    currentPage = "menu";
  }
  drawButton(profileBackBtn);
}

