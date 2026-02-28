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

### Code Cleanup & Technical Debt

**Status: Backlog**

Remove backward-compatibility shims and legacy code paths that are no longer needed after Phase 20 and Phase 26 completion.

### Deliverables
- [ ] **Remove audio legacy sink system** (~150 lines, `core/src/audio/mod.rs`)
  - [ ] Remove `legacy_sinks` HashMap and all legacy sink tracking
  - [ ] Remove `PlaySound` command handling (lines 146-173)
  - [ ] Remove `StopSound` legacy command handling (lines 175-179)
  - [ ] Remove volume updates for legacy sinks (lines 196-199)
  - [ ] All code now uses Phase 20 instance-based API (`op_play_sound_ex`)
- [ ] **Remove sprite rendering fallback** (~100 lines total)
  - [ ] Remove `op_draw_sprite` fallback in `runtime/rendering/sprites.ts` (lines 238-263)
  - [ ] Remove `op_draw_sprite` op definition in `core/src/scripting/render_ops.rs`
  - [ ] Remove `hasRenderOps` detection in sprites.ts (only `hasBatchOp` needed)
  - [ ] All code now uses Phase 26 batch API (`op_submit_sprite_batch`)
- [ ] **Remove audio playSound fallback** (~3 lines, `runtime/rendering/audio.ts`)
  - [ ] Remove `op_play_sound` fallback (lines 190-192)
  - [ ] Remove `hasPlaySoundEx` detection (always true in Phase 20+)
  - [ ] Remove old `op_play_sound` op from `core/src/scripting/render_ops.rs`

### Success Criteria
- [ ] All tests still pass (Node, V8, Rust)
- [ ] No demos or examples break
- [ ] ~250 lines of legacy code removed
- [ ] Code is simpler and easier to maintain
- [ ] No backward-compatibility burden for future changes

---

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

### Sprite API Unification

**Status: COMPLETE**

Merged `drawColorSprite()`, `drawParallaxSprite()`, and `drawTiledSprite()` into the unified `drawSprite()` API. One function handles all sprite rendering use cases:

```typescript
drawSprite({
  // Core
  textureId, x, y, w, h, layer, uv, tint, opacity, rotation, blendMode, shaderId,

  // Color fill (replaces drawColorSprite)
  color?: Color,  // auto-creates cached 1x1 texture

  // Parallax (replaces drawParallaxSprite)
  parallax?: number,  // depth factor for camera scrolling

  // Tiling (replaces drawTiledSprite)
  tileW?: number, tileH?: number,  // enables UV repeat
});
```

The old functions (`drawColorSprite`, `drawParallaxSprite`, `drawTiledSprite`) and their associated types (`ColorSpriteOptions`, `ParallaxSpriteOptions`) have been removed. All demos and documentation updated to use the unified API.

---

### Coordinate System Clarification

**Status: COMPLETE**

Changed to universal top-left origin: `(0, 0)` is the top-left corner of the screen, matching web canvas, Unity 2D, and Godot conventions. Camera position represents the viewport's top-left corner in world space. `autoCamera` option removed from `createGame()`. All screen↔world math simplified. All demos and documentation updated.

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
  - [ ] Discord server setup (channels: general, showcase, support)
  - [ ] GitHub Discussions enabled
  - [ ] Community guidelines and moderation
- [ ] **Content Creation**
  - [ ] Video walkthrough: "Build Your First Game with Arcane"
  - [ ] Blog series: deep dives into architecture decisions
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
| Scope creep into 3D | High | Medium | Resist. 2D only. The constraint is the feature. |

---

## Known Limitations & Backlog

Items discovered during development that don't block current work but should be addressed.

### Test Coverage Strategy

**Status:** Open
**Last audited:** 2026-02-28 — 4,683 tests (2162 Node + 2165 V8 + 356 Rust), all passing.

**Current coverage:** TS 88.9% lines / 84.4% branches. Rust 40.8% lines (85-100% for testable code; GPU/CLI code untestable headless).

