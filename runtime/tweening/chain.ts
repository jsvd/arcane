/**
 * Tween chaining utilities for composing multiple tweens.
 *
 * - {@link sequence} — run tweens one after another.
 * - {@link parallel} — run tweens simultaneously.
 * - {@link stagger} — run tweens with a staggered delay between each.
 */

import { tween, stopTween } from "./tween.ts";
import type { Tween, TweenOptions, TweenProps } from "./types.ts";

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
export function sequence(tweens: TweenConfig[]): Tween[] {
  if (tweens.length === 0) return [];

  const createdTweens: Tween[] = [];
  let currentIndex = 0;

  function startNext() {
    if (currentIndex >= tweens.length) return;

    const config = tweens[currentIndex];
    const options = config.options ?? {};

    // Wrap onComplete to start next tween
    const originalOnComplete = options.onComplete;
    options.onComplete = () => {
      if (originalOnComplete) {
        originalOnComplete();
      }
      currentIndex++;
      startNext();
    };

    const t = tween(config.target, config.props, config.duration, options);
    createdTweens.push(t);
  }

  // Start the first tween
  startNext();

  return createdTweens;
}

/**
 * Run all tweens simultaneously. All tweens start immediately.
 *
 * @param tweens - Array of tween configurations to run in parallel.
 * @returns Array of all created tween instances.
 */
export function parallel(tweens: TweenConfig[]): Tween[] {
  return tweens.map((config) =>
    tween(config.target, config.props, config.duration, config.options)
  );
}

/**
 * Run tweens with a staggered delay between each start.
 * The i-th tween gets an additional delay of `i * staggerDelay` seconds
 * (added to any delay already specified in its options).
 *
 * @param tweens - Array of tween configurations to stagger.
 * @param staggerDelay - Delay in seconds between each successive tween start. Must be >= 0.
 * @returns Array of all created tween instances.
 */
export function stagger(tweens: TweenConfig[], staggerDelay: number): Tween[] {
  return tweens.map((config, index) => {
    const options = { ...(config.options ?? {}) };
    options.delay = (options.delay ?? 0) + index * staggerDelay;
    return tween(config.target, config.props, config.duration, options);
  });
}
