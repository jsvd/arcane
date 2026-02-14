import { describe, it, assert } from "../testing/harness.ts";
import type { InputPoller, InputBuffer } from "./actions.ts";
import type { GamepadButton, GamepadAxis } from "./types.ts";
import {
  parseBinding,
  createInputMap,
  setActionBindings,
  removeActionBinding,
  getActionBindings,
  getActionNames,
  isActionDown,
  isActionPressed,
  getActionValue,
  createInputBuffer,
  bufferAction,
  checkCombo,
  consumeCombo,
  updateInputBuffer,
} from "./actions.ts";

// --- Mock poller factory ---

function mockPoller(overrides: Partial<InputPoller> = {}): InputPoller {
  return {
    isKeyDown: () => false,
    isKeyPressed: () => false,
    isMouseButtonDown: () => false,
    isMouseButtonPressed: () => false,
    isGamepadButtonDown: () => false,
    isGamepadButtonPressed: () => false,
    getGamepadAxis: () => 0,
    isTouchActive: () => false,
    getTouchPosition: () => null,
    ...overrides,
  };
}

// --- parseBinding ---

describe("parseBinding", () => {
  it("parses keyboard key string", () => {
    const source = parseBinding("Space");
    assert.equal(source.type, "key");
    if (source.type === "key") assert.equal(source.key, "Space");
  });

  it("parses gamepad button shorthand", () => {
    const source = parseBinding("GamepadA");
    assert.equal(source.type, "gamepadButton");
    if (source.type === "gamepadButton") assert.equal(source.button, "A");
  });

  it("parses GamepadLB shorthand", () => {
    const source = parseBinding("GamepadLB");
    assert.equal(source.type, "gamepadButton");
    if (source.type === "gamepadButton") assert.equal(source.button, "LeftBumper");
  });

  it("parses GamepadDPadUp shorthand", () => {
    const source = parseBinding("GamepadDPadUp");
    assert.equal(source.type, "gamepadButton");
    if (source.type === "gamepadButton") assert.equal(source.button, "DPadUp");
  });

  it("parses mouse button shorthand", () => {
    const source = parseBinding("MouseLeft");
    assert.equal(source.type, "mouseButton");
    if (source.type === "mouseButton") assert.equal(source.button, 0);
  });

  it("parses MouseRight shorthand", () => {
    const source = parseBinding("MouseRight");
    assert.equal(source.type, "mouseButton");
    if (source.type === "mouseButton") assert.equal(source.button, 1);
  });

  it("passes through InputSource objects unchanged", () => {
    const source = parseBinding({ type: "gamepadAxis", axis: "LeftStickX", direction: 1 });
    assert.equal(source.type, "gamepadAxis");
    if (source.type === "gamepadAxis") {
      assert.equal(source.axis, "LeftStickX");
      assert.equal(source.direction, 1);
    }
  });

  it("parses plain letter keys", () => {
    const source = parseBinding("a");
    assert.equal(source.type, "key");
    if (source.type === "key") assert.equal(source.key, "a");
  });
});

// --- createInputMap ---

