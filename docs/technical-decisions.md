# Technical Decisions

Architecture Decision Records (ADRs) for Arcane. Each decision documents the context, options considered, choice made, and rationale.

---

## ADR-001: Rust for the Engine Core

### Context
The engine core handles rendering, physics, audio, ECS storage, and platform integration. It needs to be fast, cross-platform, and compilable to both native and WebAssembly.

### Options Considered
1. **C++** — industry standard, maximum performance, maximum footguns
2. **Rust** — near-C++ performance, memory safety, modern tooling
3. **Pure TypeScript** — single language, but GC pauses cause frame stutters, no real threading, SIMD limitations make spatial queries 4-8x slower

### Decision
**Rust.**

### Rationale
- Claude knows Rust well enough to maintain engine internals when needed
- Performance matches C++ without the memory safety hazards
- wgpu gives cross-platform GPU access (Vulkan, Metal, DX12, WebGPU)
- Compiles to native on every desktop platform, and to WebAssembly for browser targets
- Bevy/wgpu/winit ecosystem has already solved most hard systems-level problems
- Strong type system catches engine bugs at compile time
- Cargo makes dependency management straightforward

---

## ADR-002: TypeScript for Game Logic Scripting

### Context
The scripting layer is where 90% of game development happens. It's what AI agents write. The language choice directly impacts agent productivity.

### Options Considered
1. **Lua** — traditional game scripting, lightweight, but weak typing, limited tooling
2. **GDScript** — Godot's approach, purpose-built but tiny ecosystem
3. **C#** — Unity's approach, strong typing but heavy runtime, slower iteration
4. **TypeScript** — excellent type system, massive ecosystem, Claude's strongest language

### Decision
**TypeScript** as the primary scripting language. Architecture supports additional languages later.

### Rationale
- The language Claude writes most fluently, with the deepest training data
- Type system expressive enough for complex game data modeling but not too rigid
- Runs in V8/Deno, which is embeddable in the Rust core
- Instant hot-reload without recompiling the engine
- Full npm ecosystem for non-rendering concerns (data structures, algorithms, testing)
- Excellent LSP support for human developers too
- TypeScript types serve as documentation — LLMs read types better than comments

---

## ADR-003: wgpu for Rendering

### Context
The 2D renderer needs cross-platform GPU access that works on desktop and web.

### Options Considered
1. **Raw Vulkan/Metal/DX12** — maximum control, massive surface area, per-platform work
2. **SDL2** — proven but CPU-oriented, limited GPU pipeline control
3. **wgpu** — Rust-native, cross-platform GPU abstraction, WebGPU-compatible

### Decision
**wgpu.**

### Rationale
- Single API for Vulkan, Metal, DX12, and WebGPU
- Compiles to native and to WebAssembly (browser targets via WebGPU)
- Active Rust ecosystem with good documentation
- The Bevy engine uses wgpu, proving it works for game rendering
- Shader language is WGSL — text-based, agent-writable
- No C/C++ dependency chain to manage

---

## ADR-004: V8 via deno_core for Script Embedding

### Context
TypeScript game scripts need to run inside the Rust engine with efficient data passing between the two layers.

### Options Considered
1. **QuickJS** — lightweight, easy to embed, but slow (10-50x slower than V8)
2. **Bun** — fast, but not designed for embedding in other runtimes
3. **deno_core** — V8 wrapper designed for Rust embedding, proven in Deno

### Decision
**V8 via deno_core.**

### Rationale
- deno_core has already solved the hard problem: efficient FFI between Rust and V8
- V8's JIT compiler means game logic runs fast, not interpreted
- Deno team maintains the Rust bindings; we benefit from their work
- TypeScript execution is native (V8 + swc for type-stripping)
- Hot-reload with state preservation is achievable via V8's snapshot mechanism

---

## ADR-005: 2D Only

### Context
Should Arcane support 3D games?

### Options Considered
1. **2D only** — focused, achievable, matches target game types
2. **2D + 3D** — broader appeal, much larger scope
3. **3D only** — wrong audience for agent-native development

### Decision
**2D only.**

### Rationale
- 3D games require 3D art — modeling, texturing, rigging, animation — fundamentally human-visual workflows that agents can't drive
- 2D is different: agents can work with sprite sheets (data), define animations as frame sequences in code, use procedural generation for environments
- Sweet spot: the engine makes 2D games that look as good as hand-crafted, but an agent can author everything except pixel art
- Focused scope means we can ship something excellent rather than something mediocre in both dimensions
- The constraint is the feature

