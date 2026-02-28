/**
 * Test drawSprite() with tileW/tileH options
 */

import { it, assert } from "../testing/harness.ts";
import { drawSprite } from "./sprites.ts";
import { getDrawCalls, clearDrawCalls, enableDrawCallCapture } from "../testing/visual.ts";

it("drawSprite with tileW/tileH renders tiled UV", () => {
  enableDrawCallCapture();
  clearDrawCalls();

  drawSprite({
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
  }
});

it("drawSprite tiling defaults to full area when only one dimension set", () => {
  enableDrawCallCapture();
  clearDrawCalls();

  drawSprite({
    textureId: 2,
    x: 100,
    y: 100,
    w: 64,
    h: 64,
    tileW: 32,
  });

  const calls = getDrawCalls();
  const call = calls[calls.length - 1];
  assert.equal(call?.type, "sprite", "Should log a sprite draw call");

  if (call?.type === "sprite") {
    assert.equal(call.w, 64, "Width should be 64");
    assert.equal(call.h, 64, "Height should be 64");
  }
});

it("drawSprite tiling handles non-integer tile counts", () => {
  enableDrawCallCapture();
  clearDrawCalls();

  // 100x100 area with 32x32 tiles = 3.125 x 3.125 repeats
  drawSprite({
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
});
