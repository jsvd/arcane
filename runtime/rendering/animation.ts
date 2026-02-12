import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";

/**
 * Opaque handle to a registered animation definition.
 * Returned by {@link createAnimation}.
 */
export type AnimationId = number;

/** Callback invoked when a specific animation frame is reached. */
export type FrameEventCallback = (frame: number) => void;

/** A frame event binding: fires callback when the animation reaches a specific frame. */
export type FrameEvent = {
  /** The frame index (0-based) that triggers this event. */
  frame: number;
  /** Callback invoked when the frame is reached. */
  callback: FrameEventCallback;
};

/** Internal definition of a sprite-sheet animation. */
export type AnimationDef = {
  /** Texture handle containing the sprite sheet. */
  textureId: TextureId;
  /** Width of each animation frame in pixels. */
  frameW: number;
  /** Height of each animation frame in pixels. */
  frameH: number;
  /** Total number of frames in the animation. */
  frameCount: number;
  /** Playback speed in frames per second. */
  fps: number;
  /** If true, animation loops. If false, stops on last frame. */
  loop: boolean;
  /** Number of columns in the spritesheet (default: all frames in one row). */
  cols?: number;
  /** Number of rows in the spritesheet (default: 1). */
  rows?: number;
  /** Frame events: callbacks triggered when specific frames are reached. */
  events?: FrameEvent[];
};

/** State of a playing animation instance. Immutable -- update via {@link updateAnimation}. */
export type AnimationState = {
  /** Reference to the animation definition. */
  defId: AnimationId;
  /** Total elapsed time in seconds since animation started. */
  elapsed: number;
  /** Current frame index (0-based). */
  frame: number;
  /** True if non-looping animation has reached its last frame. */
  finished: boolean;
};

const registry = new Map<number, AnimationDef>();
let nextId = 1;

/**
 * Register a sprite-sheet animation definition.
 * Frames can be arranged in a single row (default) or in a grid (cols × rows).
 *
 * @param textureId - Texture handle of the sprite sheet (from loadTexture()).
 * @param frameW - Width of each frame in pixels.
 * @param frameH - Height of each frame in pixels.
 * @param frameCount - Number of frames in the animation.
 * @param fps - Playback speed in frames per second. Higher = faster.
 * @param options - Optional settings:
 *   - `loop`: whether to loop (default: true)
 *   - `cols`: number of columns in the grid (default: frameCount = single row)
 *   - `rows`: number of rows in the grid (default: 1)
 * @returns AnimationId handle for use with playAnimation().
 *
 * @example
 * // Single row: 6 frames in one row
 * createAnimation(tex, 32, 32, 6, 10);
 *
 * // Grid: 6×4 spritesheet (24 frames total)
 * createAnimation(tex, 32, 32, 24, 10, { cols: 6, rows: 4 });
 */
export function createAnimation(
  textureId: TextureId,
  frameW: number,
  frameH: number,
  frameCount: number,
  fps: number,
  options?: { loop?: boolean; cols?: number; rows?: number; events?: FrameEvent[] },
): AnimationId {
  const id = nextId++;
  registry.set(id, {
    textureId,
    frameW,
    frameH,
    frameCount,
    fps,
    loop: options?.loop ?? true,
    cols: options?.cols,
    rows: options?.rows,
    events: options?.events ? [...options.events] : undefined,
  });
  return id;
}

/**
 * Add a frame event to an existing animation definition.
 * The callback fires each time updateAnimationWithEvents() crosses the given frame.
 *
 * @param defId - AnimationId to add the event to.
 * @param frame - Frame index (0-based) that triggers the event.
 * @param callback - Function called when the frame is reached.
 */
export function addFrameEvent(
  defId: AnimationId,
  frame: number,
  callback: FrameEventCallback,
): void {
  const def = registry.get(defId);
  if (!def) return;
  if (!def.events) def.events = [];
  def.events.push({ frame, callback });
}

/**
 * Advance an animation and fire any frame events that were crossed.
 * Events fire for every frame crossed between the old and new frame index,
 * including on loop wraps. Each event fires at most once per update call.
 *
 * @param anim - Current animation state.
 * @param dt - Time delta in seconds.
 * @returns Updated animation state (same as updateAnimation).
 */
