/**
 * Draw call capture and visual assertion helpers.
 *
 * Captures the *intent* of draw calls (what the game code asked to render)
 * as structured data. Works in both headless and renderer modes — captures
 * happen at the TS level before the Rust op boundary.
 *
 * ## Usage
 *
 * ```typescript
 * import { enableDrawCallCapture, disableDrawCallCapture, getDrawCalls, clearDrawCalls } from "@arcane/runtime/testing";
 *
 * enableDrawCallCapture();
 * // ... run one frame of game logic ...
 * const calls = getDrawCalls();
 * // calls is an array of DrawCall objects describing everything drawn
 * disableDrawCallCapture();
 * ```
 *
 * ## Visual Assertions
 *
 * ```typescript
 * import { assertSpriteDrawn, assertTextDrawn, assertDrawCallCount } from "@arcane/runtime/testing";
 *
 * assertSpriteDrawn({ x: 100, y: 200 });           // at least one sprite at (100, 200)
 * assertTextDrawn("HP: 10");                         // text containing "HP: 10" was drawn
 * assertDrawCallCount("sprite", 5);                  // exactly 5 sprites drawn
 * ```
 */

// ---------------------------------------------------------------------------
// DrawCall types
// ---------------------------------------------------------------------------

/** Discriminated union of all captured draw call types. */
export type DrawCall =
  | SpriteDrawCall
  | TextDrawCall
  | RectDrawCall
  | PanelDrawCall
  | BarDrawCall
  | LabelDrawCall
  | TilemapDrawCall
  | CircleDrawCall
  | LineDrawCall
  | TriangleDrawCall;

/** A drawSprite() call. */
export type SpriteDrawCall = {
  type: "sprite";
  textureId: number;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  blendMode: string;
  shaderId: number;
};

/** A drawText() call (the full text, not individual glyph sprites). */
export type TextDrawCall = {
  type: "text";
  content: string;
  x: number;
  y: number;
  scale: number;
  layer: number;
  screenSpace: boolean;
};

/** A drawRect() call. */
export type RectDrawCall = {
  type: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  screenSpace: boolean;
};

/** A drawPanel() call. */
export type PanelDrawCall = {
  type: "panel";
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  screenSpace: boolean;
  borderWidth: number;
};

/** A drawBar() call. */
export type BarDrawCall = {
  type: "bar";
  x: number;
  y: number;
  w: number;
  h: number;
  fillRatio: number;
  layer: number;
  screenSpace: boolean;
};

/** A drawLabel() call. */
export type LabelDrawCall = {
  type: "label";
  content: string;
  x: number;
  y: number;
  scale: number;
  layer: number;
  screenSpace: boolean;
};

/** A drawTilemap() call. */
export type TilemapDrawCall = {
  type: "tilemap";
  tilemapId: number;
  x: number;
  y: number;
  layer: number;
};

/** A drawCircle() call. */
export type CircleDrawCall = {
  type: "circle";
  cx: number;
  cy: number;
  radius: number;
  layer: number;
  screenSpace: boolean;
};

/** A drawLine() call. */
export type LineDrawCall = {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  layer: number;
  screenSpace: boolean;
};

/** A drawTriangle() call. */
export type TriangleDrawCall = {
  type: "triangle";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  layer: number;
  screenSpace: boolean;
};

/** Filter criteria for finding draw calls. All fields are optional — only specified fields are matched. */
export type DrawCallFilter = {
  type?: DrawCall["type"];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  layer?: number;
  textureId?: number;
  content?: string;
  screenSpace?: boolean;
  /** Match x/y within this tolerance (default: 0.001). */
  tolerance?: number;
};

// ---------------------------------------------------------------------------
// Capture state (globalThis bridge)
// ---------------------------------------------------------------------------

/**
 * Enable draw call capture. All subsequent drawSprite/drawText/drawRect/etc.
 * calls will be logged as structured DrawCall objects. Works in headless mode.
 *
 * Call {@link getDrawCalls} to retrieve captured calls.
 * Call {@link clearDrawCalls} between frames to reset.
 * Call {@link disableDrawCallCapture} to stop capturing.
 */
export function enableDrawCallCapture(): void {
  (globalThis as any).__arcaneDrawCallLog = [];
}

/**
 * Disable draw call capture and clear the log.
 */
export function disableDrawCallCapture(): void {
  (globalThis as any).__arcaneDrawCallLog = undefined;
}

