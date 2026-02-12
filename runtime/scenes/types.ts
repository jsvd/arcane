/**
 * Scene management type definitions.
 */

/** Context passed to scene lifecycle callbacks for stack navigation. */
export type SceneContext = Readonly<{
  /** Push a new scene on top of the stack (current scene pauses). */
  push: (scene: SceneInstance<any>, transition?: TransitionConfig) => void;
  /** Pop the current scene (resumes the one below). No-op if only one scene on stack. */
  pop: (transition?: TransitionConfig) => void;
  /** Replace the current scene (exit current, enter new). */
  replace: (scene: SceneInstance<any>, transition?: TransitionConfig) => void;
  /** Get data passed to this scene via createSceneInstance. */
  getData: <T = unknown>() => T | undefined;
}>;

/** Definition of a scene: name + lifecycle hooks. All hooks except name and create are optional. */
export type SceneDef<S = void> = Readonly<{
  /** Unique name for this scene (for debugging). */
  name: string;
  /** Factory function that creates initial state for each instance. */
  create: () => S;
  /** Called once when scene first becomes active (pushed/replaced onto stack). */
  onEnter?: (state: S, ctx: SceneContext) => S;
  /** Called every frame while the scene is the active (topmost) scene. */
  onUpdate?: (state: S, dt: number, ctx: SceneContext) => S;
  /** Called every frame for rendering while scene is active. */
  onRender?: (state: S, ctx: SceneContext) => void;
  /** Called when another scene is pushed on top of this one. */
  onPause?: (state: S) => S;
  /** Called when the scene above is popped, making this one active again. */
  onResume?: (state: S, ctx: SceneContext) => S;
  /** Called when scene is removed from the stack (popped or replaced). */
  onExit?: (state: S) => void;
}>;

/** A live instance of a scene with its runtime state. */
export type SceneInstance<S = unknown> = {
  def: SceneDef<S>;
  state: S;
  entered: boolean;
  data?: unknown;
};

/** Transition visual effect type. */
export type TransitionType = "none" | "fade";

/** Configuration for scene transitions. */
export type TransitionConfig = {
  /** Transition type. Default: "fade". */
  type?: TransitionType;
  /** Duration in seconds. Default: 0.3. */
  duration?: number;
  /** Fade color. Default: black { r: 0, g: 0, b: 0 }. */
  color?: { r: number; g: number; b: number };
};
