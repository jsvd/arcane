/**
 * Layout helpers for positioning UI widgets.
 *
 * Provides vertical stacks, horizontal rows, and screen anchoring.
 * Layout functions compute positions; they don't draw anything.
 *
 * @example
 * const positions = verticalStack(10, 10, 32, 4, 8);
 * // positions = [{x:10,y:10}, {x:10,y:50}, {x:10,y:90}, {x:10,y:130}]
 */

/** A position returned by layout functions. */
export type LayoutPosition = {
  x: number;
  y: number;
};

/** Anchor positions relative to viewport. */
export type Anchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/**
 * Compute positions for a vertical stack of items.
 *
 * @param x - X position of the stack (all items share this X).
 * @param y - Y position of the first item.
 * @param itemHeight - Height of each item in pixels.
 * @param count - Number of items.
 * @param spacing - Vertical gap between items in pixels. Default: 4.
 * @returns Array of {x, y} positions for each item.
 */
export function verticalStack(
  x: number,
  y: number,
  itemHeight: number,
  count: number,
  spacing: number = 4,
): LayoutPosition[] {
  const positions: LayoutPosition[] = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      x,
      y: y + i * (itemHeight + spacing),
    });
  }
  return positions;
}

/**
 * Compute positions for a horizontal row of items.
 *
 * @param x - X position of the first item.
 * @param y - Y position of the row (all items share this Y).
 * @param itemWidth - Width of each item in pixels.
 * @param count - Number of items.
 * @param spacing - Horizontal gap between items in pixels. Default: 4.
 * @returns Array of {x, y} positions for each item.
 */
export function horizontalRow(
  x: number,
  y: number,
  itemWidth: number,
  count: number,
  spacing: number = 4,
): LayoutPosition[] {
  const positions: LayoutPosition[] = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      x: x + i * (itemWidth + spacing),
      y,
    });
  }
  return positions;
}

/**
 * Compute a position anchored to the viewport.
 *
 * @param anchor - Anchor position (e.g. "top-left", "center", "bottom-right").
 * @param viewportW - Viewport width in pixels.
 * @param viewportH - Viewport height in pixels.
 * @param contentW - Width of the content to anchor.
 * @param contentH - Height of the content to anchor.
 * @param padding - Padding from viewport edges. Default: 10.
 * @returns {x, y} position for the content's top-left corner.
 */
export function anchorPosition(
  anchor: Anchor,
  viewportW: number,
  viewportH: number,
  contentW: number,
  contentH: number,
  padding: number = 10,
): LayoutPosition {
  let x = 0;
  let y = 0;

  // Horizontal
  if (anchor.includes("left")) {
    x = padding;
  } else if (anchor.includes("right")) {
    x = viewportW - contentW - padding;
  } else {
    // center
    x = (viewportW - contentW) / 2;
  }

  // Vertical
  if (anchor.startsWith("top")) {
    y = padding;
  } else if (anchor.startsWith("bottom")) {
    y = viewportH - contentH - padding;
  } else {
    // center
    y = (viewportH - contentH) / 2;
  }

  return { x, y };
}

/**
 * Compute positions for a vertical stack of items with varying heights.
 *
 * @param x - X position of the stack.
 * @param y - Y position of the first item.
 * @param heights - Array of item heights in pixels.
 * @param spacing - Vertical gap between items. Default: 4.
 * @returns Array of {x, y} positions for each item.
 */
export function verticalStackVariableHeight(
  x: number,
  y: number,
  heights: number[],
  spacing: number = 4,
): LayoutPosition[] {
  const positions: LayoutPosition[] = [];
  let currentY = y;
  for (let i = 0; i < heights.length; i++) {
    positions.push({ x, y: currentY });
    currentY += heights[i] + spacing;
  }
  return positions;
}

/**
 * Compute positions for a horizontal row of items with varying widths.
 *
 * @param x - X position of the first item.
 * @param y - Y position of the row.
 * @param widths - Array of item widths in pixels.
 * @param spacing - Horizontal gap between items. Default: 4.
 * @returns Array of {x, y} positions for each item.
 */
export function horizontalRowVariableWidth(
  x: number,
  y: number,
  widths: number[],
  spacing: number = 4,
): LayoutPosition[] {
  const positions: LayoutPosition[] = [];
  let currentX = x;
  for (let i = 0; i < widths.length; i++) {
    positions.push({ x: currentX, y });
    currentX += widths[i] + spacing;
  }
  return positions;
}

/**
 * Compute the total height of a vertical stack.
 *
 * @param itemHeight - Height of each item.
 * @param count - Number of items.
 * @param spacing - Gap between items. Default: 4.
 */
export function verticalStackHeight(
  itemHeight: number,
  count: number,
  spacing: number = 4,
): number {
  if (count <= 0) return 0;
  return count * itemHeight + (count - 1) * spacing;
}

/**
 * Compute the total width of a horizontal row.
 *
 * @param itemWidth - Width of each item.
 * @param count - Number of items.
 * @param spacing - Gap between items. Default: 4.
 */
export function horizontalRowWidth(
  itemWidth: number,
  count: number,
  spacing: number = 4,
): number {
  if (count <= 0) return 0;
  return count * itemWidth + (count - 1) * spacing;
}
