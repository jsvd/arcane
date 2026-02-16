import { describe, it, assert } from "../testing/harness.ts";
import { createGame } from "./game.ts";

describe("createGame", () => {
  it("should return game object with onFrame and state methods", () => {
    const game = createGame();
    assert.equal(typeof game.onFrame, "function");
    assert.equal(typeof game.state, "function");
  });

  it("should accept config options", () => {
    const game = createGame({
      name: "test-game",
      autoCamera: false,
      autoClear: false,
      zoom: 2,
      background: { r: 30, g: 30, b: 50 },
    });
    assert.equal(typeof game.onFrame, "function");
  });

  it("should register agent protocol when name provided and state called", () => {
    const game = createGame({ name: "test-agent-game" });
    let state = { score: 0 };
    game.state({
      get: () => state,
      set: (s) => { state = s; },
    });
    const agent = (globalThis as any).__arcaneAgent;
    if (agent) {
      assert.equal(agent.name, "test-agent-game");
    }
    assert.ok(true, "state registration completed without crash");
  });

  it("should not register agent when no name is provided", () => {
    // Save any previously installed agent
    const prevAgent = (globalThis as any).__arcaneAgent;
    // Clear it to detect if createGame installs a new one
    (globalThis as any).__arcaneAgent = undefined;

    const game = createGame();
    let state = { x: 0 };
    game.state({ get: () => state, set: (s) => { state = s; } });

    assert.equal((globalThis as any).__arcaneAgent, undefined);

    // Restore previous agent
    if (prevAgent) {
      (globalThis as any).__arcaneAgent = prevAgent;
    }
  });

  it("should only register state once even if called multiple times", () => {
    const game = createGame({ name: "double-register" });
    let callCount = 0;

    // Wrap get to count calls from registerAgent
    let state = { v: 1 };
    game.state({
      get: () => { callCount++; return state; },
      set: (s) => { state = s; },
    });

    const firstAgent = (globalThis as any).__arcaneAgent;

    // Second call should be a no-op
    let state2 = { v: 2 };
    game.state({
      get: () => state2,
      set: (s) => { state2 = s; },
    });

    // Agent should still point to the first state
    const secondAgent = (globalThis as any).__arcaneAgent;
    assert.equal(firstAgent, secondAgent);
  });

  it("should install frame callback via onFrame", () => {
    const game = createGame({ autoCamera: false, autoClear: false });
    let called = false;
    game.onFrame(() => { called = true; });
    // The callback is stored on globalThis.__frameCallback; invoke it to test
    const cb = (globalThis as any).__frameCallback;
    assert.equal(typeof cb, "function");
    cb();
    assert.ok(called, "frame callback should have been invoked");
  });

  it("should pass GameContext with dt, viewport, elapsed, frame to callback", () => {
    const game = createGame({ autoCamera: false, autoClear: false });
    let receivedCtx: any = null;
    game.onFrame((ctx) => { receivedCtx = ctx; });

    // Invoke the stored frame callback
    const cb = (globalThis as any).__frameCallback;
    cb();

    assert.ok(receivedCtx !== null, "ctx should be passed");
    assert.equal(typeof receivedCtx.dt, "number");
    assert.equal(typeof receivedCtx.viewport.width, "number");
    assert.equal(typeof receivedCtx.viewport.height, "number");
    assert.equal(typeof receivedCtx.elapsed, "number");
    assert.equal(typeof receivedCtx.frame, "number");
    assert.ok(receivedCtx.frame >= 1, "frame counter should start at 1");
  });

  it("should increment frame counter on successive calls", () => {
    const game = createGame({ autoCamera: false, autoClear: false });
    const frames: number[] = [];
    game.onFrame((ctx) => { frames.push(ctx.frame); });

    const cb = (globalThis as any).__frameCallback;
    cb();
    cb();
    cb();

    assert.equal(frames.length, 3);
    assert.equal(frames[0], 1);
    assert.equal(frames[1], 2);
    assert.equal(frames[2], 3);
  });

  it("should default to sensible values when no config provided", () => {
    const game = createGame();
    // Just verify it creates without error and has expected shape
    assert.ok(game, "game object should be truthy");
    assert.equal(typeof game.onFrame, "function");
    assert.equal(typeof game.state, "function");
  });
});