/**
 * Get all draw calls captured since the last {@link clearDrawCalls} or
 * {@link enableDrawCallCapture}. Returns a copy of the array.
 *
 * @returns Array of DrawCall objects, or empty array if capture is not enabled.
 */
export function getDrawCalls(): DrawCall[] {
  const log = (globalThis as any).__arcaneDrawCallLog;
  if (!log) return [];
  return [...log];
}

/**
 * Clear all captured draw calls without disabling capture.
 * Call this between frames to see only the current frame's draws.
 */
export function clearDrawCalls(): void {
  const log = (globalThis as any).__arcaneDrawCallLog;
  if (log) log.length = 0;
}

// ---------------------------------------------------------------------------
// Internal: called by draw functions to log a call
// ---------------------------------------------------------------------------

/** @internal Push a draw call to the capture log. No-op when capture is disabled. */
export function _logDrawCall(call: DrawCall): void {
  const log = (globalThis as any).__arcaneDrawCallLog;
  if (log) log.push(call);
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

function matchesFilter(call: DrawCall, filter: DrawCallFilter): boolean {
  const tol = filter.tolerance ?? 0.001;

  if (filter.type !== undefined && call.type !== filter.type) return false;

  if (filter.x !== undefined) {
    const cx = (call as any).x;
    if (cx === undefined || Math.abs(cx - filter.x) > tol) return false;
  }
  if (filter.y !== undefined) {
    const cy = (call as any).y;
    if (cy === undefined || Math.abs(cy - filter.y) > tol) return false;
  }
  if (filter.w !== undefined) {
    const cw = (call as any).w;
    if (cw === undefined || Math.abs(cw - filter.w) > tol) return false;
  }
  if (filter.h !== undefined) {
    const ch = (call as any).h;
    if (ch === undefined || Math.abs(ch - filter.h) > tol) return false;
  }
  if (filter.layer !== undefined) {
    const cl = (call as any).layer;
    if (cl === undefined || cl !== filter.layer) return false;
  }
  if (filter.textureId !== undefined) {
    if (call.type !== "sprite" || call.textureId !== filter.textureId) return false;
  }
  if (filter.content !== undefined) {
    if (call.type === "text" || call.type === "label") {
      if (!call.content.includes(filter.content)) return false;
    } else {
      return false;
    }
  }
  if (filter.screenSpace !== undefined) {
    const ss = (call as any).screenSpace;
    if (ss === undefined || ss !== filter.screenSpace) return false;
  }

  return true;
}

/**
 * Find all captured draw calls matching the given filter.
 * Returns an empty array if none match or capture is not enabled.
 *
 * @param filter - Criteria to match against. All specified fields must match.
 * @returns Matching DrawCall objects.
 *
 * @example
 * const sprites = findDrawCalls({ type: "sprite", layer: 1 });
 * const hudText = findDrawCalls({ type: "text", screenSpace: true });
 */
export function findDrawCalls(filter: DrawCallFilter): DrawCall[] {
  return getDrawCalls().filter((call) => matchesFilter(call, filter));
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/**
 * Assert that at least one sprite was drawn matching the given filter.
 * Throws with a descriptive message if no matching sprite is found.
 *
 * @param filter - Optional criteria. If omitted, asserts any sprite was drawn.
 *
 * @example
 * assertSpriteDrawn({ x: 100, y: 200 });
 * assertSpriteDrawn({ textureId: playerTex, layer: 1 });
 */
export function assertSpriteDrawn(filter?: Omit<DrawCallFilter, "type">): void {
  const f: DrawCallFilter = { ...filter, type: "sprite" };
  const matches = findDrawCalls(f);
  if (matches.length === 0) {
    const filterDesc = filter ? ` matching ${JSON.stringify(filter)}` : "";
    const allSprites = findDrawCalls({ type: "sprite" });
    throw new Error(
      `Expected at least one sprite${filterDesc}, but found none. ` +
      `Total sprites captured: ${allSprites.length}.`,
    );
  }
}

/**
 * Assert that text containing the given content was drawn.
 * Matches against both drawText() and drawLabel() calls.
 *
 * @param content - Substring to search for in drawn text.
 * @param filter - Additional filter criteria (layer, screenSpace, etc.).
 *
 * @example
 * assertTextDrawn("HP: 10");
 * assertTextDrawn("Score", { screenSpace: true });
 */
export function assertTextDrawn(content: string, filter?: Omit<DrawCallFilter, "type" | "content">): void {
  const textMatches = findDrawCalls({ ...filter, type: "text", content });
  const labelMatches = findDrawCalls({ ...filter, type: "label", content });
  if (textMatches.length === 0 && labelMatches.length === 0) {
    const allText = [
      ...findDrawCalls({ type: "text" }),
      ...findDrawCalls({ type: "label" }),
    ];
    const drawn = allText.map((c) => (c as TextDrawCall | LabelDrawCall).content);
    throw new Error(
      `Expected text containing "${content}" to be drawn, but no match found. ` +
      `Drawn text: ${drawn.length > 0 ? drawn.map((t) => `"${t}"`).join(", ") : "(none)"}.`,
    );
  }
}

/**
 * Assert the exact number of draw calls of a given type.
 *
 * @param type - Draw call type to count.
 * @param expected - Expected count.
 *
 * @example
 * assertDrawCallCount("sprite", 5);
 * assertDrawCallCount("text", 2);
 */
export function assertDrawCallCount(type: DrawCall["type"], expected: number): void {
  const matches = findDrawCalls({ type });
  if (matches.length !== expected) {
    throw new Error(
      `Expected ${expected} "${type}" draw calls, but found ${matches.length}.`,
    );
  }
}

/**
 * Assert that no draw calls overlap a given point (within tolerance).
 * Checks sprites, rects, panels, and bars for bounding box containment.
 *
 * @param x - World X coordinate.
 * @param y - World Y coordinate.
 * @param tolerance - Padding around the point. Default: 0.
 *
 * @example
 * assertNothingDrawnAt(500, 500); // no sprites/rects cover this point
 */
export function assertNothingDrawnAt(x: number, y: number, tolerance: number = 0): void {
  const calls = getDrawCalls();
  for (const call of calls) {
    if ("x" in call && "y" in call && "w" in call && "h" in call) {
      const c = call as { x: number; y: number; w: number; h: number; type: string };
      if (
        x >= c.x - tolerance &&
        x <= c.x + c.w + tolerance &&
        y >= c.y - tolerance &&
        y <= c.y + c.h + tolerance
      ) {
        throw new Error(
          `Expected nothing drawn at (${x}, ${y}), but found a "${c.type}" ` +
          `at (${c.x}, ${c.y}, ${c.w}x${c.h}).`,
        );
      }
    }
  }
}

/**
 * Assert that at least one draw call exists on the given layer.
 *
 * @param layer - Layer number to check.
 *
 * @example
 * assertLayerHasDrawCalls(0);  // ground layer has something
 * assertLayerHasDrawCalls(90); // UI layer has something
 */
export function assertLayerHasDrawCalls(layer: number): void {
  const matches = findDrawCalls({ layer });
  if (matches.length === 0) {
    const allLayers: number[] = [];
    for (const c of getDrawCalls()) {
      const l = (c as any).layer as number | undefined;
      if (l !== undefined && !allLayers.includes(l)) allLayers.push(l);
    }
    allLayers.sort((a, b) => a - b);
    throw new Error(
      `Expected draw calls on layer ${layer}, but found none. ` +
      `Active layers: ${allLayers.length > 0 ? allLayers.join(", ") : "(none)"}.`,
    );
  }
}

/**
 * Assert that a draw call of the given type was drawn in screen space (HUD).
 * Only applies to types that support screenSpace: text, rect, panel, bar, label.
 *
 * @param type - Draw call type.
 *
 * @example
 * assertScreenSpaceDrawn("text");  // at least one HUD text
 * assertScreenSpaceDrawn("bar");   // at least one HUD bar
 */
export function assertScreenSpaceDrawn(type: "text" | "rect" | "panel" | "bar" | "label"): void {
  const matches = findDrawCalls({ type, screenSpace: true });
  if (matches.length === 0) {
    const allOfType = findDrawCalls({ type });
    throw new Error(
      `Expected at least one "${type}" in screen space, but found none. ` +
      `Total "${type}" calls: ${allOfType.length} (all world-space).`,
    );
  }
}

/**
 * Get a summary of all captured draw calls, grouped by type.
 * Useful for debugging and logging.
 *
 * @returns Object with type counts and total.
 *
 * @example
 * const summary = getDrawCallSummary();
 * // { total: 15, sprite: 10, text: 3, rect: 2, ... }
 */
export function getDrawCallSummary(): Record<string, number> {
  const calls = getDrawCalls();
  const summary: Record<string, number> = { total: calls.length };
  for (const call of calls) {
    summary[call.type] = (summary[call.type] ?? 0) + 1;
  }
  return summary;
}
