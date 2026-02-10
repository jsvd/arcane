# Tutorial: Build a Dungeon Crawler RPG in 30 Minutes

**Goal:** Build a complete dungeon crawler with combat, inventory, equipment, and fog of war using Arcane recipes.

**Time:** 30 minutes

**What you'll learn:**
- Composing multiple recipes into a game
- Turn-based combat system
- Inventory and equipment management
- Grid movement with pathfinding
- Fog of war visibility
- Procedural dungeon generation

## Prerequisites

- Completed [Getting Started](getting-started.md)
- Completed [Sokoban Tutorial](tutorial-sokoban.md) (recommended)
- Created a new project: `arcane new dungeon-crawler`

## Step 1: Add Recipes

We'll use four recipes:

```bash
cd dungeon-crawler
arcane add turn-based-combat
arcane add inventory-equipment
arcane add grid-movement
arcane add fog-of-war
```

This copies the recipes into your project under `recipes/`.

## Step 2: Define Game State

Open `src/game.ts` and define the state:

```typescript
import type { CombatState } from "./recipes/turn-based-combat/index.ts";
import type { InventoryState } from "./recipes/inventory-equipment/index.ts";
import type { GridState } from "./recipes/grid-movement/index.ts";
import type { FogState } from "./recipes/fog-of-war/index.ts";

export type Vec2 = { x: number; y: number };

export type Dungeon = {
  width: number;
  height: number;
  tiles: ("floor" | "wall")[][];
};

export type Monster = {
  id: string;
  name: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
};

export type GameState = {
  player: {
    id: string;
    position: Vec2;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
  };
  dungeon: Dungeon;
  monsters: Monster[];
  combat: CombatState | null;  // null when not in combat
  inventory: InventoryState;
  fog: FogState;
  turnCount: number;
};
```

## Step 3: Generate a Simple Dungeon

```typescript
function generateDungeon(width: number, height: number): Dungeon {
  const tiles: ("floor" | "wall")[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      // Walls on edges, floor inside
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y][x] = "wall";
      } else {
        tiles[y][x] = "floor";
      }
    }
  }

  // Add some random walls
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    tiles[y][x] = "wall";
  }

  return { width, height, tiles };
}
```

## Step 4: Create Initial State

```typescript
import { TurnBasedCombat } from "./recipes/turn-based-combat/index.ts";
import { InventoryEquipment } from "./recipes/inventory-equipment/index.ts";
import { FogOfWar } from "./recipes/fog-of-war/index.ts";

export function createGame(): GameState {
  const dungeon = generateDungeon(20, 15);

  const initialInventory: InventoryState = {
    items: [
      { id: "potion1", name: "Health Potion", stackable: true, quantity: 3, weight: 0.5 },
      { id: "sword", name: "Iron Sword", stackable: false, quantity: 1, weight: 3.0 },
    ],
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
    },
    maxWeight: 50,
  };

  const initialFog: FogState = {
    grid: Array(dungeon.height).fill(null).map(() =>
      Array(dungeon.width).fill("unexplored")
    ),
    viewRadius: 5,
  };

  return {
    player: {
      id: "player",
      position: { x: 2, y: 2 },
      hp: 20,
      maxHp: 20,
      attack: 5,
      defense: 2,
    },
    dungeon,
    monsters: [
      {
        id: "goblin1",
        name: "Goblin",
        position: { x: 10, y: 8 },
        hp: 5,
        maxHp: 5,
        attack: 3,
        defense: 1,
      },
      {
        id: "goblin2",
        name: "Goblin",
        position: { x: 15, y: 10 },
        hp: 5,
        maxHp: 5,
        attack: 3,
        defense: 1,
      },
    ],
    combat: null,
    inventory: initialInventory,
    fog: initialFog,
    turnCount: 0,
  };
}
```

## Step 5: Implement Movement