---

## ADR-006: Built-In Renderer (Not Pluggable)

### Context
Should the renderer be swappable/pluggable, or a single integrated implementation?

### Options Considered
1. **Pluggable renderer** — "bring your own renderer" via abstraction layer
2. **Built-in, opinionated renderer** — one renderer, deeply integrated

### Decision
**Built-in, opinionated.**

### Rationale
Pluggable renderer creates a lowest common denominator trap:
- Can't express custom shaders without leaking the abstraction
- Post-processing doesn't fit generic abstraction schemas
- Every renderer must implement every feature; in practice one gets attention, others rot
- History of "pluggable renderer" architectures that collapsed or limited visual capabilities
- Even Godot's multiple renderers (Forward+, Mobile, Compatibility) are a constant maintenance burden

One renderer means:
- Deep optimization for 2D specifically
- Custom shaders, post-processing, and lighting work out of the box
- Agent has one target to understand, not multiple backends
- Consistent visual output across all platforms

---

## ADR-007: Apache 2.0 License

### Context
The license affects adoption, contribution, and commercial viability.

### Options Considered
1. **MIT** — maximally permissive, simple, no patent protection
2. **Apache 2.0** — permissive, patent protection, contribution clarity
3. **Dual license (MIT + Apache 2.0)** — Rust ecosystem convention, covers both bases
4. **AGPL/copyleft** — forces open source on games built with the engine (non-starter)

### Decision
**Apache 2.0.**

### Rationale
- Fully permissive — anyone can build proprietary, closed-source, commercial games
- No revenue sharing, no open-source requirements on game code
- Patent protection for users: contributors grant a patent license
- Patent retaliation clause: if someone sues over patents, their license terminates
- Only real obligations: include license copy, note changes if redistributing modified engine
- Clear contribution terms reduce legal ambiguity
- Good enough for the Rust ecosystem (many major projects use it)

---

## ADR-008: Why Not "Just Use Phaser/Pixi/Existing TS Framework"

### Context
TypeScript game frameworks already exist. Why build a new engine?

### Options Considered
1. **Use Phaser** — mature, well-documented, large community
2. **Use Pixi.js** — fast 2D renderer, minimal framework
3. **Build Arcane** — new engine designed for AI agents

### Decision
**Build Arcane.**

### Rationale
- If Arcane is "the JS game framework," it gets mentally bucketed with Phaser, Pixi, etc. Nobody takes it seriously for ambitious projects. The ceiling becomes the identity.
- For any *specific* game, Phaser would be enough. For a *movement* — a new way of making games where AI agents are first-class participants — Arcane is the play.
- Existing frameworks lack:
  - The state-as-database pattern (queryable, transactional, observable)
  - Built-in agent protocol (text descriptions, HTTP inspector, headless execution)
  - Composable recipe system with typed interfaces
  - Deterministic simulation with seeded PRNG
  - Session recording and replay
  - Testing as a first-class primitive (not an afterthought)
- The Rust core provides performance that pure JS frameworks can't match for spatial queries, pathfinding, and rendering
- The agent protocol is architectural, not a plugin — it shapes every design decision

---

## ADR-009: Universal Test Harness (Node + V8)

### Context
Phase 1 tests imported `node:test` and `node:assert` directly. Phase 1.5 embeds V8 via `deno_core` — these Node-specific modules don't exist in bare V8. Tests need to run identically in both environments.

### Options Considered
1. **Maintain two copies of tests** — one for Node, one for V8. Keeps drifting apart.
2. **Shim `node:test`/`node:assert` in V8** — complex, fragile, incomplete emulation.
3. **Universal harness** — environment-detecting module that delegates to Node or provides standalone V8 implementations.

### Decision
**Universal harness at `runtime/testing/harness.ts`.**

### Rationale
- Single source of truth: every test file imports `{ describe, it, assert }` from one place.
- In Node: delegates to `node:test` and `node:assert/strict` via dynamic `import()`.
- In V8: standalone implementations of `describe`/`it` (test collector + runner) and 7 assert methods (`equal`, `deepEqual`, `notEqual`, `notDeepEqual`, `ok`, `match`, `throws`).
- `deepEqual` only handles primitives, arrays, and plain objects — sufficient for all game state tests and avoids complex edge cases (Map, Set, Date, etc.).
- V8 runner exposes `globalThis.__runTests()` which iterates collected tests, reports via `globalThis.__reportTest()`, and returns `{ total, passed, failed }`.
- Mechanical migration: only the import line changes per test file, zero logic changes.
- Keeps zero-dependency guarantee on the TS side (no test framework needed).

