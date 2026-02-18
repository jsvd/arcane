# Arcane — Agent Instructions

## What This Is

Arcane is a code-first, test-native, agent-native 2D game engine. Rust core for performance, TypeScript scripting for game logic.

**Current status: v0.12.2 — DX improvements. Unified Color API, particle presets, knockback, palette. 2110 TS (Node) + 2234 (V8) + 292 Rust tests passing. Next: Phase 26 (Atmosphere).**

## Repository Structure

```
arcane/
├── README.md                      — Vision, elevator pitch, quick overview
├── CLAUDE.md                      — You are here
├── CONTRIBUTING.md                — How to contribute (humans and agents)
├── LICENSE                        — Apache 2.0
├── Cargo.toml                     — Workspace root (core + cli)
├── .github/workflows/ci.yml      — CI: Node tests, Rust tests, V8 tests
├── docs/
│   ├── engineering-philosophy.md  — The Three Laws, development principles, code personality
│   ├── api-design.md              — LLM-friendly API rules, error design, naming
│   ├── glossary.md                — Canonical definitions for all terms
│   ├── architecture.md            — Two-layer design (Rust + TypeScript)
│   ├── world-authoring.md         — Code-defined scenes, worlds, tilemaps
│   ├── agent-tooling.md           — Claude Code agents, skills, MCP tools
│   ├── development-workflow.md    — Parallel dev, model selection, worktrees
│   ├── roadmap.md                 — Phased development plan
│   ├── technical-decisions.md     — ADR-style decision log
│   ├── documentation-refresh.md   — Checklist for auditing and refreshing all docs
│   ├── asset-management.md        — `arcane assets` CLI docs (search, download, catalog)
│   ├── publishing-guide.md        — crates.io release process and checklist
│   ├── recipe-guide.md            — Building reusable game systems with system()/rule()
│   └── testing-hot-reload.md      — Hot-reload implementation details and debugging
├── core/                          — arcane-core lib crate
│   ├── Cargo.toml                 — Feature-gated: `renderer` (default on)
│   ├── src/
│   │   ├── lib.rs
│   │   ├── scripting/
│   │   │   ├── mod.rs             — Public API: TsModuleLoader, ArcaneRuntime, run_test_file
│   │   │   ├── module_loader.rs   — TsModuleLoader: TS transpilation via deno_ast
│   │   │   ├── runtime.rs         — ArcaneRuntime: V8 + module loader + crypto polyfill
│   │   │   ├── test_runner.rs     — V8 test runner with #[op2] result reporting
│   │   │   ├── render_ops.rs      — #[op2] ops: sprites, camera, tilemap, lighting, input, audio, font, viewport
│   │   │   ├── replay_ops.rs     — #[op2] ops: physics snapshot, recording, replay
│   │   │   └── physics_ops.rs    — #[op2] ops: physics world, bodies, constraints, queries (NOT feature-gated)
│   │   ├── physics/               — Homebrew rigid body physics (NOT feature-gated)
│   │   │   ├── mod.rs             — Module declarations
│   │   │   ├── types.rs           — RigidBody, Shape, Material, Contact, Constraint
│   │   │   ├── integrate.rs       — Semi-implicit Euler integration
│   │   │   ├── broadphase.rs      — Spatial hash grid
│   │   │   ├── narrowphase.rs     — SAT collision detection (all shape pairs)
│   │   │   ├── resolve.rs         — Sequential impulse solver
│   │   │   ├── constraints.rs     — Distance + revolute joint solving
│   │   │   ├── sleep.rs           — Sleep system (velocity threshold + timer)
│   │   │   └── world.rs           — PhysicsWorld: fixed timestep, body storage, queries, raycast
│   │   ├── renderer/              — [feature = "renderer"]
│   │   │   ├── mod.rs             — Renderer: owns GPU, sprite pipeline, textures, lighting
│   │   │   ├── gpu.rs             — GpuContext: wgpu device/surface/pipeline setup
│   │   │   ├── sprite.rs          — SpritePipeline: instanced quad rendering + lighting
│   │   │   ├── texture.rs         — TextureStore: handle-based texture loading + raw upload
│   │   │   ├── camera.rs          — Camera2D: position, zoom, view/proj matrix
│   │   │   ├── tilemap.rs         — Tilemap + TilemapStore: tile data, atlas UV, camera culling
│   │   │   ├── lighting.rs        — LightingState, PointLight, LightingUniform for GPU
│   │   │   ├── msdf.rs              — MSDF font atlas, glyph metrics, SDF shader pipeline
│   │   │   ├── radiance.rs          — Radiance Cascades 2D GI compute pipeline
│   │   │   ├── shader.rs            — ShaderStore: custom WGSL fragment shaders, 16 vec4 uniforms
│   │   │   ├── postprocess.rs       — PostProcessPipeline: offscreen targets, bloom/blur/vignette/CRT
│   │   │   ├── font.rs            — CP437 8×8 bitmap font data, generate_builtin_font()
│   │   │   └── shaders/
│   │   │       ├── sprite.wgsl    — Instanced sprite shader with lighting (3 bind groups)
│   │   │       ├── radiance.wgsl    — GI compute shader (3-pass)
│   │   │       └── msdf.wgsl        — MSDF distance field text fragment shader
│   │   ├── platform/              — [feature = "renderer"]
│   │   │   ├── mod.rs             — Platform public API
│   │   │   ├── window.rs          — winit ApplicationHandler + event loop
│   │   │   └── input.rs           — Keyboard/mouse state tracking
│   │   └── agent/                 — [feature = "renderer"]
│   │       ├── mod.rs             — InspectorRequest/Response types, channel types
│   │       └── inspector.rs       — tiny_http HTTP server on background thread
│   │   └── audio/                 — [feature = "renderer"]
│   │       └── mod.rs             — AudioCommand, audio_channel(), start_audio_thread() (rodio)
│   └── tests/                     — Rust integration tests
├── cli/                           — arcane-engine bin crate
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                — clap CLI entrypoint
│       └── commands/
│           ├── mod.rs
│           ├── test.rs            — `arcane test` — discovers & runs *.test.ts in V8
│           ├── dev.rs             — `arcane dev` — window + game loop + hot-reload + inspector + audio
│           ├── describe.rs        — `arcane describe` — text description of game state
│           ├── inspect.rs         — `arcane inspect` — query specific state paths
│           ├── add.rs             — `arcane add` — copy recipe into project
│           └── assets.rs          — `arcane assets` — discover and download game assets
├── assets/
│   └── catalog.json               — Kenney.nl asset catalog (25 packs + synonyms)
├── runtime/
│   ├── testing/
│   │   ├── harness.ts             — Universal test harness (Node + V8)
│   │   ├── replay.ts              — startRecording, stopRecording, replay, diffReplays
│   │   ├── snapshot.ts            — World snapshot capture/compare for determinism testing
│   │   ├── property.ts            — checkProperty, assertProperty, shrinking, generators
│   │   └── index.ts               — Testing barrel export
│   ├── procgen/
│   │   ├── types.ts               — TileId, WFCOptions, Constraint, WFCResult
│   │   ├── wfc.ts                 — Wave Function Collapse algorithm
│   │   ├── constraints.ts         — reachability, exactCount, minCount, maxCount, border
│   │   ├── validate.ts            — validateLevel, generateAndTest
│   │   └── index.ts               — Barrel export
│   ├── state/
│   │   ├── types.ts               — EntityId, Vec2, DeepReadonly
│   │   ├── error.ts               — ArcaneError, createError()
│   │   ├── prng.ts                — PRNGState, seed(), rollDice(), xoshiro128**
│   │   ├── transaction.ts         — Mutation, Diff, transaction(), computeDiff()
│   │   ├── query.ts               — query(), get(), has(), filter combinators
│   │   ├── observe.ts             — ObserverRegistry, path pattern matching
│   │   ├── store.ts               — GameStore, createStore()
│   │   └── index.ts               — Public API barrel export
│   ├── physics/
│   │   ├── aabb.ts                — AABB type, aabbOverlap(), circleAABBOverlap/Resolve()
│   │   ├── types.ts               — BodyId, BodyDef, ShapeDef, MaterialDef, BodyState, Contact, RayHit
│   │   ├── world.ts               — createPhysicsWorld(), stepPhysics(), destroyPhysicsWorld()
│   │   ├── body.ts                — createBody(), removeBody(), getBodyState(), setBodyVelocity(), applyForce/Impulse()
│   │   ├── constraints.ts         — createDistanceJoint(), createRevoluteJoint(), removeConstraint()
│   │   ├── query.ts               — queryAABB(), raycast(), getContacts()
│   │   └── index.ts               — Barrel export (aabb helpers + physics engine API)
│   ├── rendering/
│   │   ├── types.ts               — TextureId, SpriteOptions, CameraState, TilemapId
│   │   ├── sprites.ts             — drawSprite(), clearSprites()
│   │   ├── camera.ts              — setCamera(), getCamera(), followTarget(), followTargetSmooth(), setCameraBounds(), setCameraDeadzone(), zoomTo(), zoomToPoint()
│   │   ├── parallax.ts            — drawParallaxSprite() multi-layer depth scrolling
│   │   ├── autotile.ts            — 4-bit/8-bit bitmask auto-tiling
│   │   ├── animation-fsm.ts       — Animation state machine (states, transitions, blending)
│   │   ├── input.ts               — isKeyDown(), isKeyPressed(), getMousePosition()
│   │   ├── tilemap.ts             — createTilemap(), setTile(), getTile(), drawTilemap()
│   │   ├── lighting.ts            — setAmbientLight(), addPointLight(), clearLights()
│   │   ├── texture.ts             — loadTexture(), createSolidTexture()
│   │   ├── loop.ts                — onFrame(), getDeltaTime()
│   │   ├── text.ts                — drawText(), measureText(), loadFont(), getDefaultFont(), MSDF font support
│   │   ├── animation.ts           — createAnimation(), updateAnimation(), drawAnimatedSprite()
│   │   ├── audio.ts               — loadSound(), playSound(), playMusic(), stopSound(), setVolume(), instance-based playback, spatial audio, bus mixing, crossfade, pooling
│   │   └── index.ts               — Barrel export
│   ├── ui/
│   │   ├── types.ts               — Color, RectOptions, PanelOptions, BarOptions, LabelOptions
│   │   ├── primitives.ts          — drawRect(), drawPanel(), drawBar(), drawLabel()
│   │   ├── button.ts              — createButton(), updateButton(), drawButton()
│   │   ├── toggle.ts              — createCheckbox(), createRadioGroup(), updateCheckbox(), updateRadioGroup()
│   │   ├── slider.ts              — createSlider(), updateSlider(), drawSlider()
│   │   ├── text-input.ts          — createTextInput(), updateTextInput(), drawTextInput()
│   │   ├── layout.ts              — verticalStack(), horizontalRow(), anchorTo()
│   │   ├── focus.ts               — createFocusManager(), updateFocus(), tab navigation
│   │   └── index.ts               — Barrel export
│   ├── pathfinding/
│   │   ├── types.ts               — PathGrid, PathOptions, PathResult
│   │   ├── astar.ts               — findPath() A* with binary min-heap
│   │   └── index.ts               — Barrel export
│   ├── systems/
│   │   ├── types.ts               — Rule, SystemDef, RuleResult, ExtendOptions
│   │   ├── system.ts              — system(), rule(), applyRule(), extend()
│   │   └── index.ts               — Barrel export
│   ├── scenes/
│   │   ├── types.ts               — SceneContext, SceneDef, SceneInstance, TransitionConfig
│   │   ├── scene.ts               — createScene(), pushScene(), popScene(), replaceScene(), startSceneManager()
│   │   └── index.ts               — Barrel export
│   ├── persistence/
│   │   ├── types.ts               — SaveMetadata, SaveFile, Migration, StorageBackend
│   │   ├── storage.ts             — createMemoryStorage(), createFileStorage()
│   │   ├── save.ts                — serialize(), deserialize(), saveGame(), loadGame(), migrations
│   │   ├── autosave.ts            — enableAutoSave(), updateAutoSave(), triggerAutoSave()
│   │   └── index.ts               — Barrel export
│   ├── agent/
│   │   ├── types.ts               — AgentConfig, ActionInfo, DescribeOptions, etc.
│   │   ├── protocol.ts            — registerAgent(), AgentProtocol on globalThis
│   │   ├── describe.ts            — Default text description renderer (minimal/normal/detailed)
│   │   ├── mcp.ts                 — MCP tool definitions, request builders
│   │   ├── index.ts               — Barrel export
│   │   └── agent.test.ts          — Agent protocol tests (~37 tests)
│   └── game/
│       ├── types.ts               — Convenience layer type definitions
│       ├── color-sprite.ts        — drawColorSprite() with auto-cached textures
│       ├── hud.ts                 — hud.text(), hud.bar(), hud.label() shortcuts
│       ├── widgets.ts             — captureInput(), autoUpdate* widget helpers
│       ├── collision.ts           — Collision event registry + callbacks
│       ├── entity.ts              — Lightweight entity handles (sprite+physics)
│       ├── game.ts                — createGame() bootstrap
│       └── index.ts               — Barrel export
├── demos/
│   ├── agent-testing/             — Phase 17 demo: MCP tools, snapshot replay, property testing
│   ├── asteroids/                 — Phase 8 demo: rotation, flip, opacity, blend modes, CRT post-processing
│   ├── bfrpg-crawler/             — Phase 6 demo: BFRPG dungeon crawler with character creation, combat, AI
│   ├── breakout/                  — Phase 2b demo: real-time arcade (paddle, ball, bricks)
│   ├── card-battler/              — Phase 1 demo: card game
│   ├── character-controller/     — Phase 15 demo: animation state machine + blending
│   ├── hello-world/               — Minimal starter: sprite + text
│   ├── isometric-dungeon/        — Isometric 2.5D: coordinate transforms, depth sorting, pathfinding
│   ├── juice-showcase/            — Phase 9 demo: tweening, particles, camera shake
│   ├── lighting-showcase/         — Phase 19 demo: point/directional/spot lights, GI, day/night
│   ├── menu-flow/                 — Phase 10 demo: scene management, save/load, menu flow
│   ├── msdf-text-showcase/        — MSDF text rendering: outlines, shadows, crisp scaling
│   ├── parallax-scroller/        — Phase 13 demo: parallax scrolling + camera features
│   ├── physics-playground/        — Phase 11 demo: rigid body physics sandbox
│   ├── platformer/                — Phase 4 demo: gravity, platforms, coins, text HUD, UI bars
│   ├── roguelike/                 — Phase 2b demo: procedural dungeon, FOV, fog of war
│   ├── sokoban/                   — Phase 1 demo: grid puzzle + Phase 2a visual demo
│   ├── sprite-demo/               — Phase 5.5 demo: asset loading validation with sprite sheet + sound
│   ├── tilemap-showcase/         — Phase 14 demo: layers, auto-tiling, animated tiles
│   ├── tower-defense/             — Phase 5 demo: tower placement, enemy waves, pathfinding
│   ├── ui-showcase/              — Phase 16 demo: interactive UI widgets
│   ├── wfc-dungeon/               — Phase 18 demo: WFC procedural dungeon generation
│   └── audio-showcase/            — Phase 20 demo: spatial audio, crossfade, mixer panel
├── recipes/
│   ├── turn-based-combat/         — Initiative, attack/defend, victory detection
│   ├── inventory-equipment/       — Items, stacking, weight, equipment slots, stat bonuses
│   ├── grid-movement/             — Grid entity movement, pathfinding integration
│   └── fog-of-war/                — 8-octant shadowcasting FOV, visibility states
├── templates/
│   └── default/                   — Scaffolded project template (AGENTS.md, docs/, types/)
├── scripts/
│   └── generate-declarations.sh   — Generates per-module .d.ts files from runtime source JSDoc
```

