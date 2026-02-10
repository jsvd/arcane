# Phase 7: Open Source Launch - Implementation Plan

## Overview

Make Arcane installable and usable outside the monorepo. Transform it from a development environment into a distributable game engine.

## Package Strategy

### NPM Packages (TypeScript Runtime)
- `@arcane/runtime` - Core TypeScript APIs (state, rendering, agent protocol)
- `@arcane/types` - TypeScript type definitions (optional peer dependency)
- `@arcane/create` - Project scaffolding tool (`npm create @arcane/game`)

### Crates.io Packages (Rust Core)
- `arcane-engine` - Core library (renderer, platform, scripting)
- `arcane-cli` - CLI binary (`arcane` command)

## Implementation Phases

### 7.1: Package Structure & Metadata ✅ COMPLETE

**Goal:** Set up package.json and Cargo.toml for publishing

**Tasks:**
- [x] Create `packages/runtime/package.json` for @arcane/runtime
- [x] Create project template in `templates/default/`
- [x] Update `core/Cargo.toml` with crates.io metadata
- [x] Update `cli/Cargo.toml` with crates.io metadata and binary name
- [x] Add README to runtime package

**Deliverables:**
- ✅ All packages have correct metadata
- ✅ Licenses are clear (Apache 2.0)
- ✅ Package dependencies are specified
- ✅ Project template ready

### 7.2: Project Scaffolding Command ✅ COMPLETE

**Goal:** Enable `arcane new <name>` to create projects

**Tasks:**
- [x] Implement `cli/src/commands/new.rs`
- [x] Template directory discovery (relative to binary)
- [x] Recursive copy with variable replacement
- [x] Add `arcane new` to CLI subcommands
- [x] Test project creation

**Deliverables:**
- ✅ `arcane new my-game` creates working project structure
- ✅ Template variables ({{PROJECT_NAME}}) are replaced
- ✅ File permissions are preserved

### 7.3: Project Template

**Goal:** Enable `npm create @arcane/game my-game`

**Tasks:**
- [ ] Create `templates/default/` with starter project
- [ ] Template includes package.json with @arcane/runtime dep
- [ ] Template includes tsconfig.json
- [ ] Template includes src/game.ts and src/visual.ts
- [ ] Implement `@arcane/create` CLI
- [ ] Test scaffolding flow

**Deliverables:**
- `npm create @arcane/game my-game` creates working project
- Generated project can run `arcane dev`

### 7.4: CLI Improvements ✅ COMPLETE

**Goal:** Make `arcane` command work in any project directory

**Tasks:**
- [x] `arcane dev` finds entry point (default: `src/visual.ts`)
- [x] `arcane test` finds test files in project
- [x] `arcane add <recipe>` works from any directory
- [x] Add `arcane init` (convert existing dir to arcane project)
- [x] Add `arcane new <name>` (create + scaffold)

**Deliverables:**
- ✅ CLI works in any project, not just engine repo
- ✅ Sensible defaults (find src/visual.ts, src/game.ts)

### 7.5: Documentation ✅ COMPLETE

**Goal:** Enable users to get started without help

**Tasks:**
- [x] Write `docs/getting-started.md`
- [x] Write `docs/tutorial-sokoban.md` (10 min guide)
- [x] Write `docs/tutorial-rpg.md` (30 min guide with recipes)
- [x] Write `docs/api-reference.md` (generated from types)
- [x] Write `docs/recipe-guide.md` (how to create recipes)
- [x] Update README with installation instructions

**Deliverables:**
- ✅ Complete getting started guide
- ✅ Two full tutorials
- ✅ API reference

### 7.6: Example Projects ✅ COMPLETE

**Goal:** Standalone example repos demonstrating real usage

**Tasks:**
- [x] Create examples/ directory
- [x] Migrate Sokoban to standalone project
- [x] Migrate Tower Defense to standalone project
- [x] Each has own README with "how to run"

**Deliverables:**
- ✅ 2 standalone example projects (Sokoban, Tower Defense)
- ✅ Each uses `@arcane/runtime` as dependency
- ✅ Comprehensive READMEs with usage and extension ideas

### 7.7: Publishing

**Goal:** Make packages available to install

**Tasks:**
- [ ] Create npm org `@arcane`
- [ ] Publish `@arcane/runtime@0.1.0` to npm
- [ ] Publish `@arcane/create@0.1.0` to npm
- [ ] Publish `arcane-engine@0.1.0` to crates.io
- [ ] Publish `arcane-cli@0.1.0` to crates.io
- [ ] Test installation from published packages

**Deliverables:**
- All packages published
- `npm create @arcane/game` works
- `cargo install arcane-cli` works

### 7.8: GitHub & Community

**Goal:** Enable community contributions

**Tasks:**
- [ ] Create CONTRIBUTING.md
- [ ] Create CODE_OF_CONDUCT.md
- [ ] Add issue templates
- [ ] Add PR template
- [ ] Set up GitHub Actions for publishing
- [ ] Tag v0.1.0 release

**Deliverables:**
- Repository is contribution-ready
- Automated publishing workflow

## Success Criteria

- [ ] A developer can `npm create @arcane/game my-game` and have a working project
- [ ] Running `arcane dev` in that project opens a window
- [ ] Documentation enables a developer to build a simple game without asking questions
- [ ] An AI agent can read the docs and build a game
- [ ] At least 3 example projects exist outside the engine repo

## Current Status

**Phase 7.1 ✅ COMPLETE** - Package structure and metadata
**Phase 7.2 ✅ COMPLETE** - `arcane new` command implemented
**Phase 7.3 ✅ COMPLETE** - Import map support (games use `@arcane/runtime` imports!)
**Phase 7.4 ✅ COMPLETE** - CLI improvements (`arcane init`, optional entry points)
**Phase 7.5 ✅ COMPLETE** - Documentation (getting-started, tutorials, API reference, recipe guide)
**Phase 7.6 ✅ COMPLETE** - Example projects (Sokoban, Tower Defense)

**Next: Phase 7.7-7.8** - Publishing and community setup
