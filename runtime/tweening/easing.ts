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

import type { EasingFunction } from "./types.ts";

// --- Linear ---

/** No easing: constant speed from start to end. */
export const linear: EasingFunction = (t) => t;

// --- Quadratic ---

/** Quadratic ease-in: slow start, accelerating. t^2 curve. */
export const easeInQuad: EasingFunction = (t) => t * t;

/** Quadratic ease-out: fast start, decelerating. Reverse t^2 curve. */
export const easeOutQuad: EasingFunction = (t) => t * (2 - t);

/** Quadratic ease-in-out: slow start and end, fast in the middle. */
export const easeInOutQuad: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// --- Cubic ---

/** Cubic ease-in: slow start with t^3 curve. Slightly more pronounced than quad. */
export const easeInCubic: EasingFunction = (t) => t * t * t;

/** Cubic ease-out: fast start, decelerating with t^3 curve. */
export const easeOutCubic: EasingFunction = (t) => {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
};

/** Cubic ease-in-out: smooth acceleration then deceleration. */
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// --- Quartic ---

/** Quartic ease-in: very slow start with t^4 curve. */
export const easeInQuart: EasingFunction = (t) => t * t * t * t;

/** Quartic ease-out: fast start, strong deceleration. */
export const easeOutQuart: EasingFunction = (t) => {
  const t1 = t - 1;
  return 1 - t1 * t1 * t1 * t1;
};

/** Quartic ease-in-out: pronounced slow start/end, fast middle. */
export const easeInOutQuart: EasingFunction = (t) => {
  if (t < 0.5) {
    return 8 * t * t * t * t;
  }
  const t1 = t - 1;
  return 1 - 8 * t1 * t1 * t1 * t1;
};

// --- Quintic ---

/** Quintic ease-in: very slow start with t^5 curve. Most dramatic polynomial ease-in. */
export const easeInQuint: EasingFunction = (t) => t * t * t * t * t;

/** Quintic ease-out: fast start, very strong deceleration. */
export const easeOutQuint: EasingFunction = (t) => {
  const t1 = t - 1;
  return 1 + t1 * t1 * t1 * t1 * t1;
};

/** Quintic ease-in-out: extremely slow start/end, very fast middle. */
export const easeInOutQuint: EasingFunction = (t) => {
  if (t < 0.5) {
    return 16 * t * t * t * t * t;
  }
  const t1 = t - 1;
  return 1 + 16 * t1 * t1 * t1 * t1 * t1;
};

// --- Sine ---

/** Sine ease-in: gentle slow start following a sine curve. */
export const easeInSine: EasingFunction = (t) =>
  1 - Math.cos((t * Math.PI) / 2);

/** Sine ease-out: gentle deceleration following a sine curve. */
export const easeOutSine: EasingFunction = (t) =>
  Math.sin((t * Math.PI) / 2);

/** Sine ease-in-out: smooth sinusoidal acceleration and deceleration. */
export const easeInOutSine: EasingFunction = (t) =>
  -(Math.cos(Math.PI * t) - 1) / 2;

// --- Exponential ---

/** Exponential ease-in: near-zero at start, rapidly accelerating. Returns 0 when t=0. */
export const easeInExpo: EasingFunction = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);

/** Exponential ease-out: fast start, asymptotically approaching 1. Returns 1 when t=1. */
export const easeOutExpo: EasingFunction = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

/** Exponential ease-in-out: dramatic acceleration/deceleration with near-flat start/end. */
export const easeInOutExpo: EasingFunction = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  if (t < 0.5) {
    return Math.pow(2, 20 * t - 10) / 2;
  }
  return (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// --- Circular ---

/** Circular ease-in: quarter-circle curve, slow start. */
export const easeInCirc: EasingFunction = (t) =>
  1 - Math.sqrt(1 - t * t);

/** Circular ease-out: quarter-circle curve, fast start. */
export const easeOutCirc: EasingFunction = (t) =>
  Math.sqrt(1 - Math.pow(t - 1, 2));

/** Circular ease-in-out: half-circle curve, slow at both ends. */
export const easeInOutCirc: EasingFunction = (t) => {
  if (t < 0.5) {
    return (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2;
  }
  return (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
};

// --- Back ---

/** Back ease-in: pulls back slightly before accelerating forward. Overshoots below 0. */
export const easeInBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

/** Back ease-out: overshoots past 1 then settles back. */
export const easeOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Back ease-in-out: pulls back, accelerates, overshoots, then settles. */
export const easeInOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  if (t < 0.5) {
    return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
  }
  return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};

// --- Elastic ---

/** Elastic ease-in: spring-like oscillation at the start. Overshoots below 0. */
export const easeInElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};

/** Elastic ease-out: spring-like oscillation at the end. Overshoots above 1. */
export const easeOutElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/** Elastic ease-in-out: spring oscillation at both start and end. */
export const easeInOutElastic: EasingFunction = (t) => {
  const c5 = (2 * Math.PI) / 4.5;
  if (t === 0) return 0;
  if (t === 1) return 1;
  if (t < 0.5) {
    return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2;
  }
  return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
};

// --- Bounce ---

/** Bounce ease-out: simulates a ball bouncing to rest. Stays within 0..1. */
export const easeOutBounce: EasingFunction = (t) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    const t2 = t - 1.5 / d1;
    return n1 * t2 * t2 + 0.75;
  } else if (t < 2.5 / d1) {
    const t2 = t - 2.25 / d1;
    return n1 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / d1;
    return n1 * t2 * t2 + 0.984375;
  }
};

/** Bounce ease-in: reverse bouncing at the start. Stays within 0..1. */
export const easeInBounce: EasingFunction = (t) =>
  1 - easeOutBounce(1 - t);

/** Bounce ease-in-out: bouncing at both start and end. */
export const easeInOutBounce: EasingFunction = (t) => {
  if (t < 0.5) {
    return (1 - easeOutBounce(1 - 2 * t)) / 2;
  }
  return (1 + easeOutBounce(2 * t - 1)) / 2;
};

// --- Convenience map ---

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
export const Easing = {
  linear,

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
} as const;
