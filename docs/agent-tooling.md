# Agent Tooling

How Claude Code develops Arcane: the agents, CLI tools, and MCP server that support development.

## Philosophy

Arcane is built by AI agents. The tooling for building Arcane should itself be agent-native. This means:

1. **Specialized agents** for distinct domains (Rust core, TS runtime, testing, docs)
2. **CLI tools** for engine operations (`arcane test`, `arcane dev`, `arcane describe`, etc.)
3. **MCP server** for live game interaction (inspect state, execute actions, hot-reload)
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
- JSON state exports
- Text descriptions of game state
- Render command logs (what was drawn, where, with what parameters)
- Test assertions about game logic
- API call traces

Agents fail at processing **perceptual output**:
- Screenshots of rendered frames
- Audio recordings
- "Does this look right?" questions about visuals

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

### Lesson Learned: Screenshot API

**Proposed**: Add `/screenshot` endpoint so Claude can "see" rendered game output and verify visual changes.

**Why it failed**: Agent claimed ability to process screenshots without verification. The feature was non-functional for its intended use case.

**Better approach**: Export render commands as structured data (draw call capture) so agents can validate what was drawn without needing visual perception. Human verifies visual output looks correct.

## Agent Teams

Agent teams coordinate multiple Claude Code sessions working on the same repository. The agent definitions below describe *roles* — when spawning teammates, use these roles to scope each teammate's domain, file access, and knowledge.

### Mapping Agents to Teammates

Each agent definition describes a role a teammate can fill. When the team lead spawns a teammate, the spawn prompt should include:

1. **Domain** — which agent role this teammate fills (e.g., "You are the ts-runtime agent")
2. **File scope** — which files the teammate owns (from the agent's file scope)
3. **Relevant knowledge** — key patterns, conventions, or context the teammate needs

Teammates load `CLAUDE.md` automatically, so project-wide rules don't need to be repeated in spawn prompts.

### Task List Conventions

- Task subjects use imperative form: "Add observer batching tests", not "Observer batching tests"
- Task descriptions include acceptance criteria and file scope
- Each task lists the specific files the teammate should create or modify
- Tasks are self-contained — a teammate should be able to complete one without waiting on others

See [Development Workflow](development-workflow.md#agent-teams) for when to use agent teams vs subagents vs worktrees.

## Agents

Agents are defined in `AGENTS.md` files. Each handles a specific domain.

#### `rust-engine` — Rust Core Agent
- **When**: Working on anything under `core/` — renderer, physics, audio, scripting ops, platform
- **Tools**: `cargo build/test/clippy/check`, wgpu docs
- **Knowledge**: Rust idioms, wgpu API, deno_core `#[op2]` patterns, feature gating (`renderer`)
- **File scope**: `core/**/*.rs`, `cli/**/*.rs`, `Cargo.toml`, `Cargo.lock`

#### `ts-runtime` — TypeScript Runtime Agent
- **When**: Working on anything under `runtime/` — state, rendering, physics, UI, scenes, procgen, testing
- **Tools**: `./run-tests.sh` (Node), `cargo run -- test` (V8)
- **Knowledge**: TypeScript patterns, functional state management, zero-dependency constraint
- **File scope**: `runtime/**/*.ts`, `package.json`, `tsconfig.json`

#### `test` — Test Agent
- **When**: Writing or running tests for any layer
- **Tools**: `arcane test` (headless V8), `cargo test` (Rust), `./run-tests.sh` (Node)
- **Knowledge**: Testing patterns for game logic, state-based testing, deterministic test seeds, property-based testing, snapshot-replay
- **File scope**: `**/*.test.ts`, `core/**/tests/**`

#### `docs` — Documentation Agent
- **When**: Updating design documents, ensuring cross-document consistency
- **Tools**: File search, cross-reference checking
- **Knowledge**: ADR format, Arcane architecture, document cross-references
- **File scope**: `docs/**/*.md`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`

## CLI Tools

All engine operations are available as CLI commands:

| Command | Description |
|---|---|
| `arcane dev <entry.ts>` | Run game with window, hot-reload, optional `--inspector <port>` and `--mcp <port>` |
| `arcane test` | Discover and run `*.test.ts` files headless in V8 |
| `arcane describe <entry.ts>` | Print text description of game state |
| `arcane inspect <entry.ts> <path>` | Query specific state path |
| `arcane add <recipe>` | Copy a recipe into the project |
| `arcane assets list/search/download/inspect` | Discover and download game assets from catalog |

No custom Claude Code slash commands are shipped. The CLI commands above are invoked directly via the Bash tool.

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

The agent/CLI/MCP tool set is not static. It evolves as the project matures.

### Review Triggers

Re-evaluate the tooling set when:
1. **Pain point accumulation** — the same manual workflow is repeated 3+ times
2. **Agent failure pattern** — an agent consistently struggles with a task type
3. **New capability** — a new engine feature enables new tooling

### Review Process

At each review:

1. **Audit agents**: Is each one being used? Is it scoped correctly? Too broad = unfocused. Too narrow = overhead.
2. **Audit MCP tools**: Does each tool expose the right granularity? Are there engine capabilities not yet exposed?
3. **Identify gaps**: What tasks are agents doing manually that could be automated?
4. **Act**: Create, retire, or update tools. Document changes.

### Evolution Log

| Change | Reason |
|---|---|
| Initial agent definitions | Project bootstrap |
| Add agent teams guidance | Enable coordinated multi-session development |
| Replace asset MCP server with `arcane assets` CLI | Zero-config asset discovery (ADR-014) |
| MCP server: 10 tools, JSON-RPC 2.0 | Live game interaction for AI agents |
| Snapshot-replay + property-based testing | Determinism testing, automated regression |
| WFC procedural generation with constraints | Code-defined level generation |
| Radiance Cascades GI + advanced lighting | 2D global illumination, emissive surfaces |
| Draw call capture + visual testing assertions | Structured rendering validation for headless tests |

### Creating New Agents

When a new agent is needed:

1. Define its **domain** — what part of the codebase/problem space it owns
2. Define its **triggers** — when should it be activated
3. Define its **tools** — what tools it has access to
4. Define its **knowledge** — what domain expertise it needs
5. Define its **file scope** — what files it can read/write
6. Add it to `AGENTS.md`
7. Test it on representative tasks before relying on it

### Creating New MCP Tools

When a new MCP tool is needed:

1. Identify the **engine capability** to expose
2. Define the **API** — methods, parameters, return types
3. Implement in the MCP server
4. Test with Claude Code to verify it's usable
5. Document in this file

## Guiding Principles

1. **Agents should match the architecture.** The two-layer design (Rust + TS) maps to two primary agents. Don't fight the architecture.
2. **CLI tools over custom skills.** Prefer `arcane <command>` over slash commands — CLI tools are testable, scriptable, and available outside Claude Code.
3. **MCP tools expose capabilities, not UI.** Tools should be programmatic, composable, and queryable — not wrappers around CLI output parsing.
4. **Retire aggressively.** An unused agent/tool is worse than none — it's noise that slows down context loading.
5. **Dog-food everything.** If building Arcane with these tools is painful, the tools are wrong. The development experience IS the product validation.