## Conventions

### Design Documents
- Write clearly and concisely. Prefer examples over explanation.
- Include TypeScript code examples for any API design.
- Use ASCII diagrams, not images.
- Every design claim should be consistent across all documents. If you change the architecture in one doc, update all others.
- ADRs in `technical-decisions.md` follow the format: Context → Options → Decision → Rationale.

### Cross-References
- Link between documents using relative paths: `[Architecture](architecture.md)`
- When a concept is defined in one doc and referenced in another, link to the definition.

### Code Examples
- All TypeScript examples should be valid, readable, and illustrate the actual intended API.
- Use realistic game scenarios (BFRPG RPG examples preferred).
- Show both the "what" (API usage) and the "why" (what problem it solves).

## Engineering Philosophy

Read `docs/engineering-philosophy.md` first. It governs everything else.

**The Three Laws** (in priority order):
1. **Is it correct?** — Verified by tests, not inspection.
2. **Is it clear?** — Readable by a human or agent six months from now.
3. **Is it minimal?** — The least code/complexity that achieves correctness and clarity.

**Definition of Done**: It works, it's tested, it's consistent, it's documented, it's reviewed.

**Acceptance criteria before implementation**: Write what "done" looks like before writing code. Write the tests (or test signatures) before the implementation.

## Key Design Principles

