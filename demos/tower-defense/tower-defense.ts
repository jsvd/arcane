import { findPath } from "../../runtime/pathfinding/astar.ts";
import type { PathGrid } from "../../runtime/pathfinding/types.ts";
import type { Vec2 } from "../../runtime/state/types.ts";
import { seed, randomInt } from "../../runtime/state/prng.ts";
import type { PRNGState } from "../../runtime/state/prng.ts";

// --- Types ---

export type TowerType = "arrow" | "slow" | "splash";
export type EnemyType = "basic" | "fast" | "tank";
export type GamePhase = "build" | "wave" | "between-waves" | "won" | "lost";

export type Tower = {
  id: string;
  type: TowerType;
  pos: Vec2;
  damage: number;
  range: number;
  cooldown: number;
  cooldownTimer: number;
};

export type Enemy = {
  id: string;
  type: EnemyType;
  pos: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  alive: boolean;
  reward: number;
  slowed: number;
};

export type Wave = {
  enemies: { type: EnemyType; count: number }[];
};

export type TDState = {
  mapWidth: number;
  mapHeight: number;
  cells: readonly (readonly number[])[];
  path: readonly Vec2[];
  startPos: Vec2;
  endPos: Vec2;
  towers: readonly Tower[];
  enemies: readonly Enemy[];
  waves: readonly Wave[];
  currentWave: number;
  spawnTimer: number;
  spawnedThisWave: number;
  totalToSpawnThisWave: number;
  gold: number;
  lives: number;
  score: number;
  phase: GamePhase;
  rng: PRNGState;
  nextId: number;
};

// --- Constants ---

export const TOWER_COSTS: Record<TowerType, number> = {
  arrow: 50,
  slow: 75,
  splash: 100,
};

export const TOWER_STATS: Record<TowerType, { damage: number; range: number; cooldown: number }> = {
  arrow: { damage: 10, range: 3, cooldown: 0.5 },
  slow: { damage: 3, range: 2.5, cooldown: 1.0 },
  splash: { damage: 8, range: 2, cooldown: 1.5 },
};

export const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; reward: number }> = {
  basic: { hp: 30, speed: 2, reward: 10 },
  fast: { hp: 15, speed: 4, reward: 15 },
  tank: { hp: 80, speed: 1, reward: 25 },
};

// --- Path grid adapter ---

function createPathGridForTD(state: TDState): PathGrid {
  return {
    width: state.mapWidth,
    height: state.mapHeight,
    isWalkable: (x, y) => {
      if (x < 0 || x >= state.mapWidth || y < 0 || y >= state.mapHeight) return false;
      return state.cells[y][x] === 0;
    },
  };
}

// --- Map generation ---

function buildMap(mapWidth: number, mapHeight: number): { cells: number[][]; startPos: Vec2; endPos: Vec2 } {
  // Initialize all cells as buildable (1)
  const cells: number[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    cells.push(new Array(mapWidth).fill(1));
  }

  // Carve an S-curve path from left to right
  const startPos: Vec2 = { x: 0, y: 1 };
  const endPos: Vec2 = { x: mapWidth - 1, y: mapHeight - 2 };

  // Horizontal segment 1: row 1, x=0..12
  for (let x = 0; x <= 12; x++) cells[1][x] = 0;
  // Vertical segment 1: col 12, y=1..4
  for (let y = 1; y <= 4; y++) cells[y][12] = 0;
  // Horizontal segment 2: row 4, x=2..12
  for (let x = 2; x <= 12; x++) cells[4][x] = 0;
  // Vertical segment 2: col 2, y=4..7
  for (let y = 4; y <= 7; y++) cells[y][2] = 0;
  // Horizontal segment 3: row 7, x=2..12
  for (let x = 2; x <= 12; x++) cells[7][x] = 0;
  // Vertical segment 3: col 12, y=7..8
  for (let y = 7; y <= 8; y++) cells[y][12] = 0;
  // Horizontal segment 4: row 8, x=12..14
  for (let x = 12; x <= 14; x++) cells[8][x] = 0;

  return { cells, startPos, endPos };
}

function countWaveEnemies(wave: Wave): number {
  let total = 0;
  for (const group of wave.enemies) {
    total += group.count;
  }
  return total;
}

// --- Waves ---

