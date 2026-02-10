# Tower Defense Example

A tower defense game built with Arcane, demonstrating A* pathfinding and wave-based gameplay.

## Features

- **A* Pathfinding** — Enemies find optimal path to goal
- **Tower Placement** — Click to place defensive towers
- **Wave System** — Increasingly difficult enemy waves
- **Dynamic Pathing** — Path recalculates when towers block routes
- **Resource Management** — Earn gold to build more towers
- **Agent Protocol** — Query game state from CLI

## How to Run

```bash
# From the examples/tower-defense directory
arcane dev
```

## Controls

- **Mouse** — Hover over tiles to select
- **Space** — Place tower (costs 50 gold)

## Gameplay

**Goal:** Prevent enemies from reaching the goal (red tile on the right).

**Strategy:**
1. Enemies spawn from the green START tile (left side)
2. They pathfind to the red GOAL tile (right side)
3. Place towers (Space) to block and attack enemies
4. Towers automatically shoot enemies in range
5. Kill enemies to earn gold (10g per enemy)
6. Each wave increases difficulty
7. Lose 1 life per enemy that reaches the goal
8. Game over at 0 lives

**Tips:**
- Place towers to create a maze — enemies must path around them!
- Hover over towers to see their range (blue circle)
- Complete waves for bonus gold
- Don't block the path completely or enemies can't spawn

## Code Structure

### `src/game.ts` — Pure Game Logic

All game logic is pure functions:

```typescript
export function placeTower(state: GameState, position: Vec2): GameState {
  // Pure state transformation
  // Returns new state or unchanged state if invalid
}

export function updateGame(state: GameState, dt: number): GameState {
  // Update enemies, towers, check win/loss
  // Pure function - no side effects
}
```

The pathfinding system uses Arcane's built-in A* implementation:

```typescript
import { findPath, type PathGrid } from "@arcane/runtime/pathfinding";

function createPathGrid(state: GameState): PathGrid {
  return {
    width: state.width,
    height: state.height,
    isWalkable: (x, y) => {
      const tile = state.tiles[y][x];
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
```

### `src/visual.ts` — Rendering Layer

Renders the game state and handles input:

```typescript
onFrame(() => {
  const dt = getDeltaTime();

  // Update game logic
  state = updateGame(state, dt);

  // Handle input
  if (isKeyPressed(" ")) {
    state = placeTower(state, mousePosition);
  }

  // Render
  drawSprite("tower", tower.position.x * 32, tower.position.y * 32);
  drawBar(barX, barY, barWidth, barHeight, enemy.hp / enemy.maxHp, ...);
});
```

## What's Demonstrated

- ✅ **A* Pathfinding** — Using `@arcane/runtime/pathfinding`
- ✅ **Real-time Updates** — Delta time (`getDeltaTime()`)
- ✅ **Mouse Input** — `getMousePosition()` for tower placement
- ✅ **UI Primitives** — `drawBar()`, `drawLabel()` from `@arcane/runtime/ui`
- ✅ **Wave System** — State-driven game progression
- ✅ **Dynamic Obstacles** — Path recalculates when towers placed

## Extending the Game

### Different Tower Types

```typescript
type TowerType = "basic" | "sniper" | "splash";

const TOWER_STATS: Record<TowerType, {
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
}> = {
  basic: { cost: 50, range: 3, damage: 2, fireRate: 1.0 },
  sniper: { cost: 100, range: 6, damage: 5, fireRate: 2.0 },
  splash: { cost: 150, range: 2, damage: 1, fireRate: 0.5 },
};
```

### Tower Upgrades

```typescript
export function upgradeTower(state: GameState, towerId: string): GameState {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower || state.gold < 50) return state;

  return {
    ...state,
    towers: state.towers.map((t) =>
      t.id === towerId
        ? { ...t, damage: t.damage + 1, range: t.range + 0.5 }
        : t
    ),
    gold: state.gold - 50,
  };
}
```

### Enemy Types

```typescript
type EnemyType = "weak" | "fast" | "tank";

const ENEMY_STATS: Record<EnemyType, {
  hp: number;
  speed: number;
  gold: number;
}> = {
  weak: { hp: 5, speed: 2.0, gold: 10 },
  fast: { hp: 3, speed: 4.0, gold: 15 },
  tank: { hp: 20, speed: 1.0, gold: 30 },
};
```

### Projectile Rendering

Add visual projectiles that travel from tower to enemy:

```typescript
type Projectile = {
  from: Vec2;
  to: Vec2;
  progress: number;
};

// In updateGame:
const projectile = {
  from: tower.position,
  to: enemy.position,
  progress: 0,
};
state.projectiles.push(projectile);

// In visual.ts:
for (const proj of state.projectiles) {
  const x = lerp(proj.from.x, proj.to.x, proj.progress);
  const y = lerp(proj.from.y, proj.to.y, proj.progress);
  drawSprite("projectile", x * 32, y * 32, { width: 8, height: 8 });
}
```

## Agent Protocol

Query the game state:

```bash
arcane describe src/visual.ts
arcane inspect src/visual.ts "lives"
arcane inspect src/visual.ts "gold"

# HTTP inspector
arcane dev --inspector 4321
curl http://localhost:4321/describe
```

## Performance Notes

This example demonstrates efficient pathfinding:
- Path computed only when needed (tower placed, new wave)
- Enemies follow pre-computed path (no per-frame A*)
- Binary min-heap A* implementation for O(log n) performance

For larger maps (50×50+), consider:
- Caching paths per tower configuration
- Hierarchical pathfinding (HPA*)
- Flow fields for many enemies

## Next Steps

- Try the [Sokoban example](../sokoban/) for grid-based puzzles
- Read the [Pathfinding API docs](../../docs/api-reference.md#pathfinding)
- Build a real-time strategy game with unit selection

---

**Defend the base!** 🏰
