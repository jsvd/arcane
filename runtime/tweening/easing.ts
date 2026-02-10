/**
 * Easing functions for tweens
 *
 * All functions take t (0 to 1) and return eased value (0 to 1).
 * Based on https://easings.net/ and Robert Penner's easing equations.
 */

import type { EasingFunction } from "./types.ts";

// --- Linear ---

export const linear: EasingFunction = (t) => t;

// --- Quadratic ---

export const easeInQuad: EasingFunction = (t) => t * t;

export const easeOutQuad: EasingFunction = (t) => t * (2 - t);

export const easeInOutQuad: EasingFunction = (t) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

// --- Cubic ---

export const easeInCubic: EasingFunction = (t) => t * t * t;

export const easeOutCubic: EasingFunction = (t) => {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
};

export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// --- Quartic ---

export const easeInQuart: EasingFunction = (t) => t * t * t * t;

export const easeOutQuart: EasingFunction = (t) => {
  const t1 = t - 1;
  return 1 - t1 * t1 * t1 * t1;
};

export const easeInOutQuart: EasingFunction = (t) => {
  if (t < 0.5) {
    return 8 * t * t * t * t;
  }
  const t1 = t - 1;
  return 1 - 8 * t1 * t1 * t1 * t1;
};

// --- Quintic ---

export const easeInQuint: EasingFunction = (t) => t * t * t * t * t;

export const easeOutQuint: EasingFunction = (t) => {
  const t1 = t - 1;
  return 1 + t1 * t1 * t1 * t1 * t1;
};

export const easeInOutQuint: EasingFunction = (t) => {
  if (t < 0.5) {
    return 16 * t * t * t * t * t;
  }
  const t1 = t - 1;
  return 1 + 16 * t1 * t1 * t1 * t1 * t1;
};

// --- Sine ---

export const easeInSine: EasingFunction = (t) =>
  1 - Math.cos((t * Math.PI) / 2);

export const easeOutSine: EasingFunction = (t) =>
  Math.sin((t * Math.PI) / 2);

export const easeInOutSine: EasingFunction = (t) =>
  -(Math.cos(Math.PI * t) - 1) / 2;

// --- Exponential ---

export const easeInExpo: EasingFunction = (t) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10);

export const easeOutExpo: EasingFunction = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export const easeInOutExpo: EasingFunction = (t) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  if (t < 0.5) {
    return Math.pow(2, 20 * t - 10) / 2;
  }
  return (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// --- Circular ---

export const easeInCirc: EasingFunction = (t) =>
  1 - Math.sqrt(1 - t * t);

export const easeOutCirc: EasingFunction = (t) =>
  Math.sqrt(1 - Math.pow(t - 1, 2));

export const easeInOutCirc: EasingFunction = (t) => {
  if (t < 0.5) {
    return (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2;
  }
  return (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
};

// --- Back ---

export const easeInBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

export const easeOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeInOutBack: EasingFunction = (t) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  if (t < 0.5) {
    return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
  }
  return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};

// --- Elastic ---

export const easeInElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
};

export const easeOutElastic: EasingFunction = (t) => {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

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

export const easeInBounce: EasingFunction = (t) =>
  1 - easeOutBounce(1 - t);

export const easeInOutBounce: EasingFunction = (t) => {
  if (t < 0.5) {
    return (1 - easeOutBounce(1 - 2 * t)) / 2;
  }
  return (1 + easeOutBounce(2 * t - 1)) / 2;
};

// --- Convenience map ---

/**
 * All easing functions by name
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