```typescript
import { GridMovement, createPathGrid } from "./recipes/grid-movement/index.ts";

function getTile(dungeon: Dungeon, pos: Vec2): "floor" | "wall" {
  if (pos.y < 0 || pos.y >= dungeon.height || pos.x < 0 || pos.x >= dungeon.width) {
    return "wall";
  }
  return dungeon.tiles[pos.y][pos.x];
}

function isWalkable(dungeon: Dungeon, pos: Vec2): boolean {
  return getTile(dungeon, pos) === "floor";
}

export function movePlayer(
  state: GameState,
  direction: "up" | "down" | "left" | "right"
): GameState {
  const delta = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[direction];

  const nextPos = {
    x: state.player.position.x + delta.x,
    y: state.player.position.y + delta.y,
  };

  // Can't move into walls
  if (!isWalkable(state.dungeon, nextPos)) {
    return state;
  }

  // Check for monster at next position
  const monster = state.monsters.find(
    m => m.position.x === nextPos.x && m.position.y === nextPos.y
  );

  if (monster) {
    // Start combat!
    return startCombat(state, monster);
  }

  // Normal move
  const newState = {
    ...state,
    player: {
      ...state.player,
      position: nextPos,
    },
    turnCount: state.turnCount + 1,
  };

  // Update fog of war
  return updateFog(newState);
}
```

## Step 6: Implement Combat

```typescript
function startCombat(state: GameState, monster: Monster): GameState {
  const combatState = TurnBasedCombat.startCombat({
    participants: [
      {
        id: state.player.id,
        name: "Player",
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        initiative: 10,
        attack: state.player.attack,
        defense: state.player.defense,
      },
      {
        id: monster.id,
        name: monster.name,
        hp: monster.hp,
        maxHp: monster.maxHp,
        initiative: 8,
        attack: monster.attack,
        defense: monster.defense,
      },
    ],
  });

  return {
    ...state,
    combat: combatState,
  };
}

export function attackInCombat(state: GameState): GameState {
  if (!state.combat) return state;

  const current = TurnBasedCombat.queries.getCurrentParticipant(state.combat);
  if (current?.id !== "player") return state;

  // Find enemy
  const enemy = state.combat.participants.find(p => p.id !== "player");
  if (!enemy) return state;

  // Calculate damage (d20 + attack vs defense)
  const attackRoll = Math.floor(Math.random() * 20) + 1;
  const totalAttack = attackRoll + current.attack;
  const hit = totalAttack >= enemy.defense + 10;
  const damage = hit ? Math.max(1, current.attack - enemy.defense) : 0;

  // Apply damage
  let nextCombat = TurnBasedCombat.applyRule(state.combat, "takeDamage", {
    targetId: enemy.id,
    damage,
  });

  // End turn
  nextCombat = TurnBasedCombat.applyRule(nextCombat, "endTurn", {});

  // Check if combat is over
  const combatOver = TurnBasedCombat.queries.isVictorious(nextCombat, "player") ||
                     TurnBasedCombat.queries.isDefeated(nextCombat, "player");

  if (combatOver) {
    return endCombat(state, nextCombat);
  }

  // Enemy turn (simple AI: always attack)
  if (TurnBasedCombat.queries.getCurrentParticipant(nextCombat)?.id !== "player") {
    nextCombat = enemyTurn(nextCombat);
  }

  return {
    ...state,
    combat: nextCombat,
  };
}

function enemyTurn(combat: CombatState): CombatState {
  const current = TurnBasedCombat.queries.getCurrentParticipant(combat);
  if (!current || current.id === "player") return combat;

  // Attack player
  const attackRoll = Math.floor(Math.random() * 20) + 1;
  const player = combat.participants.find(p => p.id === "player");
  if (!player) return combat;

  const totalAttack = attackRoll + current.attack;
  const hit = totalAttack >= player.defense + 10;
  const damage = hit ? Math.max(1, current.attack - player.defense) : 0;

  let next = TurnBasedCombat.applyRule(combat, "takeDamage", {
    targetId: "player",
    damage,
  });

  next = TurnBasedCombat.applyRule(next, "endTurn", {});

  return next;
}

function endCombat(state: GameState, combat: CombatState): GameState {
  const playerWon = TurnBasedCombat.queries.isVictorious(combat, "player");

  // Update player HP
  const playerCombat = combat.participants.find(p => p.id === "player");
  const newState = {
    ...state,
    player: {
      ...state.player,
      hp: playerCombat?.hp ?? state.player.hp,
    },
    combat: null,
  };

  if (playerWon) {
    // Remove defeated monster
    const enemyId = combat.participants.find(p => p.id !== "player")?.id;
    return {
      ...newState,
      monsters: newState.monsters.filter(m => m.id !== enemyId),
    };
  }

  return newState;
}
```

## Step 7: Implement Fog of War

