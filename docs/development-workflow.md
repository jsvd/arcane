# Development Workflow

How we actually use Claude Code to build Arcane efficiently. This is the operational playbook — not what we build, but how we wield the tools.

## Model Selection

Not every task needs the same model. Using the right model for the task saves time, money, and context window.

| Model | When to Use | Examples |
|---|---|---|
| **Opus** | Architecture decisions, complex system design, tricky debugging, cross-cutting changes, anything that requires holding a lot of context at once | Designing the state transaction system, debugging a subtle Rust↔V8 bridge issue, reviewing whether a change is consistent across 5 docs |
| **Sonnet** | Most implementation work — clear requirements, well-scoped tasks, straightforward coding | Implementing a specific system rule, writing tests for a defined behavior, adding a new recipe, routine refactoring |
| **Haiku** | Quick tasks with narrow scope — lookups, simple edits, formatting, running commands | Searching for a function definition, fixing a typo, running the test suite, checking types, generating boilerplate |

**Rule of thumb:** Start with Sonnet. Escalate to Opus when you're stuck, when the problem spans multiple systems, or when a design decision has long-term consequences. Drop to Haiku for the small stuff.

**Don't use Opus for:**
- Writing straightforward implementations from clear specs
- Running tests or builds
- Simple file edits

**Don't use Haiku for:**
- Anything requiring judgment about architecture or trade-offs
- Code that other systems will depend on heavily
- First-time implementations of core patterns (the pattern needs to be right)

## Parallel Development with Git Worktrees

### Why Worktrees

Claude Code runs one conversation per working directory. Git worktrees let us run multiple Claude Code instances simultaneously on different branches, in different directories, with no conflicts. This is the single biggest efficiency multiplier.

### Setup

```bash
# Main worktree is the integration point
cd /Users/arkham/project/arcane

# Create worktrees for parallel work
git worktree add ../arcane-state feature/state-management
git worktree add ../arcane-prng feature/deterministic-prng
git worktree add ../arcane-rust feature/rust-skeleton
```

Each worktree:
- Has its own directory
- Has its own branch
- Can have its own Claude Code session
- Shares the same git history

### Worktree Naming Convention

```
arcane/              # Main worktree — integration, docs, releases
arcane-<feature>/    # Feature worktrees — one per parallel workstream
```

### Merging Back

When a feature branch is ready:

```bash
cd /Users/arkham/project/arcane        # Main worktree
git merge feature/state-management     # Merge the feature
git worktree remove ../arcane-state    # Clean up the worktree
```

### When to Use Worktrees

Use separate worktrees when:
- Two workstreams touch different files (Rust core vs TS runtime)
- A task will take multiple sessions and shouldn't block other work
- You want to experiment without risking the main branch