1. **Code-is-the-scene** — No visual editor. Scenes are TypeScript code.
2. **Game-is-a-database** — State is queryable, transactional, observable.
3. **Testing-first** — Game logic runs headless. Tests are instant.
4. **Agent-native** — Built-in protocol for AI agent interaction.
5. **Explicit over implicit** — No hidden state, no singletons, no magic strings.
6. **Functional core** — State in, state out. Pure functions for game logic.

## Current Constraints (Phase 6)

- TypeScript code lives under `runtime/`. Rust code under `core/` and `cli/`.
- TS runtime has zero external dependencies. Rust crates use deno_core, deno_ast, clap, tokio, anyhow, wgpu, winit, image, bytemuck, notify, tiny_http, rodio.
- All state management functions are pure: state in, state out.
- TS files use `.ts` extension imports (no bundler).
- Test files import from `runtime/testing/harness.ts` (not `node:test`/`node:assert` directly).
- Tests must pass in both Node (`./run-tests.sh`) and V8 (`cargo run -- test`).
- Pin exact versions of deno_core and deno_ast to avoid API churn.
- Renderer is behind `renderer` Cargo feature (default on). Headless: `--no-default-features`.
- Rendering API functions are no-ops in headless mode (safe to import anywhere).
- `arcane dev <entry.ts>` opens a window with hot-reload. `arcane test` stays headless.
- `arcane describe <entry.ts>` prints text description. `arcane inspect <entry.ts> <path>` queries state.
- Agent protocol: games call `registerAgent()` to install `globalThis.__arcaneAgent`. Rust evals TS to interact.
- HTTP inspector (`--inspector <port>` on dev): channel-based, polls requests in frame callback.

## Maintaining API Declarations

After changing any public API in `runtime/`, run `scripts/generate-declarations.sh` and commit the updated `templates/default/types/*.d.ts` files. These per-module declaration files ship with scaffolded projects and are the primary API reference for LLMs.

## Documentation Refresh

After phase completions or significant changes, run the documentation refresh checklist in [docs/documentation-refresh.md](docs/documentation-refresh.md). It covers auditing `docs/`, verifying user-facing READMEs, updating the scaffolding template (AGENTS.md, topic guides, per-module types/*.d.ts), and fixing stale test counts, demo lists, and cross-references.

## Agent Tooling

See `docs/agent-tooling.md` for the full specification of agents, skills, and MCP tools used to develop Arcane. The tooling set evolves with the project — review it at each phase transition.

### Agent Teams

Arcane supports coordinated multi-session development via agent teams. See `docs/development-workflow.md` for the full workflow (when to use teams vs subagents vs worktrees, task sizing, model selection). Teammates read this file automatically and should follow all conventions above. **File ownership discipline is critical in team mode** — each teammate owns distinct files, no two teammates edit the same file simultaneously.
