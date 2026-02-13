import { describe, it, assert } from "./harness.ts";
import {
  captureWorldSnapshot,
  restoreWorldSnapshot,
  applyFSMRestore,
  serializeSnapshot,
  deserializeSnapshot,
  diffSnapshots,
  emptySnapshot,
  type WorldSnapshot,
  type CaptureOptions,
  type AnimationSnapshot,
  type FSMSnapshot,
  type TweenSnapshot,
  type EmitterSnapshot,
  type TweenSnapshotInput,
  type EmitterSnapshotInput,
  type ParticleInputData,
  type SceneStackInput,
} from "./snapshot.ts";
import type { PRNGState } from "../state/prng.ts";
import { seed, randomInt } from "../state/prng.ts";
import type { AnimationState } from "../rendering/animation.ts";
import type { FSMState, FSMConfig, BlendState } from "../rendering/animation-fsm.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makePrng(n: number = 42): PRNGState {
  return seed(n);
}

function makeAnimState(defId: number = 1, elapsed: number = 0.5, frame: number = 3): AnimationState {
  return { defId, elapsed, frame, finished: false };
}

function makeFinishedAnimState(defId: number = 1): AnimationState {
  return { defId, elapsed: 1.0, frame: 5, finished: true };
}

function makeFSMConfig(): FSMConfig {
  return {
    states: {
      idle: { animationId: 1 },
      walk: { animationId: 2 },
    },
    transitions: [],
    initialState: "idle",
    defaultBlendDuration: 0.1,
  };
}

function makeFSMState(currentState: string = "idle"): FSMState {
  const config = makeFSMConfig();
  return {
    config,
    currentState,
    animation: makeAnimState(config.states[currentState]?.animationId ?? 1),
    blend: null,
    sortedTransitions: [],
  };
}

function makeFSMStateWithBlend(): FSMState {
  const fsm = makeFSMState("walk");
  fsm.blend = {
    fromAnim: makeAnimState(1, 0.3, 2),
    fromAnimId: 1,
    elapsed: 0.05,
    duration: 0.1,
  };
  return fsm;
}

function makeTweenInput(id: string = "tween_0"): TweenSnapshotInput {
  return {
    id,
    state: "active",
    elapsed: 0.25,
    delayElapsed: 0,
    duration: 1.0,
    currentRepeat: 0,
    isReversed: false,
    props: { x: 100, y: 200 },
    startValues: { x: 0, y: 0 },
  };
}

function makeParticle(x: number = 10, y: number = 20): ParticleInputData {
  return {
    x, y,
    vx: 5, vy: -3,
    ax: 0, ay: 9.8,
    rotation: 0.5,
    rotationSpeed: 0.1,
    scale: 1.0,
    scaleSpeed: -0.2,
    color: { r: 1, g: 0.5, b: 0, a: 0.8 },
    startColor: { r: 1, g: 1, b: 0, a: 1 },
    endColor: { r: 1, g: 0, b: 0, a: 0 },
    lifetime: 2.0,
    age: 0.5,
    alive: true,
    textureId: 7,
  };
}

function makeEmitterInput(id: string = "emitter_0"): EmitterSnapshotInput {
  return {
    id,
    particles: [makeParticle(10, 20), makeParticle(30, 40)],
    emissionAccumulator: 0.75,
    active: true,
    used: false,
  };
}

function makeSceneStack(): SceneStackInput {
  return {
    sceneNames: ["main-menu", "game", "pause"],
    activeSceneName: "pause",
    depth: 3,
  };
}

// ---------------------------------------------------------------------------
// emptySnapshot
// ---------------------------------------------------------------------------