Don't use separate worktrees when:
- Tasks are sequential (B depends on A's output)
- Changes touch the same files (merge conflicts negate the parallelism)
- The task is small enough to finish in one session

## Concurrency Strategy

### What Can Run in Parallel

The architecture naturally splits into independent workstreams:

**Phase 1 parallel opportunities:**

```
Workstream A (TS Runtime)          Workstream B (Rust Skeleton)
─────────────────────────          ────────────────────────────
State tree + types                 Cargo workspace setup
Transactions + diffs               deno_core V8 embedding spike
Query API                          Basic TS↔Rust bridge
Observers                          CLI skeleton (arcane test)
PRNG
Headless test harness
```

Workstream A needs zero Rust. Workstream B needs minimal TS. They converge when we wire the TS runtime into the Rust host — but that's the end of Phase 1, not the beginning.

**Within a single session, use subagents for:**
- Researching multiple libraries simultaneously
- Running tests while continuing to write code
- Exploring different parts of the codebase in parallel
- Reading multiple files/docs to gather context

### What Must Be Sequential

- **Core patterns first.** The state tree type system, the transaction model, the query API — these set patterns everything else follows. Get these right with Opus before parallelizing the work that depends on them.
- **Integration after parallel work.** After two branches develop independently, merging and integration testing happens sequentially on the main worktree.
- **Design decisions that affect multiple systems.** If a choice in the state system affects how recipes work, that decision must be made before both systems are built in parallel.

### The Fork-Join Pattern

Most efficient pattern for a phase:

```
1. DESIGN (sequential, Opus)
   Define the interfaces, types, and patterns for this phase.
   This is the "fork point" — everything downstream depends on this.

2. IMPLEMENT (parallel, Sonnet)
   Fork into worktrees. Each implements against the defined interfaces.
   Independent workstreams, independent Claude Code sessions.

3. INTEGRATE (sequential, Opus)
   Merge branches. Run integration tests. Fix conflicts.
   Verify the pieces actually work together.

4. VERIFY (parallel, Sonnet/Haiku)
   Run full test suite, check docs, audit for consistency.
```

## Session Management

### Starting a Session

Every Claude Code session should begin with orientation:

1. Read `CLAUDE.md` (automatic — it's the project instructions)
2. Check git status — what branch, what's changed, what's in progress
3. Check the current phase in `docs/roadmap.md`
4. Read the relevant design doc for the current task

### Ending a Session

Before ending a session:

1. Commit all work (even if WIP — use a `wip:` prefix)
2. Run tests to confirm nothing is broken
3. If work is unfinished, leave a clear note in the commit message about what's next
4. If a design question surfaced, document it as an issue or TODO

### Context Window Efficiency

The context window is finite. Treat it like a resource:

- **Front-load reads.** Read the files you need at the start, not scattered throughout.
- **Use subagents for exploration.** Deep codebase searches eat context. Delegate to Explore agents.
- **Don't re-read files you've already read** in the same session unless they've changed.
- **Keep conversations focused.** One task per session. If scope creeps, start a new session.
- **Summarize before continuing.** After a long exploration or debugging session, summarize findings before acting on them — this compresses context.

## Task Sizing

### Right-Sized Tasks

A good task for one Claude Code session:
- Has clear acceptance criteria
- Touches 1-5 files
- Can be completed and tested in one sitting
- Produces a meaningful, reviewable commit

### Too Small (Overhead Exceeds Value)
- Fix a single typo (just do it inline)
- Rename one variable
- Add one import

### Too Large (Needs Decomposition)
- "Implement the state management system" → break into: state tree types, transactions, queries, observers, PRNG — each is a session
- "Build the renderer" → break into: window creation, tilemap rendering, sprite rendering, lighting — each is a session
- "Add combat" → break into: initiative, attack resolution, spell casting, conditions, death — each is a session

### Decomposition Rule

If you can't write the acceptance criteria for a task on one screen, it's too big. Split it until each piece has crisp, testable criteria.

## Efficiency Patterns

### The Spike-Then-Build Pattern

For unfamiliar territory (new library, new pattern, uncertain design):

1. **Spike** (Opus, exploratory, throwaway) — build the smallest possible thing that proves the approach works. Don't worry about quality.
2. **Evaluate** — does this actually work? Are there surprises? Does the design doc need updating?
3. **Build** (Sonnet, production quality) — now build it properly, informed by what you learned.

The spike is disposable. Its only purpose is knowledge. Don't polish spikes.

### The Test-First Pattern

For well-understood territory (clear spec, known patterns):

1. Write the test (describes what should happen)
2. Run it (it fails — good)
3. Implement (make it pass)
4. Refactor (clean up, guided by The Three Laws)

This is faster than writing implementation first because the test defines "done" upfront.

### The Parallel Exploration Pattern

When you need to make a decision between approaches:

```
Subagent A: Research approach 1, find examples, identify trade-offs
Subagent B: Research approach 2, find examples, identify trade-offs
Main agent: Compare results, decide, implement
```

Don't serialize research. Parallelize it with subagents, then synthesize.

## Checklist: Before Starting Phase 1

- [ ] Create worktree for TS runtime: `git worktree add ../arcane-ts feature/ts-runtime`
- [ ] Create worktree for Rust skeleton: `git worktree add ../arcane-rust feature/rust-skeleton`
- [ ] Design core interfaces first (sequential, Opus): state tree types, transaction API, query API
- [ ] Then fork: TS implementation in one worktree, Rust scaffolding in another
- [ ] Define CI pipeline early so every commit is verified
