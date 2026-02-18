# Architecture

## The Two-Layer Cake

Arcane has two layers with a hard boundary between them:

1. **Game Logic Layer** (TypeScript) — what the agent writes
2. **Engine Core** (Rust) — what the engine provides

This isn't just a language split. It's a design philosophy: game logic must be testable without the engine. If your combat system needs a GPU to validate, something is wrong.

## Engine Core (Rust)

The Rust core owns everything performance-critical and platform-specific:

### Renderer (`core/renderer/`)
- wgpu-based 2D renderer
- Tile-based rendering with multiple layers, autotiling, animated tiles
- Sprite system with atlases, animation state machines, blend trees
- GPU geometry pipeline for colored shapes (circles, lines, polygons, arcs, capsules, rings)
- Custom shaders in WGSL, hot-reloadable, with typed parameter binding
- Post-processing: bloom, blur, vignette, CRT scanlines
- MSDF text rendering for resolution-independent text with outlines and shadows

#### Lighting System

Point lights, directional lights, and spot lights are sent per-frame from TS to the Rust renderer via the render bridge. The sprite shader samples lights in the fragment stage.

- **Point lights**: position, radius, color, intensity
- **Directional lights**: angle, color, intensity (infinite distance, parallel rays)
- **Spot lights**: position, angle, spread cone, range, color, intensity
- **Ambient light**: global RGB tint (default white = no darkening)

#### Global Illumination — Radiance Cascades

Arcane implements 2D global illumination using Radiance Cascades, a multi-scale ray-marching approach run as a GPU compute pipeline (`core/renderer/radiance.rs`, `shaders/radiance.wgsl`).

```
Pass 1 (seed):    Write emissive surfaces + occluders into probe grid
Pass 2 (cascade): Multi-scale ray march from fine to coarse (4 cascade levels)
Pass 3 (merge):   Merge cascade data into a final GI texture, sampled by sprites
```

TS controls:
- `enableGlobalIllumination()` / `disableGlobalIllumination()` — toggle
- `setGIQuality({ probeSpacing, interval, cascadeCount })` — quality vs performance
- `setGIIntensity(multiplier)` — brightness
- `addEmissive({ x, y, width, height, r, g, b, intensity })` — light sources
- `addOccluder({ x, y, width, height })` — shadow casters

#### MSDF Text Pipeline

MSDF (Multi-channel Signed Distance Field) text uses a custom fragment shader for resolution-independent rendering. Each MSDF font gets a pool of 8 shader instances (same WGSL, separate uniform buffers) so different `drawText()` calls in the same frame can have distinct outline/shadow parameters without overwriting each other. The pool is keyed per unique param combo and reset every frame.

- **Builtin font**: CP437 bitmap converted to SDF via `generate_builtin_msdf_font()`
- **External fonts**: Loaded via `loadMSDFFont(atlasPath, metricsJson)`, atlas uploaded with linear (not sRGB) texture format
- **Shader params** (per uniform buffer): slot 0 = SDF metrics, slots 1-2 = outline, slots 3-4 = shadow

#### Rendering Pipeline — Pass Order

The full per-frame GPU rendering pipeline executes in this order:

```
1. Radiance GI (compute)     — seed emissives/occluders, cascade ray-march, merge
2. Sprite batch (instanced)  — instanced quad rendering, sorted by layer + texture
3. Geometry batch (triangles) — colored triangles/lines, LoadOp::Load (overlay, no clear)
4. GI compose                — sample GI texture, additive blend onto scene
5. Post-process              — bloom, blur, vignette, CRT, custom effects
```

The geometry pipeline (`core/renderer/geometry.rs`, `shaders/geom.wgsl`) draws all shape primitives (circles, lines, triangles, arcs, sectors, ellipses, rings, capsules, polygons) as colored triangles via a dedicated `TriangleList` render pipeline. It shares the sprite pipeline's camera bind group and renders after the sprite batch using `LoadOp::Load` (overlay on top of sprites, no clear). Lines are expanded into quads (2 triangles) on the CPU side.

#### Particle Simulation (Rust-Native)

Particle simulation runs in Rust (`core/src/scripting/particle_ops.rs`) for performance. TS creates emitters via `op_create_emitter(configJSON)`, then each frame calls `op_update_emitter(id, dt, cx, cy)` which runs integration, spawning, and killing in Rust using xorshift32 RNG and semi-implicit Euler. TS reads back packed sprite data via `op_get_emitter_sprite_data(id)` and renders via `drawSprite()`. This eliminates the O(N) per-particle op-crossing overhead of the previous pure-TS simulation.

### Physics (`core/physics/`)
- Homebrew 2D rigid body physics (NOT feature-gated — runs headless too)
- Shapes: AABB, circle, convex polygon
- SAT collision detection, sequential impulse solver
- Distance and revolute joint constraints
- Sleep system, spatial hash broadphase
- Raycasts, AABB overlap queries

### Audio (`core/audio/`)
- Sound loading and playback via rodio
- Looping, per-sound volume, master volume
- Runs on a dedicated background thread

