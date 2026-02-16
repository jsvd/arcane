/**
 * Menu Flow Demo — Phase 10
 *
 * Demonstrates scene management and save/load:
 * Title → Menu → Gameplay → Pause → GameOver
 *
 * Run: cargo run -- dev demos/menu-flow/menu-flow.ts
 */

import {
  createScene,
  createSceneInstance,
  startSceneManager,
  stopSceneManager,
} from "../../runtime/scenes/index.ts";
import type { SceneContext, TransitionConfig } from "../../runtime/scenes/index.ts";
import {
  configureSaveSystem,
  createFileStorage,
  saveGame,
  loadGame,
  hasSave,
  enableAutoSave,
  disableAutoSave,
  updateAutoSave,
} from "../../runtime/persistence/index.ts";
import {
  setCamera,
  getViewportSize,
  isKeyPressed,
  getMousePosition,
  drawText,
} from "../../runtime/rendering/index.ts";
import {
  drawRect,
  drawPanel,
  Colors,
  withAlpha,
  createButton,
  drawButton,
} from "../../runtime/ui/index.ts";
import type { ButtonState } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";
import { captureInput, autoUpdateButton } from "../../runtime/game/index.ts";

// --- Shared transition config ---
const FADE: TransitionConfig = { type: "fade", duration: 0.4 };

// --- Simple PRNG for target placement ---
let rngState = 12345;
function nextRandom(): number {
  rngState = (rngState * 1664525 + 1013904223) & 0x7fffffff;
  return rngState / 0x7fffffff;
}

// --- Persistence setup ---
configureSaveSystem({ storage: createFileStorage(), version: 1 });

// Track current gameplay state for auto-save
let currentGameState: GameplayState = createGameplayState();

// ===================================================================
// TITLE SCENE
// ===================================================================

type TitleState = { blinkTimer: number; visible: boolean };

const TitleScene = createScene<TitleState>({
  name: "title",
  create: () => ({ blinkTimer: 0, visible: true }),
  onUpdate: (state, dt, ctx) => {
    if (isKeyPressed("Space") || isKeyPressed("Enter")) {
      ctx.replace(createSceneInstance(MenuScene), FADE);
    }
    const timer = state.blinkTimer + dt;
    const visible = Math.floor(timer * 2) % 2 === 0;
    return { blinkTimer: timer, visible };
  },
  onRender: (state) => {
    const vp = getViewportSize();
    drawRect(0, 0, vp.width, vp.height, {
      color: { r: 0.05, g: 0.05, b: 0.1, a: 1 },
      layer: 0, screenSpace: true,
    });
    drawText("ARCANE", vp.width / 2 - 96, vp.height / 2 - 60, {
      scale: 4, tint: Colors.PRIMARY, layer: 10, screenSpace: true,
    });
    drawText("Scene Management Demo", vp.width / 2 - 84, vp.height / 2, {
      scale: 1, tint: Colors.LIGHT_GRAY, layer: 10, screenSpace: true,
    });
    if (state.visible) {
      drawText("Press SPACE or ENTER", vp.width / 2 - 80, vp.height / 2 + 60, {
        scale: 1, tint: Colors.GOLD, layer: 10, screenSpace: true,
      });
    }
  },
});

// ===================================================================
// MENU SCENE
// ===================================================================

type MenuState = {
  actions: string[];
  buttons: ButtonState[];
  selected: number;
};

