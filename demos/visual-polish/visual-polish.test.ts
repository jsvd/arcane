/**
 * Tests for Phase 22-23 Visual Polish features.
 * Validates that all new APIs work correctly in headless mode.
 */

// Type-check guard: ensures the visual entry point compiles (catches broken imports)
import "./visual-polish.ts";

import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../../runtime/testing/visual.ts";

// Phase 22: Screen Transitions
import {
  startScreenTransition,
  updateScreenTransition,
  isScreenTransitionActive,
  getScreenTransitionProgress,
  _resetScreenTransition,
} from "../../runtime/rendering/transition.ts";

// Phase 22: Nine-Slice
import {
  drawNineSlice,
  getNineSliceSpriteCount,
} from "../../runtime/rendering/nineslice.ts";

// Phase 22: Trail
import {
  createTrail,
  updateTrail,
  drawTrail,
  clearTrail,
  getTrailPointCount,
} from "../../runtime/rendering/trail.ts";

// Phase 23: Juice
import {
  impact,
  hitstop,
  isHitstopActive,
  consumeHitstopFrame,
  _resetJuice,
} from "../../runtime/rendering/juice.ts";
import { stopCameraShake, isCameraShaking } from "../../runtime/tweening/helpers.ts";
import { stopScreenFlash, isScreenFlashing } from "../../runtime/tweening/helpers.ts";

// Phase 23: Floating Text
import {
  spawnFloatingText,
  updateFloatingTexts,
  drawFloatingTexts,
  getFloatingTextCount,
  clearFloatingTexts,
  _resetFloatingTexts,
} from "../../runtime/rendering/floatingtext.ts";

// Phase 23: Typewriter
import {
  createTypewriter,
  updateTypewriter,
  skipTypewriter,
  getVisibleText,
  isTypewriterComplete,
  resetTypewriter,
} from "../../runtime/rendering/typewriter.ts";

// Phase 23: Shadows
import { drawSprite } from "../../runtime/rendering/sprites.ts";

describe("Visual Polish Demo Integration", () => {
  describe("Screen Transitions lifecycle", () => {
    it("fade transition completes with midpoint action", () => {
      _resetScreenTransition();
      let sceneSwitched = false;
      startScreenTransition("fade", 0.5, undefined, () => {
        sceneSwitched = true;
      });
      assert.equal(isScreenTransitionActive(), true);
      updateScreenTransition(0.25);
      assert.equal(sceneSwitched, true);
      updateScreenTransition(0.25);
      assert.equal(isScreenTransitionActive(), false);
    });

    it("all 5 transition types work", () => {
      const types = ["fade", "wipe", "circleIris", "diamond", "pixelate"] as const;
      for (const type of types) {
        _resetScreenTransition();
        startScreenTransition(type, 0.4);
        updateScreenTransition(0.4);
        assert.equal(isScreenTransitionActive(), false);
      }
    });
  });

  describe("Nine-slice panel rendering", () => {
    it("draws a 9-piece panel", () => {
      enableDrawCallCapture();
      clearDrawCalls();
      drawNineSlice(1, 50, 50, 200, 100, {
        border: 16,
        layer: 80,
        textureWidth: 64,
        textureHeight: 64,
      });
      assert.equal(getDrawCalls().length, 9);
      disableDrawCallCapture();
    });
  });

  describe("Trail renderer workflow", () => {
    it("creates trail, adds points, draws segments", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0, 0.01);
      updateTrail(trail, 50, 0, 0.01);
      updateTrail(trail, 100, 50, 0.01);

      assert.equal(getTrailPointCount(trail), 3);

      drawTrail(trail);
      assert.equal(getDrawCalls().length, 2); // 3 points = 2 segments

      clearTrail(trail);
      assert.equal(getTrailPointCount(trail), 0);

      disableDrawCallCapture();
    });
  });

  describe("Impact combinator full test", () => {
    it("orchestrates shake + hitstop + flash", () => {
      _resetJuice();
      stopCameraShake();
      stopScreenFlash();

      impact(100, 100, {
        shake: { intensity: 8, duration: 0.2 },
        hitstop: 3,
        flash: { r: 1, g: 0.8, b: 0.3, duration: 0.1 },
        particles: true,
      });

      assert.equal(isCameraShaking(), true);
      assert.equal(isHitstopActive(), true);
      assert.equal(isScreenFlashing(), true);

      // Consume hitstop frames
      assert.equal(consumeHitstopFrame(), true);
      assert.equal(consumeHitstopFrame(), true);
      assert.equal(consumeHitstopFrame(), true);
      assert.equal(isHitstopActive(), false);
    });
  });

  describe("Floating text damage numbers", () => {
    it("spawns, animates, and auto-removes", () => {
      _resetFloatingTexts();
      spawnFloatingText(100, 200, "-25", {
        color: { r: 1, g: 0, b: 0, a: 1 },
        duration: 0.5,
        pop: true,
      });
      spawnFloatingText(150, 200, "+10", {
        color: { r: 0, g: 1, b: 0, a: 1 },
        duration: 0.3,
      });
      assert.equal(getFloatingTextCount(), 2);

      updateFloatingTexts(0.35);
      assert.equal(getFloatingTextCount(), 1); // "+10" expired

      updateFloatingTexts(0.2);
      assert.equal(getFloatingTextCount(), 0); // "-25" expired
    });
  });

  describe("Typewriter dialogue system", () => {
    it("progressively reveals text and supports skip", () => {
      const tw = createTypewriter("Hello, world!", {
        speed: 10,
        punctuationPause: 0.2,
      });
      assert.equal(getVisibleText(tw), "");

      updateTypewriter(tw, 0.15);
      assert.ok(getVisibleText(tw).length > 0);
      assert.equal(isTypewriterComplete(tw), false);

      skipTypewriter(tw);
      assert.equal(getVisibleText(tw), "Hello, world!");
      assert.equal(isTypewriterComplete(tw), true);

      resetTypewriter(tw, "New dialogue.");
      assert.equal(getVisibleText(tw), "");
      assert.equal(isTypewriterComplete(tw), false);
    });
  });

  describe("Sprite shadows", () => {
    it("draws shadow sprite below main sprite", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({
        textureId: 1,
        x: 100,
        y: 100,
        w: 32,
        h: 32,
        layer: 5,
        shadow: { offsetX: 3, offsetY: 6, scaleY: 0.4 },
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 2);
      // Shadow at layer 4, main at layer 5
      assert.equal((calls[0] as any).layer, 4);
      assert.equal((calls[1] as any).layer, 5);

      disableDrawCallCapture();
    });
  });
});
