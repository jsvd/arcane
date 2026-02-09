# Contributing to Arcane

Arcane is built by humans and AI agents working together. This guide covers both.

## Before You Start

Read these first:
- [README.md](README.md) — what Arcane is
- [docs/engineering-philosophy.md](docs/engineering-philosophy.md) — how we build (The Three Laws, Definition of Done)
- [CLAUDE.md](CLAUDE.md) — agent-specific instructions

## The Contribution Workflow

### 1. Pick or Propose Work

- Check the roadmap ([docs/roadmap.md](docs/roadmap.md)) for current phase priorities
- Open an issue describing what you want to do *before* building it
- For bugs: describe the actual vs expected behavior, with steps to reproduce
- For features: describe the user-facing behavior, not the implementation

### 2. Write Acceptance Criteria

Before writing code, define what "done" looks like:

```markdown
## Acceptance Criteria
- [ ] A combat round with 3 participants resolves in correct initiative order
- [ ] Tied initiative is broken by DEX modifier
- [ ] Tests cover: normal order, tied initiative, single combatant, empty round
```

This is not optional. It's how we verify work achieves what we want.

### 3. Implement in Small Steps

- Branch from `main`
- Make small, focused commits (one logical change per commit)
- Each commit should leave the project in a working state
- Write tests alongside implementation, not after

### 4. Verify

- All existing tests pass
- New tests cover the new behavior
- Type-checking and linting pass
- Acceptance criteria are all satisfied
- Design documents updated if architecture changed

### 5. Submit

- Open a PR with a clear description of *what* and *why*
- Link to the acceptance criteria
- Note any design decisions made during implementation

## For AI Agents

You are a first-class contributor. The codebase is designed for you.

**How to orient yourself:**
1. Read `CLAUDE.md` — it's your entry point
2. Read `docs/engineering-philosophy.md` — it governs your work
3. Read the relevant design doc for whatever you're building
4. Check `docs/glossary.md` if terminology is unclear

**How to work effectively:**
- Write acceptance criteria before code
- Use the headless test harness — don't depend on rendering to verify logic
- Prefer the query API over manual state traversal
- When unsure about naming, check the glossary
- When unsure about an API decision, check `docs/api-design.md`

**How to handle uncertainty:**
- If requirements are ambiguous, document your interpretation and flag it
- If a design doc contradicts itself, open an issue rather than guessing
- If you discover a gap in the design, document it — don't silently work around it

**Working as a teammate:**
- Check the shared task list for assigned or available work
- Claim unblocked tasks, prefer lowest ID first
- Own your files — don't edit files another teammate is working on
- Message the lead when blocked or when a task surfaces new work
- Mark tasks completed when done, then check for next available work

## For Humans

Arcane is agent-native, but human-usable. You don't need to work like an agent.

**Quick start:**
1. Read the README
2. Look at examples in the design docs
3. Pick something from the roadmap
4. Ask questions in issues — the design docs explain *what* but sometimes not *why*

**Where humans add the most value:**
- Visual design and art direction
- Playtesting and "feel" feedback
- Architecture review (do the pieces actually fit together?)
- Edge cases that emerge from real gameplay, not synthetic tests

## Building and Testing

### Prerequisites
- **Node.js 24+** (native TypeScript stripping via `--experimental-strip-types`)
- **Rust stable** (latest, with `cargo`)

### Running Tests

```bash
# TypeScript tests via Node
./run-tests.sh

# TypeScript tests via V8 (embedded in Rust)
cargo run -- test

# Rust integration tests
cargo test --workspace

# All three should pass before submitting a PR.
```

### Building

```bash
# Check compilation
cargo check --workspace

# Check headless compilation (no GPU deps)
cargo check -p arcane-core --no-default-features

# Full build (debug)
cargo build --workspace

# The CLI binary is at target/debug/arcane
```

### Running Visual Demos

Visual demos require a GPU. They use the `arcane dev` command which opens a window.

```bash
# Sokoban with solid-color sprites
cargo run -- dev demos/sokoban/sokoban-visual.ts

# Controls: Arrow keys or WASD to move, Z to undo, R to reset
# Hot-reload: edit the .ts file and save — the game reloads automatically
```

### Test Harness

All test files import from `runtime/testing/harness.ts` — a universal harness that works in both Node and V8. **Do not import from `node:test` or `node:assert` directly.** The harness provides `describe`, `it`, and `assert` (with `equal`, `deepEqual`, `notEqual`, `notDeepEqual`, `ok`, `match`, `throws`).

## Code Style

### TypeScript
- Strict mode, always
- Prefer `const` over `let`, never `var`
- Prefer pure functions over methods
- Types over interfaces for data shapes
- No `any` — if you can't type it, redesign it

### Rust
- Follow standard `rustfmt` formatting
- Use `clippy` at the default warning level
- Prefer explicit error types over `anyhow` in public APIs
- Document unsafe blocks with a safety comment

### Both
- Names describe purpose, not implementation
- Functions do one thing
- No abbreviations in public APIs (`getCharacter`, not `getChar`)
- No commented-out code — Git remembers

## Commit Messages

```
<what-changed>: <why>

Acceptance criteria: <link or inline>

Co-Authored-By: <if applicable>
```

Examples:
- `Add initiative tiebreaking by DEX modifier`
- `Fix transaction rollback leaving orphaned observers`
- `Remove unused spatial index from combat system`

The first line is imperative mood, present tense, under 72 characters.

## What We Don't Accept

- Changes without tests
- Changes that break existing tests without explanation
- Speculative features not on the roadmap
- "Improvements" to code that isn't being changed for another reason
- PRs that change everything at once instead of incrementally
