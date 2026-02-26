# Particles & Floating Text

The engine provides a complete particle system with pooling, color interpolation, and burst/continuous modes. Use it instead of writing your own particle arrays.

**Always call `updateParticles(dt)` in your frame loop** — it's a no-op when no emitters exist.

## Particle Emitters

```typescript
import { createEmitter, updateParticles, getAllParticles } from "@arcane/runtime/particles";

// Continuous emitter (fire, portal glow, ambient dust)
createEmitter({
  shape: "point", x: 100, y: 100, mode: "continuous", rate: 20,
  lifetime: [0.5, 1.0], velocityX: [-50, 50], velocityY: [-100, -50],
  startColor: { r: 1, g: 0.8, b: 0.2, a: 1 }, endColor: { r: 1, g: 0.2, b: 0, a: 0 },
  textureId: TEX_PARTICLE,
});

// Burst emitter (explosion, death, pickup)
createEmitter({
  shape: "point", x: enemy.x, y: enemy.y, mode: "burst", burstCount: 20,
  lifetime: [0.3, 0.8], velocityX: [-100, 100], velocityY: [-150, -20],
  startColor: { r: 1, g: 0, b: 0, a: 1 }, endColor: { r: 1, g: 0.5, b: 0, a: 0 },
});

// In onFrame:
updateParticles(dt);
for (const p of getAllParticles()) {
  drawSprite({
    textureId: p.textureId, x: p.x - 2, y: p.y - 2,
    w: 4 * p.scale, h: 4 * p.scale,
    opacity: 1 - p.age / p.lifetime,
    blendMode: "additive",
    layer: 5,
  });
}
```

## Emitter Shapes

- `"point"` — all particles spawn at (x, y)
- `"line"` — spawn along a line: `{ shape: "line", shapeParams: { x2: 100, y2: 50 }, ... }`
- `"area"` — spawn within a rectangle: `{ shape: "area", shapeParams: { width: 100, height: 50 }, ... }`
- `"ring"` — spawn in an annular region: `{ shape: "ring", shapeParams: { innerRadius: 10, outerRadius: 30 }, ... }`

## Seeded Randomness in Particle Spawning

Use `createRng()` for deterministic procedural particle placement (e.g., starfield, debris patterns):

```typescript
import { createRng } from "@arcane/runtime/state";

const rng = createRng(42);
for (let i = 0; i < 50; i++) {
  createEmitter({
    shape: "point", x: rng.int(0, 800), y: rng.int(0, 600),
    mode: "continuous", rate: rng.int(1, 4),
    lifetime: [0.3, 0.8], velocityY: [-20, -5],
    startColor: { r: 1, g: 1, b: 1, a: 0.6 },
    endColor: { r: 1, g: 1, b: 1, a: 0 },
  });
}
```

## Common Patterns

**Death explosion:**
```typescript
createEmitter({
  shape: "point", x: player.x, y: player.y,
  mode: "burst", burstCount: 15,
  lifetime: [0.4, 0.8],
  velocityX: [-120, 120], velocityY: [-200, -30],
  startColor: { r: 1, g: 0.2, b: 0.2, a: 1 },
  endColor: { r: 0.5, g: 0, b: 0, a: 0 },
  gravity: 200,
});
```

**Landing dust:**
```typescript
createEmitter({
  shape: "area", x: player.x - 8, y: player.y + player.h,
  shapeParams: { width: 16, height: 2 },
  mode: "burst", burstCount: 6,
  lifetime: [0.2, 0.4],
  velocityX: [-40, 40], velocityY: [-30, -10],
  startColor: { r: 0.6, g: 0.5, b: 0.5, a: 0.6 },
  endColor: { r: 0.6, g: 0.5, b: 0.5, a: 0 },
});
```

**Fire / torch:**
```typescript
createEmitter({
  shape: "area", x: torch.x, y: torch.y,
  shapeParams: { width: 8, height: 2 },
  mode: "continuous", rate: 15,
  lifetime: [0.3, 0.6],
  velocityX: [-10, 10], velocityY: [-60, -30],
  startColor: { r: 1, g: 0.8, b: 0.2, a: 1 },
  endColor: { r: 1, g: 0.2, b: 0, a: 0 },
});
```

## `burstParticles` / `streamParticles`

For most effects, use these instead of `createEmitter()` directly. See `types/particles.d.ts` for full signatures.

```typescript
import { burstParticles, streamParticles, drawAllParticles } from "@arcane/runtime/particles";

// One-shot burst — safe to call repeatedly (impact, pickup, trails)
burstParticles(enemy.x, enemy.y);
burstParticles(x, y, { color: rgb(0, 255, 0), count: 20, gravity: 150 });

// Movement trail — use frame gating, NOT streamParticles per-frame
if (moving && ctx.frame % 3 === 0) {
  burstParticles(player.x, player.y, {
    color: TRAIL_COLOR, count: 3,
    velocityX: [-15, 15], velocityY: [-15, 15],
    lifetime: [0.2, 0.5], gravity: 20,
  });
}

// Continuous emitter — call once, not per-frame (each call creates a new emitter)
const smoke = streamParticles(chimney.x, chimney.y, { preset: "smoke" });
// Move the emitter each frame — don't create a new one
smoke.config.x = chimney.x;
smoke.config.y = chimney.y;
```

### The `speed` Multiplier Trap

The `speed` option multiplies the preset's built-in velocity ranges. This is often much faster than expected:

| Preset | Velocity X | Velocity Y | `speed: 10` result |
|--------|-----------|-----------|-------------------|
| dust | ±30 px/s | -40 to -10 px/s | ±300 px/s, -400 to -100 px/s |
| fire | ±20 px/s | -80 to -30 px/s | ±200 px/s, -800 to -300 px/s |
| sparks | ±120 px/s | ±120 px/s | ±1200 px/s, ±1200 px/s |
| smoke | ±10 px/s | -30 to -10 px/s | ±100 px/s, -300 to -100 px/s |

**For gentle or precise motion**, specify `velocityX`/`velocityY` directly and omit `speed`:

```typescript
// Too fast — speed multiplies sparks preset's ±120 px/s → ±600 px/s!
burstParticles(x, y, { speed: 5 });
// Correct — explicit velocity for a gentle puff
burstParticles(x, y, { velocityX: [-15, 15], velocityY: [-20, -5] });
```

### Rendering

`drawAllParticles()` is required in your frame loop -- `autoSubsystems` updates particle physics but does not draw them. For custom rendering (sprites, additive blending), use `getAllParticles()` instead.

```typescript
game.onFrame((ctx) => {
  // ... game logic and drawing ...
  drawAllParticles();
});
```

## Floating Text

Auto-animating text that rises and fades. Use for damage numbers, XP gains, gold pickups — don't hand-roll rising text with manual timers.

```typescript
import { spawnFloatingText, updateFloatingTexts, drawFloatingTexts } from "@arcane/runtime/rendering";

// Damage number
spawnFloatingText(enemy.x, enemy.y - 16, "-25", {
  color: { r: 1, g: 0.2, b: 0.2, a: 1 }, rise: 40, duration: 0.8, scale: 1.5, pop: true,
});

// Gold pickup
spawnFloatingText(chest.x, chest.y, "+50 gold", {
  color: { r: 0.2, g: 1, b: 0.3, a: 1 }, rise: 25, duration: 1.0, driftX: 20,
});

// In onFrame:
updateFloatingTexts(dt);
drawFloatingTexts();
```
