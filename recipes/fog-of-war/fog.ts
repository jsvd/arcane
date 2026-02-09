import type { Vec2 } from "../../runtime/state/types.ts";
import { system, rule } from "../../runtime/systems/index.ts";
import { computeFov } from "./fov.ts";
import type { FogState, FogParams, Visibility } from "./types.ts";

// --- Factory ---

export function createFogState(width: number, height: number): FogState {
  const row: Visibility[] = Array.from({ length: width }, () => "hidden");
  const visibility = Array.from({ length: height }, () => [...row]);
  return { width, height, visibility };
}

// --- Query functions ---

export function isVisible(state: FogState, x: number, y: number): boolean {
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
  return state.visibility[y][x] === "visible";
}

export function isExplored(state: FogState, x: number, y: number): boolean {
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) return false;
  const v = state.visibility[y][x];
  return v === "explored" || v === "visible";
}

export function getVisibleCells(state: FogState): Vec2[] {
  const result: Vec2[] = [];
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.visibility[y][x] === "visible") {
        result.push({ x, y });
      }
    }
  }
  return result;
}

// --- Rules ---

const computeVisibility = rule<FogState>("compute-visibility")
  .then((state, args) => {
    const originX = args.x as number;
    const originY = args.y as number;
    const params = args.params as FogParams;

    // Create mutable copy: visible → explored, hidden stays hidden
    const newVis: Visibility[][] = state.visibility.map((row) =>
      row.map((v) => (v === "visible" ? "explored" : v)),
    );

    // Run shadowcasting
    computeFov(
      originX,
      originY,
      params.radius,
      state.width,
      state.height,
      params.blocksVision,
      (x, y) => {
        newVis[y][x] = "visible";
      },
    );

    return { ...state, visibility: newVis };
  });

const revealAll = rule<FogState>("reveal-all")
  .then((state) => {
    const newVis = state.visibility.map((row) =>
      row.map(() => "visible" as Visibility),
    );
    return { ...state, visibility: newVis };
  });

// --- System ---

export const fogOfWarSystem = system<FogState>("fog-of-war", [
  computeVisibility,
  revealAll,
]);
