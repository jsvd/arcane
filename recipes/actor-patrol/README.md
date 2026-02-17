# Actor Patrol Recipe

Simple enemy/NPC actors with patrol, chase, and sine movement behaviors.

## Usage

```ts
import { createActor, updateActor, damageActor, isActorAlive } from "./index.ts";

// Patrol back and forth between x=100 and x=300
const guard = createActor(200, 100, {
  behavior: { type: "patrol", minX: 100, maxX: 300, speed: 60 },
});

// Chase player when within range
const chaser = createActor(400, 100, {
  behavior: { type: "chase", speed: 80, range: 150 },
});

// Sine-wave floating enemy
const floater = createActor(300, 200, {
  behavior: { type: "sine", amplitude: 30, frequency: 2 },
});

// Game loop
const updated = updateActor(guard, dt);
const chasing = updateActor(chaser, dt, playerX);

// Damage and stun
const hurt = damageActor(guard, 1, 0.5); // 1 damage, 0.5s stun
const alive = isActorAlive(hurt); // true if hp > 0
```

## API

- `createActor(x, y, options?)` -- Create an actor with default patrol behavior
- `updateActor(actor, dt, targetX?)` -- Advance one frame; targetX needed for chase
- `updateActors(actors, dt, targetX?)` -- Batch update all actors
- `damageActor(actor, amount, stunDuration?)` -- Reduce HP, apply stun or kill
- `isActorAlive(actor)` -- Returns false when state is "dead"

## Behaviors

| Type     | Description                              |
| -------- | ---------------------------------------- |
| `patrol` | Walk between minX and maxX, reverse at edges |
| `chase`  | Move toward targetX when within range    |
| `sine`   | Oscillate vertically around baseY        |