#### Tier 1: Missing test files (critical APIs, ~850 lines uncovered)

These runtime modules have no dedicated `*.test.ts` file. They are exercised indirectly by demo tests but lack focused unit coverage.

| File | Lines | Why it matters |
|------|------:|---|
| `runtime/physics/body.ts` | 221 | Core API — createBody, destroyBody, applyForce/Impulse, setVelocity |
| `runtime/physics/constraints.ts` | 138 | Joint creation/removal — distance, revolute |
| `runtime/physics/query.ts` | 115 | Raycasts, AABB queries, contact retrieval |
| `runtime/agent/protocol.ts` | 159 | Agent registration — critical for LLM interaction |
| `runtime/procgen/constraints.ts` | 217 | WFC constraint system — reachability, counts, border |

**Approach:** Straightforward unit tests. Physics files test round-trips through the Rust ops (createBody → getBodyState → verify). Agent protocol tests verify registerAgent installs on globalThis correctly. Procgen constraint tests verify constraint evaluation against known grids.

#### Tier 2: UI draw function coverage (existing tests, ~575 lines uncovered)

These files have test files but only cover update/interaction logic. The `draw*()` functions are at 73-78% because rendering output isn't asserted.

| File | Coverage | What's missing |
|------|------:|---|
| `runtime/ui/shapes.ts` | 74% | draw functions for circle, ellipse, ring, arc, capsule, polygon |
| `runtime/ui/toggle.ts` | 73% | `drawCheckbox()`, `drawRadioGroup()` |
| `runtime/ui/slider.ts` | 73% | `drawSlider()` |
| `runtime/ui/button.ts` | 75% | `drawButton()` |
| `runtime/ui/text-input.ts` | 77% | `drawTextInput()` |
| `runtime/ui/primitives.ts` | 78% | `drawPanel()`, `drawBar()` branch coverage |

**Approach:** Use `runtime/testing/mock-renderer.ts` to capture drawSprite/drawText calls and assert correct positions, colors, and layering. These are the highest-ROI tests — easy to write, push TS coverage from 88.9% → ~93%.

#### Tier 3: Secondary gaps (~290 lines uncovered)

Lower-priority files that are thin wrappers or utility code.

| File | Lines | Notes |
|------|------:|---|
| `runtime/persistence/autosave.ts` | 86 | Timer-based auto-save state machine |
| `runtime/persistence/storage.ts` | 36 | Memory/file storage interface (tiny) |
| `runtime/procgen/validate.ts` | 92 | validateLevel, generateAndTest |
| `runtime/rendering/postprocess.ts` | 104 | addEffect/removeEffect/setParam (ops are no-ops headless) |
| `runtime/agent/describe.ts` | 72 | Default text description renderer |

**Approach:** Standard unit tests. Postprocess tests verify the TS-side state tracking (effect list, params) even though GPU ops are no-ops.

#### Tier 4: Rust renderer coverage (structural gap, ~5,500 lines at 0%)

GPU pipeline code (`renderer/mod.rs`, `sprite.rs`, `gpu.rs`, `texture.rs`, `shader.rs`, `postprocess.rs`, `geometry.rs`, `rendertarget.rs`) and CLI commands (`dev.rs`, `test.rs`, `init.rs`) are at 0% because no test path initializes a wgpu device.

| Module | Lines at 0% | What it'd take |
|--------|------:|---|
| `renderer/*` (GPU pipelines) | ~2,800 | Headless wgpu adapter (`Backends::VULKAN` + `instance.request_adapter()` with no surface) |
| `scripting/render_ops.rs` | 926 | V8 integration tests with a real `Renderer` in OpState |
| `cli/commands/*` | ~2,300 | Integration tests that spawn `arcane` subprocesses |
| `audio/mod.rs` | 252 | Mock audio backend or `rodio::Sink` with null output |

**Approach:** This is the largest effort. wgpu supports headless rendering (adapter without surface), which would allow testing sprite submission, texture creation, and shader compilation without a window. Requires a `GpuTestHarness` that creates a device+queue in tests. CLI integration tests can use `std::process::Command` to run `arcane check` / `arcane test` on fixture projects.

