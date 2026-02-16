// Arcane Engine — Tweening Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/tweening

declare module "@arcane/runtime/tweening" {
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
  export declare const TweenState: {
      /** Waiting for delay to elapse before starting. */
      PENDING: "pending";
      /** Currently animating properties each frame. */
      ACTIVE: "active";
      /** Temporarily paused; resumes from current progress via resumeTween(). */
      PAUSED: "paused";
      /** All iterations complete. The tween has been removed from the update list. */
      COMPLETED: "completed";
      /** Manually stopped via stopTween(). The tween has been removed from the update list. */
      STOPPED: "stopped";
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

  /**
   * Tween chaining utilities for composing multiple tweens.
   *
   * - {@link sequence} — run tweens one after another.
   * - {@link parallel} — run tweens simultaneously.
   * - {@link stagger} — run tweens with a staggered delay between each.
   */
  /**
   * Configuration for a single tween within a {@link sequence}, {@link parallel}, or {@link stagger} chain.
   */
  export interface TweenConfig {
      /** The object whose properties will be interpolated. */
      target: any;
      /** Map of property names to target (end) values. */
      props: TweenProps;
      /** Animation duration in seconds. */
      duration: number;
      /** Optional tween options (easing, callbacks, etc.). */
      options?: TweenOptions;
  }
  /**
   * Run tweens one after another in sequence. Each tween starts when the
   * previous one completes. Wraps `onComplete` callbacks to chain automatically.
   *
   * Note: Only the first tween is created immediately. Subsequent tweens are
   * created lazily as each predecessor completes.
   *
   * @param tweens - Array of tween configurations to run in order.
   * @returns Array of created tweens (initially contains only the first; more are added as the sequence progresses).
   *
   * @example
   * ```ts
   * sequence([
   *   { target: sprite, props: { x: 100 }, duration: 0.5 },
   *   { target: sprite, props: { y: 200 }, duration: 0.3 },
   * ]);
   * ```
   */
  export declare function sequence(tweens: TweenConfig[]): Tween[];
  /**
   * Run all tweens simultaneously. All tweens start immediately.
   *
   * @param tweens - Array of tween configurations to run in parallel.
   * @returns Array of all created tween instances.
   */
  export declare function parallel(tweens: TweenConfig[]): Tween[];
  /**
   * Run tweens with a staggered delay between each start.
   * The i-th tween gets an additional delay of `i * staggerDelay` seconds
   * (added to any delay already specified in its options).
   *
   * @param tweens - Array of tween configurations to stagger.
   * @param staggerDelay - Delay in seconds between each successive tween start. Must be >= 0.
   * @returns Array of all created tween instances.
   */
  export declare function stagger(tweens: TweenConfig[], staggerDelay: number): Tween[];

  /**
   * 30 easing functions for tweens, organized into 10 families.
   *
   * All functions take `t` (0 to 1) and return an eased value.
   * Most return 0..1, but back and elastic easings may overshoot.
   *
   * Families: linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce.
   * Each family (except linear) has easeIn (slow start), easeOut (slow end),
   * and easeInOut (slow start + end) variants.
   *
   * Based on https://easings.net/ and Robert Penner's easing equations.
   *
   * @example
   * ```ts
   * import { easeOutQuad } from "./easing.ts";
   * tween(sprite, { x: 100 }, 0.5, { easing: easeOutQuad });
   * ```
   */
  /** No easing: constant speed from start to end. */
  export declare const linear: EasingFunction;
  /** Quadratic ease-in: slow start, accelerating. t^2 curve. */
  export declare const easeInQuad: EasingFunction;
  /** Quadratic ease-out: fast start, decelerating. Reverse t^2 curve. */
  export declare const easeOutQuad: EasingFunction;
  /** Quadratic ease-in-out: slow start and end, fast in the middle. */
  export declare const easeInOutQuad: EasingFunction;
  /** Cubic ease-in: slow start with t^3 curve. Slightly more pronounced than quad. */
  export declare const easeInCubic: EasingFunction;
  /** Cubic ease-out: fast start, decelerating with t^3 curve. */
  export declare const easeOutCubic: EasingFunction;
  /** Cubic ease-in-out: smooth acceleration then deceleration. */
  export declare const easeInOutCubic: EasingFunction;
  /** Quartic ease-in: very slow start with t^4 curve. */
  export declare const easeInQuart: EasingFunction;
  /** Quartic ease-out: fast start, strong deceleration. */
  export declare const easeOutQuart: EasingFunction;
  /** Quartic ease-in-out: pronounced slow start/end, fast middle. */
  export declare const easeInOutQuart: EasingFunction;
  /** Quintic ease-in: very slow start with t^5 curve. Most dramatic polynomial ease-in. */
  export declare const easeInQuint: EasingFunction;
  /** Quintic ease-out: fast start, very strong deceleration. */
  export declare const easeOutQuint: EasingFunction;
  /** Quintic ease-in-out: extremely slow start/end, very fast middle. */
  export declare const easeInOutQuint: EasingFunction;
  /** Sine ease-in: gentle slow start following a sine curve. */
  export declare const easeInSine: EasingFunction;
  /** Sine ease-out: gentle deceleration following a sine curve. */
  export declare const easeOutSine: EasingFunction;
  /** Sine ease-in-out: smooth sinusoidal acceleration and deceleration. */
  export declare const easeInOutSine: EasingFunction;
  /** Exponential ease-in: near-zero at start, rapidly accelerating. Returns 0 when t=0. */
  export declare const easeInExpo: EasingFunction;
  /** Exponential ease-out: fast start, asymptotically approaching 1. Returns 1 when t=1. */
  export declare const easeOutExpo: EasingFunction;
  /** Exponential ease-in-out: dramatic acceleration/deceleration with near-flat start/end. */
  export declare const easeInOutExpo: EasingFunction;
  /** Circular ease-in: quarter-circle curve, slow start. */
  export declare const easeInCirc: EasingFunction;
  /** Circular ease-out: quarter-circle curve, fast start. */
  export declare const easeOutCirc: EasingFunction;
  /** Circular ease-in-out: half-circle curve, slow at both ends. */
  export declare const easeInOutCirc: EasingFunction;
  /** Back ease-in: pulls back slightly before accelerating forward. Overshoots below 0. */
  export declare const easeInBack: EasingFunction;
  /** Back ease-out: overshoots past 1 then settles back. */
  export declare const easeOutBack: EasingFunction;
  /** Back ease-in-out: pulls back, accelerates, overshoots, then settles. */
  export declare const easeInOutBack: EasingFunction;
  /** Elastic ease-in: spring-like oscillation at the start. Overshoots below 0. */
  export declare const easeInElastic: EasingFunction;
  /** Elastic ease-out: spring-like oscillation at the end. Overshoots above 1. */
  export declare const easeOutElastic: EasingFunction;
  /** Elastic ease-in-out: spring oscillation at both start and end. */
  export declare const easeInOutElastic: EasingFunction;
  /** Bounce ease-out: simulates a ball bouncing to rest. Stays within 0..1. */
  export declare const easeOutBounce: EasingFunction;
  /** Bounce ease-in: reverse bouncing at the start. Stays within 0..1. */
  export declare const easeInBounce: EasingFunction;
  /** Bounce ease-in-out: bouncing at both start and end. */
  export declare const easeInOutBounce: EasingFunction;
  /**
   * Lookup object containing all 30 easing functions keyed by name.
   * Useful for selecting an easing function dynamically (e.g., from config or UI).
   *
   * @example
   * ```ts
   * const easingName = "easeOutQuad";
   * tween(obj, { x: 100 }, 1, { easing: Easing[easingName] });
   * ```
   */
  export declare const Easing: {
      readonly linear: EasingFunction;
      readonly easeInQuad: EasingFunction;
      readonly easeOutQuad: EasingFunction;
      readonly easeInOutQuad: EasingFunction;
      readonly easeInCubic: EasingFunction;
      readonly easeOutCubic: EasingFunction;
      readonly easeInOutCubic: EasingFunction;
      readonly easeInQuart: EasingFunction;
      readonly easeOutQuart: EasingFunction;
      readonly easeInOutQuart: EasingFunction;
      readonly easeInQuint: EasingFunction;
      readonly easeOutQuint: EasingFunction;
      readonly easeInOutQuint: EasingFunction;
      readonly easeInSine: EasingFunction;
      readonly easeOutSine: EasingFunction;
      readonly easeInOutSine: EasingFunction;
      readonly easeInExpo: EasingFunction;
      readonly easeOutExpo: EasingFunction;
      readonly easeInOutExpo: EasingFunction;
      readonly easeInCirc: EasingFunction;
      readonly easeOutCirc: EasingFunction;
      readonly easeInOutCirc: EasingFunction;
      readonly easeInBack: EasingFunction;
      readonly easeOutBack: EasingFunction;
      readonly easeInOutBack: EasingFunction;
      readonly easeInElastic: EasingFunction;
      readonly easeOutElastic: EasingFunction;
      readonly easeInOutElastic: EasingFunction;
      readonly easeInBounce: EasingFunction;
      readonly easeOutBounce: EasingFunction;
      readonly easeInOutBounce: EasingFunction;
  };

  /**
   * Tweening helper functions for common game "juice" effects.
   *
   * Camera shake and screen flash are implemented as global singletons.
   * Only one shake and one flash can be active at a time; starting a new one
   * replaces the previous.
   *
   * Usage: call the effect function, then read the offset/flash state each frame
   * when rendering.
   */
  /**
   * Start a camera shake effect that decays over time using easeOutQuad.
   *
   * Each frame, read the offset via {@link getCameraShakeOffset} and add it
   * to your camera position. The offset oscillates randomly and decays to zero.
   *
   * @param intensity - Maximum shake offset in pixels. Higher = more violent. Must be > 0.
   * @param duration - Duration of the shake in seconds. Must be > 0.
   * @param frequency - Unused currently; reserved for future use. Default: 20.
   */
  export declare function shakeCamera(intensity: number, duration: number, frequency?: number): void;
  /**
   * Get the current camera shake offset for this frame.
   * Returns {0, 0} when no shake is active.
   *
   * @returns Object with `x` and `y` pixel offsets to add to camera position.
   */
  export declare function getCameraShakeOffset(): {
      x: number;
      y: number;
  };
  /**
   * Check whether a camera shake effect is currently active.
   * @returns True if shake is in progress, false otherwise.
   */
  export declare function isCameraShaking(): boolean;
  /**
   * Stop the camera shake immediately, resetting the offset to zero.
   */
  export declare function stopCameraShake(): void;
  /**
   * Flash the screen with a colored overlay that fades out using easeOutQuad.
   *
   * Each frame, read the flash state via {@link getScreenFlash} and render
   * a full-screen rectangle with the returned color and opacity.
   *
   * @param r - Red component, 0.0 (none) to 1.0 (full).
   * @param g - Green component, 0.0 (none) to 1.0 (full).
   * @param b - Blue component, 0.0 (none) to 1.0 (full).
   * @param duration - Fade-out duration in seconds. Must be > 0.
   * @param startOpacity - Initial opacity of the flash overlay. Default: 0.8. Range: 0.0..1.0.
   */
  export declare function flashScreen(r: number, g: number, b: number, duration: number, startOpacity?: number): void;
  /**
   * Get the current screen flash color and opacity for this frame.
   *
   * @returns Flash state with `r`, `g`, `b` (0..1) and `opacity` (0..1), or `null` if no flash is active.
   */
  export declare function getScreenFlash(): {
      r: number;
      g: number;
      b: number;
      opacity: number;
  } | null;
  /**
   * Check whether a screen flash effect is currently active.
   * @returns True if flash is in progress, false otherwise.
   */
  export declare function isScreenFlashing(): boolean;
  /**
   * Stop the screen flash immediately, resetting opacity to zero.
   */
  export declare function stopScreenFlash(): void;

  /**
   * Core tweening implementation.
   *
   * Manages a global list of active tweens. Call {@link updateTweens} once per
   * frame (typically inside your `onFrame` callback) to advance all tweens.
   */
  /**
   * Linear easing function (identity). Used as the default when no easing is specified.
   * @param t - Progress from 0 to 1.
   * @returns The same value `t`, unchanged.
   */
  export declare function linear(t: number): number;
  /**
   * Create and start a tween that interpolates numeric properties on `target`
   * from their current values to the values specified in `props`.
   *
   * The tween is automatically added to the global update list. Call
   * {@link updateTweens} each frame to advance it.
   *
   * @param target - Object whose numeric properties will be interpolated.
   * @param props - Map of property names to their target (end) values.
   * @param duration - Animation duration in seconds. Use 0 for instant.
   * @param options - Optional easing, delay, repeat, yoyo, and lifecycle callbacks.
   * @returns The created {@link Tween} instance for further control.
   *
   * @example
   * ```ts
   * const sprite = { x: 0, y: 0, alpha: 1 };
   * // Move sprite to (100, 50) over 0.5 seconds with ease-out
   * const t = tween(sprite, { x: 100, y: 50 }, 0.5, {
   *   easing: easeOutQuad,
   *   onComplete: () => console.log("done!"),
   * });
   * ```
   */
  export declare function tween(target: any, props: TweenProps, duration: number, options?: TweenOptions): Tween;
  /**
   * Advance all active tweens by the given delta time.
   *
   * Call this once per frame in your game loop. Handles delay, easing,
   * property interpolation, repeat/yoyo, and lifecycle callbacks.
   * Completed and stopped tweens are automatically removed from the list.
   *
   * @param dt - Elapsed time since last frame, in seconds. Must be >= 0.
   */
  export declare function updateTweens(dt: number): void;
  /**
   * Stop a tween immediately and remove it from the update list.
   * Sets state to {@link TweenState.STOPPED}. The `onComplete` callback is NOT called.
   *
   * @param t - The tween to stop.
   */
  export declare function stopTween(t: Tween): void;
  /**
   * Pause a tween, freezing it at its current progress.
   * Only affects tweens in "active" or "pending" state. Use {@link resumeTween} to continue.
   *
   * @param t - The tween to pause.
   */
  export declare function pauseTween(t: Tween): void;
  /**
   * Resume a paused tween from where it left off.
   * Restores the tween to "active" or "pending" state depending on whether the delay had elapsed.
   * No-op if the tween is not paused.
   *
   * @param t - The tween to resume.
   */
  export declare function resumeTween(t: Tween): void;
  /**
   * Stop all active tweens and clear the update list.
   * Sets every tween's state to {@link TweenState.STOPPED}. No `onComplete` callbacks are called.
   */
  export declare function stopAllTweens(): void;
  /**
   * Reverse a tween's direction mid-flight.
   *
   * Captures the target's current property values as the new start,
   * and sets the original start values as the new target. Resets elapsed
   * time so the tween animates back from the current position.
   *
   * @param t - The tween to reverse.
   */
  export declare function reverseTween(t: Tween): void;
  /**
   * Get the number of tweens currently in the update list (active, pending, or paused).
   * Useful for debugging and testing.
   *
   * @returns Count of tweens that have not yet completed or been stopped.
   */
  export declare function getActiveTweenCount(): number;

}
