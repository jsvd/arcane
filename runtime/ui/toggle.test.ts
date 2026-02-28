import { describe, it, assert } from "../testing/harness.ts";
import {
  createCheckbox,
  updateCheckbox,
  drawCheckbox,
  createRadioGroup,
  updateRadioGroup,
  drawRadioGroup,
} from "./toggle.ts";
import {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
} from "../testing/visual.ts";

describe("createCheckbox", () => {
  it("creates checkbox with correct position and label", () => {
    const cb = createCheckbox(10, 20, "Sound");
    assert.equal(cb.x, 10);
    assert.equal(cb.y, 20);
    assert.equal(cb.label, "Sound");
  });

  it("defaults to unchecked", () => {
    const cb = createCheckbox(0, 0, "Test");
    assert.equal(cb.checked, false);
  });

  it("accepts initial checked state", () => {
    const cb = createCheckbox(0, 0, "Test", true);
    assert.equal(cb.checked, true);
  });

  it("defaults to non-disabled, not toggled, not hovered", () => {
    const cb = createCheckbox(0, 0, "Test");
    assert.equal(cb.disabled, false);
    assert.equal(cb.toggled, false);
    assert.equal(cb.hovered, false);
  });
});

describe("updateCheckbox", () => {
  it("detects hover over checkbox area", () => {
    const cb = createCheckbox(10, 10, "Test");
    // Box is 16px wide + 6px gap + text. Mouse inside the box area.
    updateCheckbox(cb, 18, 18, false);
    assert.equal(cb.hovered, true);
  });

  it("no hover when mouse is far away", () => {
    const cb = createCheckbox(10, 10, "Test");
    updateCheckbox(cb, 500, 500, false);
    assert.equal(cb.hovered, false);
  });

  it("toggles on click (press then release)", () => {
    const cb = createCheckbox(10, 10, "Test");
    assert.equal(cb.checked, false);
    // Press
    updateCheckbox(cb, 18, 18, true);
    assert.equal(cb.toggled, false);
    // Release
    updateCheckbox(cb, 18, 18, false);
    assert.equal(cb.checked, true);
    assert.equal(cb.toggled, true);
  });

  it("toggles back on second click", () => {
    const cb = createCheckbox(10, 10, "Test", true);
    // Press and release
    updateCheckbox(cb, 18, 18, true);
    updateCheckbox(cb, 18, 18, false);
    assert.equal(cb.checked, false);
    assert.equal(cb.toggled, true);
  });

  it("toggled resets to false next frame", () => {
    const cb = createCheckbox(10, 10, "Test");
    updateCheckbox(cb, 18, 18, true);
    updateCheckbox(cb, 18, 18, false);
    assert.equal(cb.toggled, true);
    // Next frame
    updateCheckbox(cb, 18, 18, false);
    assert.equal(cb.toggled, false);
  });

  it("no toggle when release happens outside", () => {
    const cb = createCheckbox(10, 10, "Test");
    updateCheckbox(cb, 18, 18, true);
    updateCheckbox(cb, 500, 500, false);
    assert.equal(cb.checked, false);
    assert.equal(cb.toggled, false);
  });

  it("disabled checkbox ignores clicks", () => {
    const cb = createCheckbox(10, 10, "Test");
    cb.disabled = true;
    updateCheckbox(cb, 18, 18, true);
    updateCheckbox(cb, 18, 18, false);
    assert.equal(cb.checked, false);
    assert.equal(cb.toggled, false);
  });

  it("disabled checkbox shows no hover", () => {
    const cb = createCheckbox(10, 10, "Test");
    cb.disabled = true;
    updateCheckbox(cb, 18, 18, false);
    assert.equal(cb.hovered, false);
  });

  it("focus activation via enter key", () => {
    const cb = createCheckbox(10, 10, "Test");
    cb.focused = true;
    updateCheckbox(cb, 500, 500, false, true);
    assert.equal(cb.checked, true);
    assert.equal(cb.toggled, true);
  });
});

