import { describe, it, assert } from "../testing/harness.ts";
import {
  createScene,
  createSceneInstance,
  pushScene,
  popScene,
  replaceScene,
  getActiveScene,
  getSceneStackDepth,
  isTransitioning,
  updateSceneManager,
  startSceneManager,
  stopSceneManager,
  _resetSceneManager,
} from "./scene.ts";
import type { SceneDef, SceneContext } from "./types.ts";

// ---------------------------------------------------------------------------
// Helper: minimal scene def factory
// ---------------------------------------------------------------------------

function makeScene(name: string, initial: any = {}, hooks?: Partial<SceneDef<any>>): SceneDef<any> {
  return createScene({
    name,
    create: () => ({ ...initial }),
    ...hooks,
  });
}

// ---------------------------------------------------------------------------
// createScene basics
// ---------------------------------------------------------------------------

describe("createScene basics", () => {
  it("returns the definition unchanged", () => {
    _resetSceneManager();
    const def: SceneDef<{ x: number }> = {
      name: "test",
      create: () => ({ x: 0 }),
    };
    const result = createScene(def);
    assert.equal(result, def);
  });

  it("name is preserved", () => {
    _resetSceneManager();
    const def = createScene({ name: "myScene", create: () => ({}) });
    assert.equal(def.name, "myScene");
  });
});

// ---------------------------------------------------------------------------
// createSceneInstance
// ---------------------------------------------------------------------------

describe("createSceneInstance", () => {
  it("calls create() to init state", () => {
    _resetSceneManager();
    const def = makeScene("test", { count: 42 });
    const instance = createSceneInstance(def);
    assert.equal(instance.state.count, 42);
  });

  it("entered is false initially", () => {
    _resetSceneManager();
    const def = makeScene("test");
    const instance = createSceneInstance(def);
    assert.equal(instance.entered, false);
  });

  it("data is stored", () => {
    _resetSceneManager();
    const def = makeScene("test");
    const instance = createSceneInstance(def, { level: 5 });
    assert.deepEqual(instance.data, { level: 5 });
  });
});

// ---------------------------------------------------------------------------
// Stack operations
// ---------------------------------------------------------------------------

