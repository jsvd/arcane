# Arcane — Agent Instructions

## What This Is

Arcane is a code-first, test-native, agent-native 2D game engine. Rust core for performance, TypeScript scripting for game logic.

**Current status: Phase 1.5 — Rust skeleton + V8 bridge. TypeScript runs inside Rust.**

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
│   ├── agent-protocol.md          — How AI agents interact with the engine
│   ├── game-state.md              — State management, transactions, queries
│   ├── systems-and-recipes.md     — Declarative game systems framework
│   ├── world-authoring.md         — Code-defined scenes, worlds, tilemaps
│   ├── agent-tooling.md           — Claude Code agents, skills, MCP tools
│   ├── development-workflow.md    — Parallel dev, model selection, worktrees
│   ├── roadmap.md                 — Phased development plan
│   └── technical-decisions.md     — ADR-style decision log
├── core/                          — arcane-core lib crate
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   └── scripting/
│   │       ├── mod.rs             — Public API: TsModuleLoader, ArcaneRuntime, run_test_file
│   │       ├── module_loader.rs   — TsModuleLoader: TS transpilation via deno_ast
│   │       ├── runtime.rs         — ArcaneRuntime: V8 + module loader + crypto polyfill
│   │       └── test_runner.rs     — V8 test runner with #[op2] result reporting
│   └── tests/                     — Rust integration tests
├── cli/                           — arcane-cli bin crate
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                — clap CLI entrypoint
│       └── commands/
│           ├── mod.rs
│           └── test.rs            — `arcane test` — discovers & runs *.test.ts in V8
├── runtime/
│   ├── testing/
│   │   └── harness.ts             — Universal test harness (Node + V8)
│   └── state/
│       ├── types.ts               — EntityId, Vec2, DeepReadonly
│       ├── error.ts               — ArcaneError, createError()
│       ├── prng.ts                — PRNGState, seed(), rollDice(), xoshiro128**
│       ├── transaction.ts         — Mutation, Diff, transaction(), computeDiff()
│       ├── query.ts               — query(), get(), has(), filter combinators
│       ├── observe.ts             — ObserverRegistry, path pattern matching
│       ├── store.ts               — GameStore, createStore()
│       └── index.ts               — Public API barrel export
├── demos/
│   ├── sokoban/                   — Phase 1 demo: grid puzzle
│   └── card-battler/              — Phase 1 demo: card game
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

## Phase 1.5 Constraints

- TypeScript code lives under `runtime/`. Rust code under `core/` and `cli/`.
- TS runtime has zero external dependencies. Rust crates use deno_core, deno_ast, clap, tokio, anyhow.
- All state management functions are pure: state in, state out.
- TS files use `.ts` extension imports (no bundler).
- Test files import from `runtime/testing/harness.ts` (not `node:test`/`node:assert` directly).
- Tests must pass in both Node (`./run-tests.sh`) and V8 (`cargo run -- test`).
- Pin exact versions of deno_core and deno_ast to avoid API churn.

## Agent Tooling

See `docs/agent-tooling.md` for the full specification of agents, skills, and MCP tools used to develop Arcane. The tooling set evolves with the project — review it at each phase transition.

### Agent Teams

Arcane supports coordinated multi-session development via agent teams. See `docs/development-workflow.md` for the full workflow (when to use teams vs subagents vs worktrees, task sizing, model selection). Teammates read this file automatically and should follow all conventions above. **File ownership discipline is critical in team mode** — each teammate owns distinct files, no two teammates edit the same file simultaneously.
