import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  createAnimation,
  playAnimation,
  updateAnimation,
  updateAnimationWithEvents,
  onFrameEvent,
  getAnimationDef,
} from "./animation.ts";
import {
  createAnimationFSM,
  getCurrentState,
  isBlending,
  getBlendProgress,
  setFSMState,
  updateFSM,
  drawFSMSprite,
} from "./animation-fsm.ts";
import type { FSMConfig, FSMState } from "./animation-fsm.ts";

// ---------------------------------------------------------------------------
// Helper: create a minimal FSM config for testing
// ---------------------------------------------------------------------------
function makeTestConfig(options?: {
  defaultBlendDuration?: number;
  idleLoop?: boolean;
  walkLoop?: boolean;
  attackLoop?: boolean;
}): FSMConfig {
  const idleAnim = createAnimation(1, 32, 32, 4, 10, { loop: options?.idleLoop ?? true });
  const walkAnim = createAnimation(1, 32, 32, 6, 12, { loop: options?.walkLoop ?? true });
  const attackAnim = createAnimation(1, 32, 32, 3, 10, { loop: options?.attackLoop ?? false });

  return {
    states: {
      idle: { animationId: idleAnim },
      walk: { animationId: walkAnim },
      attack: { animationId: attackAnim },
    },
    transitions: [
      { from: "idle", to: "walk", condition: { type: "boolean", param: "isMoving" } },
      { from: "walk", to: "idle", condition: { type: "boolean", param: "isMoving", negate: true } },
      { from: "any", to: "attack", condition: { type: "trigger", param: "attack" }, priority: 10 },
      { from: "attack", to: "idle", condition: { type: "animationFinished" } },
    ],
    initialState: "idle",
    defaultBlendDuration: options?.defaultBlendDuration ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Animation Events tests
// ---------------------------------------------------------------------------
describe("animation events", () => {
  it("onFrameEvent adds an event to an animation def", () => {
    const anim = createAnimation(1, 32, 32, 4, 10);
    onFrameEvent(anim, 2, () => {});
    const def = getAnimationDef(anim);
    assert.ok(def);
    assert.ok(def!.events);
    assert.equal(def!.events!.length, 1);
    assert.equal(def!.events![0].frame, 2);
  });

  it("createAnimation with events option", () => {
    const events = [{ frame: 1, callback: () => {} }];
    const anim = createAnimation(1, 32, 32, 4, 10, { events });
    const def = getAnimationDef(anim);
    assert.ok(def);
    assert.equal(def!.events!.length, 1);
  });

  it("updateAnimationWithEvents fires event when frame is crossed", () => {
    const fired: number[] = [];
    const anim = createAnimation(1, 32, 32, 4, 10, {
      events: [{ frame: 1, callback: (f) => fired.push(f) }],
    });
    let state = playAnimation(anim);
    // At 10fps, 0.15s = frame 1 (crosses frame 1)
    state = updateAnimationWithEvents(state, 0.15);
    assert.equal(fired.length, 1);
    assert.equal(fired[0], 1);
  });

  it("updateAnimationWithEvents fires multiple events", () => {
    const fired: number[] = [];
    const anim = createAnimation(1, 32, 32, 4, 10, {
      events: [
        { frame: 1, callback: (f) => fired.push(f) },
        { frame: 2, callback: (f) => fired.push(f) },
      ],
    });
    let state = playAnimation(anim);
    // At 10fps, 0.25s = frame 2 (crosses frames 1 and 2)
    state = updateAnimationWithEvents(state, 0.25);
    assert.equal(fired.length, 2);
    assert.equal(fired[0], 1);
    assert.equal(fired[1], 2);
  });

  it("updateAnimationWithEvents does not re-fire events for same frame", () => {
    const fired: number[] = [];
    const anim = createAnimation(1, 32, 32, 4, 10, {
      events: [{ frame: 1, callback: (f) => fired.push(f) }],
    });
    let state = playAnimation(anim);
    state = updateAnimationWithEvents(state, 0.15); // crosses to frame 1
    assert.equal(fired.length, 1);
    state = updateAnimationWithEvents(state, 0.01); // still on frame 1
    assert.equal(fired.length, 1); // no re-fire
  });

  it("updateAnimationWithEvents fires on loop wrap", () => {
    const fired: number[] = [];
    const anim = createAnimation(1, 32, 32, 4, 10, {
      events: [{ frame: 0, callback: (f) => fired.push(f) }],
    });
    let state = playAnimation(anim);
    // advance to frame 3
    state = updateAnimationWithEvents(state, 0.35);
    // advance past frame 3 to wrap to frame 0
    state = updateAnimationWithEvents(state, 0.1);
    // Should have fired when wrapping to frame 0
    assert.ok(fired.length >= 1, `Expected at least 1 fire, got ${fired.length}`);
  });

  it("updateAnimationWithEvents works on non-looping animations", () => {
    const fired: number[] = [];
    const anim = createAnimation(1, 32, 32, 4, 10, {
      loop: false,
      events: [{ frame: 2, callback: (f) => fired.push(f) }],
    });
    let state = playAnimation(anim);
    state = updateAnimationWithEvents(state, 0.25); // frame 2
    assert.equal(fired.length, 1);
    assert.equal(fired[0], 2);
  });

  it("updateAnimationWithEvents returns same state shape as updateAnimation", () => {
    const anim = createAnimation(1, 32, 32, 4, 10);
    let state = playAnimation(anim);
    const regular = updateAnimation(state, 0.15);
    const withEvents = updateAnimationWithEvents(state, 0.15);
    assert.equal(regular.frame, withEvents.frame);
    assert.equal(regular.elapsed, withEvents.elapsed);
    assert.equal(regular.finished, withEvents.finished);
  });

  it("getAnimationDef returns undefined for unknown ID", () => {
    assert.equal(getAnimationDef(99999), undefined);
  });

  it("getAnimationDef returns correct definition", () => {
    const anim = createAnimation(1, 32, 32, 4, 10, { loop: false });
    const def = getAnimationDef(anim);
    assert.ok(def);
    assert.equal(def!.frameCount, 4);
    assert.equal(def!.fps, 10);
    assert.equal(def!.loop, false);
  });

  it("onFrameEvent is no-op for unknown animation", () => {
    // Should not throw
    onFrameEvent(99999, 0, () => {});
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: creation
// ---------------------------------------------------------------------------
describe("animation FSM creation", () => {
  it("creates FSM with initial state", () => {
    const config = makeTestConfig();
    const fsm = createAnimationFSM(config);
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("throws on unknown initial state", () => {
    assert.throws(
      () => createAnimationFSM({
        states: { idle: { animationId: createAnimation(1, 32, 32, 4, 10) } },
        transitions: [],
        initialState: "nonexistent",
      }),
      /not found/,
    );
  });

  it("fires onEnter for initial state", () => {
    let entered = false;
    const anim = createAnimation(1, 32, 32, 4, 10);
    createAnimationFSM({
      states: { idle: { animationId: anim, onEnter: () => { entered = true; } } },
      transitions: [],
      initialState: "idle",
    });
    assert.equal(entered, true);
  });

  it("initializes animation at frame 0", () => {
    const config = makeTestConfig();
    const fsm = createAnimationFSM(config);
    assert.equal(fsm.animation.frame, 0);
    assert.equal(fsm.animation.elapsed, 0);
    assert.equal(fsm.animation.finished, false);
  });

  it("starts without active blend", () => {
    const config = makeTestConfig();
    const fsm = createAnimationFSM(config);
    assert.equal(isBlending(fsm), false);
    assert.equal(getBlendProgress(fsm), 1);
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: transitions
// ---------------------------------------------------------------------------
describe("animation FSM transitions", () => {
  it("boolean condition triggers state change", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);
    assert.equal(getCurrentState(fsm), "idle");

    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(getCurrentState(fsm), "walk");
  });

  it("negated boolean condition works", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);
    fsm = updateFSM(fsm, 0.016, { isMoving: true }); // idle -> walk
    assert.equal(getCurrentState(fsm), "walk");

    fsm = updateFSM(fsm, 0.016, { isMoving: false }); // walk -> idle
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("trigger condition fires once", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    fsm = updateFSM(fsm, 0.016, { attack: true });
    assert.equal(getCurrentState(fsm), "attack");
  });

  it("animationFinished condition triggers when done", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    // Trigger attack (non-looping, 3 frames at 10fps)
    fsm = updateFSM(fsm, 0.016, { attack: true });
    assert.equal(getCurrentState(fsm), "attack");

    // Advance past all frames (3 frames at 10fps = 0.3s)
    fsm = updateFSM(fsm, 0.5, {});
    assert.equal(fsm.animation.finished, true);

    // Next update should transition back to idle
    fsm = updateFSM(fsm, 0.016, {});
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("priority ordering: higher priority wins", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    // Both isMoving and attack are true, but attack has priority 10
    fsm = updateFSM(fsm, 0.016, { isMoving: true, attack: true });
    assert.equal(getCurrentState(fsm), "attack");
  });

  it("'any' source matches all states", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    // Move to walk state first
    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(getCurrentState(fsm), "walk");

    // Attack from walk (uses "any" source)
    fsm = updateFSM(fsm, 0.016, { attack: true });
    assert.equal(getCurrentState(fsm), "attack");
  });

  it("no transition if condition not met", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    fsm = updateFSM(fsm, 0.016, { isMoving: false });
    assert.equal(getCurrentState(fsm), "idle"); // unchanged
  });

  it("fires onExit and onEnter on transition", () => {
    const events: string[] = [];
    const idleAnim = createAnimation(1, 32, 32, 4, 10);
    const walkAnim = createAnimation(1, 32, 32, 6, 12);

    const config: FSMConfig = {
      states: {
        idle: {
          animationId: idleAnim,
          onEnter: () => events.push("enter:idle"),
          onExit: () => events.push("exit:idle"),
        },
        walk: {
          animationId: walkAnim,
          onEnter: () => events.push("enter:walk"),
          onExit: () => events.push("exit:walk"),
        },
      },
      transitions: [
        { from: "idle", to: "walk", condition: { type: "boolean", param: "isMoving" } },
      ],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    assert.deepEqual(events, ["enter:idle"]);

    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.deepEqual(events, ["enter:idle", "exit:idle", "enter:walk"]);
  });

  it("only one transition per frame", () => {
    const idleAnim = createAnimation(1, 32, 32, 4, 10);
    const walkAnim = createAnimation(1, 32, 32, 6, 12);
    const runAnim = createAnimation(1, 32, 32, 6, 12);

    const config: FSMConfig = {
      states: {
        idle: { animationId: idleAnim },
        walk: { animationId: walkAnim },
        run: { animationId: runAnim },
      },
      transitions: [
        { from: "idle", to: "walk", condition: { type: "boolean", param: "isMoving" }, priority: 1 },
        { from: "idle", to: "run", condition: { type: "boolean", param: "isRunning" }, priority: 2 },
      ],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    // Both true, but run has higher priority
    fsm = updateFSM(fsm, 0.016, { isMoving: true, isRunning: true });
    assert.equal(getCurrentState(fsm), "run");
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: threshold conditions
// ---------------------------------------------------------------------------
describe("animation FSM threshold conditions", () => {
  it("greaterThan comparison", () => {
    const idleAnim = createAnimation(1, 32, 32, 4, 10);
    const runAnim = createAnimation(1, 32, 32, 6, 12);

    const config: FSMConfig = {
      states: {
        idle: { animationId: idleAnim },
        run: { animationId: runAnim },
      },
      transitions: [
        { from: "idle", to: "run", condition: { type: "threshold", param: "speed", value: 5, compare: "greaterThan" } },
      ],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    fsm = updateFSM(fsm, 0.016, { speed: 3 });
    assert.equal(getCurrentState(fsm), "idle");

    fsm = updateFSM(fsm, 0.016, { speed: 6 });
    assert.equal(getCurrentState(fsm), "run");
  });

  it("lessThan comparison", () => {
    const runAnim = createAnimation(1, 32, 32, 6, 12);
    const idleAnim = createAnimation(1, 32, 32, 4, 10);

    const config: FSMConfig = {
      states: {
        run: { animationId: runAnim },
        idle: { animationId: idleAnim },
      },
      transitions: [
        { from: "run", to: "idle", condition: { type: "threshold", param: "speed", value: 1, compare: "lessThan" } },
      ],
      initialState: "run",
    };

    let fsm = createAnimationFSM(config);
    fsm = updateFSM(fsm, 0.016, { speed: 3 });
    assert.equal(getCurrentState(fsm), "run");

    fsm = updateFSM(fsm, 0.016, { speed: 0.5 });
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("greaterOrEqual and lessOrEqual comparisons", () => {
    const idleAnim = createAnimation(1, 32, 32, 4, 10);
    const walkAnim = createAnimation(1, 32, 32, 6, 12);

    const config: FSMConfig = {
      states: {
        idle: { animationId: idleAnim },
        walk: { animationId: walkAnim },
      },
      transitions: [
        { from: "idle", to: "walk", condition: { type: "threshold", param: "speed", value: 1, compare: "greaterOrEqual" } },
        { from: "walk", to: "idle", condition: { type: "threshold", param: "speed", value: 0, compare: "lessOrEqual" } },
      ],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);

    // Exactly 1 should match greaterOrEqual
    fsm = updateFSM(fsm, 0.016, { speed: 1 });
    assert.equal(getCurrentState(fsm), "walk");

    // Exactly 0 should match lessOrEqual
    fsm = updateFSM(fsm, 0.016, { speed: 0 });
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("default comparison is greaterThan", () => {
    const idleAnim = createAnimation(1, 32, 32, 4, 10);
    const runAnim = createAnimation(1, 32, 32, 6, 12);

    const config: FSMConfig = {
      states: {
        idle: { animationId: idleAnim },
        run: { animationId: runAnim },
      },
      transitions: [
        { from: "idle", to: "run", condition: { type: "threshold", param: "speed", value: 5 } },
      ],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    fsm = updateFSM(fsm, 0.016, { speed: 5 }); // exactly 5, not > 5
    assert.equal(getCurrentState(fsm), "idle");

    fsm = updateFSM(fsm, 0.016, { speed: 5.1 });
    assert.equal(getCurrentState(fsm), "run");
  });

  it("non-number param returns false for threshold", () => {
    const idleAnim = createAnimation(1, 32, 32, 4, 10);
    const walkAnim = createAnimation(1, 32, 32, 6, 12);

    const config: FSMConfig = {
      states: {
        idle: { animationId: idleAnim },
        walk: { animationId: walkAnim },
      },
      transitions: [
        { from: "idle", to: "walk", condition: { type: "threshold", param: "speed", value: 5 } },
      ],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    fsm = updateFSM(fsm, 0.016, { speed: true as any });
    assert.equal(getCurrentState(fsm), "idle"); // boolean is not > 5
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: blending
// ---------------------------------------------------------------------------
describe("animation FSM blending", () => {
  it("blending starts on transition with blend duration", () => {
    const config = makeTestConfig({ defaultBlendDuration: 0.2 });
    let fsm = createAnimationFSM(config);

    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(isBlending(fsm), true);
    assert.ok(getBlendProgress(fsm) < 1);
  });

  it("blending progresses over time", () => {
    const config = makeTestConfig({ defaultBlendDuration: 0.2 });
    let fsm = createAnimationFSM(config);

    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    const progress1 = getBlendProgress(fsm);

    fsm = updateFSM(fsm, 0.1, {});
    const progress2 = getBlendProgress(fsm);

    assert.ok(progress2 > progress1, `progress should increase: ${progress2} > ${progress1}`);
  });

  it("blending completes after duration", () => {
    const config = makeTestConfig({ defaultBlendDuration: 0.1 });
    let fsm = createAnimationFSM(config);

    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(isBlending(fsm), true);

    // Advance past blend duration
    fsm = updateFSM(fsm, 0.2, {});
    assert.equal(isBlending(fsm), false);
    assert.equal(getBlendProgress(fsm), 1);
  });

  it("no blending with 0 duration", () => {
    const config = makeTestConfig({ defaultBlendDuration: 0 });
    let fsm = createAnimationFSM(config);

    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(isBlending(fsm), false);
  });

  it("per-transition blend duration overrides default", () => {
    const idleAnim = createAnimation(1, 32, 32, 4, 10);
    const walkAnim = createAnimation(1, 32, 32, 6, 12);

    const config: FSMConfig = {
      states: {
        idle: { animationId: idleAnim },
        walk: { animationId: walkAnim },
      },
      transitions: [
        {
          from: "idle",
          to: "walk",
          condition: { type: "boolean", param: "isMoving" },
          blendDuration: 0.5,
        },
      ],
      initialState: "idle",
      defaultBlendDuration: 0.1,
    };

    let fsm = createAnimationFSM(config);
    fsm = updateFSM(fsm, 0.016, { isMoving: true });

    // Should use 0.5s blend, so after 0.2s should still be blending
    fsm = updateFSM(fsm, 0.2, {});
    assert.equal(isBlending(fsm), true);

    // After another 0.4s (0.6s total), should be done
    fsm = updateFSM(fsm, 0.4, {});
    assert.equal(isBlending(fsm), false);
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: setFSMState
// ---------------------------------------------------------------------------
describe("animation FSM setFSMState", () => {
  it("forces state change", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);
    assert.equal(getCurrentState(fsm), "idle");

    fsm = setFSMState(fsm, "walk");
    assert.equal(getCurrentState(fsm), "walk");
  });

  it("setFSMState with blend duration", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    fsm = setFSMState(fsm, "walk", 0.2);
    assert.equal(getCurrentState(fsm), "walk");
    assert.equal(isBlending(fsm), true);
  });

  it("setFSMState to unknown state is no-op", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    fsm = setFSMState(fsm, "nonexistent");
    assert.equal(getCurrentState(fsm), "idle"); // unchanged
  });

  it("setFSMState to same state is no-op", () => {
    const events: string[] = [];
    const anim = createAnimation(1, 32, 32, 4, 10);

    const config: FSMConfig = {
      states: {
        idle: { animationId: anim, onEnter: () => events.push("enter") },
      },
      transitions: [],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    assert.equal(events.length, 1); // initial onEnter

    fsm = setFSMState(fsm, "idle");
    assert.equal(events.length, 1); // no additional callbacks
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: speed multiplier
// ---------------------------------------------------------------------------
describe("animation FSM speed", () => {
  it("speed multiplier affects animation playback", () => {
    const anim = createAnimation(1, 32, 32, 4, 10);
    const config: FSMConfig = {
      states: {
        idle: { animationId: anim, speed: 2 },
      },
      transitions: [],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    // At 10fps with speed 2x, 0.1s should give frame 2 (not 1)
    fsm = updateFSM(fsm, 0.1, {});
    assert.equal(fsm.animation.frame, 2);
  });

  it("default speed is 1", () => {
    const anim = createAnimation(1, 32, 32, 4, 10);
    const config: FSMConfig = {
      states: {
        idle: { animationId: anim },
      },
      transitions: [],
      initialState: "idle",
    };

    let fsm = createAnimationFSM(config);
    // At 10fps, 0.1s = frame 1
    fsm = updateFSM(fsm, 0.1, {});
    assert.equal(fsm.animation.frame, 1);
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: drawFSMSprite
// ---------------------------------------------------------------------------
describe("animation FSM drawing", () => {
  it("drawFSMSprite does not throw in headless", () => {
    const config = makeTestConfig();
    const fsm = createAnimationFSM(config);
    // Should be a no-op in headless mode (drawSprite is a no-op)
    drawFSMSprite(fsm, 100, 200, 32, 32);
  });

  it("drawFSMSprite with options does not throw", () => {
    const config = makeTestConfig();
    const fsm = createAnimationFSM(config);
    drawFSMSprite(fsm, 100, 200, 32, 32, {
      layer: 5,
      tint: { r: 1, g: 0, b: 0, a: 1 },
      flipX: true,
    });
  });

  it("drawFSMSprite during blend does not throw", () => {
    const config = makeTestConfig({ defaultBlendDuration: 0.2 });
    let fsm = createAnimationFSM(config);
    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(isBlending(fsm), true);
    drawFSMSprite(fsm, 100, 200, 32, 32);
  });
});

// ---------------------------------------------------------------------------
// Animation FSM: complex scenarios
// ---------------------------------------------------------------------------
describe("animation FSM complex scenarios", () => {
  it("idle -> walk -> idle round trip", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    // idle -> walk
    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(getCurrentState(fsm), "walk");

    // walk -> idle
    fsm = updateFSM(fsm, 0.016, { isMoving: false });
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("idle -> attack -> idle (via animationFinished)", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    // idle -> attack
    fsm = updateFSM(fsm, 0.016, { attack: true });
    assert.equal(getCurrentState(fsm), "attack");

    // Advance partway through the attack animation (still playing)
    fsm = updateFSM(fsm, 0.1, {});
    assert.equal(getCurrentState(fsm), "attack");
    assert.equal(fsm.animation.finished, false);

    // Advance past the end (3 frames at 10fps = 0.3s total)
    // This update sets finished = true on the animation
    fsm = updateFSM(fsm, 0.3, {});
    assert.equal(fsm.animation.finished, true);
    assert.equal(getCurrentState(fsm), "attack");

    // Next update: animationFinished condition triggers attack -> idle
    fsm = updateFSM(fsm, 0.016, {});
    assert.equal(getCurrentState(fsm), "idle");
  });

  it("animation resets on state re-entry", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    // Advance idle animation
    fsm = updateFSM(fsm, 0.15, {});
    assert.ok(fsm.animation.frame > 0);
    assert.ok(fsm.animation.elapsed > 0.1);

    // idle -> walk -> idle
    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    fsm = updateFSM(fsm, 0.016, { isMoving: false });

    // Animation should be near-zero (reset + one dt advance)
    assert.equal(fsm.animation.frame, 0);
    assert.ok(fsm.animation.elapsed < 0.02, "elapsed should be near zero after re-entry");
  });

  it("walk -> attack -> idle (interrupt)", () => {
    const config = makeTestConfig();
    let fsm = createAnimationFSM(config);

    // idle -> walk
    fsm = updateFSM(fsm, 0.016, { isMoving: true });
    assert.equal(getCurrentState(fsm), "walk");

    // walk -> attack (via "any" source)
    fsm = updateFSM(fsm, 0.016, { attack: true, isMoving: true });
    assert.equal(getCurrentState(fsm), "attack");

    // Finish attack
    fsm = updateFSM(fsm, 1.0, {});
    assert.equal(fsm.animation.finished, true);
    fsm = updateFSM(fsm, 0.016, {});
    assert.equal(getCurrentState(fsm), "idle");
  });
});
