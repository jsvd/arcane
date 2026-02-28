import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { drawRect, drawPanel, drawBar, drawLabel } from "./primitives.ts";
import { rgb } from "./types.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("rgb helper", () => {
  it("should normalize 0-255 values to 0.0-1.0 range", () => {
    const color = rgb(255, 128, 0);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 128 / 255, "g should be ~0.502");
    assert.equal(color.b, 0.0, "b should be 0.0");
    assert.equal(color.a, 1.0, "a should default to 1.0");
  });

  it("should accept optional alpha parameter", () => {
    const color = rgb(255, 0, 0, 128);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 0.0, "g should be 0.0");
    assert.equal(color.b, 0.0, "b should be 0.0");
    assert.equal(color.a, 128 / 255, "a should be ~0.502");
  });

  it("should handle black (0, 0, 0)", () => {
    const color = rgb(0, 0, 0);
    assert.equal(color.r, 0.0, "r should be 0.0");
    assert.equal(color.g, 0.0, "g should be 0.0");
    assert.equal(color.b, 0.0, "b should be 0.0");
    assert.equal(color.a, 1.0, "a should be 1.0");
  });

  it("should handle white (255, 255, 255)", () => {
    const color = rgb(255, 255, 255);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 1.0, "g should be 1.0");
    assert.equal(color.b, 1.0, "b should be 1.0");
    assert.equal(color.a, 1.0, "a should be 1.0");
  });

  it("should handle fully transparent (255, 255, 255, 0)", () => {
    const color = rgb(255, 255, 255, 0);
    assert.equal(color.r, 1.0, "r should be 1.0");
    assert.equal(color.g, 1.0, "g should be 1.0");
    assert.equal(color.b, 1.0, "b should be 1.0");
    assert.equal(color.a, 0.0, "a should be 0.0");
  });
});

describe("ui primitives", () => {
  it("drawRect does not throw in headless mode", () => {
    drawRect(10, 20, 100, 50);
    drawRect(0, 0, 200, 100, { color: { r: 1, g: 0, b: 0, a: 1 } });
  });

  it("drawPanel does not throw in headless mode", () => {
    drawPanel(10, 20, 200, 100);
    drawPanel(0, 0, 300, 200, {
      fillColor: { r: 0.1, g: 0.1, b: 0.2, a: 0.9 },
      borderColor: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
      borderWidth: 3,
    });
  });

  it("drawBar does not throw in headless mode", () => {
    drawBar(10, 20, 100, 16, 0.75);
    drawBar(0, 0, 200, 20, 1.0, {
      fillColor: { r: 0, g: 1, b: 0, a: 1 },
      bgColor: { r: 0.3, g: 0, b: 0, a: 1 },
    });
  });

  it("drawBar clamps fill ratio to 0-1", () => {
    // Should not throw with out-of-range values
    drawBar(0, 0, 100, 10, -0.5);
    drawBar(0, 0, 100, 10, 2.0);
  });

  it("drawBar with border does not throw in headless mode", () => {
    drawBar(10, 20, 100, 16, 0.5, {
      borderColor: { r: 1, g: 1, b: 1, a: 1 },
      borderWidth: 1,
    });
  });

  it("drawLabel does not throw in headless mode", () => {
    drawLabel("Hello", 10, 20);
    drawLabel("Score: 42", 100, 50, {
      textColor: { r: 1, g: 1, b: 0, a: 1 },
      padding: 8,
      scale: 2,
    });
  });

  it("drawPanel with zero border width works", () => {
    drawPanel(0, 0, 100, 50, { borderWidth: 0 });
  });

  it("drawLabel with custom colors works", () => {
    drawLabel("HP", 0, 0, {
      textColor: { r: 1, g: 0, b: 0, a: 1 },
      bgColor: { r: 0, g: 0, b: 0, a: 0.8 },
      borderColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      borderWidth: 2,
      padding: 6,
    });
  });
});

