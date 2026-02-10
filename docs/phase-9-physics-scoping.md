# Phase 9: Physics System — Detailed Scoping

## Overview

Phase 9 replaces hand-rolled physics with a proper 2D rigid body dynamics system. This is the largest architectural decision since Phase 1 (state management). Every demo currently reimplements collision and gravity — this phase eliminates that technical debt.

---

## The Core Decision: Box2D vs Pure TypeScript

### Option A: Wrap Box2D (C++ via Rust FFI)

**Architecture:**
```
TypeScript → Rust ops → box2d-rs crate → C++ Box2D
```

**Pros:**
- Battle-tested (15+ years, used in Angry Birds, Limbo, Crayon Physics)
- Feature-complete (joints, CCD, stable stacking, optimized broad-phase)
- Fast (C++ SIMD optimizations)
- Proven performance (handle 1000+ bodies at 60 FPS)

**Cons:**
- **Headless mode complications**: Box2D has no `--no-default-features` equivalent
  - Need to conditionally compile physics behind `physics` feature?
  - Or accept C++ dependency in headless tests?
- **FFI complexity**: box2d-rs bindings are incomplete, may need custom bindings
- **Not agent-friendly**: C++ code is opaque to AI agents
- **Not inspectable**: Can't easily query "why did this collision resolve this way?"
- **External dependency**: Another crate to maintain, version conflicts possible

**Implementation estimate:** 3-4 weeks
- 1 week: FFI bindings + Rust wrapper
- 1 week: TypeScript API design + #[op2] ops
- 1 week: Integration with state system
- 1 week: Demos + tests

---

### Option B: Pure TypeScript Physics

**Architecture:**
```
TypeScript → Physics module (pure TS) → State system
```

**Pros:**
- **Headless-testable**: No GPU, no FFI, just pure functions
- **Agent-friendly**: AI agents can read and modify physics code
- **Inspectable**: Full visibility into collision resolution, forces, impulses
- **No external deps**: Maintains Arcane's "zero TS runtime deps" philosophy
- **Debuggable**: Can log every step of collision response
- **Extensible**: Easy to add custom collision shapes, constraints

**Cons:**
- **More implementation work**: Need to write collision detection, response, integrator
- **Performance unknown**: V8 JIT is fast, but will it handle 500+ bodies at 60 FPS?
  - If not, can migrate hot paths to Rust ops (per performance-migration.md)
- **Stability concerns**: Rigid body stacking is notoriously hard to get right
- **Feature parity**: Will take multiple iterations to match Box2D features

**Implementation estimate:** 4-6 weeks
- 1 week: Collision detection (circle, AABB, polygon)
- 1 week: Collision response (impulse resolution, friction, restitution)
- 1 week: Integrator + stability tuning (prevent jitter, drifting)
- 1 week: Constraints/joints (distance, revolute, prismatic)
- 1 week: Broad-phase optimization (spatial hash grid)
- 1 week: Demos + tests + polish

---

### Recommendation: Start Pure TypeScript

**Rationale:**
1. **Aligns with Arcane philosophy**: Code-first, test-native, agent-native
2. **Preserve headless capability**: Physics should be testable without GPU
3. **Inspect-ability**: Agents can understand and debug physics
4. **Migration path exists**: If profiling shows bottleneck, move to Rust ops (not Box2D)
   - `op_physics_step(bodies, dt)` as transparent fast-path
   - TypeScript version remains as headless fallback
5. **Learning opportunity**: Building physics from scratch teaches how it works

**Performance threshold** (per performance-migration.md):
- If `World.step()` takes >5ms for 200 bodies → migrate to Rust op
- Spatial hash should get us to 500 bodies before hitting that limit

---

## API Design

### TypeScript Public API

