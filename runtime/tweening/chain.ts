/**
 * Tween chaining utilities
 *
 * Provides sequence(), parallel(), and stagger() for composing tweens.
 */

import { tween, stopTween } from "./tween.ts";
import type { Tween, TweenOptions, TweenProps } from "./types.ts";

/**
 * Configuration for a tween in a sequence/parallel/stagger
 */
export interface TweenConfig {
  target: any;
  props: TweenProps;
  duration: number;
  options?: TweenOptions;
}

/**
 * Run tweens one after another
 * @param tweens - Array of tween configurations
 * @returns Array of created tweens
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
 * Run tweens simultaneously
 * @param tweens - Array of tween configurations
 * @returns Array of created tweens
 */
export function parallel(tweens: TweenConfig[]): Tween[] {
  return tweens.map((config) =>
    tween(config.target, config.props, config.duration, config.options)
  );
}

/**
 * Run tweens with a staggered delay between each
 * @param tweens - Array of tween configurations
 * @param staggerDelay - Delay in seconds between each tween start
 * @returns Array of created tweens
 */
export function stagger(tweens: TweenConfig[], staggerDelay: number): Tween[] {
  return tweens.map((config, index) => {
    const options = { ...(config.options ?? {}) };
    options.delay = (options.delay ?? 0) + index * staggerDelay;
    return tween(config.target, config.props, config.duration, options);
  });
}
