import { describe, it, assert } from "./harness.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
  findDrawCalls,
  assertSpriteDrawn,
  assertTextDrawn,
  assertDrawCallCount,
  assertNothingDrawnAt,
  assertLayerHasDrawCalls,
  assertScreenSpaceDrawn,
  getDrawCallSummary,
} from "./visual.ts";
import type { DrawCall } from "./visual.ts";
import { drawSprite } from "../rendering/sprites.ts";
import { drawText } from "../rendering/text.ts";
import { drawRect, drawPanel, drawBar, drawLabel } from "../ui/primitives.ts";

// ---------------------------------------------------------------------------
// Capture lifecycle
// ---------------------------------------------------------------------------

describe("draw call capture - lifecycle", () => {
  it("returns empty array when capture is not enabled", () => {
    disableDrawCallCapture();
    const calls = getDrawCalls();
    assert.equal(calls.length, 0);
  });

  it("captures draw calls after enableDrawCallCapture()", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 10, y: 20, w: 32, h: 32 });
    const calls = getDrawCalls();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].type, "sprite");
    disableDrawCallCapture();
  });

  it("stops capturing after disableDrawCallCapture()", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    assert.equal(getDrawCalls().length, 1);
    disableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    assert.equal(getDrawCalls().length, 0);
  });

  it("clearDrawCalls() resets log without disabling capture", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    assert.equal(getDrawCalls().length, 1);
    clearDrawCalls();
    assert.equal(getDrawCalls().length, 0);
    // Still capturing
    drawSprite({ textureId: 2, x: 0, y: 0, w: 16, h: 16 });
    assert.equal(getDrawCalls().length, 1);
    disableDrawCallCapture();
  });

  it("getDrawCalls() returns a copy, not the internal array", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    const calls1 = getDrawCalls();
    const calls2 = getDrawCalls();
    assert.ok(calls1 !== calls2);
    assert.equal(calls1.length, calls2.length);
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// Sprite capture
// ---------------------------------------------------------------------------

describe("draw call capture - sprites", () => {
  it("captures sprite properties correctly", () => {
    enableDrawCallCapture();
    drawSprite({
      textureId: 42,
      x: 100,
      y: 200,
      w: 64,
      h: 48,
      layer: 5,
      rotation: 1.5,
      flipX: true,
      flipY: false,
      opacity: 0.8,
      blendMode: "additive",
      shaderId: 3,
    });
    const calls = getDrawCalls();
    assert.equal(calls.length, 1);
    const s = calls[0];
    assert.equal(s.type, "sprite");
    if (s.type === "sprite") {
      assert.equal(s.textureId, 42);
      assert.equal(s.x, 100);
      assert.equal(s.y, 200);
      assert.equal(s.w, 64);
      assert.equal(s.h, 48);
      assert.equal(s.layer, 5);
      assert.equal(s.rotation, 1.5);
      assert.equal(s.flipX, true);
      assert.equal(s.flipY, false);
      assert.equal(s.opacity, 0.8);
      assert.equal(s.blendMode, "additive");
      assert.equal(s.shaderId, 3);
    }
    disableDrawCallCapture();
  });

  it("captures sprite defaults correctly", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    const s = getDrawCalls()[0];
    if (s.type === "sprite") {
      assert.equal(s.layer, 0);
      assert.equal(s.rotation, 0);
      assert.equal(s.flipX, false);
      assert.equal(s.flipY, false);
      assert.equal(s.opacity, 1);
      assert.equal(s.blendMode, "alpha");
      assert.equal(s.shaderId, 0);
    }
    disableDrawCallCapture();
  });

  it("captures multiple sprites in order", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    drawSprite({ textureId: 2, x: 100, y: 0, w: 16, h: 16 });
    drawSprite({ textureId: 3, x: 200, y: 0, w: 16, h: 16 });
    const calls = getDrawCalls();
    assert.equal(calls.length, 3);
    if (calls[0].type === "sprite") assert.equal(calls[0].textureId, 1);
    if (calls[1].type === "sprite") assert.equal(calls[1].textureId, 2);
    if (calls[2].type === "sprite") assert.equal(calls[2].textureId, 3);
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// Text capture
// ---------------------------------------------------------------------------

describe("draw call capture - text", () => {
  it("captures drawText calls", () => {
    enableDrawCallCapture();
    drawText("Hello World", 10, 20, { scale: 2, layer: 100, screenSpace: true });
    const calls = getDrawCalls();
    // drawText logs 1 text call, then (in headless) nothing else
    const textCalls = calls.filter((c) => c.type === "text");
    assert.equal(textCalls.length, 1);
    const t = textCalls[0];
    if (t.type === "text") {
      assert.equal(t.content, "Hello World");
      assert.equal(t.x, 10);
      assert.equal(t.y, 20);
      assert.equal(t.scale, 2);
      assert.equal(t.layer, 100);
      assert.equal(t.screenSpace, true);
    }
    disableDrawCallCapture();
  });

  it("captures text defaults", () => {
    enableDrawCallCapture();
    drawText("test", 0, 0);
    const textCalls = getDrawCalls().filter((c) => c.type === "text");
    assert.equal(textCalls.length, 1);
    if (textCalls[0].type === "text") {
      assert.equal(textCalls[0].scale, 1);
      assert.equal(textCalls[0].layer, 100);
      assert.equal(textCalls[0].screenSpace, false);
    }
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// UI primitive capture
// ---------------------------------------------------------------------------

describe("draw call capture - UI primitives", () => {
  it("captures drawRect calls", () => {
    enableDrawCallCapture();
    drawRect(10, 20, 100, 50, { layer: 80, screenSpace: true });
    const rects = getDrawCalls().filter((c) => c.type === "rect");
    assert.equal(rects.length, 1);
    if (rects[0].type === "rect") {
      assert.equal(rects[0].x, 10);
      assert.equal(rects[0].y, 20);
      assert.equal(rects[0].w, 100);
      assert.equal(rects[0].h, 50);
      assert.equal(rects[0].layer, 80);
      assert.equal(rects[0].screenSpace, true);
    }
    disableDrawCallCapture();
  });

  it("captures drawPanel calls", () => {
    enableDrawCallCapture();
    drawPanel(5, 10, 200, 150, { borderWidth: 3, screenSpace: true });
    const panels = getDrawCalls().filter((c) => c.type === "panel");
    assert.equal(panels.length, 1);
    if (panels[0].type === "panel") {
      assert.equal(panels[0].x, 5);
      assert.equal(panels[0].y, 10);
      assert.equal(panels[0].w, 200);
      assert.equal(panels[0].h, 150);
      assert.equal(panels[0].borderWidth, 3);
      assert.equal(panels[0].screenSpace, true);
    }
    disableDrawCallCapture();
  });

  it("captures drawBar calls with fillRatio", () => {
    enableDrawCallCapture();
    drawBar(0, 0, 200, 20, 0.75, { layer: 95 });
    const bars = getDrawCalls().filter((c) => c.type === "bar");
    assert.equal(bars.length, 1);
    if (bars[0].type === "bar") {
      assert.equal(bars[0].w, 200);
      assert.equal(bars[0].h, 20);
      assert.equal(bars[0].fillRatio, 0.75);
      assert.equal(bars[0].layer, 95);
    }
    disableDrawCallCapture();
  });

  it("clamps bar fillRatio to 0-1", () => {
    enableDrawCallCapture();
    drawBar(0, 0, 100, 10, 1.5);
    drawBar(0, 0, 100, 10, -0.5);
    const bars = getDrawCalls().filter((c) => c.type === "bar");
    assert.equal(bars.length, 2);
    if (bars[0].type === "bar") assert.equal(bars[0].fillRatio, 1);
    if (bars[1].type === "bar") assert.equal(bars[1].fillRatio, 0);
    disableDrawCallCapture();
  });

  it("captures drawLabel calls", () => {
    enableDrawCallCapture();
    drawLabel("Score: 100", 10, 10, { scale: 2, screenSpace: true });
    const labels = getDrawCalls().filter((c) => c.type === "label");
    assert.equal(labels.length, 1);
    if (labels[0].type === "label") {
      assert.equal(labels[0].content, "Score: 100");
      assert.equal(labels[0].x, 10);
      assert.equal(labels[0].y, 10);
      assert.equal(labels[0].scale, 2);
      assert.equal(labels[0].screenSpace, true);
    }
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// findDrawCalls
// ---------------------------------------------------------------------------

describe("findDrawCalls", () => {
  it("filters by type", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    drawText("test", 0, 0);
    drawRect(0, 0, 10, 10);
    const sprites = findDrawCalls({ type: "sprite" });
    const texts = findDrawCalls({ type: "text" });
    const rects = findDrawCalls({ type: "rect" });
    assert.equal(sprites.length, 1);
    assert.equal(texts.length, 1);
    assert.equal(rects.length, 1);
    disableDrawCallCapture();
  });

  it("filters by position", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 100, y: 200, w: 16, h: 16 });
    drawSprite({ textureId: 2, x: 300, y: 400, w: 16, h: 16 });
    const at100 = findDrawCalls({ x: 100, y: 200 });
    assert.equal(at100.length, 1);
    const at300 = findDrawCalls({ x: 300 });
    assert.equal(at300.length, 1);
    disableDrawCallCapture();
  });

  it("filters by layer", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16, layer: 0 });
    drawSprite({ textureId: 2, x: 0, y: 0, w: 16, h: 16, layer: 5 });
    drawSprite({ textureId: 3, x: 0, y: 0, w: 16, h: 16, layer: 5 });
    const layer5 = findDrawCalls({ layer: 5 });
    assert.equal(layer5.length, 2);
    disableDrawCallCapture();
  });

  it("filters by textureId", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 10, x: 0, y: 0, w: 16, h: 16 });
    drawSprite({ textureId: 20, x: 0, y: 0, w: 16, h: 16 });
    drawSprite({ textureId: 10, x: 50, y: 0, w: 16, h: 16 });
    const tex10 = findDrawCalls({ textureId: 10 });
    assert.equal(tex10.length, 2);
    disableDrawCallCapture();
  });

  it("filters by content (substring match)", () => {
    enableDrawCallCapture();
    drawText("HP: 10/20", 0, 0);
    drawText("Score: 100", 0, 20);
    const hp = findDrawCalls({ content: "HP" });
    assert.equal(hp.length, 1);
    const colon = findDrawCalls({ content: ":" });
    assert.equal(colon.length, 2);
    disableDrawCallCapture();
  });

  it("filters by screenSpace", () => {
    enableDrawCallCapture();
    drawText("HUD", 0, 0, { screenSpace: true });
    drawText("World", 0, 0, { screenSpace: false });
    const hud = findDrawCalls({ screenSpace: true });
    assert.equal(hud.length, 1);
    disableDrawCallCapture();
  });

  it("combines multiple filter criteria", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16, layer: 0 });
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16, layer: 5 });
    drawSprite({ textureId: 2, x: 0, y: 0, w: 16, h: 16, layer: 5 });
    const combo = findDrawCalls({ type: "sprite", textureId: 1, layer: 5 });
    assert.equal(combo.length, 1);
    disableDrawCallCapture();
  });

  it("returns empty array when nothing matches", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    const found = findDrawCalls({ textureId: 999 });
    assert.equal(found.length, 0);
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// Assertions - passing cases
// ---------------------------------------------------------------------------

describe("visual assertions - passing", () => {
  it("assertSpriteDrawn passes when sprite exists", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 100, y: 200, w: 32, h: 32 });
    assertSpriteDrawn();
    assertSpriteDrawn({ x: 100, y: 200 });
    assertSpriteDrawn({ textureId: 1 });
    disableDrawCallCapture();
  });

  it("assertTextDrawn passes when text exists", () => {
    enableDrawCallCapture();
    drawText("HP: 10", 0, 0, { screenSpace: true });
    assertTextDrawn("HP: 10");
    assertTextDrawn("HP");
    disableDrawCallCapture();
  });

  it("assertTextDrawn matches label content too", () => {
    enableDrawCallCapture();
    drawLabel("Score: 50", 10, 10);
    assertTextDrawn("Score");
    disableDrawCallCapture();
  });

  it("assertDrawCallCount passes with correct count", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    drawSprite({ textureId: 2, x: 0, y: 0, w: 16, h: 16 });
    assertDrawCallCount("sprite", 2);
    disableDrawCallCapture();
  });

  it("assertNothingDrawnAt passes when point is clear", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    assertNothingDrawnAt(500, 500);
    disableDrawCallCapture();
  });

  it("assertLayerHasDrawCalls passes when layer has content", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16, layer: 5 });
    assertLayerHasDrawCalls(5);
    disableDrawCallCapture();
  });

  it("assertScreenSpaceDrawn passes when screen space draws exist", () => {
    enableDrawCallCapture();
    drawText("HUD", 0, 0, { screenSpace: true });
    assertScreenSpaceDrawn("text");
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// Assertions - failing cases
// ---------------------------------------------------------------------------

describe("visual assertions - failing", () => {
  it("assertSpriteDrawn throws when no sprites drawn", () => {
    enableDrawCallCapture();
    let threw = false;
    try {
      assertSpriteDrawn();
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes("Expected at least one sprite"));
    }
    assert.ok(threw);
    disableDrawCallCapture();
  });

  it("assertSpriteDrawn throws when no match for filter", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    let threw = false;
    try {
      assertSpriteDrawn({ textureId: 999 });
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes("Expected at least one sprite"));
      assert.ok(e.message.includes("Total sprites captured: 1"));
    }
    assert.ok(threw);
    disableDrawCallCapture();
  });

  it("assertTextDrawn throws when text not found", () => {
    enableDrawCallCapture();
    drawText("Hello", 0, 0);
    let threw = false;
    try {
      assertTextDrawn("Goodbye");
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('Expected text containing "Goodbye"'));
      assert.ok(e.message.includes('"Hello"'));
    }
    assert.ok(threw);
    disableDrawCallCapture();
  });

  it("assertDrawCallCount throws on mismatch", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    let threw = false;
    try {
      assertDrawCallCount("sprite", 5);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes('Expected 5 "sprite" draw calls, but found 1'));
    }
    assert.ok(threw);
    disableDrawCallCapture();
  });

  it("assertNothingDrawnAt throws when sprite overlaps point", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 10, y: 10, w: 100, h: 100 });
    let threw = false;
    try {
      assertNothingDrawnAt(50, 50);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes("Expected nothing drawn at (50, 50)"));
    }
    assert.ok(threw);
    disableDrawCallCapture();
  });

  it("assertLayerHasDrawCalls throws when layer is empty", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16, layer: 0 });
    let threw = false;
    try {
      assertLayerHasDrawCalls(99);
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes("Expected draw calls on layer 99"));
      assert.ok(e.message.includes("Active layers:"));
    }
    assert.ok(threw);
    disableDrawCallCapture();
  });

  it("assertScreenSpaceDrawn throws when all world-space", () => {
    enableDrawCallCapture();
    drawText("world text", 0, 0, { screenSpace: false });
    let threw = false;
    try {
      assertScreenSpaceDrawn("text");
    } catch (e: any) {
      threw = true;
      assert.ok(e.message.includes("screen space"));
    }
    assert.ok(threw);
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// getDrawCallSummary
// ---------------------------------------------------------------------------

describe("getDrawCallSummary", () => {
  it("returns correct counts by type", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    drawSprite({ textureId: 2, x: 0, y: 0, w: 16, h: 16 });
    drawText("test", 0, 0);
    drawRect(0, 0, 10, 10);
    const summary = getDrawCallSummary();
    assert.equal(summary.total, 4);
    assert.equal(summary.sprite, 2);
    assert.equal(summary.text, 1);
    assert.equal(summary.rect, 1);
    disableDrawCallCapture();
  });

  it("returns zero total when nothing drawn", () => {
    enableDrawCallCapture();
    const summary = getDrawCallSummary();
    assert.equal(summary.total, 0);
    disableDrawCallCapture();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("draw call capture - edge cases", () => {
  it("re-enabling capture clears previous log", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 0, y: 0, w: 16, h: 16 });
    assert.equal(getDrawCalls().length, 1);
    enableDrawCallCapture(); // re-enable resets
    assert.equal(getDrawCalls().length, 0);
    disableDrawCallCapture();
  });

  it("drawLabel logs a label call with content", () => {
    enableDrawCallCapture();
    drawLabel("test", 0, 0);
    const calls = getDrawCalls();
    const labels = calls.filter((c) => c.type === "label");
    assert.equal(labels.length, 1);
    if (labels[0].type === "label") {
      assert.equal(labels[0].content, "test");
    }
    disableDrawCallCapture();
  });

  it("position tolerance works for floating-point comparisons", () => {
    enableDrawCallCapture();
    drawSprite({ textureId: 1, x: 100.0001, y: 200.0001, w: 16, h: 16 });
    const found = findDrawCalls({ x: 100, y: 200, tolerance: 0.001 });
    assert.equal(found.length, 1);
    const notFound = findDrawCalls({ x: 100, y: 200, tolerance: 0.00001 });
    assert.equal(notFound.length, 0);
    disableDrawCallCapture();
  });
});