describe("emptySnapshot", () => {
  it("creates a snapshot with all fields null/default", () => {
    const snap = emptySnapshot();
    assert.equal(snap.frame, 0);
    assert.equal(snap.version, 1);
    assert.equal(snap.prng, null);
    assert.equal(snap.animations, null);
    assert.equal(snap.fsms, null);
    assert.equal(snap.tweens, null);
    assert.equal(snap.emitters, null);
    assert.equal(snap.sceneStack, null);
    assert.equal(snap.userData, undefined);
  });

  it("accepts a custom frame number", () => {
    const snap = emptySnapshot(42);
    assert.equal(snap.frame, 42);
  });

  it("sets a valid timestamp", () => {
    const before = Date.now();
    const snap = emptySnapshot();
    const after = Date.now();
    assert.ok(snap.timestamp >= before);
    assert.ok(snap.timestamp <= after);
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — PRNG
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — PRNG", () => {
  it("captures PRNG state", () => {
    const rng = makePrng(42);
    const snap = captureWorldSnapshot({ prng: rng });
    assert.ok(snap.prng !== null);
    assert.equal(snap.prng!.seed, 42);
    assert.equal(snap.prng!.s0, rng.s0);
    assert.equal(snap.prng!.s1, rng.s1);
    assert.equal(snap.prng!.s2, rng.s2);
    assert.equal(snap.prng!.s3, rng.s3);
  });

  it("deep clones PRNG state (source mutation does not affect snapshot)", () => {
    const rng = makePrng(42);
    const snap = captureWorldSnapshot({ prng: rng });
    // Advance the PRNG — snapshot should be unchanged
    const [, rng2] = randomInt(rng, 1, 100);
    assert.equal(snap.prng!.s0, rng.s0); // original values preserved
    assert.notEqual(rng2.s0, rng.s0); // confirm rng2 is different
  });

  it("returns null for prng when not provided", () => {
    const snap = captureWorldSnapshot({});
    assert.equal(snap.prng, null);
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — Animations
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — Animations", () => {
  it("captures animation states", () => {
    const anims = [makeAnimState(1, 0.5, 3), makeAnimState(2, 1.0, 7)];
    const snap = captureWorldSnapshot({ animations: anims });
    assert.ok(snap.animations !== null);
    assert.equal(snap.animations!.length, 2);
    assert.equal(snap.animations![0].defId, 1);
    assert.equal(snap.animations![0].elapsed, 0.5);
    assert.equal(snap.animations![0].frame, 3);
    assert.equal(snap.animations![0].finished, false);
    assert.equal(snap.animations![1].defId, 2);
    assert.equal(snap.animations![1].frame, 7);
  });

  it("captures finished animation state", () => {
    const anim = makeFinishedAnimState(3);
    const snap = captureWorldSnapshot({ animations: [anim] });
    assert.equal(snap.animations![0].finished, true);
  });

  it("captures empty animation array", () => {
    const snap = captureWorldSnapshot({ animations: [] });
    assert.ok(snap.animations !== null);
    assert.equal(snap.animations!.length, 0);
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — FSMs
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — FSMs", () => {
  it("captures FSM state without blend", () => {
    const fsm = makeFSMState("walk");
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    assert.ok(snap.fsms !== null);
    assert.equal(snap.fsms!.length, 1);
    assert.equal(snap.fsms![0].currentState, "walk");
    assert.equal(snap.fsms![0].blend, null);
  });

  it("captures FSM state with active blend", () => {
    const fsm = makeFSMStateWithBlend();
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    const fsmSnap = snap.fsms![0];
    assert.ok(fsmSnap.blend !== null);
    assert.equal(fsmSnap.blend!.fromAnimId, 1);
    assert.equal(fsmSnap.blend!.elapsed, 0.05);
    assert.equal(fsmSnap.blend!.duration, 0.1);
    assert.equal(fsmSnap.blend!.fromAnim.defId, 1);
    assert.equal(fsmSnap.blend!.fromAnim.elapsed, 0.3);
  });

  it("captures multiple FSMs", () => {
    const fsm1 = makeFSMState("idle");
    const fsm2 = makeFSMState("walk");
    const snap = captureWorldSnapshot({ fsms: [fsm1, fsm2] });
    assert.equal(snap.fsms!.length, 2);
    assert.equal(snap.fsms![0].currentState, "idle");
    assert.equal(snap.fsms![1].currentState, "walk");
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — Tweens
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — Tweens", () => {
  it("captures tween state", () => {
    const tw = makeTweenInput("tween_5");
    const snap = captureWorldSnapshot({ tweens: [tw] });
    assert.ok(snap.tweens !== null);
    assert.equal(snap.tweens!.length, 1);
    assert.equal(snap.tweens![0].id, "tween_5");
    assert.equal(snap.tweens![0].state, "active");
    assert.equal(snap.tweens![0].elapsed, 0.25);
    assert.equal(snap.tweens![0].duration, 1.0);
  });

  it("captures tween props and startValues", () => {
    const tw = makeTweenInput();
    const snap = captureWorldSnapshot({ tweens: [tw] });
    assert.deepEqual(snap.tweens![0].props, { x: 100, y: 200 });
    assert.deepEqual(snap.tweens![0].startValues, { x: 0, y: 0 });
  });

  it("captures paused tween", () => {
    const tw = makeTweenInput();
    tw.state = "paused";
    tw.elapsed = 0.5;
    const snap = captureWorldSnapshot({ tweens: [tw] });
    assert.equal(snap.tweens![0].state, "paused");
    assert.equal(snap.tweens![0].elapsed, 0.5);
  });

  it("deep clones tween props (mutation does not affect snapshot)", () => {
    const tw = makeTweenInput();
    const snap = captureWorldSnapshot({ tweens: [tw] });
    tw.props.x = 999;
    assert.equal(snap.tweens![0].props.x, 100); // original preserved
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — Emitters/Particles
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — Emitters", () => {
  it("captures emitter state with particles", () => {
    const em = makeEmitterInput("emitter_3");
    const snap = captureWorldSnapshot({ emitters: [em] });
    assert.ok(snap.emitters !== null);
    assert.equal(snap.emitters!.length, 1);
    assert.equal(snap.emitters![0].id, "emitter_3");
    assert.equal(snap.emitters![0].particles.length, 2);
    assert.equal(snap.emitters![0].emissionAccumulator, 0.75);
    assert.equal(snap.emitters![0].active, true);
    assert.equal(snap.emitters![0].used, false);
  });

  it("captures particle details", () => {
    const em = makeEmitterInput();
    const snap = captureWorldSnapshot({ emitters: [em] });
    const p = snap.emitters![0].particles[0];
    assert.equal(p.x, 10);
    assert.equal(p.y, 20);
    assert.equal(p.vx, 5);
    assert.equal(p.vy, -3);
    assert.equal(p.lifetime, 2.0);
    assert.equal(p.age, 0.5);
    assert.equal(p.alive, true);
    assert.equal(p.textureId, 7);
  });

  it("captures particle colors", () => {
    const em = makeEmitterInput();
    const snap = captureWorldSnapshot({ emitters: [em] });
    const p = snap.emitters![0].particles[0];
    assert.deepEqual(p.startColor, { r: 1, g: 1, b: 0, a: 1 });
    assert.deepEqual(p.endColor, { r: 1, g: 0, b: 0, a: 0 });
  });

  it("deep clones emitter state", () => {
    const em = makeEmitterInput();
    const snap = captureWorldSnapshot({ emitters: [em] });
    em.particles[0].x = 999;
    assert.equal(snap.emitters![0].particles[0].x, 10); // original preserved
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — Scene Stack
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — Scene Stack", () => {
  it("captures scene stack state", () => {
    const stack = makeSceneStack();
    const snap = captureWorldSnapshot({ sceneStack: stack });
    assert.ok(snap.sceneStack !== null);
    assert.deepEqual(snap.sceneStack!.sceneNames, ["main-menu", "game", "pause"]);
    assert.equal(snap.sceneStack!.activeSceneName, "pause");
    assert.equal(snap.sceneStack!.depth, 3);
  });

  it("captures empty scene stack", () => {
    const snap = captureWorldSnapshot({
      sceneStack: { sceneNames: [], activeSceneName: null, depth: 0 },
    });
    assert.deepEqual(snap.sceneStack!.sceneNames, []);
    assert.equal(snap.sceneStack!.activeSceneName, null);
    assert.equal(snap.sceneStack!.depth, 0);
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — User Data
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — User Data", () => {
  it("captures custom user data", () => {
    const data = { score: 100, level: 3, inventory: ["sword", "shield"] };
    const snap = captureWorldSnapshot({ userData: data });
    assert.deepEqual(snap.userData, data);
  });

  it("deep clones user data", () => {
    const data = { score: 100, nested: { hp: 50 } };
    const snap = captureWorldSnapshot({ userData: data });
    data.score = 999;
    data.nested.hp = 0;
    assert.equal((snap.userData as any).score, 100);
    assert.equal((snap.userData as any).nested.hp, 50);
  });

  it("handles null user data", () => {
    const snap = captureWorldSnapshot({ userData: null });
    assert.equal(snap.userData, null);
  });

  it("handles primitive user data", () => {
    const snap = captureWorldSnapshot({ userData: 42 });
    assert.equal(snap.userData, 42);
  });
});

// ---------------------------------------------------------------------------
// captureWorldSnapshot — Combined
// ---------------------------------------------------------------------------

describe("captureWorldSnapshot — Combined", () => {
  it("captures all systems at once", () => {
    const snap = captureWorldSnapshot({
      frame: 100,
      prng: makePrng(42),
      animations: [makeAnimState()],
      fsms: [makeFSMState()],
      tweens: [makeTweenInput()],
      emitters: [makeEmitterInput()],
      sceneStack: makeSceneStack(),
      userData: { score: 50 },
    });
    assert.equal(snap.frame, 100);
    assert.ok(snap.prng !== null);
    assert.equal(snap.animations!.length, 1);
    assert.equal(snap.fsms!.length, 1);
    assert.equal(snap.tweens!.length, 1);
    assert.equal(snap.emitters!.length, 1);
    assert.ok(snap.sceneStack !== null);
    assert.equal((snap.userData as any).score, 50);
  });

  it("sets version and timestamp", () => {
    const before = Date.now();
    const snap = captureWorldSnapshot({ frame: 10 });
    const after = Date.now();
    assert.equal(snap.version, 1);
    assert.ok(snap.timestamp >= before);
    assert.ok(snap.timestamp <= after);
  });

  it("defaults frame to 0", () => {
    const snap = captureWorldSnapshot({});
    assert.equal(snap.frame, 0);
  });
});

// ---------------------------------------------------------------------------
// restoreWorldSnapshot
// ---------------------------------------------------------------------------

describe("restoreWorldSnapshot — PRNG", () => {
  it("restores PRNG state", () => {
    const rng = makePrng(42);
    const snap = captureWorldSnapshot({ prng: rng });
    const result = restoreWorldSnapshot(snap);
    assert.ok(result.prng !== undefined);
    assert.equal(result.prng!.seed, 42);
    assert.equal(result.prng!.s0, rng.s0);
    assert.equal(result.prng!.s1, rng.s1);
    assert.equal(result.prng!.s2, rng.s2);
    assert.equal(result.prng!.s3, rng.s3);
  });

  it("restored PRNG produces same random sequence", () => {
    const rng = makePrng(42);
    const [val1, rng2] = randomInt(rng, 1, 100);
    // Capture after first roll
    const snap = captureWorldSnapshot({ prng: rng2 });
    // Restore and continue
    const result = restoreWorldSnapshot(snap);
    const [val2] = randomInt(result.prng!, 1, 100);
    // Do the same with original rng2
    const [val3] = randomInt(rng2, 1, 100);
    assert.equal(val2, val3);
  });

  it("returns undefined prng when not captured", () => {
    const snap = captureWorldSnapshot({});
    const result = restoreWorldSnapshot(snap);
    assert.equal(result.prng, undefined);
  });
});

describe("restoreWorldSnapshot — Animations", () => {
  it("restores animation states", () => {
    const anim = makeAnimState(5, 1.2, 8);
    const snap = captureWorldSnapshot({ animations: [anim] });
    const result = restoreWorldSnapshot(snap);
    assert.ok(result.animations !== undefined);
    assert.equal(result.animations!.length, 1);
    assert.equal(result.animations![0].defId, 5);
    assert.equal(result.animations![0].elapsed, 1.2);
    assert.equal(result.animations![0].frame, 8);
    assert.equal(result.animations![0].finished, false);
  });

  it("restores finished animation", () => {
    const anim = makeFinishedAnimState(3);
    const snap = captureWorldSnapshot({ animations: [anim] });
    const result = restoreWorldSnapshot(snap);
    assert.equal(result.animations![0].finished, true);
  });
});

describe("restoreWorldSnapshot — FSMs", () => {
  it("restores FSM snapshot data", () => {
    const fsm = makeFSMState("walk");
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    const result = restoreWorldSnapshot(snap);
    assert.ok(result.fsms !== undefined);
    assert.equal(result.fsms![0].currentState, "walk");
    assert.equal(result.fsms![0].blend, null);
  });

  it("restores FSM with blend state", () => {
    const fsm = makeFSMStateWithBlend();
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    const result = restoreWorldSnapshot(snap);
    assert.ok(result.fsms![0].blend !== null);
    assert.equal(result.fsms![0].blend!.fromAnimId, 1);
    assert.equal(result.fsms![0].blend!.elapsed, 0.05);
    assert.equal(result.fsms![0].blend!.duration, 0.1);
  });
});

describe("restoreWorldSnapshot — Tweens", () => {
  it("restores tween snapshots", () => {
    const tw = makeTweenInput("tween_7");
    const snap = captureWorldSnapshot({ tweens: [tw] });
    const result = restoreWorldSnapshot(snap);
    assert.ok(result.tweens !== undefined);
    assert.equal(result.tweens!.length, 1);
    assert.equal(result.tweens![0].id, "tween_7");
    assert.equal(result.tweens![0].elapsed, 0.25);
    assert.deepEqual(result.tweens![0].props, { x: 100, y: 200 });
  });
});

describe("restoreWorldSnapshot — Emitters", () => {
  it("restores emitter snapshots with particles", () => {
    const em = makeEmitterInput("emitter_5");
    const snap = captureWorldSnapshot({ emitters: [em] });
    const result = restoreWorldSnapshot(snap);
    assert.ok(result.emitters !== undefined);
    assert.equal(result.emitters!.length, 1);
    assert.equal(result.emitters![0].id, "emitter_5");
    assert.equal(result.emitters![0].particles.length, 2);
    assert.equal(result.emitters![0].particles[0].x, 10);
  });
});

describe("restoreWorldSnapshot — Scene Stack", () => {
  it("restores scene stack info", () => {
    const stack = makeSceneStack();
    const snap = captureWorldSnapshot({ sceneStack: stack });
    const result = restoreWorldSnapshot(snap);
    assert.ok(result.sceneStack !== undefined);
    assert.deepEqual(result.sceneStack!.sceneNames, ["main-menu", "game", "pause"]);
    assert.equal(result.sceneStack!.activeSceneName, "pause");
    assert.equal(result.sceneStack!.depth, 3);
  });
});

describe("restoreWorldSnapshot — User Data", () => {
  it("restores custom user data", () => {
    const data = { score: 100, items: ["potion"] };
    const snap = captureWorldSnapshot({ userData: data });
    const result = restoreWorldSnapshot(snap);
    assert.deepEqual(result.userData, { score: 100, items: ["potion"] });
  });

  it("deep clones restored user data", () => {
    const data = { score: 100 };
    const snap = captureWorldSnapshot({ userData: data });
    const result = restoreWorldSnapshot(snap);
    (result.userData as any).score = 999;
    // Restore again — should get original value
    const result2 = restoreWorldSnapshot(snap);
    assert.equal((result2.userData as any).score, 100);
  });
});

// ---------------------------------------------------------------------------
// applyFSMRestore
// ---------------------------------------------------------------------------

describe("applyFSMRestore", () => {
  it("merges restored data with original config", () => {
    const fsm = makeFSMState("idle");
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    const result = restoreWorldSnapshot(snap);

    // Simulate the FSM was in "walk" in the snapshot
    result.fsms![0].currentState = "walk";

    const restored = applyFSMRestore(fsm, result.fsms![0]);
    assert.equal(restored.currentState, "walk");
    assert.equal(restored.config, fsm.config); // same reference
    assert.equal(restored.sortedTransitions, fsm.sortedTransitions); // same reference
  });

  it("restores blend state", () => {
    const fsm = makeFSMStateWithBlend();
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    const result = restoreWorldSnapshot(snap);
    const restored = applyFSMRestore(fsm, result.fsms![0]);
    assert.ok(restored.blend !== null);
    assert.equal(restored.blend!.elapsed, 0.05);
  });

  it("handles null blend in restore data", () => {
    const fsm = makeFSMState("idle");
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    const result = restoreWorldSnapshot(snap);
    const restored = applyFSMRestore(fsm, result.fsms![0]);
    assert.equal(restored.blend, null);
  });
});

// ---------------------------------------------------------------------------
// serializeSnapshot / deserializeSnapshot
// ---------------------------------------------------------------------------

describe("serializeSnapshot / deserializeSnapshot", () => {
  it("round-trips an empty snapshot", () => {
    const snap = emptySnapshot(10);
    const json = serializeSnapshot(snap);
    const restored = deserializeSnapshot(json);
    assert.equal(restored.frame, 10);
    assert.equal(restored.version, 1);
    assert.equal(restored.prng, null);
    assert.equal(restored.animations, null);
  });

  it("round-trips a full snapshot", () => {
    const snap = captureWorldSnapshot({
      frame: 42,
      prng: makePrng(99),
      animations: [makeAnimState(1, 0.5, 3)],
      tweens: [makeTweenInput()],
      sceneStack: makeSceneStack(),
      userData: { score: 250 },
    });
    const json = serializeSnapshot(snap);
    const restored = deserializeSnapshot(json);
    assert.equal(restored.frame, 42);
    assert.equal(restored.prng!.seed, 99);
    assert.equal(restored.animations!.length, 1);
    assert.equal(restored.tweens!.length, 1);
    assert.deepEqual(restored.sceneStack!.sceneNames, ["main-menu", "game", "pause"]);
    assert.equal((restored.userData as any).score, 250);
  });

  it("round-trips snapshot with FSM blend", () => {
    const fsm = makeFSMStateWithBlend();
    const snap = captureWorldSnapshot({ fsms: [fsm] });
    const json = serializeSnapshot(snap);
    const restored = deserializeSnapshot(json);
    assert.ok(restored.fsms![0].blend !== null);
    assert.equal(restored.fsms![0].blend!.elapsed, 0.05);
  });

  it("round-trips snapshot with emitters and particles", () => {
    const snap = captureWorldSnapshot({ emitters: [makeEmitterInput()] });
    const json = serializeSnapshot(snap);
    const restored = deserializeSnapshot(json);
    assert.equal(restored.emitters!.length, 1);
    assert.equal(restored.emitters![0].particles.length, 2);
    assert.equal(restored.emitters![0].particles[0].x, 10);
  });

  it("throws on invalid JSON", () => {
    assert.throws(() => deserializeSnapshot("not json"), /Unexpected token/);
  });

  it("throws on non-object JSON", () => {
    assert.throws(() => deserializeSnapshot('"a string"'), /expected an object/);
  });

  it("throws on missing version", () => {
    assert.throws(() => deserializeSnapshot('{"frame":0}'), /missing version/);
  });

  it("throws on unsupported future version", () => {
    assert.throws(
      () => deserializeSnapshot('{"version":999}'),
      /Unsupported snapshot version/,
    );
  });

  it("accepts current version", () => {
    const json = '{"version":1,"frame":0,"timestamp":0,"prng":null,"animations":null,"fsms":null,"tweens":null,"emitters":null,"sceneStack":null}';
    const snap = deserializeSnapshot(json);
    assert.equal(snap.version, 1);
  });
});

// ---------------------------------------------------------------------------
// diffSnapshots
// ---------------------------------------------------------------------------

describe("diffSnapshots", () => {
  it("returns empty array for identical snapshots", () => {
    const snap = captureWorldSnapshot({
      frame: 1,
      prng: makePrng(42),
      animations: [makeAnimState()],
      userData: { score: 10 },
    });
    const diffs = diffSnapshots(snap, snap);
    assert.deepEqual(diffs, []);
  });

  it("detects PRNG difference", () => {
    const a = captureWorldSnapshot({ prng: makePrng(42) });
    const b = captureWorldSnapshot({ prng: makePrng(99) });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("prng"));
  });

  it("detects animation difference", () => {
    const a = captureWorldSnapshot({ animations: [makeAnimState(1, 0.5, 3)] });
    const b = captureWorldSnapshot({ animations: [makeAnimState(1, 0.8, 5)] });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("animations"));
  });

  it("detects FSM difference", () => {
    const a = captureWorldSnapshot({ fsms: [makeFSMState("idle")] });
    const b = captureWorldSnapshot({ fsms: [makeFSMState("walk")] });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("fsms"));
  });

  it("detects tween difference", () => {
    const tw1 = makeTweenInput("tween_0");
    const tw2 = makeTweenInput("tween_0");
    tw2.elapsed = 0.9;
    const a = captureWorldSnapshot({ tweens: [tw1] });
    const b = captureWorldSnapshot({ tweens: [tw2] });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("tweens"));
  });

  it("detects emitter difference", () => {
    const em1 = makeEmitterInput();
    const em2 = makeEmitterInput();
    em2.emissionAccumulator = 0.99;
    const a = captureWorldSnapshot({ emitters: [em1] });
    const b = captureWorldSnapshot({ emitters: [em2] });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("emitters"));
  });

  it("detects scene stack difference", () => {
    const a = captureWorldSnapshot({
      sceneStack: { sceneNames: ["a", "b"], activeSceneName: "b", depth: 2 },
    });
    const b = captureWorldSnapshot({
      sceneStack: { sceneNames: ["a", "c"], activeSceneName: "c", depth: 2 },
    });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("sceneStack"));
  });

  it("detects user data difference", () => {
    const a = captureWorldSnapshot({ userData: { score: 10 } });
    const b = captureWorldSnapshot({ userData: { score: 20 } });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("userData"));
  });

  it("reports multiple differences", () => {
    const a = captureWorldSnapshot({
      prng: makePrng(1),
      animations: [makeAnimState(1, 0.1, 0)],
      userData: { x: 1 },
    });
    const b = captureWorldSnapshot({
      prng: makePrng(2),
      animations: [makeAnimState(1, 0.2, 1)],
      userData: { x: 2 },
    });
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("prng"));
    assert.ok(diffs.includes("animations"));
    assert.ok(diffs.includes("userData"));
    assert.equal(diffs.length, 3);
  });

  it("handles comparing null vs non-null fields", () => {
    const a = captureWorldSnapshot({ prng: makePrng(42) });
    const b = captureWorldSnapshot({});
    const diffs = diffSnapshots(a, b);
    assert.ok(diffs.includes("prng"));
  });
});

// ---------------------------------------------------------------------------
// Capture/restore round-trip
// ---------------------------------------------------------------------------

describe("capture/restore round-trip", () => {
  it("PRNG round-trips exactly", () => {
    const rng = makePrng(42);
    const [, rng2] = randomInt(rng, 1, 100); // advance once
    const snap = captureWorldSnapshot({ prng: rng2 });
    const result = restoreWorldSnapshot(snap);
    assert.equal(result.prng!.__brand, "PRNGState");
    assert.equal(result.prng!.s0, rng2.s0);
    assert.equal(result.prng!.s1, rng2.s1);
    assert.equal(result.prng!.s2, rng2.s2);
    assert.equal(result.prng!.s3, rng2.s3);
  });

  it("animation round-trips exactly", () => {
    const anim: AnimationState = { defId: 3, elapsed: 0.75, frame: 4, finished: false };
    const snap = captureWorldSnapshot({ animations: [anim] });
    const result = restoreWorldSnapshot(snap);
    assert.deepEqual(result.animations![0], anim);
  });

  it("full snapshot round-trips through serialize/deserialize", () => {
    const rng = makePrng(42);
    const original = captureWorldSnapshot({
      frame: 50,
      prng: rng,
      animations: [makeAnimState(1, 0.5, 3), makeFinishedAnimState(2)],
      tweens: [makeTweenInput("tween_0"), makeTweenInput("tween_1")],
      emitters: [makeEmitterInput("emitter_0")],
      sceneStack: makeSceneStack(),
      userData: { score: 999, items: ["sword", "potion"] },
    });

    const json = serializeSnapshot(original);
    const deserialized = deserializeSnapshot(json);
    const restored = restoreWorldSnapshot(deserialized);

    assert.equal(restored.prng!.seed, 42);
    assert.equal(restored.animations!.length, 2);
    assert.equal(restored.animations![1].finished, true);
    assert.equal(restored.tweens!.length, 2);
    assert.equal(restored.emitters!.length, 1);
    assert.equal(restored.emitters![0].particles.length, 2);
    assert.deepEqual(restored.sceneStack!.sceneNames, ["main-menu", "game", "pause"]);
    assert.equal((restored.userData as any).score, 999);
    assert.deepEqual((restored.userData as any).items, ["sword", "potion"]);
  });

  it("restored snapshot is independent from original (no shared references)", () => {
    const snap = captureWorldSnapshot({
      prng: makePrng(42),
      animations: [makeAnimState()],
      userData: { nested: { value: 1 } },
    });
    const result1 = restoreWorldSnapshot(snap);
    const result2 = restoreWorldSnapshot(snap);

    // Mutate result1
    (result1.userData as any).nested.value = 999;
    result1.animations![0].elapsed = 999;

    // result2 should be unaffected
    assert.equal((result2.userData as any).nested.value, 1);
    assert.equal(result2.animations![0].elapsed, 0.5);
  });
});
