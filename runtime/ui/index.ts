export type { Color, RectOptions, PanelOptions, BarOptions, LabelOptions, ShapeOptions, LineOptions } from "./types.ts";
export { rgb } from "./types.ts";
export { drawRect, drawPanel, drawBar, drawLabel } from "./primitives.ts";
export { drawCircle, drawLine, drawTriangle } from "./shapes.ts";
export { Colors, HUDLayout, withAlpha, lighten, darken } from "./colors.ts";

// Interactive UI widgets (Phase 16)
export type { ButtonVisual, ButtonStyle, ButtonState } from "./button.ts";
export { createButton, updateButton, drawButton, hitTest } from "./button.ts";

export type { CheckboxStyle, CheckboxState, RadioGroupStyle, RadioGroupState } from "./toggle.ts";
export { createCheckbox, updateCheckbox, drawCheckbox, createRadioGroup, updateRadioGroup, drawRadioGroup } from "./toggle.ts";

export type { SliderStyle, SliderState } from "./slider.ts";
export { createSlider, updateSlider, drawSlider, getSliderHeight } from "./slider.ts";

export type { TextInputStyle, TextInputKeyEvent, TextInputState } from "./text-input.ts";
export { createTextInput, updateTextInput, drawTextInput } from "./text-input.ts";

export type { LayoutPosition, Anchor } from "./layout.ts";
export { verticalStack, horizontalRow, anchorPosition, verticalStackVariableHeight, horizontalRowVariableWidth, verticalStackHeight, horizontalRowWidth } from "./layout.ts";

export type { Focusable, FocusManagerState } from "./focus.ts";
export { createFocusManager, registerFocusable, unregisterFocusable, updateFocus, clearFocus, setFocusTo, getFocusedWidget } from "./focus.ts";

// Palette / theming
export type { Palette } from "./palette.ts";
export { setPalette, getPalette, paletteColor, resetPalette } from "./palette.ts";
