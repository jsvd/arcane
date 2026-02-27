# Technical Decisions

Architecture Decision Records (ADRs) for Arcane. Each decision documents the context, options considered, choice made, and rationale.

---

## Foundational Choices (ADR-001 through ADR-008)

| Decision | Choice | Key Reason |
|---|---|---|
| Engine language | Rust | Performance + memory safety + wgpu ecosystem |
| Scripting language | TypeScript | LLM fluency + V8 embedding via deno_core |
| GPU abstraction | wgpu 24 | Cross-platform (Vulkan/Metal/DX12/WebGPU) |
| V8 embedding | deno_core | Efficient FFI between Rust and V8, hot-reload support |
| Scope | 2D only | 3D art pipelines incompatible with agent authoring |
| Renderer | Built-in | Avoids lowest-common-denominator abstraction trap |
| License | Apache 2.0 | Permissive + patent protection |
| Why not Phaser/Pixi | Build Arcane | State-as-database, agent protocol, deterministic simulation — none exist in other frameworks |

---

## ADR-009: Universal Test Harness (Node + V8)

### Context
Phase 1 tests imported `node:test` and `node:assert` directly. Phase 1.5 embeds V8 via `deno_core` — these Node-specific modules don't exist in bare V8. Tests need to run identically in both environments.

### Decision
**Universal harness at `runtime/testing/harness.ts`.**

### Rationale
- Single source of truth: every test file imports `{ describe, it, assert }` from one place.
- In Node: delegates to `node:test` and `node:assert/strict` via dynamic `import()`.
- In V8: standalone implementations of `describe`/`it` (test collector + runner) and 7 assert methods.
- V8 runner exposes `globalThis.__runTests()` which iterates collected tests, reports via `globalThis.__reportTest()`, and returns `{ total, passed, failed }`.
- Mechanical migration: only the import line changes per test file, zero logic changes.

---

## ADR-010: Rendering Bridge via #[op2] Ops (Not Shared Memory)

### Context
Phase 2a needs TypeScript to issue render commands that Rust executes on the GPU. Two approaches: per-command `#[op2]` ops, or a shared-memory command buffer.

### Decision
**#[op2] per-command ops.**

### Rationale
- Simplicity: each op is a plain function call with typed parameters.
- Debuggability: each op can be logged, profiled, and inspected independently.
- deno_core's op system is already optimized for fast Rust-V8 calls.
- For 2D games, draw calls per frame are hundreds, not millions. Per-call overhead is negligible.
- Migration path: if profiling shows op overhead matters, batch commands on the TS side.

---

## ADR-011: Feature-Gated Renderer

### Context
The renderer depends on wgpu, winit, and a GPU. CI runners and headless test environments don't have GPUs.

### Decision
**Feature gate in `arcane-core`.** `renderer` Cargo feature, default on. Headless builds use `--no-default-features`.

### Rationale
- Minimal ceremony: `#[cfg(feature = "renderer")]` on module declarations.
- CI adds one job: `cargo check --no-default-features` to verify headless compiles.
- Existing tests don't need the GPU — `arcane test` runs in headless V8.

---

## ADR-012: TypeScript-Rust Type Boundary Uses f64

### Context
All rendering operations cross a TypeScript-Rust boundary via deno_core `#[op2]` ops. Numbers in JavaScript are always IEEE 754 f64, but GPUs work with f32. Initially, Rust ops accepted `f32` directly, causing persistent "expected f32" errors.

### Decision
**Accept f64 in all rendering ops, convert to f32 internally.**

```rust
#[deno_core::op2(fast)]
pub fn op_draw_sprite(state: &mut OpState, x: f64, y: f64, ...) {
    bridge.borrow_mut().sprite_commands.push(SpriteCommand {
        x: x as f32,  // Convert at the boundary
        y: y as f32,
    });
}
```

### Rationale
- JavaScript has ONE numeric type (f64). There is no f32 in JavaScript.
- V8's encoding is opaque — we can't control how V8 represents `10` vs `10.0`.
- The boundary should accept what TypeScript **actually provides** (f64), not what we **wish** it provided (f32).
- One conversion at the boundary beats scattered conversions everywhere else.

