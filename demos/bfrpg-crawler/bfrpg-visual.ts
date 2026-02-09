/**
 * BFRPG Dungeon Crawler - Visual Demo
 */

import {
  onFrame,
  drawSprite,
  clearSprites,
  setCamera,
  isKeyPressed,
  createSolidTexture,
  drawText,
  getDefaultFont,
} from "../../runtime/rendering/index.ts";
import { setAmbientLight, addPointLight, clearLights } from "../../runtime/rendering/lighting.ts";
import { drawBar, drawPanel, drawLabel } from "../../runtime/ui/index.ts";
import { registerAgent } from "../../runtime/agent/index.ts";
import type { AgentConfig } from "../../runtime/agent/index.ts";
import { createGame } from "./game.ts";
import {
  moveCharacter,
  checkDeath,
  checkVictory,
  descendStairs,
  rest,
  tickMonsters,
} from "./bfrpg-crawler.ts";
import type { BFRPGState } from "./types.ts";

const TILE_SIZE = 16;
const SEED = 12345;

// Textures
const TEX_WALL = createSolidTexture("wall", 60, 60, 80);
const TEX_FLOOR = createSolidTexture("floor", 140, 120, 100);
const TEX_CORRIDOR = createSolidTexture("corridor", 120, 110, 90);
const TEX_STAIRS = createSolidTexture("stairs", 255, 255, 100);
const TEX_PLAYER = createSolidTexture("player", 60, 180, 255);
const TEX_MONSTER = createSolidTexture("monster", 255, 60, 60);
const TEX_EXPLORED = createSolidTexture("explored", 40, 40, 55);

// UI colors
const COLOR_BG = createSolidTexture("ui_bg", 20, 20, 30);
const COLOR_PANEL = createSolidTexture("ui_panel", 40, 40, 50);

// Initialize game
let state = createGame("Thrain", "Fighter", "Dwarf", SEED);

// Agent protocol
const agentConfig: AgentConfig<BFRPGState> = {
  name: "bfrpg-crawler",
  getState: () => state,
  setState: (s) => {
    state = s;
  },
  describe: (s, opts) => {
    const { character, dungeon, phase } = s;

    if (opts.verbosity === "minimal") {
      return `${character.name} L${character.level} | HP ${character.hp}/${character.maxHp} | Floor ${dungeon.floor}`;
    }

    if (opts.verbosity === "detailed") {
      const alive = s.monsters.filter((m) => m.alive).length;
      const abilities = `STR ${character.abilities.strength} DEX ${character.abilities.dexterity} CON ${character.abilities.constitution} INT ${character.abilities.intelligence} WIS ${character.abilities.wisdom} CHA ${character.abilities.charisma}`;
      const equipment = character.inventory
        .filter((i) => i.equipped)
        .map((i) => i.name)
        .join(", ");

      return `${character.name} the ${character.race} ${character.class} (Level ${character.level})
HP: ${character.hp}/${character.maxHp} | AC: ${character.ac} | BAB: +${character.bab}
Abilities: ${abilities}
Position: (${character.pos.x}, ${character.pos.y}) | Floor: ${dungeon.floor}
Gold: ${character.gold} | Kills: ${character.kills}
Equipped: ${equipment || "none"}
Enemies alive: ${alive}
Phase: ${phase}`;
    }

    // Normal verbosity
    const alive = s.monsters.filter((m) => m.alive).length;
    return `Turn ${s.turn} | ${character.name} L${character.level} | HP ${character.hp}/${character.maxHp} | Pos (${character.pos.x},${character.pos.y}) | Floor ${dungeon.floor} | Enemies: ${alive} | Phase: ${phase}`;
  },
  actions: {
    move: {
      handler: (s, args) => {
        const direction = args.direction as string;
        const dirMap: Record<string, { x: number; y: number }> = {
          up: { x: 0, y: -1 },
          down: { x: 0, y: 1 },
          left: { x: -1, y: 0 },
          right: { x: 1, y: 0 },
        };
        const dir = dirMap[direction];
        if (!dir) return s;

        let next = moveCharacter(s, dir);
        next = tickMonsters(next);
        next = checkDeath(next);
        next = checkVictory(next);
        return next;
      },
      description: "Move the character in a direction",
      args: [
        { name: "direction", type: "string", description: "up, down, left, or right" },
      ],
    },
    rest: {
      handler: (s) => {
        let next = rest(s);
        next = tickMonsters(next);
        next = checkDeath(next);
        next = checkVictory(next);
        return next;
      },
      description: "Rest to restore HP (1d8), 20% encounter chance",
    },
    descend: {
      handler: (s) => {
        let next = descendStairs(s);
        next = checkVictory(next);
        return next;
      },
      description: "Descend stairs to next floor (heals 25% HP)",
    },
  },
};

registerAgent(agentConfig);

