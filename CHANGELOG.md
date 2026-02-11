# Changelog

All notable changes to Arcane are documented here.

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
