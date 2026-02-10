import type { TextureId } from "./types.ts";
import { drawSprite } from "./sprites.ts";

export type AnimationId = number;

export type AnimationDef = {
  textureId: TextureId;
  frameW: number;
  frameH: number;
  frameCount: number;
  fps: number;
  loop: boolean;
};

export type AnimationState = {
  defId: AnimationId;
  elapsed: number;
  frame: number;
  finished: boolean;
};

const registry = new Map<number, AnimationDef>();
let nextId = 1;

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

export function playAnimation(defId: AnimationId): AnimationState {
  return { defId, elapsed: 0, frame: 0, finished: false };
}

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

export function resetAnimation(anim: AnimationState): AnimationState {
  return { ...anim, elapsed: 0, frame: 0, finished: false };
}

export function stopAnimation(anim: AnimationState): AnimationState {
  return { ...anim, finished: true };
}
