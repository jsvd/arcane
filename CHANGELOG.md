# Changelog

All notable changes to Arcane are documented here.

## [0.10.1] - 2026-02-17

### Added
- **`createRng(seed)`** — mutable PRNG wrapper with `int`, `float`, `pick`, `shuffle`, `roll`, `snapshot`, `restore`, `fork` (eliminates verbose `[val, rng] = randomInt(rng, ...)` destructuring)
- **Shape primitives** — `drawCircle()`, `drawLine()`, `drawTriangle()` in `@arcane/runtime/ui` (scanline fill / rotated rect rendering)
- **Platformer controller** — `createPlatformerState()`, `platformerMove()`, `platformerJump()`, `platformerStep()` with coyote time, jump buffer, one-way platforms
- **Sprite groups** — `createSpriteGroup()`, `drawSpriteGroup()`, `getSpritePart()`, `setPartVisible()` for composite multi-part characters
- **`hud.overlay()`** — full-screen colored overlay for pause screens, damage flash, fade-to-black
- 60 new tests (15 rng + 10 shapes + 12 sprite-group + 20 platformer + 3 overlay)

### Fixed
- **Physics: bodies sticking together midair** — velocity clamping had an inverted sign for body A, removing separation velocity instead of approach velocity; overlapping dynamic bodies now correctly push apart
- **Physics: collision events missed during sub-stepping** — `getContacts()` now accumulates contacts across all 4 sub-steps (de-duplicated by body pair), fixing breakout bricks not popping and similar collision callback issues
- **Physics: bodies clipping through static ground** — sub-stepping (Box2D v3 approach: 4 sub-steps/frame) with Box2D-standard Baumgarte factor (0.2) and max correction clamping dramatically reduces penetration

### Changed
- 18 demos refactored to use new convenience APIs (net -199 lines)
  - 4 platformer demos replace ~270 lines of hand-rolled physics with `platformerStep()`
  - 11 demos replace verbose PRNG destructuring or `Math.random()` with `createRng()`
  - Isometric dungeon replaces 20 `drawSprite()` calls with 1 `createSpriteGroup()`
  - 3 demos replace manual viewport-sized `drawRect()` with `hud.overlay()`
  - Round objects (asteroids, balls, circular bodies) now render as circles
- Template topic guides updated: ui.md, rendering.md, game-patterns.md, entities.md, particles.md
- AGENTS.md: 4 new "Common Mistakes" entries, updated genre reading orders

## [0.10.0] - 2026-02-16

### Added
- **Game Convenience Layer** (`runtime/game/`) — new module reducing ~40% boilerplate in typical games
  - `createGame()` — bootstrap with auto-clear, auto-camera, agent protocol wiring
  - `drawColorSprite()` — inline colors with auto-cached solid textures (replaces `createSolidTexture` + `drawSprite` pattern)
  - `hud.text()`, `hud.bar()`, `hud.label()` — screen-space HUD helpers with sensible defaults
  - `captureInput()` + `autoUpdateButton/Slider/Checkbox/Focus()` — widget auto-wiring
  - `createEntity()`, `syncEntities()`, `drawEntities()`, `destroyEntity()` — lightweight entity handles binding position + sprite + physics
  - `createCollisionRegistry()`, `onCollision()`, `onBodyCollision()`, `processCollisions()` — collision event callbacks
  - 48 new tests across 6 test files
- **Scaffolded project restructure**
  - `arcane.d.ts` split into per-module declaration files (`rendering.d.ts`, `game.d.ts`, `physics.d.ts`, etc.) for faster LLM context loading
  - `COOKBOOK.md` replaced with focused `docs/` topic guides (coordinates, animation, physics, rendering, UI, etc.)
  - `AGENTS.md` streamlined to essentials with cross-references to topic docs
  - `CLAUDE.md` added to scaffolded projects pointing to AGENTS.md
  - `/api` skill for looking up specific API functions
- **COOKBOOK.md** — 6 new sections: Quick Start, Colored Sprites, HUD Shortcuts, Entity Handles, Collision Events, Widget Auto-Input

### Changed
- All 24 visual demos updated to use convenience layer (net -265 lines of boilerplate)
- Template `visual.ts` rewritten with `createGame()`, `drawColorSprite()`, `hud.text()`
- `generate-declarations.sh` now produces `@arcane/runtime/game` and `@arcane/runtime/input` declarations

