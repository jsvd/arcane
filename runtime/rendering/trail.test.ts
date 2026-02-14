import { describe, it, assert } from "../testing/harness.ts";
import {
  createTrail,
  updateTrail,
  drawTrail,
  clearTrail,
  pauseTrail,
  resumeTrail,
  getTrailPointCount,
} from "./trail.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("Trail Renderer", () => {
  describe("createTrail", () => {
    it("creates trail with default config", () => {
      const trail = createTrail();
      assert.equal(trail.config.maxLength, 30);
      assert.equal(trail.config.width, 8);
      assert.equal(trail.config.maxAge, 1.0);
      assert.equal(trail.config.layer, 0);
      assert.equal(trail.config.blendMode, "alpha");
      assert.equal(trail.config.minDistance, 2);
      assert.equal(trail.active, true);
      assert.equal(trail.points.length, 0);
    });

    it("creates trail with custom config", () => {
      const trail = createTrail({
        maxLength: 50,
        width: 16,
        color: { r: 1, g: 0, b: 0, a: 1 },
        endColor: { r: 0, g: 0, b: 1, a: 0 },
        maxAge: 2.0,
        layer: 5,
        blendMode: "additive",
        minDistance: 5,
      });
      assert.equal(trail.config.maxLength, 50);
      assert.equal(trail.config.width, 16);
      assert.equal(trail.config.maxAge, 2.0);
      assert.equal(trail.config.blendMode, "additive");
      assert.ok(trail.config.endColor !== null);
    });
  });

  describe("updateTrail", () => {
    it("adds points to the trail", () => {
      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0);
      assert.equal(getTrailPointCount(trail), 1);
      updateTrail(trail, 10, 10);
      assert.equal(getTrailPointCount(trail), 2);
    });

    it("adds head point at index 0", () => {
      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0);
      updateTrail(trail, 100, 100);
      assert.equal(trail.points[0].x, 100);
      assert.equal(trail.points[0].y, 100);
    });

    it("respects minimum distance", () => {
      const trail = createTrail({ minDistance: 10 });
      updateTrail(trail, 0, 0);
      updateTrail(trail, 5, 0); // too close
      assert.equal(getTrailPointCount(trail), 1);
      updateTrail(trail, 15, 0); // far enough
      assert.equal(getTrailPointCount(trail), 2);
    });

    it("trims to maxLength", () => {
      const trail = createTrail({ maxLength: 5, minDistance: 0 });
      for (let i = 0; i < 10; i++) {
        updateTrail(trail, i * 10, 0);
      }
      assert.equal(getTrailPointCount(trail), 5);
    });

    it("removes old points by age", () => {
      const trail = createTrail({ maxAge: 0.5, minDistance: 0 });
      updateTrail(trail, 0, 0, 0.01);
      updateTrail(trail, 10, 0, 0.01);
      assert.equal(getTrailPointCount(trail), 2);

      // Age all points beyond maxAge
      updateTrail(trail, 20, 0, 0.6);
      // Both old points should be removed (they now have age > 0.5)
      // Only the new point at (20,0) should remain
      assert.equal(getTrailPointCount(trail), 1);
      assert.equal(trail.points[0].x, 20);
    });

    it("ages existing points", () => {
      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0, 0);
      updateTrail(trail, 10, 0, 0.1);
      // The first point should now have age 0.1
      assert.ok(trail.points[1].age > 0.05);
    });

    it("does not add points when paused", () => {
      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0);
      pauseTrail(trail);
      updateTrail(trail, 100, 100);
      assert.equal(getTrailPointCount(trail), 1);
    });
  });

  describe("drawTrail", () => {
    it("does not draw with fewer than 2 points", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      const trail = createTrail();
      updateTrail(trail, 0, 0);
      drawTrail(trail);

      assert.equal(getDrawCalls().length, 0);
      disableDrawCallCapture();
    });

    it("draws segments between points", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0, 0.01);
      updateTrail(trail, 50, 0, 0.01);
      updateTrail(trail, 100, 0, 0.01);
      drawTrail(trail);

      const calls = getDrawCalls();
      // 3 points = 2 segments
      assert.equal(calls.length, 2);
      for (const call of calls) {
        assert.equal(call.type, "sprite");
      }

      disableDrawCallCapture();
    });

    it("uses specified layer", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      const trail = createTrail({ layer: 42, minDistance: 0 });
      updateTrail(trail, 0, 0, 0.01);
      updateTrail(trail, 50, 0, 0.01);
      drawTrail(trail);

      const calls = getDrawCalls();
      assert.ok(calls.length > 0);
      for (const call of calls) {
        if (call.type === "sprite") {
          assert.equal(call.layer, 42);
        }
      }

      disableDrawCallCapture();
    });
  });

  describe("clearTrail", () => {
    it("removes all points", () => {
      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0);
      updateTrail(trail, 10, 10);
      assert.equal(getTrailPointCount(trail), 2);
      clearTrail(trail);
      assert.equal(getTrailPointCount(trail), 0);
    });
  });

  describe("pauseTrail / resumeTrail", () => {
    it("pauses and resumes trail", () => {
      const trail = createTrail({ minDistance: 0 });
      updateTrail(trail, 0, 0);
      assert.equal(trail.active, true);

      pauseTrail(trail);
      assert.equal(trail.active, false);
      updateTrail(trail, 100, 100);
      assert.equal(getTrailPointCount(trail), 1); // didn't add

      resumeTrail(trail);
      assert.equal(trail.active, true);
      updateTrail(trail, 100, 100);
      assert.equal(getTrailPointCount(trail), 2); // added
    });
  });

  describe("trail with endColor", () => {
    it("creates trail with color interpolation", () => {
      const trail = createTrail({
        color: { r: 1, g: 0, b: 0, a: 1 },
        endColor: { r: 0, g: 0, b: 1, a: 0 },
        minDistance: 0,
      });
      assert.ok(trail.config.endColor !== null);
      assert.equal(trail.config.endColor!.b, 1);
    });

    it("draws without error", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      const trail = createTrail({
        color: { r: 1, g: 0, b: 0, a: 1 },
        endColor: { r: 0, g: 0, b: 1, a: 0 },
        minDistance: 0,
      });
      updateTrail(trail, 0, 0, 0.01);
      updateTrail(trail, 50, 0, 0.01);
      updateTrail(trail, 100, 50, 0.01);
      drawTrail(trail);

      const calls = getDrawCalls();
      assert.equal(calls.length, 2);
      disableDrawCallCapture();
    });
  });
});