describe("drawRect visual capture", () => {
  it("logs rect with correct fields", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawRect(10, 20, 100, 50);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    assert.equal(rects.length, 1);
    const call = rects[0] as any;
    assert.equal(call.x, 10);
    assert.equal(call.y, 20);
    assert.equal(call.w, 100);
    assert.equal(call.h, 50);
    disableDrawCallCapture();
  });

  it("default layer 90 and screenSpace false", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawRect(0, 0, 50, 50);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    assert.equal(rects.length, 1);
    const call = rects[0] as any;
    assert.equal(call.layer, 90);
    assert.equal(call.screenSpace, false);
    disableDrawCallCapture();
  });

  it("custom layer and screenSpace", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawRect(0, 0, 50, 50, { layer: 42, screenSpace: true });
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const call = rects[0] as any;
    assert.equal(call.layer, 42);
    assert.equal(call.screenSpace, true);
    disableDrawCallCapture();
  });
});

describe("drawPanel visual capture", () => {
  it("logs panel with correct fields", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawPanel(10, 20, 200, 100);
    const calls = getDrawCalls();
    const panels = calls.filter((c: any) => c.type === "panel");
    assert.equal(panels.length, 1);
    const call = panels[0] as any;
    assert.equal(call.x, 10);
    assert.equal(call.y, 20);
    assert.equal(call.w, 200);
    assert.equal(call.h, 100);
    assert.equal(call.borderWidth, 2);
    disableDrawCallCapture();
  });

  it("custom borderWidth", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawPanel(0, 0, 100, 50, { borderWidth: 5 });
    const calls = getDrawCalls();
    const panels = calls.filter((c: any) => c.type === "panel");
    assert.equal((panels[0] as any).borderWidth, 5);
    disableDrawCallCapture();
  });

  it("default layer 90", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawPanel(0, 0, 100, 50);
    const calls = getDrawCalls();
    const panels = calls.filter((c: any) => c.type === "panel");
    assert.equal((panels[0] as any).layer, 90);
    disableDrawCallCapture();
  });
});

describe("drawBar visual capture", () => {
  it("logs bar with correct fields", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawBar(10, 20, 100, 16, 0.75);
    const calls = getDrawCalls();
    const bars = calls.filter((c: any) => c.type === "bar");
    assert.equal(bars.length, 1);
    const call = bars[0] as any;
    assert.equal(call.x, 10);
    assert.equal(call.y, 20);
    assert.equal(call.w, 100);
    assert.equal(call.h, 16);
    assert.equal(call.fillRatio, 0.75);
    disableDrawCallCapture();
  });

  it("fillRatio clamped to 0-1 in log", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawBar(0, 0, 100, 10, 2.0);
    const calls = getDrawCalls();
    const bars = calls.filter((c: any) => c.type === "bar");
    assert.equal((bars[0] as any).fillRatio, 1.0, "fillRatio clamped to 1");
    clearDrawCalls();
    drawBar(0, 0, 100, 10, -0.5);
    const calls2 = getDrawCalls();
    const bars2 = calls2.filter((c: any) => c.type === "bar");
    assert.equal((bars2[0] as any).fillRatio, 0, "fillRatio clamped to 0");
    disableDrawCallCapture();
  });

  it("default layer 90 and screenSpace false", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawBar(0, 0, 100, 10, 0.5);
    const calls = getDrawCalls();
    const bars = calls.filter((c: any) => c.type === "bar");
    assert.equal((bars[0] as any).layer, 90);
    assert.equal((bars[0] as any).screenSpace, false);
    disableDrawCallCapture();
  });
});

describe("drawLabel visual capture", () => {
  it("logs label with correct content", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawLabel("Score: 42", 10, 20);
    const calls = getDrawCalls();
    const labels = calls.filter((c: any) => c.type === "label");
    assert.equal(labels.length, 1);
    assert.equal((labels[0] as any).content, "Score: 42");
    disableDrawCallCapture();
  });

  it("default scale 1, layer 90, screenSpace false", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawLabel("test", 0, 0);
    const calls = getDrawCalls();
    const labels = calls.filter((c: any) => c.type === "label");
    assert.equal((labels[0] as any).scale, 1);
    assert.equal((labels[0] as any).layer, 90);
    assert.equal((labels[0] as any).screenSpace, false);
    disableDrawCallCapture();
  });

  it("custom scale propagated", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    drawLabel("big", 0, 0, { scale: 3 });
    const calls = getDrawCalls();
    const labels = calls.filter((c: any) => c.type === "label");
    assert.equal((labels[0] as any).scale, 3);
    disableDrawCallCapture();
  });
});
