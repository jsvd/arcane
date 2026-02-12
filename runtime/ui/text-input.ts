/**
 * Immediate-mode single-line text input widget.
 *
 * @example
 * const name = createTextInput(100, 200, 200, "Player Name");
 * // In frame loop:
 * updateTextInput(name, mouseX, mouseY, mouseDown, keys);
 * drawTextInput(name, totalTime);
 * const text = name.text;
 */

import type { Color } from "./types.ts";
import { drawRect } from "./primitives.ts";
import { drawText, measureText } from "../rendering/text.ts";
import { hitTest } from "./button.ts";

/** Style options for a text input. */
export type TextInputStyle = {
  /** Input field height in pixels. Default: 24. */
  height?: number;
  /** Background color. */
  bgColor?: Color;
  /** Background color when focused. */
  focusedBgColor?: Color;
  /** Border color. */
  borderColor?: Color;
  /** Border color when focused. */
  focusedBorderColor?: Color;
  /** Text color. */
  textColor?: Color;
  /** Placeholder text color. */
  placeholderColor?: Color;
  /** Cursor color. */
  cursorColor?: Color;
  /** Selection highlight color. */
  selectionColor?: Color;
  /** Text scale. Default: 1. */
  textScale?: number;
  /** Internal padding in pixels. Default: 4. */
  padding?: number;
  /** Draw order layer. Default: 90. */
  layer?: number;
  /** Border width in pixels. Default: 2. */
  borderWidth?: number;
};

/** Key event data passed to updateTextInput. */
export type TextInputKeyEvent = {
  /** The key name (e.g. "a", "Backspace", "ArrowLeft"). */
  key: string;
  /** Whether this key was just pressed this frame. */
  pressed: boolean;
};

/** Mutable state for a text input widget. */
export type TextInputState = {
  /** X position in screen pixels. */
  x: number;
  /** Y position in screen pixels. */
  y: number;
  /** Width in screen pixels. */
  w: number;
  /** Current text content. */
  text: string;
  /** Placeholder text shown when empty. */
  placeholder: string;
  /** Cursor position (character index). */
  cursorPos: number;
  /** Whether the input has focus (accepts keyboard input). */
  active: boolean;
  /** Whether the input is disabled. */
  disabled: boolean;
  /** Whether the text was modified this frame. */
  changed: boolean;
  /** Whether the mouse is hovering over the input. */
  hovered: boolean;
  /** Maximum allowed text length. 0 = unlimited. */
  maxLength: number;
  /** Style overrides. */
  style: TextInputStyle;
  /** Focus ID for tab navigation. */
  focusId: number;
  /** Whether this input has focus (alias for active, used by focus system). */
  focused: boolean;
};

const TI_BG: Color = { r: 0.12, g: 0.12, b: 0.17, a: 0.95 };
const TI_BG_FOCUS: Color = { r: 0.15, g: 0.15, b: 0.22, a: 0.95 };
const TI_BORDER: Color = { r: 0.4, g: 0.4, b: 0.5, a: 1 };
const TI_BORDER_FOCUS: Color = { r: 0.4, g: 0.6, b: 1.0, a: 1 };
const TI_TEXT: Color = { r: 1, g: 1, b: 1, a: 1 };
const TI_PLACEHOLDER: Color = { r: 0.4, g: 0.4, b: 0.5, a: 0.7 };
const TI_CURSOR: Color = { r: 1, g: 1, b: 1, a: 1 };

/**
 * Create a new text input state.
 *
 * @param x - X position in screen pixels.
 * @param y - Y position in screen pixels.
 * @param w - Width in screen pixels.
 * @param placeholder - Placeholder text shown when empty.
 * @param style - Optional style overrides.
 */
export function createTextInput(
  x: number,
  y: number,
  w: number,
  placeholder: string = "",
  style?: TextInputStyle,
): TextInputState {
  return {
    x,
    y,
    w,
    text: "",
    placeholder,
    cursorPos: 0,
    active: false,
    disabled: false,
    changed: false,
    hovered: false,
    maxLength: 0,
    style: style ?? {},
    focusId: -1,
    focused: false,
  };
}

/**
 * Check if a character is a printable ASCII character (space through tilde).
 */
function isPrintable(key: string): boolean {
  return key.length === 1 && key.charCodeAt(0) >= 32 && key.charCodeAt(0) <= 126;
}

/**
 * Update text input state for this frame.
 *
 * @param ti - The text input state to update.
 * @param mouseX - Current mouse X in screen pixels.
 * @param mouseY - Current mouse Y in screen pixels.
 * @param mouseDown - Whether the left mouse button is currently held.
 * @param keys - Array of key events this frame.
 */
