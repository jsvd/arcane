import { describe, it, assert } from "../testing/harness.ts";
import {
  aabbOverlap,
  circleAABBOverlap,
  circleAABBResolve,
  sweepCircleAABB,
} from "./aabb.ts";
import type { AABB } from "./aabb.ts";

describe("aabb", () => {
  const box: AABB = { x: 100, y: 100, w: 50, h: 50 };

  describe("aabbOverlap", () => {
    it("detects overlapping boxes", () => {
      assert.ok(aabbOverlap(box, { x: 120, y: 120, w: 20, h: 20 }));
    });

    it("returns false for separated boxes", () => {
      assert.ok(!aabbOverlap(box, { x: 200, y: 200, w: 20, h: 20 }));
    });

    it("returns false for touching edges (not overlapping)", () => {
      assert.ok(!aabbOverlap(box, { x: 150, y: 100, w: 20, h: 20 }));
    });
  });

  describe("circleAABBOverlap", () => {
    it("detects circle overlapping box", () => {
      assert.ok(circleAABBOverlap(90, 125, 15, box));
    });

    it("returns false for distant circle", () => {
      assert.ok(!circleAABBOverlap(50, 50, 10, box));
    });

    it("returns true for circle touching box edge", () => {
      assert.ok(circleAABBOverlap(95, 125, 5, box));
    });
  });

  describe("circleAABBResolve", () => {
    it("returns null for non-overlapping circle", () => {
      assert.equal(circleAABBResolve(50, 50, 10, box), null);
    });

    it("returns normal pointing away from box", () => {
      const result = circleAABBResolve(95, 125, 10, box);
      assert.ok(result !== null);
      assert.ok(result!.nx < 0, "nx should be negative (left of box)");
      assert.equal(result!.ny, 0);
    });
  });

  describe("sweepCircleAABB", () => {
    it("returns null when circle misses the box", () => {
      const result = sweepCircleAABB(50, 50, 0, -100, 5, box);
      assert.equal(result, null, "circle moving away should miss");
    });

    it("detects hit when circle moves toward box left face", () => {
      // Circle at x=80, moving right toward box at x=100
      const result = sweepCircleAABB(80, 125, 100, 0, 5, box);
      assert.ok(result !== null, "should detect hit");
      assert.ok(result!.t >= 0 && result!.t <= 1, "t in [0, 1]");
      assert.equal(result!.nx, -1, "normal should point left");
      assert.equal(result!.ny, 0);
    });

    it("detects hit when circle moves toward box top face", () => {
      // Circle above box, moving down
      const result = sweepCircleAABB(125, 80, 0, 100, 5, box);
      assert.ok(result !== null, "should detect hit");
      assert.ok(result!.t >= 0 && result!.t <= 1, "t in [0, 1]");
      assert.equal(result!.nx, 0, "no x normal");
      assert.equal(result!.ny, -1, "normal should point up");
    });

    it("returns t=0 when already overlapping", () => {
      const result = sweepCircleAABB(125, 125, 10, 0, 5, box);
      assert.ok(result !== null);
      assert.equal(result!.t, 0, "should return t=0 for immediate overlap");
    });

    it("returns null when velocity is zero and no overlap", () => {
      const result = sweepCircleAABB(50, 50, 0, 0, 5, box);
      assert.equal(result, null);
    });

    it("hitX/hitY is on the circle center path at time t", () => {
      const cx = 50, cy = 125, vx = 200, vy = 0, r = 5;
      const result = sweepCircleAABB(cx, cy, vx, vy, r, box);
      assert.ok(result !== null);
      const expectedX = cx + vx * result!.t;
      const expectedY = cy + vy * result!.t;
      assert.ok(Math.abs(result!.hitX - expectedX) < 0.01);
      assert.ok(Math.abs(result!.hitY - expectedY) < 0.01);
    });

    it("detects hit on right face when coming from the right", () => {
      const result = sweepCircleAABB(200, 125, -200, 0, 5, box);
      assert.ok(result !== null);
      assert.equal(result!.nx, 1, "normal should point right");
      assert.equal(result!.ny, 0);
    });

    it("detects hit on bottom face when coming from below", () => {
      const result = sweepCircleAABB(125, 200, 0, -200, 5, box);
      assert.ok(result !== null);
      assert.equal(result!.nx, 0);
      assert.equal(result!.ny, 1, "normal should point down");
    });

    it("t fraction correctly represents distance", () => {
      // Circle at x=50, needs to travel to x=95 (box.x - radius) = distance 45
      // Total velocity = 100, so t should be ~0.45
      const result = sweepCircleAABB(50, 125, 100, 0, 5, box);
      assert.ok(result !== null);
      assert.ok(Math.abs(result!.t - 0.45) < 0.01, `expected t ~0.45, got ${result!.t}`);
    });
  });
});
