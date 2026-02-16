// Arcane Engine — Scenes Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/scenes

declare module "@arcane/runtime/scenes" {
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
      color?: {
          r: number;
          g: number;
          b: number;
      };
  };

  /**
   * Core scene management implementation.
   *
   * Manages a scene stack with lifecycle hooks and optional transitions.
   * Use {@link startSceneManager} to take ownership of onFrame, or call
   * {@link updateSceneManager} manually each frame for custom integration.
   */
  /**
   * Type-safety helper that returns the scene definition unchanged.
   * Use to get type inference on the state parameter without casting.
   *
   * @param def - The scene definition.
   * @returns The same definition, unchanged.
   */
  export declare function createScene<S>(def: SceneDef<S>): SceneDef<S>;
  /**
   * Create a live scene instance from a definition.
   * Calls `def.create()` to produce initial state. The scene is NOT entered yet.
   *
   * @param def - Scene definition.
   * @param data - Optional data accessible via `ctx.getData()` inside lifecycle hooks.
   * @returns A new SceneInstance ready to be pushed onto the stack.
   */
  export declare function createSceneInstance<S>(def: SceneDef<S>, data?: unknown): SceneInstance<S>;
  /**
   * Take ownership of the onFrame loop and push the initial scene.
   * Calls `onFrame()` from the rendering loop module, so only one scene manager
   * (or one onFrame callback) can be active at a time.
   *
   * @param initial - The first scene instance to push.
   * @param options - Optional user onUpdate callback invoked each frame after the scene updates.
   */
  export declare function startSceneManager(initial: SceneInstance<any>, options?: {
      onUpdate?: (dt: number) => void;
  }): void;
  /**
   * Advance the scene manager by one frame. Call this manually if you want to
   * integrate the scene manager into your own onFrame callback instead of using
   * {@link startSceneManager}.
   *
   * @param dt - Delta time in seconds since last frame.
   */
  export declare function updateSceneManager(dt: number): void;
  /**
   * Push a scene onto the stack. The current active scene is paused.
   * If a transition is configured, the push happens at the transition midpoint.
   *
   * @param instance - Scene instance to push.
   * @param transition - Optional transition configuration.
   */
  export declare function pushScene(instance: SceneInstance<any>, transition?: TransitionConfig): void;
  /**
   * Pop the topmost scene from the stack. The scene below resumes.
   * No-op if only one scene remains on the stack.
   * If a transition is configured, the pop happens at the transition midpoint.
   *
   * @param transition - Optional transition configuration.
   */
  export declare function popScene(transition?: TransitionConfig): void;
  /**
   * Replace the topmost scene with a new one.
   * The current scene exits, the new scene enters.
   * If a transition is configured, the replacement happens at the transition midpoint.
   *
   * @param instance - Scene instance to replace with.
   * @param transition - Optional transition configuration.
   */
  export declare function replaceScene(instance: SceneInstance<any>, transition?: TransitionConfig): void;
  /**
   * Get the currently active (topmost) scene instance, or undefined if the stack is empty.
   *
   * @returns The active scene instance.
   */
  export declare function getActiveScene(): SceneInstance | undefined;
  /**
   * Get the number of scenes currently on the stack.
   *
   * @returns Stack depth.
   */
  export declare function getSceneStackDepth(): number;
  /**
   * Check whether a transition is currently in progress.
   *
   * @returns True if transitioning.
   */
  export declare function isTransitioning(): boolean;
  /**
   * Stop the scene manager. Calls onExit on all stacked scenes (bottom to top),
   * then clears the stack.
   */
  export declare function stopSceneManager(): void;
  /**
   * Reset all scene manager state. For testing only.
   */
  export declare function _resetSceneManager(): void;

}
