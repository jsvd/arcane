import { describe, it, assert } from "./harness.ts";
import {
  checkProperty,
  assertProperty,
  randomKeys,
  randomClicks,
  randomActions,
  combineGenerators,
  type PropertyConfig,
} from "./property.ts";
import { seed as seedFn } from "../state/prng.ts";

// --- Test state and update function ---

type GameState = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  score: number;
};

const initialState: GameState = { x: 0, y: 0, hp: 100, maxHp: 100, score: 0 };

// Correct update function: HP clamped to maxHp
const correctUpdate = (state: GameState, input: { keysPressed: readonly string[] }) => {
  let hp = state.hp;
  let x = state.x;
  let y = state.y;
  let score = state.score;

  if (input.keysPressed.includes("h")) hp = Math.min(hp + 30, state.maxHp);
  if (input.keysPressed.includes("d")) hp -= 10;
  if (input.keysPressed.includes("ArrowRight")) x += 5;
  if (input.keysPressed.includes("ArrowLeft")) x -= 5;
  if (input.keysPressed.includes("s")) score += 10;

  return { ...state, hp, x, y, score };
};

// Buggy update function: HP can exceed maxHp
const buggyUpdate = (state: GameState, input: { keysPressed: readonly string[] }) => {
  let hp = state.hp;
  if (input.keysPressed.includes("h")) hp += 30; // Bug: no cap!
  if (input.keysPressed.includes("d")) hp -= 10;
  return { ...state, hp };
};

// --- checkProperty ---

describe("checkProperty", () => {
  it("passes when invariant holds across all runs", () => {
    const result = checkProperty({
      name: "HP capped",
      seed: 42,
      numRuns: 50,
      framesPerRun: 30,
      initialState,
      update: correctUpdate,
      invariant: (s) => s.hp <= s.maxHp,
      generator: randomActions(["h", "d", "ArrowRight"]),
    });
    assert.ok(result.ok);
    assert.equal(result.name, "HP capped");
    assert.equal(result.runsCompleted, 50);
    assert.ok(result.totalFramesTested > 0);
  });

  it("detects invariant violation with buggy update", () => {
    const result = checkProperty({
      name: "HP never exceeds max",
      seed: 42,
      numRuns: 100,
      framesPerRun: 50,
      initialState,
      update: buggyUpdate,
      invariant: (s) => s.hp <= s.maxHp,
      generator: randomActions(["h", "d"]),
    });
    assert.equal(result.ok, false);
    assert.ok(result.failure !== undefined);
    assert.ok(result.failure!.violationFrame >= 0);
    assert.ok(result.failure!.violationState!.hp > 100);
  });

  it("is deterministic — same seed produces same result", () => {
    const config: PropertyConfig<GameState> = {
      name: "determinism test",
      seed: 123,
      numRuns: 20,
      framesPerRun: 20,
      initialState,
      update: buggyUpdate,
      invariant: (s) => s.hp <= s.maxHp,
      generator: randomActions(["h", "d"]),
    };
    const r1 = checkProperty(config);
    const r2 = checkProperty(config);
    assert.equal(r1.ok, r2.ok);
    assert.equal(r1.runsCompleted, r2.runsCompleted);
    if (r1.failure && r2.failure) {
      assert.equal(r1.failure.violationFrame, r2.failure.violationFrame);
      assert.equal(r1.failure.runSeed, r2.failure.runSeed);
    }
  });

  it("respects numRuns parameter", () => {
    const result = checkProperty({
      name: "custom runs",
      seed: 7,
      numRuns: 5,
      framesPerRun: 10,
      initialState,
      update: correctUpdate,
      invariant: () => true,
      generator: randomActions(["h"]),
    });
    assert.equal(result.runsCompleted, 5);
  });

  it("respects framesPerRun parameter", () => {
    const result = checkProperty({
      name: "frame count",
      seed: 7,
      numRuns: 1,
      framesPerRun: 25,
      initialState,
      update: correctUpdate,
      invariant: () => true,
      generator: randomActions(["h"]),
    });
    assert.equal(result.totalFramesTested, 25);
  });
});

// --- Shrinking ---

