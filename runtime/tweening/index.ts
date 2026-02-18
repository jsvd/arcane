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
  reverseTween,
  stopAllTweens,
  getActiveTweenCount,
  linear,
} from "./tween.ts";

export {
  linear as easingLinear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
  Easing,
} from "./easing.ts";

export type { TweenConfig } from "./chain.ts";
export { sequence, parallel, stagger } from "./chain.ts";

export {
  shakeCamera,
  getCameraShakeOffset,
  isCameraShaking,
  stopCameraShake,
  flashScreen,
  getScreenFlash,
  isScreenFlashing,
  stopScreenFlash,
  drawScreenFlash,
} from "./helpers.ts";
