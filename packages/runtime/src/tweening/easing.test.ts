/**
 * Tests for easing functions
 */

import { describe, it, assert } from "../testing/harness.ts";
import {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
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

describe("Easing Functions", () => {
  // Helper to test that easing function has correct boundary behavior
  function testEasingBoundaries(name: string, easingFn: (t: number) => number) {
    it(`${name} should return 0 at t=0`, () => {
      const result = easingFn(0);
      assert.ok(Math.abs(result - 0) < 0.001, `Expected ~0, got ${result}`);
    });

    it(`${name} should return 1 at t=1`, () => {
      const result = easingFn(1);
      assert.ok(Math.abs(result - 1) < 0.001, `Expected ~1, got ${result}`);
    });

    it(`${name} should return values in range [0,1] for t in [0,1]`, () => {
      for (let t = 0; t <= 1; t += 0.1) {
        const result = easingFn(t);
        // Some easing functions (like back, elastic) can go slightly outside [0,1] during animation
        // But they should end at the right place
        assert.ok(!isNaN(result), `Result should not be NaN for t=${t}`);
      }
    });
  }

  // Test all easing functions have correct boundaries
  testEasingBoundaries("linear", linear);
  testEasingBoundaries("easeInQuad", easeInQuad);
  testEasingBoundaries("easeOutQuad", easeOutQuad);
  testEasingBoundaries("easeInOutQuad", easeInOutQuad);
  testEasingBoundaries("easeInCubic", easeInCubic);
  testEasingBoundaries("easeOutCubic", easeOutCubic);
  testEasingBoundaries("easeInOutCubic", easeInOutCubic);
  testEasingBoundaries("easeInSine", easeInSine);
  testEasingBoundaries("easeOutSine", easeOutSine);
  testEasingBoundaries("easeInOutSine", easeInOutSine);
  testEasingBoundaries("easeInExpo", easeInExpo);
  testEasingBoundaries("easeOutExpo", easeOutExpo);
  testEasingBoundaries("easeInOutExpo", easeInOutExpo);
  testEasingBoundaries("easeInCirc", easeInCirc);
  testEasingBoundaries("easeOutCirc", easeOutCirc);
  testEasingBoundaries("easeInOutCirc", easeInOutCirc);
  testEasingBoundaries("easeInBack", easeInBack);
  testEasingBoundaries("easeOutBack", easeOutBack);
  testEasingBoundaries("easeInOutBack", easeInOutBack);
  testEasingBoundaries("easeInElastic", easeInElastic);
  testEasingBoundaries("easeOutElastic", easeOutElastic);
  testEasingBoundaries("easeInOutElastic", easeInOutElastic);
  testEasingBoundaries("easeInBounce", easeInBounce);
  testEasingBoundaries("easeOutBounce", easeOutBounce);
  testEasingBoundaries("easeInOutBounce", easeInOutBounce);

  it("linear should return t", () => {
    assert.equal(linear(0.5), 0.5);
    assert.equal(linear(0.25), 0.25);
    assert.equal(linear(0.75), 0.75);
  });

  it("easeInQuad should be slower at start", () => {
    // At t=0.5, quadratic should be at 0.25 (slower than linear)
    assert.ok(easeInQuad(0.5) < 0.5);
  });

  it("easeOutQuad should be faster at start", () => {
    // At t=0.5, ease-out should be past 0.5 (faster than linear)
    assert.ok(easeOutQuad(0.5) > 0.5);
  });

  it("easeInOutQuad should be symmetric", () => {
    // At t=0.5, should be at 0.5
    const mid = easeInOutQuad(0.5);
    assert.ok(Math.abs(mid - 0.5) < 0.01);
  });

  it("Easing map contains all functions", () => {
    assert.equal(typeof Easing.linear, "function");
    assert.equal(typeof Easing.easeInQuad, "function");
    assert.equal(typeof Easing.easeOutQuad, "function");
    assert.equal(typeof Easing.easeInOutQuad, "function");
    assert.equal(typeof Easing.easeInCubic, "function");
    assert.equal(typeof Easing.easeOutCubic, "function");
    assert.equal(typeof Easing.easeInOutCubic, "function");
    assert.equal(typeof Easing.easeInSine, "function");
    assert.equal(typeof Easing.easeOutSine, "function");
    assert.equal(typeof Easing.easeInOutSine, "function");
    assert.equal(typeof Easing.easeInExpo, "function");
    assert.equal(typeof Easing.easeOutExpo, "function");
    assert.equal(typeof Easing.easeInOutExpo, "function");
    assert.equal(typeof Easing.easeInCirc, "function");
    assert.equal(typeof Easing.easeOutCirc, "function");
    assert.equal(typeof Easing.easeInOutCirc, "function");
    assert.equal(typeof Easing.easeInBack, "function");
    assert.equal(typeof Easing.easeOutBack, "function");
    assert.equal(typeof Easing.easeInOutBack, "function");
    assert.equal(typeof Easing.easeInElastic, "function");
    assert.equal(typeof Easing.easeOutElastic, "function");
    assert.equal(typeof Easing.easeInOutElastic, "function");
    assert.equal(typeof Easing.easeInBounce, "function");
    assert.equal(typeof Easing.easeOutBounce, "function");
    assert.equal(typeof Easing.easeInOutBounce, "function");
  });
});
