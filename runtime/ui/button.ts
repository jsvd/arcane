/**
 * Immediate-mode button widget.
 *
 * The game owns ButtonState objects. Each frame:
 * 1. Call updateButton() with current mouse input to compute hover/press/click.
 * 2. Call drawButton() to render the button.
 *
 * @example
 * const btn = createButton(100, 200, 120, 32, "Start Game");
 * // In frame loop:
 * updateButton(btn, mouseX, mouseY, mouseDown);
 * if (btn.clicked) { startGame(); }
 * drawButton(btn);
 */

import type { Color } from "./types.ts";
import { drawRect } from "./primitives.ts";
import { drawText, measureText } from "../rendering/text.ts";

/** Visual state of a button. */
export type ButtonVisual = "normal" | "hover" | "pressed" | "disabled";

/** Style options for a button. */
export type ButtonStyle = {
  /** Background color in normal state. */
  normalColor?: Color;
  /** Background color when hovered. */
  hoverColor?: Color;
  /** Background color when pressed. */
  pressedColor?: Color;
  /** Background color when disabled. */
  disabledColor?: Color;
  /** Text color. */
  textColor?: Color;
  /** Text color when disabled. */
  disabledTextColor?: Color;
  /** Border color. */
  borderColor?: Color;
  /** Border width in pixels. Default: 2. */
  borderWidth?: number;
  /** Text scale. Default: 1. */
  textScale?: number;
  /** Draw order layer. Default: 90. */
  layer?: number;
  /** Padding inside the button around text. Default: 4. */
  padding?: number;
};

/** Mutable state for a button widget. */
export type ButtonState = {
  /** X position in screen pixels. */
  x: number;
  /** Y position in screen pixels. */
  y: number;
  /** Width in screen pixels. */
  w: number;
  /** Height in screen pixels. */
  h: number;
  /** Button label text. */
  label: string;
  /** Whether the button is disabled. */
  disabled: boolean;
  /** Current visual state (read after updateButton). */
  visual: ButtonVisual;
  /** True for exactly one frame when clicked (read after updateButton). */
  clicked: boolean;
  /** True if the mouse is over the button (read after updateButton). */
  hovered: boolean;
  /** True if the button is currently being pressed (read after updateButton). */
  pressed: boolean;
  /** Internal: was mouse down on previous frame. */
  _wasDown: boolean;
  /** Style overrides. */
  style: ButtonStyle;
  /** Focus ID for tab navigation. -1 = not focusable. */
  focusId: number;
  /** Whether this button currently has focus. */
  focused: boolean;
};

const DEFAULT_NORMAL: Color = { r: 0.25, g: 0.25, b: 0.3, a: 0.95 };
const DEFAULT_HOVER: Color = { r: 0.35, g: 0.35, b: 0.45, a: 0.95 };
const DEFAULT_PRESSED: Color = { r: 0.15, g: 0.15, b: 0.2, a: 0.95 };
const DEFAULT_DISABLED: Color = { r: 0.2, g: 0.2, b: 0.2, a: 0.6 };
const DEFAULT_TEXT: Color = { r: 1, g: 1, b: 1, a: 1 };
const DEFAULT_DISABLED_TEXT: Color = { r: 0.5, g: 0.5, b: 0.5, a: 0.8 };
const DEFAULT_BORDER: Color = { r: 0.5, g: 0.5, b: 0.6, a: 1 };

/**
 * Create a new button state object.
 *
 * @param x - X position in screen pixels.
 * @param y - Y position in screen pixels.
 * @param w - Width in screen pixels.
 * @param h - Height in screen pixels.
 * @param label - Button label text.
 * @param style - Optional style overrides.
 * @returns A new ButtonState.
 */
export function createButton(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  style?: ButtonStyle,
): ButtonState {
  return {
    x,
    y,
    w,
    h,
    label,
    disabled: false,
    visual: "normal",
    clicked: false,
    hovered: false,
    pressed: false,
    _wasDown: false,
    style: style ?? {},
    focusId: -1,
    focused: false,
  };
}

