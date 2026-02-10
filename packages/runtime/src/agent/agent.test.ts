import { describe, it, assert } from "../testing/harness.ts";
import { registerAgent } from "./protocol.ts";
import { defaultDescribe } from "./describe.ts";
import { createStore } from "../state/store.ts";
import type { AgentConfig, DescribeOptions } from "./types.ts";

// --- Test state types ---

type RPGState = {
  player: { hp: number; maxHp: number; pos: { x: number; y: number } };
  enemies: { id: string; hp: number }[];
  turn: number;
  phase: "playing" | "won" | "dead";
};

const makeState = (): RPGState => ({
  player: { hp: 20, maxHp: 20, pos: { x: 1, y: 1 } },
  enemies: [
    { id: "goblin", hp: 6 },
    { id: "rat", hp: 3 },
  ],
  turn: 1,
  phase: "playing",
});

// Helper to create a get/setState-backed agent
function makeAgent(initial?: RPGState) {
  let state = initial ?? makeState();
  return registerAgent<RPGState>({
    name: "test-agent",
    getState: () => state,
    setState: (s) => { state = s; },
    actions: {
      move: {
        handler: (s, args) => ({
          ...s,
          player: {
            ...s.player,
            pos: {
              x: s.player.pos.x + (args.dx as number ?? 0),
              y: s.player.pos.y + (args.dy as number ?? 0),
            },
          },
          turn: s.turn + 1,
        }),
        description: "Move the player by (dx, dy)",
        args: [
          { name: "dx", type: "number" },
          { name: "dy", type: "number" },
        ],
      },
      wait: {
        handler: (s) => ({ ...s, turn: s.turn + 1 }),
        description: "Wait one turn",
      },
      failAction: {
        handler: () => { throw new Error("intentional failure"); },
        description: "Always fails",
      },
    },
  });
}

// --- registerAgent ---

describe("registerAgent", () => {
  it("returns a protocol with the agent name", () => {
    const agent = makeAgent();
    assert.equal(agent.name, "test-agent");
  });

  it("installs on globalThis.__arcaneAgent", () => {
    const agent = makeAgent();
    assert.equal((globalThis as any).__arcaneAgent, agent);
  });

  it("works with a GameStore", () => {
    const store = createStore(makeState());
    const agent = registerAgent<RPGState>({
      name: "store-agent",
      store,
      actions: {
        wait: {
          handler: (s) => ({ ...s, turn: s.turn + 1 }),
          description: "Wait one turn",
        },
      },
    });
    assert.equal(agent.getState().turn, 1);
    agent.executeAction("wait");
    assert.equal(agent.getState().turn, 2);
    // store should reflect the change
    assert.equal(store.getState().turn, 2);
  });
});

// --- getState ---

describe("getState", () => {
  it("returns the current state", () => {
    const agent = makeAgent();
    const state = agent.getState();
    assert.equal(state.player.hp, 20);
    assert.equal(state.turn, 1);
  });
});

// --- inspect ---

describe("inspect", () => {
  it("returns a value at a simple path", () => {
    const agent = makeAgent();
    assert.equal(agent.inspect("turn"), 1);
  });

  it("returns a value at a nested path", () => {
    const agent = makeAgent();
    assert.equal(agent.inspect("player.hp"), 20);
    assert.equal(agent.inspect("player.pos.x"), 1);
  });

  it("returns undefined for nonexistent path", () => {
    const agent = makeAgent();
    assert.equal(agent.inspect("nonexistent"), undefined);
  });

  it("returns array elements by index path", () => {
    const agent = makeAgent();
    assert.equal(agent.inspect("enemies.0.id"), "goblin");
    assert.equal(agent.inspect("enemies.1.hp"), 3);
  });
});

// --- describe ---