### Secondary Issue: Object Literal Property Access Bug
When using all four properties (x, y, w, h) from the same object in an object literal, V8 sometimes evaluates them incorrectly. Workaround: extract to temp variables first.

---

## ADR-013: npm Package Uses Copied Source Files (Tech Debt)

### Context
The `@arcane-engine/runtime` npm package shipped a copy of the `runtime/` source tree, requiring manual sync on every release.

### Resolution (v0.4.2)
Fixed by replacing the copy with a symlink (`packages/runtime/src` -> `../../runtime`). The npm package now always reflects the current source.

---

## ADR-014: CLI-First Asset Management

### Context
Phase 9.5 shipped an MCP server for asset discovery, requiring npm install + config + running Node.js process.

### Decision
**CLI-first.** Replace the MCP server with `arcane assets list/search/download` commands built into the binary.

### Rationale
- Zero friction: `cargo install arcane-engine` gives you asset discovery.
- Universal: Works identically for humans and agents.
- Embedded catalog: Asset metadata ships in the binary via `include_dir`.
- `--json` flag on all commands for structured output that agents can parse.

---

## ADR-015: Homebrew Rust Physics Engine (Not Rapier)

### Context
Phase 11 adds rigid body physics. The performance target is 500+ bodies at 60 FPS.

### Options
1. **Pure TypeScript** — Consistent with "game logic in TS" philosophy, but performance ceiling.
2. **Wrap Rapier2D** — Mature, but pulls in nalgebra/parry2d, overkill for 2D indie games.
3. **Homebrew Rust physics** — Zero new dependencies, API designed for `#[op2]` ops.

### Decision
**Homebrew Rust physics.**

### Rationale
- Physics belongs in Rust for the same reason rendering does — performance-critical engine system.
- Rapier2D is excellent but overpowered for platformers, breakout, physics puzzles.
- Core algorithm (integrate -> broad phase -> narrow phase -> resolve) fits in ~1500 lines.

### What We Built
- Shapes: circle, AABB, convex polygon
- Integrator: semi-implicit Euler
- Broad phase: spatial hash grid
- Narrow phase: SAT for all shape pairs
- Resolution: sequential impulse solver with warm starting
- Constraints: distance joint, revolute joint
- Sleep system: island-based via union-find

---

## ADR-016: Single Binary Distribution

### Context
Arcane published 4 packages per release (2 npm, 2 crates.io), causing user friction, staleness bugs, and release complexity.

### Decision
**Single binary distribution.** Embed runtime + templates in CLI. `cargo install arcane-engine` is the only step.

### Rationale
- Runtime TS source is ~888KB — trivial to embed.
- Eliminates entire class of staleness bugs (npm version mismatches).
- Release process drops from 7 files + 4 packages to 3 files + 2 crates.

---

## ADR-017: Geometry Pipeline over Texture-Based Shapes

### Context
Shape drawing (circles, lines, arcs) was implemented by rasterizing shapes into scanline sprites. `drawCircle()` used ~80 scanline sprites per call.

### Decision
**Geometry pipeline** (`core/src/renderer/geometry.rs`, `shaders/geom.wgsl`).

### Rationale
- Triangles are the native GPU primitive; no caching, no textures.
- Dynamic shapes (varying radius, arc angle) are free — just different vertex data.
- Pre-baked textures blur at scale and waste VRAM.
- Geometry pipeline shares sprite pipeline's camera bind group, renders after sprites using `LoadOp::Load`.

---

## ADR-018: Rust-Native Particle Simulation

### Context
The TS particle system issued one `drawSprite()` op call per particle per frame. At 200 particles and 60 FPS, that's 12,000 op crossings per second.

### Decision
**Rust simulation with packed float array readback** (`core/src/scripting/particle_ops.rs`).

### Rationale
- Particle simulation is pure math (integrate position, decay alpha, kill expired) — no game logic. It belongs in the engine core.
- One `op_update_emitter(id, dt, cx, cy)` call replaces N `drawSprite()` calls.
- Readback via `op_get_emitter_sprite_data(id)` returns a packed `Float32Array` that TS renders.
- Original TS particle system remains as headless-compatible fallback.
