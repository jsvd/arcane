/**
 * Arcane Game Convenience Layer.
 *
 * Higher-level helpers that reduce boilerplate for common game patterns:
 * color sprites, HUD rendering, widget auto-wiring, collision events,
 * entity handles, and game bootstrap.
 */

// Types
export type {
  ColorSpriteOptions,
  HUDTextOptions,
  HUDBarOptions,
  HUDLabelOptions,
  HUDOverlayOptions,
  SpritePart,
  SpriteGroupType,
  SpriteGroupDrawOptions,
  PlatformerConfig,
  PlatformerStateType,
  PlatformType,
  FrameInput,
  CollisionCallback,
  CollisionRegistry,
  EntitySprite,
  Entity,
  EntityOptions,
  GameConfig,
  GameContext,
  FrameCallback,
  GameStateConfig,
  Game,
} from "./types.ts";

// Color sprites
export { drawColorSprite } from "./color-sprite.ts";

// HUD helpers
export { hud } from "./hud.ts";

// Widget auto-wiring
export { captureInput, autoUpdateButton, autoUpdateSlider, autoUpdateCheckbox, autoUpdateFocus } from "./widgets.ts";

// Collision events
export { createCollisionRegistry, onBodyCollision, onCollision, removeBodyCollisions, processCollisions } from "./collision.ts";

// Entity handles
export { createEntity, syncEntities, drawEntities, destroyEntity, findEntity, findEntities } from "./entity.ts";

// Sprite groups
export type { SpriteGroup } from "./sprite-group.ts";
export { createSpriteGroup, drawSpriteGroup, getSpritePart, setPartVisible } from "./sprite-group.ts";

// Platformer controller
export type { PlatformerState, Platform } from "./platformer.ts";
export {
  createPlatformerState, platformerMove, platformerJump, platformerStep, platformerApplyImpulse,
  getJumpHeight, getAirtime, getJumpReach,
  gridToPlatforms, platformsFromTilemap,
} from "./platformer.ts";

// Game bootstrap
export { createGame } from "./game.ts";

// Transform hierarchy
export type { SceneNodeId, SceneNode, WorldTransform } from "./transform.ts";
export {
  createNode,
  destroyNode,
  setNodeTransform,
  setParent,
  detachFromParent,
  getWorldTransform,
  getNode,
  getChildren,
  applyToSprite,
} from "./transform.ts";
