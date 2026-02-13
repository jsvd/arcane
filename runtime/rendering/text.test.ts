import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  loadFont,
  getDefaultFont,
  getDefaultMSDFFont,
  loadMSDFFont,
  measureText,
  drawText,
} from "./text.ts";
import type { BitmapFont, MSDFFont, TextOutline, TextShadow } from "./text.ts";

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
    // Default font: 8px wide glyphs, scale 1 -> 5 * 8 = 40
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

// --- MSDF text tests ---

describe("msdf text", () => {
  it("getDefaultMSDFFont returns a font with expected properties", () => {
    const font = getDefaultMSDFFont();
    assert.equal(typeof font.fontId, "number");
    assert.equal(typeof font.textureId, "number");
    assert.equal(typeof font.shaderId, "number");
    assert.equal(font.fontSize, 8);
    assert.equal(font.lineHeight, 8);
    assert.equal(font.distanceRange, 4);
  });

  it("getDefaultMSDFFont returns same instance on second call", () => {
    const a = getDefaultMSDFFont();
    const b = getDefaultMSDFFont();
    assert.ok(a === b, "expected same object reference");
  });

  it("MSDFFont has all required fields", () => {
    const font = getDefaultMSDFFont();
    assert.ok("fontId" in font, "should have fontId");
    assert.ok("textureId" in font, "should have textureId");
    assert.ok("shaderId" in font, "should have shaderId");
    assert.ok("fontSize" in font, "should have fontSize");
    assert.ok("lineHeight" in font, "should have lineHeight");
    assert.ok("distanceRange" in font, "should have distanceRange");
  });

  it("measureText with MSDF font returns correct dimensions", () => {
    const font = getDefaultMSDFFont();
    const m = measureText("Hello", { msdfFont: font });
    // Headless mode: each glyph advance = fontSize = 8, 5 chars = 40
    assert.equal(m.width, 40);
    assert.equal(m.height, 8); // lineHeight = 8
  });

  it("measureText with MSDF font and scale", () => {
    const font = getDefaultMSDFFont();
    const m = measureText("AB", { msdfFont: font, scale: 3 });
    // 2 chars * 8 advance * 3 scale = 48
    assert.equal(m.width, 48);
    assert.equal(m.height, 24); // lineHeight 8 * scale 3 = 24
  });

  it("measureText with MSDF font for empty string", () => {
    const font = getDefaultMSDFFont();
    const m = measureText("", { msdfFont: font });
    assert.equal(m.width, 0);
    assert.equal(m.height, 8);
  });

  it("drawText with MSDF font doesn't throw in headless mode", () => {
    const font = getDefaultMSDFFont();
    drawText("MSDF text!", 10, 20, { msdfFont: font, scale: 2 });
    assert.ok(true, "drawText with MSDF completed without error");
  });

  it("drawText with MSDF font and outline doesn't throw", () => {
    const font = getDefaultMSDFFont();
    const outline: TextOutline = {
      width: 1.0,
      color: { r: 0, g: 0, b: 0, a: 1 },
    };
    drawText("Outlined!", 10, 20, {
      msdfFont: font,
      scale: 3,
      outline,
      screenSpace: true,
    });
    assert.ok(true, "drawText with outline completed without error");
  });

  it("drawText with MSDF font and shadow doesn't throw", () => {
    const font = getDefaultMSDFFont();
    const shadow: TextShadow = {
      offsetX: 2,
      offsetY: 2,
      color: { r: 0, g: 0, b: 0, a: 0.5 },
      softness: 2.0,
    };
    drawText("Shadowed!", 10, 20, {
      msdfFont: font,
      scale: 2,
      shadow,
    });
    assert.ok(true, "drawText with shadow completed without error");
  });

  it("drawText with MSDF font, outline and shadow doesn't throw", () => {
    const font = getDefaultMSDFFont();
    drawText("Both!", 10, 20, {
      msdfFont: font,
      scale: 4,
      tint: { r: 1, g: 0.5, b: 0, a: 1 },
      outline: { width: 0.5, color: { r: 0, g: 0, b: 0, a: 1 } },
      shadow: { offsetX: 3, offsetY: 3, color: { r: 0, g: 0, b: 0, a: 0.3 } },
      screenSpace: true,
      layer: 200,
    });
    assert.ok(true, "drawText with outline + shadow completed without error");
  });

  it("loadMSDFFont returns dummy in headless mode", () => {
    const font = loadMSDFFont("nonexistent.png", "{}");
    assert.equal(typeof font.fontId, "number");
    assert.equal(typeof font.textureId, "number");
    assert.equal(typeof font.shaderId, "number");
    assert.equal(font.fontSize, 32);
  });

  it("bitmap drawText still works unchanged", () => {
    // Ensure the original bitmap path is not affected
    drawText("Bitmap text", 10, 10, { scale: 1 });
    drawText("Scaled", 10, 10, { scale: 2, layer: 50 });
    drawText("Tinted", 10, 10, { tint: { r: 1, g: 0, b: 0, a: 1 } });
    drawText("Screen space", 10, 10, { screenSpace: true });
    assert.ok(true, "all bitmap drawText variants completed without error");
  });

  it("measureText without MSDF uses bitmap path", () => {
    // Without msdfFont, should use the bitmap font measurement
    const m = measureText("Test");
    assert.equal(m.width, 32); // 4 * 8
    assert.equal(m.height, 8);
  });

  it("TextOutline type has expected shape", () => {
    const outline: TextOutline = {
      width: 1.5,
      color: { r: 0, g: 0, b: 0, a: 1 },
    };
    assert.equal(outline.width, 1.5);
    assert.equal(outline.color.r, 0);
    assert.equal(outline.color.a, 1);
  });

  it("TextShadow type has expected shape", () => {
    const shadow: TextShadow = {
      offsetX: 2,
      offsetY: 3,
      color: { r: 0.1, g: 0.1, b: 0.1, a: 0.5 },
      softness: 2.5,
    };
    assert.equal(shadow.offsetX, 2);
    assert.equal(shadow.offsetY, 3);
    assert.equal(shadow.softness, 2.5);
    assert.equal(shadow.color.a, 0.5);
  });

  it("TextShadow softness defaults to undefined if not specified", () => {
    const shadow: TextShadow = {
      offsetX: 1,
      offsetY: 1,
      color: { r: 0, g: 0, b: 0, a: 1 },
    };
    assert.equal(shadow.softness, undefined);
  });
});
