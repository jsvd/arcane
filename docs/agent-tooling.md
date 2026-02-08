# Agent Tooling

How Claude Code develops Arcane: the agents, skills, and MCP tools needed, and the process for evolving them.

## Philosophy

Arcane is built by AI agents. The tooling for building Arcane should itself be agent-native. This means:

1. **Specialized agents** for distinct domains (Rust core, TS runtime, game design)
2. **Skills** for common workflows (test, build, create recipe, etc.)
3. **MCP tools** for engine-specific operations (inspect state, describe scene, run headless)
4. **Self-evolution** — the tooling set is reviewed and updated as the project matures

## Agents

Agents are defined in `AGENTS.md` files. Each handles a specific domain.

### Phase 1 Agents (Design + Early Implementation)

#### `rust-engine` — Rust Core Agent
- **When**: Working on anything under `core/` — renderer, physics, audio, ECS, platform
- **Tools**: Cargo build/test/clippy, wgpu docs, Rust analyzer
- **Knowledge**: Rust idioms, wgpu API, deno_core FFI patterns, Bevy ecosystem reference
- **File scope**: `core/**/*.rs`, `Cargo.toml`, `Cargo.lock`

#### `ts-runtime` — TypeScript Runtime Agent
- **When**: Working on anything under `runtime/` — state, systems, world, entities, events
- **Tools**: Node/Deno test runner, TypeScript compiler, npm
- **Knowledge**: TypeScript patterns, functional state management, ECS in TS
- **File scope**: `runtime/**/*.ts`, `package.json`, `tsconfig.json`

#### `game-design` — Game Design Agent
- **When**: Designing systems, recipes, world specs, or validating game logic against BFRPG rules
- **Tools**: BFRPG rulebook reference, recipe template generator
- **Knowledge**: BFRPG v4 rules, turn-based combat mechanics, RPG design patterns
- **File scope**: `recipes/**/*`, `docs/**/*.md`

#### `arcane-test` — Test Agent
- **When**: Writing or running tests for any layer
- **Tools**: `arcane test` (headless TS), `cargo test` (Rust), integration test runner
- **Knowledge**: Testing patterns for game logic, state-based testing, deterministic test seeds
- **File scope**: `**/*.test.ts`, `**/tests/**`

#### `docs-architect` — Documentation Agent
- **When**: Updating design documents, ensuring cross-document consistency
- **Tools**: Markdown linter, link checker, document structure validator
- **Knowledge**: ADR format, Arcane architecture, document cross-references
- **File scope**: `docs/**/*.md`, `README.md`, `CLAUDE.md`

### Phase 3+ Agents (When Agent Protocol Exists)

#### `agent-protocol` — Agent Protocol Agent
- **When**: Working on the agent protocol, CLI commands, HTTP inspector API
- **Tools**: HTTP client for testing inspector API, `arcane describe`/`arcane inspect`
- **Knowledge**: REST API design, text rendering, game state serialization
- **File scope**: `cli/agent.rs`, `runtime/testing/describe.ts`, agent protocol tests

#### `recipe-builder` — Recipe Builder Agent
- **When**: Creating or extending game system recipes
- **Tools**: Recipe template scaffolder, recipe test harness, `arcane add` CLI
- **Knowledge**: System/rule patterns, the `extend` API, state wiring, recipe publishing
- **File scope**: `recipes/**/*`

### Phase 5+ Agents (When Building Showcase Game)

#### `showcase-game` — Showcase Game Agent
- **When**: Building the BFRPG showcase game on top of Arcane
- **Tools**: All Arcane CLI tools, agent protocol, recipe system
- **Knowledge**: BFRPG rules, dungeon design, game balancing
- **File scope**: `showcase/**/*`

## Skills (Slash Commands)

Skills are repeatable workflows invoked with `/command`.

### Phase 1 Skills

| Skill | Description |
|---|---|
| `/arcane-test` | Run all tests (Rust + TS) and report results |
| `/arcane-build` | Build the full project (Rust core + TS runtime) |
| `/arcane-check` | Type-check TS, clippy Rust, lint everything |
| `/doc-consistency` | Verify cross-references and consistency across all design docs |

### Phase 2+ Skills

| Skill | Description |
|---|---|
| `/arcane-dev` | Start dev server with hot reload |
| `/arcane-describe` | Get text description of current game state |
| `/arcane-inspect <path>` | Inspect a specific state path |
| `/new-recipe <name>` | Scaffold a new recipe with template files and tests |
| `/new-system <name>` | Scaffold a new system definition |
| `/new-world <name>` | Scaffold a new world/dungeon spec |
| `/run-headless <scenario>` | Run a game scenario headless and report results |

### Phase 4+ Skills

| Skill | Description |
|---|---|
| `/playtest <dungeon>` | Run automated playtest of a dungeon, generate report |
| `/record-session` | Start recording a play session for replay/test generation |
| `/generate-tests <session>` | Generate regression tests from a recorded session |
| `/publish-recipe <name>` | Package and publish a recipe to npm |

