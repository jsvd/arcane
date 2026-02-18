import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  loadFont,
  getDefaultFont,
  getDefaultMSDFFont,
  loadMSDFFont,
  measureText,
  drawText,
  wrapText,
  drawTextWrapped,
  drawTextAligned,
} from "./text.ts";
import type { BitmapFont, MSDFFont, TextOutline, TextShadow, TextAlign, TextLayoutOptions } from "./text.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../../runtime/testing/visual.ts";
import type { TextDrawCall } from "../../runtime/testing/visual.ts";

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

// --- Text alignment tests ---

describe("text alignment", () => {
  it("default alignment is left (no offset)", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawText("Hello", 100, 50);
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    assert.equal(calls[0].x, 100, "left-aligned text should start at original x");
    clearDrawCalls();

    drawText("Hello", 100, 50, { align: "left" });
    const calls2 = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls2.length, 1);
    assert.equal(calls2[0].x, 100, "explicit left alignment should start at original x");
    disableDrawCallCapture();
  });

  it("center alignment offsets by half the measured width", () => {
    const text = "Hello";
    const m = measureText(text);
    // "Hello" = 5 chars * 8px = 40px wide
    assert.equal(m.width, 40);

    enableDrawCallCapture();
    clearDrawCalls();
    drawText(text, 100, 50, { align: "center" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    // center align at x=100: effective x = 100 - 40/2 = 80
    assert.equal(calls[0].x, 80, "center-aligned text should be offset by half width");
    disableDrawCallCapture();
  });

  it("right alignment offsets by the full measured width", () => {
    const text = "Hello";
    const m = measureText(text);
    assert.equal(m.width, 40);

    enableDrawCallCapture();
    clearDrawCalls();
    drawText(text, 100, 50, { align: "right" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    // right align at x=100: effective x = 100 - 40 = 60
    assert.equal(calls[0].x, 60, "right-aligned text should be offset by full width");
    disableDrawCallCapture();
  });

  it("center alignment with scale factor", () => {
    const text = "AB";
    const m = measureText(text, { scale: 2 });
    // 2 chars * 8px * scale 2 = 32
    assert.equal(m.width, 32);

    enableDrawCallCapture();
    clearDrawCalls();
    drawText(text, 200, 50, { scale: 2, align: "center" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    // center at x=200: effective x = 200 - 32/2 = 184
    assert.equal(calls[0].x, 184, "center-aligned scaled text should use scaled width");
    disableDrawCallCapture();
  });

  it("right alignment with MSDF font", () => {
    const font = getDefaultMSDFFont();
    const text = "Test";
    const m = measureText(text, { msdfFont: font });
    // 4 chars * 8px advance = 32
    assert.equal(m.width, 32);

    enableDrawCallCapture();
    clearDrawCalls();
    drawText(text, 100, 50, { msdfFont: font, align: "right" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    // right align at x=100: effective x = 100 - 32 = 68
    assert.equal(calls[0].x, 68, "right-aligned MSDF text should be offset by full width");
    disableDrawCallCapture();
  });

  it("center alignment with MSDF font", () => {
    const font = getDefaultMSDFFont();
    const text = "Center";
    const m = measureText(text, { msdfFont: font });
    // 6 chars * 8px advance = 48
    assert.equal(m.width, 48);

    enableDrawCallCapture();
    clearDrawCalls();
    drawText(text, 100, 50, { msdfFont: font, align: "center" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    // center at x=100: effective x = 100 - 48/2 = 76
    assert.equal(calls[0].x, 76, "center-aligned MSDF text should be offset by half width");
    disableDrawCallCapture();
  });

  it("alignment with empty string is a no-op", () => {
    drawText("", 100, 50, { align: "center" });
    drawText("", 100, 50, { align: "right" });
    assert.ok(true, "alignment with empty string completed without error");
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

  it("MSDFFont.shaderPool is an array with length > 0", () => {
    const font = getDefaultMSDFFont();
    assert.ok(Array.isArray(font.shaderPool), "shaderPool should be an array");
    assert.ok(font.shaderPool.length > 0, "shaderPool should have at least one entry");
  });

  it("MSDFFont.shaderId equals shaderPool[0]", () => {
    const font = getDefaultMSDFFont();
    assert.equal(font.shaderId, font.shaderPool[0]);
  });

  it("loadMSDFFont headless returns shaderPool with one entry", () => {
    const font = loadMSDFFont("nonexistent.png", "{}");
    assert.ok(Array.isArray(font.shaderPool), "shaderPool should be an array");
    assert.equal(font.shaderPool.length, 1);
    assert.equal(font.shaderPool[0], 0);
  });

  it("multiple drawText calls with different outline params don't throw", () => {
    const font = getDefaultMSDFFont();
    drawText("Red outline", 10, 10, {
      msdfFont: font,
      scale: 2,
      outline: { width: 1.0, color: { r: 1, g: 0, b: 0, a: 1 } },
    });
    drawText("Blue outline", 10, 40, {
      msdfFont: font,
      scale: 2,
      outline: { width: 2.0, color: { r: 0, g: 0, b: 1, a: 1 } },
    });
    drawText("No outline", 10, 70, {
      msdfFont: font,
      scale: 2,
    });
    assert.ok(true, "multiple drawText calls with different params completed");
  });
});

// --- Text layout tests ---

describe("wrapText", () => {
  it("returns single line when text fits within maxWidth", () => {
    // "Hi" = 2 chars * 8px = 16px wide
    const lines = wrapText("Hi", 100);
    assert.equal(lines.length, 1);
    assert.equal(lines[0], "Hi");
  });

  it("wraps long text into multiple lines", () => {
    // Default font: 8px per char. "Hello World" = 88px
    // maxWidth 50px should force a wrap after "Hello" (40px)
    const lines = wrapText("Hello World", 50);
    assert.equal(lines.length, 2);
    assert.equal(lines[0], "Hello");
    assert.equal(lines[1], "World");
  });

  it("wraps multiple words correctly", () => {
    // "A B C D" with maxWidth = 24px (3 chars fit)
    // "A B" = 24px, fits. "A B C" = 40px, doesn't fit.
    const lines = wrapText("A B C D", 24);
    assert.equal(lines.length, 2);
    assert.equal(lines[0], "A B");
    assert.equal(lines[1], "C D");
  });

  it("handles empty text", () => {
    const lines = wrapText("", 100);
    assert.equal(lines.length, 1);
    assert.equal(lines[0], "");
  });

  it("single long word stays on one line", () => {
    // "Supercalifragilistic" = 20 chars * 8 = 160px, maxWidth 50
    // Should stay on one line since it's a single word
    const lines = wrapText("Supercalifragilistic", 50);
    assert.equal(lines.length, 1);
    assert.equal(lines[0], "Supercalifragilistic");
  });

  it("respects scale parameter", () => {
    // "AB CD" at scale 2: "AB" = 2*8*2 = 32px, "AB CD" = 5*8*2 = 80px
    // maxWidth 50 at scale 2 should split after "AB"
    const lines = wrapText("AB CD", 50, 2);
    assert.equal(lines.length, 2);
    assert.equal(lines[0], "AB");
    assert.equal(lines[1], "CD");
  });

  it("returns text as-is when maxWidth is 0 or negative", () => {
    const lines = wrapText("Hello World", 0);
    assert.equal(lines.length, 1);
    assert.equal(lines[0], "Hello World");
  });
});

describe("drawTextWrapped", () => {
  it("does not throw in headless mode", () => {
    drawTextWrapped("Hello World, this is a long text that should wrap.", 10, 10, {
      maxWidth: 100,
    });
    assert.ok(true, "drawTextWrapped completed without error");
  });

  it("handles empty text", () => {
    drawTextWrapped("", 10, 10, { maxWidth: 100 });
    assert.ok(true, "drawTextWrapped with empty text completed");
  });

  it("works with layoutAlign option", () => {
    drawTextWrapped("Center aligned text", 10, 10, {
      maxWidth: 200,
      layoutAlign: "center",
    });
    drawTextWrapped("Right aligned text", 10, 10, {
      maxWidth: 200,
      layoutAlign: "right",
    });
    assert.ok(true, "drawTextWrapped with alignment completed");
  });

  it("captures draw calls with correct y offsets", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    // "AA BB" at scale 1 with 8px font, maxWidth 24
    // "AA" = 16px fits in 24, "AA BB" = 40px doesn't
    // Should draw 2 lines
    drawTextWrapped("AA BB", 10, 10, { maxWidth: 24 });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 2);
    assert.equal(calls[0].content, "AA");
    assert.equal(calls[1].content, "BB");
    // First line at y=10, second at y=10 + lineHeight
    assert.equal(calls[0].y, 10);
    // lineHeight = 8 * 1.2 = 9.6
    const expectedY = 10 + 8 * 1.2;
    assert.ok(
      Math.abs(calls[1].y - expectedY) < 0.01,
      `expected y near ${expectedY}, got ${calls[1].y}`,
    );
    disableDrawCallCapture();
  });
});

describe("drawTextAligned", () => {
  it("does not throw in headless mode", () => {
    drawTextAligned("Hello", 10, 10, 200);
    assert.ok(true, "drawTextAligned completed without error");
  });

  it("left alignment: text starts at x", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawTextAligned("Hi", 10, 20, 200, { layoutAlign: "left" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    assert.equal(calls[0].x, 10);
    disableDrawCallCapture();
  });

  it("center alignment: text is centered in box", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    // "Hi" = 16px wide, box width = 200
    // center x = 10 + (200 - 16) / 2 = 10 + 92 = 102
    drawTextAligned("Hi", 10, 20, 200, { layoutAlign: "center" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    assert.equal(calls[0].x, 102);
    disableDrawCallCapture();
  });

  it("right alignment: text is right-aligned in box", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    // "Hi" = 16px wide, box width = 200
    // right x = 10 + 200 - 16 = 194
    drawTextAligned("Hi", 10, 20, 200, { layoutAlign: "right" });
    const calls = getDrawCalls().filter((c) => c.type === "text") as TextDrawCall[];
    assert.equal(calls.length, 1);
    assert.equal(calls[0].x, 194);
    disableDrawCallCapture();
  });
});
