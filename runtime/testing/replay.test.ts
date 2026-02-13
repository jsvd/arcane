import { describe, it, assert } from "./harness.ts";
import {
  startRecording,
  stopRecording,
  replay,
  diffReplays,
  createRecording,
  emptyFrame,
  type InputFrame,
  type UpdateFn,
} from "./replay.ts";

// Simple game state for testing
type TestState = { x: number; y: number; jumps: number };

const initialState: TestState = { x: 0, y: 0, jumps: 0 };

// Deterministic update function
const updateFn: UpdateFn<TestState> = (state, input) => {
  let x = state.x;
  let y = state.y;
  let jumps = state.jumps;
  const speed = 5;

  if (input.keysDown.includes("ArrowRight")) x += speed;
  if (input.keysDown.includes("ArrowLeft")) x -= speed;
  if (input.keysDown.includes("ArrowUp")) y -= speed;
  if (input.keysDown.includes("ArrowDown")) y += speed;
  if (input.keysPressed.includes("Space")) jumps++;

  return { x, y, jumps };
};

// --- Recording ---

describe("startRecording / stopRecording", () => {
  it("creates an empty recording when no frames recorded", () => {
    const session = startRecording();
    const rec = stopRecording(session);
    assert.equal(rec.frameCount, 0);
    assert.deepEqual(rec.frames, []);
    assert.deepEqual(rec.snapshots, []);
  });

  it("records input frames in order", () => {
    const session = startRecording();
    session.recordFrame(emptyFrame({ keysDown: ["ArrowRight"] }));
    session.recordFrame(emptyFrame({ keysPressed: ["Space"] }));
    session.recordFrame(emptyFrame({ mouseX: 100, mouseY: 200 }));
    const rec = stopRecording(session);

    assert.equal(rec.frameCount, 3);
    assert.deepEqual(rec.frames[0].keysDown, ["ArrowRight"]);
    assert.deepEqual(rec.frames[1].keysPressed, ["Space"]);
    assert.equal(rec.frames[2].mouseX, 100);
    assert.equal(rec.frames[2].mouseY, 200);
  });

  it("tracks current frame number", () => {
    const session = startRecording();
    assert.equal(session.currentFrame, 0);
    session.recordFrame(emptyFrame());
    assert.equal(session.currentFrame, 1);
    session.recordFrame(emptyFrame());
    assert.equal(session.currentFrame, 2);
  });

  it("captures state snapshots at current frame", () => {
    const session = startRecording<TestState>();
    session.recordFrame(emptyFrame());
    session.captureSnapshot({ x: 10, y: 0, jumps: 0 });
    session.recordFrame(emptyFrame());
    session.recordFrame(emptyFrame());
    session.captureSnapshot({ x: 30, y: 0, jumps: 1 });
    const rec = stopRecording(session);

    assert.equal(rec.snapshots.length, 2);
    assert.equal(rec.snapshots[0].frame, 1);
    assert.deepEqual(rec.snapshots[0].state, { x: 10, y: 0, jumps: 0 });
    assert.equal(rec.snapshots[1].frame, 3);
    assert.deepEqual(rec.snapshots[1].state, { x: 30, y: 0, jumps: 1 });
  });

  it("preserves default dt", () => {
    const session = startRecording(1 / 30);
    const rec = stopRecording(session);
    assert.equal(rec.defaultDt, 1 / 30);
  });

  it("deep clones snapshot state (mutations don't affect recording)", () => {
    const session = startRecording<TestState>();
    const state = { x: 10, y: 20, jumps: 3 };
    session.captureSnapshot(state);
    state.x = 999;
    const rec = stopRecording(session);
    assert.equal(rec.snapshots[0].state.x, 10);
  });
});

// --- createRecording ---

describe("createRecording", () => {
  it("creates recording from frame array", () => {
    const frames: InputFrame[] = [
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysPressed: ["Space"] }),
    ];
    const rec = createRecording(frames);
    assert.equal(rec.frameCount, 2);
    assert.equal(rec.snapshots.length, 0);
  });

  it("uses custom default dt", () => {
    const rec = createRecording([], 1 / 30);
    assert.equal(rec.defaultDt, 1 / 30);
  });
});

// --- emptyFrame ---

describe("emptyFrame", () => {
  it("returns frame with all defaults", () => {
    const frame = emptyFrame();
    assert.deepEqual(frame.keysDown, []);
    assert.deepEqual(frame.keysPressed, []);
    assert.equal(frame.mouseX, 0);
    assert.equal(frame.mouseY, 0);
  });

  it("accepts partial overrides", () => {
    const frame = emptyFrame({ keysDown: ["a", "b"], mouseX: 50 });
    assert.deepEqual(frame.keysDown, ["a", "b"]);
    assert.equal(frame.mouseX, 50);
    assert.equal(frame.mouseY, 0);
  });
});

// --- replay ---