export function updateAnimationWithEvents(
  anim: AnimationState,
  dt: number,
): AnimationState {
  const def = registry.get(anim.defId);
  if (!def || anim.finished) return { ...anim };

  const oldFrame = anim.frame;
  const next = updateAnimation(anim, dt);
  const newFrame = next.frame;

  if (def.events && def.events.length > 0) {
    if (def.loop) {
      // Looping: detect frames crossed including wraps
      const oldRaw = Math.floor(anim.elapsed * def.fps);
      const newRaw = Math.floor(next.elapsed * def.fps);
      if (newRaw > oldRaw) {
        // Collect unique frames crossed (mod frameCount)
        const fired = new Set<number>();
        for (let r = oldRaw + 1; r <= newRaw; r++) {
          const f = r % def.frameCount;
          if (!fired.has(f)) {
            fired.add(f);
            for (const evt of def.events) {
              if (evt.frame === f) evt.callback(f);
            }
          }
        }
      }
    } else {
      // Non-looping: fire events for frames between old and new
      if (newFrame > oldFrame) {
        for (const evt of def.events) {
          if (evt.frame > oldFrame && evt.frame <= newFrame) {
            evt.callback(evt.frame);
          }
        }
      }
      // If just finished, fire event for last frame if crossed
      if (next.finished && !anim.finished) {
        const lastFrame = def.frameCount - 1;
        for (const evt of def.events) {
          if (evt.frame === lastFrame && oldFrame < lastFrame) {
            evt.callback(lastFrame);
          }
        }
      }
    }
  }

  return next;
}

/**
 * Get the animation definition for a given ID.
 * Useful for querying frame count, fps, texture, and events.
 *
 * @param defId - AnimationId to look up.
 * @returns The animation definition, or undefined if not found.
 */
export function getAnimationDef(defId: AnimationId): AnimationDef | undefined {
  return registry.get(defId);
}

/**
 * Create a new animation playback state starting from frame 0.
 *
 * @param defId - AnimationId from createAnimation().
 * @returns Fresh AnimationState at frame 0.
 */
export function playAnimation(defId: AnimationId): AnimationState {
  return { defId, elapsed: 0, frame: 0, finished: false };
}

/**
 * Advance an animation by a time delta. Returns a new immutable state.
 * For looping animations, wraps around. For non-looping, stops at the last frame.
 *
 * @param anim - Current animation state.
 * @param dt - Time delta in seconds (from getDeltaTime()).
 * @returns Updated animation state.
 */
export function updateAnimation(
  anim: AnimationState,
  dt: number,
): AnimationState {
  const def = registry.get(anim.defId);
  if (!def || anim.finished) return { ...anim };

  const elapsed = anim.elapsed + dt;
  const rawFrame = Math.floor(elapsed * def.fps);

  if (def.loop) {
    return {
      defId: anim.defId,
      elapsed,
      frame: rawFrame % def.frameCount,
      finished: false,
    };
  }

  const lastFrame = def.frameCount - 1;
  if (rawFrame >= lastFrame) {
    return {
      defId: anim.defId,
      elapsed,
      frame: lastFrame,
      finished: true,
    };
  }

  return {
    defId: anim.defId,
    elapsed,
    frame: rawFrame,
    finished: false,
  };
}

/**
 * Get the UV sub-rectangle for the current animation frame.
 * Supports both single-row (default) and grid-based (cols × rows) layouts.
 * Used internally by drawAnimatedSprite; also useful for custom rendering.
 *
 * @param anim - Current animation state.
 * @returns UV rect (0.0-1.0 normalized) for the current frame.
 */
export function getAnimationUV(
  anim: AnimationState,
): { x: number; y: number; w: number; h: number } {
  const def = registry.get(anim.defId);
  if (!def) return { x: 0, y: 0, w: 1, h: 1 };

  // Grid-based layout (multi-row spritesheet)
  if (def.cols && def.rows) {
    const col = anim.frame % def.cols;
    const row = Math.floor(anim.frame / def.cols);
    return {
      x: col / def.cols,
      y: row / def.rows,
      w: 1 / def.cols,
      h: 1 / def.rows,
    };
  }

  // Single-row layout (default)
  return {
    x: anim.frame / def.frameCount,
    y: 0,
    w: 1 / def.frameCount,
    h: 1,
  };
}

/**
 * Draw an animated sprite at the given position using the current animation frame.
 * Combines getAnimationUV() + drawSprite() for convenience.
 * Must be called every frame. No-op if the animation definition is not found.
 *
 * @param anim - Current animation state (from playAnimation/updateAnimation).
 * @param x - World X position (top-left corner).
 * @param y - World Y position (top-left corner).
 * @param w - Width in world units.
 * @param h - Height in world units.
 * @param options - Optional layer and tint overrides.
 */
export function drawAnimatedSprite(
  anim: AnimationState,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: {
    layer?: number;
    tint?: { r: number; g: number; b: number; a: number };
  },
): void {
  const def = registry.get(anim.defId);
  if (!def) return;

  drawSprite({
    textureId: def.textureId,
    x,
    y,
    w,
    h,
    layer: options?.layer,
    uv: getAnimationUV(anim),
    tint: options?.tint,
  });
}

/**
 * Reset an animation to frame 0 (restart from beginning).
 *
 * @param anim - Animation state to reset.
 * @returns New animation state at frame 0, not finished.
 */
export function resetAnimation(anim: AnimationState): AnimationState {
  return { ...anim, elapsed: 0, frame: 0, finished: false };
}

/**
 * Stop an animation immediately by marking it as finished.
 *
 * @param anim - Animation state to stop.
 * @returns New animation state with finished = true.
 */
export function stopAnimation(anim: AnimationState): AnimationState {
  return { ...anim, finished: true };
}