describe("createRadioGroup", () => {
  it("creates radio group with correct options", () => {
    const rg = createRadioGroup(10, 20, ["A", "B", "C"]);
    assert.equal(rg.x, 10);
    assert.equal(rg.y, 20);
    assert.deepEqual(rg.options, ["A", "B", "C"]);
  });

  it("defaults to first option selected", () => {
    const rg = createRadioGroup(0, 0, ["A", "B"]);
    assert.equal(rg.selectedIndex, 0);
  });

  it("accepts initial selected index", () => {
    const rg = createRadioGroup(0, 0, ["A", "B", "C"], 2);
    assert.equal(rg.selectedIndex, 2);
  });

  it("clamps selected index to valid range", () => {
    const rg = createRadioGroup(0, 0, ["A", "B"], 5);
    assert.equal(rg.selectedIndex, 1);
  });

  it("clamps negative index to 0", () => {
    const rg = createRadioGroup(0, 0, ["A", "B"], -1);
    assert.equal(rg.selectedIndex, 0);
  });

  it("defaults to not changed, not disabled", () => {
    const rg = createRadioGroup(0, 0, ["A"]);
    assert.equal(rg.changed, false);
    assert.equal(rg.disabled, false);
    assert.equal(rg.hoveredIndex, -1);
  });
});

describe("updateRadioGroup", () => {
  it("detects hover on first option", () => {
    const rg = createRadioGroup(10, 10, ["Alpha", "Beta"]);
    updateRadioGroup(rg, 18, 18, false);
    assert.equal(rg.hoveredIndex, 0);
  });

  it("detects hover on second option", () => {
    const rg = createRadioGroup(10, 10, ["Alpha", "Beta"]);
    // spacing is 24, so second option Y = 10 + 24 = 34
    updateRadioGroup(rg, 18, 40, false);
    assert.equal(rg.hoveredIndex, 1);
  });

  it("no hover when mouse is far away", () => {
    const rg = createRadioGroup(10, 10, ["Alpha"]);
    updateRadioGroup(rg, 500, 500, false);
    assert.equal(rg.hoveredIndex, -1);
  });

  it("selects option on click", () => {
    const rg = createRadioGroup(10, 10, ["Alpha", "Beta"], 0);
    // Click second option (y = 34)
    updateRadioGroup(rg, 18, 40, true);
    updateRadioGroup(rg, 18, 40, false);
    assert.equal(rg.selectedIndex, 1);
    assert.equal(rg.changed, true);
  });

  it("changed is false when clicking already-selected option", () => {
    const rg = createRadioGroup(10, 10, ["Alpha", "Beta"], 0);
    // Click first option
    updateRadioGroup(rg, 18, 18, true);
    updateRadioGroup(rg, 18, 18, false);
    assert.equal(rg.selectedIndex, 0);
    assert.equal(rg.changed, false);
  });

  it("changed resets to false next frame", () => {
    const rg = createRadioGroup(10, 10, ["Alpha", "Beta"], 0);
    updateRadioGroup(rg, 18, 40, true);
    updateRadioGroup(rg, 18, 40, false);
    assert.equal(rg.changed, true);
    updateRadioGroup(rg, 18, 40, false);
    assert.equal(rg.changed, false);
  });

  it("disabled radio group ignores clicks", () => {
    const rg = createRadioGroup(10, 10, ["Alpha", "Beta"], 0);
    rg.disabled = true;
    updateRadioGroup(rg, 18, 40, true);
    updateRadioGroup(rg, 18, 40, false);
    assert.equal(rg.selectedIndex, 0);
    assert.equal(rg.changed, false);
  });

  it("keyboard arrow down navigates to next option when focused", () => {
    const rg = createRadioGroup(10, 10, ["A", "B", "C"], 0);
    rg.focused = true;
    updateRadioGroup(rg, 500, 500, false, false, true);
    assert.equal(rg.selectedIndex, 1);
    assert.equal(rg.changed, true);
  });

  it("keyboard arrow up navigates to previous option when focused", () => {
    const rg = createRadioGroup(10, 10, ["A", "B", "C"], 2);
    rg.focused = true;
    updateRadioGroup(rg, 500, 500, false, true, false);
    assert.equal(rg.selectedIndex, 1);
    assert.equal(rg.changed, true);
  });

  it("arrow up does not go below index 0", () => {
    const rg = createRadioGroup(10, 10, ["A", "B"], 0);
    rg.focused = true;
    updateRadioGroup(rg, 500, 500, false, true, false);
    assert.equal(rg.selectedIndex, 0);
    assert.equal(rg.changed, false);
  });

  it("arrow down does not exceed last index", () => {
    const rg = createRadioGroup(10, 10, ["A", "B"], 1);
    rg.focused = true;
    updateRadioGroup(rg, 500, 500, false, false, true);
    assert.equal(rg.selectedIndex, 1);
    assert.equal(rg.changed, false);
  });
});

