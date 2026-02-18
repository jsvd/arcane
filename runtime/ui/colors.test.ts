/**
 * Tests for color utility functions (setAlpha, setRgb, lerpColorInto).
 */

import { describe, it, assert } from "../testing/harness.ts";
import { withAlpha, setAlpha, setRgb, lerpColorInto, lighten, darken } from "./colors.ts";
import type { Color } from "./types.ts";

describe("Color utilities", () => {
  describe("setAlpha", () => {
    it("should mutate color alpha in place", () => {
      const color: Color = { r: 1, g: 0.5, b: 0, a: 1 };
      const result = setAlpha(color, 0.3);
      assert.equal(color.a, 0.3);
      assert.equal(result, color); // same reference
    });

    it("should preserve RGB channels", () => {
      const color: Color = { r: 0.2, g: 0.4, b: 0.6, a: 1 };
      setAlpha(color, 0.5);
      assert.equal(color.r, 0.2);
      assert.equal(color.g, 0.4);
      assert.equal(color.b, 0.6);
    });

    it("should allow chaining", () => {
      const color: Color = { r: 1, g: 1, b: 1, a: 1 };
      const result = setAlpha(color, 0.5);
      assert.equal(result.a, 0.5);
      assert.equal(result.r, 1);
    });
  });

  describe("setRgb", () => {
    it("should mutate RGB in place", () => {
      const color: Color = { r: 0, g: 0, b: 0, a: 0.8 };
      const result = setRgb(color, 1, 0.5, 0.25);
      assert.equal(color.r, 1);
      assert.equal(color.g, 0.5);
      assert.equal(color.b, 0.25);
      assert.equal(result, color); // same reference
    });

    it("should preserve alpha channel", () => {
      const color: Color = { r: 0, g: 0, b: 0, a: 0.7 };
      setRgb(color, 1, 1, 1);
      assert.equal(color.a, 0.7);
    });

    it("should return the same object for chaining", () => {
      const color: Color = { r: 0, g: 0, b: 0, a: 1 };
      const chained = setRgb(color, 0.1, 0.2, 0.3);
      assert.equal(chained, color);
    });
  });

  describe("lerpColorInto", () => {
    it("should write lerped values into target", () => {
      const target: Color = { r: 0, g: 0, b: 0, a: 0 };
      const start: Color = { r: 1, g: 0, b: 0, a: 1 };
      const end: Color = { r: 0, g: 1, b: 0, a: 0 };

      const result = lerpColorInto(target, start, end, 0.5);

      assert.ok(Math.abs(target.r - 0.5) < 0.001);
      assert.ok(Math.abs(target.g - 0.5) < 0.001);
      assert.ok(Math.abs(target.b - 0) < 0.001);
      assert.ok(Math.abs(target.a - 0.5) < 0.001);
      assert.equal(result, target); // same reference
    });

    it("should return start color at t=0", () => {
      const target: Color = { r: 0, g: 0, b: 0, a: 0 };
      const start: Color = { r: 0.2, g: 0.4, b: 0.6, a: 0.8 };
      const end: Color = { r: 1, g: 1, b: 1, a: 1 };

      lerpColorInto(target, start, end, 0);

      assert.ok(Math.abs(target.r - 0.2) < 0.001);
      assert.ok(Math.abs(target.g - 0.4) < 0.001);
      assert.ok(Math.abs(target.b - 0.6) < 0.001);
      assert.ok(Math.abs(target.a - 0.8) < 0.001);
    });

    it("should return end color at t=1", () => {
      const target: Color = { r: 0, g: 0, b: 0, a: 0 };
      const start: Color = { r: 0, g: 0, b: 0, a: 0 };
      const end: Color = { r: 0.3, g: 0.6, b: 0.9, a: 1 };

      lerpColorInto(target, start, end, 1);

      assert.ok(Math.abs(target.r - 0.3) < 0.001);
      assert.ok(Math.abs(target.g - 0.6) < 0.001);
      assert.ok(Math.abs(target.b - 0.9) < 0.001);
      assert.ok(Math.abs(target.a - 1) < 0.001);
    });

    it("should not allocate a new object", () => {
      const target: Color = { r: 0, g: 0, b: 0, a: 0 };
      const start: Color = { r: 1, g: 0, b: 0, a: 1 };
      const end: Color = { r: 0, g: 1, b: 0, a: 0 };

      // Call multiple times — same target reference should persist
      for (let i = 0; i < 100; i++) {
        const result = lerpColorInto(target, start, end, i / 100);
        assert.equal(result, target);
      }
    });

    it("should not modify start or end colors", () => {
      const target: Color = { r: 0, g: 0, b: 0, a: 0 };
      const start: Color = { r: 1, g: 0, b: 0, a: 1 };
      const end: Color = { r: 0, g: 1, b: 0, a: 0 };

      lerpColorInto(target, start, end, 0.5);

      assert.equal(start.r, 1);
      assert.equal(start.g, 0);
      assert.equal(end.r, 0);
      assert.equal(end.g, 1);
    });
  });

  describe("withAlpha (non-mutating)", () => {
    it("should create a new object", () => {
      const original: Color = { r: 1, g: 0, b: 0, a: 1 };
      const result = withAlpha(original, 0.5);
      assert.ok(result !== original);
      assert.equal(original.a, 1); // unchanged
      assert.equal(result.a, 0.5);
    });
  });
});
