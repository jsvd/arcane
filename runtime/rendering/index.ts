// Types
export type {
  TextureId,
  SpriteOptions,
  CameraState,
  MousePosition,
  KeyName,
} from "./types.ts";

// Sprites
export { drawSprite, clearSprites, _resetColorTexCache } from "./sprites.ts";

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
  followTargetWithShake,
  zoomTo,
  zoomToPoint,
} from "./camera.ts";

// Input
export {
  isKeyDown,
  isKeyPressed,
  getMousePosition,
  isMouseButtonDown,
  isMouseButtonPressed,
  getViewportSize,
  getScaleFactor,
  setBackgroundColor,
  screenToWorld,
  getMouseWorldPosition,
  // Gamepad
  getGamepadCount,
  isGamepadConnected,
  getGamepadName,
  isGamepadButtonDown,
  isGamepadButtonPressed,
  getGamepadAxis,
  // Touch
  getTouchCount,
  isTouchActive,
  getTouchPosition,
  getTouchWorldPosition,
} from "./input.ts";

// Textures
export { loadTexture, createSolidTexture, uploadRgbaTexture, preloadAssets, isTextureLoaded, getLoadingProgress } from "./texture.ts";

// Sprite Atlas
export type {
  StaticSpriteDef,
  AnimatedSpriteDef,
  SpriteDef,
  PackDefinition,
  LoadAtlasOptions,
  AtlasSpriteOptions,
  SpriteInfo,
  SpriteAtlas,
} from "./atlas.ts";
export { loadAtlasFromDef, createAtlasBuilder } from "./atlas.ts";

// Placeholder sprites (prototyping)
export type { PlaceholderShape, PlaceholderOptions } from "./placeholder.ts";
export { placeholder, quickPlaceholder, PLACEHOLDER_COLORS } from "./placeholder.ts";

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
export type {
  EmissiveOptions,
  OccluderOptions,
  DirectionalLightOptions,
  SpotLightOptions,
  DayNightOptions,
  GIQualityOptions,
} from "./lighting.ts";
export {
  setAmbientLight,
  addPointLight,
  clearLights,
  enableGlobalIllumination,
  disableGlobalIllumination,
  setGIIntensity,
  setGIQuality,
  addEmissive,
  clearEmissives,
  addOccluder,
  clearOccluders,
  addDirectionalLight,
  addSpotLight,
  colorTemp,
  setDayNightCycle,
} from "./lighting.ts";

// Text
export type { BitmapFont, TextOptions, TextMeasurement, TextOutline, TextShadow, MSDFFont, MSDFGlyph, TextAlign, TextLayoutOptions } from "./text.ts";
export { loadFont, getDefaultFont, getDefaultMSDFFont, loadMSDFFont, measureText, drawText, wrapText, drawTextWrapped, drawTextAligned } from "./text.ts";

// Animation
export type { AnimationId, AnimationDef, AnimationState, FrameEvent, FrameEventCallback } from "./animation.ts";
export {
  createAnimation,
  playAnimation,
  updateAnimation,
  updateAnimationWithEvents,
  getAnimationUV,
  getAnimationDef,
  drawAnimatedSprite,
  resetAnimation,
  stopAnimation,
  onFrameEvent,
} from "./animation.ts";

// Animation State Machine
export type {
  FSMStateDef,
  BooleanCondition,
  ThresholdCondition,
  TriggerCondition,
  AnimationFinishedCondition,
  TransitionCondition,
  FSMTransition,
  FSMConfig,
  FSMParams,
  BlendState,
  FSMState,
} from "./animation-fsm.ts";
export {
  createAnimationFSM,
  getCurrentState,
  isBlending,
  getBlendProgress,
  setFSMState,
  updateFSM,
  drawFSMSprite,
} from "./animation-fsm.ts";

