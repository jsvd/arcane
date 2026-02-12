/**
 * Immediate-mode toggle widgets: checkbox and radio group.
 *
 * @example
 * const cb = createCheckbox(10, 10, "Enable Sound");
 * // In frame loop:
 * updateCheckbox(cb, mouseX, mouseY, mouseDown);
 * drawCheckbox(cb);
 * if (cb.checked) { enableSound(); }
 *
 * @example
 * const rg = createRadioGroup(10, 50, ["Easy", "Normal", "Hard"], 1);
 * updateRadioGroup(rg, mouseX, mouseY, mouseDown);
 * drawRadioGroup(rg);
 * const difficulty = rg.selectedIndex; // 0, 1, or 2
 */

import type { Color } from "./types.ts";
import { drawRect } from "./primitives.ts";
import { drawText, measureText } from "../rendering/text.ts";
import { hitTest } from "./button.ts";

/** Style options for a checkbox. */
export type CheckboxStyle = {
  /** Size of the checkbox box in pixels. Default: 16. */
  boxSize?: number;
  /** Gap between box and label text in pixels. Default: 6. */
  gap?: number;
  /** Box border color. */
  borderColor?: Color;
  /** Box background when unchecked. */
  uncheckedColor?: Color;
  /** Box background when checked. */
  checkedColor?: Color;
  /** Checkmark/fill color. */
  markColor?: Color;
  /** Label text color. */
  textColor?: Color;
  /** Text scale. Default: 1. */
  textScale?: number;
  /** Draw order layer. Default: 90. */
  layer?: number;
};

/** Mutable state for a checkbox widget. */
export type CheckboxState = {
  /** X position in screen pixels. */
  x: number;
  /** Y position in screen pixels. */
  y: number;
  /** Label text. */
  label: string;
  /** Whether the checkbox is checked. */
  checked: boolean;
  /** Whether the checkbox was toggled this frame. */
  toggled: boolean;
  /** Whether the mouse is hovering over the checkbox. */
  hovered: boolean;
  /** Whether the checkbox is disabled. */
  disabled: boolean;
  /** Internal: was mouse down last frame. */
  _wasDown: boolean;
  /** Style overrides. */
  style: CheckboxStyle;
  /** Focus ID for tab navigation. */
  focusId: number;
  /** Whether this checkbox has focus. */
  focused: boolean;
};

const CB_BORDER: Color = { r: 0.5, g: 0.5, b: 0.6, a: 1 };
const CB_UNCHECKED: Color = { r: 0.15, g: 0.15, b: 0.2, a: 0.95 };
const CB_CHECKED: Color = { r: 0.2, g: 0.5, b: 0.8, a: 0.95 };
const CB_MARK: Color = { r: 1, g: 1, b: 1, a: 1 };
const CB_TEXT: Color = { r: 1, g: 1, b: 1, a: 1 };
const CB_HOVER: Color = { r: 0.25, g: 0.25, b: 0.35, a: 0.95 };
const CB_FOCUS: Color = { r: 0.4, g: 0.7, b: 1.0, a: 0.8 };

/**
 * Create a new checkbox state.
 *
 * @param x - X position in screen pixels.
 * @param y - Y position in screen pixels.
 * @param label - Label text displayed next to the checkbox.
 * @param checked - Initial checked state. Default: false.
 * @param style - Optional style overrides.
 */
export function createCheckbox(
  x: number,
  y: number,
  label: string,
  checked: boolean = false,
  style?: CheckboxStyle,
): CheckboxState {
  return {
    x,
    y,
    label,
    checked,
    toggled: false,
    hovered: false,
    disabled: false,
    _wasDown: false,
    style: style ?? {},
    focusId: -1,
    focused: false,
  };
}

/**
 * Get the total hit area width of a checkbox (box + gap + label text).
 */