```typescript
// runtime/physics/types.ts
interface RigidBodyDef {
  shape: CollisionShape;
  type: 'dynamic' | 'kinematic' | 'static';
  mass?: number;
  restitution?: number;  // bounciness (0 = no bounce, 1 = perfect bounce)
  friction?: number;     // 0 = ice, 1 = sandpaper
  linearDamping?: number; // air resistance for velocity
  angularDamping?: number; // air resistance for rotation
  fixedRotation?: boolean; // prevent rotation (for platformer characters)
}

type CollisionShape =
  | { type: 'circle'; radius: number }
  | { type: 'box'; width: number; height: number }
  | { type: 'polygon'; vertices: Vec2[] };

interface RigidBody {
  id: string;
  shape: CollisionShape;
  type: 'dynamic' | 'kinematic' | 'static';
  position: Vec2;
  rotation: number; // radians
  velocity: Vec2;
  angularVelocity: number;
  mass: number;
  restitution: number;
  friction: number;
  // Derived properties (computed from mass and shape)
  inverseMass: number;
  inertia: number;
  inverseInertia: number;
}

// runtime/physics/world.ts
interface PhysicsWorldDef {
  gravity?: Vec2; // default: { x: 0, y: -9.8 }
  iterations?: number; // constraint solver iterations (more = stable but slower)
  allowSleep?: boolean; // static/slow bodies stop simulating
}

function createPhysicsWorld(def: PhysicsWorldDef): PhysicsWorld;

interface PhysicsWorld {
  addBody(def: RigidBodyDef): string; // returns body ID
  removeBody(id: string): void;
  getBody(id: string): RigidBody | undefined;
  step(dt: number): PhysicsStepResult;

  // Constraints
  addConstraint(constraint: Constraint): string;
  removeConstraint(id: string): void;

  // Collision filtering
  setCollisionFilter(bodyId: string, layer: number, mask: number): void;

  // Queries
  queryAABB(aabb: AABB): string[]; // return body IDs in region
  raycast(start: Vec2, end: Vec2): RaycastResult | null;
}

interface PhysicsStepResult {
  collisions: Collision[]; // all collisions that occurred this frame
  bodyUpdates: { id: string; position: Vec2; rotation: number }[]; // new positions
}

interface Collision {
  bodyA: string;
  bodyB: string;
  normal: Vec2; // collision normal (points from A to B)
  penetration: number; // how deep they overlap
  contactPoints: Vec2[]; // where they touched
}

// runtime/physics/constraints.ts
type Constraint =
  | { type: 'distance'; bodyA: string; bodyB: string; length: number; stiffness?: number }
  | { type: 'revolute'; bodyA: string; bodyB: string; anchor: Vec2; minAngle?: number; maxAngle?: number }
  | { type: 'prismatic'; bodyA: string; bodyB: string; axis: Vec2; minDistance?: number; maxDistance?: number }
  | { type: 'weld'; bodyA: string; bodyB: string };

// runtime/physics/integrator.ts (internal)
// Verlet integration: simple, stable, energy-conserving
function integrate(body: RigidBody, force: Vec2, dt: number): void {
  // Update velocity: v += (F / m) * dt
  // Update position: p += v * dt
}
```

### Integration with State System

Two approaches:

**Approach 1: Physics owns state (bodies are separate from entities)**
```typescript
const state = {
  entities: {
    player: { id: 'player', hp: 100, inventory: [...] },
    enemy1: { id: 'enemy1', hp: 50, aiState: 'patrol' },
  },
  physics: {
    world: PhysicsWorld,
    bodyToEntity: { 'body-1': 'player', 'body-2': 'enemy1' }, // map physics IDs to entity IDs
  },
};

// Each frame:
const result = state.physics.world.step(dt);
// Apply bodyUpdates to entity positions
for (const update of result.bodyUpdates) {
  const entityId = state.physics.bodyToEntity[update.id];
  state.entities[entityId].position = update.position;
  state.entities[entityId].rotation = update.rotation;
}
```

**Approach 2: Physics is a component (ECS-style)**
```typescript
const state = {
  entities: {
    player: {
      id: 'player',
      position: { x: 0, y: 0 },
      rotation: 0,
      physics: {
        bodyId: 'body-1',
        shape: { type: 'circle', radius: 0.5 },
        type: 'dynamic',
        mass: 1,
      },
    },
  },
  physicsWorld: PhysicsWorld,
};

// Each frame:
// 1. Sync entity state → physics bodies (for kinematic bodies controlled by game logic)
for (const entity of Object.values(state.entities)) {
  if (entity.physics && entity.physics.type === 'kinematic') {
    state.physicsWorld.getBody(entity.physics.bodyId).position = entity.position;
  }
}

// 2. Step physics
const result = state.physicsWorld.step(dt);

// 3. Sync physics → entity state (for dynamic bodies controlled by physics)
for (const entity of Object.values(state.entities)) {
  if (entity.physics && entity.physics.type === 'dynamic') {
    const body = state.physicsWorld.getBody(entity.physics.bodyId);
    entity.position = body.position;
    entity.rotation = body.rotation;
  }
}
```

