/**
 * Agent Testing Demo — Phase 17
 *
 * Demonstrates snapshot-replay testing, property-based testing,
 * and MCP tool definitions.
 *
 * Run: node --test --experimental-strip-types demos/agent-testing/agent-testing.test.ts
 * Also: cargo run -- test demos/agent-testing/
 */

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  startRecording,
  stopRecording,
  replay,
  diffReplays,
  createRecording,
  emptyFrame,
} from "../../runtime/testing/replay.ts";
import {
  checkProperty,
  assertProperty,
  randomKeys,
  randomActions,
} from "../../runtime/testing/property.ts";
import {
  MCP_TOOLS,
  buildToolCallRequest,
  buildInitializeRequest,
  getToolDef,
} from "../../runtime/agent/mcp.ts";
import { registerAgent } from "../../runtime/agent/protocol.ts";
import type { InputFrame } from "../../runtime/testing/replay.ts";

// --- Game state for demo ---

type DemoState = {
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
  };
  score: number;
  entities: Array<{ id: number; x: number; y: number; alive: boolean }>;
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
};

const INITIAL_STATE: DemoState = {
  player: { x: 100, y: 100, hp: 100, maxHp: 100 },
  score: 0,
  entities: [
    { id: 1, x: 200, y: 150, alive: true },
    { id: 2, x: 300, y: 200, alive: true },
    { id: 3, x: 400, y: 100, alive: true },
  ],
  worldBounds: { minX: 0, minY: 0, maxX: 800, maxY: 600 },
};

// Deterministic update function
function gameUpdate(state: DemoState, input: InputFrame): DemoState {
  const player = { ...state.player };
  let score = state.score;
  const entities = state.entities.map((e) => ({ ...e }));
  const speed = 5;

  // Movement
  if (input.keysDown.includes("ArrowRight")) player.x += speed;
  if (input.keysDown.includes("ArrowLeft")) player.x -= speed;
  if (input.keysDown.includes("ArrowUp")) player.y -= speed;
  if (input.keysDown.includes("ArrowDown")) player.y += speed;

  // Clamp to world bounds
  player.x = Math.max(state.worldBounds.minX, Math.min(player.x, state.worldBounds.maxX));
  player.y = Math.max(state.worldBounds.minY, Math.min(player.y, state.worldBounds.maxY));

  // Heal (clamped to max)
  if (input.keysPressed.includes("h")) {
    player.hp = Math.min(player.hp + 20, player.maxHp);
  }

  // Take damage
  if (input.keysPressed.includes("d")) {
    player.hp = Math.max(player.hp - 15, 0);
  }

  // Attack nearby entities
  if (input.keysPressed.includes("Space")) {
    for (const entity of entities) {
      if (!entity.alive) continue;
      const dx = entity.x - player.x;
      const dy = entity.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50) {
        entity.alive = false;
        score += 100;
      }
    }
  }

  return { ...state, player, score, entities };
}

// --- Snapshot-Replay Tests ---

describe("Replay: record and replay gameplay", () => {
  it("records movement and replays deterministically", () => {
    const recording = createRecording<DemoState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowDown"] }),
      emptyFrame({ keysDown: ["ArrowDown"] }),
    ]);

    const result = replay(recording, gameUpdate, INITIAL_STATE);
    assert.ok(result.ok);
    assert.equal(result.finalState.player.x, 115); // 100 + 3*5
    assert.equal(result.finalState.player.y, 110); // 100 + 2*5
  });

  it("replaying twice produces identical results", () => {
    const recording = createRecording<DemoState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysPressed: ["Space"] }),
      emptyFrame({ keysDown: ["ArrowUp", "ArrowRight"] }),
      emptyFrame({ keysPressed: ["h"] }),
      emptyFrame({ keysDown: ["ArrowDown"] }),
    ]);

    const r1 = replay(recording, gameUpdate, INITIAL_STATE);
    const r2 = replay(recording, gameUpdate, INITIAL_STATE);
    assert.deepEqual(r1.finalState, r2.finalState);
  });

  it("asserts player reaches target position", () => {
    const recording = createRecording<DemoState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);

    const result = replay(recording, gameUpdate, INITIAL_STATE, {
      assertFrame: { frame: 2, check: (s) => s.player.x === 115 },
    });
    assert.ok(result.ok);
  });

  it("expected final state comparison works", () => {
    const recording = createRecording<DemoState>([
      emptyFrame({ keysPressed: ["d"] }),
    ]);

    const result = replay(recording, gameUpdate, INITIAL_STATE, {
      expectedFinalState: {
        ...INITIAL_STATE,
        player: { ...INITIAL_STATE.player, hp: 85 },
      },
    });
    assert.ok(result.ok);
  });
});