function checkboxWidth(cb: CheckboxState): number {
  const boxSize = cb.style.boxSize ?? 16;
  const gap = cb.style.gap ?? 6;
  const textScale = cb.style.textScale ?? 1;
  const m = measureText(cb.label, { scale: textScale });
  return boxSize + gap + m.width;
}

/**
 * Get the total hit area height of a checkbox.
 */
function checkboxHeight(cb: CheckboxState): number {
  const boxSize = cb.style.boxSize ?? 16;
  const textScale = cb.style.textScale ?? 1;
  const m = measureText(cb.label, { scale: textScale });
  return Math.max(boxSize, m.height);
}

/**
 * Update checkbox state for this frame. Call once per frame before drawCheckbox().
 *
 * @param cb - The checkbox state to update.
 * @param mouseX - Current mouse X in screen pixels.
 * @param mouseY - Current mouse Y in screen pixels.
 * @param mouseDown - Whether the left mouse button is currently held.
 * @param enterPressed - Whether Enter was pressed this frame (for focus). Default: false.
 */
export function updateCheckbox(
  cb: CheckboxState,
  mouseX: number,
  mouseY: number,
  mouseDown: boolean,
  enterPressed: boolean = false,
): void {
  cb.toggled = false;

  if (cb.disabled) {
    cb.hovered = false;
    cb._wasDown = mouseDown;
    return;
  }

  const w = checkboxWidth(cb);
  const h = checkboxHeight(cb);
  const over = hitTest(mouseX, mouseY, cb.x, cb.y, w, h);
  cb.hovered = over;

  // Click detection: was down last frame, now up, still over
  if (over && !mouseDown && cb._wasDown) {
    cb.checked = !cb.checked;
    cb.toggled = true;
  }

  // Focus activation via Enter
  if (cb.focused && enterPressed && !mouseDown) {
    cb.checked = !cb.checked;
    cb.toggled = true;
  }

  cb._wasDown = over && mouseDown;
}

/**
 * Draw the checkbox. Call after updateCheckbox() each frame.
 * No-op in headless mode.
 *
 * @param cb - The checkbox state to draw.
 */
export function drawCheckbox(cb: CheckboxState): void {
  const s = cb.style;
  const boxSize = s.boxSize ?? 16;
  const gap = s.gap ?? 6;
  const layer = s.layer ?? 90;
  const textScale = s.textScale ?? 1;
  const borderColor = s.borderColor ?? CB_BORDER;
  const bw = 2;

  // Focus indicator
  if (cb.focused && !cb.disabled) {
    drawRect(cb.x - 2, cb.y - 2, boxSize + 4, boxSize + 4, {
      color: CB_FOCUS,
      layer: layer - 1,
      screenSpace: true,
    });
  }

  // Box border
  drawRect(cb.x, cb.y, boxSize, boxSize, {
    color: borderColor,
    layer,
    screenSpace: true,
  });

  // Box fill
  let bgColor: Color;
  if (cb.checked) {
    bgColor = s.checkedColor ?? CB_CHECKED;
  } else if (cb.hovered && !cb.disabled) {
    bgColor = CB_HOVER;
  } else {
    bgColor = s.uncheckedColor ?? CB_UNCHECKED;
  }
  drawRect(cb.x + bw, cb.y + bw, boxSize - 2 * bw, boxSize - 2 * bw, {
    color: bgColor,
    layer: layer + 1,
    screenSpace: true,
  });

  // Checkmark (inner fill)
  if (cb.checked) {
    const markColor = s.markColor ?? CB_MARK;
    const inset = 4;
    drawRect(cb.x + inset, cb.y + inset, boxSize - 2 * inset, boxSize - 2 * inset, {
      color: markColor,
      layer: layer + 2,
      screenSpace: true,
    });
  }

  // Label text
  const textColor = s.textColor ?? CB_TEXT;
  const textY = cb.y + (boxSize - (8 * textScale)) / 2;
  drawText(cb.label, cb.x + boxSize + gap, textY, {
    scale: textScale,
    tint: textColor,
    layer: layer + 2,
    screenSpace: true,
  });
}

