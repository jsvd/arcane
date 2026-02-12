import { describe, it, assert } from "../testing/harness.ts";
import {
  createFocusManager,
  registerFocusable,
  unregisterFocusable,
  updateFocus,
  clearFocus,
  setFocusTo,
  getFocusedWidget,
  type Focusable,
} from "./focus.ts";

function makeWidget(): Focusable {
  return { focusId: -1, focused: false };
}

function makeDisabledWidget(): Focusable {
  return { focusId: -1, focused: false, disabled: true };
}

describe("createFocusManager", () => {
  it("creates empty focus manager", () => {
    const fm = createFocusManager();
    assert.equal(fm.widgets.length, 0);
    assert.equal(fm.focusIndex, -1);
  });
});

describe("registerFocusable", () => {
  it("assigns unique focus IDs", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    assert.notEqual(w1.focusId, w2.focusId);
    assert.ok(w1.focusId > 0);
    assert.ok(w2.focusId > 0);
  });

  it("adds widget to the list", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    registerFocusable(fm, w);
    assert.equal(fm.widgets.length, 1);
    assert.equal(fm.widgets[0], w);
  });

  it("sets focused to false on registration", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    w.focused = true;
    registerFocusable(fm, w);
    assert.equal(w.focused, false);
  });
});

describe("unregisterFocusable", () => {
  it("removes widget from list", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    registerFocusable(fm, w);
    unregisterFocusable(fm, w);
    assert.equal(fm.widgets.length, 0);
  });

  it("clears focus if removing focused widget", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    registerFocusable(fm, w);
    setFocusTo(fm, w);
    assert.equal(w.focused, true);
    unregisterFocusable(fm, w);
    assert.equal(w.focused, false);
    assert.equal(fm.focusIndex, -1);
  });

  it("adjusts focus index when removing before focused widget", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    const w3 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    registerFocusable(fm, w3);
    setFocusTo(fm, w3); // index 2
    unregisterFocusable(fm, w1); // remove index 0
    assert.equal(fm.focusIndex, 1); // adjusted from 2 to 1
    assert.equal(w3.focused, true);
  });

  it("does nothing for unregistered widget", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    unregisterFocusable(fm, w); // should not throw
    assert.equal(fm.widgets.length, 0);
  });
});

describe("updateFocus", () => {
  it("tab focuses first widget when nothing focused", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    updateFocus(fm, true, false);
    assert.equal(w1.focused, true);
    assert.equal(w2.focused, false);
    assert.equal(fm.focusIndex, 0);
  });

  it("tab advances to next widget", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    updateFocus(fm, true, false); // focus w1
    updateFocus(fm, true, false); // focus w2
    assert.equal(w1.focused, false);
    assert.equal(w2.focused, true);
  });

  it("tab wraps around to first widget", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    updateFocus(fm, true, false); // w1
    updateFocus(fm, true, false); // w2
    updateFocus(fm, true, false); // wraps to w1
    assert.equal(w1.focused, true);
    assert.equal(w2.focused, false);
  });

  it("shift+tab goes backward", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    const w3 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    registerFocusable(fm, w3);
    updateFocus(fm, true, false); // w1
    updateFocus(fm, true, false); // w2
    updateFocus(fm, true, true);  // shift+tab: w1
    assert.equal(w1.focused, true);
    assert.equal(w2.focused, false);
  });

  it("shift+tab from first wraps to last", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    updateFocus(fm, true, false);  // w1
    updateFocus(fm, true, true);   // shift+tab: wraps to w2
    assert.equal(w2.focused, true);
    assert.equal(w1.focused, false);
  });

  it("skips disabled widgets", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeDisabledWidget();
    const w3 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    registerFocusable(fm, w3);
    updateFocus(fm, true, false); // w1
    updateFocus(fm, true, false); // skips w2, goes to w3
    assert.equal(w1.focused, false);
    assert.equal(w2.focused, false);
    assert.equal(w3.focused, true);
  });

  it("does nothing when tab not pressed", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    registerFocusable(fm, w);
    updateFocus(fm, false, false);
    assert.equal(w.focused, false);
    assert.equal(fm.focusIndex, -1);
  });

  it("does nothing when no widgets registered", () => {
    const fm = createFocusManager();
    updateFocus(fm, true, false); // should not throw
    assert.equal(fm.focusIndex, -1);
  });

  it("handles all widgets disabled", () => {
    const fm = createFocusManager();
    const w1 = makeDisabledWidget();
    const w2 = makeDisabledWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    updateFocus(fm, true, false);
    assert.equal(fm.focusIndex, -1);
    assert.equal(w1.focused, false);
    assert.equal(w2.focused, false);
  });
});

describe("clearFocus", () => {
  it("clears focus from current widget", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    registerFocusable(fm, w);
    updateFocus(fm, true, false);
    assert.equal(w.focused, true);
    clearFocus(fm);
    assert.equal(w.focused, false);
    assert.equal(fm.focusIndex, -1);
  });

  it("does nothing when nothing is focused", () => {
    const fm = createFocusManager();
    clearFocus(fm); // should not throw
    assert.equal(fm.focusIndex, -1);
  });
});

describe("setFocusTo", () => {
  it("focuses a specific widget", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    setFocusTo(fm, w2);
    assert.equal(w2.focused, true);
    assert.equal(w1.focused, false);
    assert.equal(fm.focusIndex, 1);
  });

  it("clears previous focus", () => {
    const fm = createFocusManager();
    const w1 = makeWidget();
    const w2 = makeWidget();
    registerFocusable(fm, w1);
    registerFocusable(fm, w2);
    setFocusTo(fm, w1);
    assert.equal(w1.focused, true);
    setFocusTo(fm, w2);
    assert.equal(w1.focused, false);
    assert.equal(w2.focused, true);
  });

  it("ignores disabled widget", () => {
    const fm = createFocusManager();
    const w = makeDisabledWidget();
    registerFocusable(fm, w);
    setFocusTo(fm, w);
    assert.equal(w.focused, false);
    assert.equal(fm.focusIndex, -1);
  });

  it("ignores unregistered widget", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    setFocusTo(fm, w);
    assert.equal(fm.focusIndex, -1);
  });
});

describe("getFocusedWidget", () => {
  it("returns focused widget", () => {
    const fm = createFocusManager();
    const w = makeWidget();
    registerFocusable(fm, w);
    setFocusTo(fm, w);
    assert.equal(getFocusedWidget(fm), w);
  });

  it("returns null when nothing focused", () => {
    const fm = createFocusManager();
    assert.equal(getFocusedWidget(fm), null);
  });
});