```typescript
function updateFog(state: GameState): FogState {
  // Update fog based on player position
  let fogState = { ...state.fog };

  fogState = FogOfWar.applyRule(fogState, "updateVisibility", {
    viewerPosition: state.player.position,
    blocksVision: (x, y) => !isWalkable(state.dungeon, { x, y }),
  });

  return {
    ...state,
    fog: fogState,
  };
}

function isVisible(state: GameState, pos: Vec2): boolean {
  return FogOfWar.queries.isVisible(state.fog, pos.x, pos.y);
}
```

## Step 8: Add Inventory Management

```typescript
export function usePotion(state: GameState): GameState {
  // Find a health potion
  const potion = state.inventory.items.find(
    item => item.name === "Health Potion" && item.quantity > 0
  );

  if (!potion) return state;

  // Use it
  const nextInventory = InventoryEquipment.applyRule(state.inventory, "removeItem", {
    itemId: potion.id,
    quantity: 1,
  });

  // Heal player
  const healAmount = 10;
  const newHp = Math.min(state.player.maxHp, state.player.hp + healAmount);

  return {
    ...state,
    player: {
      ...state.player,
      hp: newHp,
    },
    inventory: nextInventory,
  };
}
```

## Step 9: Test the Game Logic

**`src/game.test.ts`:**

```typescript
import { describe, it, assert } from "@arcane/runtime/testing";
import { createGame, movePlayer, attackInCombat, usePotion } from "./game.ts";

describe("Dungeon Crawler", () => {
  it("creates initial state", () => {
    const state = createGame();
    assert.equal(state.player.hp, 20);
    assert.equal(state.monsters.length, 2);
  });

  it("player can move on floor", () => {
    const state = createGame();
    const next = movePlayer(state, "right");
    assert.equal(next.player.position.x, 3);
  });

  it("combat starts when colliding with monster", () => {
    let state = createGame();
    // Move to monster position
    state = { ...state, player: { ...state.player, position: { x: 10, y: 7 } } };
    const next = movePlayer(state, "down");

    assert.notEqual(next.combat, null);
  });

  it("potion heals player", () => {
    let state = createGame();
    state = { ...state, player: { ...state.player, hp: 10 } };
    const next = usePotion(state);

    assert.equal(next.player.hp, 20); // healed to full
  });
});
```

Run tests:

```bash
arcane test
```

## Step 10: Add Rendering

**`src/visual.ts`:**

