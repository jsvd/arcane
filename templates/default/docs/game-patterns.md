# Common Game Patterns

## Angular Movement (Ships, Vehicles)

Use `cos`/`sin` with a rotation angle:

```typescript
import { isKeyDown } from "@arcane/runtime/rendering";

// Rotate
entity.angle += turnSpeed * dt * (isKeyDown("ArrowRight") ? 1 : isKeyDown("ArrowLeft") ? -1 : 0);

// Thrust in facing direction
if (isKeyDown("ArrowUp")) {
  entity.vx += Math.cos(entity.angle - Math.PI / 2) * thrust * dt;
  entity.vy += Math.sin(entity.angle - Math.PI / 2) * thrust * dt;
}

// Render with rotation
drawSprite({ textureId: TEX, x: entity.x - 16, y: entity.y - 16, w: 32, h: 32, rotation: entity.angle, layer: 1 });
```

Note: `angle - Math.PI/2` because rotation 0 = pointing right, but "up" sprites typically face up.

## Screen Wrapping (Asteroids, Pac-Man)

```typescript
function wrapPosition(x: number, y: number, w: number, h: number, vpW: number, vpH: number) {
  return {
    x: x < -w ? vpW : x > vpW ? -w : x,
    y: y < -h ? vpH : y > vpH ? -h : y,
  };
}
```

## Cooldown Timers

Decrement by dt, allow action when <= 0:

```typescript
entity.shootCooldown -= dt;
if (isKeyPressed("Space") && entity.shootCooldown <= 0) {
  spawnBullet(entity);
  entity.shootCooldown = 0.15;  // seconds between shots
}
```

## Entity Lifecycle (Spawn / Update / Despawn)

```typescript
// Spawn
bullets.push({ x, y, vx, vy, lifetime: 1.5 });

// Update + despawn in one pass
bullets = bullets
  .map(b => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt, lifetime: b.lifetime - dt }))
  .filter(b => b.lifetime > 0);
```

## Platformer Controller

The engine provides a pure-function platformer controller with gravity, jump (coyote time + jump buffer), walk/run, and AABB platform collision. State in, state out — no globals, no rendering.

```typescript
import {
  createPlatformerState, platformerMove, platformerJump, platformerStep,
} from "@arcane/runtime/game";
import type { Platform } from "@arcane/runtime/game";
import { isActionDown, isActionPressed } from "@arcane/runtime/input";

const config = { playerWidth: 16, playerHeight: 24, jumpForce: -400 }; // see PlatformerConfig defaults in .d.ts

const platforms: Platform[] = [
  { x: 0, y: 500, w: 800, h: 50 },                  // ground
  { x: 200, y: 380, w: 120, h: 16 },                // solid
  { x: 400, y: 300, w: 100, h: 16, oneWay: true },  // jump-through
];

let player = createPlatformerState(100, 100);

// In onFrame:
const dir = (isActionDown("right", input) ? 1 : 0) - (isActionDown("left", input) ? 1 : 0);
player = platformerMove(player, dir, isActionDown("run", input), config);
if (isActionPressed("jump", input)) player = platformerJump(player, config);
player = platformerStep(player, dt, platforms, config);

// Render at player.x, player.y — facingRight available for sprite flip
drawColorSprite({
  color: rgb(60, 180, 255),
  x: player.x, y: player.y, w: config.playerWidth, h: config.playerHeight,
  flipX: !player.facingRight, layer: 1,
});
```

**Coyote time**: jump allowed for 80ms after walking off a ledge. **Jump buffer**: pressing jump in the air remembers the input and auto-triggers on landing.

**One-way platforms**: set `oneWay: true` — the player passes through from below and lands on top.

**External velocity**: Use `platformerApplyImpulse()` for knockback, bounce pads, wind. External velocity decays automatically each frame (x0.85).

## Grid Movement with Smooth Interpolation

For grid-based games, store the **logical** grid position separately from the **visual** position, and interpolate.

```typescript
type GridEntity = {
  gx: number; gy: number;       // current logical grid cell
  prevGx: number; prevGy: number; // previous grid cell (for lerp)
  moveProgress: number;          // 0 = at prevG, 1 = at gx/gy
};

const TILE_SIZE = 32;
const MOVE_SPEED = 8; // tiles per second

/** Move the entity to a new grid cell. */
function gridMoveTo(e: GridEntity, newGx: number, newGy: number): GridEntity {
  return { ...e, prevGx: e.gx, prevGy: e.gy, gx: newGx, gy: newGy, moveProgress: 0 };
}

/** Advance the interpolation (call each frame). */
function gridUpdateMove(e: GridEntity, dt: number): GridEntity {
  if (e.moveProgress >= 1) return e;
  return { ...e, moveProgress: Math.min(1, e.moveProgress + MOVE_SPEED * dt) };
}

/** Get the pixel position for rendering. NEVER write this back to gx/gy. */
function gridRenderPos(e: GridEntity): { x: number; y: number } {
  const t = e.moveProgress;
  return {
    x: (e.prevGx + (e.gx - e.prevGx) * t) * TILE_SIZE,
    y: (e.prevGy + (e.gy - e.prevGy) * t) * TILE_SIZE,
  };
}
```

**Common bug:** writing the interpolated position back into `gx`/`gy` each frame. This compounds rounding errors and the entity drifts. Always keep logical position (integers) and render position (floats) separate.

## Seeded Random Numbers

Use `createRng()` for ergonomic deterministic randomness. Holds state in a closure so you don't need to thread PRNG state through every call.

```typescript
import { createRng } from "@arcane/runtime/state";

const rng = createRng(42);  // deterministic seed
const damage = rng.roll("2d6+3");
const enemy = rng.pick(["goblin", "orc", "troll"]);
const x = rng.int(0, 800);

// Save/restore for replay
const checkpoint = rng.snapshot();
rng.restore(checkpoint);  // replay exact same sequence

// Fork for independent streams (e.g., world gen vs combat)
const combatRng = rng.fork();
```

## Jump Physics Helpers

Utility functions for level design validation -- checking clearable gaps, sizing platforms, tuning jump feel.

**Formulas:** `h = v^2/(2g)` (jump height), `t = 2v/g` (airtime), `reach = speed * airtime` (horizontal distance).

```typescript
import { getJumpHeight, getAirtime, getJumpReach } from "@arcane/runtime/game";

const config = { gravity: 980, jumpForce: -400, walkSpeed: 160, runSpeed: 280 };

const height = getJumpHeight(config);    // ~81.6 px
const airtime = getAirtime(config);      // ~0.816 sec
const walkReach = getJumpReach(config);  // ~130.6 px
const runReach = getJumpReach(config, true); // ~228.6 px

// Level design check: can the player clear this gap?
if (runReach > gapWidth) { /* clearable at full run speed */ }
```

All three accept `PlatformerConfig` and respect its defaults.

## Grid-to-Platforms

Convert a tile grid or tilemap layer into merged `Platform[]` rectangles. Greedy merging produces fewer, larger rectangles.

```typescript
import { gridToPlatforms, platformsFromTilemap } from "@arcane/runtime/game";
import { defineTileProperties } from "@arcane/runtime/rendering";

// From a raw grid
const grid = [
  [0, 0, 0, 0, 0],
  [1, 1, 0, 0, 0],
  [1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1],
];
const platforms = gridToPlatforms(grid, 16, [1]);

// From a LayeredTilemap layer
defineTileProperties(1, { solid: true });
const tilemapPlatforms = platformsFromTilemap(myMap, "collision");

// Custom solid check
const customPlatforms = platformsFromTilemap(myMap, "ground", (id) => id >= 1 && id <= 10);
```