## [0.9.4] - 2026-02-15

### Fixed
- MCP server protocol version negotiation: server now echoes client's `protocolVersion` instead of hardcoding `2025-03-26`, fixing Claude Code MCP integration
- MCP stdio bridge no longer writes spurious responses for JSON-RPC notifications (`notifications/initialized`), which violated the JSON-RPC 2.0 spec

## [0.9.3] - 2026-02-14

### Fixed
- `arcane new` scaffold duplication: stale build cache caused a nested `default/` subdirectory and missing dotfiles. Three-layer fix: (1) build.rs cleans OUT_DIR before copying, (2) build.rs always re-runs (removed restrictive rerun-if-changed), (3) copy_template_embedded skips stale "default/" artifacts as defense-in-depth.
- `arcane --version` flag works
- MCP server version uses `env!("CARGO_PKG_VERSION")` instead of hardcoded string

## [0.9.0] - 2026-02-14

### Added
- **Phase 20: Audio Polish** — instance-based playback, spatial audio, bus mixing, crossfade, sound pooling, pitch variation
- **Phase 21: MCP-First DX** — zero-config MCP auto-discovery (`.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`), stdio MCP bridge, import maps for `procgen`/`input` subpaths
- **Phase 22: Visual Polish** — screen transitions (5 types: fade, wipe, circleIris, diamond, pixelate), nine-slice sprite panels, trail/ribbon renderer
- **Phase 23: Juice & Game Feel** — impact combinator (shake + hitstop + flash + particles), floating text/damage numbers, typewriter text reveal
- **Phase 24: Isometric & Hex Grids** — diamond/staggered-iso coordinate transforms, iso tilemaps with depth sorting, hex cube coordinates (q + r + s = 0), hex tilemaps, hex A* pathfinding, hex flood-fill reachable
- **Phase 25: Input Systems** — gamepad support (gilrs), multi-touch input, input action mapping with remapping + buffering + combos, `KeyName` type for compile-time key validation
- `/release` skill for automated version bumping
- 4 new demos: visual-polish, hex-strategy, gamepad-platformer, audio-showcase
- Updated COOKBOOK.md with 11 new recipe sections (transitions, nine-slice, trails, juice, floating text, typewriter, iso grids, hex grids, gamepad, touch, input actions)
- Updated AGENTS.md with iso/hex, gamepad/touch, juice, and input action sections

### Fixed
- visual-polish demo: removed hallucinated `drawParticles()`, fixed key codes, dialog box layout
- physics-playground demo: mouse click handling
- CI: install `libudev-dev` for gilrs gamepad support on Linux
- `KeyName` type added for compile-time key validation (prevents typos like `"space"` vs `"Space"`)
- Import guards added to demos to catch invalid imports early

## [0.8.1] - 2026-02-13

### Added
- **Mouse Button Input API**
  - `isMouseButtonDown(button)` — check if mouse button is currently held (0=left, 1=right, 2=middle)
  - `isMouseButtonPressed(button)` — check if mouse button was just clicked this frame
  - New Rust ops: `op_is_mouse_button_down`, `op_is_mouse_button_pressed`
  - InputState now tracks `mouse_buttons_pressed` and `mouse_buttons_released` (similar to keyboard)

### Fixed
- **BFRPG Crawler UI** — camera zoom reduced from 8.0 to 1.0, text scale reduced to 1.5, all UI panels now responsive using `getViewportSize()`, combat controls changed from A/D to 1/2 (no conflict with WASD movement), added controls help panel
- **Tilemap Showcase HUD** — text rendering now uses `screenSpace: true` instead of complex world-space offset calculations, fixes garbled/overlapping text
- **UI Showcase** — mouse clicks now register correctly using new `isMouseButtonDown(0)` API instead of non-existent `isKeyDown("mouse0")`

## [0.8.0] - 2026-02-13

### Added
- **Draw Call Capture & Visual Assertions** (`runtime/testing/visual.ts`)
  - `enableDrawCallCapture()` / `disableDrawCallCapture()` — toggle structured logging of all draw calls
  - `getDrawCalls()` / `clearDrawCalls()` — retrieve and reset captured draw calls
  - `findDrawCalls(filter)` — query by type, position, layer, texture, content, screenSpace
  - `assertSpriteDrawn()`, `assertTextDrawn()`, `assertDrawCallCount()` — visual assertions for headless tests
  - `assertNothingDrawnAt()`, `assertLayerHasDrawCalls()`, `assertScreenSpaceDrawn()` — spatial and HUD assertions
  - `getDrawCallSummary()` — frame overview grouped by draw call type
  - Instruments all 7 draw functions: drawSprite, drawText, drawRect, drawPanel, drawBar, drawLabel, drawTilemap
  - Works in headless mode — captures intent before the Rust op boundary

