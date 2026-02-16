/**
 * Widget auto-wiring: capture input once per frame, pass to all widgets.
 * Eliminates the repetitive (mouseX, mouseY, mouseDown, enterPressed) args.
 */

import { getMousePosition, isMouseButtonDown, isKeyPressed, isKeyDown } from "../rendering/input.ts";
import { updateButton } from "../ui/button.ts";
import { updateSlider } from "../ui/slider.ts";
import { updateCheckbox } from "../ui/toggle.ts";
import { updateFocus } from "../ui/focus.ts";
import type { FrameInput } from "./types.ts";

// Re-import widget state types for function signatures
import type { ButtonState } from "../ui/button.ts";
import type { SliderState } from "../ui/slider.ts";
import type { CheckboxState } from "../ui/toggle.ts";
import type { FocusManagerState } from "../ui/focus.ts";

/**
 * Capture all input state needed for widget updates. Call once per frame.
 * @returns Snapshot of mouse/keyboard state for this frame.
 */
export function captureInput(): FrameInput {
  const mouse = getMousePosition();
  return {
    mouseX: mouse.x,
    mouseY: mouse.y,
    mouseDown: isMouseButtonDown(0),
    enterPressed: isKeyPressed("Enter"),
    tabPressed: isKeyPressed("Tab"),
    shiftDown: isKeyDown("Shift"),
    arrowLeftPressed: isKeyPressed("ArrowLeft"),
    arrowRightPressed: isKeyPressed("ArrowRight"),
    arrowUpPressed: isKeyPressed("ArrowUp"),
    arrowDownPressed: isKeyPressed("ArrowDown"),
  };
}

/**
 * Update a button using captured frame input.
 * @param btn - The button state to update.
 * @param input - Captured frame input from captureInput().
 */
export function autoUpdateButton(btn: ButtonState, input: FrameInput): void {
  updateButton(btn, input.mouseX, input.mouseY, input.mouseDown, input.enterPressed);
}

/**
 * Update a slider using captured frame input.
 * @param slider - The slider state to update.
 * @param input - Captured frame input from captureInput().
 */
export function autoUpdateSlider(slider: SliderState, input: FrameInput): void {
  updateSlider(slider, input.mouseX, input.mouseY, input.mouseDown,
    input.arrowLeftPressed, input.arrowRightPressed);
}

/**
 * Update a checkbox using captured frame input.
 * @param cb - The checkbox state to update.
 * @param input - Captured frame input from captureInput().
 */
export function autoUpdateCheckbox(cb: CheckboxState, input: FrameInput): void {
  updateCheckbox(cb, input.mouseX, input.mouseY, input.mouseDown, input.enterPressed);
}

/**
 * Update focus manager using captured frame input.
 * @param fm - The focus manager state to update.
 * @param input - Captured frame input from captureInput().
 */
export function autoUpdateFocus(fm: FocusManagerState, input: FrameInput): void {
  updateFocus(fm, input.tabPressed, input.shiftDown);
}
