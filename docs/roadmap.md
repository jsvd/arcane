# Roadmap

## The Bootstrap Philosophy

Arcane is built by AI agents. The engine is the proof of concept. If an agent-native game engine can't be built by an agent, it's not agent-native enough.

1. Human architect writes design documents
2. Claude builds core runtime (state management, transactions, event loop)
3. Claude builds first renderer
4. Claude builds test framework integration
5. Claude builds core engine features (text, UI, animation, audio)
6. Claude builds game system recipes
7. Claude builds mini-game demos across genres — each validates new capabilities
8. Claude builds showcase game (BFRPG RPG)
9. Claude ships it (open source launch)
10. Demos and showcase surface pain points. Fix. Iterate.

## Original Genre Validation Demos

The engine must serve the breadth of 2D games, not just RPGs. These initial demos were built at the phase where their prerequisites landed. Many additional demos (parallax-scroller, tilemap-showcase, character-controller, ui-showcase, physics-playground, asteroids, juice-showcase, lighting-showcase, wfc-dungeon, audio-showcase, isometric-dungeon, visual-polish, hex-strategy, gamepad-platformer, agent-testing) were added in later phases.

| Demo | Phase | Genre | What It Validates |
|---|---|---|---|
| **Sokoban** | 1 | Puzzle | State + transactions, undo/redo via replaceState, win detection |
| **Card Battler** | 1 | Card game | Non-entity state shapes (deck/hand/discard zones), PRNG shuffle |
| **Roguelike** | 2 | Roguelike | Procedural generation, tile rendering, fog of war |
| **Breakout** | 2 | Action | Real-time loop, collision, physics, frame-rate independence |
| **Platformer** | 4 | Platformer | Sprite animation, audio, text/UI rendering, gravity physics |
| **Tower Defense** | 5 | Strategy | Spatial queries, pathfinding, entity waves, spawn/despawn |
| **BFRPG RPG** | 6 | RPG | Full integration: combat, inventory, dialogue, save/load |

---

## Completed Phases (0-27)

### Phase 0: Design Documents
**Status: COMPLETE** — Vision, architecture, agent protocol, state management, systems/recipes, world authoring specs. CLAUDE.md for agent instructions.

### Phase 1: TypeScript Runtime + Headless Game Logic
**Status: COMPLETE** — State management, transactions, queries, diffs, PRNG, observation system. Demos: Sokoban, Card Battler. 160 tests.

### Phase 1.5: Rust Skeleton + Bridge
**Status: COMPLETE** — Cargo workspace (core, cli), V8/deno_core embedding, `arcane test` CLI, universal test harness (Node + V8 dual-mode).

### Phase 2a: Window + Sprites + Camera + Dev Command
**Status: COMPLETE** — wgpu/winit, instanced sprite renderer, camera system, rendering bridge via `#[op2]` ops, `arcane dev` with hot-reload, feature-gated renderer.

### Phase 2b: Tilemap + Lighting + More Demos
**Status: COMPLETE** — Tilemap renderer, 2D lighting (ambient + 8 point lights), AABB/circle collision. Demos: Breakout, Roguelike (BSP dungeon, shadowcasting FOV).

### Phase 3: Agent Protocol + CLI
**Status: COMPLETE** — Agent protocol (`runtime/agent/`), `arcane describe`, `arcane inspect`, HTTP inspector API, text description renderer, error snapshots. 264 TS + 35 Rust tests.

### Phase 4: Text, UI, Animation, Audio
**Status: COMPLETE** — Text rendering (CP437 bitmap), UI primitives, sprite animation, A* pathfinding, audio (rodio backend). Demo: Platformer. 327 TS + 38 Rust tests.

### Phase 5: Recipes + Tower Defense
**Status: COMPLETE** — Recipe framework (`system()`, `rule()`, `extend()`), 4 recipes (turn-based-combat, inventory-equipment, grid-movement, fog-of-war), `arcane add` CLI. Demo: Tower Defense. 472 TS tests.

### Phase 5.5: Asset Validation
**Status: COMPLETE** — Real asset loading with sprite sheets and sounds. Demo: Sprite Demo.

### Phase 6: Showcase Game (BFRPG RPG)
**Status: COMPLETE** — BFRPG v4 dungeon crawler: character creation, d20 combat, BSP dungeons, monster AI with A* pathfinding, equipment, fog of war. 657 TS + 38 Rust tests.

### Phase 7: Open Source Launch
**Status: COMPLETE** — Package structure, scaffolding, `arcane init`, docs (getting started, tutorials, API reference), community setup, published to npm + crates.io.

