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

const TILE_SIZE = 16.0;
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
const COLOR_BG = { r: 20/255, g: 20/255, b: 30/255, a: 0.9 };
const COLOR_PANEL = { r: 40/255, g: 40/255, b: 50/255, a: 1.0 };

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
    state.character.pos.x * TILE_SIZE + TILE_SIZE / 2.0,
    state.character.pos.y * TILE_SIZE + TILE_SIZE / 2.0,
    2.0,
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
    state.character.pos.x * TILE_SIZE + TILE_SIZE / 2.0,
    state.character.pos.y * TILE_SIZE + TILE_SIZE / 2.0,
    TILE_SIZE * 10.0,
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
      x: monster.pos.x * TILE_SIZE + 2.0,
      y: monster.pos.y * TILE_SIZE + 2.0,
      w: TILE_SIZE - 4.0,
      h: TILE_SIZE - 4.0,
      layer: 2,
    });
  }
}

function renderCharacter() {
  const { character } = state;

  drawSprite({
    textureId: TEX_PLAYER,
    x: character.pos.x * TILE_SIZE + 2.0,
    y: character.pos.y * TILE_SIZE + 2.0,
    w: TILE_SIZE - 4.0,
    h: TILE_SIZE - 4.0,
    layer: 3,
  });
}

function renderHUD() {
  const { character, dungeon, log } = state;

  const font = getDefaultFont();

  // Character info panel (top-left, screen-space)
  const panelX = 10.0;
  const panelY = 10.0;
  const panelW = 200.0;
  const panelH = 120.0;

  drawPanel(panelX, panelY, panelW, panelH, {
    fillColor: COLOR_BG,
    borderColor: COLOR_PANEL,
    borderWidth: 2.0,
    layer: 10,
    screenSpace: true,
  });

  // Character name and class
  drawText(
    `${character.name}`,
    panelX + 10.0,
    panelY + 10.0,
    { font, layer: 11, screenSpace: true }
  );

  drawText(
    `L${character.level} ${character.race} ${character.class}`,
    panelX + 10.0,
    panelY + 25.0,
    { font, layer: 11, screenSpace: true }
  );

  // HP bar
  drawLabel("HP:", panelX + 10.0, panelY + 45.0, { layer: 11, screenSpace: true });

  drawBar(
    panelX + 40.0,
    panelY + 45.0,
    150.0,
    12.0,
    character.hp / character.maxHp,
    {
      fillColor: { r: 60/255, g: 180/255, b: 60/255, a: 1.0 },
      bgColor: { r: 180/255, g: 60/255, b: 60/255, a: 1.0 },
      borderColor: COLOR_PANEL,
      borderWidth: 1.0,
      layer: 11,
      screenSpace: true,
    }
  );

  drawText(
    `${character.hp}/${character.maxHp}`,
    panelX + 100.0,
    panelY + 46.0,
    { font, layer: 12, screenSpace: true }
  );

  // Stats
  drawText(
    `AC: ${character.ac}  BAB: +${character.bab}`,
    panelX + 10.0,
    panelY + 65.0,
    { font, layer: 11, screenSpace: true }
  );

  // Floor and gold
  drawText(
    `Floor: ${dungeon.floor}  Gold: ${character.gold}`,
    panelX + 10.0,
    panelY + 80.0,
    { font, layer: 11, screenSpace: true }
  );

  // Kills
  drawText(
    `Kills: ${character.kills}`,
    panelX + 10.0,
    panelY + 95.0,
    { font, layer: 11, screenSpace: true }
  );

  // Message log (bottom panel, screen-space)
  const logPanelX = 10.0;
  const logPanelY = 550.0;
  const logPanelW = 780.0;
  const logPanelH = 40.0;

  drawPanel(logPanelX, logPanelY, logPanelW, logPanelH, {
    fillColor: COLOR_BG,
    borderColor: COLOR_PANEL,
    borderWidth: 2.0,
    layer: 10,
    screenSpace: true,
  });

  // Show last 2 log messages
  const recentLogs = log.slice(-2);
  for (let i = 0; i < recentLogs.length; i++) {
    drawText(recentLogs[i].message, logPanelX + 10.0, logPanelY + 10.0 + i * 12.0, { font, layer: 11, screenSpace: true });
  }
}

function renderCombatUI() {
  // TODO: Implement combat UI
  // For now, just show a simple indicator
  const font = getDefaultFont();

  drawPanel(600.0, 10.0, 190.0, 80.0, {
    fillColor: COLOR_BG,
    borderColor: { r: 1.0, g: 0.4, b: 0.4, a: 1.0 },
    borderWidth: 3.0,
    layer: 10,
    screenSpace: true,
  });

  drawText("COMBAT!", 620.0, 20.0, { font, layer: 11, screenSpace: true });

  drawText("A - Attack", 620.0, 40.0, { font, layer: 11, screenSpace: true });

  drawText("D - Dodge", 620.0, 55.0, { font, layer: 11, screenSpace: true });
}

function renderDeathScreen() {
  const font = getDefaultFont();

  // Darken overlay
  drawPanel(0.0, 0.0, 800.0, 600.0, {
    fillColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.8 },
    borderColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
    borderWidth: 0.0,
    layer: 20,
    screenSpace: true,
  });

  // Death message
  drawText("YOU DIED", 320.0, 250.0, { font, layer: 21, screenSpace: true });

  drawText(
    `Floor reached: ${state.dungeon.floor}`,
    280.0,
    280.0,
    { font, layer: 21, screenSpace: true }
  );

  drawText(
    `Monsters slain: ${state.character.kills}`,
    270.0,
    300.0,
    { font, layer: 21, screenSpace: true }
  );
}

function renderVictoryScreen() {
  const font = getDefaultFont();

  // Victory overlay
  drawPanel(0.0, 0.0, 800.0, 600.0, {
    fillColor: { r: 20/255, g: 30/255, b: 20/255, a: 0.9 },
    borderColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
    borderWidth: 0.0,
    layer: 20,
    screenSpace: true,
  });

  // Victory message
  drawText("VICTORY!", 320.0, 250.0, { font, layer: 21, screenSpace: true });

  drawText(
    `You conquered ${state.dungeon.floor} floors!`,
    240.0,
    280.0,
    { font, layer: 21, screenSpace: true }
  );

  drawText(
    `Final level: ${state.character.level}`,
    280.0,
    300.0,
    { font, layer: 21, screenSpace: true }
  );

  drawText(
    `Total kills: ${state.character.kills}`,
    280.0,
    320.0,
    { font, layer: 21, screenSpace: true }
  );
}