const WAVES: Wave[] = [
  { enemies: [{ type: "basic", count: 5 }] },
  { enemies: [{ type: "basic", count: 8 }, { type: "fast", count: 2 }] },
  { enemies: [{ type: "basic", count: 5 }, { type: "fast", count: 5 }, { type: "tank", count: 1 }] },
  { enemies: [{ type: "tank", count: 3 }, { type: "fast", count: 8 }] },
  { enemies: [{ type: "basic", count: 10 }, { type: "fast", count: 5 }, { type: "tank", count: 3 }] },
];

// --- Create game ---

export function createTDGame(gameSeed: number = 42): TDState {
  const mapWidth = 15;
  const mapHeight = 10;
  const { cells, startPos, endPos } = buildMap(mapWidth, mapHeight);
  const rng = seed(gameSeed);

  // Build a temporary state to compute the path
  const tmpState: TDState = {
    mapWidth, mapHeight, cells, path: [], startPos, endPos,
    towers: [], enemies: [], waves: WAVES, currentWave: 0,
    spawnTimer: 0, spawnedThisWave: 0, totalToSpawnThisWave: 0,
    gold: 200, lives: 10, score: 0, phase: "build",
    rng, nextId: 1,
  };

  const grid = createPathGridForTD(tmpState);
  const result = findPath(grid, startPos, endPos);
  if (!result.found) {
    throw new Error("Failed to compute enemy path on map");
  }

  return { ...tmpState, path: result.path };
}

// --- Place tower ---

export function placeTower(state: TDState, x: number, y: number, type: TowerType): TDState {
  if (x < 0 || x >= state.mapWidth || y < 0 || y >= state.mapHeight) return state;
  if (state.cells[y][x] !== 1) return state;
  if (state.gold < TOWER_COSTS[type]) return state;

  const stats = TOWER_STATS[type];
  const tower: Tower = {
    id: `tower-${state.nextId}`,
    type,
    pos: { x, y },
    damage: stats.damage,
    range: stats.range,
    cooldown: stats.cooldown,
    cooldownTimer: 0,
  };

  // Update cells: mark as blocked (2)
  const newCells = state.cells.map((row, ry) =>
    ry === y ? row.map((c, cx) => (cx === x ? 2 : c)) : row
  );

  return {
    ...state,
    towers: [...state.towers, tower],
    cells: newCells,
    gold: state.gold - TOWER_COSTS[type],
    nextId: state.nextId + 1,
  };
}

// --- Sell tower ---

export function sellTower(state: TDState, towerId: string): TDState {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return state;

  const refund = Math.floor(TOWER_COSTS[tower.type] / 2);

  // Restore cell to buildable (1)
  const newCells = state.cells.map((row, ry) =>
    ry === tower.pos.y ? row.map((c, cx) => (cx === tower.pos.x ? 1 : c)) : row
  );

  return {
    ...state,
    towers: state.towers.filter((t) => t.id !== towerId),
    cells: newCells,
    gold: state.gold + refund,
  };
}

// --- Start wave ---

export function startWave(state: TDState): TDState {
  if (state.phase !== "build" && state.phase !== "between-waves") return state;
  if (state.currentWave >= state.waves.length) return state;

  const wave = state.waves[state.currentWave];
  return {
    ...state,
    phase: "wave",
    spawnTimer: 0,
    spawnedThisWave: 0,
    totalToSpawnThisWave: countWaveEnemies(wave),
  };
}

// --- Move single enemy along path ---

export function moveSingleEnemy(enemy: Enemy, path: readonly Vec2[], dt: number): Enemy {
  if (!enemy.alive) return enemy;
  if (enemy.pathIndex >= path.length) return enemy;

  const speed = enemy.slowed > 0 ? enemy.speed * 0.5 : enemy.speed;
  let remaining = speed * dt;
  let { pathIndex } = enemy;
  let pos = enemy.pos;

  while (remaining > 0 && pathIndex < path.length) {
    const target = path[pathIndex];
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= remaining) {
      pos = target;
      remaining -= dist;
      pathIndex++;
    } else {
      const ratio = remaining / dist;
      pos = { x: pos.x + dx * ratio, y: pos.y + dy * ratio };
      remaining = 0;
    }
  }

  const newSlowed = Math.max(0, enemy.slowed - dt);
  return { ...enemy, pos, pathIndex, slowed: newSlowed };
}

// --- Get next enemy type to spawn from wave ---