```typescript
import {
  onFrame,
  drawSprite,
  createSolidTexture,
  setCamera,
  isKeyPressed,
  getDeltaTime,
  drawText,
  getDefaultFont,
} from "@arcane/runtime/rendering";
import { registerAgent } from "@arcane/runtime/agent";
import {
  createGame,
  movePlayer,
  attackInCombat,
  usePotion,
  type GameState,
} from "./game.ts";

// Create textures
createSolidTexture("floor", 0.3, 0.3, 0.3, 1.0);       // Dark gray
createSolidTexture("wall", 0.1, 0.1, 0.1, 1.0);        // Black
createSolidTexture("player", 0.2, 0.7, 1.0, 1.0);      // Blue
createSolidTexture("goblin", 0.8, 0.2, 0.2, 1.0);      // Red
createSolidTexture("fog", 0.0, 0.0, 0.0, 0.7);         // Semi-transparent black
createSolidTexture("explored", 0.2, 0.2, 0.2, 0.5);    // Dark overlay

let state = createGame();

// Agent protocol
registerAgent({
  name: "dungeon-crawler",
  getState: () => state,
  setState: (s) => { state = s; },
  describe: () => {
    if (state.combat) {
      return `In combat! Player HP: ${state.player.hp}/${state.player.maxHp}`;
    }
    return `Exploring dungeon. HP: ${state.player.hp}/${state.player.maxHp}, Monsters: ${state.monsters.length}`;
  },
});

const TILE_SIZE = 32;

onFrame(() => {
  // Handle input (only if not in combat)
  if (!state.combat) {
    if (isKeyPressed("ArrowUp") || isKeyPressed("w")) {
      state = movePlayer(state, "up");
    }
    if (isKeyPressed("ArrowDown") || isKeyPressed("s")) {
      state = movePlayer(state, "down");
    }
    if (isKeyPressed("ArrowLeft") || isKeyPressed("a")) {
      state = movePlayer(state, "left");
    }
    if (isKeyPressed("ArrowRight") || isKeyPressed("d")) {
      state = movePlayer(state, "right");
    }
    if (isKeyPressed("p")) {
      state = usePotion(state);
    }
  } else {
    // Combat input
    if (isKeyPressed(" ")) {
      state = attackInCombat(state);
    }
  }

  // Center camera on player
  setCamera(
    state.player.position.x * TILE_SIZE,
    state.player.position.y * TILE_SIZE,
    2.0
  );

  // Render dungeon
  for (let y = 0; y < state.dungeon.height; y++) {
    for (let x = 0; x < state.dungeon.width; x++) {
      const fogState = state.fog.grid[y][x];
      if (fogState === "unexplored") continue;

      const tile = state.dungeon.tiles[y][x];
      const texture = tile === "wall" ? "wall" : "floor";

      drawSprite(texture, x * TILE_SIZE, y * TILE_SIZE, {
        width: TILE_SIZE,
        height: TILE_SIZE,
      });

      // Darken explored but not visible tiles
      if (fogState === "explored") {
        drawSprite("explored", x * TILE_SIZE, y * TILE_SIZE, {
          width: TILE_SIZE,
          height: TILE_SIZE,
        });
      }
    }
  }

  // Render monsters (only if visible)
  for (const monster of state.monsters) {
    const fogState = state.fog.grid[monster.position.y]?.[monster.position.x];
    if (fogState === "visible") {
      drawSprite("goblin", monster.position.x * TILE_SIZE, monster.position.y * TILE_SIZE, {
        width: TILE_SIZE,
        height: TILE_SIZE,
      });
    }
  }

  // Render player
  drawSprite("player", state.player.position.x * TILE_SIZE, state.player.position.y * TILE_SIZE, {
    width: TILE_SIZE,
    height: TILE_SIZE,
  });

  // UI: HP bar and controls
  const font = getDefaultFont();
  drawText(`HP: ${state.player.hp}/${state.player.maxHp}`, 10, 10, {
    font,
    scale: 2.0,
    color: { r: 1, g: 1, b: 1, a: 1 },
  });

  if (state.combat) {
    drawText("COMBAT! Press SPACE to attack", 10, 40, {
      font,
      scale: 2.0,
      color: { r: 1, g: 0.5, b: 0.5, a: 1 },
    });
  } else {
    drawText("WASD to move, P for potion", 10, 40, {
      font,
      scale: 1.5,
      color: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
    });
  }
});
```

## Step 11: Run and Play!

```bash
arcane dev
```

**Controls:**
- **WASD** or **Arrow keys** — Move
- **Space** — Attack in combat
- **P** — Use health potion

**Goal:** Defeat both goblins!

## What You Built

✅ Procedural dungeon generation
✅ Turn-based combat with initiative
✅ Inventory system with health potions
✅ Grid-based movement
✅ Fog of war with shadowcasting
✅ Monster AI
✅ Complete game loop

## Next Steps

### Add More Features

- **Loot drops** — Monsters drop items when defeated
- **Equipment system** — Swords and armor modify stats
- **More monster types** — Different stats and behaviors
- **Larger dungeons** — BSP or cellular automata generation
- **Stairs** — Multiple dungeon levels
- **Character classes** — Warrior, Mage, Rogue with different abilities

### Improve Combat

```typescript
// Add critical hits
const isCritical = attackRoll === 20;
const damage = isCritical ? (current.attack * 2) : current.attack;

// Add spell casting
export function castFireball(state: GameState, target: Vec2): GameState {
  // Area of effect damage
  // ...
}
```

### Better Dungeon Generation

```typescript
// Use BSP (Binary Space Partitioning)
import { generateBSPDungeon } from "./bsp-generator.ts";

const dungeon = generateBSPDungeon(40, 30);
```

### Save/Load System

```typescript
export function saveGame(state: GameState): string {
  return JSON.stringify(state);
}

export function loadGame(data: string): GameState {
  return JSON.parse(data);
}
```

## Congratulations!

You've built a complete dungeon crawler RPG using Arcane recipes. You learned:

- ✅ Composing multiple systems
- ✅ Turn-based combat mechanics
- ✅ Inventory and item management
- ✅ Grid movement and pathfinding
- ✅ Fog of war visibility
- ✅ State composition patterns

Ready for more? Check out the advanced examples:
- **demos/bfrpg-crawler/** — Full BFRPG v4 combat mechanics
- **demos/roguelike/** — Procedural dungeons with advanced FOV
- **demos/tower-defense/** — Real-time strategy with pathfinding

---

**Happy dungeon crawling!** ⚔️🐉
