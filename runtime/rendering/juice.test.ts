import { describe, it, assert } from "../testing/harness.ts";
import {
  impact,
  impactLight,
  impactHeavy,
  hitstop,
  isHitstopActive,
  getHitstopFrames,
  _consumeHitstopFrame,
  _resetJuice,
} from "./juice.ts";
import { isCameraShaking, stopCameraShake } from "../tweening/helpers.ts";
import { isScreenFlashing, stopScreenFlash } from "../tweening/helpers.ts";

describe("Juice & Game Feel", () => {
  function setup() {
    _resetJuice();
    stopCameraShake();
    stopScreenFlash();
  }

  describe("hitstop", () => {
    it("starts inactive by default", () => {
      setup();
      assert.equal(isHitstopActive(), false);
      assert.equal(getHitstopFrames(), 0);
    });

    it("activates with specified frames", () => {
      setup();
      hitstop(5);
      assert.equal(isHitstopActive(), true);
      assert.equal(getHitstopFrames(), 5);
    });

    it("_consumeHitstopFrame decrements", () => {
      setup();
      hitstop(3);
      assert.equal(_consumeHitstopFrame(), true);
      assert.equal(getHitstopFrames(), 2);
      assert.equal(_consumeHitstopFrame(), true);
      assert.equal(getHitstopFrames(), 1);
      assert.equal(_consumeHitstopFrame(), true);
      assert.equal(getHitstopFrames(), 0);
      assert.equal(isHitstopActive(), false);
    });

    it("_consumeHitstopFrame returns false when not active", () => {
      setup();
      assert.equal(_consumeHitstopFrame(), false);
    });

    it("takes maximum of current and new hitstop", () => {
      setup();
      hitstop(3);
      hitstop(10);
      assert.equal(getHitstopFrames(), 10);
    });

    it("does not reduce existing hitstop", () => {
      setup();
      hitstop(10);
      hitstop(3);
      assert.equal(getHitstopFrames(), 10);
    });

    it("rounds fractional frames", () => {
      setup();
      hitstop(2.7);
      assert.equal(getHitstopFrames(), 3);
    });
  });

  describe("impact", () => {
    it("triggers camera shake", () => {
      setup();
      impact(100, 100, {
        shake: { intensity: 8, duration: 0.2 },
      });
      assert.equal(isCameraShaking(), true);
    });

    it("triggers shake with boolean shorthand", () => {
      setup();
      impact(100, 100, { shake: true });
      assert.equal(isCameraShaking(), true);
    });

    it("triggers screen flash", () => {
      setup();
      impact(100, 100, {
        flash: { r: 1, g: 0, b: 0, duration: 0.2 },
      });
      assert.equal(isScreenFlashing(), true);
    });

    it("triggers flash with boolean shorthand", () => {
      setup();
      impact(100, 100, { flash: true });
      assert.equal(isScreenFlashing(), true);
    });

    it("triggers hitstop", () => {
      setup();
      impact(100, 100, { hitstop: 5 });
      assert.equal(isHitstopActive(), true);
      assert.equal(getHitstopFrames(), 5);
    });

    it("triggers particles without error", () => {
      setup();
      // In headless mode, spawnEmitter will run but particles won't render
      impact(100, 100, {
        particles: { count: 20, color: { r: 1, g: 0, b: 0, a: 1 } },
      });
      // Should not throw
    });

    it("triggers particles with boolean shorthand", () => {
      setup();
      impact(100, 100, { particles: true });
      // Should not throw
    });

    it("handles empty config", () => {
      setup();
      impact(100, 100, {});
      assert.equal(isHitstopActive(), false);
      assert.equal(isCameraShaking(), false);
    });

    it("combines multiple effects", () => {
      setup();
      impact(100, 100, {
        shake: { intensity: 6, duration: 0.15 },
        hitstop: 3,
        flash: { r: 1, g: 1, b: 1, duration: 0.1 },
        particles: true,
      });
      assert.equal(isCameraShaking(), true);
      assert.equal(isHitstopActive(), true);
      assert.equal(isScreenFlashing(), true);
    });

    it("does not trigger sound in headless", () => {
      setup();
      // Should not throw even with sound config
      impact(100, 100, {
        sound: { soundId: 1, volume: 0.5 },
      });
    });
  });

  describe("presets", () => {
    it("impactLight triggers shake and flash", () => {
      setup();
      impactLight(50, 50);
      assert.equal(isCameraShaking(), true);
      assert.equal(isScreenFlashing(), true);
      assert.equal(isHitstopActive(), true);
      assert.equal(getHitstopFrames(), 2);
    });

    it("impactHeavy triggers stronger effects", () => {
      setup();
      impactHeavy(50, 50);
      assert.equal(isCameraShaking(), true);
      assert.equal(isScreenFlashing(), true);
      assert.equal(isHitstopActive(), true);
      assert.equal(getHitstopFrames(), 5);
    });
  });

  describe("_resetJuice", () => {
    it("clears hitstop state", () => {
      hitstop(10);
      assert.equal(isHitstopActive(), true);
      _resetJuice();
      assert.equal(isHitstopActive(), false);
    });
  });
});
