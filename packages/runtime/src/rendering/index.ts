// Types
export type {
  TextureId,
  SpriteOptions,
  CameraState,
  MousePosition,
} from "./types.ts";

// Sprites
export { drawSprite, clearSprites } from "./sprites.ts";

// Camera
export { setCamera, getCamera, followTarget } from "./camera.ts";

// Input
export {
  isKeyDown,
  isKeyPressed,
  getMousePosition,
  getViewportSize,
  screenToWorld,
  getMouseWorldPosition,
} from "./input.ts";

// Textures
export { loadTexture, createSolidTexture } from "./texture.ts";

// Game loop
export { onFrame, getDeltaTime } from "./loop.ts";

// Tilemap
export type { TilemapId, TilemapOptions } from "./types.ts";
export { createTilemap, setTile, getTile, drawTilemap } from "./tilemap.ts";

// Lighting
export { setAmbientLight, addPointLight, clearLights } from "./lighting.ts";

// Text
export type { BitmapFont, TextOptions, TextMeasurement } from "./text.ts";
export { loadFont, getDefaultFont, measureText, drawText } from "./text.ts";

// Animation
export type { AnimationId, AnimationDef, AnimationState } from "./animation.ts";
export {
  createAnimation,
  playAnimation,
  updateAnimation,
  getAnimationUV,
  drawAnimatedSprite,
  resetAnimation,
  stopAnimation,
} from "./animation.ts";

// Audio
export type { SoundId, PlayOptions } from "./audio.ts";
export { loadSound, playSound, playMusic, stopSound, stopAll, setVolume } from "./audio.ts";