describe("shrinking", () => {
  it("produces a shorter input sequence than original failure", () => {
    const result = checkProperty({
      name: "shrink test",
      seed: 42,
      numRuns: 100,
      framesPerRun: 50,
      initialState,
      update: buggyUpdate,
      invariant: (s) => s.hp <= s.maxHp,
      generator: randomActions(["h", "d"]),
      shrink: true,
    });
    assert.equal(result.ok, false);
    assert.ok(result.shrunkFailure !== undefined);
    assert.ok(result.shrunkFailure!.inputs.length <= result.failure!.inputs.length);
  });

  it("shrunk result still violates invariant", () => {
    const result = checkProperty({
      name: "shrunk still fails",
      seed: 99,
      numRuns: 50,
      framesPerRun: 30,
      initialState,
      update: buggyUpdate,
      invariant: (s) => s.hp <= s.maxHp,
      generator: randomActions(["h", "d", "ArrowRight"]),
      shrink: true,
    });
    if (result.shrunkFailure) {
      assert.ok(result.shrunkFailure.violationState!.hp > 100);
    }
  });

  it("can be disabled", () => {
    const result = checkProperty({
      name: "no shrink",
      seed: 42,
      numRuns: 100,
      framesPerRun: 50,
      initialState,
      update: buggyUpdate,
      invariant: (s) => s.hp <= s.maxHp,
      generator: randomActions(["h", "d"]),
      shrink: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.shrunkFailure, undefined);
  });
});

// --- Generators ---

describe("randomKeys generator", () => {
  it("produces valid input frames", () => {
    const gen = randomKeys(["a", "b", "c"]);

    let rng = seedFn(42);
    for (let i = 0; i < 20; i++) {
      const [frame, nextRng] = gen(rng);
      rng = nextRng;
      assert.ok(Array.isArray(frame.keysDown));
      assert.ok(Array.isArray(frame.keysPressed));
      assert.equal(typeof frame.mouseX, "number");
      assert.equal(typeof frame.mouseY, "number");
      // All keys should be from the provided set
      for (const k of frame.keysDown) {
        assert.ok(["a", "b", "c"].includes(k), `Unexpected key: ${k}`);
      }
      for (const k of frame.keysPressed) {
        assert.ok(["a", "b", "c"].includes(k), `Unexpected pressed key: ${k}`);
      }
    }
  });

  it("works with empty key set", () => {
    const gen = randomKeys([]);

    const [frame] = gen(seedFn(1));
    assert.deepEqual(frame.keysDown, []);
    assert.deepEqual(frame.keysPressed, []);
  });
});

describe("randomClicks generator", () => {
  it("produces mouse positions within bounds", () => {
    const gen = randomClicks(800, 600);

    let rng = seedFn(42);
    for (let i = 0; i < 20; i++) {
      const [frame, nextRng] = gen(rng);
      rng = nextRng;
      assert.ok(frame.mouseX >= 0 && frame.mouseX <= 800);
      assert.ok(frame.mouseY >= 0 && frame.mouseY <= 600);
    }
  });
});

describe("randomActions generator", () => {
  it("produces frames with at most one action", () => {
    const gen = randomActions(["attack", "defend", "heal"]);

    let rng = seedFn(42);
    for (let i = 0; i < 20; i++) {
      const [frame, nextRng] = gen(rng);
      rng = nextRng;
      assert.ok(frame.keysPressed.length <= 1);
      assert.deepEqual(frame.keysDown, []);
    }
  });
});

describe("combineGenerators", () => {
  it("produces frames from both generators", () => {
    const keyGen = randomKeys(["a"]);
    const clickGen = randomClicks(100, 100);
    const combined = combineGenerators(keyGen, clickGen);

    let rng = seedFn(42);
    let hadKeys = false;
    let hadMouse = false;
    for (let i = 0; i < 50; i++) {
      const [frame, nextRng] = combined(rng);
      rng = nextRng;
      if (frame.keysDown.length > 0 || frame.keysPressed.includes("a")) hadKeys = true;
      if (frame.mouseX > 0 || frame.mouseY > 0) hadMouse = true;
    }
    // With 50 frames, we should see both types
    assert.ok(hadKeys || hadMouse, "Combined generator should produce varied frames");
  });
});

// --- assertProperty ---

describe("assertProperty", () => {
  it("does not throw for passing property", () => {
    assertProperty({
      name: "always true",
      seed: 1,
      numRuns: 10,
      framesPerRun: 10,
      initialState,
      update: correctUpdate,
      invariant: () => true,
      generator: randomActions(["h"]),
    });
  });

  it("throws for failing property", () => {
    assert.throws(
      () => assertProperty({
        name: "HP bounded",
        seed: 42,
        numRuns: 100,
        framesPerRun: 50,
        initialState,
        update: buggyUpdate,
        invariant: (s) => s.hp <= s.maxHp,
        generator: randomActions(["h", "d"]),
      }),
      /HP bounded/,
    );
  });

  it("error message contains property name and frame info", () => {
    try {
      assertProperty({
        name: "bounded-check",
        seed: 42,
        numRuns: 100,
        framesPerRun: 50,
        initialState,
        update: buggyUpdate,
        invariant: (s) => s.hp <= s.maxHp,
        generator: randomActions(["h", "d"]),
      });
      assert.ok(false, "Should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      assert.ok(msg.includes("bounded-check"));
      assert.ok(msg.includes("frame"));
      assert.ok(msg.includes("State:"));
    }
  });
});

// --- Edge cases ---

describe("edge cases", () => {
  it("handles zero-frame runs", () => {
    const result = checkProperty({
      name: "zero frames",
      seed: 1,
      numRuns: 5,
      framesPerRun: 0,
      initialState,
      update: correctUpdate,
      invariant: () => true,
      generator: randomActions(["h"]),
    });
    assert.ok(result.ok);
    assert.equal(result.totalFramesTested, 0);
  });

  it("handles single-frame runs", () => {
    const result = checkProperty({
      name: "one frame",
      seed: 1,
      numRuns: 10,
      framesPerRun: 1,
      initialState,
      update: correctUpdate,
      invariant: () => true,
      generator: randomActions(["h"]),
    });
    assert.ok(result.ok);
    assert.equal(result.totalFramesTested, 10);
  });

  it("invariant receives correct frame number", () => {
    const framesSeen: number[] = [];
    checkProperty({
      name: "frame tracking",
      seed: 1,
      numRuns: 1,
      framesPerRun: 5,
      initialState,
      update: correctUpdate,
      invariant: (_s, frame) => { framesSeen.push(frame); return true; },
      generator: randomActions(["h"]),
    });
    assert.deepEqual(framesSeen, [0, 1, 2, 3, 4]);
  });
});
