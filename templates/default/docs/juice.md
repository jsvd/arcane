# Juice & Impact

High-level APIs that orchestrate multiple subsystems (camera shake, screen flash, particles, audio, hitstop) in a single call. These are the "one call, big payoff" functions that make a game feel good.

## Impact Combinator

One call triggers shake + hitstop + flash + particles:

```typescript
import { impact, impactLight, impactHeavy, consumeHitstopFrame } from "@arcane/runtime/rendering";
import { updateTweens } from "@arcane/runtime/tweening";
import { updateParticles } from "@arcane/runtime/particles";

// Full custom impact
impact(enemy.x, enemy.y, {
  shake: { intensity: 8, duration: 0.2 },
  hitstop: 3,  // freeze gameplay for 3 frames
  flash: { r: 1, g: 1, b: 1, duration: 0.1, opacity: 0.6 },
  particles: { count: 20, color: { r: 1, g: 0.5, b: 0, a: 1 } },
});

// Presets — use these for quick juice
impactLight(enemy.x, enemy.y);   // small shake + brief flash
impactHeavy(boss.x, boss.y);     // big shake + long flash + particles
```

## Frame Loop with Hitstop

Hitstop freezes gameplay (but not visuals) for N frames. Wire it into your frame loop:

```typescript
game.onFrame((ctx) => {
  if (!consumeHitstopFrame()) {
    // Normal gameplay — skipped during hitstop
    state = updateGameplay(state, ctx.dt);
  }
  // Always run, even during hitstop
  updateTweens(ctx.dt);
  updateParticles(ctx.dt);
  renderGame(state);
});
```

## When to Use Impact

- **Player hit by enemy** — `impactLight(player.x, player.y)`
- **Enemy dies** — `impact(enemy.x, enemy.y, { particles: { count: 15 }, shake: { intensity: 4 } })`
- **Boss attack** — `impactHeavy(boss.x, boss.y)`
- **Player lands from height** — `impactLight(player.x, player.y + player.h)` with small shake
- **Breakable object destroyed** — `impact(obj.x, obj.y, { particles: { count: 10 } })`

## Trail / Ribbon Effects

A ribbon that follows a moving point. Points fade out over time. Use for sword slashes, projectile trails, movement traces.

```typescript
import { createTrail, updateTrail, drawTrail, clearTrail } from "@arcane/runtime/rendering";

const swordTrail = createTrail({
  maxLength: 20, width: 12,
  color: { r: 1, g: 0.6, b: 0.1, a: 1 },
  endColor: { r: 1, g: 0.2, b: 0, a: 0 },
  maxAge: 0.3, layer: 5, blendMode: "additive",
});

// In onFrame:
updateTrail(swordTrail, swordTipX, swordTipY, dt);
drawTrail(swordTrail);
if (teleported) clearTrail(swordTrail);  // prevent visual artifacts on teleport
```

## Typewriter Dialogue

Progressive character-by-character text reveal. Use for NPC dialogue, story text, tutorial messages.

```typescript
import {
  createTypewriter, updateTypewriter, drawTypewriter,
  skipTypewriter, resetTypewriter, isTypewriterComplete,
} from "@arcane/runtime/rendering";

const dialogues = ["The dragon approaches...", "Take this sword."];
let dialogueIndex = 0;
const tw = createTypewriter(dialogues[0], { speed: 30, punctuationPause: 0.15 });

// In onFrame:
if (isKeyPressed("Space")) {
  if (isTypewriterComplete(tw)) {
    dialogueIndex++;
    if (dialogueIndex < dialogues.length) resetTypewriter(tw, dialogues[dialogueIndex]);
  } else {
    skipTypewriter(tw);
  }
}
updateTypewriter(tw, dt);
drawTypewriter(tw, 70, 420, { scale: 1, layer: 100, screenSpace: true });
```

## SDF Glow Effects

Use SDF shapes with glow fills and animation helpers for juicy collectibles and pickups:

```typescript
import {
  star, heart, circle,
  sdfEntity, clearSdfEntities, flushSdfEntities,
  glow, pulse, spin, breathe, bob,
  LAYERS,
} from "@arcane/runtime/rendering";

// Glowing collectible gem
sdfEntity({
  shape: star(14, 4, 0.5),
  fill: glow("#00ffaa", 0.2),  // lower intensity = bigger glow
  position: [gemX, gemY + bob(time, 2, 3)],  // gentle bobbing
  rotation: spin(time, 45),                   // slow spin
  scale: pulse(time, 3, 0.9, 1.1),           // pulsing size
  bounds: 50,  // large bounds for glow effect
  layer: LAYERS.ENTITIES + 5,
});

// Pulsing heart pickup
sdfEntity({
  shape: heart(18),
  fill: glow("#ff3366", 0.15),
  position: [heartX, heartY],
  scale: pulse(time, 2.5, 0.95, 1.15),
  opacity: breathe(time, 2.5, 0.75, 1.0),
  bounds: 70,
  layer: LAYERS.ENTITIES + 5,
});
```

See [sdf.md](sdf.md) for full SDF documentation including shape composition and gradient fills.