- **Claude Code Skills** (`.claude/skills/`)
  - `/test-all` — run all 4 test suites (Node, V8, Rust, headless check) with unified summary
  - `/phase-complete` — phase transition checklist: tests, declarations, status lines
  - `/api-sync` — regenerate arcane.d.ts and check for drift

- **Custom Agents** (`.claude/agents/`)
  - `arcane-tester` (Sonnet) — read-only test runner, writes tests, diagnoses failures
  - `rust-engine` — Rust core specialist with deno_core rules and pinned versions
  - `ts-runtime` — TS runtime specialist with dual-runtime constraints

- Visual Testing recipe in COOKBOOK.md
- Common Mistakes section in AGENTS.md template (8 most frequent agent bugs)

### Changed
- `docs/agent-tooling.md` — removed 3 unused agent definitions, replaced fictional skills with honest CLI note, modernized CLI tools into table, documented new skills and custom agents
- Regenerated `arcane.d.ts` with visual testing API declarations

## [0.7.0] - 2026-02-12

### Added
- **Phase 13: Camera Polish**
  - Camera bounds/limits: `setCameraBounds()`, `getCameraBounds()` — clamp camera to map edges
  - Camera deadzone: `setCameraDeadzone()`, `getCameraDeadzone()` — player moves freely in center zone
  - Smooth camera follow: `followTargetSmooth()` with exponential lerp
  - Smooth zoom: `zoomTo()`, `zoomToPoint()` with easing
  - Parallax scrolling: `drawParallaxSprite()` with configurable depth factor
  - Parallax scroller demo showcasing all camera features

- **Phase 14: Tilemap Polish**
  - Multiple tilemap layers: `createLayeredTilemap()`, `setLayerTile()`, `drawLayeredTilemap()`
  - Animated tiles: `registerAnimatedTile()`, `updateAnimatedTiles()`
  - Auto-tiling: 4-bit and 8-bit bitmask algorithms (`computeAutotileBitmask4/8`, `applyAutotile`)
  - Tile properties: `defineTileProperties()`, `getTilePropertyAt()`
  - Layer visibility and opacity control
  - Tilemap showcase demo

- **Phase 15: Animation Polish**
  - Animation state machine (FSM): `createAnimationFSM()`, states, transitions, conditions
  - Crossfade blending between animation states
  - Frame events: `addFrameEvent()`, `updateAnimationWithEvents()`
  - Character controller demo with animation FSM

- **Phase 16: Interactive UI**
  - Buttons: `createButton()`, `updateButton()`, `drawButton()` with hover/press states
  - Toggles: `createCheckbox()`, `createRadioGroup()` with mutual exclusion
  - Sliders: `createSlider()`, `updateSlider()`, `drawSlider()` with drag support
  - Text input: `createTextInput()`, `updateTextInput()`, `drawTextInput()` with cursor and selection
  - Layout helpers: `verticalStack()`, `horizontalRow()`, `anchorTo()`
  - Focus/tab navigation: `createFocusManager()`, `updateFocus()`
  - UI showcase demo

- **Isometric 2.5D Demo**
  - Isometric coordinate transforms (iso <-> Cartesian)
  - Depth-based sprite sorting (Y-position determines draw order)
  - Click-to-move with A* pathfinding
  - Coin collection, smooth camera follow
  - Detailed composite sprite rendering (35+ textures)

### Fixed
- `screenToWorld()` returned wrong coordinates when camera bounds clamping was active — clamped position was not synced back to the bridge (engine-wide fix affecting all demos with camera bounds + mouse input)

## [0.6.1] - 2026-02-12

### Fixed
- npm package missing `src/` directory (symlink not followed by `npm pack`). Added prepack/postpack scripts.
- `arcane test`, `arcane describe`, `arcane inspect` failed on standalone projects — import map for `@arcane/runtime/*` was only created in `arcane dev`.
- Import map missing `scenes` and `persistence` subpaths.
- Import map mapped `testing` to nonexistent `index.ts` (should be `harness.ts`).
- Space key not working for shooting in Asteroids demo (`"Space"` not `" "`).