describe("Replay: session recording", () => {
  it("starts and stops a recording session with snapshots", () => {
    const session = startRecording<DemoState>();

    session.recordFrame(emptyFrame({ keysDown: ["ArrowRight"] }));
    session.captureSnapshot({ ...INITIAL_STATE, player: { ...INITIAL_STATE.player, x: 105 } });
    session.recordFrame(emptyFrame({ keysDown: ["ArrowRight"] }));
    session.recordFrame(emptyFrame({ keysPressed: ["Space"] }));

    const rec = stopRecording(session);
    assert.equal(rec.frameCount, 3);
    assert.equal(rec.snapshots.length, 1);
    assert.equal(rec.snapshots[0].frame, 1);
    assert.equal(rec.snapshots[0].state.player.x, 105);
  });
});

describe("Replay: diffing", () => {
  it("detects identical replays", () => {
    const rec = createRecording<DemoState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const diff = diffReplays(rec, rec, gameUpdate, INITIAL_STATE);
    assert.ok(diff.identical);
  });

  it("detects divergence point between different inputs", () => {
    const recA = createRecording<DemoState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const recB = createRecording<DemoState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowLeft"] }),
    ]);
    const diff = diffReplays(recA, recB, gameUpdate, INITIAL_STATE);
    assert.equal(diff.identical, false);
    assert.equal(diff.divergenceFrame, 1);
    assert.ok(diff.differingPaths.length > 0);
  });
});

// --- Property-Based Tests ---

describe("Property: player HP never exceeds max", () => {
  it("holds across random heal/damage sequences", () => {
    assertProperty({
      name: "HP capped at maxHp",
      seed: 42,
      numRuns: 100,
      framesPerRun: 50,
      initialState: INITIAL_STATE,
      update: gameUpdate,
      invariant: (s) => s.player.hp <= s.player.maxHp,
      generator: randomActions(["h", "d", "ArrowRight", "ArrowLeft"]),
    });
  });
});

describe("Property: player stays within world bounds", () => {
  it("holds across random movement", () => {
    assertProperty({
      name: "player within bounds",
      seed: 123,
      numRuns: 100,
      framesPerRun: 100,
      initialState: INITIAL_STATE,
      update: gameUpdate,
      invariant: (s) => {
        const b = s.worldBounds;
        return s.player.x >= b.minX && s.player.x <= b.maxX &&
               s.player.y >= b.minY && s.player.y <= b.maxY;
      },
      generator: randomKeys(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]),
    });
  });
});

describe("Property: HP never goes below zero", () => {
  it("holds because update clamps HP", () => {
    assertProperty({
      name: "HP non-negative",
      seed: 99,
      numRuns: 50,
      framesPerRun: 30,
      initialState: INITIAL_STATE,
      update: gameUpdate,
      invariant: (s) => s.player.hp >= 0,
      generator: randomActions(["d", "h"]),
    });
  });
});

