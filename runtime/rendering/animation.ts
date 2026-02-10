import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";

/**
 * Opaque handle to a registered animation definition.
 * Returned by {@link createAnimation}.
 */
export type AnimationId = number;

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
 * Frames must be arranged in a single horizontal row in the texture.
 *
 * @param textureId - Texture handle of the sprite sheet (from loadTexture()).
 * @param frameW - Width of each frame in pixels.
 * @param frameH - Height of each frame in pixels.
 * @param frameCount - Number of frames in the animation.
 * @param fps - Playback speed in frames per second. Higher = faster.
 * @param options - Optional settings. `loop`: whether to loop (default: true).
 * @returns AnimationId handle for use with playAnimation().
 */
export function createAnimation(
  textureId: TextureId,
  frameW: number,
  frameH: number,
  frameCount: number,
  fps: number,
  options?: { loop?: boolean },
): AnimationId {
  const id = nextId++;
  registry.set(id, {
    textureId,
    frameW,
    frameH,
    frameCount,
    fps,
    loop: options?.loop ?? true,
  });
  return id;
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
