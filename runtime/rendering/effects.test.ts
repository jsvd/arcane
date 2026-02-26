import { describe, it, assert } from "../testing/harness.ts";
import {
  outlineEffect,
  flashEffect,
  dissolveEffect,
  pixelateEffect,
  hologramEffect,
  waterEffect,
  glowEffect,
  grayscaleEffect,
} from "./effects.ts";
import type { ShaderEffect } from "./effects.ts";

describe("Effect Presets", () => {
  describe("outline", () => {
    it("creates without error", () => {
      const effect = outlineEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = outlineEffect({ color: [1, 0, 0, 1], width: 2.0 });
      assert.ok(effect.shaderId !== undefined);
    });
    it("set() does not throw", () => {
      const effect = outlineEffect();
      effect.set("outlineColor", 0, 1, 0, 1);
      effect.set("outlineWidth", 3.0);
    });
  });

  describe("flash", () => {
    it("creates without error", () => {
      const effect = flashEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = flashEffect({ color: [1, 0, 0], intensity: 0.5 });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("dissolve", () => {
    it("creates without error", () => {
      const effect = dissolveEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("set threshold works", () => {
      const effect = dissolveEffect();
      effect.set("threshold", 0.5);
    });
  });

  describe("pixelate", () => {
    it("creates without error", () => {
      const effect = pixelateEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom pixel size", () => {
      const effect = pixelateEffect({ pixelSize: 16.0 });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("hologram", () => {
    it("creates without error", () => {
      const effect = hologramEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = hologramEffect({
        speed: 3.0,
        lineSpacing: 200,
        aberration: 0.01,
      });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("water", () => {
    it("creates without error", () => {
      const effect = waterEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("set works for all uniforms", () => {
      const effect = waterEffect();
      effect.set("amplitude", 0.05);
      effect.set("frequency", 20.0);
      effect.set("speed", 3.0);
    });
  });

  describe("glow", () => {
    it("creates without error", () => {
      const effect = glowEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom options", () => {
      const effect = glowEffect({ color: [0, 1, 0], radius: 5.0, intensity: 2.0 });
      assert.ok(effect.shaderId !== undefined);
    });
  });

  describe("grayscale", () => {
    it("creates without error", () => {
      const effect = grayscaleEffect();
      assert.equal(typeof effect.shaderId, "number");
    });
    it("accepts custom amount", () => {
      const effect = grayscaleEffect({ amount: 0.5 });
      assert.ok(effect.shaderId !== undefined);
    });
    it("set() works", () => {
      const effect = grayscaleEffect();
      effect.set("amount", 0.75);
    });
  });

  describe("ShaderEffect interface", () => {
    it("all presets have shaderId and set()", () => {
      const effects: ShaderEffect[] = [
        outlineEffect(),
        flashEffect(),
        dissolveEffect(),
        pixelateEffect(),
        hologramEffect(),
        waterEffect(),
        glowEffect(),
        grayscaleEffect(),
      ];
      for (const effect of effects) {
        assert.equal(typeof effect.shaderId, "number");
        assert.equal(typeof effect.set, "function");
      }
    });
  });
});
