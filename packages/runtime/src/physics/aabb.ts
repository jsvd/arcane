/** Axis-Aligned Bounding Box */
export type AABB = {
  x: number;  // left edge
  y: number;  // top edge
  w: number;  // width
  h: number;  // height
};

/** Check if two AABBs overlap */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Check if a circle overlaps an AABB */
export function circleAABBOverlap(
  cx: number, cy: number, radius: number,
  box: AABB
): boolean {
  const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (radius * radius);
}

/** Get collision normal for circle vs AABB. Returns null if no collision. */
export function circleAABBResolve(
  cx: number, cy: number, radius: number,
  box: AABB
): { nx: number; ny: number } | null {
  const closestX = Math.max(box.x, Math.min(cx, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(cy, box.y + box.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq > radius * radius) return null;
  if (distSq === 0) {
    // Circle center is inside the box — push out along shortest axis
    const midX = box.x + box.w / 2;
    const midY = box.y + box.h / 2;
    const fromCenterX = cx - midX;
    const fromCenterY = cy - midY;
    if (Math.abs(fromCenterX / box.w) > Math.abs(fromCenterY / box.h)) {
      return { nx: fromCenterX > 0 ? 1 : -1, ny: 0 };
    } else {
      return { nx: 0, ny: fromCenterY > 0 ? 1 : -1 };
    }
  }

  const dist = Math.sqrt(distSq);
  return { nx: dx / dist, ny: dy / dist };
}