### Scripting (`core/scripting/`)
- V8 embedding via deno_core
- Script hot-reload (creates fresh V8 isolate on file change)
- FFI bridge between TS game logic and Rust systems
- Op files: `render_ops.rs` (sprites, camera, tilemap, lighting, audio), `physics_ops.rs` (bodies, constraints, queries), `geometry_ops.rs` (triangles, line segments via GeoState), `particle_ops.rs` (emitter lifecycle, simulation via ParticleState), `replay_ops.rs` (physics snapshots)

### Platform (`core/platform/`)
- Windowing (winit)
- Input handling (keyboard, mouse)

## TypeScript Runtime

The TypeScript runtime is where games are built. It runs in two modes:

1. **Hosted** — inside the Rust engine, with rendering and platform access
2. **Headless** — standalone in Node/Deno, no engine, for testing and tooling

### State (`runtime/state/`)
- State tree with typed schemas
- Transactions with diffs
- Query API for filtering and selecting entities
- Observation/subscription system

### Systems (`runtime/systems/`)
- Declarative system/rule definitions
- Composable recipes
- The `extend` pattern for customization

### Rendering Bridge (`runtime/rendering/`)
- Sprite control from game logic
- Visual effect triggers
- Camera control
- UI component tree

The bridge translates high-level TypeScript commands into renderer instructions:

```
TypeScript                          Rust
─────────                          ────
drawSprite({...})           →      Batch sprite draw
submitSpriteBatch(f32arr)   →      Bulk sprite submission (one op, N sprites)
drawCircle(x, y, r, color) →      Geometry pipeline: colored triangles
setCamera(x, y, zoom)      →      Update view matrix
addPointLight(x, y, ...)   →      Update light uniform
drawText(str, x, y, opts)  →      Emit text command
updateParticles(id, dt)     →      Rust-native particle simulation + packed readback
```

For performance-critical paths, bulk submission is available:
- **Bulk sprite submission** (`op_submit_sprite_batch`): all frame sprites packed into a `Float32Array` and submitted in one op call instead of N individual calls.
- **Bulk physics readback** (`getAllBodyStates()`): read all body states in one op call instead of N `getBodyState()` calls.

### Procedural Generation (`runtime/procgen/`)
- Wave Function Collapse (WFC) algorithm for tile-based level generation
- Configurable adjacency rules per tile (north/east/south/west neighbor lists)
- Constraint system: `reachability()`, `exactCount()`, `minCount()`, `maxCount()`, `border()`, `custom()`
- `validateLevel()` — run constraints against a generated grid
- `generateAndTest()` — retry generation until constraints pass or max attempts reached
- Seeded PRNG for deterministic generation

### Testing (`runtime/testing/`)
- Universal test harness (`describe`, `it`, `assert`) that runs in both Node and V8
- **Snapshot replay**: `startRecording()` / `stopRecording()` / `replay()` — record input sequences and replay them deterministically against physics or game state
- **Replay diffing**: `diffReplays()` — compare two replay sessions to find divergence points
- **Property-based testing**: `checkProperty()` / `assertProperty()` — generate random input sequences, test invariants across many runs, with automatic shrinking on failure
- **Generators**: `randomKeys()`, `randomClicks()`, `randomActions()`, `combineGenerators()` — composable input generators for property tests
- State snapshots for determinism verification

### Agent Protocol (`runtime/agent/`)
- `registerAgent()` installs `globalThis.__arcaneAgent` with `getState`, `setState`, `describe`, `listActions`, `executeAction`, `simulate`, `rewind`, `captureSnapshot`
- Rust evaluates TS expressions via `eval_to_string` to interact with the agent
- HTTP inspector (`--inspector <port>` on `arcane dev`) polls requests in the frame callback
- **MCP server** (`--mcp <port>` on `arcane dev`): JSON-RPC 2.0 protocol with 10 tools — `get_state`, `describe_state`, `list_actions`, `execute_action`, `inspect_scene`, `capture_snapshot`, `simulate_action`, `rewind_state`, `hot_reload`, `get_history`

## Directory Structure

