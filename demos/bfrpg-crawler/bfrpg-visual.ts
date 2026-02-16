/**
 * BFRPG Dungeon Crawler - Visual Demo
 */

import {
  isKeyPressed,
  setCamera,
  setAmbientLight,
  addPointLight,
  clearLights,
  getViewportSize,
} from "../../runtime/rendering/index.ts";
import { drawPanel, Colors } from "../../runtime/ui/index.ts";
import { rgb } from "../../runtime/ui/types.ts";
import { createGame, drawColorSprite, hud } from "../../runtime/game/index.ts";
import { createGame as createBFRPGGame } from "./game.ts";
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
const TEXT_SCALE = 1.5; // Reduced from HUDLayout.TEXT_SCALE (2) for better readability

// Colors
const COL_WALL = rgb(60, 60, 80);
const COL_FLOOR = rgb(140, 120, 100);
const COL_CORRIDOR = rgb(120, 110, 90);
const COL_STAIRS = rgb(255, 255, 100);
const COL_PLAYER = rgb(60, 180, 255);
const COL_MONSTER = rgb(255, 60, 60);
const COL_EXPLORED = rgb(40, 40, 55);

// Initialize game
let state = createBFRPGGame("Thrain", "Fighter", "Dwarf", SEED);

// --- Game setup ---
const game = createGame({ name: "bfrpg-crawler", autoCamera: false, autoClear: true });

game.state<BFRPGState>({
  get: () => state,
  set: (s) => { state = s; },
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
});

