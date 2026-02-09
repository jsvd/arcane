/**
 * Compute field of view using recursive shadowcasting.
 * Calls `markVisible(x, y)` for each visible cell.
 * `blocksVision(x, y)` returns true for opaque cells.
 */
export function computeFov(
  originX: number,
  originY: number,
  radius: number,
  width: number,
  height: number,
  blocksVision: (x: number, y: number) => boolean,
  markVisible: (x: number, y: number) => void,
): void {
  // Origin is always visible
  markVisible(originX, originY);

  // Scan 8 octants
  for (let octant = 0; octant < 8; octant++) {
    scanOctant(originX, originY, radius, width, height, octant, 1, 1.0, 0.0, blocksVision, markVisible);
  }
}

// Octant transforms: maps (col, row) to (dx, dy) relative to origin
function transformOctant(octant: number, col: number, row: number): [number, number] {
  switch (octant) {
    case 0: return [col, -row];
    case 1: return [row, -col];
    case 2: return [-row, -col];
    case 3: return [-col, -row];
    case 4: return [-col, row];
    case 5: return [-row, col];
    case 6: return [row, col];
    case 7: return [col, row];
    default: return [col, -row];
  }
}

function scanOctant(
  originX: number,
  originY: number,
  radius: number,
  width: number,
  height: number,
  octant: number,
  row: number,
  startSlope: number,
  endSlope: number,
  blocksVision: (x: number, y: number) => boolean,
  markVisible: (x: number, y: number) => void,
): void {
  if (startSlope < endSlope) return;
  if (row > radius) return;

  let nextStartSlope = startSlope;

  for (let currentRow = row; currentRow <= radius; currentRow++) {
    let blocked = false;

    const minCol = Math.round(currentRow * endSlope);
    const maxCol = Math.round(currentRow * startSlope);

    for (let col = maxCol; col >= minCol; col--) {
      const [dx, dy] = transformOctant(octant, col, currentRow);
      const mapX = originX + dx;
      const mapY = originY + dy;

      // Skip out of bounds
      if (mapX < 0 || mapX >= width || mapY < 0 || mapY >= height) continue;

      // Check if within radius (using Euclidean distance for smooth circles)
      const dist = Math.sqrt(col * col + currentRow * currentRow);
      if (dist > radius) continue;

      const leftSlope = (col + 0.5) / (currentRow - 0.5);
      const rightSlope = (col - 0.5) / (currentRow + 0.5);

      if (startSlope < rightSlope) continue;
      if (endSlope > leftSlope) continue;

      markVisible(mapX, mapY);

      if (blocked) {
        if (blocksVision(mapX, mapY)) {
          nextStartSlope = rightSlope;
        } else {
          blocked = false;
          startSlope = nextStartSlope;
        }
      } else if (blocksVision(mapX, mapY) && currentRow < radius) {
        blocked = true;
        scanOctant(
          originX, originY, radius, width, height, octant,
          currentRow + 1, nextStartSlope, leftSlope,
          blocksVision, markVisible,
        );
        nextStartSlope = rightSlope;
      }
    }

    if (blocked) break;
  }
}
