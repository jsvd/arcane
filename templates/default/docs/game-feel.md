# Game Feel & Juice

## Tweening

Animate values over time. Mutates target object directly.

```typescript
import { tween, updateTweens, easeOutBounce } from "@arcane/runtime/tweening";

const pos = { x: 0, y: 0 };
tween(pos, { x: 100, y: 200 }, 0.5, { easing: easeOutBounce, onComplete: () => { /* done */ } });

// In onFrame:
updateTweens(dt);
drawSprite({ textureId: TEX, x: pos.x, y: pos.y, w: 32, h: 32, layer: 1 });
```

## Tween Chains

Compose sequential, parallel, and staggered animations:

```typescript
import { sequence, parallel, stagger, updateTweens, easeOutBack } from "@arcane/runtime/tweening";

const pos = { x: 0, y: 0, scale: 0 };

// Run one after another
sequence([
  { target: pos, props: { y: -50 },  duration: 0.3, options: { easing: easeOutBack } },
  { target: pos, props: { y: 0 },    duration: 0.2 },
  { target: pos, props: { scale: 1 }, duration: 0.15 },
]);

// Run simultaneously
parallel([
  { target: pos, props: { x: 100 }, duration: 0.5 },
  { target: pos, props: { y: 200 }, duration: 0.5 },
]);

// Each starts 0.1s after the previous
const items = [obj1, obj2, obj3, obj4];
stagger(
  items.map(item => ({ target: item, props: { opacity: 1 }, duration: 0.3 })),
  0.1,
);
```

## Camera Shake + Screen Flash

```typescript
import { shakeCamera, getCameraShakeOffset, flashScreen, getScreenFlash } from "@arcane/runtime/tweening";
import { setCamera, drawRect, getViewportSize } from "@arcane/runtime/rendering";

// Trigger on hit
shakeCamera(8, 0.3);                     // 8px intensity, 0.3s duration
flashScreen(1, 0, 0, 0.2, 0.6);         // red flash, 0.2s, 60% opacity

// In onFrame:
const shake = getCameraShakeOffset();
setCamera(camX + shake.x, camY + shake.y);

const flash = getScreenFlash();
if (flash) {
  const { width: VPW, height: VPH } = getViewportSize();
  drawRect(0, 0, VPW, VPH, {
    color: { r: flash.r, g: flash.g, b: flash.b, a: flash.opacity },
    screenSpace: true, layer: 200,
  });
}
```

## Impact Combinator

Orchestrates shake + hitstop + flash + particles in one call:

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

// Presets
impactLight(enemy.x, enemy.y);   // small shake + brief flash
impactHeavy(boss.x, boss.y);     // big shake + long flash + particles

// Frame loop with hitstop:
onFrame(() => {
  const dt = getDeltaTime();
  if (!consumeHitstopFrame()) {
    updateGameplay(dt);  // skipped during hitstop
  }
  // Always run, even during hitstop
  updateTweens(dt);
  updateParticles(dt);
  renderGame();
});
```

## Particles

```typescript
import { createEmitter, updateParticles, getAllParticles } from "@arcane/runtime/particles";

createEmitter({
  shape: "point", x: 100, y: 100, mode: "continuous", rate: 20,
  lifetime: [0.5, 1.0], velocityX: [-50, 50], velocityY: [-100, -50],
  startColor: { r: 1, g: 0.8, b: 0.2, a: 1 }, endColor: { r: 1, g: 0.2, b: 0, a: 0 },
  textureId: TEX_PARTICLE,
});

// In onFrame:
updateParticles(dt);
for (const p of getAllParticles()) {
  drawSprite({
    textureId: p.textureId, x: p.x - 2, y: p.y - 2,
    w: 4 * p.scale, h: 4 * p.scale,
    opacity: p.lifetime / p.maxLifetime,
    blendMode: "additive",
    layer: 5,
  });
}
```

## Floating Text

Auto-animating text that rises and fades. Damage numbers, XP gains, gold pickups:

```typescript
import { spawnFloatingText, updateFloatingTexts, drawFloatingTexts } from "@arcane/runtime/rendering";

spawnFloatingText(enemy.x, enemy.y - 16, "-25", {
  color: { r: 1, g: 0.2, b: 0.2, a: 1 }, rise: 40, duration: 0.8, scale: 1.5, pop: true,
});
spawnFloatingText(chest.x, chest.y, "+50 gold", {
  color: { r: 0.2, g: 1, b: 0.3, a: 1 }, rise: 25, duration: 1.0, driftX: 20,
});

// In onFrame:
updateFloatingTexts(dt);
drawFloatingTexts();
```

## Typewriter Dialogue

Progressive character-by-character text reveal:

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

## Trail / Ribbon Effects

A ribbon that follows a moving point. Points fade out over time.

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
if (teleported) clearTrail(swordTrail);
```

## Screen Transitions

Visual effects for scene changes. Five patterns: `"fade"`, `"wipe"`, `"circleIris"`, `"diamond"`, `"pixelate"`.

```typescript
import {
  startScreenTransition, updateScreenTransition,
  drawScreenTransition, isScreenTransitionActive,
} from "@arcane/runtime/rendering";

startScreenTransition("circleIris", 0.6, { color: { r: 0, g: 0, b: 0 } },
  () => { currentScene = "gameplay"; },  // runs at midpoint
  () => { console.log("done"); },         // runs when finished
);

// In onFrame (always call, no-op if inactive):
updateScreenTransition(dt);
drawScreenTransition();
```