### Added
- `scripts/smoke-test.sh` — E2E test simulating `arcane new` + `npm install` + `arcane test` + `arcane describe`.

## [0.6.0] - 2026-02-12

### Added
- **Phase 12: Sprite Transforms + Rendering Polish**
  - Sprite rotation with configurable origin point (`rotation`, `originX`, `originY`)
  - Sprite flip (`flipX`, `flipY`) and per-sprite opacity
  - Blend modes: `"alpha"`, `"additive"`, `"multiply"`, `"screen"` — 4 cached wgpu pipelines
  - Custom WGSL fragment shaders: `createShaderFromSource()`, `setShaderParam()` with 16 vec4 uniforms
  - Post-processing pipeline: offscreen render targets, ping-pong chaining, fullscreen triangle
  - Built-in post-process effects: bloom, blur, vignette, CRT (scanlines + barrel distortion)
  - Asteroids demo exercising all new features (rotation, additive blending, CRT effect)

### Changed
- `bump-version.sh` now syncs `cli/data/` via `prepublish.sh` and verifies the copy

### Fixed
- Space key input in Asteroids demo (`"Space"` not `" "`)

## [0.5.0] - 2026-02-11

### Added
- **Phase 11: Homebrew Rust Physics Engine**
  - Rigid body types: dynamic, static, kinematic
  - Shapes: circle, AABB
  - Spatial hash broadphase, SAT narrowphase
  - Sequential impulse solver with warm starting and accumulated impulses
  - Constraints: distance joints, revolute joints
  - Island-based sleep system (velocity threshold + timer)
  - Queries: AABB region query, raycast
  - 18 `#[op2]` physics ops (not feature-gated — available in headless)
  - TypeScript API: `createPhysicsWorld()`, `createBody()`, `stepPhysics()`, `raycast()`, etc.
  - Physics playground demo (spawn modes, joints, gravity toggle)
  - Breakout demo retrofitted to use Rust physics

### Fixed
- HiDPI rendering: use logical pixels for camera and mouse coordinates
- CI: bust stale rust-cache causing rusty_v8 link failure
- Sleep cascade: only fast-moving bodies wake sleeping neighbors

## [0.4.0] - 2026-02-11

### Added
- **Phase 10: Scene Management + Save/Load**
  - Scene stack: `createScene()`, `pushScene()`, `popScene()`, `replaceScene()`
  - Scene transitions with lifecycle hooks (enter, exit, pause, resume)
  - Save/load: `saveGame()`, `loadGame()` with schema migrations
  - Auto-save: `enableAutoSave()`, `updateAutoSave()`, `triggerAutoSave()`
  - File I/O ops for persistent storage
  - Menu flow demo (title, menu, gameplay, pause, game over scenes)
- **Asset tooling improvements**
  - `arcane assets inspect` — view pack contents with file categorization
  - Spritesheet detection: auto-detect grid structures from image dimensions
  - Multi-row spritesheet support in animation system
  - OpenGameArt CC0 asset integration

### Fixed
- Animation UV height for multi-row spritesheets
- Animation frame bleed (manual UV calculation)
- Coordinate system docs and JSDoc for LLM clarity

## [0.3.0] - 2026-02-11

### Added
- **`arcane assets` CLI** — built-in asset discovery and download, replacing the MCP server
  - `arcane assets list` — browse 25 Kenney.nl CC0 asset packs with `--type` filter
  - `arcane assets search <query>` — keyword search with synonym expansion and relevance scoring
  - `arcane assets download <id> [dest]` — download and extract ZIP packs
  - `--json` flag on all commands for structured output
  - Embedded catalog via `include_dir` with filesystem fallback for development
  - 19 Rust unit tests for catalog loading, search, synonyms, filtering
- **Resolution-adaptive design** — games adapt to viewport size instead of hardcoding 800x600
  - `getViewportSize()` API for querying actual window dimensions
  - Default scaffold demonstrates the pattern
  - Breakout demo updated as reference implementation
  - AGENTS.md documents the pattern with examples
- **Improved LLM development experience**
  - AGENTS.md includes game dev mindset guidance and asset workflow
  - `types/arcane.d.ts` referenced as primary API documentation

