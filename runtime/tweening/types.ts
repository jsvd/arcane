/**
 * Tweening system type definitions
 */

/**
 * Easing function signature
 * @param t - Progress from 0 to 1
 * @returns Eased value from 0 to 1
 */
export type EasingFunction = (t: number) => number;

/**
 * Callback function types
 */
export type TweenCallback = () => void;
export type TweenUpdateCallback = (progress: number) => void;

/**
 * Options for creating a tween
 */
export interface TweenOptions {
  /** Easing function (default: linear) */
  easing?: EasingFunction;
  /** Delay before starting in seconds (default: 0) */
  delay?: number;
  /** Number of times to repeat (default: 0, use -1 for infinite) */
  repeat?: number;
  /** Whether to reverse on repeat (default: false) */
  yoyo?: boolean;
  /** Called when tween starts (after delay) */
  onStart?: TweenCallback;
  /** Called every frame while tweening */
  onUpdate?: TweenUpdateCallback;
  /** Called when tween completes */
  onComplete?: TweenCallback;
  /** Called when tween repeats */
  onRepeat?: TweenCallback;
}

/**
 * Properties to tween - any numeric properties
 */
export type TweenProps = Record<string, number>;

/**
 * Tween state
 */
export type TweenState = "pending" | "active" | "paused" | "completed" | "stopped";

/**
 * Tween state constants
 */
export const TweenState = {
  /** Not started yet (waiting for delay) */
  PENDING: "pending" as const,
  /** Currently running */
  ACTIVE: "active" as const,
  /** Temporarily paused */
  PAUSED: "paused" as const,
  /** Finished */
  COMPLETED: "completed" as const,
  /** Manually stopped */
  STOPPED: "stopped" as const,
};

/**
 * A tween instance
 */
export interface Tween {
  /** Unique tween ID */
  id: string;
  /** Current state */
  state: TweenState;
  /** Target object being tweened */
  target: any;
  /** Properties being tweened */
  props: TweenProps;
  /** Start values (captured at start time) */
  startValues: TweenProps;
  /** Duration in seconds */
  duration: number;
  /** Options */
  options: Required<TweenOptions>;
  /** Elapsed time in seconds */
  elapsed: number;
  /** Time spent in delay phase */
  delayElapsed: number;
  /** Current repeat iteration */
  currentRepeat: number;
  /** Whether currently in reverse (yoyo mode) */
  isReversed: boolean;
}
