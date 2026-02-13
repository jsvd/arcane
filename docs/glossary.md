# Glossary

Canonical definitions for terms used across Arcane. When a document uses one of these terms, it means exactly what's defined here. If you're unsure what something means, check here first.

Using consistent terminology is critical when both humans and LLMs work on the same codebase. Ambiguity in naming creates ambiguity in thinking.

---

## Architecture

**Engine Core**
The Rust layer. Handles rendering, physics, audio, ECS storage, spatial indexing, pathfinding, and platform integration. Agents rarely modify this layer directly.

**Runtime**
The TypeScript layer. Where game logic lives. State management, systems, entities, events, world definitions, and the rendering bridge. This is what agents write.

**Bridge**
The interface between the TypeScript runtime and the Rust engine core. TypeScript issues high-level commands (e.g., "set sprite"); Rust translates them into GPU operations. Game logic never talks to the GPU directly.

**Headless Mode**
Running the TypeScript runtime without the Rust engine. No window, no GPU, no audio. Used for testing and agent interaction. Game logic must work identically in headless and hosted mode.

**Hosted Mode**
Running the TypeScript runtime inside the Rust engine, with full rendering and platform access. The "real" game.

---

## Game Logic

**State (State Tree)**
The single, typed data structure containing all game data. One tree, one source of truth. Queryable, observable, transactional.

**Transaction**
An atomic batch of state mutations. Either all mutations succeed or none do. Produces a diff describing what changed.

**Diff**
The delta between two states. Records exactly what changed and the before/after values. Produced by every transaction.

**Query**
A typed filter over the state tree. Returns matching entities or values. Works identically in headless and hosted mode.

**Observer**
A subscription to state changes. Fires after transactions commit. Used for reactive behavior (e.g., trigger death sequence when HP reaches 0).

**Entity**
A game object identified by a unique `EntityId`. Characters, monsters, items, interactables, projectiles — anything that exists in the game world.

**Component**
A typed data bag attached to an entity. Entities are defined by their components (position, health, sprite, inventory, etc.), not by class inheritance.

**Archetype**
A template for creating entities with a predefined set of components. A "goblin" archetype creates entities with health, position, AI, and sprite components.

---

## Systems

**System**
A named collection of rules, state, and queries that governs a domain of game behavior (e.g., combat, inventory, fog of war). See [recipe-guide.md](recipe-guide.md).

**Rule**
A named, conditional behavior within a system. Has preconditions (`when`) and effects (`then`). Rules are independently testable.

**Recipe**
A pre-built, composable system distributed as a package. Installed with `arcane add`, customized with `extend`. Recipes are the unit of ecosystem sharing.

**Extend**
The pattern for customizing a recipe without forking it. Replace rules, add rules, extend state, override queries.

**Wiring**
Explicit connections between recipes that touch the same state or behavior. When combat needs to check armor from inventory, that's wiring.

---

## World

**Scene**
A TypeScript definition of what's on screen — the root node, its children, their configuration. The Arcane equivalent of a `.tscn` file, but it's code. See [world-authoring.md](world-authoring.md).

**Room**
A discrete area within a world. Has a size, tiles, entities, encounters, and connections to other rooms. Rooms are data.

**World**
A collection of connected rooms. A dungeon, a town, an overworld. Defined as a typed data structure with named rooms and their connections.

**Tilemap**
A grid of tiles defining the visual and physical layout of a room. Can be defined in code (programmatic) or ASCII text.

**Encounter**
A game event placed in a room — combat, trap, NPC interaction, treasure. Has trigger conditions and outcomes.

---

## Agent Protocol

**Agent Protocol**
The built-in system for AI agent interaction. Includes CLI commands (`arcane describe`, `arcane inspect`), HTTP inspector, MCP server (JSON-RPC 2.0), text description renderer, and headless execution. See [agent-tooling.md](agent-tooling.md).

**Text Description Renderer**
A renderer that outputs natural language instead of pixels. Describes game state in text so agents can "see" without vision. The primary way agents perceive the game.

**Inspector API**
The HTTP API exposed on localhost during dev mode. Allows querying state, executing actions, rewinding, and simulating.

**Error Snapshot**
An automatic capture of full game state when an error occurs. Includes the state tree, triggering action, stack trace, and text description. Gives agents everything needed to reproduce bugs.

