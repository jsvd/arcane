/**
 * Tower Defense Game Logic
 *
 * Demonstrates A* pathfinding and wave-based enemy spawning.
 * Pure game logic — runs headless for testing.
 */

import type { Vec2 } from "@arcane-engine/runtime/state";
import { findPath, type PathGrid } from "@arcane-engine/runtime/pathfinding";

// --- Types ---

export type Tile = "floor" | "wall" | "start" | "goal";

export type Enemy = {
  id: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  path: Vec2[];
  pathIndex: number;
};

export type Tower = {
  id: string;
  position: Vec2;
  range: number;
  damage: number;
  fireRate: number;
  cooldown: number;
};

export type GameState = {
  width: number;
  height: number;
  tiles: Tile[][];
  start: Vec2;
  goal: Vec2;
  enemies: Enemy[];
  towers: Tower[];
  lives: number;
  gold: number;
  wave: number;
  enemiesInWave: number;
  enemiesSpawned: number;
  spawnCooldown: number;
  gameOver: boolean;
};

// --- Map Generation ---

export function createMap(): {
  tiles: Tile[][];
  start: Vec2;
  goal: Vec2;
} {
  const width = 20;
  const height = 15;
  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = "floor";
    }
  }

  const start = { x: 0, y: 7 };
  const goal = { x: 19, y: 7 };

  tiles[start.y][start.x] = "start";
  tiles[goal.y][goal.x] = "goal";

  return { tiles, start, goal };
}

// --- Pathfinding ---

function createPathGrid(state: GameState): PathGrid {
  return {
    width: state.width,
    height: state.height,
    isWalkable: (x, y) => {
      if (x < 0 || x >= state.width || y < 0 || y >= state.height) {
        return false;
      }
      const tile = state.tiles[y][x];
      // Towers block paths
      const hasTower = state.towers.some((t) => t.position.x === x && t.position.y === y);
      return tile !== "wall" && !hasTower;
    },
  };
}

export function computePath(state: GameState): Vec2[] {
  const grid = createPathGrid(state);
  const result = findPath(grid, state.start, state.goal, {
    allowDiagonal: false,
  });
  return result.found ? result.path : [];
}

// --- Game Logic ---

export function createGame(): GameState {
  const { tiles, start, goal } = createMap();

  return {
    width: 20,
    height: 15,
    tiles,
    start,
    goal,
    enemies: [],
    towers: [],
    lives: 20,
    gold: 100,
    wave: 1,
    enemiesInWave: 5,
    enemiesSpawned: 0,
    spawnCooldown: 0,
    gameOver: false,
  };
}

let nextEnemyId = 1;

function spawnEnemy(state: GameState): GameState {
  const path = computePath(state);
  if (path.length === 0) return state;

  const enemy: Enemy = {
    id: `enemy${nextEnemyId++}`,
    position: { ...state.start },
    hp: 5 + state.wave,
    maxHp: 5 + state.wave,
    path,
    pathIndex: 0,
  };

  return {
    ...state,
    enemies: [...state.enemies, enemy],
    enemiesSpawned: state.enemiesSpawned + 1,
  };
}

export function placeTower(
  state: GameState,
  position: Vec2
): GameState {
  // Check if position is valid
  if (
    position.x < 0 ||
    position.x >= state.width ||
    position.y < 0 ||
    position.y >= state.height
  ) {
    return state;
  }

  const tile = state.tiles[position.y][position.x];
  if (tile !== "floor") return state;

  // Check if already has a tower
  if (state.towers.some((t) => t.position.x === position.x && t.position.y === position.y)) {
    return state;
  }

  // Check if can afford
  const cost = 50;
  if (state.gold < cost) return state;

  const tower: Tower = {
    id: `tower${state.towers.length + 1}`,
    position: { ...position },
    range: 3,
    damage: 2,
    fireRate: 1.0,
    cooldown: 0,
  };

  return {
    ...state,
    towers: [...state.towers, tower],
    gold: state.gold - cost,
  };
}

function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function updateGame(state: GameState, dt: number): GameState {
  if (state.gameOver) return state;

  let newState = { ...state };

  // Spawn enemies
  if (newState.enemiesSpawned < newState.enemiesInWave) {
    newState.spawnCooldown -= dt;
    if (newState.spawnCooldown <= 0) {
      newState = spawnEnemy(newState);
      newState.spawnCooldown = 1.0; // 1 second between spawns
    }
  }

  // Move enemies
  newState.enemies = newState.enemies.map((enemy) => {
    if (enemy.pathIndex >= enemy.path.length - 1) {
      return enemy; // reached goal
    }

    const target = enemy.path[enemy.pathIndex + 1];
    const speed = 2.0; // tiles per second

    const dx = target.x - enemy.position.x;
    const dy = target.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < speed * dt) {
      return {
        ...enemy,
        position: { ...target },
        pathIndex: enemy.pathIndex + 1,
      };
    }

    return {
      ...enemy,
      position: {
        x: enemy.position.x + (dx / dist) * speed * dt,
        y: enemy.position.y + (dy / dist) * speed * dt,
      },
    };
  });

  // Tower attacks
  newState.towers = newState.towers.map((tower) => ({
    ...tower,
    cooldown: Math.max(0, tower.cooldown - dt),
  }));

  for (const tower of newState.towers) {
    if (tower.cooldown > 0) continue;

    // Find nearest enemy in range
    let nearest: Enemy | null = null;
    let nearestDistSq = tower.range * tower.range;

    for (const enemy of newState.enemies) {
      const distSq = distanceSq(tower.position, enemy.position);
      if (distSq <= nearestDistSq) {
        nearestDistSq = distSq;
        nearest = enemy;
      }
    }

    if (nearest) {
      // Attack
      tower.cooldown = tower.fireRate;
      nearest.hp -= tower.damage;
    }
  }

  // Remove dead enemies
  const beforeCount = newState.enemies.length;
  newState.enemies = newState.enemies.filter((e) => e.hp > 0);
  const killed = beforeCount - newState.enemies.length;
  newState.gold += killed * 10;

  // Check for enemies reaching goal
  const reached = newState.enemies.filter(
    (e) => e.pathIndex >= e.path.length - 1
  );
  newState.enemies = newState.enemies.filter(
    (e) => e.pathIndex < e.path.length - 1
  );
  newState.lives -= reached.length;

  if (newState.lives <= 0) {
    newState.gameOver = true;
  }

  // Check for wave completion
  if (
    newState.enemiesSpawned >= newState.enemiesInWave &&
    newState.enemies.length === 0
  ) {
    newState.wave += 1;
    newState.enemiesInWave += 2;
    newState.enemiesSpawned = 0;
    newState.gold += 50; // wave completion bonus
  }

  return newState;
}