### Phase 8: Polish & Stability
**Status: COMPLETE** — Hot-reload fix, TypeScript type errors fixed, 175 Rust tests (exceeded 60+ target), demo polish.

### Phase 9: Tweening + Particles
**Status: COMPLETE** — Tweening system (30 easing functions, chains, callbacks), particle system (emitters, affectors, pooling), camera shake, screen flash. Demo: Juice Showcase. 132 new tests.

### Phase 9.5: LLM-Assisted Game Dev + Standalone Install
**Status: COMPLETE** — `cargo install arcane-cli`, embedded templates/recipes, type declarations generation, `arcane assets` CLI (list/search/download). 1022 TS + 79 Rust tests.

### Phase 10: Scene Management + Save/Load
**Status: COMPLETE** — Scene system (stack, transitions, lifecycle hooks), save/load (slots, auto-save, migrations), file I/O ops. Demo: Menu Flow. 110 new tests.

### Phase 11: Physics System
**Status: COMPLETE** — Homebrew Rust physics (rigid bodies, SAT collision, sequential impulse solver, constraints, sleep). Demo: Physics Playground. 77 Rust + 40 TS physics tests.

### Phase 12: Sprite Transforms + Rendering Polish
**Status: COMPLETE** — Rotation, pivot, flip, opacity, blend modes (additive/multiply/screen), custom WGSL shaders, post-processing (bloom/blur/vignette/CRT). Demo: Asteroids.

### Phase 13: Camera Polish
**Status: COMPLETE** — Camera bounds/limits, deadzone, smooth follow (exponential lerp), smooth zoom, parallax scrolling. Demo: Parallax Scroller. 17+ new tests.

### Phase 14: Tilemap Polish
**Status: COMPLETE** — Multiple layers, auto-tiling (4-bit/8-bit bitmask), animated tiles, tile properties. Demo: Tilemap Showcase. 59 new tests.

### Phase 15: Animation Polish
**Status: COMPLETE** — Animation FSM (states, transitions, conditions), crossfade blending, frame events. Demo: Character Controller. 61 new tests.

### Phase 16: Interactive UI
**Status: COMPLETE** — Buttons, checkboxes, radio groups, sliders, text input, layout helpers, focus/tab navigation. Demo: UI Showcase. 162 new tests.

### Phase 17: Agent Intelligence
**Status: COMPLETE** — MCP server (10 tools via JSON-RPC 2.0), snapshot-replay testing, property-based testing with shrinking. Demo: Agent Testing Showcase. 96+ tests.

### Phase 18: Procedural Generation
**Status: COMPLETE** — Wave Function Collapse with backtracking, constraint system (reachability, counts, border), `generateAndTest()`. Demo: WFC Dungeon. 60 tests.

### Phase 19: Lighting 2.0
**Status: COMPLETE** — Radiance Cascades 2D GI (wgpu compute shader), emissive surfaces, occluders, directional/spot lights, color temperature presets, day/night cycle. Demo: Lighting Showcase. 36 tests.

### Phase 20: Audio Polish
**Status: COMPLETE** — Instance-based playback, spatial audio (SpatialSink), audio mixer (4 buses), crossfade, pitch variation, pooling. Demo: Audio Showcase. 44 tests.

### Phase 21: MCP-First Developer Experience
**Status: COMPLETE** — MCP always-on in `arcane dev` (port 4322), `arcane mcp` stdio bridge with auto-discovery/auto-launch, template MCP configs for Claude Code/Cursor/VS Code.

### Phase 22: Visual Polish Foundations
**Status: COMPLETE** — Screen transitions (fade, wipe, iris, diamond, pixelate), nine-slice sprites, trail/ribbon renderer, sprite shadows.

### Phase 23: Juice & Game Feel
**Status: COMPLETE** — Impact combinator (hitstop + shake + flash), floating text/damage numbers, typewriter text. Demo: Visual Polish.

### Phase 24: Isometric & Hex Grids
**Status: COMPLETE** — Diamond isometric projection, cube hex coordinates, iso/hex tilemap renderers, hex A* pathfinding, flood-fill reachable. Demos: Isometric Dungeon, Hex Strategy. 180 tests.

### Phase 25: Input Systems
**Status: COMPLETE** — Gamepad support (gilrs), multi-touch (up to 10), input action mapping with rebinding/buffering. Demo: Gamepad Platformer. 78 tests.