// Audio
export type { SoundId, InstanceId, AudioBus, PlayOptions, SpatialOptions, PoolConfig } from "./audio.ts";
export {
  loadSound,
  playSound,
  playMusic,
  stopSound,
  stopAll,
  setVolume,
  playSoundAt,
  crossfadeMusic,
  stopInstance,
  setBusVolume,
  getBusVolume,
  setListenerPosition,
  updateSpatialAudio,
  setPoolConfig,
  setInstanceVolume,
} from "./audio.ts";

// Custom Shaders
export type { ShaderId, UniformType, UniformDef } from "./shader.ts";
export {
  createShaderFromSource,
  setShaderParam,
  createShader,
  setShaderUniform,
  getShaderUniformNames,
} from "./shader.ts";

// Shader Effect Presets
export type {
  ShaderEffect,
  OutlineOptions,
  FlashOptions,
  DissolveOptions,
  PixelateOptions,
  HologramOptions,
  WaterOptions,
  GlowOptions,
  GrayscaleOptions,
} from "./effects.ts";
export {
  outlineEffect,
  flashEffect,
  dissolveEffect,
  pixelateEffect,
  hologramEffect,
  waterEffect,
  glowEffect,
  grayscaleEffect,
} from "./effects.ts";

// Render Targets
export type { RenderTargetId } from "./rendertarget.ts";
export {
  createRenderTarget,
  beginRenderTarget,
  endRenderTarget,
  getRenderTargetTextureId,
  destroyRenderTarget,
} from "./rendertarget.ts";

// Post-Processing
export type { EffectId } from "./postprocess.ts";
export {
  addPostProcessEffect,
  setEffectParam,
  removeEffect,
  clearEffects,
} from "./postprocess.ts";

// Isometric coordinates
export type { IsoConfig, StaggeredIsoConfig } from "./isometric.ts";
export {
  isoToWorld,
  worldToIso,
  worldToGrid,
  screenToIso,
  isoDepthLayer,
  staggeredIsoToWorld,
  worldToStaggeredIso,
  screenToStaggeredIso,
  isoMapBounds,
  isoIterateBackToFront,
  isoNeighbors,
  isoDistance,
} from "./isometric.ts";

// Isometric tilemap
export type { IsoTile, IsoTilemapConfig, IsoTilemap } from "./iso-tilemap.ts";
export {
  createIsoTilemap,
  setIsoTile,
  getIsoTile,
  getIsoTileId,
  setIsoTileElevation,
  fillIsoTiles,
  setIsoTileTexture,
  drawIsoTilemap,
  computeIsoAutotile4,
} from "./iso-tilemap.ts";

// Hex coordinates
export type { HexCoord, HexOrientation, OffsetType, HexConfig } from "./hex.ts";
export {
  hex,
  hexFromCube,
  hexEqual,
  hexAdd,
  hexSubtract,
  hexScale,
  hexDirection,
  hexNeighbor,
  hexNeighbors,
  hexDistance,
  hexRing,
  hexSpiral,
  hexRound,
  hexLineDraw,
  hexToWorld,
  hexVertices,
  worldToHex,
  screenToHex,
  cubeToOffset,
  offsetToCube,
  hexRange,
  hexArea,
  computeHexAutotileBitmask,
  HEX_DIR_E,
  HEX_DIR_NE,
  HEX_DIR_NW,
  HEX_DIR_W,
  HEX_DIR_SW,
  HEX_DIR_SE,
} from "./hex.ts";

// Hex tilemap
export type { HexTile, HexTilemapConfig, HexTilemap } from "./hex-tilemap.ts";
export {
  createHexTilemap,
  setHexTile,
  getHexTile,
  getHexTileId,
  fillHexTiles,
  setHexTileTexture,
  drawHexTilemap,
  hexTilemapToCube,
  hexTilemapFromCube,
  getHexTileAtCube,
  setHexTileAtCube,
  computeHexTilemapAutotile,
} from "./hex-tilemap.ts";

// Screen Transitions
export type { ScreenTransitionType, ScreenTransitionConfig } from "./transition.ts";
export {
  startScreenTransition,
  updateScreenTransition,
  drawScreenTransition,
  isScreenTransitionActive,
  getScreenTransitionProgress,
} from "./transition.ts";

