# Tweening & Animation

Animate values over time instead of using raw `Math.sin()`. The engine provides 30 easing functions, automatic timing, completion callbacks, and chain composition.

**Always call `updateTweens(dt)` in your frame loop** — it's a no-op when no tweens are active.

## Basic Tween

Mutates target object properties over a duration:

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

Trigger on events like hits, deaths, or landings:

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

## Common Easing Functions

See `types/tweening.d.ts` for all 30 easing functions.