**Recommendation: Approach 2 (ECS-style)**
- More flexible (entities can have physics or not)
- Aligns with existing recipe pattern (components are properties on entities)
- Physics becomes a recipe: `applyRule(state, PhysicsSystem.step(dt))`

---

## Implementation Plan

### Week 1: Collision Detection
- [ ] Circle vs Circle collision
- [ ] AABB vs AABB collision
- [ ] Circle vs AABB collision
- [ ] Convex polygon vs convex polygon (SAT algorithm)
- [ ] GJK algorithm for general convex shapes (future-proof)
- [ ] 50+ tests (all collision pair combinations)

### Week 2: Collision Response
- [ ] Impulse resolution (J = -(1 + e) * Vrel · n / (1/m_a + 1/m_b))
- [ ] Restitution (bounciness)
- [ ] Friction (Coulomb friction model)
- [ ] Multiple contact points per collision
- [ ] Iterative solver (resolve multiple collisions per step)
- [ ] 40+ tests (validate conservation of momentum, energy loss)

### Week 3: Integrator + Stability
- [ ] Verlet integration (position, velocity, angular velocity)
- [ ] Resting contact detection (objects stop jittering when stacked)
- [ ] Penetration slop (small overlaps allowed to prevent micro-corrections)
- [ ] Warm-starting (reuse impulses from previous frame for stability)
- [ ] 30+ tests (stack of boxes comes to rest, no tunneling)

### Week 4: Constraints
- [ ] Distance constraint (rope, spring)
- [ ] Revolute constraint (hinge)
- [ ] Prismatic constraint (slider)
- [ ] Constraint solver (Gauss-Seidel iteration)
- [ ] 30+ tests (constraints hold under load)

