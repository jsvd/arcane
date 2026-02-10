/**
 * Axis-Aligned Bounding Box for 2D collision detection.
 * Defined by its top-left corner and dimensions.
 *
 * - `x` - Left edge position (world units).
 * - `y` - Top edge position (world units).
 * - `w` - Width. Must be >= 0.
 * - `h` - Height. Must be >= 0.
 */
export type AABB = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Check if two AABBs overlap. Pure function.
 * Uses the separating axis theorem — returns true if there is no gap between
 * the boxes on either the X or Y axis.
 *
 * @param a - First bounding box.
 * @param b - Second bounding box.
 * @returns True if the boxes overlap (touching edges do not count as overlap).
 *
 * @example
 * const player = { x: 10, y: 10, w: 16, h: 16 };
 * const enemy = { x: 20, y: 10, w: 16, h: 16 };
 * if (aabbOverlap(player, enemy)) {
 *   // Handle collision
 * }
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Check if a circle overlaps an AABB. Pure function.
 * Finds the closest point on the AABB to the circle center
 * and checks if it's within the radius.
 *
 * @param cx - Circle center X position.
 * @param cy - Circle center Y position.
 * @param radius - Circle radius. Must be >= 0.
 * @param box - The AABB to test against.
 * @returns True if the circle and AABB overlap (inclusive of touching).
 */
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

/**
 * Get the collision resolution normal for a circle vs AABB collision.
 * Returns a unit normal vector pointing from the AABB toward the circle center,
 * or null if there is no collision.
 *
 * When the circle center is inside the AABB, pushes out along the shortest axis
 * relative to the box center.
 *
 * @param cx - Circle center X position.
 * @param cy - Circle center Y position.
 * @param radius - Circle radius. Must be >= 0.
 * @param box - The AABB to resolve against.
 * @returns Object with `nx` and `ny` (unit normal), or null if no collision.
 *          nx and ny are in the range [-1, 1] and form a unit vector.
 */
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