onFrame(() => {
  // Handle input
  handleInput();

  // Check win/loss conditions
  state = checkDeath(state);
  state = checkVictory(state);

  // Camera follows player
  setCamera(
    state.character.pos.x * TILE_SIZE + TILE_SIZE / 2,
    state.character.pos.y * TILE_SIZE + TILE_SIZE / 2,
    2,
  );

  // Lighting
  setupLighting();

  // Render
  clearSprites();
  renderDungeon();
  renderMonsters();
  renderCharacter();
  renderHUD();

  if (state.phase === "combat") {
    renderCombatUI();
  }

  if (state.phase === "dead") {
    renderDeathScreen();
  }

  if (state.phase === "won") {
    renderVictoryScreen();
  }
});

function handleInput() {
  if (state.phase !== "exploration" && state.phase !== "combat") {
    return; // No input in dead/won states
  }

  // Movement (WASD / Arrow keys)
  if (isKeyPressed("w") || isKeyPressed("ArrowUp")) {
    state = moveCharacter(state, { x: 0, y: -1 });
    state = tickMonsters(state);
  } else if (isKeyPressed("s") || isKeyPressed("ArrowDown")) {
    state = moveCharacter(state, { x: 0, y: 1 });
    state = tickMonsters(state);
  } else if (isKeyPressed("a") || isKeyPressed("ArrowLeft")) {
    state = moveCharacter(state, { x: -1, y: 0 });
    state = tickMonsters(state);
  } else if (isKeyPressed("d") || isKeyPressed("ArrowRight")) {
    state = moveCharacter(state, { x: 1, y: 0 });
    state = tickMonsters(state);
  }

  // Rest (R key)
  else if (isKeyPressed("r")) {
    state = rest(state);
    state = tickMonsters(state);
  }

  // Descend stairs (> key - Shift+.)
  else if (isKeyPressed(">")) {
    state = descendStairs(state);
  }

  // Combat actions (when in combat phase)
  if (state.phase === "combat" && state.combat) {
    // TODO: Implement combat UI actions (A/D/S keys)
    // For now, just note that combat is active
  }
}

function setupLighting() {
  clearLights();
  setAmbientLight(0.05, 0.05, 0.08);
  addPointLight(
    state.character.pos.x * TILE_SIZE + TILE_SIZE / 2,
    state.character.pos.y * TILE_SIZE + TILE_SIZE / 2,
    TILE_SIZE * 10,
    1.0,
    0.9,
    0.7,
    1.0,
  );
}

function renderDungeon() {
  const { dungeon, fov } = state;

  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (fov.visible[y][x]) {
        // Currently visible
        let tex: number;
        if (tile === "wall") tex = TEX_WALL;
        else if (tile === "floor") tex = TEX_FLOOR;
        else if (tile === "corridor") tex = TEX_CORRIDOR;
        else if (tile === "stairs") tex = TEX_STAIRS;
        else tex = TEX_FLOOR;

        drawSprite({ textureId: tex, x: px, y: py, w: TILE_SIZE, h: TILE_SIZE, layer: 0 });
      } else if (fov.explored[y][x]) {
        // Explored but not visible
        drawSprite({
          textureId: TEX_EXPLORED,
          x: px,
          y: py,
          w: TILE_SIZE,
          h: TILE_SIZE,
          layer: 0,
        });
      }
    }
  }
}

function renderMonsters() {
  const { monsters, fov } = state;

  for (const monster of monsters) {
    if (!monster.alive) continue;
    if (!fov.visible[monster.pos.y]?.[monster.pos.x]) continue;

    drawSprite({
      textureId: TEX_MONSTER,
      x: monster.pos.x * TILE_SIZE + 2,
      y: monster.pos.y * TILE_SIZE + 2,
      w: TILE_SIZE - 4,
      h: TILE_SIZE - 4,
      layer: 2,
    });
  }
}

function renderCharacter() {
  const { character } = state;

  drawSprite({
    textureId: TEX_PLAYER,
    x: character.pos.x * TILE_SIZE + 2,
    y: character.pos.y * TILE_SIZE + 2,
    w: TILE_SIZE - 4,
    h: TILE_SIZE - 4,
    layer: 3,
  });
}

