// Arcane Engine — Agent Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/agent

declare module "@arcane/runtime/agent" {
  /**
   * Verbosity levels for the describe() output.
   * - `"minimal"` — one-line summary (e.g., for logs).
   * - `"normal"` — standard detail (default).
   * - `"detailed"` — full state dump for debugging.
   */
  export type Verbosity = "minimal" | "normal" | "detailed";
  /**
   * Options passed to the agent's describe function.
   */
  export type DescribeOptions = Readonly<{
      /** Detail level for the description. Default: "normal". */
      verbosity?: Verbosity;
      /** Optional dot-path to focus description on a sub-tree of state (e.g., "player.inventory"). */
      path?: string;
  }>;
  /**
   * Metadata about a registered agent action, returned by `listActions()`.
   * Used by AI agents and the HTTP inspector to discover available commands.
   */
  export type ActionInfo = Readonly<{
      /** Action name used to invoke via executeAction(). */
      name: string;
      /** Human-readable description of what the action does. */
      description: string;
      /** Optional argument schema for the action. */
      args?: readonly ArgInfo[];
  }>;
  /**
   * Describes a single argument accepted by an agent action.
   */
  export type ArgInfo = Readonly<{
      /** Argument name (used as key in the args JSON object). */
      name: string;
      /** Type hint (e.g., "string", "number", "EntityId"). */
      type: string;
      /** Optional description of the argument's purpose and valid values. */
      description?: string;
  }>;
  /**
   * Result of executing an action via the agent protocol.
   * @typeParam S - The game state type.
   */
  export type ActionResult<S> = Readonly<{
      /** True if the action executed successfully. */
      ok: boolean;
      /** The game state after execution (unchanged if ok is false). */
      state: S;
      /** Error message if ok is false. */
      error?: string;
  }>;
  /**
   * Result of simulating an action without committing the state change.
   * The original game state is not modified.
   * @typeParam S - The game state type.
   */
  export type SimulateResult<S> = Readonly<{
      /** True if the simulation executed successfully. */
      ok: boolean;
      /** The hypothetical state after the action (original state is untouched). */
      state: S;
      /** Error message if ok is false. */
      error?: string;
  }>;
  /**
   * A captured snapshot of game state at a point in time, used for rewind.
   * @typeParam S - The game state type.
   */
  export type SnapshotData<S> = Readonly<{
      /** Deep clone of the game state at capture time. */
      state: S;
      /** Unix timestamp (ms) when the snapshot was captured. */
      timestamp: number;
  }>;
  /**
   * A pure function that handles an agent action.
   * Takes current state and parsed arguments, returns new state.
   * Must not mutate the input state.
   *
   * @typeParam S - The game state type.
   * @param state - Current game state.
   * @param args - Parsed arguments from the action invocation.
   * @returns New game state.
   */
  export type ActionHandler<S> = (state: S, args: Record<string, unknown>) => S;
  /**
   * Custom function for generating a text description of the game state.
   * Used by `arcane describe` and the HTTP inspector.
   *
   * @typeParam S - The game state type.
   * @param state - Current game state.
   * @param options - Verbosity and optional path focus.
   * @returns Human-readable text description.
   */
  export type DescribeFn<S> = (state: S, options: DescribeOptions) => string;
  /**
   * Configuration for registering an agent via {@link registerAgent}.
   *
   * Supports two state access patterns:
   * - **Store-backed**: provide a `store` (GameStore) — state access is automatic.
   * - **Manual**: provide `getState()` and `setState()` functions.
   *
   * @typeParam S - The game state type.
   */
  export type AgentConfig<S> = {
      /** Display name for the game/agent (shown in CLI and inspector). */
      name: string;
      /**
       * Optional map of named actions the agent can execute.
       * Each action has a handler, description, and optional argument schema.
       */
      actions?: Record<string, {
          handler: ActionHandler<S>;
          description: string;
          args?: ArgInfo[];
      }>;
      /** Optional custom describe function. Falls back to defaultDescribe() if not provided. */
      describe?: DescribeFn<S>;
  } & ({
      store: GameStore<S>;
  } | {
      getState: () => S; /** Function to replace current state. */
      setState: (s: S) => void;
  });
  /**
   * The agent protocol object installed on `globalThis.__arcaneAgent`.
   *
   * Provides the interface that Rust CLI commands (`describe`, `inspect`, `dev --inspector`)
   * use to interact with the game. Created by {@link registerAgent}.
   *
   * @typeParam S - The game state type.
   */
  export type AgentProtocol<S> = Readonly<{
      /** Game/agent display name. */
      name: string;
      /** Get a deep reference to the current game state. */
      getState: () => S;
      /** Query a value at a dot-separated path in the state tree. */
      inspect: (path: string) => unknown;
      /** Generate a text description of the current state. */
      describe: (options?: DescribeOptions) => string;
      /** List all registered actions with their metadata. */
      listActions: () => readonly ActionInfo[];
      /** Execute a named action with optional JSON arguments. Commits state changes. */
      executeAction: (name: string, argsJson?: string) => ActionResult<S>;
      /** Simulate a named action without committing. Returns hypothetical state. */
      simulate: (name: string, argsJson?: string) => SimulateResult<S>;
      /** Reset state to the initial snapshot captured at registerAgent() time. */
      rewind: () => S;
      /** Capture a deep clone of the current state as a snapshot. */
      captureSnapshot: () => SnapshotData<S>;
  }>;