// Nine-Slice Sprites
export type { NineSliceBorder, NineSliceOptions } from "./nineslice.ts";
export { drawNineSlice } from "./nineslice.ts";

// Trail / Ribbon
export type { TrailPoint, TrailConfig, Trail } from "./trail.ts";
export {
  createTrail,
  updateTrail,
  drawTrail,
  clearTrail,
  pauseTrail,
  resumeTrail,
  getTrailPointCount,
} from "./trail.ts";

// Juice & Game Feel
export type {
  ImpactShake,
  ImpactFlash,
  ImpactParticles,
  ImpactSound,
  ImpactConfig,
} from "./juice.ts";
export {
  impact,
  impactLight,
  impactHeavy,
  hitstop,
  isHitstopActive,
  getHitstopFrames,
} from "./juice.ts";

// Floating Text (damage numbers)
export type { FloatingTextOptions } from "./floatingtext.ts";
export {
  spawnFloatingText,
  updateFloatingTexts,
  drawFloatingTexts,
  getFloatingTextCount,
  clearFloatingTexts,
} from "./floatingtext.ts";

// Typewriter Text
export type { TypewriterConfig, TypewriterDrawOptions, Typewriter } from "./typewriter.ts";
export {
  createTypewriter,
  updateTypewriter,
  drawTypewriter,
  skipTypewriter,
  pauseTypewriter,
  resumeTypewriter,
  resetTypewriter,
  getVisibleText,
  isTypewriterComplete,
} from "./typewriter.ts";

// --- Cross-module re-exports for convenience ---
// These reduce import sprawl by re-exporting commonly-needed functions
// from other modules so they can be imported from rendering.

// Color helper (canonical home: ui/types.ts)
export { rgb } from "../ui/types.ts";
export type { Color } from "../ui/types.ts";

// Shape primitives (canonical home: ui/shapes.ts)
export { drawCircle, drawLine, drawTriangle, drawArc, drawSector } from "../ui/shapes.ts";

// Camera shake + screen flash (canonical home: tweening/helpers.ts)
export { shakeCamera, getCameraShakeOffset, flashScreen, drawScreenFlash } from "../tweening/helpers.ts";

// SDF Shapes (code-defined visuals)
export type {
  SdfNode,
  SdfPrimitiveNode,
  SdfBoolOpNode,
  SdfTransformNode,
  SdfModifierNode,
  SdfFill,
  SolidFill,
  OutlineFill,
  GradientFill,
  GlowFill,
  SolidOutlineFill,
  CosinePaletteFill,
  Vec2 as SdfVec2,
} from "./sdf.ts";
export {
  // Layer constants
  LAYERS,
  // Primitives
  sdfCircle,
  sdfBox,
  sdfRoundedBox,
  sdfEllipse,
  sdfTriangle,
  sdfSegment,
  sdfEgg,
  sdfHeart,
  sdfMoon,
  sdfHexagon,
  sdfPentagon,
  sdfStar,
  sdfCross,
  sdfRing,
  // Composition
  sdfUnion,
  sdfSubtract,
  sdfIntersect,
  sdfSmoothUnion,
  sdfSmoothSubtract,
  // Transforms
  sdfOffset,
  sdfRotate,
  sdfScale,
  sdfMirrorX,
  sdfRepeat,
  sdfRepeatBounded,
  // Modifiers
  sdfRound,
  sdfOutline,
  sdfOutlineN,
  // Fill shorthand functions
  solid,
  glow,
  gradient,
  outlineFill,
  solidOutline,
  cosinePalette,
  // Animation helpers
  pulse,
  spin,
  bob,
  breathe,
  // Layout helpers
  createGrid,
  // Frame management
  createSdfFrame,
  // Code generation
  compileToWgsl,
  // Entity creation
  sdfEntity,
  // Entity management
  getSdfEntity,
  clearSdfEntities,
  flushSdfEntities,
} from "./sdf.ts";