const MenuScene = createScene<MenuState>({
  name: "menu",
  create: () => {
    const vp = getViewportSize();
    const actions: string[] = ["new"];
    const baseY = vp.height / 2 - 20;
    const btnX = vp.width / 2 - 70;
    const buttons: ButtonState[] = [
      createButton(btnX, baseY, 140, 30, "New Game", {
        normalColor: withAlpha(Colors.DARK_GRAY, 0.5),
        hoverColor: withAlpha(Colors.PRIMARY, 0.4),
        pressedColor: withAlpha(Colors.PRIMARY, 0.6),
        textColor: Colors.WHITE,
        textScale: 1.5,
        layer: 5,
      }),
    ];
    if (hasSave("gameplay")) {
      actions.push("continue");
      buttons.push(createButton(btnX, baseY + 40, 140, 30, "Continue", {
        normalColor: withAlpha(Colors.DARK_GRAY, 0.5),
        hoverColor: withAlpha(Colors.PRIMARY, 0.4),
        pressedColor: withAlpha(Colors.PRIMARY, 0.6),
        textColor: Colors.WHITE,
        textScale: 1.5,
        layer: 5,
      }));
    }
    buttons[0].focused = true;
    return { actions, buttons, selected: 0 };
  },
  onUpdate: (state, dt, ctx) => {
    let sel = state.selected;
    const count = state.buttons.length;
    const input = captureInput();
    // Menu accepts Space as well as Enter for activation
    const menuInput = { ...input, enterPressed: input.enterPressed || isKeyPressed("Space") };

    // Keyboard navigation
    if (menuInput.arrowUpPressed || isKeyPressed("w")) {
      sel = (sel - 1 + count) % count;
    }
    if (menuInput.arrowDownPressed || isKeyPressed("s")) {
      sel = (sel + 1) % count;
    }

    // Update focus
    for (let i = 0; i < state.buttons.length; i++) {
      state.buttons[i].focused = i === sel;
    }

    // Update buttons with mouse + keyboard
    for (let i = 0; i < state.buttons.length; i++) {
      autoUpdateButton(state.buttons[i], menuInput);
      // If mouse clicked on a different button, update selection
      if (state.buttons[i].hovered && menuInput.mouseDown) {
        sel = i;
      }
      if (state.buttons[i].clicked) {
        activateMenuItem(state.actions[i], ctx);
      }
    }

    return { ...state, selected: sel };
  },
  onRender: (state) => {
    const vp = getViewportSize();
    drawRect(0, 0, vp.width, vp.height, {
      color: { r: 0.05, g: 0.05, b: 0.12, a: 1 },
      layer: 0, screenSpace: true,
    });
    drawText("MAIN MENU", vp.width / 2 - 72, vp.height / 2 - 100, {
      scale: 2, tint: Colors.PRIMARY, layer: 10, screenSpace: true,
    });
    for (const btn of state.buttons) {
      drawButton(btn);
    }
    drawText("Arrow keys to select, ENTER to confirm", vp.width / 2 - 156, vp.height - 40, {
      scale: 1, tint: Colors.GRAY, layer: 10, screenSpace: true,
    });
  },
});

function activateMenuItem(action: string, ctx: SceneContext): void {
  if (action === "new") {
    rngState = Date.now() & 0x7fffffff;
    ctx.replace(createSceneInstance(GameplayScene), FADE);
  } else if (action === "continue") {
    const result = loadGame<GameplayState>("gameplay");
    if (result.ok && result.state) {
      ctx.replace(createSceneInstance(GameplayScene, result.state), FADE);
    } else {
      ctx.replace(createSceneInstance(GameplayScene), FADE);
    }
  }
}

// ===================================================================
// GAMEPLAY SCENE
// ===================================================================

type Target = { x: number; y: number; size: number; timer: number; maxTimer: number };

type GameplayState = {
  score: number;
  timeLeft: number;
  targets: Target[];
  spawnTimer: number;
  highScore: number;
};

function createGameplayState(): GameplayState {
  return { score: 0, timeLeft: 30, targets: [], spawnTimer: 0, highScore: 0 };
}

function spawnTarget(vpW: number, vpH: number): Target {
  const size = 30 + nextRandom() * 30;
  return {
    x: 60 + nextRandom() * (vpW - 120),
    y: 80 + nextRandom() * (vpH - 160),
    size,
    timer: 0,
    maxTimer: 1.5 + nextRandom() * 2,
  };
}