function renderHUD() {
  const { character, dungeon, log } = state;

  const fontId = getDefaultFont();

  // Character info panel (top-left, screen-space)
  const panelX = 10;
  const panelY = 10;
  const panelW = 200;
  const panelH = 120;

  drawPanel({
    x: panelX,
    y: panelY,
    w: panelW,
    h: panelH,
    bgColor: COLOR_BG,
    borderColor: COLOR_PANEL,
    borderWidth: 2,
    layer: 10,
    screenSpace: true,
  });

  // Character name and class
  drawText({
    text: `${character.name}`,
    x: panelX + 10,
    y: panelY + 10,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  drawText({
    text: `L${character.level} ${character.race} ${character.class}`,
    x: panelX + 10,
    y: panelY + 25,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  // HP bar
  drawLabel({
    text: "HP:",
    x: panelX + 10,
    y: panelY + 45,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  drawBar({
    x: panelX + 40,
    y: panelY + 45,
    w: 150,
    h: 12,
    value: character.hp,
    maxValue: character.maxHp,
    fillColor: createSolidTexture("hp_fill", 60, 180, 60),
    emptyColor: createSolidTexture("hp_empty", 180, 60, 60),
    borderColor: COLOR_PANEL,
    borderWidth: 1,
    layer: 11,
    screenSpace: true,
  });

  drawText({
    text: `${character.hp}/${character.maxHp}`,
    x: panelX + 100,
    y: panelY + 46,
    fontId,
    layer: 12,
    screenSpace: true,
  });

  // Stats
  drawText({
    text: `AC: ${character.ac}  BAB: +${character.bab}`,
    x: panelX + 10,
    y: panelY + 65,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  // Floor and gold
  drawText({
    text: `Floor: ${dungeon.floor}  Gold: ${character.gold}`,
    x: panelX + 10,
    y: panelY + 80,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  // Kills
  drawText({
    text: `Kills: ${character.kills}`,
    x: panelX + 10,
    y: panelY + 95,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  // Message log (bottom panel, screen-space)
  const logPanelX = 10;
  const logPanelY = 550;
  const logPanelW = 780;
  const logPanelH = 40;

  drawPanel({
    x: logPanelX,
    y: logPanelY,
    w: logPanelW,
    h: logPanelH,
    bgColor: COLOR_BG,
    borderColor: COLOR_PANEL,
    borderWidth: 2,
    layer: 10,
    screenSpace: true,
  });

  // Show last 2 log messages
  const recentLogs = log.slice(-2);
  for (let i = 0; i < recentLogs.length; i++) {
    drawText({
      text: recentLogs[i].message,
      x: logPanelX + 10,
      y: logPanelY + 10 + i * 12,
      fontId,
      layer: 11,
      screenSpace: true,
    });
  }
}

function renderCombatUI() {
  // TODO: Implement combat UI
  // For now, just show a simple indicator
  const fontId = getDefaultFont();

  drawPanel({
    x: 600,
    y: 10,
    w: 190,
    h: 80,
    bgColor: COLOR_BG,
    borderColor: createSolidTexture("combat_border", 255, 100, 100),
    borderWidth: 3,
    layer: 10,
    screenSpace: true,
  });

  drawText({
    text: "COMBAT!",
    x: 620,
    y: 20,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  drawText({
    text: "A - Attack",
    x: 620,
    y: 40,
    fontId,
    layer: 11,
    screenSpace: true,
  });

  drawText({
    text: "D - Dodge",
    x: 620,
    y: 55,
    fontId,
    layer: 11,
    screenSpace: true,
  });
}

function renderDeathScreen() {
  const fontId = getDefaultFont();

  // Darken overlay
  drawPanel({
    x: 0,
    y: 0,
    w: 800,
    h: 600,
    bgColor: createSolidTexture("death_overlay", 0, 0, 0),
    borderColor: 0,
    borderWidth: 0,
    layer: 20,
    screenSpace: true,
  });

  // Death message
  drawText({
    text: "YOU DIED",
    x: 320,
    y: 250,
    fontId,
    layer: 21,
    screenSpace: true,
  });

  drawText({
    text: `Floor reached: ${state.dungeon.floor}`,
    x: 280,
    y: 280,
    fontId,
    layer: 21,
    screenSpace: true,
  });

  drawText({
    text: `Monsters slain: ${state.character.kills}`,
    x: 270,
    y: 300,
    fontId,
    layer: 21,
    screenSpace: true,
  });
}

function renderVictoryScreen() {
  const fontId = getDefaultFont();

  // Victory overlay
  drawPanel({
    x: 0,
    y: 0,
    w: 800,
    h: 600,
    bgColor: createSolidTexture("victory_overlay", 20, 30, 20),
    borderColor: 0,
    borderWidth: 0,
    layer: 20,
    screenSpace: true,
  });

  // Victory message
  drawText({
    text: "VICTORY!",
    x: 320,
    y: 250,
    fontId,
    layer: 21,
    screenSpace: true,
  });

  drawText({
    text: `You conquered ${state.dungeon.floor} floors!`,
    x: 240,
    y: 280,
    fontId,
    layer: 21,
    screenSpace: true,
  });

  drawText({
    text: `Final level: ${state.character.level}`,
    x: 280,
    y: 300,
    fontId,
    layer: 21,
    screenSpace: true,
  });

  drawText({
    text: `Total kills: ${state.character.kills}`,
    x: 280,
    y: 320,
    fontId,
    layer: 21,
    screenSpace: true,
  });
}
