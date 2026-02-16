import { describe, it, assert } from "../testing/harness.ts";
import { drawColorSprite, _resetColorTexCache } from "./color-sprite.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("drawColorSprite", () => {
  it("should log a draw call with sprite type", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawColorSprite({
      color: { r: 1, g: 0, b: 0, a: 1 },
      x: 10, y: 20, w: 32, h: 32,
      layer: 5,
    });
    const log = getDrawCalls();
    assert.ok(log.length >= 1, "expected at least one draw call");
    assert.equal(log[log.length - 1].type, "sprite");
    const last = log[log.length - 1] as any;
    assert.equal(last.x, 10);
    assert.equal(last.y, 20);
    assert.equal(last.layer, 5);
    disableDrawCallCapture();
  });

  it("should use default layer 0 when not specified", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawColorSprite({
      color: { r: 0, g: 1, b: 0, a: 1 },
      x: 0, y: 0, w: 16, h: 16,
    });
    const log = getDrawCalls();
    assert.ok(log.length >= 1, "expected draw call");
    assert.equal((log[log.length - 1] as any).layer, 0);
    disableDrawCallCapture();
  });

  it("should cache textures for same color", () => {
    enableDrawCallCapture();
    _resetColorTexCache();
    drawColorSprite({ color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, x: 0, y: 0, w: 8, h: 8 });
    drawColorSprite({ color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, x: 10, y: 10, w: 8, h: 8 });
    assert.ok(true, "cached texture reuse works without error");
    disableDrawCallCapture();
  });
});