const GameplayScene = createScene<GameplayState>({
  name: "gameplay",
  create: createGameplayState,
  onEnter: (state, ctx) => {
    const loaded = ctx.getData<GameplayState>();
    const s = loaded ?? state;
    currentGameState = s;
    enableAutoSave<GameplayState>({
      getState: () => currentGameState,
      interval: 10,
      options: { slot: "gameplay", label: "Auto-save" },
    });
    return s;
  },
  onUpdate: (state, dt, ctx) => {
    if (isKeyPressed("Escape")) {
      ctx.push(createSceneInstance(PauseScene), { type: "none" });
      return state;
    }

    const timeLeft = state.timeLeft - dt;
    if (timeLeft <= 0) {
      disableAutoSave();
      ctx.replace(
        createSceneInstance(GameOverScene, { score: state.score, highScore: state.highScore }),
        FADE,
      );
      return { ...state, timeLeft: 0 };
    }

    const vp = getViewportSize();
    let score = state.score;
    const mouse = getMousePosition();
    const clicked = isKeyPressed("MouseLeft");

    // Update targets
    let targets = state.targets
      .map(t => ({ ...t, timer: t.timer + dt }))
      .filter(t => t.timer < t.maxTimer);

    // Check clicks
    if (clicked) {
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const dx = mouse.x - t.x;
        const dy = mouse.y - t.y;
        if (dx * dx + dy * dy < (t.size / 2) * (t.size / 2)) {
          const sizeBonus = Math.max(1, Math.floor((60 - t.size) / 10));
          const speedBonus = Math.max(1, Math.floor((t.maxTimer - t.timer) * 3));
          score += sizeBonus + speedBonus;
          targets = targets.filter((_, j) => j !== i);
          break;
        }
      }
    }

    // Spawn
    let spawnTimer = state.spawnTimer + dt;
    const spawnInterval = Math.max(0.4, 1.2 - score * 0.01);
    while (spawnTimer >= spawnInterval && targets.length < 8) {
      targets.push(spawnTarget(vp.width, vp.height));
      spawnTimer -= spawnInterval;
    }

    const newState: GameplayState = {
      score,
      timeLeft,
      targets,
      spawnTimer,
      highScore: Math.max(state.highScore, score),
    };
    currentGameState = newState;
    return newState;
  },
  onRender: (state) => {
    const vp = getViewportSize();
    drawRect(0, 0, vp.width, vp.height, {
      color: { r: 0.08, g: 0.08, b: 0.15, a: 1 },
      layer: 0, screenSpace: true,
    });
    // Targets
    for (const t of state.targets) {
      const progress = t.timer / t.maxTimer;
      const alpha = 1 - progress * 0.6;
      const r = 0.3 + progress * 0.7;
      const g = 1 - progress * 0.7;
      drawRect(t.x - t.size / 2, t.y - t.size / 2, t.size, t.size, {
        color: { r, g, b: 0.3, a: alpha },
        layer: 5, screenSpace: true,
      });
    }
    // HUD bar
    drawRect(0, 0, vp.width, 35, {
      color: withAlpha(Colors.BLACK, 0.7),
      layer: 50, screenSpace: true,
    });
    drawText(`Score: ${state.score}`, 10, 10, {
      scale: 2, tint: Colors.GOLD, layer: 60, screenSpace: true,
    });
    const timeColor = state.timeLeft < 10 ? Colors.DANGER : Colors.WHITE;
    drawText(`Time: ${Math.ceil(state.timeLeft)}s`, vp.width - 160, 10, {
      scale: 2, tint: timeColor, layer: 60, screenSpace: true,
    });
    drawText("Click targets! ESC=pause", vp.width / 2 - 96, 12, {
      scale: 1, tint: Colors.GRAY, layer: 60, screenSpace: true,
    });
  },
  onPause: (state) => state,
  onResume: (state) => state,
  onExit: () => { disableAutoSave(); },
});

// ===================================================================
// PAUSE SCENE
// ===================================================================

type PauseState = {
  selected: number;
  resumeBtn: ButtonState;
  quitBtn: ButtonState;
};

