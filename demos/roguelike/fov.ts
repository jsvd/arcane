import type { DungeonMap } from "./dungeon.ts";
import { blocksVision } from "./dungeon.ts";

export type VisibilityMap = {
  width: number;
  height: number;
  visible: boolean[][];    // currently visible this turn
  explored: boolean[][];   // ever seen
};

export function createVisibilityMap(width: number, height: number): VisibilityMap {
  const visible: boolean[][] = [];
  const explored: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    visible.push(new Array(width).fill(false));
    explored.push(new Array(width).fill(false));
  }
  return { width, height, visible, explored };
}

export function computeFOV(
  map: DungeonMap,
  ox: number, oy: number,
  radius: number,
  existing?: VisibilityMap,
): VisibilityMap {
  const vis = existing ?? createVisibilityMap(map.width, map.height);

  // Clear visible (keep explored)
  for (let y = 0; y < vis.height; y++) {
    for (let x = 0; x < vis.width; x++) {
      vis.visible[y][x] = false;
    }
  }

  // Origin is always visible
  if (ox >= 0 && ox < vis.width && oy >= 0 && oy < vis.height) {
    vis.visible[oy][ox] = true;
    vis.explored[oy][ox] = true;
  }

  // 8-octant recursive shadowcasting
  for (let octant = 0; octant < 8; octant++) {
    castLight(map, vis, ox, oy, radius, 1, 1.0, 0.0, octant);
  }

  return vis;
}

// Multipliers for the 8 octants
const MULT: number[][] = [
  [1, 0, 0, -1, -1, 0, 0, 1],  // xx
  [0, 1, -1, 0, 0, -1, 1, 0],  // xy
  [0, 1, 1, 0, 0, -1, -1, 0],  // yx
  [1, 0, 0, 1, -1, 0, 0, -1],  // yy
];

function castLight(
  map: DungeonMap,
  vis: VisibilityMap,
  ox: number, oy: number,
  radius: number,
  row: number,
  startSlope: number,
  endSlope: number,
  octant: number,
): void {
  if (startSlope < endSlope) return;

  const xx = MULT[0][octant];
  const xy = MULT[1][octant];
  const yx = MULT[2][octant];
  const yy = MULT[3][octant];

  let nextStart = startSlope;

  for (let j = row; j <= radius; j++) {
    let blocked = false;

    for (let dx = -j; dx <= 0; dx++) {
      const dy = -j;

      const mapX = ox + dx * xx + dy * xy;
      const mapY = oy + dx * yx + dy * yy;

      const leftSlope = (dx - 0.5) / (dy + 0.5);
      const rightSlope = (dx + 0.5) / (dy - 0.5);

      if (startSlope < rightSlope) continue;
      if (endSlope > leftSlope) break;

      // Check distance
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        if (mapX >= 0 && mapX < vis.width && mapY >= 0 && mapY < vis.height) {
          vis.visible[mapY][mapX] = true;
          vis.explored[mapY][mapX] = true;
        }
      }

      if (blocked) {
        if (mapX >= 0 && mapX < map.width && mapY >= 0 && mapY < map.height && blocksVision(map.tiles[mapY][mapX])) {
          nextStart = rightSlope;
          continue;
        } else {
          blocked = false;
          startSlope = nextStart;
        }
      } else if (mapX >= 0 && mapX < map.width && mapY >= 0 && mapY < map.height && blocksVision(map.tiles[mapY][mapX]) && j < radius) {
        blocked = true;
        castLight(map, vis, ox, oy, radius, j + 1, startSlope, leftSlope, octant);
        nextStart = rightSlope;
      }
    }

    if (blocked) break;
  }
}