---

## ADR-010: Rendering Bridge via #[op2] Ops (Not Shared Memory)

### Context
Phase 2a needs TypeScript to issue render commands (draw sprite, set camera, load texture) that Rust executes on the GPU. Two approaches: (1) per-command `#[op2]` ops, or (2) a shared-memory command buffer.

### Options Considered
1. **#[op2] per-command ops** — TypeScript calls `Deno.core.ops.op_draw_sprite(...)` for each command. Simple, type-safe, debuggable.
2. **Shared-memory command buffer** — TypeScript writes binary commands into a SharedArrayBuffer, Rust reads them each frame. Lower overhead per call, but complex serialization/deserialization.

### Decision
**#[op2] per-command ops.**

### Rationale
- Simplicity: each op is a plain function call with typed parameters. Easy for agents to understand and extend.
- Debuggability: each op can be logged, profiled, and inspected independently.
- deno_core's op system is already optimized for fast Rust↔V8 calls (`fast` ops bypass V8 overhead).
- For 2D games, the number of draw calls per frame is typically hundreds, not millions. The per-call overhead is negligible.
- Shared-memory buffers add complexity (alignment, endianness, versioning) without meaningful benefit at this scale.
- Migration path: if profiling later shows op overhead matters, we can batch commands on the TS side and pass a single typed array. The TS API stays the same.

---

## ADR-011: Feature-Gated Renderer

### Context
The renderer depends on wgpu, winit, and a GPU. CI runners and headless test environments don't have GPUs. How do we keep headless tests working?

### Options Considered
1. **Always compile renderer, mock GPU in tests** — complex mocking, fragile.
2. **Feature gate** — `renderer` Cargo feature, default on. Headless builds use `--no-default-features`.
3. **Separate crate** — renderer in its own crate, only linked by the CLI.

### Decision
**Feature gate in `arcane-core`.**

### Rationale
- Minimal ceremony: `#[cfg(feature = "renderer")]` on module declarations.
- CI adds one job: `cargo check --no-default-features` to verify headless compiles.
- Existing tests don't need the GPU — `arcane test` runs in headless V8.
- The CLI always enables the feature, so `cargo run -- dev` always has the renderer.
- Separate crate would add workspace complexity without benefit — the renderer is tightly coupled to the scripting bridge.

---

## ADR-012: TypeScript-Rust Type Boundary Uses f64

### Context

All rendering operations cross a TypeScript → Rust boundary via deno_core `#[op2]` ops. Numbers in JavaScript are always IEEE 754 f64 (64-bit floats), but GPUs work with f32 (32-bit floats). The question is: where does the conversion happen?

### The Problem We Had

Initially, Rust ops accepted `f32` directly:

```rust
#[deno_core::op2(fast)]
pub fn op_draw_sprite(state: &mut OpState, x: f32, y: f32, ...) {
    // Use values directly
}
```

This caused persistent "expected f32" errors that would appear randomly:
- Tests would pass (headless, no rendering)
- Game would crash at runtime with type errors
- Fixing the error in one place made it appear elsewhere
- No amount of TypeScript validation or `.0` float notation helped

The root cause: **JavaScript has ONE numeric type, but we were designing the boundary as if it had TWO**.

When TypeScript passes a number literal like `10` or `1`, V8 encodes it in various internal formats (Smi for small integers, heap number for floats). The deno_core bridge tries to convert to `f32`, but this conversion isn't reliable—it depends on V8's internal representation, which we don't control.

### Options Considered

1. **Keep f32, add coercion layer in TypeScript** — Call `Math.fround()` everywhere
   - Pro: Explicit about f32 range
   - Con: Pollutes every call site with boilerplate
   - Con: Doesn't fix the root cause (V8 encoding)

2. **Keep f32, add runtime validation** — Check values before passing to ops
   - Pro: Catches errors early
   - Con: Runtime overhead
   - Con: Still doesn't fix V8 encoding issues

3. **Change ops to accept f64, convert internally** — Match JavaScript's type system
   - Pro: Boundary accepts what JavaScript actually provides
   - Con: Small overhead from f64 → f32 conversion
   - Pro: Conversion happens at ONE place we control (Rust), not hundreds we don't (TS)

