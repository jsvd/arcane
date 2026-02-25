import { describe, it, assert } from "../testing/harness.ts";
import {
  outline,
  flash,
  dissolve,
  pixelate,
  hologram,
  water,
  glow,
  grayscale,
} from "./effects.ts";
import type { ShaderEffect } from "./effects.ts";

describe("Effect Presets", () => {
  describe("outline", () => {
    it("creates without error", () => {
      const effect = outline();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = outline({ color: [1, 0, 0, 1], width: 2.0 });
      assert.ok(effect.shaderId !== undefined);
    });
    it("set() does not throw", () => {
      const effect = outline();
      effect.set("outlineColor", 0, 1, 0, 1);
      effect.set("outlineWidth", 3.0);
    });
  });

  describe("flash", () => {
    it("creates without error", () => {
      const effect = flash();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = flash({ color: [1, 0, 0], intensity: 0.5 });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("dissolve", () => {
    it("creates without error", () => {
      const effect = dissolve();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("set threshold works", () => {
      const effect = dissolve();
      effect.set("threshold", 0.5);
    });
  });

  describe("pixelate", () => {
    it("creates without error", () => {
      const effect = pixelate();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom pixel size", () => {
      const effect = pixelate({ pixelSize: 16.0 });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("hologram", () => {
    it("creates without error", () => {
      const effect = hologram();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = hologram({
        speed: 3.0,
        lineSpacing: 200,
        aberration: 0.01,
      });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("water", () => {
    it("creates without error", () => {
      const effect = water();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("set works for all uniforms", () => {
      const effect = water();
      effect.set("amplitude", 0.05);
      effect.set("frequency", 20.0);
      effect.set("speed", 3.0);
    });
  });

  describe("glow", () => {
    it("creates without error", () => {
      const effect = glow();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = glow({ color: [0, 1, 0], radius: 5.0, intensity: 2.0 });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("grayscale", () => {
    it("creates without error", () => {
      const effect = grayscale();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom amount", () => {
      const effect = grayscale({ amount: 0.5 });
      assert.ok(effect.shaderId !== undefined);
    });
    it("set() works", () => {
      const effect = grayscale();
      effect.set("amount", 0.75);
    });
  });

  describe("ShaderEffect interface", () => {
    it("all presets have shaderId and set()", () => {
      const effects: ShaderEffect[] = [
        outline(),
        flash(),
        dissolve(),
        pixelate(),
        hologram(),
        water(),
        glow(),
        grayscale(),
      ];
      for (const effect of effects) {
        assert.equal(typeof effect.shaderId, "number");
        assert.equal(typeof effect.set, "function");
      }
    });
  });
});
