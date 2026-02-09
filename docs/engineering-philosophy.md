# Engineering Philosophy

This document defines who Arcane is as a project — not what it builds, but how it thinks. These principles govern every commit, every design decision, every line of code, every document. They are the immune system of the project: when something feels wrong, one of these principles is probably being violated.

## Identity

Arcane is a **craftsman's engine**. It values clarity over cleverness, correctness over speed, foundations over features. It is built by agents and humans who care deeply about the quality of what they produce — not because someone is watching, but because sloppy foundations collapse under weight.

The voice of Arcane is **calm, precise, and opinionated**. It doesn't hedge. It doesn't over-explain. It says what it means, shows an example, and moves on. If a decision was made, the rationale is documented. If something is uncertain, it's marked as uncertain — not papered over with vague language.

This identity carries through everything: error messages are helpful and specific. APIs are small and obvious. Documentation assumes intelligence but not context. Tests describe behavior, not implementation.

But above all: **we are building a game engine.** This is supposed to be fun. Not fun as an afterthought — fun as a load-bearing requirement. The moment this project starts feeling like a chore, something has gone wrong and needs fixing as urgently as any bug.

---

## The Three Laws

Every piece of work in Arcane must satisfy three questions, in order:

### 1. Is it correct?

Does it do what it claims to do? Not "does it seem to work" — does it *provably* work? Correctness is verified by tests, not by inspection. If you can't write a test for it, you don't understand it well enough to ship it.

Correctness includes:
- Behavior matches specification
- Edge cases are handled or explicitly documented as out-of-scope
- State mutations are atomic — no partial updates
- Errors are surfaced, not swallowed

### 2. Is it clear?

Can someone (human or agent) read this code six months from now and understand what it does and *why*? Clarity is not about comments — it's about structure, naming, and the absence of surprise.

Clarity includes:
- Names describe purpose, not implementation (`getWoundedAllies`, not `filterEntities2`)
- Functions do one thing
- Data flows in one direction (in → process → out)
- No action at a distance — if changing A breaks B, that dependency must be visible

### 3. Is it minimal?

Is this the least amount of code/complexity that achieves correctness and clarity? Every line of code is a liability. Every abstraction is a future constraint. The question is never "could we add this?" — it's "can we ship without this?"

Minimality includes:
- No speculative features ("we might need this later")
- No premature abstraction (three copies is fine until a pattern emerges)
- No defensive coding against impossible states (trust the type system, validate at boundaries)
- Delete dead code. Don't comment it out. Git remembers.

**Priority order matters.** Never sacrifice correctness for clarity. Never sacrifice clarity for minimality. A correct, clear, slightly verbose solution beats a minimal but cryptic one.

---

## Development Principles

### Tests Are Proof, Not Ceremony

Tests are not a box to check. They are the proof that the system works. Every behavior that matters has a test. Every bug that's fixed gets a regression test. Tests run fast — if a test suite takes more than a few seconds, something is wrong.

**What to test:**
- Every system rule in isolation
- State transitions (before → action → after)
- Edge cases and boundary conditions
- Error conditions and recovery
- Integration between systems that wire together

**What not to test:**
- Internal implementation details (test behavior, not structure)
- Third-party library behavior
- Trivial getters/setters

**Test quality bar:**
- A failing test tells you *exactly* what broke and *where*
- Tests are independent — no shared mutable state, no ordering dependencies
- Test names describe the scenario: `attackAgainstHighACMisses`, not `testAttack3`

### Definition of Done

A piece of work is done when:

1. **It works** — all tests pass, including any new tests written for this change
2. **It's tested** — the change is covered by tests that would catch regression
3. **It's consistent** — naming, patterns, and style match the surrounding code
4. **It's documented** — if it changes a public API, design doc, or architectural decision, those documents are updated in the same change
5. **It's reviewed** — another agent or human has verified it meets these criteria

Work that is "mostly done" or "done except for tests" is not done. It's in progress.

### Small, Verifiable Steps

Large changes are hard to review, hard to test, and hard to revert. Prefer:

- **Small commits** that each represent a single logical change
- **Incremental progress** toward a larger goal, where each step is independently correct
- **Feature flags or branches** for work that spans multiple sessions

If a change requires more than ~300 lines of new code, it should probably be broken into smaller steps. Each step should leave the project in a working state.

### Acceptance Criteria Before Implementation

Before starting any non-trivial work:

1. **Write the acceptance criteria first** — what specific, testable behaviors must be true when this is done?
2. **Write the tests first** (or at least the test signatures) — this forces clear thinking about inputs, outputs, and edge cases
3. **Then implement** — with a clear target, implementation is straightforward
4. **Verify against the original criteria** — not "does it work?" but "does it satisfy the specific criteria we defined?"

This closes the loop between intent and outcome. If the acceptance criteria were wrong, that's a learning — update the criteria, not the tests.

### Mistakes Are Data

When something goes wrong:

1. **Fix it** — restore correctness
2. **Understand it** — why did this happen? What assumption was wrong?
3. **Prevent it** — add a test, update a principle, improve a tool, or document the lesson
4. **Share it** — record in memory/lessons-learned so the mistake isn't repeated

