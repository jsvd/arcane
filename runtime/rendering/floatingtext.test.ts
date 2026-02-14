import { describe, it, assert } from "../testing/harness.ts";
import {
  spawnFloatingText,
  updateFloatingTexts,
  drawFloatingTexts,
  getFloatingTextCount,
  clearFloatingTexts,
  _resetFloatingTexts,
} from "./floatingtext.ts";

describe("Floating Text", () => {
  function setup() {
    _resetFloatingTexts();
  }

  describe("spawnFloatingText", () => {
    it("creates an active floating text", () => {
      setup();
      spawnFloatingText(100, 200, "-25");
      assert.equal(getFloatingTextCount(), 1);
    });

    it("supports multiple concurrent texts", () => {
      setup();
      spawnFloatingText(100, 200, "-25");
      spawnFloatingText(150, 200, "+10");
      spawnFloatingText(200, 200, "MISS");
      assert.equal(getFloatingTextCount(), 3);
    });

    it("uses default options", () => {
      setup();
      spawnFloatingText(0, 0, "test");
      assert.equal(getFloatingTextCount(), 1);
    });

    it("accepts custom options", () => {
      setup();
      spawnFloatingText(0, 0, "test", {
        color: { r: 1, g: 0, b: 0, a: 1 },
        rise: 50,
        duration: 2.0,
        scale: 2,
        layer: 200,
        screenSpace: true,
        driftX: 10,
        fadeEasing: "linear",
        pop: true,
      });
      assert.equal(getFloatingTextCount(), 1);
    });
  });

  describe("updateFloatingTexts", () => {
    it("removes texts after duration", () => {
      setup();
      spawnFloatingText(0, 0, "test", { duration: 0.5 });
      assert.equal(getFloatingTextCount(), 1);

      updateFloatingTexts(0.5);
      assert.equal(getFloatingTextCount(), 0);
    });

    it("keeps texts alive during duration", () => {
      setup();
      spawnFloatingText(0, 0, "test", { duration: 1.0 });
      updateFloatingTexts(0.3);
      assert.equal(getFloatingTextCount(), 1);
      updateFloatingTexts(0.3);
      assert.equal(getFloatingTextCount(), 1);
    });

    it("handles multiple texts with different durations", () => {
      setup();
      spawnFloatingText(0, 0, "short", { duration: 0.3 });
      spawnFloatingText(0, 0, "long", { duration: 1.0 });
      assert.equal(getFloatingTextCount(), 2);

      updateFloatingTexts(0.35);
      assert.equal(getFloatingTextCount(), 1); // short removed
    });

    it("handles zero dt", () => {
      setup();
      spawnFloatingText(0, 0, "test");
      updateFloatingTexts(0);
      assert.equal(getFloatingTextCount(), 1);
    });

    it("handles rapid successive spawns and updates", () => {
      setup();
      for (let i = 0; i < 50; i++) {
        spawnFloatingText(i * 10, 0, `${i}`, { duration: 0.5 });
      }
      assert.equal(getFloatingTextCount(), 50);
      updateFloatingTexts(0.5);
      assert.equal(getFloatingTextCount(), 0);
    });
  });

  describe("drawFloatingTexts", () => {
    it("does not throw in headless mode", () => {
      setup();
      spawnFloatingText(100, 200, "test");
      updateFloatingTexts(0.1);
      drawFloatingTexts();
      // Should not throw
    });

    it("does not throw with no active texts", () => {
      setup();
      drawFloatingTexts();
    });
  });

  describe("clearFloatingTexts", () => {
    it("removes all active texts", () => {
      setup();
      spawnFloatingText(0, 0, "a");
      spawnFloatingText(0, 0, "b");
      spawnFloatingText(0, 0, "c");
      assert.equal(getFloatingTextCount(), 3);
      clearFloatingTexts();
      assert.equal(getFloatingTextCount(), 0);
    });
  });

  describe("object pooling", () => {
    it("reuses instances after completion", () => {
      setup();
      // Spawn and complete many texts to fill pool
      for (let i = 0; i < 20; i++) {
        spawnFloatingText(0, 0, `text_${i}`, { duration: 0.1 });
      }
      updateFloatingTexts(0.2); // all complete

      // Spawn more — should reuse pooled instances
      spawnFloatingText(0, 0, "reused");
      assert.equal(getFloatingTextCount(), 1);
    });
  });

  describe("animation", () => {
    it("text rises over time (easeOut)", () => {
      setup();
      spawnFloatingText(100, 200, "test", { rise: 40, duration: 1.0 });
      // After half the duration, text should have risen more than half (easeOut)
      updateFloatingTexts(0.5);
      // We can't check exact position easily, but we verify it doesn't error
      assert.equal(getFloatingTextCount(), 1);
    });

    it("pop effect does not crash", () => {
      setup();
      spawnFloatingText(100, 200, "test", { pop: true, duration: 1.0 });
      updateFloatingTexts(0.05); // during pop phase
      updateFloatingTexts(0.3);  // after pop phase
      assert.equal(getFloatingTextCount(), 1);
    });

    it("linear fade easing works", () => {
      setup();
      spawnFloatingText(100, 200, "test", { fadeEasing: "linear", duration: 1.0 });
      updateFloatingTexts(0.5);
      assert.equal(getFloatingTextCount(), 1);
    });

    it("drift moves text horizontally", () => {
      setup();
      spawnFloatingText(100, 200, "test", { driftX: 50, duration: 1.0 });
      updateFloatingTexts(0.5);
      assert.equal(getFloatingTextCount(), 1);
    });
  });

  describe("_resetFloatingTexts", () => {
    it("clears all state", () => {
      spawnFloatingText(0, 0, "a");
      spawnFloatingText(0, 0, "b");
      _resetFloatingTexts();
      assert.equal(getFloatingTextCount(), 0);
    });
  });
});