## MCP Tools

MCP (Model Context Protocol) tools give Claude Code direct programmatic access to engine functionality.

### Phase 1 MCP Tools

#### `arcane-state` — State Inspector
```
arcane_state.query(path)       → query game state tree
arcane_state.diff(before, after) → compute state diff
arcane_state.validate(state)   → validate state against schema
```

#### `arcane-test-runner` — Headless Test Execution
```
arcane_test.run_all()          → run all tests
arcane_test.run_file(path)     → run tests in a specific file
arcane_test.run_headless(scenario) → execute a scenario headless
```

### Phase 3 MCP Tools

#### `arcane-inspector` — Live Game Inspector
```
arcane_inspector.describe()    → text description of game state
arcane_inspector.screenshot()  → capture rendered frame
arcane_inspector.action(spec)  → execute an action
arcane_inspector.rewind(turn)  → rewind to a previous state
arcane_inspector.simulate(actions) → "what if" without mutating state
```

#### `arcane-world` — World Authoring Tools
```
arcane_world.validate(spec)    → validate a world spec
arcane_world.visualize(spec)   → ASCII visualization of world layout
arcane_world.pathfind(from, to) → check connectivity between rooms
```

### Phase 5 MCP Tools

#### `arcane-playtest` — Automated Playtesting
```
arcane_playtest.run(dungeon, config) → automated playthrough
arcane_playtest.balance_report(dungeon) → difficulty analysis
arcane_playtest.coverage(dungeon)    → which paths/encounters were tested
```

## Self-Evolution Process

The agent/skill/MCP tool set is not static. It evolves as the project matures.

### Review Triggers

Re-evaluate the tooling set when:
1. **Phase transition** — entering a new roadmap phase
2. **Pain point accumulation** — the same manual workflow is repeated 3+ times
3. **Agent failure pattern** — an agent consistently struggles with a task type
4. **New capability** — a new engine feature enables new tooling
5. **Periodic review** — every 2 weeks during active development

### Review Process

At each review:

1. **Audit current agents**: For each agent, ask:
   - Is it being used? If not used in the last phase, consider removing.
   - Is it effective? If it consistently needs human intervention, refine its scope or knowledge.
   - Is it scoped correctly? Too broad = unfocused. Too narrow = overhead.

2. **Audit current skills**: For each skill, ask:
   - Is the workflow it automates still relevant?
   - Has the workflow changed enough that the skill needs updating?
   - Are there manual workflows that should become skills?

3. **Audit current MCP tools**: For each tool, ask:
   - Is it used by agents effectively?
   - Does it expose the right granularity of operations?
   - Are there engine capabilities not yet exposed as tools?

4. **Identify gaps**:
   - What tasks are agents doing manually that could be automated?
   - What domain knowledge is missing from agent definitions?
   - What new tools would the current phase benefit from?

5. **Act**:
   - Create new agents/skills/tools for identified gaps
   - Retire unused or ineffective ones
   - Update existing ones with new knowledge or scope changes
   - Document changes in a changelog

### Evolution Log

Track all tooling changes here:

| Date | Change | Reason |
|---|---|---|
| Phase 0 | Initial agent/skill/MCP tool definitions | Project bootstrap |
| | | |

### Creating New Agents

When a new agent is needed:

1. Define its **domain** — what part of the codebase/problem space it owns
2. Define its **triggers** — when should it be activated
3. Define its **tools** — what tools it has access to
4. Define its **knowledge** — what domain expertise it needs
5. Define its **file scope** — what files it can read/write
6. Add it to `AGENTS.md`
7. Test it on representative tasks before relying on it

### Creating New Skills

When a new skill is needed:

1. Identify the **repeatable workflow** it automates
2. Define the **inputs** (arguments) and **outputs** (what it produces)
3. Implement as a slash command
4. Document in this file and in `CLAUDE.md`

### Creating New MCP Tools

When a new MCP tool is needed:

1. Identify the **engine capability** to expose
2. Define the **API** — methods, parameters, return types
3. Implement in the MCP server
4. Test with Claude Code to verify it's usable
5. Document in this file

## Guiding Principles

1. **Agents should match the architecture.** The two-layer design (Rust + TS) maps to two primary agents. Don't fight the architecture.
2. **Skills automate workflows, not tasks.** A skill should encode a *process* (build → test → report), not a single command.
3. **MCP tools expose capabilities, not UI.** Tools should be programmatic, composable, and queryable — not wrappers around CLI output parsing.
4. **Retire aggressively.** An unused agent/skill/tool is worse than no agent/skill/tool — it's noise that slows down context loading.
5. **Dog-food everything.** If building Arcane with these tools is painful, the tools are wrong. The development experience IS the product validation.
