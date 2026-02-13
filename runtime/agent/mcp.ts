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
export const MCP_TOOLS: readonly McpToolDef[] = [
  {
    name: "get_state",
    description: "Get the full game state or a specific path within it",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional dot-separated path (e.g. 'player.hp')",
        },
      },
    },
  },
  {
    name: "describe_state",
    description: "Get a human-readable text description of the game state",
    inputSchema: {
      type: "object",
      properties: {
        verbosity: {
          type: "string",
          enum: ["minimal", "normal", "detailed"],
          description: "Detail level",
        },
      },
    },
  },
  {
    name: "list_actions",
    description: "List all available agent actions with descriptions and argument schemas",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "execute_action",
    description: "Execute a named agent action with optional arguments",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Action name" },
        args: { type: "object", description: "Optional action arguments" },
      },
      required: ["name"],
    },
  },
  {
    name: "inspect_scene",
    description: "Query a specific value in the game state by dot-path",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Dot-separated state path (e.g. 'player.inventory')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "capture_snapshot",
    description: "Capture a snapshot of the current game state",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "hot_reload",
    description: "Trigger a hot reload of the game entry file",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "run_tests",
    description: "Run the game's test suite and return results",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rewind",
    description: "Reset game state to initial state (captured at registerAgent time)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "simulate_action",
    description: "Simulate an action without committing state changes",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Action name" },
        args: { type: "object", description: "Optional action arguments" },
      },
      required: ["name"],
    },
  },
];

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
  error?: { code: number; message: string };
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
export function buildToolCallRequest(
  toolName: string,
  args: Record<string, unknown> = {},
  id: number = 1,
): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/call",
    params: { name: toolName, arguments: args },
    id,
  });
}

/**
 * Build a JSON-RPC 2.0 initialize request.
 *
 * @param id - Request ID. Default: 0.
 * @returns JSON string for the initialize handshake.
 */
export function buildInitializeRequest(id: number = 0): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "arcane-test-client", version: "1.0.0" },
    },
    id,
  });
}

/**
 * Build a JSON-RPC 2.0 tools/list request.
 *
 * @param id - Request ID. Default: 1.
 * @returns JSON string for listing available tools.
 */
export function buildToolsListRequest(id: number = 1): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    method: "tools/list",
    params: {},
    id,
  });
}

/**
 * Get an MCP tool definition by name.
 *
 * @param name - Tool name.
 * @returns The tool definition, or undefined if not found.
 */
export function getToolDef(name: string): McpToolDef | undefined {
  return MCP_TOOLS.find((t) => t.name === name);
}
