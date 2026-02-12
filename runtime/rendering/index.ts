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
export type { CameraBounds, CameraDeadzone } from "./camera.ts";
export {
  setCamera,
  getCamera,
  followTarget,
  setCameraBounds,
  getCameraBounds,
  setCameraDeadzone,
  getCameraDeadzone,
  followTargetSmooth,
  zoomTo,
  zoomToPoint,
} from "./camera.ts";

// Input
export {
  isKeyDown,
  isKeyPressed,
  getMousePosition,
  getViewportSize,
  getScaleFactor,
  setBackgroundColor,
  screenToWorld,
  getMouseWorldPosition,
} from "./input.ts";

// Textures
export { loadTexture, createSolidTexture } from "./texture.ts";

// Game loop
export { onFrame, getDeltaTime } from "./loop.ts";

// Tilemap
export type { TilemapId, TilemapOptions } from "./types.ts";
export type {
  AnimatedTileDef,
  TileProperties,
  TilemapLayer,
  LayerOptions,
  LayeredTilemap,
} from "./tilemap.ts";
export {
  createTilemap,
  setTile,
  getTile,
  drawTilemap,
  fillTiles,
  // Layered tilemaps
  createLayeredTilemap,
  setLayerTile,
  getLayerTile,
  setLayerVisible,
  setLayerOpacity,
  getLayerNames,
  drawLayeredTilemap,
  fillLayerTiles,
  // Animated tiles
  registerAnimatedTile,
  unregisterAnimatedTile,
  clearAnimatedTiles,
  updateAnimatedTiles,
  resolveAnimatedTile,
  getAnimatedTileDefs,
  // Tile properties
  defineTileProperties,
  getTileProperties,
  getTileProperty,
  getTilePropertiesAt,
  getTilePropertyAt,
  clearTileProperties,
} from "./tilemap.ts";

// Auto-tiling
export type {
  NeighborCheck,
  AutotileMapping,
  AutotileRule,
} from "./autotile.ts";
export {
  NORTH,
  EAST,
  SOUTH,
  WEST,
  NORTHEAST,
  SOUTHEAST,
  SOUTHWEST,
  NORTHWEST,
  computeAutotileBitmask4,
  computeAutotileBitmask8,
  createAutotileMapping4,
  createAutotileMapping8,
  createAutotileRule,
  resolveAutotile,
  applyAutotile,
  BITMASK4_LABELS,
} from "./autotile.ts";

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

// Custom Shaders
export type { ShaderId } from "./shader.ts";
export { createShaderFromSource, setShaderParam } from "./shader.ts";

// Parallax
export type { ParallaxSpriteOptions } from "./parallax.ts";
export { drawParallaxSprite } from "./parallax.ts";

// Post-Processing
export type { EffectId } from "./postprocess.ts";
export {
  addPostProcessEffect,
  setEffectParam,
  removeEffect,
  clearEffects,
} from "./postprocess.ts";