### Week 5: Broad-phase + World
- [ ] Spatial hash grid (partition space into cells)
- [ ] AABB broad-phase (only test bodies in nearby cells)
- [ ] PhysicsWorld API
- [ ] Collision layers/masks
- [ ] Sleep system (bodies at rest don't simulate)
- [ ] 40+ tests (world management, filtering)

### Week 6: Demos + Polish
- [ ] Physics Playground demo
- [ ] Retrofit Breakout
- [ ] Retrofit Platformer
- [ ] Performance profiling (measure step time vs body count)
- [ ] Documentation (tutorials, API reference)

**Total: ~200 tests, ~2000 LOC**

---

## Open Questions

### 1. Fixed Timestep vs Variable Timestep?

**Fixed timestep** (recommended):
```typescript
let accumulator = 0;
const fixedDt = 1 / 60; // 60 Hz physics

function update(dt: number) {
  accumulator += dt;
  while (accumulator >= fixedDt) {
    physicsWorld.step(fixedDt);
    accumulator -= fixedDt;
  }
  // Render with interpolation between previous and current state
}
```

**Pros**: Deterministic, stable, easier to debug
**Cons**: Need state interpolation for smooth rendering

**Variable timestep**:
```typescript
function update(dt: number) {
  physicsWorld.step(dt); // use actual frame delta
}
```

**Pros**: Simple
**Cons**: Non-deterministic, unstable at low frame rates, harder to reproduce bugs

**Recommendation**: Fixed timestep with state interpolation (industry standard for physics simulation)

---

### 2. Continuous Collision Detection (CCD)?

**Problem**: Fast-moving objects can tunnel through thin walls if they move >1 wall thickness per frame.

**Solution**: Swept collision tests (trace path between previous and current position)

**Implementation complexity**: High (need swept circle-vs-polygon, swept polygon-vs-polygon)

**Recommendation**: Defer to Phase 9.5 or Phase 10. Workaround: clamp max velocity or use thicker walls.

---

### 3. Trigger Volumes?

Non-collision zones that fire events when entered/exited (for level boundaries, damage zones, pickups).

**API:**
```typescript
const triggerId = physicsWorld.addTrigger({
  shape: { type: 'box', width: 10, height: 10 },
  position: { x: 0, y: 0 },
  layer: 0, // only detect bodies on matching layers
});

// In step result:
interface PhysicsStepResult {
  collisions: Collision[];
  triggerEvents: TriggerEvent[];
}

interface TriggerEvent {
  triggerId: string;
  bodyId: string;
  type: 'enter' | 'stay' | 'exit';
}
```

**Recommendation**: Include in Phase 9 (small addition, high value for gameplay)

---

### 4. Physics <-> State Sync Performance?

Syncing hundreds of body positions to/from state every frame could be slow (state diffs, observer notifications).

**Options:**
1. **Copy positions every frame** (simple, potentially slow)
2. **Physics owns positions, state references physics** (fast, but breaks state purity)
3. **Only sync dirty bodies** (track which bodies moved this frame)

**Recommendation**: Start with option 1 (simple), profile, optimize if >2ms

---

## Success Metrics

### Performance
- [ ] 500+ dynamic bodies at 60 FPS
- [ ] Physics step <5ms for 200 bodies (else migrate to Rust op)
- [ ] Zero frame rate dependency (fixed timestep)

### Stability
- [ ] Stack of 10 boxes comes to rest (no jitter)
- [ ] Constraints don't drift over time
- [ ] No explosions (bodies flying off at infinite velocity)

### Correctness
- [ ] Conservation of momentum (within 1% error)
- [ ] Energy loss matches restitution coefficient
- [ ] Friction prevents sliding on horizontal surfaces

### Usability
- [ ] Breakout physics code is <50 lines (simpler than current)
- [ ] Platformer physics code is <100 lines (simpler than current)
- [ ] Agent can query collision state (who is touching whom?)

---

## Migration Path to Rust (If Needed)

If profiling shows TypeScript physics is too slow (>5ms for 200 bodies):

### Option 1: Rust op for step
```rust
#[op2(fast)]
fn op_physics_step(
  #[serde] bodies: Vec<RigidBodyState>,
  dt: f64,
) -> Vec<PhysicsUpdate> {
  // Entire physics pipeline in Rust
  // Return position/rotation updates
}
```

**Pros**: Fastest, single FFI boundary
**Cons**: Loses inspect-ability, hard to debug

### Option 2: Rust ops for hot paths
```rust
#[op2(fast)]
fn op_collision_detect(
  #[serde] bodies: Vec<RigidBodyState>,
) -> Vec<Collision> {
  // Broad-phase + narrow-phase in Rust
}

#[op2(fast)]
fn op_collision_resolve(
  #[serde] bodies: Vec<RigidBodyState>,
  #[serde] collisions: Vec<Collision>,
  dt: f64,
) -> Vec<PhysicsUpdate> {
  // Impulse resolution in Rust
}
```

**Pros**: TypeScript orchestrates, Rust does heavy lifting, still inspectable
**Cons**: More FFI overhead

**Recommendation**: Option 2 (granular ops preserve some inspect-ability)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stacking is unstable (jitter) | High | High | Use industry-standard techniques (warm-starting, baumgarte stabilization) |
| Performance is insufficient | Medium | High | Profile early, migrate to Rust ops if needed |
| Feature parity takes too long | Medium | Medium | Ship MVP (circle + AABB only), add polygons in 9.5 |
| Breaks existing demos | Low | High | Write tests for Breakout/Platformer physics before refactor |
| Constraints drift over time | Medium | Medium | Iterative solver with sufficient iterations (8-10) |

---

## Alternatives Considered

### 1. Rapier Physics (Rust)
- Pure Rust 2D/3D physics engine
- Pros: Modern, fast, Rust-native
- Cons: Still FFI complexity, not TypeScript-inspectable
- Verdict: Same cons as Box2D, less mature

### 2. Matter.js (JavaScript)
- Pure JavaScript 2D physics
- Pros: Feature-complete, used in production (Phaser integration)
- Cons: External dependency, not written for V8, different API style
- Verdict: Could vendor/fork, but prefer owning the code

### 3. Planck.js (JavaScript Box2D port)
- Box2D ported to JavaScript
- Pros: Feature parity with Box2D, pure JS
- Cons: External dependency, large codebase (10k LOC)
- Verdict: Could vendor/fork, but prefer simpler custom implementation

**Final verdict**: Pure TypeScript custom implementation aligns best with Arcane philosophy.

---

## Phase 9.5: Physics Polish (Future)

If Phase 9 MVP is successful, Phase 9.5 can add:
- [ ] CCD (swept collision tests)
- [ ] Convex polygon support (currently circle + AABB only)
- [ ] Motor constraints (powered joints)
- [ ] Soft bodies (deformable objects)
- [ ] Particle-based fluids
- [ ] Cloth simulation
- [ ] Vehicle physics helpers (wheels, suspension)
