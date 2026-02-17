/**
 * BFRPG Dungeon Crawler - Movement and Exploration
 */

import { findPath } from "../../runtime/pathfinding/index.ts";
import type { PathGrid } from "../../runtime/pathfinding/index.ts";
import type { BFRPGState, Vec2, Monster, VisibilityMap } from "./types.ts";
import { generateDungeon, isWalkable, blocksVision } from "./dungeon/generation.ts";
import { spawnMonsters } from "./dungeon/spawning.ts";
import { computeFov } from "../../recipes/fog-of-war/fov.ts";

// --- FOV / Visibility ---

/**
 * Create a blank visibility map.
 */
export function createVisibilityMap(width: number, height: number): VisibilityMap {
  const visible = Array.from({ length: height }, () => Array(width).fill(false));
  const explored = Array.from({ length: height }, () => Array(width).fill(false));
  return { visible, explored };
}

/**
 * Update visibility from player position.
 * Uses fog-of-war recipe's shadowcasting FOV.
 */
export function updateVisibility(
  state: BFRPGState,
  radius: number = 8,
): BFRPGState {
  const { character, dungeon, fov } = state;

  // Clear current visibility (convert visible → explored)
  const newVisible = fov.visible.map((row) => row.map(() => false));
  const newExplored = fov.explored.map((row) => [...row]);

  // Mark previous visible cells as explored
  for (let y = 0; y < fov.visible.length; y++) {
    for (let x = 0; x < fov.visible[0].length; x++) {
      if (fov.visible[y][x]) {
        newExplored[y][x] = true;
      }
    }
  }

  // Compute new FOV
  computeFov(
    character.pos.x,
    character.pos.y,
    radius,
    dungeon.width,
    dungeon.height,
    (x, y) => blocksVision(dungeon.tiles[y][x]),
    (x, y) => {
      newVisible[y][x] = true;
      newExplored[y][x] = true;
    },
  );

  return {
    ...state,
    fov: { visible: newVisible, explored: newExplored },
  };
}

// --- Movement ---

/**
 * Move the character to a new position.
 * Validates movement, checks for combat triggers, updates FOV.
 */
export function moveCharacter(
  state: BFRPGState,
  direction: Vec2,
): BFRPGState {
  const newPos: Vec2 = {
    x: state.character.pos.x + direction.x,
    y: state.character.pos.y + direction.y,
  };

  // Check bounds
  if (
    newPos.x < 0 ||
    newPos.x >= state.dungeon.width ||
    newPos.y < 0 ||
    newPos.y >= state.dungeon.height
  ) {
    return state;
  }

  // Check walkable
  if (!isWalkable(state.dungeon.tiles[newPos.y][newPos.x])) {
    return state;
  }

  // Update character position
  let nextState: BFRPGState = {
    ...state,
    character: { ...state.character, pos: newPos },
    turn: state.turn + 1,
  };

  // Update visibility
  nextState = updateVisibility(nextState);

  // Check for combat trigger (adjacent monster)
  nextState = checkCombatTrigger(nextState);

  return nextState;
}

/**
 * Check if player moved adjacent to a monster.
 * If so, trigger combat phase.
 */
export function checkCombatTrigger(state: BFRPGState): BFRPGState {
  if (state.phase === "combat") {
    return state; // Already in combat
  }

  const { character, monsters } = state;

  // Check for adjacent living monsters
  for (const monster of monsters) {
    if (!monster.alive) continue;

    const dx = Math.abs(monster.pos.x - character.pos.x);
    const dy = Math.abs(monster.pos.y - character.pos.y);

    // Adjacent means one step away (including diagonals)
    if (dx <= 1 && dy <= 1 && (dx + dy) > 0) {
      // Trigger combat (actual combat logic will be in combat module)
      return {
        ...state,
        phase: "combat",
      };
    }
  }

  return state;
}

// --- Monster AI ---

/**
 * Move a single monster using AI.
 * AI rules:
 * - If player visible and range ≤5: A* toward player
 * - Otherwise: random walk
 * - If adjacent to player: trigger combat (already in checkCombatTrigger)
 */
export function moveMonster(
  state: BFRPGState,
  monsterId: string,
): BFRPGState {
  const monster = state.monsters.find((m) => m.id === monsterId);
  if (!monster || !monster.alive) {
    return state;
  }

  const { character, dungeon, fov, monsters } = state;
  const playerPos = character.pos;

  // Check if player is visible to this monster
  const playerVisible = fov.visible[playerPos.y][playerPos.x];

  // Calculate distance to player
  const dx = playerPos.x - monster.pos.x;
  const dy = playerPos.y - monster.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  let newPos = monster.pos;

  if (playerVisible && dist <= 5) {
    // A* toward player
    const grid = createPathGrid(dungeon.tiles, monsters, monster.id);
    const result = findPath(
      grid,
      { x: monster.pos.x, y: monster.pos.y },
      { x: playerPos.x, y: playerPos.y },
    );

    if (result.found && result.path.length > 1) {
      // Move to next step (path[0] is current position, path[1] is next)
      newPos = result.path[1];
    }
  } else {
    // Random walk
    const randDir = state.rng.roll("1d4");
    const directions = [
      { x: 0, y: -1 }, // North
      { x: 1, y: 0 },  // East
      { x: 0, y: 1 },  // South
      { x: -1, y: 0 }, // West
    ];
    const dir = directions[randDir - 1];
    const candidate: Vec2 = {
      x: monster.pos.x + dir.x,
      y: monster.pos.y + dir.y,
    };

    // Check if valid
    if (
      candidate.x >= 0 &&
      candidate.x < dungeon.width &&
      candidate.y >= 0 &&
      candidate.y < dungeon.height &&
      isWalkable(dungeon.tiles[candidate.y][candidate.x])
    ) {
      // Check if not occupied by another monster
      const occupied = monsters.some(
        (m) =>
          m.id !== monster.id &&
          m.alive &&
          m.pos.x === candidate.x &&
          m.pos.y === candidate.y,
      );
      if (!occupied) {
        newPos = candidate;
      }
    }
  }

  // Update monster position
  const updatedMonsters = monsters.map((m) =>
    m.id === monster.id ? { ...m, pos: newPos } : m
  );

  return {
    ...state,
    monsters: updatedMonsters,
  };
}

