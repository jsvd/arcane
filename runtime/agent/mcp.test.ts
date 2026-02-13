import { describe, it, assert } from "../testing/harness.ts";
import {
  MCP_TOOLS,
  buildToolCallRequest,
  buildInitializeRequest,
  buildToolsListRequest,
  getToolDef,
} from "./mcp.ts";

describe("MCP tool definitions", () => {
  it("defines 10 tools", () => {
    assert.equal(MCP_TOOLS.length, 10);
  });

  it("all tools have name, description, and inputSchema", () => {
    for (const tool of MCP_TOOLS) {
      assert.ok(tool.name.length > 0, `Tool missing name`);
      assert.ok(tool.description.length > 0, `Tool ${tool.name} missing description`);
      assert.ok(tool.inputSchema !== undefined, `Tool ${tool.name} missing inputSchema`);
      assert.equal(tool.inputSchema.type, "object");
    }
  });

  it("includes expected tool names", () => {
    const names = MCP_TOOLS.map((t) => t.name);
    assert.ok(names.includes("get_state"));
    assert.ok(names.includes("describe_state"));
    assert.ok(names.includes("list_actions"));
    assert.ok(names.includes("execute_action"));
    assert.ok(names.includes("inspect_scene"));
    assert.ok(names.includes("capture_snapshot"));
    assert.ok(names.includes("hot_reload"));
    assert.ok(names.includes("run_tests"));
    assert.ok(names.includes("rewind"));
    assert.ok(names.includes("simulate_action"));
  });

  it("execute_action requires 'name' parameter", () => {
    const tool = MCP_TOOLS.find((t) => t.name === "execute_action")!;
    const required = (tool.inputSchema as any).required;
    assert.ok(Array.isArray(required));
    assert.ok(required.includes("name"));
  });

  it("inspect_scene requires 'path' parameter", () => {
    const tool = MCP_TOOLS.find((t) => t.name === "inspect_scene")!;
    const required = (tool.inputSchema as any).required;
    assert.ok(required.includes("path"));
  });
});

describe("getToolDef", () => {
  it("returns tool by name", () => {
    const tool = getToolDef("get_state");
    assert.ok(tool !== undefined);
    assert.equal(tool!.name, "get_state");
  });

  it("returns undefined for unknown tool", () => {
    assert.equal(getToolDef("nonexistent"), undefined);
  });
});

describe("buildInitializeRequest", () => {
  it("produces valid JSON-RPC initialize request", () => {
    const json = buildInitializeRequest(0);
    const parsed = JSON.parse(json);
    assert.equal(parsed.jsonrpc, "2.0");
    assert.equal(parsed.method, "initialize");
    assert.equal(parsed.id, 0);
    assert.ok(parsed.params.protocolVersion);
    assert.ok(parsed.params.clientInfo.name);
  });

  it("uses custom id", () => {
    const parsed = JSON.parse(buildInitializeRequest(42));
    assert.equal(parsed.id, 42);
  });
});

describe("buildToolsListRequest", () => {
  it("produces valid JSON-RPC tools/list request", () => {
    const json = buildToolsListRequest(1);
    const parsed = JSON.parse(json);
    assert.equal(parsed.jsonrpc, "2.0");
    assert.equal(parsed.method, "tools/list");
    assert.equal(parsed.id, 1);
  });
});

describe("buildToolCallRequest", () => {
  it("produces valid JSON-RPC tools/call request", () => {
    const json = buildToolCallRequest("get_state", { path: "player.hp" }, 5);
    const parsed = JSON.parse(json);
    assert.equal(parsed.jsonrpc, "2.0");
    assert.equal(parsed.method, "tools/call");
    assert.equal(parsed.params.name, "get_state");
    assert.deepEqual(parsed.params.arguments, { path: "player.hp" });
    assert.equal(parsed.id, 5);
  });

  it("defaults to empty args and id 1", () => {
    const parsed = JSON.parse(buildToolCallRequest("list_actions"));
    assert.deepEqual(parsed.params.arguments, {});
    assert.equal(parsed.id, 1);
  });

  it("handles complex arguments", () => {
    const args = { name: "attack", args: { target: "goblin", damage: 10 } };
    const parsed = JSON.parse(buildToolCallRequest("execute_action", args, 3));
    assert.equal(parsed.params.arguments.name, "attack");
    assert.deepEqual(parsed.params.arguments.args, { target: "goblin", damage: 10 });
  });
});
