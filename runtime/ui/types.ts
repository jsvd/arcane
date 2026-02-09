/** RGBA color with 0-1 float components (matching sprite tint). */
export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

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
