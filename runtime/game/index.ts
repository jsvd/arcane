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

// Game bootstrap
export { createGame } from "./game.ts";
