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
 * **Performance note:** Creates a new object each call. In hot loops,
 * pre-compute colors or use {@link setAlpha}/{@link setRgb} to mutate in place.
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
export function rgb(r: number, g: number, b: number, a: number = 255): Color {
  return {
    r: r / 255.0,
    g: g / 255.0,
    b: b / 255.0,
    a: a / 255.0,
  };
}

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

/** Options for {@link drawSector}. Same as {@link ShapeOptions} (filled shape). */
export type SectorOptions = ShapeOptions;

/** Options for {@link drawEllipse}. Same as {@link ShapeOptions}. */
export type EllipseOptions = ShapeOptions;

/** Options for {@link drawRing}. Same as {@link ShapeOptions}. */
export type RingOptions = ShapeOptions;

/** Options for {@link drawCapsule}. Same as {@link ShapeOptions}. */
export type CapsuleOptions = ShapeOptions;

/** Options for {@link drawPolygon}. Same as {@link ShapeOptions}. */
export type PolygonOptions = ShapeOptions;

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