// --- Radio Group ---

/** Style options for a radio group. */
export type RadioGroupStyle = {
  /** Diameter of each radio circle in pixels. Default: 16. */
  circleSize?: number;
  /** Gap between circle and label text in pixels. Default: 6. */
  gap?: number;
  /** Vertical spacing between radio options. Default: 24. */
  spacing?: number;
  /** Circle border color. */
  borderColor?: Color;
  /** Circle fill when unselected. */
  unselectedColor?: Color;
  /** Circle fill when selected. */
  selectedColor?: Color;
  /** Inner dot color when selected. */
  dotColor?: Color;
  /** Label text color. */
  textColor?: Color;
  /** Text scale. Default: 1. */
  textScale?: number;
  /** Draw order layer. Default: 90. */
  layer?: number;
};

/** Mutable state for a radio group widget. */
export type RadioGroupState = {
  /** X position in screen pixels. */
  x: number;
  /** Y position in screen pixels. */
  y: number;
  /** Array of option labels. */
  options: string[];
  /** Currently selected index (0-based). */
  selectedIndex: number;
  /** True if selection changed this frame. */
  changed: boolean;
  /** Index of the hovered option, or -1 if none. */
  hoveredIndex: number;
  /** Whether the radio group is disabled. */
  disabled: boolean;
  /** Internal: was mouse down last frame over which index (-1 = none). */
  _wasDownIndex: number;
  /** Style overrides. */
  style: RadioGroupStyle;
  /** Focus ID for tab navigation. */
  focusId: number;
  /** Whether this radio group has focus. */
  focused: boolean;
};

const RG_BORDER: Color = { r: 0.5, g: 0.5, b: 0.6, a: 1 };
const RG_UNSELECTED: Color = { r: 0.15, g: 0.15, b: 0.2, a: 0.95 };
const RG_SELECTED: Color = { r: 0.2, g: 0.5, b: 0.8, a: 0.95 };
const RG_DOT: Color = { r: 1, g: 1, b: 1, a: 1 };
const RG_TEXT: Color = { r: 1, g: 1, b: 1, a: 1 };
const RG_HOVER: Color = { r: 0.25, g: 0.25, b: 0.35, a: 0.95 };

/**
 * Create a new radio group state.
 *
 * @param x - X position in screen pixels.
 * @param y - Y position in screen pixels.
 * @param options - Array of option label strings.
 * @param selectedIndex - Initially selected index. Default: 0.
 * @param style - Optional style overrides.
 */
export function createRadioGroup(
  x: number,
  y: number,
  options: string[],
  selectedIndex: number = 0,
  style?: RadioGroupStyle,
): RadioGroupState {
  return {
    x,
    y,
    options,
    selectedIndex: Math.max(0, Math.min(selectedIndex, options.length - 1)),
    changed: false,
    hoveredIndex: -1,
    disabled: false,
    _wasDownIndex: -1,
    style: style ?? {},
    focusId: -1,
    focused: false,
  };
}

/**
 * Update radio group state for this frame.
 *
 * @param rg - The radio group state to update.
 * @param mouseX - Current mouse X in screen pixels.
 * @param mouseY - Current mouse Y in screen pixels.
 * @param mouseDown - Whether the left mouse button is currently held.
 * @param arrowUpPressed - Whether arrow-up was pressed (for focus navigation). Default: false.
 * @param arrowDownPressed - Whether arrow-down was pressed (for focus navigation). Default: false.
 */
