export type Visibility = "hidden" | "explored" | "visible";

export type FogState = {
  width: number;
  height: number;
  visibility: readonly (readonly Visibility[])[];  // [y][x]
};

export type FogParams = {
  blocksVision: (x: number, y: number) => boolean;
  radius: number;
};