/**
 * Create a pathfinding grid from dungeon tiles.
 * Marks other monsters as obstacles (except the moving monster).
 */
export function createPathGrid(
  tiles: readonly (readonly string[])[],
  monsters: readonly Monster[],
  movingMonsterId?: string,
): PathGrid {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;

  const walkableGrid: boolean[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => isWalkable(tiles[y][x] as any)),
  );

  // Mark other monsters as obstacles
  for (const monster of monsters) {
    if (monster.alive && monster.id !== movingMonsterId) {
      walkableGrid[monster.pos.y][monster.pos.x] = false;
    }
  }

  return {
    width,
    height,
    isWalkable(x: number, y: number): boolean {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      return walkableGrid[y][x];
    },
  };
}

/**
 * Tick all living monsters (AI movement).
 */
export function tickMonsters(state: BFRPGState): BFRPGState {
  let nextState = state;

  for (const monster of state.monsters) {
    if (monster.alive) {
      nextState = moveMonster(nextState, monster.id);
    }
  }

  // After all monsters move, check for combat trigger
  nextState = checkCombatTrigger(nextState);

  return nextState;
}

// --- Stairs ---

/**
 * Descend to the next dungeon floor.
 * Generates new dungeon, spawns monsters, heals 25% HP, updates FOV.
 */
export function descendStairs(state: BFRPGState): BFRPGState {
  // Must be standing on stairs
  const { character, dungeon, rng } = state;
  if (dungeon.tiles[character.pos.y][character.pos.x] !== "stairs") {
    return state;
  }

  // Generate new floor
  const nextFloor = dungeon.floor + 1;
  const newDungeon = generateDungeon(rng, 60, 40, nextFloor);
  const newMonsters = spawnMonsters(rng, newDungeon.rooms, nextFloor);

  // Place character in first room
  const startPos = newDungeon.rooms[0]
    ? { x: newDungeon.rooms[0].x + 1, y: newDungeon.rooms[0].y + 1 }
    : { x: 1, y: 1 };

  // Heal 25% HP
  const healAmount = Math.floor(character.maxHp * 0.25);
  const newHp = Math.min(character.hp + healAmount, character.maxHp);

  // Create new visibility map
  const newFov = createVisibilityMap(newDungeon.width, newDungeon.height);

  let nextState: BFRPGState = {
    ...state,
    dungeon: newDungeon,
    monsters: newMonsters,
    character: {
      ...character,
      pos: startPos,
      hp: newHp,
    },
    fov: newFov,
    turn: state.turn + 1,
  };

  // Update visibility from new position
  nextState = updateVisibility(nextState);

  return nextState;
}

// --- Rest ---

/**
 * Rest to restore HP.
 * Restores 1d8 HP, 20% chance of random encounter.
 */
export function rest(state: BFRPGState): BFRPGState {
  let nextState = state;

  // Heal 1d8 HP
  const healRoll = state.rng.roll("1d8");
  const newHp = Math.min(state.character.hp + healRoll, state.character.maxHp);

  nextState = {
    ...nextState,
    character: { ...nextState.character, hp: newHp },
    turn: nextState.turn + 1,
  };

  // 20% chance of encounter (spawn 1 monster nearby)
  const encounterRoll = state.rng.roll("1d100");

  if (encounterRoll <= 20) {
    // TODO: Implement random encounter spawning
    // For now, just note it in the log
    nextState = {
      ...nextState,
      log: [
        ...nextState.log,
        { turn: nextState.turn, message: "You hear something stirring nearby..." },
      ],
    };
  }

  return nextState;
}

// --- Victory & Death Conditions ---

/**
 * Check if the character has died (HP ≤ 0).
 * Transitions to "dead" phase.
 */
export function checkDeath(state: BFRPGState): BFRPGState {
  if (state.character.hp <= 0 && state.phase !== "dead") {
    return {
      ...state,
      phase: "dead",
      log: [
        ...state.log,
        { turn: state.turn, message: "You have been slain..." },
      ],
    };
  }
  return state;
}

/**
 * Check if the character has won (reached floor 5).
 * Transitions to "won" phase.
 */
export function checkVictory(state: BFRPGState): BFRPGState {
  if (state.dungeon.floor >= 5 && state.phase !== "won") {
    return {
      ...state,
      phase: "won",
      log: [
        ...state.log,
        { turn: state.turn, message: "VICTORY! You have conquered the dungeon!" },
      ],
    };
  }
  return state;
}