game.onFrame(() => {
  // Handle input
  handleInput();

  // Check win/loss conditions
  state = checkDeath(state);
  state = checkVictory(state);

  // Camera follows player
  setCamera(
    state.character.pos.x * TILE_SIZE + TILE_SIZE / 2.0,
    state.character.pos.y * TILE_SIZE + TILE_SIZE / 2.0,
    1.0, // Zoom level: 1.0 = normal scale, higher = bigger on screen
  );

  // Lighting
  setupLighting();

  // Render
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
    // TODO: Implement actual combat logic with BFRPGCombat system
    // For now, combat auto-resolves on next movement
    // Future: 1 = Attack, 2 = Dodge, 3 = Spell, etc.
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
        let col = COL_FLOOR;
        if (tile === "wall") col = COL_WALL;
        else if (tile === "floor") col = COL_FLOOR;
        else if (tile === "corridor") col = COL_CORRIDOR;
        else if (tile === "stairs") col = COL_STAIRS;

        drawColorSprite({ color: col, x: px, y: py, w: TILE_SIZE, h: TILE_SIZE, layer: 0 });
      } else if (fov.explored[y][x]) {
        // Explored but not visible
        drawColorSprite({
          color: COL_EXPLORED,
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

    drawColorSprite({
      color: COL_MONSTER,
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

  drawColorSprite({
    color: COL_PLAYER,
    x: character.pos.x * TILE_SIZE + 2.0,
    y: character.pos.y * TILE_SIZE + 2.0,
    w: TILE_SIZE - 4.0,
    h: TILE_SIZE - 4.0,
    layer: 3,
  });
}

function renderHUD() {
  const { character, dungeon, log } = state;

  const viewport = getViewportSize();

  // Character info panel (top-left, screen-space)
  const panelX = 10.0;
  const panelY = 10.0;
  const panelW = 200.0;
  const panelH = 120.0;

  drawPanel(panelX, panelY, panelW, panelH, {
    fillColor: Colors.HUD_BG,
    borderColor: Colors.HUD_BG_LIGHT,
    borderWidth: 2.0,
    layer: 10,
    screenSpace: true,
  });

  // Character name and class
  hud.text(
    `${character.name}`,
    panelX + 10.0,
    panelY + 10.0,
    { scale: TEXT_SCALE, layer: 11 }
  );

  hud.text(
    `L${character.level} ${character.race} ${character.class}`,
    panelX + 10.0,
    panelY + 25.0,
    { scale: TEXT_SCALE, layer: 11 }
  );

  // HP bar
  hud.label("HP:", panelX + 10.0, panelY + 45.0, { scale: TEXT_SCALE, layer: 11 });

  const hpRatio = character.hp / character.maxHp;
  const hpColor = hpRatio > 0.5 ? Colors.SUCCESS : hpRatio > 0.25 ? Colors.WARNING : Colors.DANGER;
  hud.bar(
    panelX + 40.0,
    panelY + 45.0,
    hpRatio,
    {
      width: 150,
      height: 12,
      fillColor: hpColor,
      bgColor: Colors.DANGER,
      borderColor: Colors.HUD_BG_LIGHT,
      borderWidth: 1,
      layer: 11,
    }
  );

  hud.text(
    `${character.hp}/${character.maxHp}`,
    panelX + 100.0,
    panelY + 46.0,
    { scale: TEXT_SCALE, layer: 12 }
  );

  // Stats
  hud.text(
    `AC: ${character.ac}  BAB: +${character.bab}`,
    panelX + 10.0,
    panelY + 65.0,
    { scale: TEXT_SCALE, layer: 11 }
  );

  // Floor and gold
  hud.text(
    `Floor: ${dungeon.floor}  Gold: ${character.gold}`,
    panelX + 10.0,
    panelY + 80.0,
    { scale: TEXT_SCALE, layer: 11 }
  );

  // Kills
  hud.text(
    `Kills: ${character.kills}`,
    panelX + 10.0,
    panelY + 95.0,
    { scale: TEXT_SCALE, layer: 11 }
  );

  // Message log (bottom panel, screen-space)
  const logPanelX = 10.0;
  const logPanelY = viewport.height - 50.0; // 40px panel height + 10px margin
  const logPanelW = viewport.width - 20.0;
  const logPanelH = 40.0;

  drawPanel(logPanelX, logPanelY, logPanelW, logPanelH, {
    fillColor: Colors.HUD_BG,
    borderColor: Colors.HUD_BG_LIGHT,
    borderWidth: 2.0,
    layer: 10,
    screenSpace: true,
  });

  // Show last 2 log messages
  const recentLogs = log.slice(-2);
  for (let i = 0; i < recentLogs.length; i++) {
    hud.text(recentLogs[i].message, logPanelX + 10.0, logPanelY + 10.0 + i * 12.0, { scale: TEXT_SCALE, layer: 11 });
  }

  // Controls help panel (bottom-right)
  const helpPanelW = 160.0;
  const helpPanelH = 90.0;
  const helpPanelX = viewport.width - helpPanelW - 10.0;
  const helpPanelY = viewport.height - helpPanelH - 10.0;

  drawPanel(helpPanelX, helpPanelY, helpPanelW, helpPanelH, {
    fillColor: Colors.HUD_BG,
    borderColor: Colors.HUD_BG_LIGHT,
    borderWidth: 2.0,
    layer: 10,
    screenSpace: true,
  });

  hud.text("Controls:", helpPanelX + 10.0, helpPanelY + 10.0, { scale: TEXT_SCALE, layer: 11 });
  hud.text("WASD - Move", helpPanelX + 10.0, helpPanelY + 25.0, { scale: TEXT_SCALE * 0.8, layer: 11 });
  hud.text("R - Rest", helpPanelX + 10.0, helpPanelY + 38.0, { scale: TEXT_SCALE * 0.8, layer: 11 });
  hud.text("> - Stairs", helpPanelX + 10.0, helpPanelY + 51.0, { scale: TEXT_SCALE * 0.8, layer: 11 });
  hud.text("1/2 - Combat", helpPanelX + 10.0, helpPanelY + 64.0, { scale: TEXT_SCALE * 0.8, layer: 11 });
}

function renderCombatUI() {
  // TODO: Implement combat UI
  // For now, just show a simple indicator
  const viewport = getViewportSize();

  // Position panel on right side
  const panelW = 190.0;
  const panelH = 80.0;
  const panelX = viewport.width - panelW - 10.0;
  const panelY = 10.0;

  drawPanel(panelX, panelY, panelW, panelH, {
    fillColor: Colors.HUD_BG,
    borderColor: Colors.DANGER,
    borderWidth: 3.0,
    layer: 10,
    screenSpace: true,
  });

  hud.text("COMBAT!", panelX + 20.0, panelY + 10.0, { scale: TEXT_SCALE, layer: 11 });

  hud.text("1 - Attack", panelX + 20.0, panelY + 30.0, { scale: TEXT_SCALE, layer: 11 });

  hud.text("2 - Dodge", panelX + 20.0, panelY + 45.0, { scale: TEXT_SCALE, layer: 11 });
}

function renderDeathScreen() {
  const viewport = getViewportSize();

  // Darken overlay
  drawPanel(0.0, 0.0, viewport.width, viewport.height, {
    fillColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.8 },
    borderColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
    borderWidth: 0.0,
    layer: 20,
    screenSpace: true,
  });

  // Death message (centered)
  const centerX = viewport.width / 2.0;
  const centerY = viewport.height / 2.0;

  hud.text("YOU DIED", centerX - 70.0, centerY - 30.0, { scale: TEXT_SCALE, tint: Colors.LOSE, layer: 21 });

  hud.text(
    `Floor reached: ${state.dungeon.floor}`,
    centerX - 90.0,
    centerY,
    { scale: TEXT_SCALE, layer: 21 }
  );

  hud.text(
    `Monsters slain: ${state.character.kills}`,
    centerX - 95.0,
    centerY + 20.0,
    { scale: TEXT_SCALE, layer: 21 }
  );
}

function renderVictoryScreen() {
  const viewport = getViewportSize();

  // Victory overlay
  drawPanel(0.0, 0.0, viewport.width, viewport.height, {
    fillColor: { r: 20/255, g: 30/255, b: 20/255, a: 0.9 },
    borderColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
    borderWidth: 0.0,
    layer: 20,
    screenSpace: true,
  });

  // Victory message (centered)
  const centerX = viewport.width / 2.0;
  const centerY = viewport.height / 2.0;

  hud.text("VICTORY!", centerX - 65.0, centerY - 30.0, { scale: TEXT_SCALE, tint: Colors.WIN, layer: 21 });

  hud.text(
    `You conquered ${state.dungeon.floor} floors!`,
    centerX - 130.0,
    centerY,
    { scale: TEXT_SCALE, layer: 21 }
  );

  hud.text(
    `Final level: ${state.character.level}`,
    centerX - 85.0,
    centerY + 20.0,
    { scale: TEXT_SCALE, layer: 21 }
  );

  hud.text(
    `Total kills: ${state.character.kills}`,
    centerX - 80.0,
    centerY + 40.0,
    { scale: TEXT_SCALE, layer: 21 }
  );
}