### Phase 26: Performance & Architecture
**Status: COMPLETE** — GPU geometry pipeline, Rust-native particle simulation, bulk sprite/physics submission, transform hierarchy, component index, text layout (wrapping/alignment), async asset loading. Demo: Shapes Showcase.

### Phase 27: SpriteAtlas Runtime & Agentic Assets
**Status: COMPLETE** — SpriteAtlas runtime with UV normalization and tag queries, placeholder sprite system for rapid prototyping, `/sprite` skill with visual selector workflow, removed `arcane assets` CLI in favor of agentic skills. Asset handling is now fully code-first and agent-native.

### Phase 28: Shader Authoring Experience
**Status: COMPLETE** — Auto-injected built-in uniforms (time, delta, resolution, mouse), named uniform API (`createShader` + `setShaderUniform`), 8 effect preset factories (outline, flash, dissolve, pixelate, hologram, water, glow, grayscale). Demo: Shader Showcase.

---

## Backlog

### Atmosphere

**Status: Backlog**

Managed subsystem features — the engine owns a particle emitter or post-process pass, the caller gets a one-liner. Lower priority than juice (genre-specific rather than universal) but compounds beautifully. Sidescrollers, RPGs, and overworlds benefit most.

### Deliverables
- [ ] **Weather system** (`runtime/rendering/weather.ts`)
  - [ ] `setWeather(type, { intensity, wind, color })` — rain, snow, fog, leaves
  - [ ] Internally: managed particle emitter + optional ambient light shift + optional post-process overlay
  - [ ] `clearWeather()` — fade out current weather
  - [ ] Integrates with camera (particles move with/against camera)
  - [ ] Exposable as MCP tool for agent-driven atmosphere iteration
- [ ] **Water / reflection strip** (`runtime/rendering/water.ts`, `core/src/renderer/postprocess.rs`)
  - [ ] `drawReflection(waterY, { distortion, opacity, tint })` — horizontal reflection below waterline
  - [ ] Post-process: sample upper half, flip vertically, apply sine-wave UV distortion
  - [ ] Optional animated distortion (wave speed/amplitude)
  - [ ] Source parameter designed to accept GI buffer later (forward-compatible with Radiance Cascades)
- [ ] **Sprite stacking** (`runtime/rendering/stacking.ts`)
  - [ ] `drawStackedSprite(slices, x, y, { angle, elevation, spacing })` — fake 3D from stacked horizontal slices
  - [ ] Rotation applies per-layer offset for convincing pseudo-3D effect
  - [ ] Most niche feature but visually dramatic — great for demos and marketing
  - [ ] Self-contained, no dependencies on other Phase 26 features
- [ ] **Demo: Atmosphere Showcase** (`demos/atmosphere/`)
  - [ ] Rainy village scene with puddle reflections
  - [ ] Snowy forest with fog overlay
  - [ ] Sprite-stacked buildings/props rotating on mouse
  - [ ] Day/night cycle (Phase 19 lighting) + weather transitions

### Success Criteria
- [ ] Weather effects don't impact performance (< 1ms per frame at max intensity)
- [ ] Reflection strip looks convincing with animated distortion
- [ ] Sprite stacking produces dramatic pseudo-3D from simple slice sprites
- [ ] Weather + lighting compose naturally (rain darkens ambient, torch flicker in fog)
- [ ] 40+ tests for atmosphere features
- [ ] Demo showcases weather/reflection/stacking in an integrated scene

---

### Community Building

**Status: Backlog**

Focus on adoption, ecosystem growth, and documentation polish. Can run in parallel with engineering phases.

### Deliverables
- [ ] **Announcements**
  - [ ] Show HN post with demo links
  - [ ] Reddit posts (r/gamedev, r/programming, r/rust, r/typescript)
  - [ ] Twitter/X thread with feature highlights
  - [ ] Blog post: "Building an AI-Native Game Engine"
- [ ] **Community Channels**
  - [ ] Discord server setup (channels: general, showcase, recipes, support)
  - [ ] GitHub Discussions enabled
  - [ ] Community guidelines and moderation
- [ ] **Content Creation**
  - [ ] Video walkthrough: "Build Your First Game with Arcane"
  - [ ] Blog series: deep dives into architecture decisions
  - [ ] Tutorial videos for each recipe
  - [ ] Showcase community-built games
- [ ] **Community Engagement**
  - [ ] Respond to GitHub issues within 48h
  - [ ] Review and merge community PRs
  - [ ] Featured game of the week on Discord
  - [ ] Monthly community calls (share roadmap, demo new features)
