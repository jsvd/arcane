/**
 * Core scene management implementation.
 *
 * Manages a scene stack with lifecycle hooks and optional transitions.
 * Use {@link startSceneManager} to take ownership of onFrame, or call
 * {@link updateSceneManager} manually each frame for custom integration.
 */

import type {
  SceneContext,
  SceneDef,
  SceneInstance,
  TransitionConfig,
} from "./types.ts";
import { onFrame, getDeltaTime } from "../rendering/loop.ts";
import { drawRect } from "../ui/primitives.ts";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** The scene stack. Index 0 is bottom, last element is the active (topmost) scene. */
let sceneStack: SceneInstance<any>[] = [];

/** Whether a transition is currently in progress. */
let transitioning = false;

/** Elapsed time during current transition. */
let transitionElapsed = 0;

/** Total duration of current transition. */
let transitionDuration = 0.3;

/** Transition fade color. */
let transitionColor = { r: 0, g: 0, b: 0 };

/** Current phase: "out" fades to overlay, "in" fades from overlay. */
let transitionPhase: "out" | "in" = "out";

/** The action to execute at the transition midpoint (push/pop/replace). */
let transitionAction: (() => void) | null = null;

/** User-provided onUpdate callback for startSceneManager. */
let userOnUpdate: ((dt: number) => void) | null = null;

// ---------------------------------------------------------------------------
// SceneContext factory
// ---------------------------------------------------------------------------