**Hot Reload**
Reloading TypeScript code in sub-second when source files change. Creates a fresh V8 isolate — game state resets, but the window and GPU context persist. Feels near-instant because there's no cold start of the Rust engine.

---

## Rendering

**MSDF Text**
Multi-channel Signed Distance Field text rendering. Stores glyph outlines as distance fields in an atlas texture, enabling resolution-independent crisp text with GPU-accelerated outline, shadow, and glow effects via a specialized fragment shader.

**Radiance Cascades**
A 2D global illumination algorithm. Propagates light through the scene in a multi-pass compute shader, allowing emissive surfaces to cast colored light and occluders to cast soft shadows. See `core/src/renderer/radiance.rs`.

**Global Illumination (GI)**
Indirect lighting computed from emissive surfaces in the scene. In Arcane, implemented via Radiance Cascades as a 3-pass GPU compute pipeline. Controlled via `setGIEnabled()` and `setGIQuality()`.

**Emissive**
A sprite or surface that emits light into the GI system. Set via the `emissive` property in `SpriteOptions` — the sprite's color contributes to indirect lighting in the scene.

**Occluder**
A sprite or surface that blocks light propagation in the GI system. Set via the `occluder` property in `SpriteOptions`.

**Post-Processing**
GPU effects applied after the scene renders: bloom, blur, vignette, CRT scanlines. Managed via `addPostProcessEffect()` / `setEffectParam()`. Each effect is a separate pass on an offscreen render target.

---

## Procedural Generation

**Wave Function Collapse (WFC)**
A constraint-based procedural generation algorithm. Starts with every tile in superposition (all options possible), then iteratively collapses tiles to single values while propagating adjacency constraints. Used for dungeon/level generation. See `runtime/procgen/wfc.ts`.

**Constraint** (in WFC context)
A rule that the generated output must satisfy. Built-in constraints: `reachability` (all floor tiles connected), `exactCount` / `minCount` / `maxCount` (tile frequency), `border` (forced edge tiles). See `runtime/procgen/constraints.ts`.

---

## Testing

**Property-Based Testing**
Testing with randomly generated inputs to verify invariants hold across many cases. The `checkProperty()` / `assertProperty()` API generates test cases, runs assertions, and automatically shrinks failing inputs to minimal reproductions. See `runtime/testing/property.ts`.

**Replay Testing**
Recording physics simulation states frame-by-frame, then replaying to verify determinism. `startRecording()` / `stopRecording()` capture state; `replay()` re-runs; `diffReplays()` compares recordings. See `runtime/testing/replay.ts`.

**Snapshot Testing**
Capturing a physics world's full state (bodies, positions, velocities) at a point in time for comparison. Used with replay testing to detect non-determinism in simulation.

---

## Tooling

**Agent** (in tooling context)
A specialized Claude Code sub-agent with a defined domain, file scope, and knowledge set. Different from "game entity agent" or "AI agent" in the general sense. See [agent-tooling.md](agent-tooling.md).

**Skill**
A repeatable workflow invoked as a slash command (`/arcane-test`, `/new-recipe`). Encodes a process, not a single command.

**MCP Tool**
A Model Context Protocol tool that gives Claude Code programmatic access to engine functionality (state inspection, test execution, etc.). Arcane's MCP server (`core/src/agent/mcp.rs`) exposes 10 tools over JSON-RPC 2.0 via stdio transport.

---

## Infrastructure

**Phase**
A stage in the [roadmap](roadmap.md). Each phase has deliverables and success criteria. Tooling is reviewed at phase transitions.

**Acceptance Criteria**
Specific, testable conditions that must be true for work to be considered done. Written before implementation.

**Definition of Done**
The five conditions: it works, it's tested, it's consistent, it's documented, it's reviewed.

**The Three Laws**
The priority-ordered principles from [engineering-philosophy.md](engineering-philosophy.md): correct, then clear, then minimal.

---

## Conventions

When introducing a new term to the codebase:
1. Define it here first
2. Use it consistently across all documents and code
3. If an existing term covers the concept, use the existing term
4. If two terms seem synonymous, pick one and alias the other here with a redirect

When a term is ambiguous in context (e.g., "agent" could mean AI coding agent, game entity AI, or Claude Code sub-agent), qualify it: "coding agent," "entity AI," "tooling agent."