describe("createInputMap", () => {
  it("creates a map from binding arrays", () => {
    const map = createInputMap({
      jump: ["Space", "GamepadA"],
      attack: ["x"],
    });
    assert.equal(map.actions.size, 2);
    assert.ok(map.actions.has("jump"));
    assert.ok(map.actions.has("attack"));
  });

  it("resolves shorthand strings to sources", () => {
    const map = createInputMap({ jump: ["Space", "GamepadA"] });
    const action = map.actions.get("jump")!;
    assert.equal(action.sources.length, 2);
    assert.equal(action.sources[0].type, "key");
    assert.equal(action.sources[1].type, "gamepadButton");
  });

  it("supports ActionDef with analog flag", () => {
    const map = createInputMap({
      moveX: {
        bindings: [{ type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
        analog: true,
      },
    });
    const action = map.actions.get("moveX")!;
    assert.equal(action.analog, true);
  });

  it("defaults analog to false for array bindings", () => {
    const map = createInputMap({ fire: ["Space"] });
    assert.equal(map.actions.get("fire")!.analog, false);
  });

  it("handles empty map", () => {
    const map = createInputMap({});
    assert.equal(map.actions.size, 0);
  });
});

// --- setActionBindings / removeActionBinding ---

describe("action binding modification", () => {
  it("setActionBindings replaces bindings", () => {
    const map = createInputMap({ jump: ["Space"] });
    setActionBindings(map, "jump", ["w", "GamepadA"]);
    const sources = getActionBindings(map, "jump");
    assert.equal(sources.length, 2);
    assert.equal(sources[0].type, "key");
    if (sources[0].type === "key") assert.equal(sources[0].key, "w");
  });

  it("setActionBindings creates new action", () => {
    const map = createInputMap({});
    setActionBindings(map, "fire", ["x"]);
    assert.equal(map.actions.size, 1);
    assert.ok(map.actions.has("fire"));
  });

  it("removeActionBinding removes a binding", () => {
    const map = createInputMap({ jump: ["Space", "GamepadA"] });
    const removed = removeActionBinding(map, "jump", "Space");
    assert.equal(removed, true);
    const sources = getActionBindings(map, "jump");
    assert.equal(sources.length, 1);
    assert.equal(sources[0].type, "gamepadButton");
  });

  it("removeActionBinding returns false for unknown action", () => {
    const map = createInputMap({});
    assert.equal(removeActionBinding(map, "nonexistent", "Space"), false);
  });

  it("removeActionBinding returns false for non-matching binding", () => {
    const map = createInputMap({ jump: ["Space"] });
    assert.equal(removeActionBinding(map, "jump", "w"), false);
  });
});

// --- getActionNames / getActionBindings ---

describe("action queries", () => {
  it("getActionNames lists all actions", () => {
    const map = createInputMap({ jump: ["Space"], fire: ["x"] });
    const names = getActionNames(map);
    assert.equal(names.length, 2);
    assert.ok(names.includes("jump"));
    assert.ok(names.includes("fire"));
  });

  it("getActionBindings returns empty for unknown action", () => {
    const map = createInputMap({});
    assert.deepEqual(getActionBindings(map, "missing"), []);
  });
});

// --- isActionDown ---

describe("isActionDown", () => {
  it("returns true when keyboard key is down", () => {
    const map = createInputMap({ jump: ["Space"] });
    const p = mockPoller({ isKeyDown: (k) => k === "Space" });
    assert.equal(isActionDown("jump", map, p), true);
  });

  it("returns false when no binding is active", () => {
    const map = createInputMap({ jump: ["Space"] });
    const p = mockPoller();
    assert.equal(isActionDown("jump", map, p), false);
  });

  it("returns true when any of multiple bindings is active", () => {
    const map = createInputMap({ jump: ["Space", "GamepadA"] });
    const p = mockPoller({ isGamepadButtonDown: (b) => b === "A" });
    assert.equal(isActionDown("jump", map, p), true);
  });

  it("returns true for mouse button binding", () => {
    const map = createInputMap({ fire: ["MouseLeft"] });
    const p = mockPoller({ isMouseButtonDown: (b) => b === 0 });
    assert.equal(isActionDown("fire", map, p), true);
  });

  it("returns true for gamepad axis exceeding threshold", () => {
    const map = createInputMap({
      moveRight: [{ type: "gamepadAxis", axis: "LeftStickX", direction: 1, threshold: 0.3 }],
    });
    const p = mockPoller({ getGamepadAxis: () => 0.8 });
    assert.equal(isActionDown("moveRight", map, p), true);
  });

  it("returns false for gamepad axis below threshold", () => {
    const map = createInputMap({
      moveRight: [{ type: "gamepadAxis", axis: "LeftStickX", direction: 1, threshold: 0.3 }],
    });
    const p = mockPoller({ getGamepadAxis: () => 0.1 });
    assert.equal(isActionDown("moveRight", map, p), false);
  });

  it("returns false for unknown action", () => {
    const map = createInputMap({});
    const p = mockPoller();
    assert.equal(isActionDown("nonexistent", map, p), false);
  });

  it("returns true for touch binding when touch active", () => {
    const map = createInputMap({ tap: [{ type: "touch" }] });
    const p = mockPoller({ isTouchActive: () => true });
    assert.equal(isActionDown("tap", map, p), true);
  });
});

// --- isActionPressed ---

describe("isActionPressed", () => {
  it("returns true when keyboard key was just pressed", () => {
    const map = createInputMap({ jump: ["Space"] });
    const p = mockPoller({ isKeyPressed: (k) => k === "Space" });
    assert.equal(isActionPressed("jump", map, p), true);
  });

  it("returns true when gamepad button was just pressed", () => {
    const map = createInputMap({ jump: ["GamepadA"] });
    const p = mockPoller({ isGamepadButtonPressed: (b) => b === "A" });
    assert.equal(isActionPressed("jump", map, p), true);
  });

  it("returns false when no binding was pressed", () => {
    const map = createInputMap({ jump: ["Space"] });
    const p = mockPoller();
    assert.equal(isActionPressed("jump", map, p), false);
  });

  it("returns true for mouse button pressed", () => {
    const map = createInputMap({ click: ["MouseLeft"] });
    const p = mockPoller({ isMouseButtonPressed: (b) => b === 0 });
    assert.equal(isActionPressed("click", map, p), true);
  });
});

// --- getActionValue ---

describe("getActionValue", () => {
  it("returns 1 for active digital key", () => {
    const map = createInputMap({ jump: ["Space"] });
    const p = mockPoller({ isKeyDown: (k) => k === "Space" });
    assert.equal(getActionValue("jump", map, p), 1);
  });

  it("returns 0 for inactive digital key", () => {
    const map = createInputMap({ jump: ["Space"] });
    const p = mockPoller();
    assert.equal(getActionValue("jump", map, p), 0);
  });

  it("returns analog axis value for positive direction", () => {
    const map = createInputMap({
      moveRight: [{ type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
    });
    const p = mockPoller({ getGamepadAxis: () => 0.75 });
    assert.equal(getActionValue("moveRight", map, p), 0.75);
  });

  it("returns 0 for negative axis value when direction is positive", () => {
    const map = createInputMap({
      moveRight: [{ type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
    });
    const p = mockPoller({ getGamepadAxis: () => -0.5 });
    assert.equal(getActionValue("moveRight", map, p), 0);
  });

  it("returns negative axis value for negative direction", () => {
    const map = createInputMap({
      moveLeft: [{ type: "gamepadAxis", axis: "LeftStickX", direction: -1 }],
    });
    const p = mockPoller({ getGamepadAxis: () => -0.6 });
    assert.equal(getActionValue("moveLeft", map, p), -0.6);
  });

  it("returns the value with highest magnitude among bindings", () => {
    const map = createInputMap({
      moveRight: [
        "d",
        { type: "gamepadAxis", axis: "LeftStickX", direction: 1 },
      ],
    });
    const p = mockPoller({
      isKeyDown: (k) => k === "d",
      getGamepadAxis: () => 0.3,
    });
    // Key gives 1, axis gives 0.3 — key wins
    assert.equal(getActionValue("moveRight", map, p), 1);
  });

  it("returns 0 for unknown action", () => {
    const map = createInputMap({});
    const p = mockPoller();
    assert.equal(getActionValue("nonexistent", map, p), 0);
  });
});

// --- Input buffer ---

describe("createInputBuffer", () => {
  it("creates buffer with default maxAge", () => {
    const buf = createInputBuffer();
    assert.equal(buf.maxAge, 1.0);
    assert.equal(buf.entries.length, 0);
  });

  it("creates buffer with custom maxAge", () => {
    const buf = createInputBuffer(0.5);
    assert.equal(buf.maxAge, 0.5);
  });
});

describe("bufferAction", () => {
  it("adds an entry", () => {
    const buf = createInputBuffer();
    bufferAction(buf, "jump", 1.0);
    assert.equal(buf.entries.length, 1);
    assert.equal(buf.entries[0].action, "jump");
    assert.equal(buf.entries[0].time, 1.0);
  });

  it("removes expired entries", () => {
    const buf = createInputBuffer(0.5);
    bufferAction(buf, "old", 0.0);
    bufferAction(buf, "new", 1.0);
    assert.equal(buf.entries.length, 1);
    assert.equal(buf.entries[0].action, "new");
  });
});

// --- Combos ---

describe("checkCombo", () => {
  it("detects a simple 2-input combo", () => {
    const buf = createInputBuffer(2.0);
    bufferAction(buf, "down", 1.0);
    bufferAction(buf, "forward", 1.1);
    bufferAction(buf, "punch", 1.2);

    const combo = { sequence: ["down", "forward", "punch"], window: 0.5 };
    assert.equal(checkCombo(buf, combo, 1.2), true);
  });

  it("fails if combo window exceeded", () => {
    const buf = createInputBuffer(5.0);
    bufferAction(buf, "down", 0.0);
    bufferAction(buf, "forward", 0.3);
    bufferAction(buf, "punch", 1.0);

    const combo = { sequence: ["down", "forward", "punch"], window: 0.5 };
    assert.equal(checkCombo(buf, combo, 1.0), false);
  });

  it("fails if sequence incomplete", () => {
    const buf = createInputBuffer(2.0);
    bufferAction(buf, "down", 1.0);
    bufferAction(buf, "punch", 1.1);

    const combo = { sequence: ["down", "forward", "punch"], window: 0.5 };
    assert.equal(checkCombo(buf, combo, 1.1), false);
  });

  it("returns false for empty sequence", () => {
    const buf = createInputBuffer();
    assert.equal(checkCombo(buf, { sequence: [], window: 1 }, 0), false);
  });
});

describe("consumeCombo", () => {
  it("removes matched entries", () => {
    const buf = createInputBuffer(2.0);
    bufferAction(buf, "down", 1.0);
    bufferAction(buf, "forward", 1.1);
    bufferAction(buf, "punch", 1.2);

    consumeCombo(buf, { sequence: ["down", "forward", "punch"], window: 0.5 });
    assert.equal(buf.entries.length, 0);
  });

  it("leaves non-matched entries", () => {
    const buf = createInputBuffer(2.0);
    bufferAction(buf, "jump", 0.8);
    bufferAction(buf, "down", 1.0);
    bufferAction(buf, "punch", 1.1);

    consumeCombo(buf, { sequence: ["down", "punch"], window: 0.5 });
    assert.equal(buf.entries.length, 1);
    assert.equal(buf.entries[0].action, "jump");
  });
});

describe("updateInputBuffer", () => {
  it("auto-buffers pressed actions", () => {
    const map = createInputMap({ jump: ["Space"], fire: ["x"] });
    const buf = createInputBuffer();
    const p = mockPoller({ isKeyPressed: (k) => k === "Space" });

    updateInputBuffer(buf, map, 1.0, p);
    assert.equal(buf.entries.length, 1);
    assert.equal(buf.entries[0].action, "jump");
  });

  it("buffers multiple pressed actions", () => {
    const map = createInputMap({ jump: ["Space"], fire: ["x"] });
    const buf = createInputBuffer();
    const p = mockPoller({ isKeyPressed: () => true });

    updateInputBuffer(buf, map, 1.0, p);
    assert.equal(buf.entries.length, 2);
  });
});

// --- Negative axis direction for gamepad ---

describe("gamepad axis negative direction", () => {
  it("isActionDown returns true for negative axis below negative threshold", () => {
    const map = createInputMap({
      moveLeft: [{ type: "gamepadAxis", axis: "LeftStickX", direction: -1, threshold: 0.5 }],
    });
    const p = mockPoller({ getGamepadAxis: () => -0.7 });
    assert.equal(isActionDown("moveLeft", map, p), true);
  });

  it("isActionDown returns false for negative direction with positive axis", () => {
    const map = createInputMap({
      moveLeft: [{ type: "gamepadAxis", axis: "LeftStickX", direction: -1, threshold: 0.5 }],
    });
    const p = mockPoller({ getGamepadAxis: () => 0.7 });
    assert.equal(isActionDown("moveLeft", map, p), false);
  });
});

// --- Edge cases ---

describe("edge cases", () => {
  it("default threshold for axis is 0.5", () => {
    const map = createInputMap({
      move: [{ type: "gamepadAxis", axis: "LeftStickX", direction: 1 }],
    });
    const p = mockPoller({ getGamepadAxis: () => 0.49 });
    assert.equal(isActionDown("move", map, p), false);
    const p2 = mockPoller({ getGamepadAxis: () => 0.5 });
    assert.equal(isActionDown("move", map, p2), true);
  });

  it("multiple gamepad shorthands all parse correctly", () => {
    const shorthands = [
      "GamepadA", "GamepadB", "GamepadX", "GamepadY",
      "GamepadLB", "GamepadRB", "GamepadLT", "GamepadRT",
      "GamepadSelect", "GamepadStart", "GamepadLS", "GamepadRS",
      "GamepadDPadUp", "GamepadDPadDown", "GamepadDPadLeft", "GamepadDPadRight",
      "GamepadGuide",
    ];
    for (const s of shorthands) {
      const source = parseBinding(s);
      assert.equal(source.type, "gamepadButton");
    }
  });

  it("setActionBindings preserves analog flag", () => {
    const map = createInputMap({
      moveX: { bindings: [{ type: "gamepadAxis", axis: "LeftStickX", direction: 1 }], analog: true },
    });
    setActionBindings(map, "moveX", ["d"]);
    assert.equal(map.actions.get("moveX")!.analog, true);
  });
});