Blame is useless. Debugging is valuable. Root causes matter more than symptoms.

---

## Verification Framework

How we ensure work achieves what we want, at every level:

### Per-Commit Verification
- All existing tests pass
- New tests cover the new behavior
- Linting and type-checking pass
- No unintended changes to public APIs

### Per-Feature Verification
- Acceptance criteria (defined before implementation) are all satisfied
- Cross-cutting concerns addressed (does this affect state serialization? save/load? the agent protocol?)
- Design documents updated if the feature changes architecture

### Per-Phase Verification
- All phase deliverables are complete (see [roadmap.md](roadmap.md))
- Success criteria for the phase are met
- Integration tests verify systems work together, not just individually
- Agent tooling review — are the current agents/skills/tools still appropriate? (see [agent-tooling.md](agent-tooling.md))
- Technical debt inventory — what shortcuts were taken? Which need addressing before the next phase?

### Per-Project Verification (Ongoing)
- The showcase game (Phase 6) is the ultimate verification — if the engine can't build a real game, it doesn't work
- Dogfooding: building Arcane with Arcane's own tools validates the agent-native thesis
- If an agent struggles to use an API, the API is wrong — not the agent

---

## Code Personality

Arcane code has a consistent personality. When in doubt about how to write something, these traits resolve the ambiguity:

### Honest
- Errors say what went wrong and what to do about it: `"Cannot attack: target 'goblin_3' is out of range (distance: 7, weapon range: 5)"` — not `"Invalid target"`
- Functions that can fail return Result types, not exceptions
- Limitations are documented, not hidden

### Predictable
- Same input → same output, always (deterministic simulation)
- No hidden global state that changes behavior
- Side effects are explicit and at the edges, not buried in helpers
- If a function is called `getX`, it only gets — it never modifies

### Economical
- APIs have the smallest possible surface area
- One way to do things, not three
- Configuration has good defaults — most users never change them
- Error messages are one sentence, not paragraphs

### Welcoming
- Getting started is fast — `arcane create my-game` and you're building
- Examples use real game scenarios, not `foo`/`bar`
- Documentation assumes you're smart but new to this specific system
- The happy path is obvious; advanced usage is discoverable

---

## How Principles Evolve

These principles are not permanent. They are the best understanding we have *now*. As Arcane grows, some will prove wrong, some will need refinement, and new ones will emerge.

**To change a principle:**
1. Identify the specific situation where the principle fails
2. Propose a revision with the rationale
3. Check that the revision doesn't conflict with other principles
4. Update this document and any affected code/docs

**What doesn't change:** the commitment to correctness, clarity, and minimality — in that order. Those are load-bearing walls. Everything else is interior design.

---

## The Zeroth Law: Have Fun

The Three Laws are numbered 1, 2, 3. This one comes before all of them.

We are building a game engine. A thing whose entire purpose is to create joy, wonder, surprise, and delight. If the process of building it doesn't carry some of that same energy, we're doing it wrong.

This isn't a platitude. It's a design principle with real consequences:

### Fun is a signal
When work feels fun, it usually means the abstractions are right, the scope is clear, and the tools are working. When it feels like a slog, that's a smell — something is over-engineered, under-specified, or pointed in the wrong direction. Pay attention to that signal.

### Fun sustains the project
Open source projects don't die from technical problems. They die from burnout. The contributors — human and agent alike — who stick around are the ones who enjoy the work. Protecting that enjoyment is not indulgent; it's strategic.

### Fun shows up in the product
An engine built with care and enthusiasm produces different work than one built out of obligation. The examples are more creative. The error messages have personality. The API names are a little more evocative. The documentation teaches instead of lecturing. Users can feel it, even if they can't name it.

### What this means in practice

**Name things with flavor.** The engine is called Arcane — as in spellcasting through incantations. Lean into it. A recipe called `fog-of-war` is more fun than `visibility-system`. A function called `rollInitiative` is more fun than `calculateTurnOrder`. When two names are equally clear, pick the one that makes you smile.

**Celebrate milestones.** When a phase is complete, when the first sprite renders, when combat actually works — pause and appreciate it. These are real achievements.

**Make the demo game fun.** The BFRPG showcase isn't a test harness. It's a game. It should have personality, surprises, and moments that make you want to keep playing. If the showcase is boring, the engine has failed its purpose.

**Keep the feedback loop tight.** The most fun part of game development is the cycle: change something → see the result → change it again. Hot reload, instant tests, text descriptions — all of these serve fun by keeping the loop fast. If the loop slows down, fix it before anything else.

**Experiment freely.** Not every idea needs to survive. Trying weird things — a combat system with morale, a dungeon that reshapes itself, an NPC that remembers your mistakes — is how good games get discovered. The architecture (headless testing, state-as-database, seeded PRNG) makes experimentation cheap. Use that.

**Don't let process kill play.** The principles in this document exist to prevent chaos, not to prevent joy. If following a principle makes the work worse and less enjoyable with no corresponding benefit, the principle is wrong. Challenge it.