- [ ] **Documentation Improvements**
  - [ ] FAQ based on common questions
  - [ ] Troubleshooting guide
  - [ ] Migration guides (version upgrades)
  - [ ] Performance optimization guide

### Success Criteria
- [ ] 100+ GitHub stars in first month
- [ ] 10+ community members in Discord
- [ ] 3+ community-contributed recipes
- [ ] 5+ games built by community (not just demos)
- [ ] Active discussion on GitHub/Discord
- [ ] Positive sentiment in announcements (upvotes, comments)

---

## Performance Optimization (When Triggered)

Not a phase — a standing item. All computationally non-trivial algorithms currently live in TypeScript and perform well within budget through Phase 7. V8 JITs typed arrays to near-native speed, and algorithmic improvements (spatial hashing) should always precede language migration.

**Migration triggers** (profile first, then act):

| Algorithm | Trigger | Action |
|---|---|---|
| A* pathfinding | Single call > 2ms | Move to `op_find_path` Rust op |
| AABB collision | Per-frame checks > 1ms at >2k entities | Spatial hash grid (TS) first, then Rust broad-phase |
| FOV shadowcasting | Radius >20, > 2ms | Move to Rust op |
| State diffing | >50k leaf nodes, > 3ms | Move `computeDiff` to Rust |

The migration strategy preserves existing TS function signatures — game code never changes. Rust ops are transparent fast-paths guarded by `hasRenderOps`, with TS as headless fallback. See detailed analysis and Rust op API designs in project memory (`performance-migration.md`).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| TS-Rust bridge is too slow | Medium | High | deno_core has solved most of this; profile early |
| "Good enough" with Phaser + existing tools | Medium | High | Focus on agent DX that no existing tool provides |
| Godot/Unity add first-class agent support | Low | High | Move fast; the architecture advantage is structural |
| Vision-capable agents close the gap | Medium | Medium | Text interaction will always be faster than visual |
| Recipe ecosystem doesn't materialize | Medium | Medium | Build enough first-party recipes to be self-sufficient |
| Scope creep into 3D | High | Medium | Resist. 2D only. The constraint is the feature. |

---

## Known Limitations & Backlog

Items discovered during development that don't block current work but should be addressed.

### Test Coverage Gaps

**Status:** Open
**Severity:** Low — all code works, just lacks dedicated test files

18 runtime modules have no dedicated `*.test.ts` file:
- `runtime/physics/` — world, body, constraints, query (6 files — aabb.test.ts now exists)
- `runtime/persistence/` — save, storage, autosave (3 files)
- `runtime/rendering/` — sprites, loop, texture, postprocess, shader (5 files)
- `runtime/procgen/` — constraints, validate (2 files)
- `runtime/testing/` — harness (1 file)
- `runtime/agent/` — protocol (1 file, though agent.test.ts covers it partially)

These modules are exercised indirectly by demo tests and integration tests.

### Type-Check-Only CLI Mode

**Status:** Open
**Severity:** Medium — affects developer iteration speed

A fast `arcane typecheck` command that only transpiles and type-checks without discovering/executing tests would speed up the edit-check loop significantly.

### MCP Screenshot / Frame Capture Tool

**Status:** Open
**Severity:** Medium — biggest gap for non-visual AI iteration

A `capture_frame` MCP tool that returns a base64-encoded image of the current game window would enable AI agents to visually verify game state. This is the single most impactful missing feature for agent-driven development workflows.

### World Authoring DSL

**Status:** Open (Design in docs/world-authoring.md, not yet implemented)
**Severity:** Low — current APIs work, this is convenience

Declarative world definition APIs for agent-friendly scene authoring:
- `scene()` / `world()` / `room()` — Composable scene graph definition
- `tilemapFromAscii()` / `tileLegend()` — ASCII art tilemap parsing
- `encounter()` / `npc()` / `chest()` / `sign()` — Entity placement helpers

These would let agents define game worlds in a more natural, data-oriented way rather than imperative API calls.

### Advanced UI Widgets

**Status:** Open (deferred from Phase 16)
**Severity:** Low — current widgets cover most needs

Missing interactive UI components:
- **Scroll containers** — Scrollable lists and text areas
- **Drag-and-drop** — Reorderable lists, inventory drag
- **Modal dialogs** — Blocking popups with focus trapping

### Asset Hot-Reload

**Status:** Open
**Severity:** Low — code hot-reload works, assets require restart

Automatically detect and reload changed asset files (textures, sounds) without restarting the game. Currently only `.ts` files trigger hot-reload.
