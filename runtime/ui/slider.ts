/**
 * Immediate-mode horizontal slider widget.
 *
 * @example
 * const vol = createSlider(100, 200, 200, 0, 100, 50);
 * // In frame loop:
 * updateSlider(vol, mouseX, mouseY, mouseDown);
 * drawSlider(vol);
 * const volume = vol.value; // 0-100
 */

import type { Color } from "./types.ts";
import { drawRect } from "./primitives.ts";
import { drawText, measureText } from "../rendering/text.ts";
import { hitTest } from "./button.ts";

/** Style options for a slider. */
export type SliderStyle = {
  /** Height of the track in pixels. Default: 8. */
  trackHeight?: number;
  /** Width of the handle in pixels. Default: 16. */
  handleWidth?: number;
  /** Height of the handle in pixels. Default: 20. */
  handleHeight?: number;
  /** Track background color. */
  trackColor?: Color;
  /** Track fill color (left of handle). */
  fillColor?: Color;
  /** Handle color. */
  handleColor?: Color;
  /** Handle color when dragging. */
  handleDragColor?: Color;
  /** Handle color when hovered. */
  handleHoverColor?: Color;
  /** Border color. */
  borderColor?: Color;
  /** Label text color. */
  textColor?: Color;
  /** Text scale. Default: 1. */
  textScale?: number;
  /** Draw order layer. Default: 90. */
  layer?: number;
  /** Whether to show the current value as text. Default: false. */
  showValue?: boolean;
  /** Number of decimal places for displayed value. Default: 0. */
  decimals?: number;
};

/** Mutable state for a slider widget. */
export type SliderState = {
  /** X position in screen pixels. */
  x: number;
  /** Y position in screen pixels. */
  y: number;
  /** Total width of the slider track in screen pixels. */
  w: number;
  /** Minimum value. */
  min: number;
  /** Maximum value. */
  max: number;
  /** Current value (between min and max). */
  value: number;
  /** Optional label displayed above the slider. */
  label: string;
  /** Whether the slider is disabled. */
  disabled: boolean;
  /** True if the value changed this frame. */
  changed: boolean;
  /** Whether the mouse is hovering over the handle. */
  hovered: boolean;
  /** Whether the handle is being dragged. */
  dragging: boolean;
  /** Style overrides. */
  style: SliderStyle;
  /** Focus ID for tab navigation. */
  focusId: number;
  /** Whether this slider has focus. */
  focused: boolean;
};

const SL_TRACK: Color = { r: 0.15, g: 0.15, b: 0.2, a: 0.95 };
const SL_FILL: Color = { r: 0.2, g: 0.5, b: 0.8, a: 0.95 };
const SL_HANDLE: Color = { r: 0.6, g: 0.6, b: 0.7, a: 1 };
const SL_HANDLE_HOVER: Color = { r: 0.7, g: 0.7, b: 0.85, a: 1 };
const SL_HANDLE_DRAG: Color = { r: 0.8, g: 0.8, b: 0.95, a: 1 };
const SL_BORDER: Color = { r: 0.5, g: 0.5, b: 0.6, a: 1 };
const SL_TEXT: Color = { r: 1, g: 1, b: 1, a: 1 };
const SL_FOCUS: Color = { r: 0.4, g: 0.7, b: 1.0, a: 0.8 };

/**
 * Create a new slider state.
 *
 * @param x - X position in screen pixels.
 * @param y - Y position in screen pixels.
 * @param w - Total width of the slider track.
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @param value - Initial value.
 * @param label - Optional label text.
 * @param style - Optional style overrides.
 */
export function createSlider(
  x: number,
  y: number,
  w: number,
  min: number,
  max: number,
  value: number,
  label: string = "",
  style?: SliderStyle,
): SliderState {
  return {
    x,
    y,
    w,
    min,
    max,
    value: Math.max(min, Math.min(max, value)),
    label,
    disabled: false,
    changed: false,
    hovered: false,
    dragging: false,
    style: style ?? {},
    focusId: -1,
    focused: false,
  };
}

/**
 * Get the normalized value (0-1) of the slider.
 */
function getNormalized(sl: SliderState): number {
  if (sl.max <= sl.min) return 0;
  return (sl.value - sl.min) / (sl.max - sl.min);
}

/**
 * Get the handle X position (center of handle) in screen pixels.
 */
function getHandleX(sl: SliderState): number {
  const hw = (sl.style.handleWidth ?? 16) / 2;
  const trackUsable = sl.w - 2 * hw;
  return sl.x + hw + getNormalized(sl) * trackUsable;
}

/**
 * Set value from a screen X position on the track.
 */
function setValueFromX(sl: SliderState, screenX: number): void {
  const hw = (sl.style.handleWidth ?? 16) / 2;
  const trackUsable = sl.w - 2 * hw;
  const normalized = Math.max(0, Math.min(1, (screenX - sl.x - hw) / trackUsable));
  const newValue = sl.min + normalized * (sl.max - sl.min);
  if (newValue !== sl.value) {
    sl.value = newValue;
    sl.changed = true;
  }
}

/**
 * Get the total height of the slider (including label if present).
 */
export function getSliderHeight(sl: SliderState): number {
  const handleH = sl.style.handleHeight ?? 20;
  const textScale = sl.style.textScale ?? 1;
  let h = handleH;
  if (sl.label) {
    h += 8 * textScale + 4; // text height + gap
  }
  return h;
}

