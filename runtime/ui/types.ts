/** RGBA color with 0-1 float components (matching sprite tint). */
export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

/**
 * Create a Color from 0-255 RGB(A) values, auto-normalized to 0.0-1.0 range.
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

export type RectOptions = {
  color?: Color;
  layer?: number;
  screenSpace?: boolean;
};

export type PanelOptions = {
  fillColor?: Color;
  borderColor?: Color;
  borderWidth?: number;
  layer?: number;
  screenSpace?: boolean;
};

export type BarOptions = {
  fillColor?: Color;
  bgColor?: Color;
  borderColor?: Color;
  borderWidth?: number;
  layer?: number;
  screenSpace?: boolean;
};

export type LabelOptions = {
  textColor?: Color;
  bgColor?: Color;
  borderColor?: Color;
  borderWidth?: number;
  padding?: number;
  scale?: number;
  layer?: number;
  screenSpace?: boolean;
};
