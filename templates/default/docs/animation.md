# Animation

## Basic Animation

Create a definition once, update state each frame:

```typescript
import { createAnimation, playAnimation, updateAnimation, drawAnimatedSprite } from "@arcane/runtime/rendering";

// Define: textureId, frameW, frameH, frameCount, fps
const walkAnim = createAnimation(spriteSheet, 32, 32, 4, 10);
let animState = playAnimation(walkAnim);

// In onFrame:
animState = updateAnimation(animState, dt);
drawAnimatedSprite(animState, x, y, 32, 32, { layer: 1 });
```

## Animation State Machine (FSM)

Declarative state-based animation with crossfade blending and condition-driven transitions.

```typescript
import { createAnimation, playAnimation } from "@arcane/runtime/rendering";
import { createAnimationFSM, updateFSM, drawFSMSprite } from "@arcane/runtime/rendering";

const idle = createAnimation(spriteSheet, 32, 32, 4, 6);
const run  = createAnimation(spriteSheet, 32, 32, 6, 12);
const jump = createAnimation(spriteSheet, 32, 32, 2, 8);

const fsm = createAnimationFSM({
  initialState: "idle",
  defaultBlendDuration: 0.1,
  states: {
    idle: { animationId: idle, loop: true },
    run:  { animationId: run,  loop: true, speed: 1.5 },
    jump: { animationId: jump, loop: false },
  },
  transitions: [
    { from: "idle", to: "run",  condition: { type: "threshold", param: "speed", value: 0.1, compare: "greaterThan" } },
    { from: "run",  to: "idle", condition: { type: "threshold", param: "speed", value: 0.1, compare: "lessThan" } },
    { from: "idle", to: "jump", condition: { type: "trigger",   param: "jump" } },
    { from: "run",  to: "jump", condition: { type: "trigger",   param: "jump" } },
    { from: "jump", to: "idle", condition: { type: "animationFinished" } },
  ],
});

// In onFrame:
let state = updateFSM(fsm, dt, { speed: Math.abs(vx), jump: justJumped });
drawFSMSprite(state, x, y, 32, 32, { layer: 1, flipX: facingLeft });
```

### Transition Conditions

- `threshold` -- compare a numeric param: `{ type: "threshold", param: "speed", value: 0.1, compare: "greaterThan" }`
- `trigger` -- one-shot boolean: `{ type: "trigger", param: "jump" }`
- `animationFinished` -- when the current non-looping animation ends

### Blending

The `defaultBlendDuration` crossfades between states. Override per-transition:

```typescript
transitions: [
  { from: "idle", to: "attack", condition: ..., blendDuration: 0.05 },  // quick blend
]
```
