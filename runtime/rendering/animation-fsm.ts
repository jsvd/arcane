/**
 * Animation state machine for sprite-based character animation.
 *
 * Provides a declarative way to define animation states (idle, walk, run, jump, attack)
 * with transitions between them based on conditions. Supports blending (crossfade)
 * between animations during transitions.
 *
 * @example
 * ```ts
 * const fsm = createAnimationFSM({
 *   states: {
 *     idle: { animationId: idleAnim },
 *     walk: { animationId: walkAnim },
 *     jump: { animationId: jumpAnim, loop: false },
 *   },
 *   transitions: [
 *     { from: "idle", to: "walk", condition: { type: "boolean", param: "isMoving" } },
 *     { from: "walk", to: "idle", condition: { type: "boolean", param: "isMoving", negate: true } },
 *     { from: "any", to: "jump", condition: { type: "trigger", param: "jump" }, priority: 10 },
 *     { from: "jump", to: "idle", condition: { type: "animationFinished" } },
 *   ],
 *   initialState: "idle",
 *   defaultBlendDuration: 0.1,
 * });
 *
 * // Each frame:
 * fsm = updateFSM(fsm, dt, { isMoving: speed > 0 });
 * drawFSMSprite(fsm, x, y, w, h);
 * ```
 */
import type { AnimationId } from "./animation.ts";
import {
  playAnimation,
  updateAnimation,
  updateAnimationWithEvents,
  getAnimationUV,
  getAnimationDef,
} from "./animation.ts";
import type { AnimationState } from "./animation.ts";
import { drawSprite } from "./sprites.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A named state in the animation state machine. */
export type FSMStateDef = {
  /** AnimationId to play when this state is active. */
  animationId: AnimationId;
  /** Override the animation's loop setting for this state. */
  loop?: boolean;
  /** Playback speed multiplier. 1 = normal, 2 = double speed. Default: 1. */
  speed?: number;
  /** Called when entering this state. */
  onEnter?: () => void;
  /** Called when exiting this state. */
  onExit?: () => void;
};

/** Boolean condition: true when a named parameter is truthy (or falsy if negated). */
export type BooleanCondition = {
  type: "boolean";
  /** Parameter name to check in the params object. */
  param: string;
  /** If true, condition is met when the param is falsy. Default: false. */
  negate?: boolean;
};

/** Threshold condition: true when a named parameter crosses a threshold. */
export type ThresholdCondition = {
  type: "threshold";
  /** Parameter name to check. */
  param: string;
  /** Threshold value to compare against. */
  value: number;
  /** Comparison operator. Default: "greaterThan". */
  compare?: "greaterThan" | "lessThan" | "greaterOrEqual" | "lessOrEqual";
};

/** Trigger condition: true once when a named trigger param is set, then auto-clears. */
export type TriggerCondition = {
  type: "trigger";
  /** Trigger parameter name. Must be set to true in params to fire. */
  param: string;
};

/** Animation finished condition: true when the current state's animation has finished (non-looping). */
export type AnimationFinishedCondition = {
  type: "animationFinished";
};

/** Union of all transition condition types. */
export type TransitionCondition =
  | BooleanCondition
  | ThresholdCondition
  | TriggerCondition
  | AnimationFinishedCondition;

/** A transition between states in the animation FSM. */
export type FSMTransition = {
  /** Source state name, or "any" to match all states. */
  from: string;
  /** Destination state name. */
  to: string;
  /** Condition that must be met for the transition to fire. */
  condition: TransitionCondition;
  /** Higher priority transitions are evaluated first. Default: 0. */
  priority?: number;
  /** Duration of crossfade blend in seconds. Overrides defaultBlendDuration. */
  blendDuration?: number;
};

/** Configuration for creating an animation FSM. */
export type FSMConfig = {
  /** Map of state names to state definitions. */
  states: Record<string, FSMStateDef>;
  /** List of transitions between states. */
  transitions: FSMTransition[];
  /** Name of the initial state. Must be a key in `states`. */
  initialState: string;
  /** Default crossfade blend duration in seconds. 0 = instant. Default: 0. */
  defaultBlendDuration?: number;
};

/** Parameters passed to updateFSM each frame. Keys are param names, values are booleans or numbers. */
export type FSMParams = Record<string, boolean | number>;

