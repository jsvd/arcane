// Arcane Engine — UI Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/ui

declare module "@arcane/runtime/ui" {
  /**
   * RGBA color with 0.0-1.0 float components (matching sprite tint format).
   * Use {@link rgb} to create from 0-255 integer values.
   */
  export type Color = {
      /** Red channel, 0.0 (none) to 1.0 (full). */
      r: number;
      /** Green channel, 0.0 (none) to 1.0 (full). */
      g: number;
      /** Blue channel, 0.0 (none) to 1.0 (full). */
      b: number;
      /** Alpha channel, 0.0 (transparent) to 1.0 (opaque). */
      a: number;
  };
  /**
   * Create a Color from 0-255 RGB(A) integer values, auto-normalized to 0.0-1.0 range.
   *
   * @param r - Red channel, 0-255.
   * @param g - Green channel, 0-255.
   * @param b - Blue channel, 0-255.
   * @param a - Alpha channel, 0-255. Default: 255 (fully opaque).
   * @returns Color with 0.0-1.0 float components.
   *
   * @example
   * rgb(255, 128, 0)        // Orange, fully opaque
   * rgb(255, 0, 0, 128)     // Red, 50% transparent
   */
  export declare function rgb(r: number, g: number, b: number, a?: number): Color;
  /** Options for {@link drawRect}. */
  export type RectOptions = {
      /** Fill color. Default: white `{ r: 1, g: 1, b: 1, a: 1 }`. */
      color?: Color;
      /** Draw order layer. Default: 90 (below text, above game sprites). */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };
  /** Options for {@link drawPanel}. */
  export type PanelOptions = {
      /** Interior fill color. Default: dark semi-transparent `{ r: 0.1, g: 0.1, b: 0.15, a: 0.9 }`. */
      fillColor?: Color;
      /** Border color. Default: gray `{ r: 0.5, g: 0.5, b: 0.5, a: 1 }`. */
      borderColor?: Color;
      /** Border width in pixels. Default: 2. */
      borderWidth?: number;
      /** Draw order layer. Default: 90. */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };
  /** Options for {@link drawBar}. */
  export type BarOptions = {
      /** Fill/foreground color (the filled portion). Default: green. */
      fillColor?: Color;
      /** Background color (the empty portion). Default: dark red. */
      bgColor?: Color;
      /** Optional border color. No border if omitted. */
      borderColor?: Color;
      /** Border width in pixels. Default: 0 (no border). */
      borderWidth?: number;
      /** Draw order layer. Default: 90. */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };
  /** Options for shape drawing functions ({@link drawCircle}, {@link drawTriangle}). */
  export type ShapeOptions = {
      /** Fill color. Default: white `{ r: 1, g: 1, b: 1, a: 1 }`. */
      color?: Color;
      /** Draw order layer. Default: 0 (same as sprites). */
      layer?: number;
      /** If true, coordinates are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };
  /** Options for {@link drawLine}. Extends {@link ShapeOptions} with thickness. */
  export type LineOptions = ShapeOptions & {
      /** Line thickness in pixels (screenSpace) or world units. Default: 1. */
      thickness?: number;
  };
  /** Options for {@link drawArc}. Extends {@link ShapeOptions} with thickness. */
  export type ArcOptions = ShapeOptions & {
      /** Arc stroke thickness in pixels (screenSpace) or world units. Default: 2. */
      thickness?: number;
  };
  /** Options for {@link drawLabel}. */
  export type LabelOptions = {
      /** Text color. Default: white. */
      textColor?: Color;
      /** Background panel color. Default: dark semi-transparent. */
      bgColor?: Color;
      /** Border color of the background panel. Default: gray. */
      borderColor?: Color;
      /** Border width of the background panel in pixels. Default: 1. */
      borderWidth?: number;
      /** Padding between text and panel edge in pixels. Default: 4. */
      padding?: number;
      /** Text scale multiplier. Default: 1. */
      scale?: number;
      /** Draw order layer. Default: 90. */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };

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
  export declare function createButton(x: number, y: number, w: number, h: number, label: string, style?: ButtonStyle): ButtonState;
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
  export declare function hitTest(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean;
  /**
   * Update button state for this frame. Call once per frame before drawButton().
   *
   * @param btn - The button state to update.
   * @param mouseX - Current mouse X in screen pixels.
   * @param mouseY - Current mouse Y in screen pixels.
   * @param mouseDown - Whether the left mouse button is currently held.
   * @param enterPressed - Whether the Enter/Return key was pressed this frame (for focus activation). Default: false.
   */
  export declare function updateButton(btn: ButtonState, mouseX: number, mouseY: number, mouseDown: boolean, enterPressed?: boolean): void;
  /**
   * Draw the button. Call after updateButton() each frame.
   * No-op in headless mode.
   *
   * @param btn - The button state to draw.
   */
  export declare function drawButton(btn: ButtonState): void;

  /**
   * Standard color palette and layout helpers for consistent UI styling.
   */
  /**
   * Arcane UI Color Palette.
   * Pre-defined colors (0.0-1.0 RGBA) for consistent visual style across all demos.
   */
  export declare const Colors: {
      /** Bright blue. */
      readonly PRIMARY: {
          readonly r: 0.2;
          readonly g: 0.6;
          readonly b: 1;
          readonly a: 1;
      };
      /** Green (success state). */
      readonly SUCCESS: {
          readonly r: 0.2;
          readonly g: 0.8;
          readonly b: 0.3;
          readonly a: 1;
      };
      /** Orange/Yellow (warning state). */
      readonly WARNING: {
          readonly r: 1;
          readonly g: 0.7;
          readonly b: 0;
          readonly a: 1;
      };
      /** Red (danger/error state). */
      readonly DANGER: {
          readonly r: 1;
          readonly g: 0.3;
          readonly b: 0.3;
          readonly a: 1;
      };
      /** Cyan (informational). */
      readonly INFO: {
          readonly r: 0.4;
          readonly g: 0.8;
          readonly b: 0.9;
          readonly a: 1;
      };
      /** Pure white. */
      readonly WHITE: {
          readonly r: 1;
          readonly g: 1;
          readonly b: 1;
          readonly a: 1;
      };
      /** Light gray. */
      readonly LIGHT_GRAY: {
          readonly r: 0.8;
          readonly g: 0.8;
          readonly b: 0.8;
          readonly a: 1;
      };
      /** Medium gray. */
      readonly GRAY: {
          readonly r: 0.5;
          readonly g: 0.5;
          readonly b: 0.5;
          readonly a: 1;
      };
      /** Dark gray. */
      readonly DARK_GRAY: {
          readonly r: 0.3;
          readonly g: 0.3;
          readonly b: 0.3;
          readonly a: 1;
      };
      /** Pure black. */
      readonly BLACK: {
          readonly r: 0;
          readonly g: 0;
          readonly b: 0;
          readonly a: 1;
      };
      /** Dark semi-transparent background for HUD panels. */
      readonly HUD_BG: {
          readonly r: 0.1;
          readonly g: 0.1;
          readonly b: 0.15;
          readonly a: 0.85;
      };
      /** Lighter semi-transparent background for HUD panels. */
      readonly HUD_BG_LIGHT: {
          readonly r: 0.2;
          readonly g: 0.2;
          readonly b: 0.25;
          readonly a: 0.75;
      };
      /** Gold color for scores, coins, rewards. */
      readonly GOLD: {
          readonly r: 1;
          readonly g: 0.84;
          readonly b: 0;
          readonly a: 1;
      };
      /** Silver color for secondary rewards. */
      readonly SILVER: {
          readonly r: 0.75;
          readonly g: 0.75;
          readonly b: 0.75;
          readonly a: 1;
      };
      /** Bronze color for tertiary rewards. */
      readonly BRONZE: {
          readonly r: 0.8;
          readonly g: 0.5;
          readonly b: 0.2;
          readonly a: 1;
      };
      /** Bright green for victory/win state. */
      readonly WIN: {
          readonly r: 0.2;
          readonly g: 1;
          readonly b: 0.4;
          readonly a: 1;
      };
      /** Bright red for defeat/lose state. */
      readonly LOSE: {
          readonly r: 1;
          readonly g: 0.2;
          readonly b: 0.2;
          readonly a: 1;
      };
      /** Yellow for paused state. */
      readonly PAUSED: {
          readonly r: 0.9;
          readonly g: 0.9;
          readonly b: 0.2;
          readonly a: 1;
      };
  };
  /**
   * Standard HUD layout constants. All values use **logical pixels** (DPI-independent).
   * Spacing values (PADDING, LINE_HEIGHT, TEXT_SCALE) work at any resolution.
   * **Position values assume 800×600** — for other viewports, compute positions
   * from `getViewportSize()` instead (e.g. `{ x: vpW - 100, y: 10 }` for top-right).
   */
  export declare const HUDLayout: {
      /** Standard padding from screen edges in pixels. Works at any resolution. */
      readonly PADDING: 10;
      /** Vertical spacing between HUD lines in pixels. Works at any resolution. */
      readonly LINE_HEIGHT: 25;
      /** Default text scale for main HUD text. Works at any resolution. */
      readonly TEXT_SCALE: 2;
      /** Smaller text scale for secondary HUD text. Works at any resolution. */
      readonly SMALL_TEXT_SCALE: 1.5;
      /** Top-left corner position. Works at any resolution. */
      readonly TOP_LEFT: {
          readonly x: 10;
          readonly y: 10;
      };
      /** Top-right corner position. **Assumes 800px width** — use `getViewportSize()` for other sizes. */
      readonly TOP_RIGHT: {
          readonly x: 700;
          readonly y: 10;
      };
      /** Bottom-left corner position. **Assumes 600px height** — use `getViewportSize()` for other sizes. */
      readonly BOTTOM_LEFT: {
          readonly x: 10;
          readonly y: 560;
      };
      /** Bottom-right corner position. **Assumes 800×600** — use `getViewportSize()` for other sizes. */
      readonly BOTTOM_RIGHT: {
          readonly x: 700;
          readonly y: 560;
      };
      /** Screen center position. **Assumes 800×600** — use `getViewportSize()` for other sizes. */
      readonly CENTER: {
          readonly x: 400;
          readonly y: 300;
      };
  };
  /**
   * Create a semi-transparent version of a color.
   *
   * @param color - Source color.
   * @param alpha - New alpha value, 0.0 (transparent) to 1.0 (opaque).
   * @returns New Color with the same RGB but the specified alpha.
   */
  export declare function withAlpha(color: Color, alpha: number): Color;
  /**
   * Lighten a color by adding a fixed amount to each RGB channel (clamped to 1.0).
   * Useful for hover effects and highlights.
   *
   * @param color - Source color.
   * @param amount - Amount to add to each RGB channel, 0.0-1.0. Default: 0.2.
   * @returns New lightened Color (alpha unchanged).
   */
  export declare function lighten(color: Color, amount?: number): Color;
  /**
   * Darken a color by subtracting a fixed amount from each RGB channel (clamped to 0.0).
   * Useful for pressed states and shadows.
   *
   * @param color - Source color.
   * @param amount - Amount to subtract from each RGB channel, 0.0-1.0. Default: 0.2.
   * @returns New darkened Color (alpha unchanged).
   */
  export declare function darken(color: Color, amount?: number): Color;

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
  export declare function createFocusManager(): FocusManagerState;
  /**
   * Register a widget with the focus system. Assigns it a unique focusId.
   * Widgets are focused in registration order when Tab is pressed.
   *
   * @param fm - The focus manager.
   * @param widget - The widget to register (must have focusId and focused fields).
   */
  export declare function registerFocusable(fm: FocusManagerState, widget: Focusable): void;
  /**
   * Unregister a widget from the focus system.
   *
   * @param fm - The focus manager.
   * @param widget - The widget to unregister.
   */
  export declare function unregisterFocusable(fm: FocusManagerState, widget: Focusable): void;
  /**
   * Update focus state based on Tab/Shift+Tab input.
   * Call once per frame with the current keyboard state.
   *
   * @param fm - The focus manager.
   * @param tabPressed - Whether Tab was pressed this frame.
   * @param shiftDown - Whether Shift is held (for reverse navigation).
   */
  export declare function updateFocus(fm: FocusManagerState, tabPressed: boolean, shiftDown: boolean): void;
  /**
   * Clear all focus. No widget will be focused.
   *
   * @param fm - The focus manager.
   */
  export declare function clearFocus(fm: FocusManagerState): void;
  /**
   * Set focus to a specific widget.
   *
   * @param fm - The focus manager.
   * @param widget - The widget to focus.
   */
  export declare function setFocusTo(fm: FocusManagerState, widget: Focusable): void;
  /**
   * Get the currently focused widget, or null if none.
   *
   * @param fm - The focus manager.
   */
  export declare function getFocusedWidget(fm: FocusManagerState): Focusable | null;

  /**
   * Layout helpers for positioning UI widgets.
   *
   * Provides vertical stacks, horizontal rows, and screen anchoring.
   * Layout functions compute positions; they don't draw anything.
   *
   * @example
   * const positions = verticalStack(10, 10, 32, 4, 8);
   * // positions = [{x:10,y:10}, {x:10,y:50}, {x:10,y:90}, {x:10,y:130}]
   */
  /** A position returned by layout functions. */
  export type LayoutPosition = {
      x: number;
      y: number;
  };
  /** Anchor positions relative to viewport. */
  export type Anchor = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
  /**
   * Compute positions for a vertical stack of items.
   *
   * @param x - X position of the stack (all items share this X).
   * @param y - Y position of the first item.
   * @param itemHeight - Height of each item in pixels.
   * @param count - Number of items.
   * @param spacing - Vertical gap between items in pixels. Default: 4.
   * @returns Array of {x, y} positions for each item.
   */
  export declare function verticalStack(x: number, y: number, itemHeight: number, count: number, spacing?: number): LayoutPosition[];
  /**
   * Compute positions for a horizontal row of items.
   *
   * @param x - X position of the first item.
   * @param y - Y position of the row (all items share this Y).
   * @param itemWidth - Width of each item in pixels.
   * @param count - Number of items.
   * @param spacing - Horizontal gap between items in pixels. Default: 4.
   * @returns Array of {x, y} positions for each item.
   */
  export declare function horizontalRow(x: number, y: number, itemWidth: number, count: number, spacing?: number): LayoutPosition[];
  /**
   * Compute a position anchored to the viewport.
   *
   * @param anchor - Anchor position (e.g. "top-left", "center", "bottom-right").
   * @param viewportW - Viewport width in pixels.
   * @param viewportH - Viewport height in pixels.
   * @param contentW - Width of the content to anchor.
   * @param contentH - Height of the content to anchor.
   * @param padding - Padding from viewport edges. Default: 10.
   * @returns {x, y} position for the content's top-left corner.
   */
  export declare function anchorPosition(anchor: Anchor, viewportW: number, viewportH: number, contentW: number, contentH: number, padding?: number): LayoutPosition;
  /**
   * Compute positions for a vertical stack of items with varying heights.
   *
   * @param x - X position of the stack.
   * @param y - Y position of the first item.
   * @param heights - Array of item heights in pixels.
   * @param spacing - Vertical gap between items. Default: 4.
   * @returns Array of {x, y} positions for each item.
   */
  export declare function verticalStackVariableHeight(x: number, y: number, heights: number[], spacing?: number): LayoutPosition[];
  /**
   * Compute positions for a horizontal row of items with varying widths.
   *
   * @param x - X position of the first item.
   * @param y - Y position of the row.
   * @param widths - Array of item widths in pixels.
   * @param spacing - Horizontal gap between items. Default: 4.
   * @returns Array of {x, y} positions for each item.
   */
  export declare function horizontalRowVariableWidth(x: number, y: number, widths: number[], spacing?: number): LayoutPosition[];
  /**
   * Compute the total height of a vertical stack.
   *
   * @param itemHeight - Height of each item.
   * @param count - Number of items.
   * @param spacing - Gap between items. Default: 4.
   */
  export declare function verticalStackHeight(itemHeight: number, count: number, spacing?: number): number;
  /**
   * Compute the total width of a horizontal row.
   *
   * @param itemWidth - Width of each item.
   * @param count - Number of items.
   * @param spacing - Gap between items. Default: 4.
   */
  export declare function horizontalRowWidth(itemWidth: number, count: number, spacing?: number): number;

  /**
   * Color palette system for consistent theming.
   *
   * Provides a module-level palette that games can customize with setPalette().
   * Not magic — users explicitly call paletteColor("primary") in draw calls.
   *
   * @example
   * ```ts
   * import { setPalette, paletteColor } from "@arcane/runtime/ui";
   *
   * setPalette({ primary: { r: 0.2, g: 0.6, b: 1, a: 1 } });
   * drawRect(10, 10, 100, 50, { color: paletteColor("primary") });
   * ```
   */
  /** Named color palette. Standard keys have known semantics; custom keys allowed. */
  export type Palette = {
      bg: Color;
      fg: Color;
      primary: Color;
      secondary: Color;
      accent: Color;
      danger: Color;
      success: Color;
      warning: Color;
      [key: string]: Color;
  };
  /**
   * Set or update the current palette. Merges with existing — only override
   * the colors you want to change.
   */
  export declare function setPalette(palette: Record<string, Color>): void;
  /**
   * Get the full current palette object.
   */
  export declare function getPalette(): Readonly<Palette>;
  /**
   * Get a palette color by name. Returns white if the name is not found.
   */
  export declare function paletteColor(name: string): Color;
  /**
   * Reset the palette to defaults.
   */
  export declare function resetPalette(): void;

  /**
   * Draw a filled rectangle.
   * No-op in headless mode.
   *
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param w - Width in pixels (screenSpace) or world units.
   * @param h - Height in pixels (screenSpace) or world units.
   * @param options - Color, layer, and screenSpace options.
   *
   * @example
   * // Draw a red rectangle in screen space (HUD)
   * drawRect(10, 10, 200, 30, {
   *   color: { r: 1, g: 0, b: 0, a: 0.8 },
   *   screenSpace: true,
   * });
   */
  export declare function drawRect(x: number, y: number, w: number, h: number, options?: RectOptions): void;
  /**
   * Draw a panel with border and fill (5 sprites: 4 border edges + 1 fill).
   * No-op in headless mode.
   *
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param w - Total width including border.
   * @param h - Total height including border.
   * @param options - Fill color, border color, border width, layer, and screenSpace options.
   *
   * @example
   * // Draw a HUD panel
   * drawPanel(10, 10, 200, 100, {
   *   fillColor: { r: 0.1, g: 0.1, b: 0.2, a: 0.9 },
   *   borderColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
   *   borderWidth: 2,
   *   screenSpace: true,
   * });
   */
  export declare function drawPanel(x: number, y: number, w: number, h: number, options?: PanelOptions): void;
  /**
   * Draw a progress/health bar with background, fill, and optional border.
   * No-op in headless mode.
   *
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param w - Total width.
   * @param h - Total height.
   * @param fillRatio - Fill amount, 0.0 (empty) to 1.0 (full). Clamped to this range.
   * @param options - Colors, border, layer, and screenSpace options.
   */
  export declare function drawBar(x: number, y: number, w: number, h: number, fillRatio: number, options?: BarOptions): void;
  /**
   * Draw a text label with an automatic background panel.
   * Panel size is computed from the text measurement + padding.
   * No-op in headless mode.
   *
   * @param text - The text string to display.
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param options - Text color, background, border, padding, scale, layer, and screenSpace.
   */
  export declare function drawLabel(text: string, x: number, y: number, options?: LabelOptions): void;

  /**
   * Shape drawing primitives: circle, line, and triangle.
   *
   * Rendered via drawSprite() with cached solid textures — same pattern
   * as the rectangle/panel/bar primitives in primitives.ts.
   *
   * @example
   * ```ts
   * import { drawCircle, drawLine, drawTriangle } from "@arcane/runtime/ui";
   *
   * drawCircle(100, 100, 30, { color: { r: 1, g: 0, b: 0, a: 1 } });
   * drawLine(0, 0, 200, 150, { color: { r: 0, g: 1, b: 0, a: 1 }, thickness: 3 });
   * drawTriangle(50, 10, 10, 90, 90, 90, { color: { r: 0, g: 0, b: 1, a: 1 } });
   * ```
   */
  /**
   * Draw a filled circle using scanline fill (one drawSprite per pixel row).
   * No-op in headless mode.
   *
   * @param cx - Center X position (screen pixels if screenSpace, world units otherwise).
   * @param cy - Center Y position (screen pixels if screenSpace, world units otherwise).
   * @param radius - Circle radius in pixels (screenSpace) or world units.
   * @param options - Color, layer, and screenSpace options.
   *
   * @example
   * drawCircle(200, 150, 40, { color: { r: 1, g: 0, b: 0, a: 1 } });
   */
  export declare function drawCircle(cx: number, cy: number, radius: number, options?: ShapeOptions): void;
  /**
   * Draw a line between two points as a rotated rectangle.
   * No-op in headless mode.
   *
   * @param x1 - Start X position (screen pixels if screenSpace, world units otherwise).
   * @param y1 - Start Y position (screen pixels if screenSpace, world units otherwise).
   * @param x2 - End X position.
   * @param y2 - End Y position.
   * @param options - Color, thickness, layer, and screenSpace options.
   *
   * @example
   * drawLine(10, 10, 200, 150, { color: { r: 0, g: 1, b: 0, a: 1 }, thickness: 2 });
   */
  export declare function drawLine(x1: number, y1: number, x2: number, y2: number, options?: LineOptions): void;
  /**
   * Draw a filled triangle using scanline fill.
   * Vertices are sorted by Y, then edges are interpolated per row.
   * No-op in headless mode.
   *
   * @param x1 - First vertex X.
   * @param y1 - First vertex Y.
   * @param x2 - Second vertex X.
   * @param y2 - Second vertex Y.
   * @param x3 - Third vertex X.
   * @param y3 - Third vertex Y.
   * @param options - Color, layer, and screenSpace options.
   *
   * @example
   * drawTriangle(100, 10, 50, 90, 150, 90, { color: { r: 0, g: 0, b: 1, a: 1 } });
   */
  export declare function drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, options?: ShapeOptions): void;
  /**
   * Draw an arc (partial circle outline) using line segments.
   * No-op in headless mode.
   *
   * Angles are in radians, measured clockwise from the positive X axis
   * (right). A full circle is `0` to `Math.PI * 2`.
   *
   * @param cx - Center X position (screen pixels if screenSpace, world units otherwise).
   * @param cy - Center Y position (screen pixels if screenSpace, world units otherwise).
   * @param radius - Arc radius in pixels (screenSpace) or world units.
   * @param startAngle - Start angle in radians (0 = right, PI/2 = down).
   * @param endAngle - End angle in radians. Must be >= startAngle.
   * @param options - Color, thickness, layer, and screenSpace options.
   *
   * @example
   * // Shield indicator (90-degree arc above player)
   * drawArc(player.x, player.y, 24, -Math.PI * 0.75, -Math.PI * 0.25, {
   *   color: { r: 0.3, g: 0.8, b: 1, a: 0.8 }, thickness: 3,
   * });
   */
  export declare function drawArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, options?: ArcOptions): void;

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
  export declare function createSlider(x: number, y: number, w: number, min: number, max: number, value: number, label?: string, style?: SliderStyle): SliderState;
  /**
   * Get the total height of the slider (including label if present).
   */
  export declare function getSliderHeight(sl: SliderState): number;
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
  export declare function updateSlider(sl: SliderState, mouseX: number, mouseY: number, mouseDown: boolean, arrowLeftPressed?: boolean, arrowRightPressed?: boolean): void;
  /**
   * Draw the slider. Call after updateSlider() each frame.
   * No-op in headless mode.
   *
   * @param sl - The slider state to draw.
   */
  export declare function drawSlider(sl: SliderState): void;

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
  /**
   * Create a new text input state.
   *
   * @param x - X position in screen pixels.
   * @param y - Y position in screen pixels.
   * @param w - Width in screen pixels.
   * @param placeholder - Placeholder text shown when empty.
   * @param style - Optional style overrides.
   */
  export declare function createTextInput(x: number, y: number, w: number, placeholder?: string, style?: TextInputStyle): TextInputState;
  /**
   * Update text input state for this frame.
   *
   * @param ti - The text input state to update.
   * @param mouseX - Current mouse X in screen pixels.
   * @param mouseY - Current mouse Y in screen pixels.
   * @param mouseDown - Whether the left mouse button is currently held.
   * @param keys - Array of key events this frame.
   */
  export declare function updateTextInput(ti: TextInputState, mouseX: number, mouseY: number, mouseDown: boolean, keys: TextInputKeyEvent[]): void;
  /**
   * Draw the text input. Call after updateTextInput() each frame.
   * No-op in headless mode.
   *
   * @param ti - The text input state to draw.
   * @param time - Current time in seconds (for cursor blink animation).
   */
  export declare function drawTextInput(ti: TextInputState, time?: number): void;

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
  /**
   * Create a new checkbox state.
   *
   * @param x - X position in screen pixels.
   * @param y - Y position in screen pixels.
   * @param label - Label text displayed next to the checkbox.
   * @param checked - Initial checked state. Default: false.
   * @param style - Optional style overrides.
   */
  export declare function createCheckbox(x: number, y: number, label: string, checked?: boolean, style?: CheckboxStyle): CheckboxState;
  /**
   * Update checkbox state for this frame. Call once per frame before drawCheckbox().
   *
   * @param cb - The checkbox state to update.
   * @param mouseX - Current mouse X in screen pixels.
   * @param mouseY - Current mouse Y in screen pixels.
   * @param mouseDown - Whether the left mouse button is currently held.
   * @param enterPressed - Whether Enter was pressed this frame (for focus). Default: false.
   */
  export declare function updateCheckbox(cb: CheckboxState, mouseX: number, mouseY: number, mouseDown: boolean, enterPressed?: boolean): void;
  /**
   * Draw the checkbox. Call after updateCheckbox() each frame.
   * No-op in headless mode.
   *
   * @param cb - The checkbox state to draw.
   */
  export declare function drawCheckbox(cb: CheckboxState): void;
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
  /**
   * Create a new radio group state.
   *
   * @param x - X position in screen pixels.
   * @param y - Y position in screen pixels.
   * @param options - Array of option label strings.
   * @param selectedIndex - Initially selected index. Default: 0.
   * @param style - Optional style overrides.
   */
  export declare function createRadioGroup(x: number, y: number, options: string[], selectedIndex?: number, style?: RadioGroupStyle): RadioGroupState;
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
  export declare function updateRadioGroup(rg: RadioGroupState, mouseX: number, mouseY: number, mouseDown: boolean, arrowUpPressed?: boolean, arrowDownPressed?: boolean): void;
  /**
   * Draw the radio group. Call after updateRadioGroup() each frame.
   * No-op in headless mode.
   *
   * @param rg - The radio group state to draw.
   */
  export declare function drawRadioGroup(rg: RadioGroupState): void;

}