/**
 * Test whether a point is inside a rectangle.
 *
 * @param px - Point X.
 * @param py - Point Y.
 * @param rx - Rectangle X.
 * @param ry - Rectangle Y.
 * @param rw - Rectangle width.
 * @param rh - Rectangle height.
 * @returns True if point is inside the rectangle.
 */
export function hitTest(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Update button state for this frame. Call once per frame before drawButton().
 *
 * @param btn - The button state to update.
 * @param mouseX - Current mouse X in screen pixels.
 * @param mouseY - Current mouse Y in screen pixels.
 * @param mouseDown - Whether the left mouse button is currently held.
 * @param enterPressed - Whether the Enter/Return key was pressed this frame (for focus activation). Default: false.
 */
export function updateButton(
  btn: ButtonState,
  mouseX: number,
  mouseY: number,
  mouseDown: boolean,
  enterPressed: boolean = false,
): void {
  btn.clicked = false;

  if (btn.disabled) {
    btn.visual = "disabled";
    btn.hovered = false;
    btn.pressed = false;
    btn._wasDown = mouseDown;
    return;
  }

  const over = hitTest(mouseX, mouseY, btn.x, btn.y, btn.w, btn.h);
  btn.hovered = over;

  if (over && mouseDown) {
    btn.visual = "pressed";
    btn.pressed = true;
  } else if (over) {
    btn.visual = "hover";
    btn.pressed = false;
    // Click = mouse was down last frame and is now up, while still over the button
    if (btn._wasDown) {
      btn.clicked = true;
    }
  } else {
    btn.visual = "normal";
    btn.pressed = false;
  }

  // Focus activation via Enter key
  if (btn.focused && enterPressed && !mouseDown) {
    btn.clicked = true;
  }

  btn._wasDown = over && mouseDown;
}

/**
 * Draw the button. Call after updateButton() each frame.
 * No-op in headless mode.
 *
 * @param btn - The button state to draw.
 */
export function drawButton(btn: ButtonState): void {
  const s = btn.style;
  const layer = s.layer ?? 90;
  const bw = s.borderWidth ?? 2;
  const textScale = s.textScale ?? 1;
  const padding = s.padding ?? 4;

  // Pick background color based on visual state
  let bgColor: Color;
  switch (btn.visual) {
    case "hover":
      bgColor = s.hoverColor ?? DEFAULT_HOVER;
      break;
    case "pressed":
      bgColor = s.pressedColor ?? DEFAULT_PRESSED;
      break;
    case "disabled":
      bgColor = s.disabledColor ?? DEFAULT_DISABLED;
      break;
    default:
      bgColor = s.normalColor ?? DEFAULT_NORMAL;
  }

  const borderColor = s.borderColor ?? DEFAULT_BORDER;

  // Draw border
  if (bw > 0) {
    drawRect(btn.x, btn.y, btn.w, btn.h, {
      color: borderColor,
      layer,
      screenSpace: true,
    });
  }

  // Draw background (inset by border)
  drawRect(btn.x + bw, btn.y + bw, btn.w - 2 * bw, btn.h - 2 * bw, {
    color: bgColor,
    layer: layer + 1,
    screenSpace: true,
  });

  // Draw focus indicator
  if (btn.focused && btn.visual !== "disabled") {
    const focusColor: Color = { r: 0.4, g: 0.7, b: 1.0, a: 0.8 };
    drawRect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, {
      color: focusColor,
      layer: layer - 1,
      screenSpace: true,
    });
  }

  // Draw label text centered in button
  const textColor =
    btn.visual === "disabled"
      ? (s.disabledTextColor ?? DEFAULT_DISABLED_TEXT)
      : (s.textColor ?? DEFAULT_TEXT);

  const measurement = measureText(btn.label, { scale: textScale });
  const textX = btn.x + (btn.w - measurement.width) / 2;
  const textY = btn.y + (btn.h - measurement.height) / 2;

  drawText(btn.label, textX, textY, {
    scale: textScale,
    tint: textColor,
    layer: layer + 2,
    screenSpace: true,
  });
}
