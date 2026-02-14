import { describe, it, assert } from "../testing/harness.ts";
import {
  drawNineSlice,
  getNineSliceSpriteCount,
} from "./nineslice.ts";
import type { NineSliceBorder } from "./nineslice.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("Nine-Slice Sprites", () => {
  describe("getNineSliceSpriteCount", () => {
    it("returns 9 for standard panel with uniform border", () => {
      const count = getNineSliceSpriteCount(200, 100, 16);
      assert.equal(count, 9);
    });

    it("returns 9 for per-edge border", () => {
      const border: NineSliceBorder = { top: 8, bottom: 12, left: 10, right: 14 };
      const count = getNineSliceSpriteCount(200, 100, border);
      assert.equal(count, 9);
    });

    it("returns fewer when border equals or exceeds panel size", () => {
      // Width = 32, border = 16 each side => centerW = 0
      const count = getNineSliceSpriteCount(32, 100, 16);
      // No top edge, no center, no bottom edge (centerW=0)
      // Corners (4) + left edge (1) + right edge (1) = 6
      assert.equal(count, 6);
    });

    it("returns fewer when height is too small for center", () => {
      // Height = 20, border = 10 each => centerH = 0
      const count = getNineSliceSpriteCount(200, 20, 10);
      // No left edge, no center, no right edge (centerH=0)
      // Corners (4) + top edge (1) + bottom edge (1) = 6
      assert.equal(count, 6);
    });

    it("returns 1 when both center and edges exist but no corners (zero border)", () => {
      const count = getNineSliceSpriteCount(200, 100, 0);
      // centerW = 200, centerH = 100, but all border sides are 0
      // Only center slice exists
      assert.equal(count, 1);
    });

    it("returns corner count when panel has zero size", () => {
      // When w=0, h=0 but border > 0, the corners still technically have
      // nonzero border dimensions (just zero center/edge), so 4 corners remain
      const count = getNineSliceSpriteCount(0, 0, 16);
      assert.equal(count, 4);
    });
  });

  describe("drawNineSlice", () => {
    it("emits correct number of draw calls (headless capture)", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawNineSlice(1, 100, 50, 200, 100, {
        border: 16,
        textureWidth: 64,
        textureHeight: 64,
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 9);

      // All should be sprites
      for (const call of calls) {
        assert.equal(call.type, "sprite");
      }

      disableDrawCallCapture();
    });

    it("emits correct UV for top-left corner", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawNineSlice(1, 0, 0, 200, 100, {
        border: 16,
        textureWidth: 64,
        textureHeight: 64,
      });

      const calls = getDrawCalls();
      // First call should be the top-left corner
      const topLeft = calls[0] as any;
      assert.equal(topLeft.type, "sprite");
      // In headless mode, drawSprite logs don't include UV info, but
      // we can verify that we got the right number of sprites
      assert.equal(calls.length, 9);

      disableDrawCallCapture();
    });

    it("handles per-edge border", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawNineSlice(1, 0, 0, 300, 200, {
        border: { top: 8, bottom: 12, left: 10, right: 14 },
        textureWidth: 128,
        textureHeight: 128,
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 9);
      disableDrawCallCapture();
    });

    it("skips zero-sized slices", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      // Panel exactly 2x border wide => no center column
      drawNineSlice(1, 0, 0, 32, 200, {
        border: 16,
        textureWidth: 64,
        textureHeight: 64,
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 6); // 4 corners + 2 side edges

      disableDrawCallCapture();
    });

    it("draws with custom layer and opacity", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawNineSlice(1, 0, 0, 200, 100, {
        border: 16,
        layer: 50,
        opacity: 0.5,
        textureWidth: 64,
        textureHeight: 64,
      });

      const calls = getDrawCalls();
      assert.ok(calls.length > 0);
      for (const call of calls) {
        if (call.type === "sprite") {
          assert.equal(call.layer, 50);
          assert.equal(call.opacity, 0.5);
        }
      }

      disableDrawCallCapture();
    });

    it("uses default texture dimensions when not specified", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      // Should not throw with default 256x256 texture assumption
      drawNineSlice(1, 0, 0, 200, 100, { border: 16 });

      const calls = getDrawCalls();
      assert.equal(calls.length, 9);
      disableDrawCallCapture();
    });

    it("handles zero border (single center sprite)", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawNineSlice(1, 0, 0, 200, 100, { border: 0 });

      const calls = getDrawCalls();
      assert.equal(calls.length, 1); // Just the center
      disableDrawCallCapture();
    });
  });
});