**Not recommended yet:** The Rust renderer code is stable and validated visually through 30 demos. The ROI of headless GPU tests is lower than Tiers 1-3.

#### Target milestones

| Milestone | Work | Expected result |
|---|---|---|
| **Tier 1 done** | 5 new test files | TS coverage ~90%, physics/agent/procgen covered |
| **Tier 1+2 done** | 5 new + 6 expanded test files | TS coverage ~93%, all UI draw paths covered |
| **Tier 1+2+3 done** | +5 more test files | TS coverage ~95%, Rust unchanged |
| **Tier 4 done** | Rust test harness + integration tests | Rust coverage 60-70% (up from 41%) |

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

---

### API Ergonomics (Breaking Changes OK)

**Status:** Backlog
**Severity:** Medium — demos work, but every demo repeats avoidable boilerplate

Cross-engine research (Unity, Godot, Phaser, Bevy, LÖVE, Defold) confirmed that Arcane requires more manual wiring than the industry norm in several areas. Breaking changes are acceptable to fix these. Ordered by industry evidence strength and implementation effort.

#### 1. Auto-clamp delta time (250ms cap)

**Priority:** P0 — Trivial, high impact
**Industry:** Unity (333ms), Bevy (250ms) auto-clamp. All others leave it to user code — a known footgun.
**Problem:** 6+ demos manually clamp `dt` (`Math.min(rawDt, 0.05)`). A tab switch or debugger pause causes a massive teleport spike.
**Change:** Cap `dt` at 250ms in `window.rs` before passing to TS. Add optional `maxDeltaTime` to `createGame()` for tighter game-specific caps.
**Files:** `core/src/platform/window.rs`, `runtime/rendering/loop.ts`

#### 2. Physics-to-sprite draw helper

**Priority:** P0 — Small effort, biggest line-count reduction
**Industry:** Every engine except LÖVE auto-syncs physics body → visual sprite. Godot/Unity do it via scene hierarchy, Bevy via ECS writeback, Phaser via `ArcadeSprite`. Only LÖVE and Arcane require manual `getBodyState()` → `drawSprite()` each frame.
**Problem:** 5+ demos (physics-playground, breakout, platformer, asteroids, tower-defense) manually loop over bodies, extract state, and feed it to draw calls. 20-50 lines per demo.
**Change:** Add `drawBody(bodyId, opts)` that internally calls `getBodyState()` and `drawSprite()` with correct position/rotation/origin. Promote `runtime/game/entity.ts` as the default pattern for physics-driven sprites.
**Files:** `runtime/physics/index.ts` or `runtime/game/entity.ts`

#### 3. Self-destructing particle bursts

**Priority:** P1 — Medium effort, eliminates lifecycle boilerplate
**Industry:** Unreal (`bAutoDestroy=true`), Godot (`one_shot` + `finished` signal), Unity (`OnParticleSystemStopped`), Bevy/enoki (`OneShot` component) all self-destruct. Only LÖVE and Arcane require manual cleanup polling.
**Problem:** juice-showcase spends ~70 lines managing emitter creation, stop-timers, and `getCount()==0` cleanup. `drawBurst()` works for single-frame sparks but can't do a 0.5s fading explosion.
**Change:** Add `spawnBurst(x, y, opts)` that persists across frames, updates automatically, and self-removes when all particles die. Uses `getRustEmitterParticleCount()` internally for Rust emitters.
**Files:** `runtime/particles/emitter.ts`, `runtime/particles/index.ts`

#### 4. Declarative camera tracking

**Priority:** P1 — Small effort, high ergonomic win
**Industry:** Godot (node properties, set once), Phaser (`startFollow()`, set once) are gold standard. Arcane has all the building blocks (smoothing, deadzone, bounds) but requires calling `followTargetSmooth()` every frame.
**Problem:** 4+ demos repeat `followTargetSmooth(player.x + W/2, player.y + H/2, zoom, speed)` in every frame callback.
**Change:** Add `camera.track(targetFn, opts)` — set once, engine calls `followTargetSmooth` automatically each frame. `camera.stopTracking()` to disable.
**Files:** `runtime/rendering/camera.ts`