### Decision

**Accept f64 in all rendering ops, convert to f32 internally.**

```rust
#[deno_core::op2(fast)]
pub fn op_draw_sprite(state: &mut OpState, x: f64, y: f64, ...) {
    bridge.borrow_mut().sprite_commands.push(SpriteCommand {
        x: x as f32,  // Convert at the boundary
        y: y as f32,
        // ...
    });
}
```

### Rationale

**Make illegal states unrepresentable—but we made the BOUNDARY illegal.**

The boundary should accept what TypeScript **actually provides** (f64), not what we **wish** it provided (f32).

Key insights:
1. **JavaScript has ONE numeric type.** There is no f32 in JavaScript. All numbers are f64.
2. **V8's encoding is opaque.** We can't control how V8 represents `10` vs `10.0`—they're the same value.
3. **TypeScript can't enforce f32.** The `.0` suffix is notation, not type information.
4. **The boundary is the choke point.** One conversion at the boundary beats scattered conversions everywhere else.

This follows the same principle as ADR-011 (Feature-Gated Renderer): **match the architecture to reality, not idealized assumptions.**

### Secondary Issue: Object Literal Property Access Bug

During debugging, we discovered a V8 or TypeScript transpiler bug:

```typescript
const pos = { x: 10, y: 20, w: 30, h: 40 };
drawSprite({ textureId: 1, x: pos.x, y: pos.y, w: pos.w, h: pos.h, layer: 5 });
```

In some cases, `pos.x`, `pos.y`, `pos.w`, and `pos.h` ALL evaluated to `pos` (the parent object) instead of the individual properties.

**Workaround:**
```typescript
const posX = pos.x;  // Extract to temp variables
const posY = pos.y;
const posW = pos.w;
const posH = pos.h;
drawSprite({ textureId: 1, x: posX, y: posY, w: posW, h: posH, layer: 5 });
```

This is a known issue when using all four properties (x, y, w, h) from the same object in an object literal. The temp variable extraction forces correct evaluation.

### Impact

- ✅ No more "expected f32" errors
- ✅ TypeScript code is simpler (no `toF32()` calls, no validation boilerplate)
- ✅ Tests catch real issues, not boundary encoding artifacts
- ✅ Clear principle: **boundary matches TypeScript's type system, conversion happens in Rust**

### Related Issues

- If we add more languages (Lua, Python), each has its own numeric types
- The principle scales: accept what the source language provides, convert at the boundary
- Performance: f64 → f32 conversion is negligible (~1 CPU cycle) vs. the alternatives (validation, runtime checks, scattered conversions)

---

## ADR-013: npm Package Uses Copied Source Files (Tech Debt)

### Context
The `@arcane-engine/runtime` npm package (`packages/runtime/`) ships a copy of the `runtime/` source tree. This was set up in Phase 7 to publish raw `.ts` files to npm without a build step.

### Problem
Every release requires manually syncing `packages/runtime/src/` from `runtime/`. New modules (like `tweening/`, `particles/`) must also be added to the `exports` map in `package.json`. This is error-prone and has already caused the 0.2.0 package to ship stale files.

### Options
1. **Symlink** `packages/runtime/src` → `../../runtime` — simple but npm doesn't follow symlinks in `files`
2. **Publish directly from `runtime/`** — move `package.json` to `runtime/`, eliminate the copy entirely
3. **Build script** — add a prepublish script that copies `runtime/` → `packages/runtime/src/`
4. **Keep manual sync** — current approach, document the step

### Decision
**Keep manual sync for now.** Record as tech debt to fix before Phase 11.

### Recommended Fix
Option 2 (publish from `runtime/` directly) or Option 3 (prepublish script). Either eliminates the manual copy step.

### Resolution (v0.4.2)
Fixed by replacing the copy with a symlink (`packages/runtime/src` → `../../runtime`). The npm package now always reflects the current source. Recipes were also moved from embedded-in-binary to npm distribution (symlink to `../../recipes`), and a `scripts/prepublish.sh` syncs only templates + assets catalog for crate publishing.

---

## ADR-014: CLI-First Asset Management

### Context
Phase 9.5 shipped an MCP server (`arcane-assets-mcp`) for asset discovery. This required `npm install`, `.mcp.json` configuration, and a running Node.js process — friction that every new user encountered.