describe("describe", () => {
  it("uses default describe when none provided", () => {
    const agent = makeAgent();
    const desc = agent.describe();
    assert.ok(desc.includes("player"));
    assert.ok(desc.includes("turn"));
  });

  it("accepts a custom describe function", () => {
    let state = makeState();
    const agent = registerAgent<RPGState>({
      name: "custom-desc",
      getState: () => state,
      setState: (s) => { state = s; },
      describe: (s) => `Turn ${s.turn}, HP: ${s.player.hp}/${s.player.maxHp}`,
    });
    assert.equal(agent.describe(), "Turn 1, HP: 20/20");
  });

  it("passes options to describe function", () => {
    let state = makeState();
    const agent = registerAgent<RPGState>({
      name: "opts-desc",
      getState: () => state,
      setState: (s) => { state = s; },
      describe: (s, opts) => `v=${opts.verbosity ?? "normal"}, p=${opts.path ?? "none"}`,
    });
    assert.equal(agent.describe({ verbosity: "minimal" }), "v=minimal, p=none");
    assert.equal(agent.describe({ path: "player" }), "v=normal, p=player");
  });
});

// --- listActions ---

describe("listActions", () => {
  it("returns all registered actions", () => {
    const agent = makeAgent();
    const actions = agent.listActions();
    assert.equal(actions.length, 3);
    const names = actions.map((a) => a.name);
    assert.ok(names.includes("move"));
    assert.ok(names.includes("wait"));
    assert.ok(names.includes("failAction"));
  });

  it("includes description and args metadata", () => {
    const agent = makeAgent();
    const moveAction = agent.listActions().find((a) => a.name === "move");
    assert.ok(moveAction !== undefined);
    assert.equal(moveAction!.description, "Move the player by (dx, dy)");
    assert.equal(moveAction!.args!.length, 2);
    assert.equal(moveAction!.args![0].name, "dx");
  });

  it("returns empty array when no actions registered", () => {
    let state = makeState();
    const agent = registerAgent<RPGState>({
      name: "no-actions",
      getState: () => state,
      setState: (s) => { state = s; },
    });
    assert.deepEqual(agent.listActions(), []);
  });
});

// --- executeAction ---

describe("executeAction", () => {
  it("executes an action and updates state", () => {
    const agent = makeAgent();
    const result = agent.executeAction("move", JSON.stringify({ dx: 1, dy: 0 }));
    assert.equal(result.ok, true);
    assert.equal(result.state.player.pos.x, 2);
    assert.equal(result.state.turn, 2);
    // State is committed
    assert.equal(agent.getState().player.pos.x, 2);
  });

  it("executes an action with no args", () => {
    const agent = makeAgent();
    const result = agent.executeAction("wait");
    assert.equal(result.ok, true);
    assert.equal(result.state.turn, 2);
  });

  it("returns error for unknown action", () => {
    const agent = makeAgent();
    const result = agent.executeAction("nonexistent");
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("Unknown action"));
  });

  it("returns error for invalid JSON args", () => {
    const agent = makeAgent();
    const result = agent.executeAction("move", "{bad json");
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("Invalid JSON"));
  });

  it("returns error when action handler throws", () => {
    const agent = makeAgent();
    const result = agent.executeAction("failAction");
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("intentional failure"));
  });
});

// --- simulate ---

describe("simulate", () => {
  it("simulates an action without committing state", () => {
    const agent = makeAgent();
    const result = agent.simulate("move", JSON.stringify({ dx: 1, dy: 0 }));
    assert.equal(result.ok, true);
    assert.equal(result.state.player.pos.x, 2);
    // Original state unchanged
    assert.equal(agent.getState().player.pos.x, 1);
  });

  it("returns error for unknown action", () => {
    const agent = makeAgent();
    const result = agent.simulate("nonexistent");
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("Unknown action"));
  });

  it("returns error for invalid JSON args", () => {
    const agent = makeAgent();
    const result = agent.simulate("move", "{bad}");
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("Invalid JSON"));
  });

  it("returns error when simulation throws", () => {
    const agent = makeAgent();
    const result = agent.simulate("failAction");
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("intentional failure"));
  });
});