const PauseScene = createScene<PauseState>({
  name: "pause",
  create: () => {
    const vp = getViewportSize();
    const pw = 220;
    const ph = 160;
    const px = (vp.width - pw) / 2;
    const py = (vp.height - ph) / 2;
    const resumeBtn = createButton(px + 30, py + 60, pw - 60, 30, "Resume", {
      normalColor: withAlpha(Colors.DARK_GRAY, 0.5),
      hoverColor: withAlpha(Colors.PRIMARY, 0.4),
      pressedColor: withAlpha(Colors.PRIMARY, 0.6),
      textColor: Colors.WHITE,
      textScale: 1.5,
      layer: 115,
    });
    resumeBtn.focused = true;
    const quitBtn = createButton(px + 30, py + 100, pw - 60, 30, "Quit to Menu", {
      normalColor: withAlpha(Colors.DARK_GRAY, 0.5),
      hoverColor: withAlpha(Colors.DANGER, 0.4),
      pressedColor: withAlpha(Colors.DANGER, 0.6),
      textColor: Colors.WHITE,
      textScale: 1.5,
      layer: 115,
    });
    return { selected: 0, resumeBtn, quitBtn };
  },
  onUpdate: (state, _dt, ctx) => {
    let sel = state.selected;
    const input = captureInput();
    const pauseInput = { ...input, enterPressed: input.enterPressed || isKeyPressed("Space") };

    if (pauseInput.arrowUpPressed || isKeyPressed("w")) sel = sel === 0 ? 1 : 0;
    if (pauseInput.arrowDownPressed || isKeyPressed("s")) sel = sel === 0 ? 1 : 0;
    if (isKeyPressed("Escape")) {
      ctx.pop({ type: "none" });
      return state;
    }

    // Update focus
    state.resumeBtn.focused = sel === 0;
    state.quitBtn.focused = sel === 1;

    autoUpdateButton(state.resumeBtn, pauseInput);
    autoUpdateButton(state.quitBtn, pauseInput);

    if (state.resumeBtn.hovered && pauseInput.mouseDown) sel = 0;
    if (state.quitBtn.hovered && pauseInput.mouseDown) sel = 1;

    if (state.resumeBtn.clicked) {
      ctx.pop({ type: "none" });
    }
    if (state.quitBtn.clicked) {
      stopSceneManager();
      startSceneManager(createSceneInstance(MenuScene), {
        onUpdate: (dt) => { updateAutoSave(dt); },
      });
    }

    return { ...state, selected: sel };
  },
  onRender: (state) => {
    const vp = getViewportSize();
    drawRect(0, 0, vp.width, vp.height, {
      color: withAlpha(Colors.BLACK, 0.6),
      layer: 100, screenSpace: true,
    });
    const pw = 220;
    const ph = 160;
    const px = (vp.width - pw) / 2;
    const py = (vp.height - ph) / 2;
    drawPanel(px, py, pw, ph, {
      fillColor: { r: 0.1, g: 0.1, b: 0.2, a: 0.95 },
      borderColor: Colors.PRIMARY,
      borderWidth: 2,
      layer: 110, screenSpace: true,
    });
    drawText("PAUSED", px + pw / 2 - 48, py + 15, {
      scale: 2, tint: Colors.PAUSED, layer: 120, screenSpace: true,
    });
    drawButton(state.resumeBtn);
    drawButton(state.quitBtn);
  },
});

// ===================================================================
// GAME OVER SCENE
// ===================================================================

type GameOverState = {
  score: number;
  highScore: number;
  selected: number;
  playAgainBtn: ButtonState;
  menuBtn: ButtonState;
};