### Changed
- Scaffolded projects no longer include `.mcp.json` or `arcane-assets-mcp` dependency
- Template `package.json` uses `@arcane-engine/runtime@^0.3.0`

### Fixed
- Hot-reload for solid textures and sounds (texture/sound IDs preserved across reloads)
- Test failures in `packages/` directory
- V8 test discovery no longer scans `templates/` directory

### Removed
- MCP server dependency for asset discovery (replaced by built-in CLI commands)

## [0.2.1] - 2026-02-10

### Added
- Standalone install: `cargo install arcane-cli` works end-to-end
- Templates and recipes embedded in binary via `include_dir` + `build.rs`
- Runtime resolved from `node_modules/@arcane-engine/runtime/src/` in standalone projects
- Filesystem fallback for dev-from-repo

### Fixed
- `cargo publish` packaging: use `build.rs` to stage embedded data in `OUT_DIR`

## [0.2.0] - 2026-02-10

### Added
- **Phase 9.5: LLM-Assisted Game Dev Experience**
  - `arcane new` scaffolds projects with AGENTS.md and `types/arcane.d.ts`
  - Generated type declarations from runtime JSDoc annotations
  - Agent capability guidelines to prevent unfeasible feature proposals
- **Phase 9: Tweening + Particles + Juice**
  - Tweening: `tween()`, `updateTweens()`, 30 easing functions (10 families)
  - Tween chaining: `sequence()`, `parallel()`, `stagger()`
  - Camera shake and screen flash helpers
  - Particle system: `createEmitter()`, `updateParticles()`, pooling, affectors
  - Juice showcase demo demonstrating all effects
- **Phase 8: arcane-assets MCP server** (later replaced in 0.3.0)
  - Asset discovery for 25 Kenney.nl CC0 packs
  - Synonym search, structured JSON output
- **Phase 7: Recipe Framework + Game Systems**
  - `system()`, `rule()`, `applyRule()`, `extend()` — declarative game systems
  - 4 recipes: turn-based combat, inventory/equipment, grid movement, fog of war
  - `arcane add <recipe>` CLI command
  - Tower Defense demo with pathfinding
- **Phase 6: BFRPG Dungeon Crawler Demo**
  - Character creation, d20 combat, dungeon exploration
  - Agent protocol integration for AI-assisted gameplay
  - UI color API: `rgb(r, g, b, a?)` helper

### Fixed
- Hot-reload V8 crash (controlled runtime drop timing)
- Mouse coordinate offset in tower defense demo
- Mouse button event handling (u16 to u8 type conversion)
- Texture ID mismatch in platformer demo

## [0.1.0] - 2026-02-09

### Added
- **Phase 5: Asset Loading**
  - `loadTexture()`, `loadSound()` with caching
  - Sprite sheet animation, WAV/OGG audio playback
  - Sprite demo with real CC0 assets
- **Phase 4: Core Engine Features**
  - Text rendering (CP437 8x8 bitmap font)
  - UI primitives: `drawRect()`, `drawPanel()`, `drawBar()`, `drawLabel()`
  - Animation system: `createAnimation()`, `updateAnimation()`, `drawAnimatedSprite()`
  - A* pathfinding with binary min-heap
  - Audio: `loadSound()`, `playSound()`, `playMusic()`, `stopSound()`
  - Platformer demo
- **Phase 3: Agent Protocol**
  - `registerAgent()` + `globalThis.__arcaneAgent`
  - `arcane describe` and `arcane inspect` CLI commands
  - HTTP inspector (`--inspector <port>`)
  - Error snapshots to `.arcane/snapshots/`
- **Phase 2: Rendering Engine**
  - wgpu sprite pipeline with instanced rendering
  - Camera system with zoom
  - Tilemap rendering with atlas UV mapping
  - Point lighting with ambient light
  - Keyboard/mouse input handling
  - `arcane dev` with hot-reload
  - Breakout and Roguelike visual demos
- **Phase 1: TypeScript Runtime**
  - State management: transactions, queries, observers, PRNG
  - V8 bridge via deno_core `#[op2]` ops
  - Universal test harness (Node + V8)
  - `arcane test` headless test runner
  - Sokoban and Card Battler demos
- **Phase 0: Design**
  - Architecture documents, engineering philosophy, roadmap
  - API design contract, glossary, contributing guide
