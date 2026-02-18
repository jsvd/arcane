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

/**
 * Sweep a moving circle against a static AABB and return the first hit.
 *
 * Expands the AABB by the circle's radius (Minkowski sum), then raycasts
 * from the circle center along its velocity. Handles edge and corner cases.
 *
 * @param cx - Circle center X at start of frame.
 * @param cy - Circle center Y at start of frame.
 * @param vx - Circle X velocity (pixels per frame or per second — same units as box).
 * @param vy - Circle Y velocity.
 * @param radius - Circle radius. Must be >= 0.
 * @param box - The static AABB to sweep against.
 * @returns Hit result with `t` (fraction 0..1 along velocity), `nx`/`ny` (surface normal),
 *          and `hitX`/`hitY` (contact point on AABB surface). Returns null if no hit.
 *
 * @example
 * const hit = sweepCircleAABB(bullet.x, bullet.y, bullet.vx * dt, bullet.vy * dt, 4, wall);
 * if (hit) {
 *   bullet.x += bullet.vx * dt * hit.t;
 *   bullet.y += bullet.vy * dt * hit.t;
 *   // Reflect: bullet.vx -= 2 * (bullet.vx * hit.nx) * hit.nx;
 * }
 */
export function sweepCircleAABB(
  cx: number, cy: number,
  vx: number, vy: number,
  radius: number,
  box: AABB,
): { t: number; nx: number; ny: number; hitX: number; hitY: number } | null {
  // Already overlapping — return immediate contact
  if (circleAABBOverlap(cx, cy, radius, box)) {
    const resolve = circleAABBResolve(cx, cy, radius, box);
    if (resolve) {
      return { t: 0, nx: resolve.nx, ny: resolve.ny, hitX: cx, hitY: cy };
    }
  }

  // Minkowski expansion: expand AABB by radius on each side
  const expanded: AABB = {
    x: box.x - radius,
    y: box.y - radius,
    w: box.w + radius * 2,
    h: box.h + radius * 2,
  };

  // Raycast circle center against expanded AABB
  let tMin = Infinity;
  let hitNx = 0;
  let hitNy = 0;

  // Check each face of the expanded AABB
  // Left face (x = expanded.x, normal = -1, 0)
  if (vx > 0) {
    const t = (expanded.x - cx) / vx;
    if (t >= 0 && t <= 1) {
      const hy = cy + vy * t;
      if (hy >= expanded.y && hy <= expanded.y + expanded.h && t < tMin) {
        tMin = t; hitNx = -1; hitNy = 0;
      }
    }
  }
  // Right face (x = expanded.x + expanded.w, normal = 1, 0)
  if (vx < 0) {
    const t = (expanded.x + expanded.w - cx) / vx;
    if (t >= 0 && t <= 1) {
      const hy = cy + vy * t;
      if (hy >= expanded.y && hy <= expanded.y + expanded.h && t < tMin) {
        tMin = t; hitNx = 1; hitNy = 0;
      }
    }
  }
  // Top face (y = expanded.y, normal = 0, -1)
  if (vy > 0) {
    const t = (expanded.y - cy) / vy;
    if (t >= 0 && t <= 1) {
      const hx = cx + vx * t;
      if (hx >= expanded.x && hx <= expanded.x + expanded.w && t < tMin) {
        tMin = t; hitNx = 0; hitNy = -1;
      }
    }
  }
  // Bottom face (y = expanded.y + expanded.h, normal = 0, 1)
  if (vy < 0) {
    const t = (expanded.y + expanded.h - cy) / vy;
    if (t >= 0 && t <= 1) {
      const hx = cx + vx * t;
      if (hx >= expanded.x && hx <= expanded.x + expanded.w && t < tMin) {
        tMin = t; hitNx = 0; hitNy = 1;
      }
    }
  }

  // Check corners (circle may hit a rounded corner of the Minkowski sum)
  const corners = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x, box.y + box.h],
    [box.x + box.w, box.y + box.h],
  ];

  for (const [cornerX, cornerY] of corners) {
    // Solve |P + t*V - C|^2 = r^2 for t
    const dx = cx - cornerX;
    const dy = cy - cornerY;
    const a = vx * vx + vy * vy;
    const b = 2 * (dx * vx + dy * vy);
    const c = dx * dx + dy * dy - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a === 0) continue;
    const sqrtDisc = Math.sqrt(disc);
    const t = (-b - sqrtDisc) / (2 * a);
    if (t >= 0 && t <= 1 && t < tMin) {
      // Verify the hit is actually in a corner region (not on a face)
      const hx = cx + vx * t;
      const hy = cy + vy * t;
      const inXRange = hx > box.x && hx < box.x + box.w;
      const inYRange = hy > box.y && hy < box.y + box.h;
      if (!inXRange && !inYRange) {
        // Corner hit: normal points from corner to circle center at hit time
        const ndx = hx - cornerX;
        const ndy = hy - cornerY;
        const nd = Math.sqrt(ndx * ndx + ndy * ndy);
        if (nd > 0) {
          tMin = t; hitNx = ndx / nd; hitNy = ndy / nd;
        }
      }
    }
  }

  if (tMin > 1 || tMin === Infinity) return null;

  return {
    t: tMin,
    nx: hitNx,
    ny: hitNy,
    hitX: cx + vx * tMin,
    hitY: cy + vy * tMin,
  };
}
