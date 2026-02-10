/**
 * Core tweening implementation
 */

import type {
  Tween,
  TweenOptions,
  TweenProps,
  EasingFunction,
} from "./types.ts";
import { TweenState } from "./types.ts";

/** Active tweens being updated */
const activeTweens: Tween[] = [];

/** Counter for generating unique tween IDs */
let tweenIdCounter = 0;

/**
 * Linear easing function (default)
 */
export function linear(t: number): number {
  return t;
}

/**
 * Create and start a tween
 * @param target - Object to tween
 * @param props - Properties to tween with target values
 * @param duration - Duration in seconds
 * @param options - Tween options
 * @returns Tween instance
 */
export function tween(
  target: any,
  props: TweenProps,
  duration: number,
  options: TweenOptions = {},
): Tween {
  const tweenInstance: Tween = {
    id: `tween_${tweenIdCounter++}`,
    state: options.delay && options.delay > 0 ? TweenState.PENDING : TweenState.ACTIVE,
    target,
    props,
    startValues: {}, // Will be captured when tween starts
    duration,
    options: {
      easing: options.easing ?? linear,
      delay: options.delay ?? 0,
      repeat: options.repeat ?? 0,
      yoyo: options.yoyo ?? false,
      onStart: options.onStart,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      onRepeat: options.onRepeat,
    },
    elapsed: 0,
    delayElapsed: 0,
    currentRepeat: 0,
    isReversed: false,
  };

  // If no delay, capture start values and call onStart immediately
  if (tweenInstance.options.delay === 0) {
    captureStartValues(tweenInstance);
    if (tweenInstance.options.onStart) {
      tweenInstance.options.onStart();
    }
  }

  activeTweens.push(tweenInstance);
  return tweenInstance;
}

/**
 * Update all active tweens
 * @param dt - Delta time in seconds
 */
export function updateTweens(dt: number): void {
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    const t = activeTweens[i];

    if (t.state === TweenState.PAUSED) {
      continue;
    }

    if (t.state === TweenState.PENDING) {
      // Handle delay
      t.delayElapsed += dt;
      if (t.delayElapsed >= t.options.delay) {
        t.state = TweenState.ACTIVE;
        captureStartValues(t);
        if (t.options.onStart) {
          t.options.onStart();
        }
      }
      continue;
    }

    if (t.state !== TweenState.ACTIVE) {
      continue;
    }

    // Update elapsed time
    t.elapsed += dt;

    // Calculate progress (0 to 1)
    // Handle zero duration specially
    let progress = t.duration === 0 ? 1.0 : Math.min(t.elapsed / t.duration, 1.0);

    // Apply easing
    const easedProgress = t.options.easing(progress);

    // Update target properties
    updateTargetProps(t, easedProgress);

    // Call onUpdate callback
    if (t.options.onUpdate) {
      t.options.onUpdate(progress);
    }

    // Check if tween is complete
    if (progress >= 1.0) {
      handleTweenComplete(t, i);
    }
  }
}

/**
 * Capture start values from target
 */
function captureStartValues(t: Tween): void {
  for (const key in t.props) {
    t.startValues[key] = t.target[key] ?? 0;
  }
}

/**
 * Update target properties based on progress
 */
function updateTargetProps(t: Tween, easedProgress: number): void {
  for (const key in t.props) {
    const start = t.startValues[key];
    const end = t.props[key];
    const delta = end - start;
    t.target[key] = start + delta * easedProgress;
  }
}

/**
 * Handle tween completion
 */
function handleTweenComplete(t: Tween, index: number): void {
  // Check for repeat
  if (t.options.repeat === -1 || t.currentRepeat < t.options.repeat) {
    t.currentRepeat++;
    t.elapsed = 0;

    // Handle yoyo
    if (t.options.yoyo) {
      // Swap start and target values to reverse direction
      const temp = { ...t.startValues };
      t.startValues = { ...t.props };
      t.props = temp;
    } else {
      // Reset to original start values
      captureStartValues(t);
    }

    if (t.options.onRepeat) {
      t.options.onRepeat();
    }
  } else {
    // Tween complete
    t.state = TweenState.COMPLETED;

    if (t.options.onComplete) {
      t.options.onComplete();
    }

    // Remove from active tweens
    activeTweens.splice(index, 1);
  }
}

/**
 * Stop a tween
 */
export function stopTween(t: Tween): void {
  t.state = TweenState.STOPPED;
  const index = activeTweens.indexOf(t);
  if (index !== -1) {
    activeTweens.splice(index, 1);
  }
}

/**
 * Pause a tween
 */
export function pauseTween(t: Tween): void {
  if (t.state === TweenState.ACTIVE || t.state === TweenState.PENDING) {
    t.state = TweenState.PAUSED;
  }
}

/**
 * Resume a paused tween
 */
export function resumeTween(t: Tween): void {
  if (t.state === TweenState.PAUSED) {
    t.state = t.delayElapsed < t.options.delay ? TweenState.PENDING : TweenState.ACTIVE;
  }
}

/**
 * Stop all active tweens
 */
export function stopAllTweens(): void {
  for (const t of activeTweens) {
    t.state = TweenState.STOPPED;
  }
  activeTweens.length = 0;
}

/**
 * Reverse a tween's direction
 */
export function reverseTween(t: Tween): void {
  // Capture current values as the new start
  const currentValues: Record<string, number> = {};
  for (const key in t.props) {
    currentValues[key] = t.target[key];
  }

  // New target is the old start
  const newTarget = { ...t.startValues };

  // Update tween
  t.startValues = currentValues;
  t.props = newTarget;

  // Reset elapsed to animate from current position
  t.elapsed = 0;
}

/**
 * Get count of active tweens (for debugging/testing)
 */
export function getActiveTweenCount(): number {
  return activeTweens.length;
}