describe("drawCheckbox", () => {
  it("produces border and fill rects", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Test");
    drawCheckbox(cb);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    assert.ok(rects.length >= 2, "expected at least 2 rect calls (border + fill)");
    disableDrawCallCapture();
  });

  it("produces checkmark rect when checked", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Test", true);
    drawCheckbox(cb);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const checkedCount = rects.length;
    clearDrawCalls();
    const cb2 = createCheckbox(10, 20, "Test", false);
    drawCheckbox(cb2);
    const calls2 = getDrawCalls();
    const uncheckedCount = calls2.filter((c: any) => c.type === "rect").length;
    assert.ok(checkedCount > uncheckedCount, "checked should have more rects than unchecked");
    disableDrawCallCapture();
  });

  it("produces label text call", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Sound");
    drawCheckbox(cb);
    const calls = getDrawCalls();
    const textCalls = calls.filter((c: any) => c.type === "text");
    assert.ok(textCalls.length >= 1, "expected text call for label");
    assert.ok((textCalls[0] as any).content.includes("Sound"));
    disableDrawCallCapture();
  });

  it("all calls have screenSpace true", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Test");
    drawCheckbox(cb);
    const calls = getDrawCalls();
    for (const call of calls) {
      assert.equal((call as any).screenSpace, true);
    }
    disableDrawCallCapture();
  });

  it("focus indicator at layer 89 when focused", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Test");
    cb.focused = true;
    drawCheckbox(cb);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const layers = rects.map((c: any) => c.layer);
    assert.ok(layers.includes(89));
    disableDrawCallCapture();
  });

  it("no focus indicator when not focused", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Test");
    cb.focused = false;
    drawCheckbox(cb);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const layers = rects.map((c: any) => c.layer);
    assert.equal(layers.includes(89), false);
    disableDrawCallCapture();
  });

  it("no focus indicator when disabled", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Test");
    cb.focused = true;
    cb.disabled = true;
    drawCheckbox(cb);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const layers = rects.map((c: any) => c.layer);
    assert.equal(layers.includes(89), false);
    disableDrawCallCapture();
  });

  it("border at layer 90, fill at layer 91", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const cb = createCheckbox(10, 20, "Test");
    drawCheckbox(cb);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const layers = rects.map((c: any) => c.layer);
    assert.ok(layers.includes(90));
    assert.ok(layers.includes(91));
    disableDrawCallCapture();
  });
});

describe("drawRadioGroup", () => {
  it("produces rects for each option", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const rg = createRadioGroup(10, 10, ["A", "B", "C"]);
    drawRadioGroup(rg);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    // 3 options: 3 border + 3 fill + 1 dot (selected) = 7 rects
    assert.ok(rects.length >= 7, `expected at least 7 rects, got ${rects.length}`);
    disableDrawCallCapture();
  });

  it("produces text call for each option", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const rg = createRadioGroup(10, 10, ["Alpha", "Beta"]);
    drawRadioGroup(rg);
    const calls = getDrawCalls();
    const textCalls = calls.filter((c: any) => c.type === "text");
    assert.equal(textCalls.length, 2);
    assert.ok((textCalls[0] as any).content.includes("Alpha"));
    assert.ok((textCalls[1] as any).content.includes("Beta"));
    disableDrawCallCapture();
  });

  it("selected dot produces extra rect at layer 92", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const rg = createRadioGroup(10, 10, ["A", "B"], 0);
    drawRadioGroup(rg);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    // 2 border + 2 fill + 1 dot = 5
    assert.equal(rects.length, 5);
    const dotRects = rects.filter((c: any) => c.layer === 92);
    assert.equal(dotRects.length, 1);
    disableDrawCallCapture();
  });

  it("all calls have screenSpace true", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const rg = createRadioGroup(10, 10, ["A", "B"]);
    drawRadioGroup(rg);
    const calls = getDrawCalls();
    for (const call of calls) {
      assert.equal((call as any).screenSpace, true);
    }
    disableDrawCallCapture();
  });

  it("focus indicator on selected option when focused", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const rg = createRadioGroup(10, 10, ["A", "B"], 0);
    rg.focused = true;
    drawRadioGroup(rg);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const layers = rects.map((c: any) => c.layer);
    assert.ok(layers.includes(89));
    disableDrawCallCapture();
  });

  it("no focus indicator when not focused", () => {
    enableDrawCallCapture();
    clearDrawCalls();
    const rg = createRadioGroup(10, 10, ["A", "B"]);
    rg.focused = false;
    drawRadioGroup(rg);
    const calls = getDrawCalls();
    const rects = calls.filter((c: any) => c.type === "rect");
    const layers = rects.map((c: any) => c.layer);
    assert.equal(layers.includes(89), false);
    disableDrawCallCapture();
  });
});