const GameOverScene = createScene<GameOverState>({
  name: "gameover",
  create: () => {
    const vp = getViewportSize();
    const btnY1 = vp.height / 2 + 60;
    const btnY2 = vp.height / 2 + 100;
    const playAgainBtn = createButton(vp.width / 2 - 70, btnY1, 140, 30, "Play Again", {
      normalColor: withAlpha(Colors.DARK_GRAY, 0.5),
      hoverColor: withAlpha(Colors.SUCCESS, 0.4),
      pressedColor: withAlpha(Colors.SUCCESS, 0.6),
      textColor: Colors.WHITE,
      textScale: 1.5,
      layer: 5,
    });
    playAgainBtn.focused = true;
    const menuBtn = createButton(vp.width / 2 - 70, btnY2, 140, 30, "Menu", {
      normalColor: withAlpha(Colors.DARK_GRAY, 0.5),
      hoverColor: withAlpha(Colors.PRIMARY, 0.4),
      pressedColor: withAlpha(Colors.PRIMARY, 0.6),
      textColor: Colors.WHITE,
      textScale: 1.5,
      layer: 5,
    });
    return { score: 0, highScore: 0, selected: 0, playAgainBtn, menuBtn };
  },
  onEnter: (state, ctx) => {
    const data = ctx.getData<{ score: number; highScore: number }>();
    const score = data?.score ?? 0;
    const highScore = Math.max(data?.highScore ?? 0, score);
    saveGame({ highScore }, { slot: "highscore", label: "High Score" });
    return { ...state, score, highScore, selected: 0 };
  },
  onUpdate: (state, _dt, ctx) => {
    let sel = state.selected;
    const input = captureInput();
    const goInput = { ...input, enterPressed: input.enterPressed || isKeyPressed("Space") };

    if (goInput.arrowUpPressed || isKeyPressed("w")) sel = sel === 0 ? 1 : 0;
    if (goInput.arrowDownPressed || isKeyPressed("s")) sel = sel === 0 ? 1 : 0;

    // Update focus
    state.playAgainBtn.focused = sel === 0;
    state.menuBtn.focused = sel === 1;

    autoUpdateButton(state.playAgainBtn, goInput);
    autoUpdateButton(state.menuBtn, goInput);

    if (state.playAgainBtn.hovered && goInput.mouseDown) sel = 0;
    if (state.menuBtn.hovered && goInput.mouseDown) sel = 1;

    if (state.playAgainBtn.clicked) {
      rngState = Date.now() & 0x7fffffff;
      ctx.replace(createSceneInstance(GameplayScene), FADE);
    }
    if (state.menuBtn.clicked) {
      ctx.replace(createSceneInstance(MenuScene), FADE);
    }

    return { ...state, selected: sel };
  },
  onRender: (state) => {
    const vp = getViewportSize();
    drawRect(0, 0, vp.width, vp.height, {
      color: { r: 0.1, g: 0.02, b: 0.02, a: 1 },
      layer: 0, screenSpace: true,
    });
    drawText("GAME OVER", vp.width / 2 - 72, vp.height / 2 - 100, {
      scale: 3, tint: Colors.DANGER, layer: 10, screenSpace: true,
    });
    drawText(`Score: ${state.score}`, vp.width / 2 - 50, vp.height / 2 - 30, {
      scale: 2, tint: Colors.GOLD, layer: 10, screenSpace: true,
    });
    drawText(`Best: ${state.highScore}`, vp.width / 2 - 40, vp.height / 2 + 10, {
      scale: 1.5, tint: Colors.SILVER, layer: 10, screenSpace: true,
    });
    drawButton(state.playAgainBtn);
    drawButton(state.menuBtn);
  },
});

// ===================================================================
// AGENT + START
// ===================================================================

registerAgent({
  name: "menu-flow",
  getState: () => currentGameState,
  setState: (s) => { currentGameState = s; },
  describe: (s) => `Menu Flow Demo | Score: ${s.score} | Time: ${Math.ceil(s.timeLeft)}s`,
});

const vp = getViewportSize();
setCamera(vp.width / 2, vp.height / 2);

startSceneManager(createSceneInstance(TitleScene), {
  onUpdate: (dt) => { updateAutoSave(dt); },
});