function getNextSpawnType(wave: Wave, spawnedSoFar: number): EnemyType {
  let count = 0;
  for (const group of wave.enemies) {
    count += group.count;
    if (spawnedSoFar < count) return group.type;
  }
  return "basic";
}

// --- Distance helper ---

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Step wave ---

export function stepWave(state: TDState, dt: number): TDState {
  if (state.phase !== "wave") return state;

  let s = { ...state };
  const wave = s.waves[s.currentWave];

  // 1. Spawn enemies
  if (s.spawnedThisWave < s.totalToSpawnThisWave) {
    let spawnTimer = s.spawnTimer - dt;
    let spawnedThisWave = s.spawnedThisWave;
    const newEnemies: Enemy[] = [];

    while (spawnTimer <= 0 && spawnedThisWave < s.totalToSpawnThisWave) {
      const enemyType = getNextSpawnType(wave, spawnedThisWave);
      const stats = ENEMY_STATS[enemyType];
      const enemy: Enemy = {
        id: `enemy-${s.nextId + newEnemies.length}`,
        type: enemyType,
        pos: { ...s.startPos },
        hp: stats.hp,
        maxHp: stats.hp,
        speed: stats.speed,
        pathIndex: 0,
        alive: true,
        reward: stats.reward,
        slowed: 0,
      };
      newEnemies.push(enemy);
      spawnedThisWave++;
      spawnTimer += 0.5;
    }

    s = {
      ...s,
      enemies: [...s.enemies, ...newEnemies],
      spawnTimer,
      spawnedThisWave,
      nextId: s.nextId + newEnemies.length,
    };
  }

  // 2. Move enemies
  const movedEnemies = s.enemies.map((e) => moveSingleEnemy(e, s.path, dt));

  // 3. Tower shooting
  let enemies = [...movedEnemies];
  const towers = s.towers.map((tower) => {
    let t = { ...tower, cooldownTimer: tower.cooldownTimer - dt };
    if (t.cooldownTimer > 0) return t;

    // Find closest alive enemy in range, prioritize enemies closest to exit (highest pathIndex)
    let bestTarget: number = -1;
    let bestPathIndex = -1;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.alive) continue;
      const d = dist(t.pos, e.pos);
      if (d <= t.range) {
        if (e.pathIndex > bestPathIndex) {
          bestPathIndex = e.pathIndex;
          bestTarget = i;
        }
      }
    }

    if (bestTarget === -1) return t;

    // Apply damage
    const target = enemies[bestTarget];
    let newHp = target.hp - t.damage;

    if (t.type === "slow") {
      enemies[bestTarget] = { ...target, hp: newHp, slowed: 2.0 };
    } else if (t.type === "splash") {
      enemies[bestTarget] = { ...target, hp: newHp };
      // Splash damage to nearby enemies
      for (let i = 0; i < enemies.length; i++) {
        if (i === bestTarget || !enemies[i].alive) continue;
        if (dist(enemies[i].pos, target.pos) <= 1.5) {
          enemies[i] = { ...enemies[i], hp: enemies[i].hp - Math.floor(t.damage / 2) };
        }
      }
    } else {
      enemies[bestTarget] = { ...target, hp: newHp };
    }

    t = { ...t, cooldownTimer: t.cooldown };
    return t;
  });

  // 4. Check enemy death — add reward and score
  let gold = s.gold;
  let score = s.score;
  enemies = enemies.map((e) => {
    if (e.alive && e.hp <= 0) {
      gold += e.reward;
      score += e.reward;
      return { ...e, alive: false };
    }
    return e;
  });

  // 5. Check escape — enemies that reached end of path
  let lives = s.lives;
  enemies = enemies.map((e) => {
    if (e.alive && e.pathIndex >= s.path.length) {
      lives--;
      return { ...e, alive: false };
    }
    return e;
  });

  s = { ...s, enemies, towers, gold, score, lives };

  // 6. Check loss
  if (s.lives <= 0) {
    return { ...s, phase: "lost", lives: 0 };
  }

  // 7. Check wave end
  const allSpawned = s.spawnedThisWave >= s.totalToSpawnThisWave;
  const allDead = s.enemies.every((e) => !e.alive);
  if (allSpawned && allDead) {
    if (s.currentWave >= s.waves.length - 1) {
      return { ...s, phase: "won" };
    }
    return { ...s, phase: "between-waves", currentWave: s.currentWave + 1 };
  }

  return s;
}