describe("replay", () => {
  it("replays empty recording and returns initial state", () => {
    const rec = createRecording([]);
    const result = replay(rec, updateFn, initialState);
    assert.ok(result.ok);
    assert.deepEqual(result.finalState, initialState);
    assert.equal(result.framesPlayed, 0);
    assert.equal(result.failedFrame, -1);
  });

  it("applies input frames deterministically", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowDown"] }),
    ]);
    const result = replay(rec, updateFn, initialState);
    assert.ok(result.ok);
    assert.equal(result.finalState.x, 10);
    assert.equal(result.finalState.y, 5);
    assert.equal(result.framesPlayed, 3);
  });

  it("tracks key presses for jumps", () => {
    const rec = createRecording([
      emptyFrame({ keysPressed: ["Space"] }),
      emptyFrame(),
      emptyFrame({ keysPressed: ["Space"] }),
    ]);
    const result = replay(rec, updateFn, initialState);
    assert.ok(result.ok);
    assert.equal(result.finalState.jumps, 2);
  });

  it("checks assertion at specific frame (pass)", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, {
      assertFrame: { frame: 0, check: (s) => s.x === 5 },
    });
    assert.ok(result.ok);
  });

  it("checks assertion at specific frame (fail - returns false)", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, {
      assertFrame: { frame: 0, check: (s) => s.x === 999 },
    });
    assert.equal(result.ok, false);
    assert.equal(result.failedFrame, 0);
    assert.ok(result.error!.includes("frame 0"));
  });

  it("checks assertion at specific frame (fail - throws)", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, {
      assertFrame: {
        frame: 0,
        check: () => { throw new Error("bad state"); },
      },
    });
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("bad state"));
  });

  it("supports multiple assertions", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, {
      assertFrame: [
        { frame: 0, check: (s) => s.x === 5 },
        { frame: 2, check: (s) => s.x === 15 },
      ],
    });
    assert.ok(result.ok);
  });

  it("reports first failing assertion among multiple", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, {
      assertFrame: [
        { frame: 0, check: (s) => s.x === 5 },
        { frame: 1, check: (s) => s.x === 999 },
        { frame: 2, check: (s) => s.x === 15 },
      ],
    });
    assert.equal(result.ok, false);
    assert.equal(result.failedFrame, 1);
  });

  it("compares expected final state (pass)", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, {
      expectedFinalState: { x: 5, y: 0, jumps: 0 },
    });
    assert.ok(result.ok);
  });

  it("compares expected final state (fail)", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, {
      expectedFinalState: { x: 999, y: 0, jumps: 0 },
    });
    assert.equal(result.ok, false);
    assert.ok(result.error!.includes("Final state mismatch"));
    assert.ok(result.error!.includes("x"));
  });

  it("stops at specified frame", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = replay(rec, updateFn, initialState, { stopAtFrame: 2 });
    assert.ok(result.ok);
    assert.equal(result.framesPlayed, 2);
    assert.equal(result.finalState.x, 10);
  });

  it("produces identical results from identical inputs (determinism)", () => {
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysPressed: ["Space"] }),
      emptyFrame({ keysDown: ["ArrowDown", "ArrowRight"] }),
    ]);
    const r1 = replay(rec, updateFn, initialState);
    const r2 = replay(rec, updateFn, initialState);
    assert.deepEqual(r1.finalState, r2.finalState);
  });

  it("does not mutate initial state", () => {
    const init = { x: 0, y: 0, jumps: 0 };
    const rec = createRecording([
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    replay(rec, updateFn, init);
    assert.equal(init.x, 0);
  });
});

// --- diffReplays ---

describe("diffReplays", () => {
  it("identical recordings produce identical diff", () => {
    const rec = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = diffReplays(rec, rec, updateFn, initialState);
    assert.ok(result.identical);
    assert.equal(result.divergenceFrame, -1);
    assert.deepEqual(result.differingPaths, []);
  });

  it("detects divergence at correct frame", () => {
    const recA = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const recB = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowLeft"] }),
    ]);
    const result = diffReplays(recA, recB, updateFn, initialState);
    assert.equal(result.identical, false);
    assert.equal(result.divergenceFrame, 1);
    assert.ok(result.differingPaths.includes("x"));
  });

  it("detects divergence from first frame", () => {
    const recA = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const recB = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowLeft"] }),
    ]);
    const result = diffReplays(recA, recB, updateFn, initialState);
    assert.equal(result.identical, false);
    assert.equal(result.divergenceFrame, 0);
  });

  it("handles recordings of different lengths", () => {
    const recA = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const recB = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const result = diffReplays(recA, recB, updateFn, initialState);
    // After frame 0: both identical (x=5)
    // After frame 1: A stays at x=5, B goes to x=10
    assert.equal(result.identical, false);
    assert.equal(result.divergenceFrame, 1);
  });

  it("reports differing state values", () => {
    const recA = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowRight"] }),
    ]);
    const recB = createRecording<TestState>([
      emptyFrame({ keysDown: ["ArrowDown"] }),
    ]);
    const result = diffReplays(recA, recB, updateFn, initialState);
    assert.equal(result.identical, false);
    assert.ok(result.stateA !== undefined);
    assert.ok(result.stateB !== undefined);
    assert.equal(result.stateA!.x, 5);
    assert.equal(result.stateB!.y, 5);
  });
});
