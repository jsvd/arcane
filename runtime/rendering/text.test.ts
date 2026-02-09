import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  loadFont,
  getDefaultFont,
  measureText,
  drawText,
} from "./text.ts";
import type { BitmapFont } from "./text.ts";

describe("text", () => {
  it("loadFont creates BitmapFont with correct fields", () => {
    const font = loadFont(42, 16, 16, 8, 12, 0);
    assert.equal(font.textureId, 42);
    assert.equal(font.glyphW, 16);
    assert.equal(font.glyphH, 16);
    assert.equal(font.columns, 8);
    assert.equal(font.rows, 12);
    assert.equal(font.firstChar, 0);
  });

  it("loadFont uses default firstChar=32", () => {
    const font = loadFont(1, 8, 8, 16, 6);
    assert.equal(font.firstChar, 32);
  });

  it("getDefaultFont returns a font with expected dimensions", () => {
    const font = getDefaultFont();
    assert.equal(font.glyphW, 8);
    assert.equal(font.glyphH, 8);
    assert.equal(font.columns, 16);
    assert.equal(font.rows, 6);
    assert.equal(font.firstChar, 32);
  });

  it("getDefaultFont returns same instance on second call", () => {
    const a = getDefaultFont();
    const b = getDefaultFont();
    assert.ok(a === b, "expected same object reference");
  });

  it("measureText returns correct width for known string", () => {
    const m = measureText("Hello");
    // Default font: 8px wide glyphs, scale 1 → 5 * 8 = 40
    assert.equal(m.width, 40);
    assert.equal(m.height, 8);
  });

  it("measureText with scale multiplier", () => {
    const m = measureText("AB", { scale: 3 });
    // 2 chars * 8 * 3 = 48 wide, 8 * 3 = 24 high
    assert.equal(m.width, 48);
    assert.equal(m.height, 24);
  });

  it("measureText with custom font dimensions", () => {
    const font = loadFont(0, 12, 16, 16, 6);
    const m = measureText("Hi!", { font });
    // 3 chars * 12 * 1 = 36 wide, 16 high
    assert.equal(m.width, 36);
    assert.equal(m.height, 16);
  });

  it("drawText doesn't throw in headless mode", () => {
    // In headless (Node/V8 test runner), drawText is a no-op
    drawText("Hello, world!", 10, 20);
    drawText("Test", 0, 0, { scale: 2, layer: 50 });
    assert.ok(true, "drawText completed without error");
  });

  it("UV calculation: char A (code 65) gives correct col and row", () => {
    // 'A' = charCode 65, minus firstChar 32 = 33
    // col = 33 % 16 = 1, row = floor(33 / 16) = 2
    const font = getDefaultFont();
    const charCode = "A".charCodeAt(0) - font.firstChar; // 33
    const col = charCode % font.columns;
    const row = Math.floor(charCode / font.columns);
    assert.equal(charCode, 33);
    assert.equal(col, 1);
    assert.equal(row, 2);
  });

  it("UV calculation: space (code 32) gives col=0 row=0", () => {
    const font = getDefaultFont();
    const charCode = " ".charCodeAt(0) - font.firstChar; // 0
    const col = charCode % font.columns;
    const row = Math.floor(charCode / font.columns);
    assert.equal(charCode, 0);
    assert.equal(col, 0);
    assert.equal(row, 0);
  });
});