// --- rewind ---

describe("rewind", () => {
  it("resets to initial state", () => {
    const agent = makeAgent();
    agent.executeAction("move", JSON.stringify({ dx: 5, dy: 5 }));
    agent.executeAction("wait");
    assert.equal(agent.getState().turn, 3);
    assert.equal(agent.getState().player.pos.x, 6);

    const restored = agent.rewind();
    assert.equal(restored.turn, 1);
    assert.equal(restored.player.pos.x, 1);
    assert.equal(agent.getState().turn, 1);
  });

  it("returns a deep clone (modifying it does not affect agent)", () => {
    const agent = makeAgent();
    const restored = agent.rewind();
    (restored as any).turn = 999;
    assert.equal(agent.getState().turn, 1);
  });
});

// --- captureSnapshot ---

describe("captureSnapshot", () => {
  it("captures current state with timestamp", () => {
    const agent = makeAgent();
    agent.executeAction("wait");
    const snap = agent.captureSnapshot();
    assert.equal(snap.state.turn, 2);
    assert.ok(typeof snap.timestamp === "number");
    assert.ok(snap.timestamp > 0);
  });

  it("returns a deep clone", () => {
    const agent = makeAgent();
    const snap = agent.captureSnapshot();
    (snap.state as any).turn = 999;
    assert.equal(agent.getState().turn, 1);
  });
});

// --- defaultDescribe ---

describe("defaultDescribe", () => {
  it("minimal: shows key names for objects", () => {
    const desc = defaultDescribe({ a: 1, b: 2 }, { verbosity: "minimal" });
    assert.equal(desc, "{a, b}");
  });

  it("minimal: shows count for arrays", () => {
    const desc = defaultDescribe([1, 2, 3], { verbosity: "minimal" });
    assert.equal(desc, "Array(3)");
  });

  it("normal: shows first 3 keys with values", () => {
    const desc = defaultDescribe(
      { a: 1, b: "hello", c: [1, 2], d: true },
      { verbosity: "normal" },
    );
    assert.ok(desc.includes("a: 1"));
    assert.ok(desc.includes('b: "hello"'));
    assert.ok(desc.includes("c: Array(2)"));
    assert.ok(desc.includes("4 keys total"));
  });

  it("normal: shows first 3 array items", () => {
    const desc = defaultDescribe([10, 20, 30, 40], { verbosity: "normal" });
    assert.ok(desc.includes("10"));
    assert.ok(desc.includes("20"));
    assert.ok(desc.includes("30"));
    assert.ok(desc.includes("4 total"));
  });

  it("detailed: returns full JSON", () => {
    const obj = { x: 1, y: 2 };
    const desc = defaultDescribe(obj, { verbosity: "detailed" });
    assert.deepEqual(JSON.parse(desc), obj);
  });

  it("handles path option", () => {
    const state = { player: { hp: 10 }, enemies: [1, 2] };
    const desc = defaultDescribe(state, { path: "player", verbosity: "detailed" });
    assert.deepEqual(JSON.parse(desc), { hp: 10 });
  });

  it("returns not-found message for invalid path", () => {
    const desc = defaultDescribe({ a: 1 }, { path: "x.y.z" });
    assert.ok(desc.includes("not found"));
  });

  it("handles primitives", () => {
    assert.equal(defaultDescribe(42, {}), "42");
    assert.equal(defaultDescribe("hello", {}), "hello");
    assert.equal(defaultDescribe(true, {}), "true");
  });

  it("handles null state", () => {
    assert.equal(defaultDescribe(null, {}), "null");
  });

  it("defaults to normal verbosity", () => {
    const desc = defaultDescribe({ a: 1 }, {});
    assert.ok(desc.includes("a: 1"));
  });
});