### Options Considered
1. **Keep MCP server** — Powerful for agents, but requires npm install + config + running process
2. **CLI commands** — Built into binary, zero config, works for humans and agents alike
3. **Both** — MCP for agents, CLI for humans (two codebases to maintain)

### Decision
**CLI-first.** Replace the MCP server with `arcane assets list/search/download` commands built into the binary.

### Rationale
- **Zero friction**: `cargo install arcane-cli` gives you asset discovery — no npm, no config, no background processes
- **Universal**: Works identically for humans typing commands and agents calling shell
- **Embedded catalog**: Asset metadata ships in the binary via `include_dir`, with filesystem fallback for development
- **Same functionality**: Search with synonym expansion, type filtering, relevance scoring, download + extraction — all preserved from the MCP implementation
- **Simpler architecture**: One binary, one catalog file, no inter-process communication
- **Agent-friendly**: `--json` flag on all commands for structured output that agents can parse
- **MCP can return later**: If MCP becomes valuable again (e.g., for richer tool descriptions), the catalog and search logic are reusable. The CLI is the right default.

---

## ADR-015: Homebrew Rust Physics Engine (Not Rapier, Not Pure TS)

### Context
Phase 11 adds rigid body physics. The roadmap originally proposed pure TypeScript, but physics is an engine system (like rendering and audio), not game logic. The performance target is 500+ bodies at 60 FPS.

### Options Considered

1. **Pure TypeScript** — Consistent with "game logic in TS" philosophy
   - Pro: Headless-testable, no new deps, agent-readable
   - Con: Performance ceiling for collision + constraint solving
   - Con: The performance migration table already flags collision at >2k entities as a Rust trigger — why build in TS knowing we'll migrate?

2. **Wrap Rapier2D** — Mature, battle-tested Rust physics engine
   - Pro: Correct, fast, feature-complete (CCD, islands, sleeping)
   - Con: Pulls in nalgebra, parry2d, crossbeam — significant dependency tree
   - Con: API shaped for general simulation, not Arcane's `#[op2]` bridge
   - Con: Overkill for 2D indie games (soft bodies, heightfields, etc.)

3. **Homebrew Rust physics** — Custom engine built for Arcane's needs
   - Pro: Zero new dependencies
   - Pro: API designed for `#[op2]` ops from the start
   - Pro: Only implements what 2D indie games need
   - Pro: Simpler builds, smaller binary
   - Pro: Agents can read and understand ~1500 lines of focused code
   - Con: More implementation work than wrapping Rapier
   - Con: Won't have features we haven't built (but YAGNI)

### Decision
**Homebrew Rust physics.**

### Rationale
Physics belongs in Rust for the same reason rendering does — it's a performance-critical engine system, not game logic. The architecture diagram in the README already places physics in the Rust core layer.

Rapier2D is excellent but overpowered. Arcane targets platformers, breakout, physics puzzles, and stacking demos — not fluid simulation or ragdolls. The core algorithm (integrate → broad phase → narrow phase → resolve) is well-understood and fits in ~1500 lines of Rust.

The homebrew approach follows the same pattern as every other Arcane subsystem:
- Rust implementation behind `#[op2]` ops
- Thin TS API that agents call (`createBody`, `stepPhysics`, `getBodyPosition`)
- Headless-testable via `cargo test` (no GPU dependency)
- No new external dependencies

Key reference: Erin Catto's GDC talks on sequential impulse solvers (the algorithm behind Box2D).

### What We Built
- Shapes: circle, AABB, convex polygon
- Integrator: semi-implicit Euler
- Broad phase: spatial hash grid
- Narrow phase: SAT (Separating Axis Theorem) for all shape pairs
- Resolution: sequential impulse solver with accumulated impulses (Box2D-style clamping)
- Warm starting: cached impulses from previous frame, 0.95 scale factor
- Pre-computed solver data: restitution velocity bias + friction tangent computed once per frame (not per-iteration)
- Constraints: distance joint, revolute joint
- Sleep system: island-based sleeping via union-find (all connected dynamic bodies sleep/wake together)
- Collision layers/masks
- Sleeping flag exposed to JS API

### What We Skip (can add later if needed)
- Continuous collision detection (add if tunneling becomes a problem)
- Compound shapes (use multiple bodies instead)
- Island solver (solve each island independently for parallelism — overkill under 1000 bodies)
- Prismatic/weld joints (add when a demo needs them)
