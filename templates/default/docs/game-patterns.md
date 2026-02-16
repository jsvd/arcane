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