#### 5. HUD rendering context

**Priority:** P1 — Small effort, reduces per-call noise
**Industry:** Godot (`CanvasLayer`), Unity (Canvas `Screen Space - Overlay`), Bevy (dedicated UI render pass), Defold (GUI component) all use structural separation — screen-space is implicit from container. Phaser uses `setScrollFactor(0)` per object.
**Problem:** Every HUD element in every demo needs `screenSpace: true` manually. Easy to forget, verbose.
**Change:** Add `beginHUD()` / `endHUD()` context. All draw calls between them imply `screenSpace: true`. Alternatively, `hud.draw(() => { ... })` closure form.
**Files:** `runtime/rendering/index.ts`, `runtime/ui/primitives.ts`

#### 6. Inject viewport size into frame context

**Priority:** P2 — Trivial, small ergonomic win
**Industry:** No engine injects viewport into the frame callback (all require separate queries), but Arcane's `onFrame(ctx)` pattern makes it natural to include.
**Problem:** 15+ demos repeat `const { width: vpW, height: vpH } = getViewportSize()` at the top of every frame callback.
**Change:** Add `ctx.vpW` and `ctx.vpH` to the frame context object.
**Files:** `runtime/rendering/loop.ts`

#### 7. Widget auto-update on draw

**Priority:** P2 — Medium effort, API change
**Industry:** Every engine except LÖVE uses event-driven or auto-dispatched widget input. Godot (`signal.connect()`), Unity (`onClick.AddListener()`), Phaser (`setInteractive()` + pointer events), Bevy (`Interaction` component) — all wire once. Only LÖVE and Arcane require per-frame `updateWidget()` calls.
**Problem:** ui-showcase manually calls `autoUpdateButton()`, `autoUpdateSlider()`, `autoUpdateCheckbox()` for every widget every frame.
**Change:** Option A (retained): `registerWidget(w)` once, engine auto-updates. Option B (immediate): `drawButton()` handles input internally so update+draw is one call. Either eliminates per-widget per-frame boilerplate.
**Files:** `runtime/ui/button.ts`, `runtime/ui/slider.ts`, `runtime/ui/toggle.ts`, `runtime/ui/text-input.ts`, `runtime/game/widgets.ts`

#### 8. ASCII level parser

**Priority:** P2 — Small effort, nice-to-have
**Industry:** Standard in roguelikes (rot.js, LambdaHack). LÖVE community uses Lua table grid strings. Phaser supports inline JSON tilemap data. Bevy is fully code-first. LDtk and Tiled dominate for visual editing, but ASCII is the prototyping standard for code-first engines.
**Problem:** platformer, breakout, sokoban hardcode level arrays. Roguelike-style games especially benefit from ASCII grids.
**Change:** Add `parseLevelASCII(asciiString, charMap)` that returns tile data compatible with `createTilemap()` / `setTile()`. Already partially designed in `docs/world-authoring.md` as `tilemapFromAscii()`.
**Files:** `runtime/rendering/tilemap.ts` or new `runtime/procgen/ascii.ts`

#### 9. Auto-derive agent registration

**Priority:** P3 — Medium effort, unique to Arcane
**Industry:** No prior art — Arcane's agent protocol is unique. Bevy's BRP (`bevy_brp_mcp`) is closest but requires explicit plugin registration. Godot/Unity have no AI agent APIs.
**Problem:** 15+ demos repeat the same `registerAgent({ name, version, getState, actions, describe })` boilerplate, often with `as any` casts.
**Change:** Auto-derive agent registration from `createGame()` state config. If `createGame({ state: { get, set, describe, actions } })` is provided, auto-call `registerAgent()` internally.
**Files:** `runtime/game/game.ts`, `runtime/agent/protocol.ts`