describe("Property: score never decreases", () => {
  it("score only goes up from kills", () => {
    assertProperty({
      name: "score monotonic",
      seed: 77,
      numRuns: 50,
      framesPerRun: 30,
      initialState: INITIAL_STATE,
      update: (state, input) => {
        const newState = gameUpdate(state, input);
        return newState;
      },
      invariant: (s) => s.score >= 0,
      generator: randomActions(["Space", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"]),
    });
  });
});

describe("Property: entity count is stable", () => {
  it("entity array length never changes", () => {
    assertProperty({
      name: "entity count stable",
      seed: 55,
      numRuns: 50,
      framesPerRun: 50,
      initialState: INITIAL_STATE,
      update: gameUpdate,
      invariant: (s) => s.entities.length === INITIAL_STATE.entities.length,
      generator: randomActions(["Space", "ArrowRight", "ArrowLeft"]),
    });
  });
});

// --- MCP Tool Definitions ---

describe("MCP: tool catalog", () => {
  it("exposes 10 tools for agent interaction", () => {
    assert.equal(MCP_TOOLS.length, 10);
  });

  it("can build requests for each tool", () => {
    for (const tool of MCP_TOOLS) {
      const req = buildToolCallRequest(tool.name, {});
      const parsed = JSON.parse(req);
      assert.equal(parsed.method, "tools/call");
      assert.equal(parsed.params.name, tool.name);
    }
  });

  it("initialize handshake follows MCP protocol", () => {
    const req = JSON.parse(buildInitializeRequest());
    assert.equal(req.jsonrpc, "2.0");
    assert.equal(req.method, "initialize");
    assert.ok(req.params.protocolVersion);
  });

  it("get_state tool has optional path parameter", () => {
    const tool = getToolDef("get_state")!;
    const schema = tool.inputSchema as any;
    assert.ok(schema.properties.path);
    assert.equal(schema.properties.path.type, "string");
  });
});

// --- Agent Protocol Integration ---

describe("Agent protocol: register and interact", () => {
  it("registers agent and captures snapshots", () => {
    let state = { ...INITIAL_STATE };
    const agent = registerAgent({
      name: "demo-game",
      getState: () => state,
      setState: (s: DemoState) => { state = s; },
      actions: {
        heal: {
          handler: (s: DemoState) => ({
            ...s,
            player: { ...s.player, hp: Math.min(s.player.hp + 20, s.player.maxHp) },
          }),
          description: "Heal the player by 20 HP",
        },
        moveRight: {
          handler: (s: DemoState) => ({
            ...s,
            player: { ...s.player, x: s.player.x + 10 },
          }),
          description: "Move player right by 10 units",
        },
      },
    });

    assert.equal(agent.name, "demo-game");
    assert.equal(agent.getState().player.x, 100);

    const snap1 = agent.captureSnapshot();
    assert.equal(snap1.state.player.x, 100);

    // Execute action
    const result = agent.executeAction("moveRight");
    assert.ok(result.ok);
    assert.equal(result.state.player.x, 110);

    // Simulate action (doesn't commit)
    const sim = agent.simulate("heal");
    assert.ok(sim.ok);
    assert.equal(sim.state.player.hp, 100); // Already at max
    assert.equal(state.player.x, 110); // State not reverted by sim

    // Rewind
    const rewound = agent.rewind();
    assert.equal(rewound.player.x, 100);
    assert.equal(state.player.x, 100);
  });

  it("lists actions with descriptions", () => {
    let state = { ...INITIAL_STATE };
    const agent = registerAgent({
      name: "action-demo",
      getState: () => state,
      setState: (s: DemoState) => { state = s; },
      actions: {
        attack: { handler: (s: DemoState) => s, description: "Attack nearby enemy" },
        defend: { handler: (s: DemoState) => s, description: "Raise shield" },
      },
    });

    const actions = agent.listActions();
    assert.equal(actions.length, 2);
    assert.ok(actions.some((a) => a.name === "attack"));
    assert.ok(actions.some((a) => a.name === "defend"));
  });
});
