/**
 * Scene management system
 *
 * Provides scene stack, transitions, and lifecycle hooks for game flow.
 */

export type {
  SceneContext,
  SceneDef,
  SceneInstance,
  TransitionType,
  TransitionConfig,
} from "./types.ts";

export {
  createScene,
  createSceneInstance,
  startSceneManager,
  updateSceneManager,
  pushScene,
  popScene,
  replaceScene,
  getActiveScene,
  getSceneStackDepth,
  isTransitioning,
  stopSceneManager,
} from "./scene.ts";