describe("Stack operations", () => {
  it("pushScene adds to stack and increases depth", () => {
    _resetSceneManager();
    const scene = createSceneInstance(makeScene("a"));
    pushScene(scene, { type: "none" });
    assert.equal(getSceneStackDepth(), 1);
    const scene2 = createSceneInstance(makeScene("b"));
    pushScene(scene2, { type: "none" });
    assert.equal(getSceneStackDepth(), 2);
  });

  it("pushScene calls onPause on previous and onEnter on new", () => {
    _resetSceneManager();
    const log: string[] = [];
    const defA = makeScene("a", {}, {
      onPause: (s: any) => { log.push("pause-a"); return s; },
    });
    const defB = makeScene("b", {}, {
      onEnter: (s: any, _ctx: SceneContext) => { log.push("enter-b"); return s; },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    pushScene(createSceneInstance(defB), { type: "none" });
    assert.deepEqual(log, ["pause-a", "enter-b"]);
  });

  it("popScene removes from stack", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    assert.equal(getSceneStackDepth(), 2);
    popScene({ type: "none" });
    assert.equal(getSceneStackDepth(), 1);
  });

  it("popScene calls onExit on current and onResume on previous", () => {
    _resetSceneManager();
    const log: string[] = [];
    const defA = makeScene("a", {}, {
      onResume: (s: any, _ctx: SceneContext) => { log.push("resume-a"); return s; },
    });
    const defB = makeScene("b", {}, {
      onExit: (_s: any) => { log.push("exit-b"); },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    pushScene(createSceneInstance(defB), { type: "none" });
    popScene({ type: "none" });
    assert.deepEqual(log, ["exit-b", "resume-a"]);
  });

  it("popScene is no-op on single scene", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    assert.equal(getSceneStackDepth(), 1);
    popScene({ type: "none" });
    assert.equal(getSceneStackDepth(), 1);
  });

  it("replaceScene swaps top", () => {
    _resetSceneManager();
    const a = createSceneInstance(makeScene("a"));
    const b = createSceneInstance(makeScene("b"));
    pushScene(a, { type: "none" });
    replaceScene(b, { type: "none" });
    assert.equal(getSceneStackDepth(), 1);
    assert.equal(getActiveScene()!.def.name, "b");
  });

  it("replaceScene calls onExit on old and onEnter on new", () => {
    _resetSceneManager();
    const log: string[] = [];
    const defA = makeScene("a", {}, {
      onExit: () => { log.push("exit-a"); },
    });
    const defB = makeScene("b", {}, {
      onEnter: (s: any, _ctx: SceneContext) => { log.push("enter-b"); return s; },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    replaceScene(createSceneInstance(defB), { type: "none" });
    assert.deepEqual(log, ["exit-a", "enter-b"]);
  });

  it("multiple pushes build up stack", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    pushScene(createSceneInstance(makeScene("c")), { type: "none" });
    assert.equal(getSceneStackDepth(), 3);
    assert.equal(getActiveScene()!.def.name, "c");
  });

  it("pop after multiple pushes restores correct scene", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    pushScene(createSceneInstance(makeScene("c")), { type: "none" });
    popScene({ type: "none" });
    assert.equal(getActiveScene()!.def.name, "b");
    popScene({ type: "none" });
    assert.equal(getActiveScene()!.def.name, "a");
  });

  it("stack depth accuracy", () => {
    _resetSceneManager();
    assert.equal(getSceneStackDepth(), 0);
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    assert.equal(getSceneStackDepth(), 1);
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    assert.equal(getSceneStackDepth(), 2);
    popScene({ type: "none" });
    assert.equal(getSceneStackDepth(), 1);
    replaceScene(createSceneInstance(makeScene("c")), { type: "none" });
    assert.equal(getSceneStackDepth(), 1);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle order
// ---------------------------------------------------------------------------

describe("Lifecycle order", () => {
  it("onEnter called with initial state and returns new state", () => {
    _resetSceneManager();
    const def = makeScene("test", { x: 0 }, {
      onEnter: (s: any, _ctx: SceneContext) => ({ ...s, x: 10 }),
    });
    const instance = createSceneInstance(def);
    pushScene(instance, { type: "none" });
    assert.equal((getActiveScene()!.state as any).x, 10);
  });

  it("onUpdate called each frame with dt", () => {
    _resetSceneManager();
    const dts: number[] = [];
    const def = makeScene("test", {}, {
      onUpdate: (s: any, dt: number, _ctx: SceneContext) => { dts.push(dt); return s; },
    });
    pushScene(createSceneInstance(def), { type: "none" });
    updateSceneManager(0.016);
    updateSceneManager(0.033);
    assert.deepEqual(dts, [0.016, 0.033]);
  });

  it("onRender called after onUpdate", () => {
    _resetSceneManager();
    const log: string[] = [];
    const def = makeScene("test", {}, {
      onUpdate: (s: any, _dt: number, _ctx: SceneContext) => { log.push("update"); return s; },
      onRender: (_s: any, _ctx: SceneContext) => { log.push("render"); },
    });
    pushScene(createSceneInstance(def), { type: "none" });
    updateSceneManager(0.016);
    assert.deepEqual(log, ["update", "render"]);
  });

  it("onPause receives current state", () => {
    _resetSceneManager();
    let pausedState: any = null;
    const def = makeScene("a", { val: 99 }, {
      onPause: (s: any) => { pausedState = s; return s; },
    });
    pushScene(createSceneInstance(def), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    assert.equal(pausedState.val, 99);
  });

  it("onResume receives state from before pause", () => {
    _resetSceneManager();
    let resumedState: any = null;
    const def = makeScene("a", { val: 42 }, {
      onPause: (s: any) => ({ ...s, paused: true }),
      onResume: (s: any, _ctx: SceneContext) => { resumedState = s; return s; },
    });
    pushScene(createSceneInstance(def), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    popScene({ type: "none" });
    assert.equal(resumedState.val, 42);
    assert.equal(resumedState.paused, true);
  });

  it("onExit called on pop", () => {
    _resetSceneManager();
    let exited = false;
    const def = makeScene("a", {}, {
      onExit: () => { exited = true; },
    });
    pushScene(createSceneInstance(makeScene("base")), { type: "none" });
    pushScene(createSceneInstance(def), { type: "none" });
    popScene({ type: "none" });
    assert.ok(exited);
  });

  it("lifecycle order on push: current.onPause then new.onEnter", () => {
    _resetSceneManager();
    const log: string[] = [];
    const defA = makeScene("a", {}, {
      onPause: (s: any) => { log.push("pause"); return s; },
    });
    const defB = makeScene("b", {}, {
      onEnter: (s: any, _ctx: SceneContext) => { log.push("enter"); return s; },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    pushScene(createSceneInstance(defB), { type: "none" });
    assert.deepEqual(log, ["pause", "enter"]);
  });

  it("lifecycle order on pop: current.onExit then previous.onResume", () => {
    _resetSceneManager();
    const log: string[] = [];
    const defA = makeScene("a", {}, {
      onResume: (s: any, _ctx: SceneContext) => { log.push("resume"); return s; },
    });
    const defB = makeScene("b", {}, {
      onExit: () => { log.push("exit"); },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    pushScene(createSceneInstance(defB), { type: "none" });
    popScene({ type: "none" });
    assert.deepEqual(log, ["exit", "resume"]);
  });
});

// ---------------------------------------------------------------------------
// State isolation
// ---------------------------------------------------------------------------

describe("State isolation", () => {
  it("each scene maintains independent state", () => {
    _resetSceneManager();
    const defA = makeScene("a", { count: 1 }, {
      onUpdate: (s: any, _dt: number, _ctx: SceneContext) => ({ ...s, count: s.count + 1 }),
    });
    const defB = makeScene("b", { count: 100 }, {
      onUpdate: (s: any, _dt: number, _ctx: SceneContext) => ({ ...s, count: s.count + 10 }),
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    updateSceneManager(0.016); // a.count = 2
    pushScene(createSceneInstance(defB), { type: "none" });
    updateSceneManager(0.016); // b.count = 110
    popScene({ type: "none" });
    // a should still have count=2 (from before pause), then update will run
    updateSceneManager(0.016); // a.count = 3
    assert.equal((getActiveScene()!.state as any).count, 3);
  });

  it("state mutations in onUpdate persist across frames", () => {
    _resetSceneManager();
    const def = makeScene("counter", { n: 0 }, {
      onUpdate: (s: any, _dt: number, _ctx: SceneContext) => ({ ...s, n: s.n + 1 }),
    });
    pushScene(createSceneInstance(def), { type: "none" });
    updateSceneManager(0.016);
    updateSceneManager(0.016);
    updateSceneManager(0.016);
    assert.equal((getActiveScene()!.state as any).n, 3);
  });

  it("onEnter return value becomes the new state", () => {
    _resetSceneManager();
    const def = makeScene("test", { ready: false }, {
      onEnter: (_s: any, _ctx: SceneContext) => ({ ready: true }),
    });
    pushScene(createSceneInstance(def), { type: "none" });
    assert.equal((getActiveScene()!.state as any).ready, true);
  });

  it("scene state not shared between instances", () => {
    _resetSceneManager();
    const def = makeScene("shared-def", { x: 0 });
    const inst1 = createSceneInstance(def);
    const inst2 = createSceneInstance(def);
    inst1.state.x = 42;
    assert.equal(inst2.state.x, 0);
  });
});

// ---------------------------------------------------------------------------
// SceneContext
// ---------------------------------------------------------------------------

describe("SceneContext", () => {
  it("ctx.push works from within onUpdate", () => {
    _resetSceneManager();
    const defB = makeScene("b");
    const defA = makeScene("a", { pushed: false }, {
      onUpdate: (s: any, _dt: number, ctx: SceneContext) => {
        if (!s.pushed) {
          ctx.push(createSceneInstance(defB), { type: "none" });
          return { ...s, pushed: true };
        }
        return s;
      },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    updateSceneManager(0.016);
    assert.equal(getSceneStackDepth(), 2);
    assert.equal(getActiveScene()!.def.name, "b");
  });

  it("ctx.pop works from within onUpdate", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    const defB = makeScene("b", { popped: false }, {
      onUpdate: (s: any, _dt: number, ctx: SceneContext) => {
        if (!s.popped) {
          ctx.pop({ type: "none" });
          return { ...s, popped: true };
        }
        return s;
      },
    });
    pushScene(createSceneInstance(defB), { type: "none" });
    updateSceneManager(0.016);
    assert.equal(getSceneStackDepth(), 1);
    assert.equal(getActiveScene()!.def.name, "a");
  });

  it("ctx.replace works from within onUpdate", () => {
    _resetSceneManager();
    const defC = makeScene("c");
    const defA = makeScene("a", { replaced: false }, {
      onUpdate: (s: any, _dt: number, ctx: SceneContext) => {
        if (!s.replaced) {
          ctx.replace(createSceneInstance(defC), { type: "none" });
          return { ...s, replaced: true };
        }
        return s;
      },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    updateSceneManager(0.016);
    assert.equal(getSceneStackDepth(), 1);
    assert.equal(getActiveScene()!.def.name, "c");
  });

  it("ctx.getData returns scene data", () => {
    _resetSceneManager();
    let received: any = null;
    const def = makeScene("test", {}, {
      onEnter: (s: any, ctx: SceneContext) => {
        received = ctx.getData();
        return s;
      },
    });
    pushScene(createSceneInstance(def, { level: 3, name: "dungeon" }), { type: "none" });
    assert.deepEqual(received, { level: 3, name: "dungeon" });
  });

  it("ctx.getData returns undefined when no data", () => {
    _resetSceneManager();
    let received: any = "sentinel";
    const def = makeScene("test", {}, {
      onEnter: (s: any, ctx: SceneContext) => {
        received = ctx.getData();
        return s;
      },
    });
    pushScene(createSceneInstance(def), { type: "none" });
    assert.equal(received, undefined);
  });
});

// ---------------------------------------------------------------------------
// startSceneManager
// ---------------------------------------------------------------------------

describe("startSceneManager", () => {
  it("pushes initial scene", () => {
    _resetSceneManager();
    const def = makeScene("initial");
    startSceneManager(createSceneInstance(def));
    assert.equal(getSceneStackDepth(), 1);
    assert.equal(getActiveScene()!.def.name, "initial");
  });

  it("calls onEnter on initial scene", () => {
    _resetSceneManager();
    let entered = false;
    const def = makeScene("test", {}, {
      onEnter: (s: any, _ctx: SceneContext) => { entered = true; return s; },
    });
    startSceneManager(createSceneInstance(def));
    assert.ok(entered);
  });

  it("updateSceneManager advances scene", () => {
    _resetSceneManager();
    let updated = false;
    const def = makeScene("test", {}, {
      onUpdate: (s: any, _dt: number, _ctx: SceneContext) => { updated = true; return s; },
    });
    startSceneManager(createSceneInstance(def));
    updateSceneManager(0.016);
    assert.ok(updated);
  });

  it("user onUpdate callback is called", () => {
    _resetSceneManager();
    let userDt = -1;
    const def = makeScene("test");
    startSceneManager(createSceneInstance(def), {
      onUpdate: (dt) => { userDt = dt; },
    });
    updateSceneManager(0.025);
    assert.equal(userDt, 0.025);
  });
});

// ---------------------------------------------------------------------------
// stopSceneManager
// ---------------------------------------------------------------------------

describe("stopSceneManager", () => {
  it("calls onExit on all stacked scenes", () => {
    _resetSceneManager();
    const exits: string[] = [];
    const defA = makeScene("a", {}, { onExit: () => { exits.push("a"); } });
    const defB = makeScene("b", {}, { onExit: () => { exits.push("b"); } });
    const defC = makeScene("c", {}, { onExit: () => { exits.push("c"); } });
    pushScene(createSceneInstance(defA), { type: "none" });
    pushScene(createSceneInstance(defB), { type: "none" });
    pushScene(createSceneInstance(defC), { type: "none" });
    stopSceneManager();
    assert.deepEqual(exits, ["a", "b", "c"]);
  });

  it("clears the stack", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    stopSceneManager();
    assert.equal(getSceneStackDepth(), 0);
  });

  it("stack depth is 0 after stop", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    stopSceneManager();
    assert.equal(getSceneStackDepth(), 0);
    assert.equal(getActiveScene(), undefined);
  });
});

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

describe("Transitions", () => {
  it("isTransitioning returns false normally", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    assert.equal(isTransitioning(), false);
  });

  it("push with fade transition sets isTransitioning", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "fade", duration: 0.4 });
    assert.equal(isTransitioning(), true);
  });

  it("none transition executes immediately", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    assert.equal(isTransitioning(), false);
    assert.equal(getActiveScene()!.def.name, "b");
  });

  it("transition completes after duration", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "fade", duration: 0.2 });
    assert.equal(isTransitioning(), true);
    // Advance past the full duration
    updateSceneManager(0.1); // midpoint
    updateSceneManager(0.15); // past end
    assert.equal(isTransitioning(), false);
  });

  it("scene swap happens at midpoint of transition", () => {
    _resetSceneManager();
    const log: string[] = [];
    const defA = makeScene("a", {}, {
      onPause: (s: any) => { log.push("pause-a"); return s; },
    });
    const defB = makeScene("b", {}, {
      onEnter: (s: any, _ctx: SceneContext) => { log.push("enter-b"); return s; },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    // Start fade transition — action is deferred
    pushScene(createSceneInstance(defB), { type: "fade", duration: 1.0 });
    // Before midpoint, the push hasn't happened yet
    assert.equal(log.length, 0);
    assert.equal(getSceneStackDepth(), 1);
    // Advance to midpoint (0.5s)
    updateSceneManager(0.5);
    // Now the push should have happened
    assert.deepEqual(log, ["pause-a", "enter-b"]);
    assert.equal(getSceneStackDepth(), 2);
  });

  it("pop with transition works", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "none" });
    assert.equal(getSceneStackDepth(), 2);
    popScene({ type: "fade", duration: 0.4 });
    assert.equal(isTransitioning(), true);
    // Still 2 scenes until midpoint
    assert.equal(getSceneStackDepth(), 2);
    updateSceneManager(0.2); // midpoint
    assert.equal(getSceneStackDepth(), 1);
    updateSceneManager(0.25); // past end
    assert.equal(isTransitioning(), false);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("scene with no optional hooks works", () => {
    _resetSceneManager();
    const def: SceneDef<null> = { name: "bare", create: () => null };
    pushScene(createSceneInstance(def), { type: "none" });
    updateSceneManager(0.016);
    assert.equal(getActiveScene()!.def.name, "bare");
    assert.equal(getActiveScene()!.state, null);
  });

  it("onUpdate with dt=0 works", () => {
    _resetSceneManager();
    let called = false;
    const def = makeScene("test", {}, {
      onUpdate: (s: any, dt: number, _ctx: SceneContext) => {
        assert.equal(dt, 0);
        called = true;
        return s;
      },
    });
    pushScene(createSceneInstance(def), { type: "none" });
    updateSceneManager(0);
    assert.ok(called);
  });

  it("_resetSceneManager clears everything", () => {
    _resetSceneManager();
    pushScene(createSceneInstance(makeScene("a")), { type: "none" });
    pushScene(createSceneInstance(makeScene("b")), { type: "fade", duration: 1.0 });
    assert.equal(getSceneStackDepth(), 1);
    assert.equal(isTransitioning(), true);
    _resetSceneManager();
    assert.equal(getSceneStackDepth(), 0);
    assert.equal(isTransitioning(), false);
    assert.equal(getActiveScene(), undefined);
  });

  it("can restart after stop", () => {
    _resetSceneManager();
    const def = makeScene("first");
    pushScene(createSceneInstance(def), { type: "none" });
    stopSceneManager();
    assert.equal(getSceneStackDepth(), 0);
    const def2 = makeScene("second");
    pushScene(createSceneInstance(def2), { type: "none" });
    assert.equal(getSceneStackDepth(), 1);
    assert.equal(getActiveScene()!.def.name, "second");
  });

  it("replace on single-scene stack works", () => {
    _resetSceneManager();
    const log: string[] = [];
    const defA = makeScene("a", {}, {
      onExit: () => { log.push("exit-a"); },
    });
    const defB = makeScene("b", {}, {
      onEnter: (s: any, _ctx: SceneContext) => { log.push("enter-b"); return s; },
    });
    pushScene(createSceneInstance(defA), { type: "none" });
    replaceScene(createSceneInstance(defB), { type: "none" });
    assert.equal(getSceneStackDepth(), 1);
    assert.equal(getActiveScene()!.def.name, "b");
    assert.deepEqual(log, ["exit-a", "enter-b"]);
  });
});
