import { describe, it, assert } from "../testing/harness.ts";
import { drawSprite } from "./sprites.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("Sprites", () => {
  describe("drawSprite", () => {
    it("logs a sprite draw call in capture mode", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({
        textureId: 1,
        x: 100,
        y: 200,
        w: 32,
        h: 32,
        layer: 5,
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 1);
      assert.equal(calls[0].type, "sprite");

      disableDrawCallCapture();
    });

    it("uses default values for optional fields", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });

      const calls = getDrawCalls();
      assert.equal(calls.length, 1);
      const call = calls[0] as any;
      assert.equal(call.layer, 0);
      assert.equal(call.rotation, 0);
      assert.equal(call.flipX, false);
      assert.equal(call.flipY, false);
      assert.equal(call.opacity, 1);
      assert.equal(call.blendMode, "alpha");

      disableDrawCallCapture();
    });
  });

  describe("shadow option", () => {
    it("draws shadow sprite before main sprite", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({
        textureId: 1,
        x: 100,
        y: 100,
        w: 32,
        h: 32,
        layer: 5,
        shadow: {},
      });

      const calls = getDrawCalls();
      // Shadow sprite + main sprite = 2 calls
      assert.equal(calls.length, 2);

      // First call is the shadow (lower layer)
      const shadow = calls[0] as any;
      assert.equal(shadow.type, "sprite");
      assert.equal(shadow.layer, 4); // layer - 1

      // Second call is the main sprite
      const main = calls[1] as any;
      assert.equal(main.type, "sprite");
      assert.equal(main.layer, 5);

      disableDrawCallCapture();
    });

    it("uses custom shadow offset", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({
        textureId: 1,
        x: 100,
        y: 100,
        w: 32,
        h: 32,
        shadow: { offsetX: 10, offsetY: 20 },
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 2);
      const shadow = calls[0] as any;
      assert.equal(shadow.x, 110); // x + offsetX

      disableDrawCallCapture();
    });

    it("uses custom shadow scaleY", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({
        textureId: 1,
        x: 100,
        y: 100,
        w: 32,
        h: 64,
        shadow: { scaleY: 0.25 },
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 2);
      const shadow = calls[0] as any;
      // Shadow height = 64 * 0.25 = 16
      assert.equal(shadow.h, 16);

      disableDrawCallCapture();
    });

    it("shadow has reduced opacity", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({
        textureId: 1,
        x: 100,
        y: 100,
        w: 32,
        h: 32,
        shadow: { color: { r: 0, g: 0, b: 0, a: 0.5 } },
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 2);
      const shadow = calls[0] as any;
      assert.equal(shadow.opacity, 0.5);

      disableDrawCallCapture();
    });

    it("no shadow without shadow option", () => {
      enableDrawCallCapture();
      clearDrawCalls();

      drawSprite({
        textureId: 1,
        x: 100,
        y: 100,
        w: 32,
        h: 32,
      });

      const calls = getDrawCalls();
      assert.equal(calls.length, 1);

      disableDrawCallCapture();
    });
  });
});