/**
 * Update slider state for this frame.
 *
 * @param sl - The slider state to update.
 * @param mouseX - Current mouse X in screen pixels.
 * @param mouseY - Current mouse Y in screen pixels.
 * @param mouseDown - Whether the left mouse button is currently held.
 * @param arrowLeftPressed - Whether left arrow was pressed (for focus). Default: false.
 * @param arrowRightPressed - Whether right arrow was pressed (for focus). Default: false.
 */
export function updateSlider(
  sl: SliderState,
  mouseX: number,
  mouseY: number,
  mouseDown: boolean,
  arrowLeftPressed: boolean = false,
  arrowRightPressed: boolean = false,
): void {
  sl.changed = false;

  if (sl.disabled) {
    sl.hovered = false;
    sl.dragging = false;
    return;
  }

  const handleW = sl.style.handleWidth ?? 16;
  const handleH = sl.style.handleHeight ?? 20;
  const trackH = sl.style.trackHeight ?? 8;
  const textScale = sl.style.textScale ?? 1;

  // Y offset of track area (below label if present)
  let trackY = sl.y;
  if (sl.label) {
    trackY += 8 * textScale + 4;
  }

  const handleX = getHandleX(sl) - handleW / 2;
  const handleY = trackY + (trackH - handleH) / 2;

  // Check handle hover
  const overHandle = hitTest(mouseX, mouseY, handleX, handleY, handleW, handleH);

  // Check track hover (for click-to-set)
  const overTrack = hitTest(mouseX, mouseY, sl.x, handleY, sl.w, handleH);

  sl.hovered = overHandle || overTrack;

  // Start dragging
  if (mouseDown && (overHandle || overTrack) && !sl.dragging) {
    sl.dragging = true;
    setValueFromX(sl, mouseX);
  }

  // Continue dragging
  if (sl.dragging && mouseDown) {
    setValueFromX(sl, mouseX);
  }

  // Stop dragging
  if (!mouseDown) {
    sl.dragging = false;
  }

  // Focus keyboard navigation
  if (sl.focused) {
    const step = (sl.max - sl.min) / 20; // 5% per press
    if (arrowLeftPressed) {
      const newVal = Math.max(sl.min, sl.value - step);
      if (newVal !== sl.value) {
        sl.value = newVal;
        sl.changed = true;
      }
    }
    if (arrowRightPressed) {
      const newVal = Math.min(sl.max, sl.value + step);
      if (newVal !== sl.value) {
        sl.value = newVal;
        sl.changed = true;
      }
    }
  }
}

/**
 * Draw the slider. Call after updateSlider() each frame.
 * No-op in headless mode.
 *
 * @param sl - The slider state to draw.
 */
export function drawSlider(sl: SliderState): void {
  const s = sl.style;
  const trackH = s.trackHeight ?? 8;
  const handleW = s.handleWidth ?? 16;
  const handleH = s.handleHeight ?? 20;
  const layer = s.layer ?? 90;
  const textScale = s.textScale ?? 1;
  const borderColor = s.borderColor ?? SL_BORDER;
  const showValue = s.showValue ?? false;
  const decimals = s.decimals ?? 0;

  let trackY = sl.y;

  // Draw label
  if (sl.label) {
    const textColor = s.textColor ?? SL_TEXT;
    drawText(sl.label, sl.x, sl.y, {
      scale: textScale,
      tint: textColor,
      layer: layer + 3,
      screenSpace: true,
    });
    trackY += 8 * textScale + 4;
  }

  const trackCenterY = trackY + (handleH - trackH) / 2;

  // Focus indicator
  if (sl.focused && !sl.disabled) {
    drawRect(sl.x - 2, trackCenterY - 2, sl.w + 4, trackH + 4, {
      color: SL_FOCUS,
      layer: layer - 1,
      screenSpace: true,
    });
  }

  // Track border
  drawRect(sl.x, trackCenterY, sl.w, trackH, {
    color: borderColor,
    layer,
    screenSpace: true,
  });

  // Track background
  const trackColor = s.trackColor ?? SL_TRACK;
  drawRect(sl.x + 1, trackCenterY + 1, sl.w - 2, trackH - 2, {
    color: trackColor,
    layer: layer + 1,
    screenSpace: true,
  });

  // Track fill (left of handle)
  const norm = getNormalized(sl);
  const fillW = (sl.w - 2) * norm;
  if (fillW > 0) {
    const fillColor = s.fillColor ?? SL_FILL;
    drawRect(sl.x + 1, trackCenterY + 1, fillW, trackH - 2, {
      color: fillColor,
      layer: layer + 2,
      screenSpace: true,
    });
  }

  // Handle
  const hx = getHandleX(sl) - handleW / 2;
  const hy = trackY;

  let handleColor: Color;
  if (sl.dragging) {
    handleColor = s.handleDragColor ?? SL_HANDLE_DRAG;
  } else if (sl.hovered) {
    handleColor = s.handleHoverColor ?? SL_HANDLE_HOVER;
  } else {
    handleColor = s.handleColor ?? SL_HANDLE;
  }

  drawRect(hx, hy, handleW, handleH, {
    color: handleColor,
    layer: layer + 3,
    screenSpace: true,
  });

  // Value text
  if (showValue) {
    const valText = sl.value.toFixed(decimals);
    const m = measureText(valText, { scale: textScale });
    drawText(valText, sl.x + sl.w + 8, trackCenterY + (trackH - m.height) / 2, {
      scale: textScale,
      tint: s.textColor ?? SL_TEXT,
      layer: layer + 3,
      screenSpace: true,
    });
  }
}
