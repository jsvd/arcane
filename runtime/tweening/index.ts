/**
 * Tweening system
 *
 * Provides smooth animation of numeric properties over time.
 */

export type {
  EasingFunction,
  TweenCallback,
  TweenUpdateCallback,
  TweenOptions,
  TweenProps,
  Tween,
} from "./types.ts";
export { TweenState } from "./types.ts";

export {
  tween,
  updateTweens,
  stopTween,
  pauseTween,
  resumeTween,
  stopAllTweens,
  getActiveTweenCount,
  linear,
} from "./tween.ts";
