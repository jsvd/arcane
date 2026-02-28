# Entities & Game State

## Immutable State Pattern

State functions are pure: state in, state out. Never mutate state directly.

```typescript
// src/game.ts
export interface GameState {
  enemies: Enemy[];
  score: number;
}

export function spawnEnemy(state: GameState, enemy: Enemy): GameState {
  return { ...state, enemies: [...state.enemies, enemy] };
}

export function removeDeadEnemies(state: GameState): GameState {
  return { ...state, enemies: state.enemies.filter(e => e.hp > 0) };
}
```

## Entity Handles

`createEntity()` binds a world position to an optional physics body and sprite. After `stepPhysics()`, call `syncEntities()` to pull positions from physics, then `drawEntities()` to render.

```typescript
import {
  createEntity, syncEntities, drawEntities, destroyEntity,
  findEntity, findEntities,
} from "@arcane/runtime/game";
import { createPhysicsWorld, stepPhysics } from "@arcane/runtime/physics";
import { rgb } from "@arcane/runtime/ui";

createPhysicsWorld({ gravityX: 0, gravityY: 300 });

const entities: Entity[] = [];

// Ball with physics + colored sprite
const ball = createEntity(400, 100, {
  sprite: { color: rgb(255, 100, 50), w: 24, h: 24, layer: 1 },
  body: { type: "dynamic", shape: { type: "circle", radius: 12 }, material: { restitution: 0.7 } },
  tag: "ball",
});
entities.push(ball);

// Static floor
const floor = createEntity(400, 550, {
  sprite: { color: rgb(100, 100, 100), w: 600, h: 20, layer: 0 },
  body: { type: "static", shape: { type: "aabb", halfW: 300, halfH: 10 } },
  tag: "floor",
});
entities.push(floor);

// In game loop:
game.onFrame((ctx) => {
  stepPhysics(ctx.dt);
  syncEntities(entities);
  drawEntities(entities);

  const b = findEntity(entities, "ball");
  if (b) hud.text(`Ball Y: ${b.y | 0}`, 10, 10);
});
```

Use `destroyEntity(entity)` to remove the physics body and mark the entity inactive (skipped by sync/draw). Use `findEntities(entities, "coin")` to find all active entities with a given tag.

## Sprite Groups

For multi-part characters, see [rendering.md](rendering.md#sprite-groups).

**Flip multiplier for shape-based characters:** Use `const flip = facingRight ? 1 : -1` and multiply X offsets: `drawEllipse(x + flip * 5, ...)`. One set of draw calls handles both directions. See [visual-composition.md](visual-composition.md) for Cat/Unicorn examples.

## Collision Events

Event-driven collision system on top of the physics engine:

```typescript
import {
  createCollisionRegistry, onBodyCollision, onCollision,
  processCollisions, removeBodyCollisions,
} from "@arcane/runtime/game";
import { stepPhysics } from "@arcane/runtime/physics";

const collisions = createCollisionRegistry();

// Fire callback whenever the player body hits anything
onBodyCollision(collisions, player.bodyId!, (contact) => {
  const other = contact.bodyA === player.bodyId ? contact.bodyB : contact.bodyA;
  console.log("Player hit body", other);
});

// Fire callback only when two specific bodies collide
onCollision(collisions, bullet.bodyId!, enemy.bodyId!, (contact) => {
  destroyEntity(bullet);
  enemyHP -= 10;
});

// In game loop:
game.onFrame((ctx) => {
  stepPhysics(ctx.dt);
  processCollisions(collisions);
});

// Clean up callbacks when removing a body:
removeBodyCollisions(collisions, bullet.bodyId!);
destroyEntity(bullet);
```

## createGame() Bootstrap

`createGame()` handles `clearSprites()`, `setCamera()`, agent registration, and provides `ctx.dt`/`ctx.viewport`/`ctx.elapsed`/`ctx.frame` in the callback.

```typescript
import { createGame, hud } from "@arcane/runtime/game";
import { drawSprite } from "@arcane/runtime/rendering";
import { rgb } from "@arcane/runtime/ui";

const game = createGame({ name: "my-game", zoom: 2 });

let state = newGame();
game.state({ get: () => state, set: (s) => { state = s; } });

game.onFrame((ctx) => {
  state = update(state, ctx.dt);
  drawSprite({ color: rgb(60, 180, 255), x: state.x - 16, y: state.y - 16, w: 32, h: 32, layer: 1 });
  hud.text(`Score: ${state.score}`, 10, 10);
});
```

What `createGame()` does:
- `autoClear: true` (default) -- clears sprites at frame start
- `background: { r, g, b }` -- pass 0-255 values, converted internally
- `game.state({ get, set })` -- wire up state for agent protocol
