import { describe, it, assert } from "../testing/harness.ts";
import {
  createButton,
  updateButton,
  hitTest,
  type ButtonState,
} from "./button.ts";

describe("hitTest", () => {
  it("returns true when point is inside rectangle", () => {
    assert.ok(hitTest(50, 50, 0, 0, 100, 100));
  });

  it("returns true on left edge", () => {
    assert.ok(hitTest(0, 50, 0, 0, 100, 100));
  });

  it("returns true on right edge", () => {
    assert.ok(hitTest(100, 50, 0, 0, 100, 100));
  });

  it("returns true on top edge", () => {
    assert.ok(hitTest(50, 0, 0, 0, 100, 100));
  });

  it("returns true on bottom edge", () => {
    assert.ok(hitTest(50, 100, 0, 0, 100, 100));
  });

  it("returns false when point is outside left", () => {
    assert.equal(hitTest(-1, 50, 0, 0, 100, 100), false);
  });

  it("returns false when point is outside right", () => {
    assert.equal(hitTest(101, 50, 0, 0, 100, 100), false);
  });

  it("returns false when point is outside top", () => {
    assert.equal(hitTest(50, -1, 0, 0, 100, 100), false);
  });

  it("returns false when point is outside bottom", () => {
    assert.equal(hitTest(50, 101, 0, 0, 100, 100), false);
  });
});

describe("createButton", () => {
  it("creates button with correct position and size", () => {
    const btn = createButton(10, 20, 100, 30, "Test");
    assert.equal(btn.x, 10);
    assert.equal(btn.y, 20);
    assert.equal(btn.w, 100);
    assert.equal(btn.h, 30);
    assert.equal(btn.label, "Test");
  });

  it("defaults to non-disabled normal state", () => {
    const btn = createButton(0, 0, 100, 30, "Test");
    assert.equal(btn.disabled, false);
    assert.equal(btn.visual, "normal");
    assert.equal(btn.clicked, false);
    assert.equal(btn.hovered, false);
    assert.equal(btn.pressed, false);
  });

  it("accepts custom style", () => {
    const style = { textScale: 2, layer: 50 };
    const btn = createButton(0, 0, 100, 30, "Test", style);
    assert.equal(btn.style.textScale, 2);
    assert.equal(btn.style.layer, 50);
  });

  it("defaults focusId to -1 and focused to false", () => {
    const btn = createButton(0, 0, 100, 30, "Test");
    assert.equal(btn.focusId, -1);
    assert.equal(btn.focused, false);
  });
});

describe("updateButton", () => {
  function makeBtn(): ButtonState {
    return createButton(100, 100, 200, 50, "Click Me");
  }

  it("sets hovered when mouse is over button", () => {
    const btn = makeBtn();
    updateButton(btn, 150, 125, false);
    assert.equal(btn.hovered, true);
    assert.equal(btn.visual, "hover");
  });

  it("sets normal when mouse is outside button", () => {
    const btn = makeBtn();
    updateButton(btn, 0, 0, false);
    assert.equal(btn.hovered, false);
    assert.equal(btn.visual, "normal");
  });

  it("sets pressed when mouse is down over button", () => {
    const btn = makeBtn();
    updateButton(btn, 150, 125, true);
    assert.equal(btn.pressed, true);
    assert.equal(btn.visual, "pressed");
  });

  it("detects click on mouse release over button", () => {
    const btn = makeBtn();
    // Frame 1: press
    updateButton(btn, 150, 125, true);
    assert.equal(btn.clicked, false);
    assert.equal(btn.pressed, true);
    // Frame 2: release while still over
    updateButton(btn, 150, 125, false);
    assert.equal(btn.clicked, true);
    assert.equal(btn.visual, "hover");
  });

  it("does not detect click when mouse released outside", () => {
    const btn = makeBtn();
    // Frame 1: press
    updateButton(btn, 150, 125, true);
    // Frame 2: move outside and release
    updateButton(btn, 0, 0, false);
    assert.equal(btn.clicked, false);
  });

  it("clicked resets to false on next frame", () => {
    const btn = makeBtn();
    updateButton(btn, 150, 125, true);
    updateButton(btn, 150, 125, false);
    assert.equal(btn.clicked, true);
    // Next frame
    updateButton(btn, 150, 125, false);
    assert.equal(btn.clicked, false);
  });

  it("disabled button shows disabled visual", () => {
    const btn = makeBtn();
    btn.disabled = true;
    updateButton(btn, 150, 125, false);
    assert.equal(btn.visual, "disabled");
    assert.equal(btn.hovered, false);
  });

  it("disabled button ignores clicks", () => {
    const btn = makeBtn();
    btn.disabled = true;
    updateButton(btn, 150, 125, true);
    updateButton(btn, 150, 125, false);
    assert.equal(btn.clicked, false);
  });

  it("disabled button ignores presses", () => {
    const btn = makeBtn();
    btn.disabled = true;
    updateButton(btn, 150, 125, true);
    assert.equal(btn.pressed, false);
  });

  it("focus activation via enter key", () => {
    const btn = makeBtn();
    btn.focused = true;
    updateButton(btn, 0, 0, false, true);
    assert.equal(btn.clicked, true);
  });

  it("focus activation ignored when disabled", () => {
    const btn = makeBtn();
    btn.focused = true;
    btn.disabled = true;
    updateButton(btn, 0, 0, false, true);
    assert.equal(btn.clicked, false);
  });

  it("hover on left edge of button", () => {
    const btn = makeBtn();
    updateButton(btn, 100, 125, false);
    assert.equal(btn.hovered, true);
  });

  it("hover on right edge of button", () => {
    const btn = makeBtn();
    updateButton(btn, 300, 125, false);
    assert.equal(btn.hovered, true);
  });

  it("no hover just past right edge", () => {
    const btn = makeBtn();
    updateButton(btn, 301, 125, false);
    assert.equal(btn.hovered, false);
  });
});