/** Active blend state during a crossfade transition. */
export type BlendState = {
  /** Animation state of the outgoing (previous) animation. */
  fromAnim: AnimationState;
  /** AnimationId of the outgoing animation (for UV/texture lookup). */
  fromAnimId: AnimationId;
  /** Elapsed blend time in seconds. */
  elapsed: number;
  /** Total blend duration in seconds. */
  duration: number;
};

/** The runtime state of an animation FSM instance. */
export type FSMState = {
  /** The FSM configuration (immutable reference). */
  config: FSMConfig;
  /** Name of the current active state. */
  currentState: string;
  /** Animation playback state for the current animation. */
  animation: AnimationState;
  /** Active blend/crossfade, or null if not blending. */
  blend: BlendState | null;
  /** Sorted transitions (by priority descending) for efficient evaluation. */
  sortedTransitions: FSMTransition[];
};

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Create an animation state machine instance.
 *
 * @param config - FSM configuration with states, transitions, and initial state.
 * @returns A new FSMState ready for updates.
 */
export function createAnimationFSM(config: FSMConfig): FSMState {
  const stateDef = config.states[config.initialState];
  if (!stateDef) {
    throw new Error(`Initial state "${config.initialState}" not found in states`);
  }

  // Sort transitions by priority (descending) for deterministic evaluation
  const sortedTransitions = [...config.transitions].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  const animation = playAnimation(stateDef.animationId);

  // Fire onEnter for initial state
  if (stateDef.onEnter) stateDef.onEnter();

  return {
    config,
    currentState: config.initialState,
    animation,
    blend: null,
    sortedTransitions,
  };
}

/**
 * Get the name of the current active state.
 *
 * @param fsm - The FSM state.
 * @returns Current state name.
 */
export function getCurrentState(fsm: FSMState): string {
  return fsm.currentState;
}

/**
 * Check if the FSM is currently blending between two animations.
 *
 * @param fsm - The FSM state.
 * @returns True if a crossfade blend is in progress.
 */
export function isBlending(fsm: FSMState): boolean {
  return fsm.blend !== null;
}

/**
 * Get the blend progress (0 = fully old animation, 1 = fully new animation).
 *
 * @param fsm - The FSM state.
 * @returns Blend progress 0-1, or 1 if not blending.
 */
export function getBlendProgress(fsm: FSMState): number {
  if (!fsm.blend) return 1;
  return Math.min(fsm.blend.elapsed / fsm.blend.duration, 1);
}

/**
 * Force the FSM into a specific state immediately, bypassing transitions.
 * Fires onExit for the old state and onEnter for the new state.
 *
 * @param fsm - Current FSM state.
 * @param stateName - Name of the state to switch to.
 * @param blendDuration - Optional crossfade duration. 0 = instant.
 * @returns Updated FSM state.
 */
export function setFSMState(
  fsm: FSMState,
  stateName: string,
  blendDuration?: number,
): FSMState {
  const newStateDef = fsm.config.states[stateName];
  if (!newStateDef) return fsm;
  if (stateName === fsm.currentState && !fsm.animation.finished) return fsm;

  return transitionTo(fsm, stateName, blendDuration);
}

/**
 * Update the animation FSM. Evaluates transitions, advances animations, and
 * progresses any active blend. Trigger params are consumed after evaluation.
 *
 * @param fsm - Current FSM state.
 * @param dt - Time delta in seconds.
 * @param params - Named parameters for transition conditions.
 * @returns Updated FSM state.
 */
export function updateFSM(
  fsm: FSMState,
  dt: number,
  params: FSMParams = {},
): FSMState {
  let result = { ...fsm };
  if (!result.config.states[result.currentState]) return result;

  // Evaluate transitions (highest priority first)
  for (const transition of result.sortedTransitions) {
    // Check "from" matches
    if (transition.from !== "any" && transition.from !== result.currentState) {
      continue;
    }
    // Don't transition to same state (unless animation finished)
    if (transition.to === result.currentState && !result.animation.finished) {
      continue;
    }

    if (evaluateCondition(transition.condition, params, result.animation)) {
      const blendDur = transition.blendDuration ?? result.config.defaultBlendDuration ?? 0;
      result = transitionTo(result, transition.to, blendDur);
      break; // Only one transition per frame
    }
  }

  // Re-fetch current state def after potential transition
  const activeStateDef = result.config.states[result.currentState];
  if (!activeStateDef) return result;

  // Advance current animation
  const speed = activeStateDef.speed ?? 1;
  const scaledDt = dt * speed;
  const animDef = getAnimationDef(result.animation.defId);
  const hasEvents = animDef?.events && animDef.events.length > 0;
  result.animation = hasEvents
    ? updateAnimationWithEvents(result.animation, scaledDt)
    : updateAnimation(result.animation, scaledDt);

  // Advance blend
  if (result.blend) {
    result.blend = {
      ...result.blend,
      fromAnim: updateAnimation(result.blend.fromAnim, dt),
      elapsed: result.blend.elapsed + dt,
    };
    // Blend complete
    if (result.blend.elapsed >= result.blend.duration) {
      result.blend = null;
    }
  }

  return result;
}

