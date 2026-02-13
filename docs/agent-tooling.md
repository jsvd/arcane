# Agent Tooling

How Claude Code develops Arcane: the agents, skills, and MCP tools needed, and the process for evolving them.

## Philosophy

Arcane is built by AI agents. The tooling for building Arcane should itself be agent-native. This means:

1. **Specialized agents** for distinct domains (Rust core, TS runtime, game design)
2. **Skills** for common workflows (test, build, create recipe, etc.)
3. **MCP tools** for engine-specific operations (inspect state, describe scene, run headless)
4. **Self-evolution** — the tooling set is reviewed and updated as the project matures

## Agent Capabilities and Limitations

**CRITICAL: Agents must understand and respect their own limitations.**

### Verify Before Proposing

Before proposing any feature that relies on agent capabilities, the agent MUST verify those capabilities are real and functional:

1. **Visual/perceptual features**: Agents have limited ability to process visual output (screenshots, rendered graphics). Do NOT propose features like:
   - Screenshot analysis for visual regression testing
   - "Giving Claude eyes" to verify rendering
   - Image-based debugging or validation
   - Any feature claiming the agent can meaningfully interpret rendered game output

2. **Audio processing**: Agents cannot meaningfully process audio output

3. **Real-time interaction**: Agents work asynchronously, not in real-time game loops

### What Works: Structured Data, Not Perception

Agents excel at processing **structured data**:
- ✅ JSON state exports
- ✅ Text descriptions of game state
- ✅ Render command logs (what was drawn, where, with what parameters)
- ✅ Test assertions about game logic
- ✅ API call traces

Agents fail at processing **perceptual output**:
- ❌ Screenshots of rendered frames
- ❌ Audio recordings
- ❌ "Does this look right?" questions about visuals

### Feasibility Check Required

When planning features for agent use, include a feasibility check:

1. **Can the agent actually use this?** Test with a realistic example
2. **Does this rely on unverified capabilities?** If yes, verify or pivot
3. **Is there a structured alternative?** Prefer structured data over perception
4. **Has this pattern worked before?** Reference prior successful patterns

### When Uncertain: Ask First

If uncertain whether a capability exists or works:
1. **Ask the user** before implementing
2. **Prototype a minimal test** to verify the capability
3. **Document the limitation** if the capability doesn't exist
4. **Propose alternatives** that don't rely on unverified capabilities

### Example: Screenshot API (Failed Approach)

**Proposed**: Add `/screenshot` endpoint so Claude can "see" rendered game output and verify visual changes.

**Why it failed**:
- Agent claimed ability to process screenshots without verification
- Implementation proceeded based on false premise
- Feature was non-functional for its intended use case
- Time wasted on a feature that couldn't achieve its goal

**Better approach**:
- Export render commands as JSON: `{ "type": "sprite", "x": 100, "y": 200, "color": [1.0, 0, 0], ... }`
- Agent validates commands match expectations
- Human verifies visual output looks correct
- Structured data is testable, visual output is not (for agents)

## Agent Teams

Agent teams coordinate multiple Claude Code sessions working on the same repository. The agent definitions below describe *roles* — when spawning teammates, use these roles to scope each teammate's domain, file access, and knowledge.

### Mapping Agents to Teammates

Each agent definition (e.g., `ts-runtime`, `arcane-test`) describes a role a teammate can fill. When the team lead spawns a teammate, the spawn prompt should include:

1. **Domain** — which agent role this teammate fills (e.g., "You are the ts-runtime agent")
2. **File scope** — which files the teammate owns (from the agent's file scope)
3. **Relevant knowledge** — key patterns, conventions, or context the teammate needs

Teammates load `CLAUDE.md` automatically, so project-wide rules (The Three Laws, Phase 1 constraints, conventions) don't need to be repeated in spawn prompts.

### Task List Conventions

- Task subjects use imperative form: "Add observer batching tests", not "Observer batching tests"
- Task descriptions include acceptance criteria and file scope
- Each task lists the specific files the teammate should create or modify
- Tasks are self-contained — a teammate should be able to complete one without waiting on others

See [Development Workflow](development-workflow.md#agent-teams) for when to use agent teams vs subagents vs worktrees.

## Agents

Agents are defined in `AGENTS.md` files. Each handles a specific domain.

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

## Skills (Slash Commands)

Skills are invoked by the user as slash commands in Claude Code. Currently Arcane does not ship custom Claude Code skills — the CLI commands (`arcane test`, `arcane dev`, `arcane describe`, `arcane inspect`, `arcane assets`, `arcane add`) are used directly via the Bash tool. Custom skills may be added in future phases if repeated workflows emerge.

## CLI Tools

Some operations that were originally planned as MCP tools are now built-in CLI commands (see ADR-014):

- **`arcane assets list/search/download`** — Asset discovery and download. Ships in the binary, no config needed. See [Asset Management](asset-management.md).

## MCP Server

The MCP (Model Context Protocol) server runs alongside `arcane dev` via `--mcp <port>`. It implements JSON-RPC 2.0 and exposes 10 tools for AI agents to inspect and control a running game.

### Starting the MCP Server

```bash
arcane dev my-game.ts --mcp 3001
```

The server responds to standard MCP protocol messages: `initialize`, `tools/list`, `tools/call`, and `ping`.

### Available Tools

| Tool | Description | Input |
|---|---|---|
| `get_state` | Get full game state or a nested path | `{ path?: string }` |
| `describe_state` | Human-readable text description of game state | `{ verbosity?: "minimal" \| "normal" \| "detailed" }` |
| `list_actions` | List all available actions the agent can take | *none* |
| `execute_action` | Execute a registered game action | `{ name: string, payload?: string }` |
| `inspect_scene` | Query a specific dot-path in the state tree | `{ path: string }` |
| `capture_snapshot` | Capture the full game state for later comparison | *none* |
| `simulate_action` | "What if" — simulate an action without mutating state | `{ action: string }` |
| `rewind_state` | Rewind to a previous state (if history is available) | `{ steps?: number }` |
| `get_history` | Get the action/state history | *none* |
| `hot_reload` | Trigger a hot-reload of the game script | *none* |

### Example: Agent Interaction

```bash
# List available tools
curl -X POST http://localhost:3001 -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Get current game state
curl -X POST http://localhost:3001 -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_state","arguments":{}}}'

# Execute an action
curl -X POST http://localhost:3001 -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"execute_action","arguments":{"name":"attack","payload":"{\"target\":\"goblin_1\"}"}}}'
```

### Architecture

```
Agent (Claude Code / HTTP client)
    ↓ JSON-RPC 2.0 over HTTP
MCP Server (core/agent/mcp.rs, tiny_http)
    ↓ channel message
Frame callback (cli/commands/dev.rs)
    ↓ eval_to_string
globalThis.__arcaneAgent (runtime/agent/protocol.ts)
    ↓ response
Frame callback → channel → MCP Server → HTTP response
```

The MCP server runs on a background thread. Requests are forwarded to the game loop via an MPSC channel and processed during the frame callback, so agent actions are synchronized with the game's update cycle.

### Registering an Agent in Your Game

For the MCP server to work, your game must call `registerAgent()`:

```typescript
import { registerAgent } from "@arcane/runtime/agent";

registerAgent({
  getState: () => gameState,
  setState: (s) => { gameState = s; },
  actions: {
    move: (dir) => { /* move player */ },
    attack: (target) => { /* attack */ },
  },
  describe: (opts) => `Player at ${gameState.player.x},${gameState.player.y}`,
});
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

| Phase | Change | Reason |
|---|---|---|
| Phase 0 | Initial agent/skill/MCP tool definitions | Project bootstrap |
| Phase 1.5 | Add agent teams guidance | Enable coordinated multi-session development |
| Phase 9.5 | Replace asset MCP server with `arcane assets` CLI | Zero-config asset discovery (ADR-014) |
| Phase 17 | MCP server implemented (10 tools, JSON-RPC 2.0) | Agent intelligence: live game interaction |
| Phase 17 | Snapshot-replay + property-based testing | Determinism testing, automated regression |
| Phase 18 | WFC procedural generation with constraints | Code-defined level generation |
| Phase 19 | Radiance Cascades GI + advanced lighting | 2D global illumination, emissive surfaces |

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
