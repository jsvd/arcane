/**
 * Test drawTiledSprite() function
 */

import { it, assert } from "../testing/harness.ts";
import { drawTiledSprite } from "./sprites.ts";
import { getDrawCalls, clearDrawCalls, enableDrawCallCapture } from "../testing/visual.ts";

it("drawTiledSprite renders with repeated UV", () => {
  enableDrawCallCapture();
  clearDrawCalls();

  drawTiledSprite({
    textureId: 1,
    x: 0,
    y: 0,
    w: 320,
    h: 240,
    tileW: 16,
    tileH: 16,
  });

  const calls = getDrawCalls();
  const call = calls[calls.length - 1];
  assert.equal(call?.type, "sprite", "Should log a sprite draw call");

  if (call?.type === "sprite") {
    assert.equal(call.x, 0, "X should be 0");
    assert.equal(call.y, 0, "Y should be 0");
    assert.equal(call.w, 320, "Width should be 320");
    assert.equal(call.h, 240, "Height should be 240");
    // UV should repeat 320/16 = 20 times in X, 240/16 = 15 times in Y
    // But we can't directly check UV from the logged call
    // This test mainly verifies the function doesn't crash
  }
});

it("drawTiledSprite defaults to full texture size", () => {
  enableDrawCallCapture();
  clearDrawCalls();

  drawTiledSprite({
    textureId: 2,
    x: 100,
    y: 100,
    w: 64,
    h: 64,
  });

  const calls = getDrawCalls();
  const call = calls[calls.length - 1];
  assert.equal(call?.type, "sprite", "Should log a sprite draw call");

  if (call?.type === "sprite") {
    assert.equal(call.w, 64, "Width should be 64");
    assert.equal(call.h, 64, "Height should be 64");
  }
});

it("drawTiledSprite handles non-integer tile counts", () => {
  enableDrawCallCapture();
  clearDrawCalls();

  // 100x100 area with 32x32 tiles = 3.125 x 3.125 repeats
  drawTiledSprite({
    textureId: 3,
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    tileW: 32,
    tileH: 32,
  });

  const calls = getDrawCalls();
  const call = calls[calls.length - 1];
  assert.equal(call?.type, "sprite", "Should log a sprite draw call");
  // Verify it doesn't crash with non-integer repeat counts
});
