import { describe, it, assert } from "../testing/harness.ts";
import {
  createSlider,
  updateSlider,
  getSliderHeight,
  drawSlider,
} from "./slider.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("createSlider", () => {
  it("creates slider with correct position and range", () => {
    const sl = createSlider(10, 20, 200, 0, 100, 50);
    assert.equal(sl.x, 10);
    assert.equal(sl.y, 20);
    assert.equal(sl.w, 200);
    assert.equal(sl.min, 0);
    assert.equal(sl.max, 100);
    assert.equal(sl.value, 50);
  });

  it("clamps initial value to range", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 150);
    assert.equal(sl.value, 100);
  });

  it("clamps value below min", () => {
    const sl = createSlider(0, 0, 200, 10, 100, 5);
    assert.equal(sl.value, 10);
  });

  it("accepts label", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 50, "Volume");
    assert.equal(sl.label, "Volume");
  });

  it("defaults to empty label", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 50);
    assert.equal(sl.label, "");
  });

  it("defaults to non-disabled, not dragging", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 50);
    assert.equal(sl.disabled, false);
    assert.equal(sl.dragging, false);
    assert.equal(sl.changed, false);
    assert.equal(sl.hovered, false);
  });
});

describe("getSliderHeight", () => {
  it("returns handle height when no label", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 50);
    assert.equal(getSliderHeight(sl), 20); // default handleHeight
  });

  it("includes label height when label present", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 50, "Volume");
    // 20 (handle) + 8*1 (text) + 4 (gap) = 32
    assert.equal(getSliderHeight(sl), 32);
  });
});

describe("updateSlider", () => {
  it("detects hover over track area", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    // Track area centered around y position
    updateSlider(sl, 100, 15, false);
    assert.equal(sl.hovered, true);
  });

  it("no hover when mouse is far away", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    updateSlider(sl, 500, 500, false);
    assert.equal(sl.hovered, false);
  });

  it("starts dragging on mouse down over track", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    updateSlider(sl, 110, 15, true);
    assert.equal(sl.dragging, true);
  });

  it("updates value while dragging", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    // Start drag
    updateSlider(sl, 110, 15, true);
    assert.equal(sl.dragging, true);
    // Drag to far right
    updateSlider(sl, 210, 15, true);
    assert.ok(sl.value > 50);
    assert.equal(sl.changed, true);
  });

  it("stops dragging on mouse release", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    updateSlider(sl, 110, 15, true);
    assert.equal(sl.dragging, true);
    updateSlider(sl, 110, 15, false);
    assert.equal(sl.dragging, false);
  });

  it("value clamped to min on far left drag", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    updateSlider(sl, 10, 15, true);
    updateSlider(sl, -100, 15, true);
    assert.equal(sl.value, 0);
  });

  it("value clamped to max on far right drag", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    updateSlider(sl, 110, 15, true);
    updateSlider(sl, 500, 15, true);
    assert.equal(sl.value, 100);
  });

  it("changed resets to false on frame with no value change", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    // Click at far right to change value
    updateSlider(sl, 200, 15, true);
    assert.equal(sl.changed, true);
    assert.ok(sl.value > 50);
    // Release - dragging stops, no value change
    updateSlider(sl, 200, 15, false);
    assert.equal(sl.changed, false);
    assert.equal(sl.dragging, false);
  });

  it("disabled slider ignores interaction", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 50);
    sl.disabled = true;
    updateSlider(sl, 110, 15, true);
    assert.equal(sl.dragging, false);
    assert.equal(sl.hovered, false);
    assert.equal(sl.value, 50);
  });

  it("keyboard left arrow decreases value when focused", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 50);
    sl.focused = true;
    updateSlider(sl, 500, 500, false, true, false);
    assert.ok(sl.value < 50);
    assert.equal(sl.changed, true);
  });

  it("keyboard right arrow increases value when focused", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 50);
    sl.focused = true;
    updateSlider(sl, 500, 500, false, false, true);
    assert.ok(sl.value > 50);
    assert.equal(sl.changed, true);
  });

  it("left arrow does not go below min", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 0);
    sl.focused = true;
    updateSlider(sl, 500, 500, false, true, false);
    assert.equal(sl.value, 0);
    assert.equal(sl.changed, false);
  });

  it("right arrow does not exceed max", () => {
    const sl = createSlider(0, 0, 200, 0, 100, 100);
    sl.focused = true;
    updateSlider(sl, 500, 500, false, false, true);
    assert.equal(sl.value, 100);
    assert.equal(sl.changed, false);
  });

  it("click on track sets value directly", () => {
    const sl = createSlider(10, 10, 200, 0, 100, 0);
    // Click roughly in the middle of the track
    updateSlider(sl, 110, 15, true);
    assert.ok(sl.value > 0);
    assert.equal(sl.dragging, true);
  });
});

describe("drawSlider", () => {
  it("produces track border and background rects", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 50);
    drawSlider(sl);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    // track border + track bg + track fill + handle = 4 rects
    assert.ok(rects.length >= 4, `expected at least 4 rects, got ${rects.length}`);
    disableDrawCallCapture();
  });

  it("produces fill rect proportional to value", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 50);
    drawSlider(sl);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    // With value=50, fill should be present (layer 92)
    const fillRects = rects.filter((c: any) => c.layer === 92);
    assert.equal(fillRects.length, 1, "expected fill rect at layer 92");
    disableDrawCallCapture();
  });

  it("no fill rect when value is at minimum", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 0);
    drawSlider(sl);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const fillRects = rects.filter((c: any) => c.layer === 92);
    assert.equal(fillRects.length, 0, "no fill rect when value is 0");
    disableDrawCallCapture();
  });

  it("handle rect at layer 93", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 50);
    drawSlider(sl);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const handleRects = rects.filter((c: any) => c.layer === 93);
    assert.equal(handleRects.length, 1, "expected handle rect at layer 93");
    disableDrawCallCapture();
  });

  it("all calls have screenSpace true", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 50);
    drawSlider(sl);
    const calls = getDrawCalls();
    for (const call of calls) {
      assert.equal((call as any).screenSpace, true);
    }
    disableDrawCallCapture();
  });

  it("label text when label present", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 50, "Volume");
    drawSlider(sl);
    const calls = getDrawCalls();
    const textCalls = calls.filter((c: any) => c.type === "text");
    assert.ok(textCalls.length >= 1, "expected label text call");
    assert.ok((textCalls[0] as any).content.includes("Volume"));
    disableDrawCallCapture();
  });

  it("no text calls when no label and showValue false", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 50);
    drawSlider(sl);
    const calls = getDrawCalls();
    const textCalls = calls.filter((c: any) => c.type === "text");
    assert.equal(textCalls.length, 0, "no text calls without label or showValue");
    disableDrawCallCapture();
  });

  it("value text when showValue is true", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 42, "", { showValue: true });
    drawSlider(sl);
    const calls = getDrawCalls();
    const textCalls = calls.filter((c: any) => c.type === "text");
    assert.ok(textCalls.length >= 1, "expected value text call");
    assert.ok((textCalls[0] as any).content.includes("42"));
    disableDrawCallCapture();
  });

  it("focus indicator at layer 89 when focused", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const sl = createSlider(10, 20, 200, 0, 100, 50);
    sl.focused = true;
    drawSlider(sl);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const layers = rects.map((c: any) => c.layer);
    assert.ok(layers.includes(89));
    disableDrawCallCapture();
  });
});