  /** Default describe function that summarizes game state at the given verbosity */
  export declare function defaultDescribe(state: unknown, options: DescribeOptions): string;

  /**
   * MCP (Model Context Protocol) tool definitions for Arcane.
   *
   * This module provides TypeScript types and utilities for MCP tool integration.
   * The MCP server runs on the Rust side (`core/src/agent/mcp.rs`), but this module
   * defines the tool schemas and provides a client helper for testing.
   *
   * To start the MCP server: `arcane dev entry.ts --mcp 4322`
   *
   * @example
   * ```ts
   * import { MCP_TOOLS, createMcpClient } from "../agent/mcp.ts";
   *
   * // List available tools
   * for (const tool of MCP_TOOLS) {
   *   console.log(`${tool.name}: ${tool.description}`);
   * }
   * ```
   */
  /** MCP tool definition with typed schema. */
  export type McpToolDef = Readonly<{
      /** Tool name used in tools/call. */
      name: string;
      /** Human-readable description. */
      description: string;
      /** JSON Schema for input parameters. */
      inputSchema: Record<string, unknown>;
  }>;
  /** Complete list of MCP tools exposed by the Arcane MCP server. */
  export declare const MCP_TOOLS: readonly McpToolDef[];
  /** MCP JSON-RPC request. */
  export type McpRequest = Readonly<{
      jsonrpc: "2.0";
      method: string;
      params?: Record<string, unknown>;
      id: number | string;
  }>;
  /** MCP JSON-RPC response. */
  export type McpResponse = Readonly<{
      jsonrpc: "2.0";
      result?: unknown;
      error?: {
          code: number;
          message: string;
      };
      id: number | string | null;
  }>;
  /**
   * Build a JSON-RPC 2.0 request body for an MCP tool call.
   *
   * @param toolName - Name of the MCP tool to call.
   * @param args - Arguments to pass to the tool.
   * @param id - Request ID. Default: 1.
   * @returns JSON string ready to POST to the MCP server.
   */
  export declare function buildToolCallRequest(toolName: string, args?: Record<string, unknown>, id?: number): string;
  /**
   * Build a JSON-RPC 2.0 initialize request.
   *
   * @param id - Request ID. Default: 0.
   * @returns JSON string for the initialize handshake.
   */
  export declare function buildInitializeRequest(id?: number): string;
  /**
   * Build a JSON-RPC 2.0 tools/list request.
   *
   * @param id - Request ID. Default: 1.
   * @returns JSON string for listing available tools.
   */
  export declare function buildToolsListRequest(id?: number): string;
  /**
   * Get an MCP tool definition by name.
   *
   * @param name - Tool name.
   * @returns The tool definition, or undefined if not found.
   */
  export declare function getToolDef(name: string): McpToolDef | undefined;

  /**
   * Register this game with Arcane's agent protocol.
   *
   * Must be called once at startup. Installs a protocol object on
   * `globalThis.__arcaneAgent` that enables:
   * - `arcane describe <entry.ts>` — text description of game state.
   * - `arcane inspect <entry.ts> <path>` — query specific state values.
   * - `arcane dev <entry.ts> --inspector <port>` — HTTP inspector for live interaction.
   *
   * The protocol supports executing/simulating actions, rewinding to initial state,
   * and capturing snapshots.
   *
   * @typeParam S - The game state type.
   * @param config - Agent configuration with name, state accessors, optional actions, and describe function.
   *   Provide either a `store` (GameStore) or `getState`/`setState` functions.
   * @returns The created {@link AgentProtocol} instance (also installed on globalThis).
   *
   * @example
   * ```ts
   * let state = { score: 0, player: { x: 0, y: 0, hp: 100 } };
   *
   * registerAgent({
   *   name: "my-game",
   *   getState: () => state,
   *   setState: (s) => { state = s; },
   *   describe: (s, opts) => `Score: ${s.score}, HP: ${s.player.hp}`,
   *   actions: {
   *     heal: {
   *       handler: (s) => ({ ...s, player: { ...s.player, hp: 100 } }),
   *       description: "Restore player to full health",
   *     },
   *   },
   * });
   * ```
   */
  export declare function registerAgent<S>(config: AgentConfig<S>): AgentProtocol<S>;

}
