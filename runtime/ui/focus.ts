/**
 * Focus management system for tab navigation between interactive widgets.
 *
 * Maintains an ordered list of focusable widgets. Tab/Shift+Tab cycles focus.
 * Widgets with focus get visual indicators and keyboard activation.
 *
 * @example
 * const focus = createFocusManager();
 * registerFocusable(focus, btn1);
 * registerFocusable(focus, btn2);
 * registerFocusable(focus, slider1);
 * // In frame loop:
 * updateFocus(focus, tabPressed, shiftDown);
 */

/** A widget that can receive focus. */
export type Focusable = {
  focusId: number;
  focused: boolean;
  disabled?: boolean;
};

/** State for the focus management system. */
export type FocusManagerState = {
  /** Ordered list of focusable widgets. */
  widgets: Focusable[];
  /** Index of the currently focused widget (-1 = none). */
  focusIndex: number;
  /** Auto-increment ID counter. */
  _nextId: number;
};

/**
 * Create a new focus manager.
 */
export function createFocusManager(): FocusManagerState {
  return {
    widgets: [],
    focusIndex: -1,
    _nextId: 1,
  };
}

/**
 * Register a widget with the focus system. Assigns it a unique focusId.
 * Widgets are focused in registration order when Tab is pressed.
 *
 * @param fm - The focus manager.
 * @param widget - The widget to register (must have focusId and focused fields).
 */
export function registerFocusable(
  fm: FocusManagerState,
  widget: Focusable,
): void {
  widget.focusId = fm._nextId++;
  widget.focused = false;
  fm.widgets.push(widget);
}

/**
 * Unregister a widget from the focus system.
 *
 * @param fm - The focus manager.
 * @param widget - The widget to unregister.
 */
export function unregisterFocusable(
  fm: FocusManagerState,
  widget: Focusable,
): void {
  const idx = fm.widgets.indexOf(widget);
  if (idx < 0) return;

  // If we're removing the focused widget, clear focus
  if (idx === fm.focusIndex) {
    widget.focused = false;
    fm.focusIndex = -1;
  } else if (idx < fm.focusIndex) {
    // Adjust index if removing before current focus
    fm.focusIndex--;
  }

  fm.widgets.splice(idx, 1);
}

/**
 * Update focus state based on Tab/Shift+Tab input.
 * Call once per frame with the current keyboard state.
 *
 * @param fm - The focus manager.
 * @param tabPressed - Whether Tab was pressed this frame.
 * @param shiftDown - Whether Shift is held (for reverse navigation).
 */
export function updateFocus(
  fm: FocusManagerState,
  tabPressed: boolean,
  shiftDown: boolean,
): void {
  if (!tabPressed || fm.widgets.length === 0) return;

  // Clear current focus
  if (fm.focusIndex >= 0 && fm.focusIndex < fm.widgets.length) {
    fm.widgets[fm.focusIndex].focused = false;
  }

  // Find next focusable (non-disabled) widget
  const dir = shiftDown ? -1 : 1;
  const count = fm.widgets.length;
  let startIndex = fm.focusIndex;

  // If nothing focused yet, start from the beginning (or end for shift+tab)
  if (startIndex < 0) {
    startIndex = shiftDown ? count : -1;
  }

  for (let i = 0; i < count; i++) {
    const nextIdx = ((startIndex + dir * (i + 1)) % count + count) % count;
    const widget = fm.widgets[nextIdx];
    if (!widget.disabled) {
      fm.focusIndex = nextIdx;
      widget.focused = true;
      return;
    }
  }

  // All widgets disabled, no focus
  fm.focusIndex = -1;
}

/**
 * Clear all focus. No widget will be focused.
 *
 * @param fm - The focus manager.
 */
export function clearFocus(fm: FocusManagerState): void {
  if (fm.focusIndex >= 0 && fm.focusIndex < fm.widgets.length) {
    fm.widgets[fm.focusIndex].focused = false;
  }
  fm.focusIndex = -1;
}

/**
 * Set focus to a specific widget.
 *
 * @param fm - The focus manager.
 * @param widget - The widget to focus.
 */
export function setFocusTo(
  fm: FocusManagerState,
  widget: Focusable,
): void {
  // Clear current
  clearFocus(fm);

  const idx = fm.widgets.indexOf(widget);
  if (idx >= 0 && !widget.disabled) {
    fm.focusIndex = idx;
    widget.focused = true;
  }
}

/**
 * Get the currently focused widget, or null if none.
 *
 * @param fm - The focus manager.
 */
export function getFocusedWidget(fm: FocusManagerState): Focusable | null {
  if (fm.focusIndex < 0 || fm.focusIndex >= fm.widgets.length) return null;
  return fm.widgets[fm.focusIndex];
}
