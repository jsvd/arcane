// Types
export type {
  Verbosity,
  DescribeOptions,
  ActionInfo,
  ArgInfo,
  ActionResult,
  SimulateResult,
  SnapshotData,
  ActionHandler,
  DescribeFn,
  AgentConfig,
  AgentProtocol,
} from "./types.ts";

// Protocol
export { registerAgent } from "./protocol.ts";

// Describe
export { defaultDescribe } from "./describe.ts";

// MCP tool definitions
export {
  MCP_TOOLS,
  buildToolCallRequest,
  buildInitializeRequest,
  buildToolsListRequest,
  getToolDef,
} from "./mcp.ts";
export type { McpToolDef, McpRequest, McpResponse } from "./mcp.ts";
