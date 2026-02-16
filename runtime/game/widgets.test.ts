import { describe, it, assert } from "../testing/harness.ts";
import { captureInput, autoUpdateButton, autoUpdateSlider, autoUpdateCheckbox, autoUpdateFocus } from "./widgets.ts";
import { createButton } from "../ui/button.ts";
import { createSlider } from "../ui/slider.ts";
import { createCheckbox } from "../ui/toggle.ts";
import { createFocusManager, registerFocusable } from "../ui/focus.ts";

describe("widgets", () => {
  describe("captureInput", () => {
    it("should return all expected fields", () => {
      const input = captureInput();
      assert.equal(typeof input.mouseX, "number");
      assert.equal(typeof input.mouseY, "number");
      assert.equal(typeof input.mouseDown, "boolean");
      assert.equal(typeof input.enterPressed, "boolean");
      assert.equal(typeof input.tabPressed, "boolean");
      assert.equal(typeof input.shiftDown, "boolean");
      assert.equal(typeof input.arrowLeftPressed, "boolean");
      assert.equal(typeof input.arrowRightPressed, "boolean");
      assert.equal(typeof input.arrowUpPressed, "boolean");
      assert.equal(typeof input.arrowDownPressed, "boolean");
    });

    it("should return false for all booleans in headless mode", () => {
      const input = captureInput();
      assert.equal(input.mouseDown, false);
      assert.equal(input.enterPressed, false);
      assert.equal(input.tabPressed, false);
      assert.equal(input.shiftDown, false);
      assert.equal(input.arrowLeftPressed, false);
      assert.equal(input.arrowRightPressed, false);
      assert.equal(input.arrowUpPressed, false);
      assert.equal(input.arrowDownPressed, false);
    });

    it("should return zero for mouse position in headless mode", () => {
      const input = captureInput();
      assert.equal(input.mouseX, 0);
      assert.equal(input.mouseY, 0);
    });
  });

  describe("autoUpdateButton", () => {
    it("should update button state without crash", () => {
      const btn = createButton(10, 10, 100, 30, "Test");
      const input = captureInput();
      autoUpdateButton(btn, input);
      assert.equal(btn.clicked, false);
    });

    it("should preserve button position after update", () => {
      const btn = createButton(50, 60, 120, 40, "Click Me");
      const input = captureInput();
      autoUpdateButton(btn, input);
      assert.equal(btn.x, 50);
      assert.equal(btn.y, 60);
      assert.equal(btn.w, 120);
      assert.equal(btn.h, 40);
    });
  });

  describe("autoUpdateSlider", () => {
    it("should update slider state without crash", () => {
      const slider = createSlider(10, 10, 200, 0, 100, 50);
      const input = captureInput();
      autoUpdateSlider(slider, input);
      assert.equal(slider.dragging, false);
      assert.equal(slider.changed, false);
    });

    it("should preserve slider value after update", () => {
      const slider = createSlider(10, 10, 200, 0, 100, 75);
      const input = captureInput();
      autoUpdateSlider(slider, input);
      assert.equal(slider.value, 75);
    });
  });

  describe("autoUpdateCheckbox", () => {
    it("should update checkbox state without crash", () => {
      const cb = createCheckbox(10, 10, "Enable");
      const input = captureInput();
      autoUpdateCheckbox(cb, input);
      assert.equal(cb.toggled, false);
      assert.equal(cb.checked, false);
    });

    it("should preserve checked state after update", () => {
      const cb = createCheckbox(10, 10, "Enabled", true);
      const input = captureInput();
      autoUpdateCheckbox(cb, input);
      assert.equal(cb.checked, true);
    });
  });

  describe("autoUpdateFocus", () => {
    it("should update focus manager without crash", () => {
      const fm = createFocusManager();
      const btn = createButton(10, 10, 100, 30, "A");
      registerFocusable(fm, btn);
      const input = captureInput();
      autoUpdateFocus(fm, input);
      // In headless mode tabPressed=false, so no focus change
      assert.equal(fm.focusIndex, -1);
    });

    it("should not change focus when tab not pressed", () => {
      const fm = createFocusManager();
      const btn1 = createButton(10, 10, 100, 30, "A");
      const btn2 = createButton(10, 50, 100, 30, "B");
      registerFocusable(fm, btn1);
      registerFocusable(fm, btn2);
      const input = captureInput();
      autoUpdateFocus(fm, input);
      assert.equal(btn1.focused, false);
      assert.equal(btn2.focused, false);
    });
  });
});
