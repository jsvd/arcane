# Physics

## AABB Helpers (Simple Collision)

For basic overlap checks without a physics engine:

```typescript
import { aabbOverlap, circleAABBResolve } from "@arcane/runtime/physics";

if (aabbOverlap(a, b)) { /* AABB vs AABB overlap */ }
const normal = circleAABBResolve(cx, cy, radius, box);  // returns {nx, ny} or null
```

## Rigid Body Physics

For games that need real physics (platformers, breakout, stacking puzzles):

```typescript
import {
  createPhysicsWorld, stepPhysics, destroyPhysicsWorld,
  createBody, removeBody, getBodyState,
  setBodyVelocity, applyForce, applyImpulse,
  createDistanceJoint, createRevoluteJoint,
  getContacts, queryAABB, raycast,
} from "@arcane/runtime/physics";

// 1. Create world with gravity (call once at init)
createPhysicsWorld({ gravityX: 0, gravityY: 400 });

// 2. Create bodies
const ground = createBody({
  type: "static",
  shape: { type: "aabb", halfW: 400, halfH: 20 },
  x: 400, y: 580,  // position = center of body
  material: { restitution: 0.3, friction: 0.8 },
});
const ball = createBody({
  type: "dynamic",
  shape: { type: "circle", radius: 10 },
  x: 400, y: 100,
  mass: 1.0,
  material: { restitution: 0.8, friction: 0.3 },
});

// 3. In onFrame: step, read state, render
stepPhysics(dt);
const state = getBodyState(ball);  // { x, y, angle, vx, vy, angularVelocity }
drawSprite({ textureId: TEX, x: state.x - 10, y: state.y - 10, w: 20, h: 20, layer: 1 });
```

## Body Types

- `"static"` -- walls, ground. Immovable.
- `"dynamic"` -- affected by forces and gravity.
- `"kinematic"` -- moved by code, pushes dynamic bodies.

## Shape Types

- `{ type: "circle", radius }` -- circle centered on body position.
- `{ type: "aabb", halfW, halfH }` -- axis-aligned box centered on body position.

## Forces & Impulses

```typescript
applyImpulse(ball, 0, -200);    // instant velocity change (jump)
applyForce(ball, 100, 0);        // continuous push (wind)
setBodyVelocity(ball, 0, 0);     // directly set velocity
```

## Constraints (Joints)

```typescript
const joint = createDistanceJoint(bodyA, bodyB, 50);           // fixed distance
const hinge = createRevoluteJoint(bodyA, bodyB, pivotX, pivotY); // rotation around point
```

## Collision Queries

```typescript
// Contact pairs from last step
for (const c of getContacts()) {
  if (c.bodyA === ball || c.bodyB === ball) { /* ball hit something */ }
}

// Area query
const bodies = queryAABB(x, y, w, h);

// Raycast
const hit = raycast(originX, originY, dirX, dirY, maxDist);
```

## Collision Layers

`layer` = what this body is. `mask` = what it collides with.
Two bodies collide when `(a.layer & b.mask) != 0 && (b.layer & a.mask) != 0`.
Default: `layer=0x0001`, `mask=0xFFFF` (collides with everything).

```typescript
const player = createBody({
  type: "dynamic",
  shape: { type: "aabb", halfW: 12, halfH: 16 },
  x: 100, y: 100,
  layer: 0x0001,  // player layer
  mask: 0x0003,   // collides with layers 1 and 2
});
const enemy = createBody({
  type: "dynamic",
  shape: { type: "circle", radius: 10 },
  x: 300, y: 100,
  layer: 0x0002,  // enemy layer
  mask: 0x0001,   // collides with player layer only
});
```
