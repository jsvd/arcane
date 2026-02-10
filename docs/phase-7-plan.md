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

### 7.1: Package Structure & Metadata ✓ CURRENT

**Goal:** Set up package.json and Cargo.toml for publishing

**Tasks:**
- [x] Create `packages/runtime/package.json` for @arcane/runtime
- [ ] Create `packages/types/package.json` for @arcane/types
- [ ] Create `packages/create/package.json` for @arcane/create
- [ ] Update `core/Cargo.toml` with crates.io metadata
- [ ] Update `cli/Cargo.toml` with crates.io metadata and binary name
- [ ] Add LICENSE files to all packages
- [ ] Add README files to all packages

**Deliverables:**
- All packages have correct metadata
- Licenses are clear (Apache 2.0)
- Package dependencies are specified

### 7.2: Runtime Package Export

**Goal:** Make runtime importable as a standalone package

**Tasks:**
- [ ] Move `runtime/` to `packages/runtime/src/`
- [ ] Create `packages/runtime/package.json` with exports
- [ ] Update all demo imports to use package name
- [ ] Add build script to generate `.d.ts` files
- [ ] Test that demos work with package imports

**Deliverables:**
- `import { onFrame } from "@arcane/runtime"` works
- All demos use new import style
- Type definitions are exported

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

### 7.4: CLI Improvements

**Goal:** Make `arcane` command work in any project directory

**Tasks:**
- [ ] `arcane dev` finds entry point (default: `src/visual.ts`)
- [ ] `arcane test` finds test files in project
- [ ] `arcane add <recipe>` works from any directory
- [ ] Add `arcane init` (convert existing dir to arcane project)
- [ ] Add `arcane new <name>` (create + scaffold)

**Deliverables:**
- CLI works in any project, not just engine repo
- Sensible defaults (find src/visual.ts, src/game.ts)

### 7.5: Documentation

**Goal:** Enable users to get started without help

**Tasks:**
- [ ] Write `docs/getting-started.md`
- [ ] Write `docs/tutorial-sokoban.md` (10 min guide)
- [ ] Write `docs/tutorial-rpg.md` (30 min guide with recipes)
- [ ] Write `docs/api-reference.md` (generated from types)
- [ ] Write `docs/recipe-guide.md` (how to create recipes)
- [ ] Update README with installation instructions

**Deliverables:**
- Complete getting started guide
- Two full tutorials
- API reference

### 7.6: Example Projects

**Goal:** Standalone example repos demonstrating real usage

**Tasks:**
- [ ] Create `arcane-examples` org/directory
- [ ] Migrate Sokoban to standalone project
- [ ] Migrate Card Battler to standalone project
- [ ] Migrate Tower Defense to standalone project
- [ ] Each has own README with "how to run"

**Deliverables:**
- 3 standalone example projects
- Each uses `@arcane/runtime` as dependency

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

**Phase 7.1 in progress** - Setting up package structure