```
arcane/
├── core/                    # Rust engine core
│   ├── renderer/            # wgpu-based 2D renderer
│   │   ├── mod.rs           # Renderer: GPU, sprites, textures, camera, lighting
│   │   ├── sprite.rs        # Instanced quad rendering + lighting
│   │   ├── geometry.rs      # GPU geometry batch: colored triangles/lines for shapes
│   │   ├── tilemap.rs       # Tile data, atlas UV, camera culling
│   │   ├── lighting.rs      # Point lights, ambient, GPU uniform
│   │   ├── radiance.rs      # Radiance Cascades 2D GI compute pipeline
│   │   ├── msdf.rs          # MSDF font atlas, glyph metrics, SDF shader
│   │   ├── shader.rs        # Custom WGSL fragment shaders, 16 vec4 uniforms
│   │   ├── postprocess.rs   # Bloom, blur, vignette, CRT effects
│   │   └── shaders/
│   │       ├── sprite.wgsl
│   │       ├── geom.wgsl    # Geometry pipeline vertex/fragment shader
│   │       ├── radiance.wgsl
│   │       └── msdf.wgsl
│   ├── audio/               # rodio-based sound loading + playback
│   ├── physics/             # Homebrew 2D rigid body physics
│   ├── agent/               # HTTP inspector + MCP server
│   ├── scripting/           # V8 embedding, hot-reload, render/physics/geometry/particle/replay ops
│   └── platform/            # Windowing (winit), input handling
│
├── runtime/                 # TypeScript game runtime
│   ├── state/               # State tree, transactions, queries, PRNG
│   ├── systems/             # Declarative system/rule definitions
│   ├── rendering/           # TS → Rust renderer bridge
│   │   ├── sprites.ts       # drawSprite(), clearSprites()
│   │   ├── camera.ts        # Camera control, follow, bounds, deadzone
│   │   ├── tilemap.ts       # Tilemaps, layers, auto-tiling
│   │   ├── lighting.ts      # Lights, GI, emissives, occluders, day/night
│   │   ├── text.ts          # Bitmap + MSDF text, outlines, shadows
│   │   ├── animation.ts     # Sprite animation, animation FSM
│   │   ├── audio.ts         # Sound loading, playback, music
│   │   └── postprocess.ts   # Post-processing effects
│   ├── ui/                  # Buttons, sliders, checkboxes, text input, layout
│   ├── physics/             # Physics world, body, constraint, query wrappers
│   ├── procgen/             # Wave Function Collapse, constraints, validation
│   ├── scenes/              # Scene stack, transitions, lifecycle
│   ├── persistence/         # Save/load, migrations, auto-save
│   ├── tweening/            # Tween, easing, sequence, parallel, stagger
│   ├── particles/           # Particle emitter with pooling
│   ├── pathfinding/         # A* pathfinding
│   ├── agent/               # Agent protocol, MCP tools, describe
│   └── testing/             # Harness, snapshots, replay, property-based testing
│
├── recipes/                 # Composable game system modules
│   ├── turn-based-combat/
│   ├── inventory-equipment/
│   ├── grid-movement/
│   └── fog-of-war/
│
├── cli/                     # The arcane CLI
│   └── commands/
│       ├── dev.rs           # arcane dev (window + game loop + hot-reload)
│       ├── test.rs          # arcane test (V8 headless test runner)
│       ├── describe.rs      # arcane describe (text state description)
│       ├── inspect.rs       # arcane inspect (query state paths)
│       ├── add.rs           # arcane add (copy recipe into project)
│       └── assets.rs        # arcane assets (discover + download assets)
│
└── demos/                   # Genre-spanning demo games
```

## The Rendering Bridge

Game logic never talks to the GPU directly. Instead, it issues high-level rendering commands that the Rust core translates into efficient draw calls.

```
TypeScript                          Rust
─────────                          ────
drawSprite({...})           →      Batch sprite draw
submitSpriteBatch(f32arr)   →      Bulk sprite submission (one op, N sprites)
drawCircle(x, y, r, color) →      Geometry pipeline: colored triangles
setCamera(x, y, zoom)      →      Update view matrix
addPointLight(x, y, ...)   →      Update light uniform
drawText(str, x, y, opts)  →      Emit text command
updateParticles(id, dt)     →      Rust particle simulation + packed readback
```

This separation means:
- Game logic is testable without a GPU
- The renderer can be optimized without changing game code
- Visual effects don't leak into game state

## Headless Mode

The critical design constraint: **everything the agent writes must be testable headless**, without the Rust engine running.

```typescript
import { createStore } from '@arcane/runtime/state'
import { seed, rollDice } from '@arcane/runtime/state'

// No engine. No GPU. No window. Just logic.
const store = createStore({
  player: { hp: 20, maxHp: 20, x: 5, y: 5 },
  rng: seed(42),
})

// Pure function: state in, state out
function takeDamage(state: typeof store.state, amount: number) {
  return { ...state, player: { ...state.player, hp: Math.max(0, state.player.hp - amount) } }
}
```

Game logic is pure functions over state. The engine core provides performance, not correctness.

## Dependency Choices

| Dependency | Purpose | Why |
|---|---|---|
| wgpu 24 | GPU rendering | Cross-platform (Vulkan, Metal, DX12, WebGPU) |
| deno_core 0.385 | V8 embedding | Solved Rust↔V8 FFI, performant data bridge |
| winit 0.30 | Windowing | Standard Rust windowing, cross-platform |
| rodio 0.20 | Audio | Sound loading, mixing, playback |
| image 0.25 | Texture loading | PNG/JPEG decoding |
| tiny_http 0.12 | Inspector/MCP | HTTP server for agent protocol |
| notify 7 | Hot-reload | File watching for `arcane dev` |

See [Technical Decisions](technical-decisions.md) for detailed rationale.
