/**
 * Tweening system type definitions.
 *
 * Tweens smoothly interpolate numeric properties on any object over time.
 * Used for animations, UI transitions, camera effects, and game juice.
 */

/**
 * A function that maps linear progress to eased progress.
 * See `runtime/tweening/easing.ts` for 30 built-in easing functions.
 *
 * @param t - Linear progress, clamped to 0..1 by the tween system.
 * @returns Eased value. Usually 0..1, but may overshoot for back/elastic easings.
 */
export type EasingFunction = (t: number) => number;

/**
 * Callback invoked at tween lifecycle events (start, complete, repeat).
 */
export type TweenCallback = () => void;

/**
 * Callback invoked every frame while a tween is active.
 * @param progress - Linear progress from 0 to 1 (before easing).
 */
export type TweenUpdateCallback = (progress: number) => void;

/**
 * Options for creating a tween via {@link tween}.
 *
 * All fields are optional; sensible defaults are applied (linear easing, no delay, no repeat).
 */
export interface TweenOptions {
  /** Easing function applied to progress. Default: linear (no easing). */
  easing?: EasingFunction;
  /** Delay in seconds before the tween starts animating. Default: 0. Must be >= 0. */
  delay?: number;
  /** Number of additional times to repeat after the first play. 0 = play once, -1 = infinite. Default: 0. */
  repeat?: number;
  /** When true, alternates direction on each repeat (ping-pong). Default: false. */
  yoyo?: boolean;
  /** Called once when the tween transitions from pending to active (after delay elapses). */
  onStart?: TweenCallback;
  /** Called every frame while the tween is active. Receives linear progress (0..1). */
  onUpdate?: TweenUpdateCallback;
  /** Called once when the tween finishes all iterations. Not called if stopped manually. */
  onComplete?: TweenCallback;
  /** Called each time the tween starts a new repeat iteration. */
  onRepeat?: TweenCallback;
}

/**
 * A map of property names to their target numeric values.
 * Each key must correspond to a numeric property on the tween target object.
 */
export type TweenProps = Record<string, number>;

/**
 * Lifecycle state of a tween instance.
 *
 * Transitions: pending -> active -> completed (normal flow),
 * active <-> paused (via pauseTween/resumeTween),
 * any -> stopped (via stopTween).
 */
export type TweenState = "pending" | "active" | "paused" | "completed" | "stopped";

/**
 * Tween state constants for comparing against {@link Tween.state}.
 *
 * @example
 * ```ts
 * if (myTween.state === TweenState.ACTIVE) { ... }
 * ```
 */
export const TweenState = {
  /** Waiting for delay to elapse before starting. */
  PENDING: "pending" as const,
  /** Currently animating properties each frame. */
  ACTIVE: "active" as const,
  /** Temporarily paused; resumes from current progress via resumeTween(). */
  PAUSED: "paused" as const,
  /** All iterations complete. The tween has been removed from the update list. */
  COMPLETED: "completed" as const,
  /** Manually stopped via stopTween(). The tween has been removed from the update list. */
  STOPPED: "stopped" as const,
};

/**
 * A tween instance returned by {@link tween}.
 *
 * Inspect `state` to check lifecycle. Use `stopTween()`, `pauseTween()`,
 * `resumeTween()`, or `reverseTween()` to control playback.
 */
export interface Tween {
  /** Unique identifier, auto-generated as "tween_0", "tween_1", etc. */
  id: string;
  /** Current lifecycle state. See {@link TweenState}. */
  state: TweenState;
  /** The object whose properties are being interpolated. */
  target: any;
  /** Target values for each property being tweened. */
  props: TweenProps;
  /** Start values captured when the tween becomes active (after delay). */
  startValues: TweenProps;
  /** Total animation duration in seconds (excluding delay). Must be >= 0. */
  duration: number;
  /** Resolved options with defaults applied. */
  options: {
    /** Easing function applied to progress. */
    easing: EasingFunction;
    /** Delay in seconds before animation starts. */
    delay: number;
    /** Number of additional repeat iterations. -1 = infinite. */
    repeat: number;
    /** Whether direction alternates on repeat. */
    yoyo: boolean;
    /** Called when tween transitions to active. */
    onStart?: TweenCallback;
    /** Called every frame with linear progress (0..1). */
    onUpdate?: TweenUpdateCallback;
    /** Called when all iterations complete. */
    onComplete?: TweenCallback;
    /** Called at the start of each repeat iteration. */
    onRepeat?: TweenCallback;
  };
  /** Seconds elapsed since the tween became active (resets on repeat). */
  elapsed: number;
  /** Seconds elapsed during the delay phase. */
  delayElapsed: number;
  /** Zero-based index of the current repeat iteration. */
  currentRepeat: number;
  /** True when playing in reverse direction (yoyo mode). */
  isReversed: boolean;
}