/**
 * Draw the FSM's current animation sprite, with crossfade blending if active.
 * During a blend, draws both old and new animations with interpolated opacity.
 *
 * @param fsm - Current FSM state.
 * @param x - World X position.
 * @param y - World Y position.
 * @param w - Width in world units.
 * @param h - Height in world units.
 * @param options - Optional layer, tint, flipX, flipY.
 */
export function drawFSMSprite(
  fsm: FSMState,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: {
    layer?: number;
    tint?: { r: number; g: number; b: number; a: number };
    flipX?: boolean;
    flipY?: boolean;
  },
): void {
  const currentStateDef = fsm.config.states[fsm.currentState];
  if (!currentStateDef) return;

  const currentDef = getAnimationDef(currentStateDef.animationId);
  if (!currentDef) return;

  if (fsm.blend) {
    const t = Math.min(fsm.blend.elapsed / fsm.blend.duration, 1);
    const fromDef = getAnimationDef(fsm.blend.fromAnimId);

    // Draw outgoing animation (fading out)
    if (fromDef) {
      const fromUV = getAnimationUV(fsm.blend.fromAnim);
      drawSprite({
        textureId: fromDef.textureId,
        x, y, w, h,
        layer: options?.layer,
        uv: fromUV,
        tint: options?.tint,
        opacity: 1 - t,
        flipX: options?.flipX,
        flipY: options?.flipY,
      });
    }

    // Draw incoming animation (fading in)
    const toUV = getAnimationUV(fsm.animation);
    drawSprite({
      textureId: currentDef.textureId,
      x, y, w, h,
      layer: options?.layer,
      uv: toUV,
      tint: options?.tint,
      opacity: t,
      flipX: options?.flipX,
      flipY: options?.flipY,
    });
  } else {
    // No blending, draw current animation
    const uv = getAnimationUV(fsm.animation);
    drawSprite({
      textureId: currentDef.textureId,
      x, y, w, h,
      layer: options?.layer,
      uv: uv,
      tint: options?.tint,
      flipX: options?.flipX,
      flipY: options?.flipY,
    });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function transitionTo(fsm: FSMState, stateName: string, blendDuration?: number): FSMState {
  const newStateDef = fsm.config.states[stateName];
  if (!newStateDef) return fsm;

  const oldStateDef = fsm.config.states[fsm.currentState];

  // Fire lifecycle callbacks
  if (oldStateDef?.onExit) oldStateDef.onExit();
  if (newStateDef.onEnter) newStateDef.onEnter();

  const newAnimation = playAnimation(newStateDef.animationId);
  const duration = blendDuration ?? 0;

  const blend: BlendState | null = duration > 0
    ? {
        fromAnim: { ...fsm.animation },
        fromAnimId: oldStateDef?.animationId ?? 0,
        elapsed: 0,
        duration,
      }
    : null;

  return {
    ...fsm,
    currentState: stateName,
    animation: newAnimation,
    blend,
  };
}

function evaluateCondition(
  condition: TransitionCondition,
  params: FSMParams,
  animation: AnimationState,
): boolean {
  switch (condition.type) {
    case "boolean": {
      const value = !!params[condition.param];
      return condition.negate ? !value : value;
    }
    case "threshold": {
      const val = params[condition.param];
      if (typeof val !== "number") return false;
      const compare = condition.compare ?? "greaterThan";
      switch (compare) {
        case "greaterThan": return val > condition.value;
        case "lessThan": return val < condition.value;
        case "greaterOrEqual": return val >= condition.value;
        case "lessOrEqual": return val <= condition.value;
      }
      return false;
    }
    case "trigger": {
      return !!params[condition.param];
    }
    case "animationFinished": {
      return animation.finished;
    }
  }
}
