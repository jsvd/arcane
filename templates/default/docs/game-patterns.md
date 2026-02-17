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

const config = {
  playerWidth: 16, playerHeight: 24,
  gravity: 980, jumpForce: -400,
  walkSpeed: 160, runSpeed: 280,
  coyoteTime: 0.08, jumpBuffer: 0.1,
};

const platforms: Platform[] = [
  { x: 0, y: 500, w: 800, h: 50 },                           // ground
  { x: 200, y: 380, w: 120, h: 16 },                         // solid platform
  { x: 400, y: 300, w: 100, h: 16, oneWay: true },          // jump-through platform
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

## Seeded Random Numbers

Use `createRng()` for ergonomic deterministic randomness. Same sequences as the pure `seed()`/`randomInt()` functions, but holds state in a closure so you don't need to thread state through every call.

```typescript
import { createRng } from "@arcane/runtime/state";

const rng = createRng(42);  // deterministic seed

const damage = rng.roll("2d6+3");
const enemy = rng.pick(["goblin", "orc", "troll"]);
const loot = rng.shuffle(items);
const x = rng.int(0, 800);
const chance = rng.float();  // [0, 1)

// Save/restore state
const checkpoint = rng.snapshot();
// ... do things ...
rng.restore(checkpoint);  // replay exact same sequence

// Fork for independent streams (e.g., world gen vs combat)
const combatRng = rng.fork();  // parent advances, child is independent
```

## Particle Effects for Game Feel

Use additive blending for fire/explosions:

```typescript
for (const p of particles) {
  drawSprite({
    textureId: TEX_PARTICLE, x: p.x - 2, y: p.y - 2,
    w: 4 * p.scale, h: 4 * p.scale,
    opacity: p.lifetime / p.maxLifetime,
    blendMode: "additive",
    layer: 5,
  });
}
```
