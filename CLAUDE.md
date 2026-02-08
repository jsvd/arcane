# Arcane — Agent Instructions

## What This Is

Arcane is a code-first, test-native, agent-native 2D game engine. Rust core for performance, TypeScript scripting for game logic.

**Current status: Phase 0 — Design documents only. No code yet.**

## Repository Structure

```
arcane/
├── README.md                      — Vision, elevator pitch, quick overview
├── CLAUDE.md                      — You are here
├── CONTRIBUTING.md                — How to contribute (humans and agents)
├── LICENSE                        — Apache 2.0
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
│   ├── roadmap.md                 — Phased development plan
│   └── technical-decisions.md     — ADR-style decision log
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

## What NOT to Do (Phase 0)

- Do not write implementation code. This is design phase only.
- Do not create Cargo.toml, package.json, or any build files.
- Do not scaffold directory structures beyond `docs/`.
- Do not make technology commitments beyond what's documented in `technical-decisions.md`.

## Agent Tooling

See `docs/agent-tooling.md` for the full specification of agents, skills, and MCP tools used to develop Arcane. The tooling set evolves with the project — review it at each phase transition.