export function updateRadioGroup(
  rg: RadioGroupState,
  mouseX: number,
  mouseY: number,
  mouseDown: boolean,
  arrowUpPressed: boolean = false,
  arrowDownPressed: boolean = false,
): void {
  rg.changed = false;
  rg.hoveredIndex = -1;

  if (rg.disabled) {
    rg._wasDownIndex = -1;
    return;
  }

  const circleSize = rg.style.circleSize ?? 16;
  const gap = rg.style.gap ?? 6;
  const spacing = rg.style.spacing ?? 24;
  const textScale = rg.style.textScale ?? 1;

  // Check each option
  for (let i = 0; i < rg.options.length; i++) {
    const optY = rg.y + i * spacing;
    const m = measureText(rg.options[i], { scale: textScale });
    const optW = circleSize + gap + m.width;
    const optH = Math.max(circleSize, m.height);

    if (hitTest(mouseX, mouseY, rg.x, optY, optW, optH)) {
      rg.hoveredIndex = i;

      // Click detection
      if (!mouseDown && rg._wasDownIndex === i) {
        if (rg.selectedIndex !== i) {
          rg.selectedIndex = i;
          rg.changed = true;
        }
      }
    }
  }

  // Track which option was pressed
  if (mouseDown && rg.hoveredIndex >= 0) {
    rg._wasDownIndex = rg.hoveredIndex;
  } else if (!mouseDown) {
    rg._wasDownIndex = -1;
  }

  // Focus keyboard navigation
  if (rg.focused) {
    if (arrowUpPressed && rg.selectedIndex > 0) {
      rg.selectedIndex--;
      rg.changed = true;
    }
    if (arrowDownPressed && rg.selectedIndex < rg.options.length - 1) {
      rg.selectedIndex++;
      rg.changed = true;
    }
  }
}

/**
 * Draw the radio group. Call after updateRadioGroup() each frame.
 * No-op in headless mode.
 *
 * @param rg - The radio group state to draw.
 */
export function drawRadioGroup(rg: RadioGroupState): void {
  const s = rg.style;
  const circleSize = s.circleSize ?? 16;
  const gap = s.gap ?? 6;
  const spacing = s.spacing ?? 24;
  const layer = s.layer ?? 90;
  const textScale = s.textScale ?? 1;
  const borderColor = s.borderColor ?? RG_BORDER;
  const bw = 2;

  for (let i = 0; i < rg.options.length; i++) {
    const optY = rg.y + i * spacing;
    const isSelected = i === rg.selectedIndex;
    const isHovered = i === rg.hoveredIndex;

    // Focus indicator on selected option
    if (rg.focused && isSelected && !rg.disabled) {
      drawRect(rg.x - 2, optY - 2, circleSize + 4, circleSize + 4, {
        color: CB_FOCUS,
        layer: layer - 1,
        screenSpace: true,
      });
    }

    // Circle border (using a square; we don't have circle primitives)
    drawRect(rg.x, optY, circleSize, circleSize, {
      color: borderColor,
      layer,
      screenSpace: true,
    });

    // Circle fill
    let bgColor: Color;
    if (isSelected) {
      bgColor = s.selectedColor ?? RG_SELECTED;
    } else if (isHovered && !rg.disabled) {
      bgColor = RG_HOVER;
    } else {
      bgColor = s.unselectedColor ?? RG_UNSELECTED;
    }
    drawRect(rg.x + bw, optY + bw, circleSize - 2 * bw, circleSize - 2 * bw, {
      color: bgColor,
      layer: layer + 1,
      screenSpace: true,
    });

    // Selected dot
    if (isSelected) {
      const dotColor = s.dotColor ?? RG_DOT;
      const inset = 4;
      drawRect(rg.x + inset, optY + inset, circleSize - 2 * inset, circleSize - 2 * inset, {
        color: dotColor,
        layer: layer + 2,
        screenSpace: true,
      });
    }

    // Label text
    const textColor = s.textColor ?? RG_TEXT;
    const textY = optY + (circleSize - (8 * textScale)) / 2;
    drawText(rg.options[i], rg.x + circleSize + gap, textY, {
      scale: textScale,
      tint: textColor,
      layer: layer + 2,
      screenSpace: true,
    });
  }
}