function makeContext(instance: SceneInstance<any>): SceneContext {
  return {
    push: (scene, transition) => pushScene(scene, transition),
    pop: (transition) => popScene(transition),
    replace: (scene, transition) => replaceScene(scene, transition),
    getData: <T>() => instance.data as T | undefined,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function enterScene(instance: SceneInstance<any>): void {
  instance.entered = true;
  if (instance.def.onEnter) {
    instance.state = instance.def.onEnter(instance.state, makeContext(instance));
  }
}

function exitScene(instance: SceneInstance<any>): void {
  if (instance.def.onExit) {
    instance.def.onExit(instance.state);
  }
}

function pauseScene(instance: SceneInstance<any>): void {
  if (instance.def.onPause) {
    instance.state = instance.def.onPause(instance.state);
  }
}

function resumeScene(instance: SceneInstance<any>): void {
  if (instance.def.onResume) {
    instance.state = instance.def.onResume(instance.state, makeContext(instance));
  }
}

function executeImmediatePush(instance: SceneInstance<any>): void {
  const current = sceneStack.length > 0 ? sceneStack[sceneStack.length - 1] : null;
  if (current) {
    pauseScene(current);
  }
  sceneStack.push(instance);
  enterScene(instance);
}

function executeImmediatePop(): void {
  if (sceneStack.length <= 1) return;
  const removed = sceneStack.pop()!;
  exitScene(removed);
  const newTop = sceneStack[sceneStack.length - 1];
  if (newTop) {
    resumeScene(newTop);
  }
}

function executeImmediateReplace(instance: SceneInstance<any>): void {
  if (sceneStack.length > 0) {
    const removed = sceneStack.pop()!;
    exitScene(removed);
  }
  sceneStack.push(instance);
  enterScene(instance);
}

function startTransition(
  action: () => void,
  config?: TransitionConfig,
): void {
  const type = config?.type ?? "fade";

  if (type === "none") {
    action();
    return;
  }

  transitioning = true;
  transitionElapsed = 0;
  transitionDuration = config?.duration ?? 0.3;
  transitionColor = config?.color ?? { r: 0, g: 0, b: 0 };
  transitionPhase = "out";
  transitionAction = action;
}

function updateTransition(dt: number): void {
  if (!transitioning) return;

  transitionElapsed += dt;
  const halfDuration = transitionDuration / 2;

  if (transitionPhase === "out" && transitionElapsed >= halfDuration) {
    if (transitionAction) {
      transitionAction();
      transitionAction = null;
    }
    transitionPhase = "in";
  }

  if (transitionElapsed >= transitionDuration) {
    transitioning = false;
    transitionElapsed = 0;
    transitionAction = null;
  }
}

function renderTransitionOverlay(): void {
  if (!transitioning) return;

  const halfDuration = transitionDuration / 2;
  let alpha: number;

  if (transitionPhase === "out") {
    alpha = halfDuration > 0 ? Math.min(transitionElapsed / halfDuration, 1) : 1;
  } else {
    const inElapsed = transitionElapsed - halfDuration;
    alpha = halfDuration > 0 ? Math.max(1 - inElapsed / halfDuration, 0) : 0;
  }

  drawRect(0, 0, 9999, 9999, {
    color: { r: transitionColor.r, g: transitionColor.g, b: transitionColor.b, a: alpha },
    layer: 200,
    screenSpace: true,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Type-safety helper that returns the scene definition unchanged.
 * Use to get type inference on the state parameter without casting.
 *
 * @param def - The scene definition.
 * @returns The same definition, unchanged.
 */
export function createScene<S>(def: SceneDef<S>): SceneDef<S> {
  return def;
}

/**
 * Create a live scene instance from a definition.
 * Calls `def.create()` to produce initial state. The scene is NOT entered yet.
 *
 * @param def - Scene definition.
 * @param data - Optional data accessible via `ctx.getData()` inside lifecycle hooks.
 * @returns A new SceneInstance ready to be pushed onto the stack.
 */
export function createSceneInstance<S>(def: SceneDef<S>, data?: unknown): SceneInstance<S> {
  return {
    def,
    state: def.create(),
    entered: false,
    data,
  };
}

/**
 * Take ownership of the onFrame loop and push the initial scene.
 * Calls `onFrame()` from the rendering loop module, so only one scene manager
 * (or one onFrame callback) can be active at a time.
 *
 * @param initial - The first scene instance to push.
 * @param options - Optional user onUpdate callback invoked each frame after the scene updates.
 */
export function startSceneManager(
  initial: SceneInstance<any>,
  options?: { onUpdate?: (dt: number) => void },
): void {
  userOnUpdate = options?.onUpdate ?? null;
  sceneStack = [];
  executeImmediatePush(initial);

  onFrame(() => {
    const dt = getDeltaTime();
    updateSceneManager(dt);
  });
}

/**
 * Advance the scene manager by one frame. Call this manually if you want to
 * integrate the scene manager into your own onFrame callback instead of using
 * {@link startSceneManager}.
 *
 * @param dt - Delta time in seconds since last frame.
 */
export function updateSceneManager(dt: number): void {
  updateTransition(dt);

  const active = sceneStack.length > 0 ? sceneStack[sceneStack.length - 1] : null;
  if (active) {
    if (active.def.onUpdate) {
      active.state = active.def.onUpdate(active.state, dt, makeContext(active));
    }
    if (active.def.onRender) {
      active.def.onRender(active.state, makeContext(active));
    }
  }

  renderTransitionOverlay();

  if (userOnUpdate) {
    userOnUpdate(dt);
  }
}

/**
 * Push a scene onto the stack. The current active scene is paused.
 * If a transition is configured, the push happens at the transition midpoint.
 *
 * @param instance - Scene instance to push.
 * @param transition - Optional transition configuration.
 */
export function pushScene(instance: SceneInstance<any>, transition?: TransitionConfig): void {
  startTransition(() => executeImmediatePush(instance), transition);
}

/**
 * Pop the topmost scene from the stack. The scene below resumes.
 * No-op if only one scene remains on the stack.
 * If a transition is configured, the pop happens at the transition midpoint.
 *
 * @param transition - Optional transition configuration.
 */
export function popScene(transition?: TransitionConfig): void {
  if (sceneStack.length <= 1) return;
  startTransition(() => executeImmediatePop(), transition);
}

/**
 * Replace the topmost scene with a new one.
 * The current scene exits, the new scene enters.
 * If a transition is configured, the replacement happens at the transition midpoint.
 *
 * @param instance - Scene instance to replace with.
 * @param transition - Optional transition configuration.
 */
export function replaceScene(instance: SceneInstance<any>, transition?: TransitionConfig): void {
  startTransition(() => executeImmediateReplace(instance), transition);
}

/**
 * Get the currently active (topmost) scene instance, or undefined if the stack is empty.
 *
 * @returns The active scene instance.
 */
export function getActiveScene(): SceneInstance | undefined {
  return sceneStack.length > 0 ? sceneStack[sceneStack.length - 1] : undefined;
}

/**
 * Get the number of scenes currently on the stack.
 *
 * @returns Stack depth.
 */
export function getSceneStackDepth(): number {
  return sceneStack.length;
}

/**
 * Check whether a transition is currently in progress.
 *
 * @returns True if transitioning.
 */
export function isTransitioning(): boolean {
  return transitioning;
}

/**
 * Stop the scene manager. Calls onExit on all stacked scenes (bottom to top),
 * then clears the stack.
 */
export function stopSceneManager(): void {
  for (let i = 0; i < sceneStack.length; i++) {
    exitScene(sceneStack[i]);
  }
  sceneStack = [];
  userOnUpdate = null;
}

/**
 * Reset all scene manager state. For testing only.
 */
export function _resetSceneManager(): void {
  sceneStack = [];
  transitioning = false;
  transitionElapsed = 0;
  transitionDuration = 0.3;
  transitionColor = { r: 0, g: 0, b: 0 };
  transitionPhase = "out";
  transitionAction = null;
  userOnUpdate = null;
}