export function updateTextInput(
  ti: TextInputState,
  mouseX: number,
  mouseY: number,
  mouseDown: boolean,
  keys: TextInputKeyEvent[],
): void {
  ti.changed = false;

  if (ti.disabled) {
    ti.hovered = false;
    return;
  }

  const h = ti.style.height ?? 24;
  const over = hitTest(mouseX, mouseY, ti.x, ti.y, ti.w, h);
  ti.hovered = over;

  // Click to focus/defocus
  if (mouseDown) {
    const wasActive = ti.active;
    ti.active = over;
    ti.focused = over;
    // On click, position cursor at end (simplified)
    if (over && !wasActive) {
      ti.cursorPos = ti.text.length;
    }
  }

  // Process key events only when active
  if (!ti.active) return;

  for (const ev of keys) {
    if (!ev.pressed) continue;

    if (ev.key === "Backspace") {
      if (ti.cursorPos > 0) {
        ti.text = ti.text.slice(0, ti.cursorPos - 1) + ti.text.slice(ti.cursorPos);
        ti.cursorPos--;
        ti.changed = true;
      }
    } else if (ev.key === "Delete") {
      if (ti.cursorPos < ti.text.length) {
        ti.text = ti.text.slice(0, ti.cursorPos) + ti.text.slice(ti.cursorPos + 1);
        ti.changed = true;
      }
    } else if (ev.key === "ArrowLeft") {
      if (ti.cursorPos > 0) ti.cursorPos--;
    } else if (ev.key === "ArrowRight") {
      if (ti.cursorPos < ti.text.length) ti.cursorPos++;
    } else if (ev.key === "Home") {
      ti.cursorPos = 0;
    } else if (ev.key === "End") {
      ti.cursorPos = ti.text.length;
    } else if (isPrintable(ev.key)) {
      if (ti.maxLength > 0 && ti.text.length >= ti.maxLength) continue;
      ti.text = ti.text.slice(0, ti.cursorPos) + ev.key + ti.text.slice(ti.cursorPos);
      ti.cursorPos++;
      ti.changed = true;
    }
  }
}

/**
 * Draw the text input. Call after updateTextInput() each frame.
 * No-op in headless mode.
 *
 * @param ti - The text input state to draw.
 * @param time - Current time in seconds (for cursor blink animation).
 */
export function drawTextInput(ti: TextInputState, time: number = 0): void {
  const s = ti.style;
  const h = s.height ?? 24;
  const layer = s.layer ?? 90;
  const bw = s.borderWidth ?? 2;
  const padding = s.padding ?? 4;
  const textScale = s.textScale ?? 1;

  // Border color
  const borderColor = ti.active
    ? (s.focusedBorderColor ?? TI_BORDER_FOCUS)
    : (s.borderColor ?? TI_BORDER);

  // Background
  const bgColor = ti.active
    ? (s.focusedBgColor ?? TI_BG_FOCUS)
    : (s.bgColor ?? TI_BG);

  // Draw border
  drawRect(ti.x, ti.y, ti.w, h, {
    color: borderColor,
    layer,
    screenSpace: true,
  });

  // Draw background
  drawRect(ti.x + bw, ti.y + bw, ti.w - 2 * bw, h - 2 * bw, {
    color: bgColor,
    layer: layer + 1,
    screenSpace: true,
  });

  // Draw text or placeholder
  const textY = ti.y + (h - 8 * textScale) / 2;

  if (ti.text.length > 0) {
    const textColor = s.textColor ?? TI_TEXT;
    drawText(ti.text, ti.x + padding, textY, {
      scale: textScale,
      tint: textColor,
      layer: layer + 2,
      screenSpace: true,
    });
  } else if (ti.placeholder) {
    const placeholderColor = s.placeholderColor ?? TI_PLACEHOLDER;
    drawText(ti.placeholder, ti.x + padding, textY, {
      scale: textScale,
      tint: placeholderColor,
      layer: layer + 2,
      screenSpace: true,
    });
  }

  // Draw cursor (blinking)
  if (ti.active) {
    const blinkOn = Math.floor(time * 2) % 2 === 0;
    if (blinkOn) {
      const cursorX = ti.x + padding + ti.cursorPos * 8 * textScale;
      const cursorColor = s.cursorColor ?? TI_CURSOR;
      drawRect(cursorX, ti.y + bw + 2, 2, h - 2 * bw - 4, {
        color: cursorColor,
        layer: layer + 3,
        screenSpace: true,
      });
    }
  }
}
