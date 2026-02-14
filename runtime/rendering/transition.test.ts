import { describe, it, assert } from "../testing/harness.ts";
import {
  startScreenTransition,
  updateScreenTransition,
  drawScreenTransition,
  isScreenTransitionActive,
  getScreenTransitionProgress,
  _resetScreenTransition,
} from "./transition.ts";
import type { ScreenTransitionType } from "./transition.ts";

describe("Screen Transitions", () => {
  // Reset before each test
  function setup() {
    _resetScreenTransition();
  }

  describe("startScreenTransition", () => {
    it("activates transition", () => {
      setup();
      assert.equal(isScreenTransitionActive(), false);
      startScreenTransition("fade", 0.5);
      assert.equal(isScreenTransitionActive(), true);
    });

    it("sets default progress to 0", () => {
      setup();
      startScreenTransition("fade", 1.0);
      // Just started, progress should be near 0
      assert.equal(getScreenTransitionProgress(), 0);
    });
  });

  describe("updateScreenTransition", () => {
    it("advances progress during out phase", () => {
      setup();
      startScreenTransition("fade", 1.0);
      updateScreenTransition(0.25); // half of out phase (0.5s)
      const progress = getScreenTransitionProgress();
      assert.ok(progress > 0.4 && progress < 0.6, `Expected ~0.5, got ${progress}`);
    });

    it("calls midpoint action at halfway", () => {
      setup();
      let called = false;
      startScreenTransition("fade", 1.0, undefined, () => {
        called = true;
      });
      assert.equal(called, false);
      updateScreenTransition(0.5); // exactly half
      assert.equal(called, true);
    });

    it("midpoint is called only once", () => {
      setup();
      let count = 0;
      startScreenTransition("fade", 1.0, undefined, () => {
        count++;
      });
      updateScreenTransition(0.5);
      updateScreenTransition(0.1);
      assert.equal(count, 1);
    });

    it("progress decreases during in phase", () => {
      setup();
      startScreenTransition("fade", 1.0);
      updateScreenTransition(0.5); // midpoint
      updateScreenTransition(0.25); // halfway through in phase
      const progress = getScreenTransitionProgress();
      assert.ok(progress < 0.6, `Expected <0.6, got ${progress}`);
    });

    it("deactivates after full duration", () => {
      setup();
      startScreenTransition("fade", 1.0);
      updateScreenTransition(1.0);
      assert.equal(isScreenTransitionActive(), false);
    });

    it("calls onComplete after full duration", () => {
      setup();
      let completed = false;
      startScreenTransition("fade", 1.0, undefined, undefined, () => {
        completed = true;
      });
      updateScreenTransition(0.5); // midpoint
      assert.equal(completed, false);
      updateScreenTransition(0.5); // end
      assert.equal(completed, true);
    });

    it("no-op when not active", () => {
      setup();
      // Should not throw
      updateScreenTransition(1.0);
      assert.equal(isScreenTransitionActive(), false);
    });
  });

  describe("getScreenTransitionProgress", () => {
    it("returns 0 when not active", () => {
      setup();
      assert.equal(getScreenTransitionProgress(), 0);
    });

    it("reaches 1.0 at midpoint", () => {
      setup();
      startScreenTransition("fade", 1.0);
      updateScreenTransition(0.499); // just before midpoint
      const progress = getScreenTransitionProgress();
      assert.ok(progress > 0.95 && progress <= 1.0, `Expected ~1.0, got ${progress}`);
    });

    it("returns to 0 at end", () => {
      setup();
      startScreenTransition("fade", 0.5);
      updateScreenTransition(0.5);
      assert.equal(getScreenTransitionProgress(), 0);
      assert.equal(isScreenTransitionActive(), false);
    });
  });

  describe("transition types", () => {
    const types: ScreenTransitionType[] = [
      "fade",
      "wipe",
      "circleIris",
      "diamond",
      "pixelate",
    ];

    for (const type of types) {
      it(`${type} transition activates and completes`, () => {
        setup();
        let midpointCalled = false;
        let completeCalled = false;
        startScreenTransition(
          type,
          0.4,
          { color: { r: 1, g: 0, b: 0 } },
          () => { midpointCalled = true; },
          () => { completeCalled = true; },
        );
        assert.equal(isScreenTransitionActive(), true);

        // Advance to midpoint
        updateScreenTransition(0.2);
        assert.equal(midpointCalled, true);

        // Advance to completion
        updateScreenTransition(0.2);
        assert.equal(completeCalled, true);
        assert.equal(isScreenTransitionActive(), false);
      });
    }
  });

  describe("drawScreenTransition", () => {
    it("does not throw when not active", () => {
      setup();
      // Should be a no-op
      drawScreenTransition();
    });

    it("does not throw when active (headless)", () => {
      setup();
      startScreenTransition("fade", 1.0);
      updateScreenTransition(0.25);
      // In headless mode, drawSprite is no-op, so this should not throw
      drawScreenTransition();
    });
  });

  describe("config options", () => {
    it("uses custom color", () => {
      setup();
      startScreenTransition("fade", 0.5, {
        color: { r: 1, g: 0.5, b: 0.2 },
      });
      assert.equal(isScreenTransitionActive(), true);
      updateScreenTransition(0.5);
    });

    it("uses custom layer", () => {
      setup();
      startScreenTransition("fade", 0.5, { layer: 300 });
      assert.equal(isScreenTransitionActive(), true);
    });

    it("handles very short duration", () => {
      setup();
      let mid = false;
      let done = false;
      startScreenTransition("fade", 0.01, undefined, () => { mid = true; }, () => { done = true; });
      updateScreenTransition(0.01);
      assert.equal(mid, true);
      assert.equal(done, true);
    });
  });

  describe("_resetScreenTransition", () => {
    it("clears active transition", () => {
      startScreenTransition("wipe", 1.0);
      assert.equal(isScreenTransitionActive(), true);
      _resetScreenTransition();
      assert.equal(isScreenTransitionActive(), false);
      assert.equal(getScreenTransitionProgress(), 0);
    });
  });
});
