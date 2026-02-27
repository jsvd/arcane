// Arcane Engine — Rendering Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/rendering

declare module "@arcane/runtime/rendering" {
  /**
   * Opaque handle to a loaded texture. Returned by {@link loadTexture} or {@link createSolidTexture}.
   * A value of 0 means "no texture" (headless mode fallback).
   */
  export type TextureId = number;
  /**
   * Options for drawing a sprite via {@link drawSprite}.
   *
   * Positions are in **world space**. The camera determines what's visible:
   * - Default camera (0, 0): screen center = world (0, 0). Top-left = (-vpW/2, -vpH/2).
   * - After `setCamera(vpW/2, vpH/2)`: screen top-left = world (0, 0) — web-like coords.
   *
   * Y increases downward. The sprite's (x, y) is its top-left corner.
   */
  export type SpriteOptions = {
      /** Texture handle from loadTexture() or createSolidTexture(). */
      textureId: TextureId;
      /** World X position (top-left corner of sprite). See type docs for coordinate system. */
      x: number;
      /** World Y position (top-left corner of sprite). Y increases downward. */
      y: number;
      /** Width in world units (pixels at zoom 1). */
      w: number;
      /** Height in world units (pixels at zoom 1). */
      h: number;
      /** Draw order layer. Lower values are drawn first (behind). Default: 0. Use 100+ for HUD elements. */
      layer?: number;
      /**
       * UV sub-rectangle for atlas/sprite-sheet textures.
       * All values are normalized 0.0-1.0 (fraction of full texture).
       * Default: full texture `{ x: 0, y: 0, w: 1, h: 1 }`.
       */
      uv?: {
          x: number;
          y: number;
          w: number;
          h: number;
      };
      /**
       * RGBA tint color multiplied with the texture color.
       * Each channel is 0.0-1.0. Default: white `{ r: 1, g: 1, b: 1, a: 1 }` (no tint).
       */
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Rotation angle in radians. Default: 0 (no rotation). Positive = clockwise. */
      rotation?: number;
      /** X origin for rotation, 0-1 relative to sprite width. Default: 0.5 (center). */
      originX?: number;
      /** Y origin for rotation, 0-1 relative to sprite height. Default: 0.5 (center). */
      originY?: number;
      /** Mirror the sprite horizontally. Default: false. */
      flipX?: boolean;
      /** Mirror the sprite vertically. Default: false. */
      flipY?: boolean;
      /** Opacity 0-1, multiplied with tint alpha. Default: 1 (fully opaque). */
      opacity?: number;
      /**
       * Blend mode for compositing. Default: "alpha".
       * - "alpha": standard transparency (src * srcA + dst * (1 - srcA))
       * - "additive": glow/fire/particles (src * srcA + dst)
       * - "multiply": shadows/darkening (src * dst)
       * - "screen": highlights/lightening (src + dst * (1 - src))
       */
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
      /**
       * If true, x/y are screen pixels (HUD) and the engine converts to world
       * coordinates using the camera. If false, x/y are world units. Default: false.
       */
      screenSpace?: boolean;
      /** Custom shader handle from createShaderFromSource(). Default: 0 (built-in shader). */
      shaderId?: number;
      /**
       * Simple 2D shadow: draws a squashed, tinted duplicate beneath the sprite.
       * No GPU changes — pure sprite duplication with transform.
       */
      shadow?: {
          /** Horizontal shadow offset in world units. Default: 2. */
          offsetX?: number;
          /** Vertical shadow offset in world units. Default: 4. */
          offsetY?: number;
          /** Shadow tint color. Default: black with 0.3 alpha. */
          color?: {
              r: number;
              g: number;
              b: number;
              a: number;
          };
          /** Vertical scale for the shadow (0.5 = squashed). Default: 0.5. */
          scaleY?: number;
      };
  };
  /** Camera state returned by {@link getCamera}. */
  export type CameraState = {
      /** Camera center X position in world units. */
      x: number;
      /** Camera center Y position in world units. */
      y: number;
      /** Zoom level. 1.0 = default, >1.0 = zoomed in, <1.0 = zoomed out. */
      zoom: number;
  };
  /**
   * Valid key name for {@link isKeyDown} and {@link isKeyPressed}.
   *
   * Arcane uses winit's logical key representation, NOT DOM KeyboardEvent.code.
   * - Letters are **lowercase single characters**: `"a"`, `"b"`, ..., `"z"`
   * - Digits are **single characters**: `"0"`, `"1"`, ..., `"9"`
   * - Named keys: `"Space"`, `"Enter"`, `"Escape"`, `"ArrowUp"`, etc.
   *
   * **Common mistake:** Do NOT use DOM-style codes like `"KeyA"`, `"Digit1"`, `"KeyT"`.
   * Use `"a"`, `"1"`, `"t"` instead.
   */
  export type KeyName = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z" | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Space" | "Enter" | "Escape" | "Backspace" | "Tab" | "Shift" | "Control" | "Alt" | "Delete" | "Home" | "End" | "PageUp" | "PageDown" | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12" | " " | "," | "." | "/" | ";" | "'" | "[" | "]" | "\\" | "-" | "=" | "`" | ">" | "<" | "?" | ":" | "\"" | "{" | "}" | "|" | "+" | "_" | "~" | "!" | "@" | "#" | "$" | "%" | "^" | "&" | "*" | "(" | ")";
  /** Mouse position in screen or world coordinates. */
  export type MousePosition = {
      /** X position in pixels (screen) or world units (world). */
      x: number;
      /** Y position in pixels (screen) or world units (world). */
      y: number;
  };
  /**
   * Opaque handle to a tilemap. Returned by {@link createTilemap}.
   * A value of 0 means "no tilemap" (headless mode fallback).
   */
  export type TilemapId = number;
  /** Options for creating a tilemap via {@link createTilemap}. */
  export type TilemapOptions = {
      /** Texture atlas handle from loadTexture(). Must be a valid TextureId. */
      textureId: number;
      /** Grid width in tiles. Must be a positive integer. */
      width: number;
      /** Grid height in tiles. Must be a positive integer. */
      height: number;
      /** Size of each tile in world units (pixels at zoom 1). Must be positive. */
      tileSize: number;
      /** Number of tile columns in the texture atlas. Must be a positive integer. */
      atlasColumns: number;
      /** Number of tile rows in the texture atlas. Must be a positive integer. */
      atlasRows: number;
  };

  /**
   * Animation state machine for sprite-based character animation.
   *
   * Provides a declarative way to define animation states (idle, walk, run, jump, attack)
   * with transitions between them based on conditions. Supports blending (crossfade)
   * between animations during transitions.
   *
   * @example
   * ```ts
   * const fsm = createAnimationFSM({
   *   states: {
   *     idle: { animationId: idleAnim },
   *     walk: { animationId: walkAnim },
   *     jump: { animationId: jumpAnim, loop: false },
   *   },
   *   transitions: [
   *     { from: "idle", to: "walk", condition: { type: "boolean", param: "isMoving" } },
   *     { from: "walk", to: "idle", condition: { type: "boolean", param: "isMoving", negate: true } },
   *     { from: "any", to: "jump", condition: { type: "trigger", param: "jump" }, priority: 10 },
   *     { from: "jump", to: "idle", condition: { type: "animationFinished" } },
   *   ],
   *   initialState: "idle",
   *   defaultBlendDuration: 0.1,
   * });
   *
   * // Each frame:
   * fsm = updateFSM(fsm, dt, { isMoving: speed > 0 });
   * drawFSMSprite(fsm, x, y, w, h);
   * ```
   */
  /** A named state in the animation state machine. */
  export type FSMStateDef = {
      /** AnimationId to play when this state is active. */
      animationId: AnimationId;
      /** Override the animation's loop setting for this state. */
      loop?: boolean;
      /** Playback speed multiplier. 1 = normal, 2 = double speed. Default: 1. */
      speed?: number;
      /** Called when entering this state. */
      onEnter?: () => void;
      /** Called when exiting this state. */
      onExit?: () => void;
  };
  /** Boolean condition: true when a named parameter is truthy (or falsy if negated). */
  export type BooleanCondition = {
      type: "boolean";
      /** Parameter name to check in the params object. */
      param: string;
      /** If true, condition is met when the param is falsy. Default: false. */
      negate?: boolean;
  };
  /** Threshold condition: true when a named parameter crosses a threshold. */
  export type ThresholdCondition = {
      type: "threshold";
      /** Parameter name to check. */
      param: string;
      /** Threshold value to compare against. */
      value: number;
      /** Comparison operator. Default: "greaterThan". */
      compare?: "greaterThan" | "lessThan" | "greaterOrEqual" | "lessOrEqual";
  };
  /** Trigger condition: true once when a named trigger param is set, then auto-clears. */
  export type TriggerCondition = {
      type: "trigger";
      /** Trigger parameter name. Must be set to true in params to fire. */
      param: string;
  };
  /** Animation finished condition: true when the current state's animation has finished (non-looping). */
  export type AnimationFinishedCondition = {
      type: "animationFinished";
  };
  /** Union of all transition condition types. */
  export type TransitionCondition = BooleanCondition | ThresholdCondition | TriggerCondition | AnimationFinishedCondition;
  /** A transition between states in the animation FSM. */
  export type FSMTransition = {
      /** Source state name, or "any" to match all states. */
      from: string;
      /** Destination state name. */
      to: string;
      /** Condition that must be met for the transition to fire. */
      condition: TransitionCondition;
      /** Higher priority transitions are evaluated first. Default: 0. */
      priority?: number;
      /** Duration of crossfade blend in seconds. Overrides defaultBlendDuration. */
      blendDuration?: number;
  };
  /** Configuration for creating an animation FSM. */
  export type FSMConfig = {
      /** Map of state names to state definitions. */
      states: Record<string, FSMStateDef>;
      /** List of transitions between states. */
      transitions: FSMTransition[];
      /** Name of the initial state. Must be a key in `states`. */
      initialState: string;
      /** Default crossfade blend duration in seconds. 0 = instant. Default: 0. */
      defaultBlendDuration?: number;
  };
  /** Parameters passed to updateFSM each frame. Keys are param names, values are booleans or numbers. */
  export type FSMParams = Record<string, boolean | number>;
  /** Active blend state during a crossfade transition. */
  export type BlendState = {
      /** Animation state of the outgoing (previous) animation. */
      fromAnim: AnimationState;
      /** AnimationId of the outgoing animation (for UV/texture lookup). */
      fromAnimId: AnimationId;
      /** Elapsed blend time in seconds. */
      elapsed: number;
      /** Total blend duration in seconds. */
      duration: number;
  };
  /** The runtime state of an animation FSM instance. */
  export type FSMState = {
      /** The FSM configuration (immutable reference). */
      config: FSMConfig;
      /** Name of the current active state. */
      currentState: string;
      /** Animation playback state for the current animation. */
      animation: AnimationState;
      /** Active blend/crossfade, or null if not blending. */
      blend: BlendState | null;
      /** Sorted transitions (by priority descending) for efficient evaluation. */
      sortedTransitions: FSMTransition[];
  };
  /**
   * Create an animation state machine instance.
   *
   * @param config - FSM configuration with states, transitions, and initial state.
   * @returns A new FSMState ready for updates.
   */
  export declare function createAnimationFSM(config: FSMConfig): FSMState;
  /**
   * Get the name of the current active state.
   *
   * @param fsm - The FSM state.
   * @returns Current state name.
   */
  export declare function getCurrentState(fsm: FSMState): string;
  /**
   * Check if the FSM is currently blending between two animations.
   *
   * @param fsm - The FSM state.
   * @returns True if a crossfade blend is in progress.
   */
  export declare function isBlending(fsm: FSMState): boolean;
  /**
   * Get the blend progress (0 = fully old animation, 1 = fully new animation).
   *
   * @param fsm - The FSM state.
   * @returns Blend progress 0-1, or 1 if not blending.
   */
  export declare function getBlendProgress(fsm: FSMState): number;
  /**
   * Force the FSM into a specific state immediately, bypassing transitions.
   * Fires onExit for the old state and onEnter for the new state.
   *
   * @param fsm - Current FSM state.
   * @param stateName - Name of the state to switch to.
   * @param blendDuration - Optional crossfade duration. 0 = instant.
   * @returns Updated FSM state.
   */
  export declare function setFSMState(fsm: FSMState, stateName: string, blendDuration?: number): FSMState;
  /**
   * Update the animation FSM. Evaluates transitions, advances animations, and
   * progresses any active blend. Trigger params are consumed after evaluation.
   *
   * @param fsm - Current FSM state.
   * @param dt - Time delta in seconds.
   * @param params - Named parameters for transition conditions.
   * @returns Updated FSM state.
   */
  export declare function updateFSM(fsm: FSMState, dt: number, params?: FSMParams): FSMState;
  /**
   * Draw the FSM's current animation sprite, with crossfade blending if active.
   * During a blend, draws both old and new animations with interpolated opacity.
   *
   * @param fsm - Current FSM state.
   * @param x - World X position.
   * @param y - World Y position.
   * @param w - Width in world units.
   * @param h - Height in world units.
   * @param options - Optional layer, tint, flipX, flipY.
   */
  export declare function drawFSMSprite(fsm: FSMState, x: number, y: number, w: number, h: number, options?: {
      layer?: number;
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      flipX?: boolean;
      flipY?: boolean;
  }): void;

  /**
   * Opaque handle to a registered animation definition.
   * Returned by {@link createAnimation}.
   */
  export type AnimationId = number;
  /** Callback invoked when a specific animation frame is reached. */
  export type FrameEventCallback = (frame: number) => void;
  /** A frame event binding: fires callback when the animation reaches a specific frame. */
  export type FrameEvent = {
      /** The frame index (0-based) that triggers this event. */
      frame: number;
      /** Callback invoked when the frame is reached. */
      callback: FrameEventCallback;
  };
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
      /** Number of columns in the spritesheet (default: all frames in one row). */
      cols?: number;
      /** Number of rows in the spritesheet (default: 1). */
      rows?: number;
      /** Frame events: callbacks triggered when specific frames are reached. */
      events?: FrameEvent[];
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
  /**
   * Register a sprite-sheet animation definition.
   * Frames can be arranged in a single row (default) or in a grid (cols × rows).
   *
   * @param textureId - Texture handle of the sprite sheet (from loadTexture()).
   * @param frameW - Width of each frame in pixels.
   * @param frameH - Height of each frame in pixels.
   * @param frameCount - Number of frames in the animation.
   * @param fps - Playback speed in frames per second. Higher = faster.
   * @param options - Optional settings:
   *   - `loop`: whether to loop (default: true)
   *   - `cols`: number of columns in the grid (default: frameCount = single row)
   *   - `rows`: number of rows in the grid (default: 1)
   * @returns AnimationId handle for use with playAnimation().
   *
   * @example
   * // Single row: 6 frames in one row
   * createAnimation(tex, 32, 32, 6, 10);
   *
   * // Grid: 6×4 spritesheet (24 frames total)
   * createAnimation(tex, 32, 32, 24, 10, { cols: 6, rows: 4 });
   */
  export declare function createAnimation(textureId: TextureId, frameW: number, frameH: number, frameCount: number, fps: number, options?: {
      loop?: boolean;
      cols?: number;
      rows?: number;
      events?: FrameEvent[];
  }): AnimationId;
  /**
   * Add a frame event to an existing animation definition.
   * The callback fires each time updateAnimationWithEvents() crosses the given frame.
   *
   * @param defId - AnimationId to add the event to.
   * @param frame - Frame index (0-based) that triggers the event.
   * @param callback - Function called when the frame is reached.
   */
  export declare function onFrameEvent(defId: AnimationId, frame: number, callback: FrameEventCallback): void;
  /**
   * Advance an animation and fire any frame events that were crossed.
   * Events fire for every frame crossed between the old and new frame index,
   * including on loop wraps. Each event fires at most once per update call.
   *
   * @param anim - Current animation state.
   * @param dt - Time delta in seconds.
   * @returns Updated animation state (same as updateAnimation).
   */
  export declare function updateAnimationWithEvents(anim: AnimationState, dt: number): AnimationState;
  /**
   * Get the animation definition for a given ID.
   * Useful for querying frame count, fps, texture, and events.
   *
   * @param defId - AnimationId to look up.
   * @returns The animation definition, or undefined if not found.
   */
  export declare function getAnimationDef(defId: AnimationId): AnimationDef | undefined;
  /**
   * Create a new animation playback state starting from frame 0.
   *
   * @param defId - AnimationId from createAnimation().
   * @returns Fresh AnimationState at frame 0.
   */
  export declare function playAnimation(defId: AnimationId): AnimationState;
  /**
   * Advance an animation by a time delta. Returns a new immutable state.
   * For looping animations, wraps around. For non-looping, stops at the last frame.
   *
   * @param anim - Current animation state.
   * @param dt - Time delta in seconds (from getDeltaTime()).
   * @returns Updated animation state.
   */
  export declare function updateAnimation(anim: AnimationState, dt: number): AnimationState;
  /**
   * Get the UV sub-rectangle for the current animation frame.
   * Supports both single-row (default) and grid-based (cols × rows) layouts.
   * Used internally by drawAnimatedSprite; also useful for custom rendering.
   *
   * @param anim - Current animation state.
   * @returns UV rect (0.0-1.0 normalized) for the current frame.
   */
  export declare function getAnimationUV(anim: AnimationState): {
      x: number;
      y: number;
      w: number;
      h: number;
  };
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
  export declare function drawAnimatedSprite(anim: AnimationState, x: number, y: number, w: number, h: number, options?: {
      layer?: number;
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
  }): void;
  /**
   * Reset an animation to frame 0 (restart from beginning).
   *
   * @param anim - Animation state to reset.
   * @returns New animation state at frame 0, not finished.
   */
  export declare function resetAnimation(anim: AnimationState): AnimationState;
  /**
   * Stop an animation immediately by marking it as finished.
   *
   * @param anim - Animation state to stop.
   * @returns New animation state with finished = true.
   */
  export declare function stopAnimation(anim: AnimationState): AnimationState;

  /**
   * Sprite Atlas - Load Asset Palace JSON definitions and draw sprites by name.
   * Handles UV normalization automatically.
   */
  /** Static sprite definition (pixel coordinates). */
  export type StaticSpriteDef = {
      x: number;
      y: number;
      w?: number;
      h?: number;
      file?: string;
  };
  /** Animated sprite definition (multiple frames). */
  export type AnimatedSpriteDef = {
      frames: Array<{
          x: number;
          y: number;
          w?: number;
          h?: number;
      }>;
      fps?: number;
      loop?: boolean;
      file?: string;
  };
  /** Either static or animated sprite. */
  export type SpriteDef = StaticSpriteDef | AnimatedSpriteDef;
  /** Asset Palace pack definition. */
  export type PackDefinition = {
      id: string;
      name?: string;
      source?: string;
      license?: string;
      downloadUrl?: string;
      primarySheet: string;
      tileSize?: number;
      /** Sheet dimensions in pixels (required for UV normalization). */
      sheetWidth: number;
      sheetHeight: number;
      sprites: Record<string, SpriteDef>;
      tags?: Record<string, string[]>;
  };
  /** Options for loading an atlas. */
  export type LoadAtlasOptions = {
      /** Base path to prepend to sheet paths. */
      basePath?: string;
  };
  /** Options for drawing a sprite from an atlas. */
  export type AtlasSpriteOptions = {
      /** World X position (sprite is centered here). */
      x: number;
      /** World Y position (sprite is centered here). */
      y: number;
      /** Uniform scale (1 = original pixel size). */
      scale?: number;
      /** Override width (in pixels, pre-scale). */
      w?: number;
      /** Override height (in pixels, pre-scale). */
      h?: number;
      /** Draw order layer. */
      layer?: number;
      /** Rotation in radians. */
      rotation?: number;
      /** Rotation origin X (0-1). Default: 0.5. */
      originX?: number;
      /** Rotation origin Y (0-1). Default: 0.5. */
      originY?: number;
      /** Mirror horizontally. */
      flipX?: boolean;
      /** Mirror vertically. */
      flipY?: boolean;
      /** Opacity (0-1). */
      opacity?: number;
      /** Tint color. */
      tint?: Color;
      /** Blend mode. */
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
      /** Screen-space rendering (for HUD). */
      screenSpace?: boolean;
      /** For animated sprites: frame index (0-based). */
      frame?: number;
  };
  /** Sprite info returned by atlas.info(). */
  export type SpriteInfo = {
      /** Width in pixels. */
      w: number;
      /** Height in pixels. */
      h: number;
      /** Number of animation frames (1 for static sprites). */
      frames: number;
      /** Frames per second (for animated sprites). */
      fps?: number;
      /** Whether animation loops (for animated sprites). */
      loop?: boolean;
  };
  /** Loaded sprite atlas with texture and normalized UVs. */
  export type SpriteAtlas = {
      /** Pack ID from the JSON. */
      readonly id: string;
      /** Loaded texture handle. */
      readonly textureId: TextureId;
      /** Sheet dimensions in pixels. */
      readonly sheetWidth: number;
      readonly sheetHeight: number;
      /** Default tile size from pack. */
      readonly tileSize: number;
      /** Raw sprite definitions. */
      readonly sprites: Record<string, SpriteDef>;
      /** Tag index for lookup. */
      readonly tags: Record<string, string[]>;
      /** Get sprite names matching a tag. */
      getByTag(tag: string): string[];
      /** Check if a sprite exists. */
      has(name: string): boolean;
      /** Get sprite info (dimensions, frame count). */
      info(name: string): SpriteInfo | null;
      /** Build SpriteOptions for drawing (handles UV normalization). */
      sprite(name: string, opts: AtlasSpriteOptions): SpriteOptions;
      /** Draw a sprite directly (convenience). */
      draw(name: string, opts: AtlasSpriteOptions): void;
      /** Get all sprite names in this atlas. */
      getSpriteNames(): string[];
      /** Get all tags in this atlas. */
      getTagNames(): string[];
  };
  /**
   * Load a sprite atlas from a parsed Asset Palace definition.
   *
   * @param def - Pack definition object with sprite coordinates.
   * @param options - Loading options (base path for textures).
   * @returns Loaded atlas with sprite lookup methods.
   *
   * @example
   * const atlas = loadAtlasFromDef({
   *   id: "space-shooter",
   *   primarySheet: "Spritesheet/sheet.png",
   *   sheetWidth: 1024,
   *   sheetHeight: 1024,
   *   sprites: {
   *     "player-ship": { x: 211, y: 941, w: 99, h: 75 },
   *     "enemy-ufo": { x: 444, y: 0, w: 91, h: 91 },
   *   },
   * }, { basePath: "assets/space-shooter-redux/" });
   *
   * atlas.draw("player-ship", { x: 100, y: 200, scale: 0.5 });
   */
  export declare function loadAtlasFromDef(def: PackDefinition, options?: LoadAtlasOptions): SpriteAtlas;
  /**
   * Create an empty atlas builder for defining sprites programmatically.
   * Useful when you don't have Asset Palace JSON but want the atlas API.
   *
   * @param textureId - Loaded texture handle.
   * @param sheetWidth - Sheet width in pixels.
   * @param sheetHeight - Sheet height in pixels.
   * @returns Atlas builder with addSprite() method.
   *
   * @example
   * const tex = loadTexture("my-sheet.png");
   * const builder = createAtlasBuilder(tex, 256, 256);
   * builder.addSprite("player", { x: 0, y: 0, w: 32, h: 32 });
   * builder.addSprite("enemy", { x: 32, y: 0, w: 32, h: 32 });
   * const atlas = builder.build();
   */
  export declare function createAtlasBuilder(textureId: TextureId, sheetWidth: number, sheetHeight: number): {
      addSprite(name: string, def: StaticSpriteDef): void;
      addAnimatedSprite(name: string, def: AnimatedSpriteDef): void;
      addTag(tag: string, spriteNames: string[]): void;
      build(id?: string): SpriteAtlas;
  };

  /**
   * Opaque handle to a loaded sound. Returned by {@link loadSound}.
   * A value of 0 means "no sound" (headless mode fallback).
   */
  export type SoundId = number;
  /**
   * Unique identifier for a sound instance. Each call to {@link playSound} or
   * {@link playSoundAt} returns a new InstanceId.
   */
  export type InstanceId = number;
  /**
   * Audio bus identifier for grouping sounds.
   * - "sfx" — Sound effects (default)
   * - "music" — Background music
   * - "ambient" — Ambient loops
   * - "voice" — Dialog and voice-over
   */
  export type AudioBus = "sfx" | "music" | "ambient" | "voice";
  /** Options for {@link playSound}. */
  export type PlayOptions = {
      /** Playback volume, 0.0 (silent) to 1.0 (full). Default: 1.0. */
      volume?: number;
      /** If true, sound loops until stopped. Default: false. */
      loop?: boolean;
      /** Audio bus to route this sound through. Default: "sfx". */
      bus?: AudioBus;
      /** Stereo panning: -1.0 (left) to 1.0 (right). Default: 0.0 (center). */
      pan?: number;
      /** Playback pitch multiplier. 1.0 = normal, 2.0 = double speed. Default: 1.0. */
      pitch?: number;
      /** Random pitch variation amount added/subtracted from pitch. Default: 0.0. */
      pitchVariation?: number;
      /** Low-pass filter cutoff frequency in Hz. 0 = disabled. Default: 0. */
      lowPassFreq?: number;
      /** Reverb mix amount, 0.0 (dry) to 1.0 (fully wet). Default: 0.0. */
      reverb?: number;
      /** Reverb delay in milliseconds. Default: 50. */
      reverbDelay?: number;
  };
  /** Options for {@link playSoundAt} spatial audio. */
  export type SpatialOptions = PlayOptions & {
      /** World X coordinate of sound source. */
      x: number;
      /** World Y coordinate of sound source. */
      y: number;
      /** Maximum audible distance from listener. Default: 500. */
      maxDistance?: number;
      /** Reference distance for volume falloff. Default: 50. */
      refDistance?: number;
  };
  /** Pool configuration for limiting concurrent instances of a sound. */
  export type PoolConfig = {
      /** Maximum concurrent instances. Default: unlimited. */
      maxInstances?: number;
      /** What to do when pool is full: "oldest" = stop oldest, "reject" = don't play new. Default: "oldest". */
      policy?: "oldest" | "reject";
  };
  /**
   * Load a sound file (WAV, OGG, MP3). Returns an opaque sound handle.
   * Caches by path -- loading the same path twice returns the same handle.
   * Returns 0 in headless mode.
   *
   * @param path - File path to an audio file (relative to game entry file or absolute).
   * @returns Sound handle for use with playSound(), stopSound().
   */
  export declare function loadSound(path: string): SoundId;
  /**
   * Play a loaded sound effect and return an instance ID for later control.
   * No-op in headless mode (but still returns a unique InstanceId).
   *
   * @param id - Sound handle from loadSound().
   * @param options - Volume, loop, bus, pan, pitch, effects settings.
   * @returns Unique instance ID for controlling this sound instance.
   */
  export declare function playSound(id: SoundId, options?: PlayOptions): InstanceId;
  /**
   * Load and play a sound file as looping background music.
   * Convenience function combining loadSound() + playSound() with loop: true and bus: "music".
   *
   * @param path - File path to an audio file.
   * @param volume - Playback volume, 0.0-1.0. Default: 1.0.
   * @returns Instance ID for controlling this music instance.
   */
  export declare function playMusic(path: string, volume?: number): InstanceId;
  /**
   * Stop a specific playing sound.
   * No-op in headless mode.
   *
   * @param id - Sound handle from loadSound().
   */
  export declare function stopSound(id: SoundId): void;
  /**
   * Stop all currently playing sounds and music.
   * No-op in headless mode.
   */
  export declare function stopAll(): void;
  /**
   * Set the master volume for all audio output.
   * No-op in headless mode.
   *
   * @param volume - Master volume level, 0.0 (mute) to 1.0 (full). Values outside this range are not clamped.
   */
  export declare function setVolume(volume: number): void;
  /**
   * Play a sound at a specific world position with spatial audio.
   * Volume automatically attenuates based on distance from listener.
   * No-op in headless mode (but still returns a unique InstanceId).
   *
   * @param id - Sound handle from loadSound().
   * @param options - Spatial position, volume, loop, and other settings.
   * @returns Unique instance ID for controlling this sound instance.
   */
  export declare function playSoundAt(id: SoundId, options: SpatialOptions): InstanceId;
  /**
   * Crossfade from current music to a new track.
   * Tweens the old music volume down and new music volume up over the specified duration.
   * No-op in headless mode (but still returns a unique InstanceId).
   *
   * @param path - File path to the new music file.
   * @param duration - Crossfade duration in milliseconds. Default: 2000.
   * @param volume - Target volume for the new music. Default: 1.0.
   * @returns Instance ID of the new music track.
   */
  export declare function crossfadeMusic(path: string, duration?: number, volume?: number): InstanceId;
  /**
   * Stop a specific sound instance.
   * No-op in headless mode.
   *
   * @param instanceId - Instance ID from playSound() or playSoundAt().
   */
  export declare function stopInstance(instanceId: InstanceId): void;
  /**
   * Set the volume of a specific audio bus.
   * Affects all sounds currently playing or that will play on this bus.
   * No-op in headless mode (but still updates local state).
   *
   * @param bus - Audio bus identifier.
   * @param volume - Bus volume level, 0.0 (mute) to 1.0 (full).
   */
  export declare function setBusVolume(bus: AudioBus, volume: number): void;
  /**
   * Get the current volume of a specific audio bus.
   *
   * @param bus - Audio bus identifier.
   * @returns Current bus volume, 0.0 to 1.0.
   */
  export declare function getBusVolume(bus: AudioBus): number;
  /**
   * Set the listener position for spatial audio calculations.
   * Typically this should match the camera position or player position.
   * No-op in headless mode (but still updates local state).
   *
   * @param x - Listener X position in world coordinates.
   * @param y - Listener Y position in world coordinates.
   */
  export declare function setListenerPosition(x: number, y: number): void;
  /**
   * Update spatial audio for all active spatial instances.
   * Should be called once per frame (typically in onFrame callback) if using spatial audio.
   * No-op in headless mode.
   */
  export declare function updateSpatialAudio(): void;
  /**
   * Configure pooling limits for a sound.
   * When maxInstances is reached, either the oldest instance is stopped (policy: "oldest")
   * or new play requests are rejected (policy: "reject").
   *
   * @param id - Sound handle from loadSound().
   * @param config - Pool configuration.
   */
  export declare function setPoolConfig(id: SoundId, config: PoolConfig): void;
  /**
   * Set the volume of a specific sound instance.
   * No-op in headless mode.
   *
   * @param instanceId - Instance ID from playSound() or playSoundAt().
   * @param volume - Volume level, 0.0 (mute) to 1.0 (full).
   */
  export declare function setInstanceVolume(instanceId: InstanceId, volume: number): void;

  /**
   * Auto-tiling: bitmask-based automatic tile selection.
   *
   * Supports two tile set sizes:
   * - **4-bit (16 tiles)**: Checks cardinal neighbors (N, E, S, W).
   * - **8-bit (47 tiles)**: Checks all 8 neighbors (N, NE, E, SE, S, SW, W, NW).
   *   Corner bits are only set when both adjacent cardinal neighbors are present
   *   (Wang blob tile convention).
   *
   * Usage:
   * 1. Define an auto-tile rule with computeAutotileBitmask4 or computeAutotileBitmask8.
   * 2. Map bitmask values to atlas tile IDs with an AutotileMapping.
   * 3. Call applyAutotile() on a tilemap to resolve all auto-tiles.
   */
  /** Cardinal direction bits for 4-bit auto-tiling. */
  export declare const NORTH = 1;
  export declare const EAST = 2;
  export declare const SOUTH = 4;
  export declare const WEST = 8;
  /** All 8 direction bits for 8-bit auto-tiling. */
  export declare const NORTHEAST = 16;
  export declare const SOUTHEAST = 32;
  export declare const SOUTHWEST = 64;
  export declare const NORTHWEST = 128;
  /**
   * Callback to check if a tile at (gx, gy) is considered "same" as the
   * auto-tiled group. Return true if the neighbor should be considered connected.
   */
  export type NeighborCheck = (gx: number, gy: number) => boolean;
  /**
   * Compute a 4-bit bitmask from cardinal neighbors.
   * Bit layout: N=1, E=2, S=4, W=8.
   * Results in values 0-15 (16 possible tiles).
   *
   * @param gx - Grid X position of the tile being computed.
   * @param gy - Grid Y position of the tile being computed.
   * @param check - Function that returns true if a neighbor is "same".
   * @returns Bitmask value 0-15.
   */
  export declare function computeAutotileBitmask4(gx: number, gy: number, check: NeighborCheck): number;
  /**
   * Compute an 8-bit bitmask from all 8 neighbors.
   * Cardinal bits: N=1, E=2, S=4, W=8.
   * Diagonal bits (Wang blob convention): NE=16, SE=32, SW=64, NW=128.
   *
   * Diagonal bits are only set when BOTH adjacent cardinal neighbors are present.
   * Example: NE is only set if both N and E are present.
   * This reduces 256 combinations to 47 unique tiles (standard blob tileset).
   *
   * @param gx - Grid X position of the tile being computed.
   * @param gy - Grid Y position of the tile being computed.
   * @param check - Function that returns true if a neighbor is "same".
   * @returns Bitmask value 0-255 (but only 47 unique meaningful values).
   */
  export declare function computeAutotileBitmask8(gx: number, gy: number, check: NeighborCheck): number;
  /**
   * Maps bitmask values to atlas tile IDs.
   * Key = bitmask, value = tile ID in the atlas (1-based).
   */
  export type AutotileMapping = Map<number, number>;
  /**
   * Create a simple 4-bit autotile mapping from an array of 16 tile IDs.
   * Index in the array corresponds to the bitmask value (0-15).
   *
   * @param tileIds - Array of exactly 16 tile IDs, indexed by bitmask.
   * @returns AutotileMapping for use with applyAutotile().
   */
  export declare function createAutotileMapping4(tileIds: number[]): AutotileMapping;
  /**
   * Create an 8-bit autotile mapping from a lookup object.
   * Keys are bitmask values, values are tile IDs.
   *
   * @param lookup - Object mapping bitmask values to tile IDs.
   * @returns AutotileMapping for use with applyAutotile().
   */
  export declare function createAutotileMapping8(lookup: Record<number, number>): AutotileMapping;
  /** An auto-tile rule: which tiles trigger auto-tiling and how to map them. */
  export type AutotileRule = {
      /** Tile IDs that belong to this auto-tile group. */
      memberTileIds: Set<number>;
      /** Bitmask mode: 4 (cardinal only) or 8 (with diagonals). */
      mode: 4 | 8;
      /** Mapping from bitmask to atlas tile ID. */
      mapping: AutotileMapping;
      /** Fallback tile ID if the bitmask has no mapping entry. */
      fallbackTileId: number;
  };
  /**
   * Create an auto-tile rule.
   *
   * @param memberTileIds - Array of tile IDs that belong to this group.
   * @param mode - 4 for cardinal-only, 8 for full 8-directional.
   * @param mapping - Bitmask-to-tile-ID mapping.
   * @param fallbackTileId - Tile ID to use when bitmask has no mapping entry.
   */
  export declare function createAutotileRule(memberTileIds: number[], mode: 4 | 8, mapping: AutotileMapping, fallbackTileId: number): AutotileRule;
  /**
   * Resolve a single position's auto-tile. Returns the tile ID that should
   * be placed based on the bitmask of neighbors.
   *
   * @param gx - Grid X position.
   * @param gy - Grid Y position.
   * @param rule - The auto-tile rule to apply.
   * @param check - Function that returns true if the tile at (gx, gy) is in the same group.
   * @returns The resolved tile ID from the mapping.
   */
  export declare function resolveAutotile(gx: number, gy: number, rule: AutotileRule, check: NeighborCheck): number;
  /**
   * Apply auto-tiling to a grid region. For each position, if the tile is a
   * member of the rule's group, compute its bitmask and replace with the
   * mapped tile ID.
   *
   * @param width - Grid width.
   * @param height - Grid height.
   * @param getTileFn - Function to get tile ID at (gx, gy).
   * @param setTileFn - Function to set tile ID at (gx, gy).
   * @param rule - The auto-tile rule to apply.
   * @param startX - Region start X (default 0).
   * @param startY - Region start Y (default 0).
   * @param endX - Region end X exclusive (default width).
   * @param endY - Region end Y exclusive (default height).
   */
  export declare function applyAutotile(width: number, height: number, getTileFn: (gx: number, gy: number) => number, setTileFn: (gx: number, gy: number, tileId: number) => void, rule: AutotileRule, startX?: number, startY?: number, endX?: number, endY?: number): void;
  /**
   * Standard 4-bit autotile bitmask layout (for reference).
   * Each value describes which cardinal neighbors are present.
   *
   * ```
   *  0 = isolated       (no neighbors)
   *  1 = N only
   *  2 = E only
   *  3 = N+E  (inner corner)
   *  4 = S only
   *  5 = N+S  (vertical)
   *  6 = E+S  (inner corner)
   *  7 = N+E+S
   *  8 = W only
   *  9 = N+W  (inner corner)
   * 10 = E+W  (horizontal)
   * 11 = N+E+W
   * 12 = S+W  (inner corner)
   * 13 = N+S+W
   * 14 = E+S+W
   * 15 = all  (center)
   * ```
   */
  export declare const BITMASK4_LABELS: ReadonlyArray<string>;

  /** Camera bounds: world-space limits the camera cannot exceed. */
  export type CameraBounds = {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
  };
  /** Camera deadzone: target can move within this region without camera following. */
  export type CameraDeadzone = {
      /** Deadzone width in world units, centered on camera. */
      width: number;
      /** Deadzone height in world units, centered on camera. */
      height: number;
  };
  /**
   * Set the camera position and zoom level.
   * The camera determines which part of the world is visible on screen.
   * The camera center appears at the center of the viewport.
   * No-op in headless mode.
   *
   * **Default camera is (0, 0)** — world origin is at screen center, NOT top-left.
   * For web-like coordinates where (0, 0) is top-left:
   * `setCamera(vpW / 2, vpH / 2)` (use getViewportSize() for vpW/vpH).
   *
   * @param x - Camera center X in world units.
   * @param y - Camera center Y in world units.
   * @param zoom - Zoom level. 1.0 = default, >1.0 = zoomed in, <1.0 = zoomed out. Default: 1.
   *
   * @example
   * // Web-like coords: (0, 0) at top-left
   * const { width, height } = getViewportSize();
   * setCamera(width / 2, height / 2);
   *
   * @example
   * // Center camera on the player (scrolling game)
   * setCamera(player.x, player.y);
   *
   * @example
   * // Zoomed-in camera
   * setCamera(player.x, player.y, 2.0);
   */
  export declare function setCamera(x: number, y: number, zoom?: number): void;
  /**
   * Get the current camera state (position and zoom).
   * Returns `{ x: 0, y: 0, zoom: 1 }` in headless mode.
   *
   * @returns Current camera position and zoom level.
   */
  export declare function getCamera(): CameraState;
  /**
   * Center the camera on a target position. Convenience wrapper around {@link setCamera}.
   * Call every frame to follow a moving target.
   *
   * @param targetX - Target X position in world units to center on.
   * @param targetY - Target Y position in world units to center on.
   * @param zoom - Zoom level. Default: 1.
   *
   * @example
   * // Follow the player each frame
   * followTarget(player.x, player.y);
   */
  export declare function followTarget(targetX: number, targetY: number, zoom?: number): void;
  /**
   * Set world-space bounds that the camera cannot exceed.
   * The camera is clamped so the visible area stays within these bounds.
   * If the visible area is larger than the bounds, the camera centers on the bounds.
   * Bounds are enforced on the Rust/GPU side every frame.
   *
   * @param bounds - World-space limits, or `null` to clear bounds.
   *
   * @example
   * // Restrict camera to a 1600×1200 map starting at origin
   * setCameraBounds({ minX: 0, minY: 0, maxX: 1600, maxY: 1200 });
   *
   * @example
   * // Remove bounds
   * setCameraBounds(null);
   */
  export declare function setCameraBounds(bounds: CameraBounds | null): void;
  /**
   * Get the current camera bounds, or `null` if no bounds are set.
   *
   * @returns Current bounds or null.
   */
  export declare function getCameraBounds(): CameraBounds | null;
  /**
   * Set a deadzone: an area centered on the camera where the target can move
   * without the camera following. The camera only moves when the target exits
   * the deadzone rectangle.
   *
   * @param deadzone - Deadzone dimensions in world units, or `null` to disable.
   *
   * @example
   * // Player can move 200×150 world units before camera follows
   * setCameraDeadzone({ width: 200, height: 150 });
   */
  export declare function setCameraDeadzone(deadzone: CameraDeadzone | null): void;
  /**
   * Get the current camera deadzone, or `null` if no deadzone is set.
   */
  export declare function getCameraDeadzone(): CameraDeadzone | null;
  /**
   * Smoothly follow a target position using exponential interpolation.
   * Call every frame. The camera lerps toward the target position at a rate
   * controlled by `smoothness`. Respects deadzone if set.
   *
   * Uses frame-rate independent smoothing: `lerp = 1 - smoothness^dt`.
   * At smoothness=0.1 the camera reaches ~90% of the target in 1 second.
   *
   * @param targetX - Target X position in world units.
   * @param targetY - Target Y position in world units.
   * @param zoom - Zoom level. Default: 1.
   * @param smoothness - Smoothing factor (0..1). Lower = faster follow. Default: 0.1.
   *   - 0.001: very fast (nearly instant)
   *   - 0.1: smooth (default)
   *   - 0.5: slow/cinematic
   *
   * @example
   * onFrame(() => {
   *   followTargetSmooth(player.x, player.y, 1, 0.1);
   * });
   */
  export declare function followTargetSmooth(targetX: number, targetY: number, zoom?: number, smoothness?: number): void;
  /**
   * Smoothly animate the camera zoom to a target level over a duration.
   * Uses the tweening system for frame-rate independent animation.
   *
   * @param targetZoom - Target zoom level.
   * @param duration - Animation duration in seconds.
   * @param easing - Optional easing function. Default: linear.
   *
   * @example
   * // Zoom in to 2x over 0.5 seconds
   * zoomTo(2.0, 0.5, easeOutQuad);
   */
  export declare function zoomTo(targetZoom: number, duration: number, easing?: (t: number) => number): void;
  /**
   * Smoothly animate the camera zoom while keeping a world point stationary on screen.
   * Useful for zooming into/out of a specific location (e.g., mouse cursor position).
   *
   * @param targetZoom - Target zoom level.
   * @param worldX - World X coordinate to keep fixed on screen.
   * @param worldY - World Y coordinate to keep fixed on screen.
   * @param duration - Animation duration in seconds.
   * @param easing - Optional easing function. Default: linear.
   *
   * @example
   * // Zoom into the point under the mouse
   * const mouse = getMouseWorldPosition();
   * zoomToPoint(3.0, mouse.x, mouse.y, 0.3, easeOutCubic);
   */
  export declare function zoomToPoint(targetZoom: number, worldX: number, worldY: number, duration: number, easing?: (t: number) => number): void;
  /**
   * Follow a target with smooth interpolation and automatic camera shake offset.
   * Wraps {@link followTargetSmooth} + {@link getCameraShakeOffset} into one call.
   *
   * Equivalent to:
   * ```ts
   * const shake = getCameraShakeOffset();
   * followTargetSmooth(targetX + shake.x, targetY + shake.y, zoom, smoothness);
   * ```
   *
   * @param targetX - Target X position in world units.
   * @param targetY - Target Y position in world units.
   * @param zoom - Zoom level. Default: 1.
   * @param smoothness - Smoothing factor (0..1). Lower = faster follow. Default: 0.1.
   *
   * @example
   * onFrame(() => {
   *   followTargetWithShake(player.x, player.y, 2.0, 0.08);
   * });
   */
  export declare function followTargetWithShake(targetX: number, targetY: number, zoom?: number, smoothness?: number): void;

  /**
   * Effect presets: common 2D shader effects as one-liner factories.
   * Each factory returns a {@link ShaderEffect} with named uniforms and sensible defaults.
   *
   * Built-in uniforms (`shader_params.time`, `.delta`, `.resolution`, `.mouse`) are
   * auto-injected by the engine — no per-frame boilerplate needed for time-based effects.
   *
   * @example
   * import { outlineEffect, dissolveEffect } from "@arcane/runtime/rendering";
   * const fx = outlineEffect({ color: [1, 0, 0, 1], width: 2 });
   * drawSprite({ textureId: tex, x, y, w: 64, h: 64, shaderId: fx.shaderId });
   * fx.set("outlineWidth", 3.0); // update at runtime
   */
  /** A shader effect with named uniform accessors. */
  export interface ShaderEffect {
      /** The underlying shader ID for use in `drawSprite({ shaderId })`. */
      shaderId: ShaderId;
      /** Set a named uniform on this effect. */
      set(name: string, ...values: number[]): void;
  }
  export interface OutlineOptions {
      /** Outline color [r, g, b, a] in 0-1 range. Default: white. */
      color?: [number, number, number, number];
      /** Outline width in pixels. Default: 1. */
      width?: number;
  }
  /** Sprite outline via 4-neighbor alpha sampling. */
  export declare function outlineEffect(opts?: OutlineOptions): ShaderEffect;
  export interface FlashOptions {
      /** Flash color [r, g, b] in 0-1 range. Default: white. */
      color?: [number, number, number];
      /** Flash intensity 0-1. Default: 0 (no flash). */
      intensity?: number;
  }
  /** Mix sprite with a flat color. Useful for hit feedback. */
  export declare function flashEffect(opts?: FlashOptions): ShaderEffect;
  export interface DissolveOptions {
      /** Edge glow color [r, g, b]. Default: orange. */
      edgeColor?: [number, number, number];
      /** Edge glow width (0-1). Default: 0.05. */
      edgeWidth?: number;
  }
  /** Hash-noise dissolve with glowing edges. Animate `threshold` from 0→1. */
  export declare function dissolveEffect(opts?: DissolveOptions): ShaderEffect;
  export interface PixelateOptions {
      /** Pixel block size. Default: 8. */
      pixelSize?: number;
  }
  /** UV grid-snapping pixelation. */
  export declare function pixelateEffect(opts?: PixelateOptions): ShaderEffect;
  export interface HologramOptions {
      /** Scanline scroll speed. Default: 2. */
      speed?: number;
      /** Scanline spacing in UV units. Default: 100. */
      lineSpacing?: number;
      /** Chromatic aberration offset. Default: 0.005. */
      aberration?: number;
  }
  /** Scanlines + chromatic aberration + time flicker. Uses `shader_params.time`. */
  export declare function hologramEffect(opts?: HologramOptions): ShaderEffect;
  export interface WaterOptions {
      /** Wave amplitude (UV offset). Default: 0.02. */
      amplitude?: number;
      /** Wave frequency. Default: 10. */
      frequency?: number;
      /** Animation speed. Default: 2. */
      speed?: number;
  }
  /** Sine-wave UV distortion. Uses `shader_params.time`. */
  export declare function waterEffect(opts?: WaterOptions): ShaderEffect;
  export interface GlowOptions {
      /** Glow color [r, g, b]. Default: white. */
      color?: [number, number, number];
      /** Glow radius in pixels. Default: 3. */
      radius?: number;
      /** Glow intensity multiplier. Default: 1. */
      intensity?: number;
  }
  /** Multi-sample outer glow around sprite edges. */
  export declare function glowEffect(opts?: GlowOptions): ShaderEffect;
  export interface GrayscaleOptions {
      /** Desaturation amount 0-1. Default: 1 (fully grayscale). */
      amount?: number;
  }
  /** Luminance-weighted desaturation. */
  export declare function grayscaleEffect(opts?: GrayscaleOptions): ShaderEffect;

  /**
   * Floating text / damage numbers.
   *
   * Auto-animating text that rises and fades. Used for damage numbers, XP gains,
   * status messages, item pickups. Internally manages a pool of active instances
   * that auto-remove on completion.
   *
   * @example
   * ```ts
   * // Spawn a red damage number
   * spawnFloatingText(enemy.x, enemy.y, "-25", {
   *   color: rgb(255, 51, 51),
   *   rise: 40,
   *   duration: 0.8,
   * });
   *
   * // In your game loop:
   * updateFloatingTexts(dt);
   * drawFloatingTexts();
   * ```
   */
  /** Options for spawning floating text. */
  export type FloatingTextOptions = {
      /** Text color. Default: white. */
      color?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Total rise distance in world units. Default: 30. */
      rise?: number;
      /** Animation duration in seconds. Default: 1.0. */
      duration?: number;
      /** Text scale multiplier. Default: 1. */
      scale?: number;
      /** Draw layer. Default: 150. */
      layer?: number;
      /** If true, coordinates are screen-space. Default: false. */
      screenSpace?: boolean;
      /** Initial horizontal velocity (drift) in units/sec. Default: 0. */
      driftX?: number;
      /** Easing for the fade: "linear" or "easeOut". Default: "easeOut". */
      fadeEasing?: "linear" | "easeOut";
      /** If true, text scales up briefly at spawn (pop effect). Default: false. */
      pop?: boolean;
  };
  /**
   * Spawn a floating text that rises and fades automatically.
   *
   * @param x - World X position (or screen X if screenSpace).
   * @param y - World Y position (or screen Y if screenSpace).
   * @param text - The text to display.
   * @param options - Animation and styling options.
   */
  export declare function spawnFloatingText(x: number, y: number, text: string, options?: FloatingTextOptions): void;
  /**
   * Update all active floating texts. Call once per frame.
   *
   * @param dt - Delta time in seconds.
   */
  export declare function updateFloatingTexts(dt: number): void;
  /**
   * Draw all active floating texts. Call once per frame after update.
   * No-op in headless mode (drawText is no-op).
   */
  export declare function drawFloatingTexts(): void;
  /**
   * Get the number of active floating text instances.
   * @returns Active count.
   */
  export declare function getFloatingTextCount(): number;
  /**
   * Remove all active floating texts immediately.
   */
  export declare function clearFloatingTexts(): void;
  /**
   * Reset all state. For testing only.
   */

  /**
   * Hexagonal tilemap renderer.
   *
   * Creates and draws tilemaps using hex grids with either pointy-top
   * or flat-top orientation. Supports camera culling and 6-neighbor auto-tiling.
   * Tiles are stored in offset coordinates (odd-r for pointy-top, odd-q for flat-top).
   */
  /** A single hex tile. */
  export type HexTile = {
      /** Tile type identifier. 0 = empty. */
      tileId: number;
  };
  /** Configuration for creating a hex tilemap. */
  export type HexTilemapConfig = {
      /** Grid width in columns. */
      width: number;
      /** Grid height in rows. */
      height: number;
      /** Hex cell size (center to corner). */
      hexSize: number;
      /** Hex orientation: "pointy" or "flat". */
      orientation: HexOrientation;
  };
  /** A hex tilemap instance. */
  export type HexTilemap = {
      /** Grid width in columns (offset coords). */
      width: number;
      /** Grid height in rows (offset coords). */
      height: number;
      /** Hex layout config. */
      config: HexConfig;
      /** Offset coordinate type used for storage. */
      offsetType: OffsetType;
      /** Flat array of tiles, indexed as [row * width + col]. */
      tiles: HexTile[];
      /** Optional tile-to-textureId mapping for rendering. */
      textureMap: Map<number, number>;
  };
  /**
   * Create a hex tilemap with the given dimensions.
   * All tiles start empty (tileId = 0).
   *
   * Uses odd-r offset for pointy-top, odd-q offset for flat-top.
   *
   * @param config - Grid dimensions and hex size/orientation.
   * @returns A new HexTilemap.
   */
  export declare function createHexTilemap(config: HexTilemapConfig): HexTilemap;
  /**
   * Set the tile at offset position (col, row).
   *
   * @param tilemap - The hex tilemap.
   * @param col - Column in offset grid.
   * @param row - Row in offset grid.
   * @param tileId - Tile type identifier. 0 = empty.
   */
  export declare function setHexTile(tilemap: HexTilemap, col: number, row: number, tileId: number): void;
  /**
   * Get the tile at offset position (col, row).
   *
   * @returns The tile, or undefined if out of bounds.
   */
  export declare function getHexTile(tilemap: HexTilemap, col: number, row: number): HexTile | undefined;
  /**
   * Get the tile ID at offset position (col, row).
   *
   * @returns Tile ID, or 0 if out of bounds/empty.
   */
  export declare function getHexTileId(tilemap: HexTilemap, col: number, row: number): number;
  /**
   * Fill a rectangular region of the hex tilemap (in offset coordinates).
   */
  export declare function fillHexTiles(tilemap: HexTilemap, startCol: number, startRow: number, endCol: number, endRow: number, tileId: number): void;
  /**
   * Map a tile ID to a texture ID for rendering.
   */
  export declare function setHexTileTexture(tilemap: HexTilemap, tileId: number, textureId: number): void;
  /**
   * Convert an offset position (col, row) in this tilemap to cube coordinates.
   */
  export declare function hexTilemapToCube(tilemap: HexTilemap, col: number, row: number): HexCoord;
  /**
   * Convert cube coordinates to offset position (col, row) in this tilemap.
   */
  export declare function hexTilemapFromCube(tilemap: HexTilemap, h: HexCoord): {
      col: number;
      row: number;
  };
  /**
   * Get the tile ID at a cube coordinate position.
   * Converts cube coords to offset coords, then looks up the tile.
   *
   * @returns Tile ID, or 0 if out of bounds/empty.
   */
  export declare function getHexTileAtCube(tilemap: HexTilemap, h: HexCoord): number;
  /**
   * Set a tile at cube coordinate position.
   */
  export declare function setHexTileAtCube(tilemap: HexTilemap, h: HexCoord, tileId: number): void;
  /**
   * Draw the hex tilemap with camera culling.
   *
   * Each tile is rendered as a sprite centered at its hex world position.
   * Sprite size is 2 * hexSize wide, sqrt(3) * hexSize tall (pointy-top) or
   * sqrt(3) * hexSize wide, 2 * hexSize tall (flat-top).
   *
   * @param tilemap - The hex tilemap to draw.
   * @param camera - Current camera state for culling. If omitted, draws all tiles.
   * @param baseLayer - Base draw layer. Default: 0.
   * @param offsetX - World X offset. Default: 0.
   * @param offsetY - World Y offset. Default: 0.
   */
  export declare function drawHexTilemap(tilemap: HexTilemap, camera?: CameraState, baseLayer?: number, offsetX?: number, offsetY?: number): void;
  /**
   * Compute a 6-bit auto-tile bitmask for a hex tile in offset coordinates.
   * Converts to cube coordinates to check the 6 hex neighbors.
   *
   * @param tilemap - The hex tilemap.
   * @param col - Offset column.
   * @param row - Offset row.
   * @param matchFn - Returns true if a neighbor tile is "same". Default: tileId > 0.
   * @returns Bitmask 0-63. Bits: E=1, NE=2, NW=4, W=8, SW=16, SE=32.
   */
  export declare function computeHexTilemapAutotile(tilemap: HexTilemap, col: number, row: number, matchFn?: (tileId: number) => boolean): number;

  /**
   * Hexagonal coordinate system.
   *
   * Uses cube coordinates (q, r, s) as the canonical representation,
   * with conversions to/from offset coordinates and world (pixel) space.
   * Supports both pointy-top and flat-top orientations.
   *
   * Reference: Red Blob Games hex grid guide.
   *
   * Invariant: q + r + s = 0 always.
   */
  /** Cube coordinates for a hex cell. Invariant: q + r + s = 0. */
  export type HexCoord = {
      readonly q: number;
      readonly r: number;
      readonly s: number;
  };
  /** Hex grid orientation. */
  export type HexOrientation = "pointy" | "flat";
  /** Offset coordinate scheme for rectangular grid storage. */
  export type OffsetType = "odd-r" | "even-r" | "odd-q" | "even-q";
  /** Configuration for hex grid layout. */
  export type HexConfig = {
      /** Hex cell size (distance from center to corner). */
      hexSize: number;
      /** Orientation: "pointy" (pointy-top) or "flat" (flat-top). */
      orientation: HexOrientation;
  };
  /**
   * Create a hex cube coordinate. Computes s = -q - r automatically.
   *
   * @param q - Cube q coordinate.
   * @param r - Cube r coordinate.
   * @returns HexCoord with s = -q - r.
   */
  export declare function hex(q: number, r: number): HexCoord;
  /**
   * Create a hex coordinate from all three cube components.
   * Validates the q + r + s = 0 constraint (allows small floating-point error).
   *
   * @param q - Cube q.
   * @param r - Cube r.
   * @param s - Cube s.
   * @returns HexCoord.
   * @throws If q + r + s is not approximately 0.
   */
  export declare function hexFromCube(q: number, r: number, s: number): HexCoord;
  /**
   * Check equality of two hex coordinates.
   */
  export declare function hexEqual(a: HexCoord, b: HexCoord): boolean;
  /**
   * Add two hex coordinates.
   */
  export declare function hexAdd(a: HexCoord, b: HexCoord): HexCoord;
  /**
   * Subtract hex coordinate b from a.
   */
  export declare function hexSubtract(a: HexCoord, b: HexCoord): HexCoord;
  /**
   * Multiply a hex coordinate by a scalar.
   */
  export declare function hexScale(h: HexCoord, k: number): HexCoord;
  /**
   * Get the hex direction vector for a direction index (0-5).
   *
   * Directions (pointy-top): 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE.
   */
  export declare function hexDirection(dir: number): HexCoord;
  /**
   * Get the neighbor of a hex in the given direction (0-5).
   */
  export declare function hexNeighbor(h: HexCoord, dir: number): HexCoord;
  /**
   * Get all 6 neighbors of a hex cell.
   *
   * @param q - Cube q coordinate.
   * @param r - Cube r coordinate.
   * @returns Array of 6 HexCoord neighbors.
   */
  export declare function hexNeighbors(q: number, r: number): HexCoord[];
  /**
   * Manhattan distance between two hex cells in cube coordinates.
   * This equals the minimum number of hex steps to travel between them.
   *
   * @param a - First hex coordinate.
   * @param b - Second hex coordinate.
   * @returns Hex distance (non-negative integer for integer coords).
   */
  export declare function hexDistance(a: HexCoord, b: HexCoord): number;
  /**
   * Get all hex cells at exactly `radius` steps from center.
   * Returns cells in ring order (clockwise starting from the east-northeast direction).
   *
   * @param center - Center hex.
   * @param radius - Ring radius. Must be >= 0. Radius 0 returns [center].
   * @returns Array of hex coordinates forming the ring.
   */
  export declare function hexRing(center: HexCoord, radius: number): HexCoord[];
  /**
   * Get all hex cells within `radius` steps from center (inclusive).
   * Returns cells in spiral order: center first, then ring 1, ring 2, etc.
   *
   * @param center - Center hex.
   * @param radius - Maximum ring radius. Must be >= 0.
   * @returns Array of hex coordinates in spiral order.
   */
  export declare function hexSpiral(center: HexCoord, radius: number): HexCoord[];
  /**
   * Round fractional cube coordinates to the nearest hex cell.
   * Uses the standard cube-rounding algorithm.
   */
  export declare function hexRound(q: number, r: number, s: number): HexCoord;
  /**
   * Draw a line between two hex cells using linear interpolation.
   * Returns all hex cells the line passes through, in order from a to b.
   *
   * @param a - Starting hex.
   * @param b - Ending hex.
   * @returns Array of hex coordinates from a to b inclusive.
   */
  export declare function hexLineDraw(a: HexCoord, b: HexCoord): HexCoord[];
  /**
   * Convert hex cube coordinates to world (pixel) coordinates.
   *
   * For pointy-top:
   *   x = size * (sqrt(3) * q + sqrt(3)/2 * r)
   *   y = size * (3/2 * r)
   *
   * For flat-top:
   *   x = size * (3/2 * q)
   *   y = size * (sqrt(3)/2 * q + sqrt(3) * r)
   *
   * @param h - Hex coordinate.
   * @param config - Hex layout configuration.
   * @returns World position { x, y }.
   */
  export declare function hexToWorld(h: HexCoord, config: HexConfig): {
      x: number;
      y: number;
  };
  /**
   * Convert world (pixel) coordinates to fractional hex cube coordinates,
   * then round to the nearest hex cell.
   *
   * @param wx - World X position.
   * @param wy - World Y position.
   * @param config - Hex layout configuration.
   * @returns Nearest hex cube coordinate.
   */
  export declare function worldToHex(wx: number, wy: number, config: HexConfig): HexCoord;
  /**
   * Convert screen coordinates to the nearest hex cell, accounting for camera.
   *
   * @param sx - Screen X position.
   * @param sy - Screen Y position.
   * @param camera - Current camera state.
   * @param config - Hex layout configuration.
   * @param viewportWidth - Viewport width in pixels. Use getViewportSize().width.
   * @param viewportHeight - Viewport height in pixels. Use getViewportSize().height.
   * @returns Nearest hex cube coordinate.
   */
  export declare function screenToHex(sx: number, sy: number, camera: CameraState, config: HexConfig, viewportWidth: number, viewportHeight: number): HexCoord;
  /**
   * Convert cube coordinates to offset coordinates.
   *
   * Offset types:
   * - "odd-r": odd rows shifted right (pointy-top)
   * - "even-r": even rows shifted right (pointy-top)
   * - "odd-q": odd columns shifted down (flat-top)
   * - "even-q": even columns shifted down (flat-top)
   *
   * @param h - Hex cube coordinate.
   * @param type - Offset scheme.
   * @returns Offset grid position { col, row }.
   */
  export declare function cubeToOffset(h: HexCoord, type: OffsetType): {
      col: number;
      row: number;
  };
  /**
   * Convert offset coordinates to cube coordinates.
   *
   * @param col - Offset column.
   * @param row - Offset row.
   * @param type - Offset scheme.
   * @returns Hex cube coordinate.
   */
  export declare function offsetToCube(col: number, row: number, type: OffsetType): HexCoord;
  /**
   * Get all hex cells within a given range from center (inclusive).
   * Returns cells as an array (not in any particular order).
   * This is equivalent to hexSpiral but generated differently.
   *
   * @param center - Center hex coordinate.
   * @param range - Maximum distance from center.
   * @returns Array of hex coordinates within range.
   */
  export declare function hexRange(center: HexCoord, range: number): HexCoord[];
  /**
   * Compute the area (number of cells) of a hex range with given radius.
   * Formula: 3 * radius^2 + 3 * radius + 1
   */
  export declare function hexArea(radius: number): number;
  /** 6-neighbor direction bits for hex auto-tiling. */
  export declare const HEX_DIR_E = 1;
  export declare const HEX_DIR_NE = 2;
  export declare const HEX_DIR_NW = 4;
  export declare const HEX_DIR_W = 8;
  export declare const HEX_DIR_SW = 16;
  export declare const HEX_DIR_SE = 32;
  /**
   * Compute a 6-bit auto-tile bitmask for a hex cell.
   * Each bit represents one of the 6 hex neighbors (E, NE, NW, W, SW, SE).
   * Results in 0-63 (64 possible tile variants).
   *
   * @param q - Cube q coordinate of the tile.
   * @param r - Cube r coordinate of the tile.
   * @param check - Returns true if a neighbor hex is "same" (connected).
   * @returns Bitmask value 0-63.
   */
  export declare function computeHexAutotileBitmask(q: number, r: number, check: (q: number, r: number) => boolean): number;
  /**
   * Generate the 6 corner vertices of a hexagon for rendering with drawPolygon.
   *
   * For pointy-top: corners at 30°, 90°, 150°, 210°, 270°, 330° (starting from upper-right, clockwise).
   * For flat-top: corners at 0°, 60°, 120°, 180°, 240°, 300° (starting from right, clockwise).
   *
   * @param cx - Center X position (world coordinates).
   * @param cy - Center Y position (world coordinates).
   * @param size - Hex size (distance from center to corner).
   * @param orientation - "pointy" or "flat".
   * @returns Array of 6 [x, y] vertex pairs.
   */
  export declare function hexVertices(cx: number, cy: number, size: number, orientation: HexOrientation): [number, number][];

  /**
   * Check if a key is currently held down (returns true every frame while held).
   * Returns false in headless mode.
   *
   * Key names use winit's logical key representation (NOT DOM KeyboardEvent.code):
   * - Letters: `"a"` - `"z"` (lowercase single characters, NOT `"KeyA"`)
   * - Digits: `"0"` - `"9"` (single characters, NOT `"Digit1"`)
   * - Arrow keys: `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`
   * - Function keys: `"F1"` - `"F12"`
   * - Whitespace: `"Space"`, `"Tab"`, `"Enter"`
   * - Modifiers: `"Shift"`, `"Control"`, `"Alt"`
   * - Navigation: `"Escape"`, `"Backspace"`, `"Delete"`, `"Home"`, `"End"`, `"PageUp"`, `"PageDown"`
   *
   * @param key - Key name (see {@link KeyName} for valid values).
   * @returns true if the key is currently held down, false otherwise.
   *
   * @example
   * if (isKeyDown("ArrowRight") || isKeyDown("d")) {
   *   player.x += speed * dt;
   * }
   */
  export declare function isKeyDown(key: KeyName): boolean;
  /**
   * Check if a key was pressed this frame (transitioned from up to down).
   * Unlike {@link isKeyDown}, this returns true only on the first frame the key is pressed.
   * Returns false in headless mode.
   *
   * Valid key names are the same as {@link isKeyDown}:
   * `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`, `"Space"`, `"Enter"`,
   * `"Escape"`, `"Tab"`, `"Shift"`, `"Control"`, `"Alt"`, `"a"`-`"z"`, `"0"`-`"9"`, `"F1"`-`"F12"`,
   * `"Backspace"`, `"Delete"`, `"Home"`, `"End"`, `"PageUp"`, `"PageDown"`.
   *
   * @param key - Key name string (case-sensitive, web standard).
   * @returns true if the key was just pressed this frame, false otherwise.
   */
  export declare function isKeyPressed(key: KeyName): boolean;
  /**
   * Get the current mouse position in screen/window coordinates (pixels).
   * (0, 0) is the top-left corner of the window.
   * Returns `{ x: 0, y: 0 }` in headless mode.
   * Use {@link getMouseWorldPosition} for world-space coordinates.
   *
   * @returns Mouse position in screen pixels.
   */
  export declare function getMousePosition(): MousePosition;
  /**
   * Check if a mouse button is currently held down (returns true every frame while held).
   * Returns false in headless mode.
   *
   * Button numbers:
   * - 0 = Left mouse button
   * - 1 = Right mouse button
   * - 2 = Middle mouse button (wheel click)
   *
   * @param button - Mouse button number (0 = left, 1 = right, 2 = middle).
   * @returns true if the button is currently held down, false otherwise.
   *
   * @example
   * if (isMouseButtonDown(0)) {
   *   // Left mouse button is held
   * }
   */
  export declare function isMouseButtonDown(button: number): boolean;
  /**
   * Check if a mouse button was pressed this frame (transitioned from up to down).
   * Unlike {@link isMouseButtonDown}, this returns true only on the first frame the button is pressed.
   * Returns false in headless mode.
   *
   * Button numbers:
   * - 0 = Left mouse button
   * - 1 = Right mouse button
   * - 2 = Middle mouse button (wheel click)
   *
   * @param button - Mouse button number (0 = left, 1 = right, 2 = middle).
   * @returns true if the button was just pressed this frame, false otherwise.
   *
   * @example
   * if (isMouseButtonPressed(0)) {
   *   // Left mouse button was just clicked
   * }
   */
  export declare function isMouseButtonPressed(button: number): boolean;
  /**
   * Get the current viewport size in logical pixels (DPI-independent).
   * On a 2x Retina display with an 800x600 window, this returns `{ width: 800, height: 600 }`,
   * not the physical pixel dimensions.
   * Returns `{ width: 800, height: 600 }` in headless mode.
   *
   * @returns Viewport dimensions in logical pixels.
   */
  export declare function getViewportSize(): {
      width: number;
      height: number;
  };
  /**
   * Get the display scale factor (e.g. 2.0 on Retina/HiDPI, 1.0 on standard displays).
   * Returns 1.0 in headless mode.
   */
  export declare function getScaleFactor(): number;
  /**
   * Set the background/clear color for the render pass.
   * Default is dark blue-gray (0.1, 0.1, 0.15).
   * No-op in headless mode.
   *
   * Accepts any object with r, g, b properties (0.0-1.0 floats), including
   * the Color type returned by `rgb()`. Alpha is ignored.
   *
   * @param color - Background color. Use `rgb(r, g, b)` or `{ r, g, b }` with 0.0-1.0 values.
   */
  export declare function setBackgroundColor(color: {
      r: number;
      g: number;
      b: number;
  }): void;
  /**
   * Convert screen/window coordinates to world coordinates using the current camera.
   * Accounts for camera position and zoom.
   *
   * @param screenX - X position in screen pixels (0 = left edge).
   * @param screenY - Y position in screen pixels (0 = top edge).
   * @returns Corresponding world-space position.
   */
  export declare function screenToWorld(screenX: number, screenY: number): MousePosition;
  /**
   * Get the mouse position in world coordinates (accounting for camera transform).
   * Convenience function combining {@link getMousePosition} and {@link screenToWorld}.
   *
   * @returns Mouse position in world units.
   */
  export declare function getMouseWorldPosition(): MousePosition;
  /**
   * Get the number of connected gamepads.
   * Returns 0 in headless mode.
   */
  export declare function getGamepadCount(): number;
  /**
   * Get the name of the primary (first connected) gamepad.
   * Returns empty string if no gamepad connected or in headless mode.
   */
  export declare function getGamepadName(): string;
  /**
   * Check if a gamepad is connected.
   * Returns false in headless mode.
   */
  export declare function isGamepadConnected(): boolean;
  /**
   * Check if a gamepad button is currently held down.
   * Returns false in headless mode.
   *
   * Button names (Xbox layout as canonical):
   * - Face buttons: `"A"`, `"B"`, `"X"`, `"Y"`
   * - Bumpers: `"LeftBumper"`, `"RightBumper"`
   * - Triggers: `"LeftTrigger"`, `"RightTrigger"`
   * - Sticks: `"LeftStick"`, `"RightStick"`
   * - D-Pad: `"DPadUp"`, `"DPadDown"`, `"DPadLeft"`, `"DPadRight"`
   * - System: `"Select"`, `"Start"`, `"Guide"`
   *
   * @param button - Gamepad button name string.
   * @returns true if the button is held down.
   */
  export declare function isGamepadButtonDown(button: string): boolean;
  /**
   * Check if a gamepad button was pressed this frame.
   * Returns false in headless mode.
   *
   * @param button - Gamepad button name string (same as {@link isGamepadButtonDown}).
   * @returns true if the button was just pressed this frame.
   */
  export declare function isGamepadButtonPressed(button: string): boolean;
  /**
   * Get a gamepad axis value.
   * Returns 0 in headless mode.
   *
   * Axis names:
   * - `"LeftStickX"` — Left stick horizontal (-1 = left, 1 = right)
   * - `"LeftStickY"` — Left stick vertical (-1 = up, 1 = down)
   * - `"RightStickX"` — Right stick horizontal
   * - `"RightStickY"` — Right stick vertical
   * - `"LeftTrigger"` — Left trigger (0 = released, 1 = fully pressed)
   * - `"RightTrigger"` — Right trigger (0 = released, 1 = fully pressed)
   *
   * @param axis - Axis name string.
   * @returns Axis value (-1.0 to 1.0 for sticks, 0.0 to 1.0 for triggers).
   */
  export declare function getGamepadAxis(axis: string): number;
  /**
   * Get the number of active touch points.
   * Returns 0 in headless mode.
   */
  export declare function getTouchCount(): number;
  /**
   * Check if any touch input is currently active.
   * Returns false in headless mode.
   */
  export declare function isTouchActive(): boolean;
  /**
   * Get the screen position of a touch point by index.
   * Returns `{ x: 0, y: 0 }` if not found or in headless mode.
   *
   * @param index - Touch point index (0 for primary touch).
   * @returns Touch position in screen pixels.
   */
  export declare function getTouchPosition(index?: number): MousePosition;
  /**
   * Get the world position of a touch point (accounting for camera transform).
   * Convenience function combining {@link getTouchPosition} and {@link screenToWorld}.
   *
   * @param index - Touch point index (0 for primary touch).
   * @returns Touch position in world units.
   */
  export declare function getTouchWorldPosition(index?: number): MousePosition;

  /**
   * Isometric tilemap renderer.
   *
   * Creates and draws tilemaps using diamond isometric projection.
   * Renders with correct depth sorting (back-to-front), camera culling,
   * per-tile elevation, and integrates with the existing tile API patterns.
   */
  /** A single tile in the isometric tilemap. */
  export type IsoTile = {
      /** Tile type / texture identifier. 0 = empty. */
      tileId: number;
      /** Elevation offset in pixels (tile drawn higher). Default: 0. */
      elevation: number;
  };
  /** Configuration for creating an isometric tilemap. */
  export type IsoTilemapConfig = {
      /** Grid width in tiles. */
      width: number;
      /** Grid height in tiles. */
      height: number;
      /** Isometric tile dimensions. */
      tileW: number;
      /** Isometric tile height. */
      tileH: number;
  };
  /** An isometric tilemap instance. */
  export type IsoTilemap = {
      /** Grid width in tiles. */
      width: number;
      /** Grid height in tiles. */
      height: number;
      /** Tile dimensions config. */
      config: IsoConfig;
      /** Flat array of tiles, indexed as [gy * width + gx]. */
      tiles: IsoTile[];
      /** Optional tile-to-textureId mapping for rendering. */
      textureMap: Map<number, number>;
  };
  /**
   * Create an isometric tilemap with the given dimensions.
   * All tiles start empty (tileId = 0, elevation = 0).
   *
   * @param config - Grid dimensions and tile sizes.
   * @returns A new IsoTilemap.
   */
  export declare function createIsoTilemap(config: IsoTilemapConfig): IsoTilemap;
  /**
   * Set the tile at grid position (gx, gy).
   *
   * @param tilemap - The isometric tilemap.
   * @param gx - Grid X position.
   * @param gy - Grid Y position.
   * @param tileId - Tile type identifier. 0 = empty.
   * @param elevation - Elevation offset in pixels. Default: 0.
   */
  export declare function setIsoTile(tilemap: IsoTilemap, gx: number, gy: number, tileId: number, elevation?: number): void;
  /**
   * Get the tile at grid position (gx, gy).
   *
   * @returns The tile, or undefined if out of bounds.
   */
  export declare function getIsoTile(tilemap: IsoTilemap, gx: number, gy: number): IsoTile | undefined;
  /**
   * Get the tile ID at grid position (gx, gy).
   *
   * @returns Tile ID, or 0 if out of bounds or empty.
   */
  export declare function getIsoTileId(tilemap: IsoTilemap, gx: number, gy: number): number;
  /**
   * Set the elevation for a specific tile.
   */
  export declare function setIsoTileElevation(tilemap: IsoTilemap, gx: number, gy: number, elevation: number): void;
  /**
   * Fill a rectangular region of the isometric tilemap.
   *
   * @param tilemap - The tilemap.
   * @param startX - Start grid X.
   * @param startY - Start grid Y.
   * @param endX - End grid X (exclusive).
   * @param endY - End grid Y (exclusive).
   * @param tileId - Tile ID to fill.
   * @param elevation - Elevation for filled tiles. Default: 0.
   */
  export declare function fillIsoTiles(tilemap: IsoTilemap, startX: number, startY: number, endX: number, endY: number, tileId: number, elevation?: number): void;
  /**
   * Map a tile ID to a texture ID for rendering.
   * When drawIsoTilemap() encounters this tile ID, it uses the mapped texture.
   *
   * @param tilemap - The tilemap.
   * @param tileId - The tile type identifier.
   * @param textureId - The texture/sprite handle to render.
   */
  export declare function setIsoTileTexture(tilemap: IsoTilemap, tileId: number, textureId: number): void;
  /**
   * Draw the isometric tilemap with correct depth sorting and camera culling.
   *
   * Iterates tiles in back-to-front order (increasing gy, then gx).
   * Skips tiles that are off-screen based on the camera viewport.
   * Each tile is rendered as a sprite positioned at its isometric world coordinates,
   * offset by elevation.
   *
   * @param tilemap - The isometric tilemap to draw.
   * @param camera - Current camera state for culling. If omitted, draws all tiles.
   * @param baseLayer - Base draw layer. Default: 0.
   * @param offsetX - World X offset for the tilemap origin. Default: 0.
   * @param offsetY - World Y offset for the tilemap origin. Default: 0.
   */
  export declare function drawIsoTilemap(tilemap: IsoTilemap, camera?: CameraState, baseLayer?: number, offsetX?: number, offsetY?: number): void;
  /**
   * Compute a 4-bit auto-tile bitmask for an isometric tile.
   * Checks 4 cardinal neighbors in grid space (N=up, E=right, S=down, W=left).
   *
   * @param tilemap - The isometric tilemap.
   * @param gx - Grid X.
   * @param gy - Grid Y.
   * @param matchFn - Returns true if the neighbor tile should be considered "same".
   *                  Receives the tile ID of the neighbor. Default: tileId > 0.
   * @returns Bitmask 0-15. Bit layout: N=1, E=2, S=4, W=8.
   */
  export declare function computeIsoAutotile4(tilemap: IsoTilemap, gx: number, gy: number, matchFn?: (tileId: number) => boolean): number;

  /**
   * Isometric coordinate system.
   *
   * Provides diamond-projection transforms between grid space,
   * world/pixel space, and screen space. Configurable tile dimensions.
   * Also supports staggered (offset-row) isometric for rectangular maps.
   *
   * Conventions:
   * - Grid space: integer (gx, gy) tile coordinates.
   * - World space: pixel coordinates where drawSprite() operates.
   * - Screen space: viewport-relative pixel coordinates (before camera transform).
   */
  /** Configuration for isometric tile dimensions. */
  export type IsoConfig = {
      /** Diamond width in pixels (full tile width). */
      tileW: number;
      /** Diamond height in pixels (full tile height, typically tileW / 2). */
      tileH: number;
  };
  /** Staggered isometric configuration (offset rows). */
  export type StaggeredIsoConfig = {
      /** Diamond width in pixels. */
      tileW: number;
      /** Diamond height in pixels. */
      tileH: number;
      /** Which rows are offset: "odd" or "even". Default: "odd". */
      staggerIndex?: "odd" | "even";
  };
  /**
   * Convert grid coordinates to world (pixel) coordinates using diamond projection.
   *
   * The diamond projection places tiles in a rotated-45-degree diamond pattern.
   * Grid (0,0) maps to world (0,0). Moving +gx goes down-right, +gy goes down-left.
   *
   * @param gx - Grid X coordinate.
   * @param gy - Grid Y coordinate.
   * @param config - Tile dimensions.
   * @returns World position { x, y }.
   */
  export declare function isoToWorld(gx: number, gy: number, config: IsoConfig): {
      x: number;
      y: number;
  };
  /**
   * Convert world (pixel) coordinates to fractional grid coordinates.
   *
   * The inverse of isoToWorld. Returns fractional values — use Math.floor()
   * on both x and y to get the grid cell, or Math.round() for nearest-tile snapping.
   *
   * @param wx - World X position in pixels.
   * @param wy - World Y position in pixels.
   * @param config - Tile dimensions.
   * @returns Fractional grid position { x, y }.
   */
  export declare function worldToIso(wx: number, wy: number, config: IsoConfig): {
      x: number;
      y: number;
  };
  /**
   * Convert world coordinates to an integer grid cell.
   *
   * Applies a half-tile-height offset before flooring so that clicking
   * the center of a diamond tile returns that tile's coordinates.
   *
   * @param wx - World X position.
   * @param wy - World Y position.
   * @param config - Tile dimensions.
   * @returns Integer grid cell { x, y }.
   */
  export declare function worldToGrid(wx: number, wy: number, config: IsoConfig): {
      x: number;
      y: number;
  };
  /**
   * Convert screen-space coordinates to grid coordinates, accounting for camera.
   *
   * Screen space is viewport-relative (0,0 = top-left of screen).
   * This unprojects through the camera to world space, then converts to grid.
   *
   * @param sx - Screen X position.
   * @param sy - Screen Y position.
   * @param camera - Current camera state (position, zoom).
   * @param config - Tile dimensions.
   * @param viewportWidth - Viewport width in pixels. Use getViewportSize().width.
   * @param viewportHeight - Viewport height in pixels. Use getViewportSize().height.
   * @returns Integer grid cell { x, y }.
   */
  export declare function screenToIso(sx: number, sy: number, camera: CameraState, config: IsoConfig, viewportWidth: number, viewportHeight: number): {
      x: number;
      y: number;
  };
  /**
   * Compute a depth layer value for sprite sorting in isometric view.
   *
   * Tiles further down the screen (higher gy) should draw in front of tiles
   * above them. Multiplies by 10 to leave room for sub-layers (e.g., floor,
   * objects, walls within one tile row).
   *
   * @param gy - Grid Y coordinate.
   * @returns Integer depth layer value.
   */
  export declare function isoDepthLayer(gy: number): number;
  /**
   * Convert grid coordinates to world coordinates for staggered isometric layout.
   *
   * Staggered iso places tiles in offset rows, creating a rectangular map
   * that still looks isometric. Odd or even rows are offset by half a tile width.
   *
   * @param gx - Grid column.
   * @param gy - Grid row.
   * @param config - Staggered iso configuration.
   * @returns World position { x, y }.
   */
  export declare function staggeredIsoToWorld(gx: number, gy: number, config: StaggeredIsoConfig): {
      x: number;
      y: number;
  };
  /**
   * Convert world coordinates to grid cell for staggered isometric layout.
   *
   * Uses the standard approach: determine the row from Y, then adjust column
   * based on whether the row is offset.
   *
   * @param wx - World X position.
   * @param wy - World Y position.
   * @param config - Staggered iso configuration.
   * @returns Integer grid cell { x, y }.
   */
  export declare function worldToStaggeredIso(wx: number, wy: number, config: StaggeredIsoConfig): {
      x: number;
      y: number;
  };
  /**
   * Convert screen coordinates to grid cell for staggered isometric layout.
   *
   * @param sx - Screen X position.
   * @param sy - Screen Y position.
   * @param camera - Current camera state.
   * @param config - Staggered iso configuration.
   * @param viewportWidth - Viewport width in pixels. Use getViewportSize().width.
   * @param viewportHeight - Viewport height in pixels. Use getViewportSize().height.
   * @returns Integer grid cell { x, y }.
   */
  export declare function screenToStaggeredIso(sx: number, sy: number, camera: CameraState, config: StaggeredIsoConfig, viewportWidth: number, viewportHeight: number): {
      x: number;
      y: number;
  };
  /**
   * Get the bounding box of an isometric map in world coordinates.
   * Useful for setting camera bounds.
   *
   * @param mapW - Map width in tiles.
   * @param mapH - Map height in tiles.
   * @param config - Tile dimensions.
   * @returns Bounding box { minX, minY, maxX, maxY } in world coordinates.
   */
  export declare function isoMapBounds(mapW: number, mapH: number, config: IsoConfig): {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
  };
  /**
   * Iterate tiles in back-to-front order for correct isometric depth sorting.
   * Calls the callback for each (gx, gy) in draw order.
   *
   * @param mapW - Map width in tiles.
   * @param mapH - Map height in tiles.
   * @param callback - Called with (gx, gy) for each tile.
   */
  export declare function isoIterateBackToFront(mapW: number, mapH: number, callback: (gx: number, gy: number) => void): void;
  /**
   * Get the four isometric neighbor positions for a grid cell.
   *
   * @param gx - Grid X.
   * @param gy - Grid Y.
   * @returns Array of 4 neighbor positions [right, down, left, up].
   */
  export declare function isoNeighbors(gx: number, gy: number): Array<{
      x: number;
      y: number;
  }>;
  /**
   * Manhattan distance between two grid cells in isometric space.
   *
   * @param ax - First cell X.
   * @param ay - First cell Y.
   * @param bx - Second cell X.
   * @param by - Second cell Y.
   * @returns Manhattan distance.
   */
  export declare function isoDistance(ax: number, ay: number, bx: number, by: number): number;

  /**
   * Juice & game feel combinators.
   *
   * High-level APIs that orchestrate multiple subsystems (camera shake, screen
   * flash, particles, audio, frame freeze) in a single call. These are the
   * "one call, big payoff" functions that make a game *feel good*.
   *
   * @example
   * ```ts
   * // On enemy hit: shake + flash + particles + sound in one call
   * impact(enemy.x, enemy.y, {
   *   shake: { intensity: 6, duration: 0.2 },
   *   flash: { r: 1, g: 1, b: 1, duration: 0.1 },
   *   hitstop: 3,
   * });
   * ```
   */
  /** Camera shake options for impact(). */
  export type ImpactShake = {
      /** Shake intensity in pixels. Default: 8. */
      intensity?: number;
      /** Shake duration in seconds. Default: 0.15. */
      duration?: number;
  };
  /** Screen flash options for impact(). */
  export type ImpactFlash = {
      /** Red component 0-1. Default: 1. */
      r?: number;
      /** Green component 0-1. Default: 1. */
      g?: number;
      /** Blue component 0-1. Default: 1. */
      b?: number;
      /** Flash duration in seconds. Default: 0.1. */
      duration?: number;
      /** Initial opacity 0-1. Default: 0.6. */
      opacity?: number;
  };
  /** Particle burst options for impact(). */
  export type ImpactParticles = {
      /** Number of particles. Default: 15. */
      count?: number;
      /** Particle lifetime range [min, max] in seconds. Default: [0.2, 0.5]. */
      lifetime?: [number, number];
      /** Horizontal velocity range. Default: [-100, 100]. */
      velocityX?: [number, number];
      /** Vertical velocity range. Default: [-100, 100]. */
      velocityY?: [number, number];
      /** Particle color. Default: white. */
      color?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** End color for fade. Optional. */
      endColor?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Particle size range. Default: [2, 6]. */
      size?: [number, number];
      /** Texture for particles. Uses solid white if not specified. */
      textureId?: number;
  };
  /** Sound options for impact(). */
  export type ImpactSound = {
      /** Sound to play. The user should pass the sound ID from loadSound(). */
      soundId: number;
      /** Volume 0-1. Default: 1. */
      volume?: number;
  };
  /** Full configuration for the impact() combinator. All fields optional. */
  export type ImpactConfig = {
      /** Camera shake. Pass true for defaults, or an ImpactShake for custom. */
      shake?: boolean | ImpactShake;
      /** Hitstop: freeze gameplay for N frames (60 FPS assumed). Default: 0. */
      hitstop?: number;
      /** Screen flash. Pass true for defaults, or an ImpactFlash for custom. */
      flash?: boolean | ImpactFlash;
      /** Particle burst at the impact point. Pass true for defaults, or config. */
      particles?: boolean | ImpactParticles;
      /** Sound to play. */
      sound?: ImpactSound;
  };
  /**
   * Check whether hitstop is active. When true, gameplay should freeze but
   * UI and particles can continue updating.
   *
   * @returns True if hitstop is in effect.
   */
  export declare function isHitstopActive(): boolean;
  /**
   * Get remaining hitstop frames.
   * @returns Number of frames remaining.
   */
  export declare function getHitstopFrames(): number;
  /**
   * Consume one hitstop frame. Call this once per game frame in your update loop.
   * While hitstop is active, skip gameplay updates but continue rendering.
   *
   * @returns True if hitstop was active (frame was consumed), false if not.
   *
   * @example
   * ```ts
   * onFrame(() => {
   *   if (!_consumeHitstopFrame()) {
   *     // Normal gameplay update
   *     updateGameplay(dt);
   *   }
   *   // Always render (including during hitstop)
   *   renderGame();
   *   updateTweens(dt); // tweens run during hitstop
   *   updateParticles(dt); // particles run during hitstop
   * });
   * ```
   */
  /**
   * Start a hitstop (frame freeze) for the specified number of frames.
   * If a hitstop is already active, the larger value wins.
   *
   * @param frames - Number of frames to freeze. At 60 FPS, 3 frames = 50ms.
   */
  export declare function hitstop(frames: number): void;
  /**
   * Orchestrated "impact" juice: combine camera shake, hitstop, screen flash,
   * particle burst, and sound in a single call. All parameters are optional —
   * mix and match freely.
   *
   * @param x - World X position of the impact.
   * @param y - World Y position of the impact.
   * @param config - Which effects to trigger and their parameters.
   *
   * @example
   * ```ts
   * // Full juice on enemy death
   * impact(enemy.x, enemy.y, {
   *   shake: { intensity: 10, duration: 0.3 },
   *   hitstop: 4,
   *   flash: { r: 1, g: 0.8, b: 0.2, duration: 0.15 },
   *   particles: { count: 25, color: rgb(255, 128, 0) },
   * });
   *
   * // Minimal hit feedback
   * impact(x, y, { shake: true, hitstop: 2 });
   * ```
   */
  export declare function impact(x: number, y: number, config: ImpactConfig): void;
  /**
   * Light hit impact preset: small shake + brief flash.
   * @param x - World X position.
   * @param y - World Y position.
   */
  export declare function impactLight(x: number, y: number): void;
  /**
   * Heavy hit impact preset: big shake + long flash + particles.
   * @param x - World X position.
   * @param y - World Y position.
   */
  export declare function impactHeavy(x: number, y: number): void;
  /**
   * Reset juice state. For testing only.
   */

  /**
   * Set the ambient light color applied to all sprites.
   * (1, 1, 1) = full white (no darkening, the default).
   * (0, 0, 0) = complete darkness (only point lights visible).
   * No-op in headless mode.
   *
   * Accepts either a Color object or three separate 0.0-1.0 float arguments:
   * - `setAmbientLight(rgb(255, 200, 150))` — Color object
   * - `setAmbientLight(1.0, 0.78, 0.59)` — separate floats
   *
   * @param rOrColor - Red channel (0.0-1.0) or a Color object with r, g, b properties.
   * @param g - Green channel, 0.0-1.0 (ignored if first arg is Color).
   * @param b - Blue channel, 0.0-1.0 (ignored if first arg is Color).
   */
  export declare function setAmbientLight(rOrColor: number | {
      r: number;
      g: number;
      b: number;
  }, g?: number, b?: number): void;
  /**
   * Add a point light at a world position.
   * Point lights illuminate sprites within their radius, blending with the ambient light.
   * Must be called every frame (lights are cleared at frame start).
   * No-op in headless mode.
   *
   * @param x - Light center X in world units.
   * @param y - Light center Y in world units.
   * @param radius - Light radius in world units. Falloff is smooth to the edge.
   * @param r - Light color red channel, 0.0-1.0. Default: 1.
   * @param g - Light color green channel, 0.0-1.0. Default: 1.
   * @param b - Light color blue channel, 0.0-1.0. Default: 1.
   * @param intensity - Light brightness multiplier, 0.0+. Default: 1.
   */
  export declare function addPointLight(x: number, y: number, radius: number, r?: number, g?: number, b?: number, intensity?: number): void;
  /**
   * Clear all point lights for this frame.
   * Called automatically at frame start by the renderer; manual use is rarely needed.
   * No-op in headless mode.
   */
  export declare function clearLights(): void;
  /**
   * Enable Radiance Cascades global illumination.
   * When enabled, light propagates realistically through the scene:
   * emissive surfaces cast light, occluders block it, and light bounces.
   * Existing point lights and ambient light continue to work alongside GI.
   * No-op in headless mode.
   */
  export declare function enableGlobalIllumination(): void;
  /**
   * Disable Radiance Cascades global illumination.
   * Falls back to the basic point-light system.
   * No-op in headless mode.
   */
  export declare function disableGlobalIllumination(): void;
  /**
   * Set the global illumination intensity multiplier.
   * Higher values = brighter GI light. Default: 1.0.
   * No-op in headless mode.
   *
   * @param intensity - GI brightness, 0.0+. Default: 1.0.
   */
  export declare function setGIIntensity(intensity: number): void;
  /** Options for GI quality. */
  export interface GIQualityOptions {
      /** Probe spacing in pixels. Smaller = smoother but slower. Default: 8. */
      probeSpacing?: number;
      /** Ray march interval in pixels. Default: 4. */
      interval?: number;
      /** Number of cascade levels. More = longer light reach. Default: 4. Max: 5. */
      cascadeCount?: number;
  }
  /**
   * Set GI quality parameters.
   *
   * Controls the resolution and reach of the radiance cascades algorithm.
   * Smaller probeSpacing produces smoother light gradients but costs more GPU.
   * Call once at startup (persists across frames).
   *
   * No-op in headless mode.
   *
   * @param options - Quality configuration.
   */
  export declare function setGIQuality(options: GIQualityOptions): void;
  /** Options for an emissive surface. */
  export interface EmissiveOptions {
      /** World X position. */
      x: number;
      /** World Y position. */
      y: number;
      /** Width in world units. */
      width: number;
      /** Height in world units. */
      height: number;
      /** Red channel, 0.0-1.0. Default: 1. */
      r?: number;
      /** Green channel, 0.0-1.0. Default: 1. */
      g?: number;
      /** Blue channel, 0.0-1.0. Default: 1. */
      b?: number;
      /** Emission intensity. Default: 1. */
      intensity?: number;
  }
  /**
   * Add an emissive surface that radiates light in GI mode.
   * Emissive surfaces act as area light sources when GI is enabled.
   * Must be called every frame (cleared at frame start).
   * No-op in headless mode or when GI is disabled.
   *
   * @param options - Emissive surface configuration.
   */
  export declare function addEmissive(options: EmissiveOptions): void;
  /**
   * Clear all emissive surfaces for this frame.
   * No-op in headless mode.
   */
  export declare function clearEmissives(): void;
  /** Options for an occluder (light-blocking rectangle). */
  export interface OccluderOptions {
      /** World X position. */
      x: number;
      /** World Y position. */
      y: number;
      /** Width in world units. */
      width: number;
      /** Height in world units. */
      height: number;
  }
  /**
   * Add a rectangular occluder that blocks light in GI mode.
   * Occluders cast shadows when light rays encounter them.
   * Must be called every frame (cleared at frame start).
   * No-op in headless mode or when GI is disabled.
   *
   * @param options - Occluder rectangle.
   */
  export declare function addOccluder(options: OccluderOptions): void;
  /**
   * Clear all occluders for this frame.
   * No-op in headless mode.
   */
  export declare function clearOccluders(): void;
  /** Options for a directional light (infinite parallel rays). */
  export interface DirectionalLightOptions {
      /** Light direction angle in radians. 0 = right, PI/2 = down. */
      angle: number;
      /** Red channel, 0.0-1.0. Default: 1. */
      r?: number;
      /** Green channel, 0.0-1.0. Default: 1. */
      g?: number;
      /** Blue channel, 0.0-1.0. Default: 1. */
      b?: number;
      /** Light brightness. Default: 1. */
      intensity?: number;
  }
  /**
   * Add a directional light (sun/moon — infinite distance, parallel rays).
   * Directional lights affect the entire scene uniformly from a given angle.
   * Must be called every frame (cleared with clearLights()).
   * No-op in headless mode.
   *
   * @param options - Directional light configuration.
   */
  export declare function addDirectionalLight(options: DirectionalLightOptions): void;
  /** Options for a spot light (positioned cone of light). */
  export interface SpotLightOptions {
      /** World X position. */
      x: number;
      /** World Y position. */
      y: number;
      /** Direction angle in radians. 0 = right, PI/2 = down. */
      angle: number;
      /** Cone half-angle spread in radians. Default: 0.5 (about 28 degrees). */
      spread?: number;
      /** Light range in world units. Default: 200. */
      range?: number;
      /** Red channel, 0.0-1.0. Default: 1. */
      r?: number;
      /** Green channel, 0.0-1.0. Default: 1. */
      g?: number;
      /** Blue channel, 0.0-1.0. Default: 1. */
      b?: number;
      /** Light brightness. Default: 1. */
      intensity?: number;
  }
  /**
   * Add a spot light (positioned cone of light, like a flashlight).
   * Must be called every frame (cleared with clearLights()).
   * No-op in headless mode.
   *
   * @param options - Spot light configuration.
   */
  export declare function addSpotLight(options: SpotLightOptions): void;
  /** Color temperature presets as [r, g, b] tuples (0.0-1.0 range). */
  export declare const colorTemp: {
      /** Warm candlelight (1800K). */
      candlelight: [number, number, number];
      /** Warm incandescent (2700K). */
      incandescent: [number, number, number];
      /** Warm white (3000K). */
      warmWhite: [number, number, number];
      /** Neutral daylight (5500K). */
      daylight: [number, number, number];
      /** Cool fluorescent (6500K). */
      fluorescent: [number, number, number];
      /** Cool moonlight (7500K). */
      moonlight: [number, number, number];
      /** Vibrant neon pink. */
      neonPink: [number, number, number];
      /** Vibrant neon blue. */
      neonBlue: [number, number, number];
      /** Vibrant neon green. */
      neonGreen: [number, number, number];
      /** Fire/torch (warm orange). */
      torch: [number, number, number];
      /** Magical purple glow. */
      magic: [number, number, number];
      /** Blood red. */
      blood: [number, number, number];
  };
  /** Options for the day/night cycle helper. */
  export interface DayNightOptions {
      /** Time of day, 0.0-1.0. 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk. */
      timeOfDay: number;
      /** Overall brightness multiplier. Default: 1. */
      intensity?: number;
  }
  /**
   * Set ambient and directional lighting based on time of day.
   * This is a convenience helper that calls setAmbientLight() and
   * optionally addDirectionalLight() to simulate a day/night cycle.
   *
   * @param options - Day/night configuration.
   */
  export declare function setDayNightCycle(options: DayNightOptions): void;

  /**
   * Register a callback to be called every frame by the Arcane renderer.
   * Only one callback can be active -- calling onFrame() again replaces the previous one.
   * The callback is invoked by the Rust game loop (not by requestAnimationFrame).
   * No-op in headless mode (the callback is stored but never invoked).
   *
   * @param callback - Function to call each frame. Use {@link getDeltaTime} inside for timing.
   *
   * @example
   * onFrame(() => {
   *   const dt = getDeltaTime();
   *   player.x += speed * dt;
   *   drawSprite({ textureId: tex, x: player.x, y: player.y, w: 32, h: 32 });
   * });
   */
  export declare function onFrame(callback: () => void): void;
  /**
   * Get the time elapsed since the last frame, in seconds.
   * Typical values: ~0.016 at 60fps, ~0.033 at 30fps.
   * Returns 0 in headless mode.
   *
   * @returns Delta time in seconds (fractional).
   */
  export declare function getDeltaTime(): number;

  /**
   * Nine-slice sprite rendering.
   *
   * Draws a texture as a nine-slice panel: the four corners remain at fixed size,
   * the four edges stretch in one dimension, and the center stretches in both.
   * This allows scalable UI panels without corner distortion.
   *
   * ```
   *  ┌────┬────────┬────┐
   *  │ TL │  Top   │ TR │   Corners: fixed size
   *  ├────┼────────┼────┤   Edges: stretch in one axis
   *  │ L  │ Center │  R │   Center: stretches both axes
   *  ├────┼────────┼────┤
   *  │ BL │ Bottom │ BR │
   *  └────┴────────┴────┘
   * ```
   *
   * @example
   * ```ts
   * drawNineSlice(panelTex, 100, 50, 300, 200, { border: 16 });
   * ```
   */
  /** Border inset configuration for nine-slice. */
  export type NineSliceBorder = {
      /** Top border inset in texture pixels. */
      top: number;
      /** Bottom border inset in texture pixels. */
      bottom: number;
      /** Left border inset in texture pixels. */
      left: number;
      /** Right border inset in texture pixels. */
      right: number;
  };
  /** Options for drawNineSlice. */
  export type NineSliceOptions = {
      /**
       * Border insets. Can be a single number (uniform on all sides)
       * or a per-edge object.
       */
      border: number | NineSliceBorder;
      /** Draw order layer. Default: 0. */
      layer?: number;
      /** Tint color. Default: white (no tint). */
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Opacity 0-1. Default: 1. */
      opacity?: number;
      /** If true, x/y/w/h are in screen pixels. Default: false. */
      screenSpace?: boolean;
      /**
       * Texture dimensions in pixels. Required for correct UV calculation.
       * If not provided, assumes 1:1 mapping (UV border = border / 256).
       */
      textureWidth?: number;
      /** Texture height in pixels. Default: 256. */
      textureHeight?: number;
  };
  /**
   * Draw a nine-slice panel from a texture.
   *
   * The texture is divided into a 3x3 grid based on `border` insets. Corners
   * are drawn at fixed size, edges stretch, and the center fills the remainder.
   *
   * No-op in headless mode (drawSprite is a no-op).
   *
   * @param textureId - Texture handle from loadTexture().
   * @param x - X position (world or screen-space).
   * @param y - Y position (world or screen-space).
   * @param w - Total width of the panel.
   * @param h - Total height of the panel.
   * @param options - Border insets, layer, tint, opacity, screenSpace.
   */
  export declare function drawNineSlice(textureId: TextureId, x: number, y: number, w: number, h: number, options: NineSliceOptions): void;
  /**
   * Compute how many drawSprite calls a nine-slice will emit (for testing).
   * Depends on whether any slices have zero dimensions.
   *
   * @param w - Panel width.
   * @param h - Panel height.
   * @param border - Border insets.
   * @returns Number of sprite draw calls that would be emitted.
   */

  /**
   * Parallax scrolling support.
   *
   * Draw sprites at different scroll speeds to create a depth illusion.
   * Parallax transforms are applied on the CPU side before calling drawSprite(),
   * so no Rust/GPU changes are needed.
   */
  /** Options for parallax sprites. Extends SpriteOptions with a parallax factor. */
  export type ParallaxSpriteOptions = SpriteOptions & {
      /**
       * Parallax scroll factor relative to the camera.
       * - 0: fixed to screen (e.g., HUD, distant stars)
       * - 0.2: slow scroll (far background)
       * - 0.5: half speed (midground)
       * - 1.0: normal speed (same as drawSprite)
       *
       * Values > 1.0 create a foreground parallax effect (scrolls faster than camera).
       */
      parallaxFactor: number;
  };
  /**
   * Draw a sprite with parallax scrolling. The sprite's position is offset
   * based on the camera position and the parallax factor, creating a depth
   * illusion where background layers scroll slower than foreground layers.
   *
   * @param options - Sprite options with a parallaxFactor field.
   *
   * @example
   * // Far background (slow scroll)
   * drawParallaxSprite({ textureId: bgFar, x: 0, y: 0, w: 1600, h: 600, parallaxFactor: 0.2, layer: 0 });
   *
   * // Midground (medium scroll)
   * drawParallaxSprite({ textureId: bgMid, x: 0, y: 0, w: 1600, h: 600, parallaxFactor: 0.5, layer: 1 });
   *
   * // Foreground sprites use normal drawSprite (parallaxFactor = 1.0 implicitly)
   */
  export declare function drawParallaxSprite(options: ParallaxSpriteOptions): void;

  /**
   * Placeholder sprite generation for rapid prototyping.
   * Creates simple colored shapes as textures without needing real art assets.
   *
   * @example
   * ```ts
   * import { placeholder } from "@arcane/runtime/rendering";
   *
   * // Create semantic placeholders for your game
   * const plant = placeholder("plant", { shape: "circle", color: [0.2, 0.8, 0.2] });
   * const soil = placeholder("soil", { shape: "square", color: [0.4, 0.3, 0.2] });
   * const slug = placeholder("slug", { shape: "diamond", color: [0.6, 0.5, 0.1] });
   *
   * // Use like any texture
   * drawSprite({ textureId: plant, x: 100, y: 100, w: 32, h: 32 });
   * ```
   */
  /** Shape type for placeholder sprites. */
  export type PlaceholderShape = "circle" | "square" | "diamond" | "triangle" | "hexagon" | "star";
  /** Options for placeholder sprite creation. */
  export interface PlaceholderOptions {
      /** Shape to render. Default: "square" */
      shape?: PlaceholderShape;
      /** RGB color as [r, g, b] with values 0.0-1.0. Default: [0.7, 0.7, 0.7] (gray) */
      color?: [number, number, number];
      /** Size in pixels (textures are square). Default: 32 */
      size?: number;
      /** Add a border/outline. Default: false */
      outline?: boolean;
      /** Border color as [r, g, b]. Default: darker version of main color */
      outlineColor?: [number, number, number];
  }
  /**
   * Create a placeholder sprite texture with a simple colored shape.
   * Useful for prototyping before real art is available.
   * Textures are cached by name + options, so calling with same params returns same handle.
   *
   * @param name - Semantic name for the placeholder (e.g., "player", "enemy", "coin").
   * @param options - Shape, color, size configuration.
   * @returns Texture handle for use with drawSprite().
   *
   * @example
   * const playerTex = placeholder("player", { shape: "circle", color: [0.2, 0.6, 1.0] });
   * const enemyTex = placeholder("enemy", { shape: "diamond", color: [1.0, 0.2, 0.2] });
   * const coinTex = placeholder("coin", { shape: "circle", color: [1.0, 0.85, 0.0], size: 16 });
   */
  export declare function placeholder(name: string, options?: PlaceholderOptions): TextureId;
  /**
   * Pre-defined placeholder palettes for common game object types.
   * Use these as starting points for prototyping.
   */
  export declare const PLACEHOLDER_COLORS: {
      player: [number, number, number];
      enemy: [number, number, number];
      npc: [number, number, number];
      wall: [number, number, number];
      floor: [number, number, number];
      water: [number, number, number];
      grass: [number, number, number];
      tree: [number, number, number];
      rock: [number, number, number];
      coin: [number, number, number];
      gem: [number, number, number];
      heart: [number, number, number];
      key: [number, number, number];
      chest: [number, number, number];
      potion: [number, number, number];
      bullet: [number, number, number];
      explosion: [number, number, number];
      magic: [number, number, number];
      button: [number, number, number];
      panel: [number, number, number];
  };
  /**
   * Quick placeholder creation using pre-defined colors.
   * Shorthand for common game objects.
   *
   * @param type - Pre-defined placeholder type (e.g., "player", "enemy", "coin").
   * @param options - Override shape or other options.
   * @returns Texture handle.
   *
   * @example
   * const player = quickPlaceholder("player");  // Blue circle
   * const enemy = quickPlaceholder("enemy", { shape: "diamond" });  // Red diamond
   * const coin = quickPlaceholder("coin", { size: 16 });  // Gold circle, 16px
   */
  export declare function quickPlaceholder(type: keyof typeof PLACEHOLDER_COLORS, options?: Omit<PlaceholderOptions, "color">): TextureId;
  /**
   * Clear the placeholder texture cache.
   * Useful for memory management or when regenerating placeholders.
   */
  /**
   * Get the number of cached placeholder textures.
   * Useful for debugging or monitoring memory usage.
   */

  /**
   * Post-processing pipeline: fullscreen effects applied after sprite rendering.
   *
   * When effects are active, sprites render to an offscreen texture, then each
   * effect is applied in order (ping-pong between two offscreen textures),
   * with the final result output to the screen.
   *
   * Built-in effects and their param slots (set via setEffectParam index 0):
   *
   * **bloom** — Bright-pass glow.
   *   - x: threshold (0-1, default 0.7) — luminance cutoff for "bright"
   *   - y: intensity (0-1, default 0.5) — bloom strength
   *   - z: radius (pixels, default 3.0) — blur spread
   *
   * **blur** — Gaussian blur.
   *   - x: strength (default 1.0) — texel offset multiplier
   *
   * **vignette** — Darken screen edges.
   *   - x: intensity (0-1, default 0.5) — edge darkness
   *   - y: radius (0-1, default 0.8) — vignette size
   *
   * **crt** — CRT monitor simulation.
   *   - x: scanlineFrequency (default 800) — scanline count
   *   - y: distortion (default 0.1) — barrel distortion amount
   *   - z: brightness (default 1.1) — overall brightness boost
   *
   * @example
   * const crt = addPostProcessEffect("crt");
   * setEffectParam(crt, 0, 600, 0.15, 1.2); // fewer scanlines, more distortion
   *
   * @example
   * const bloom = addPostProcessEffect("bloom");
   * const vignette = addPostProcessEffect("vignette");
   * // Effects applied in order: bloom first, then vignette
   */
  /** Opaque handle to a post-process effect. */
  export type EffectId = number;
  /**
   * Add a post-process effect. Effects are applied in the order they are added.
   *
   * @param effect - Built-in effect type.
   * @returns EffectId for use with setEffectParam and removeEffect.
   */
  export declare function addPostProcessEffect(effect: "bloom" | "blur" | "vignette" | "crt"): EffectId;
  /**
   * Set a vec4 parameter slot on a post-process effect.
   * See module docs for what each index/component means per effect type.
   *
   * @param effectId - Effect handle from addPostProcessEffect.
   * @param index - Param slot (0-3). Most effects use only slot 0.
   * @param x - First component.
   * @param y - Second component. Default: 0.
   * @param z - Third component. Default: 0.
   * @param w - Fourth component. Default: 0.
   */
  export declare function setEffectParam(effectId: EffectId, index: number, x: number, y?: number, z?: number, w?: number): void;
  /**
   * Remove a single post-process effect.
   *
   * @param effectId - Effect handle to remove.
   */
  export declare function removeEffect(effectId: EffectId): void;
  /**
   * Remove all post-process effects, restoring direct-to-screen rendering.
   */
  export declare function clearEffects(): void;

  /**
   * Opaque handle for an off-screen render target.
   * The same value can be used as a `TextureId` in `drawSprite()`.
   */
  export type RenderTargetId = number;
  /**
   * Create an off-screen RGBA render target of the given pixel dimensions.
   * Returns an ID that can be used both as a `RenderTargetId` (with `beginRenderTarget`)
   * and as a `TextureId` (with `drawSprite`, `createTilemap`, etc.).
   *
   * The render target is cleared to transparent black before each render pass.
   *
   * Returns 0 in headless mode.
   *
   * @param width  Width in pixels
   * @param height Height in pixels
   * @returns Handle usable as both RenderTargetId and TextureId
   *
   * @example
   * // Draw a minimap into an off-screen texture, then display it
   * const minimap = createRenderTarget(128, 128);
   *
   * onFrame((dt) => {
   *   beginRenderTarget(minimap);
   *     drawSprite({ textureId: mapTex, x: 0, y: 0, w: 128, h: 128 });
   *   endRenderTarget();
   *
   *   // Render minimap in the corner
   *   drawSprite({ textureId: minimap, x: 10, y: 10, w: 128, h: 128 });
   * });
   */
  export declare function createRenderTarget(width: number, height: number): RenderTargetId;
  /**
   * Route subsequent `drawSprite()` calls into this render target.
   *
   * Coordinate system inside the target: `(0, 0)` = top-left corner.
   * This differs from the main surface where `(0, 0)` = screen center (after setCamera).
   *
   * Calls must be balanced: every `beginRenderTarget()` needs a matching `endRenderTarget()`.
   * Nesting is not supported.
   *
   * @param id Handle returned by `createRenderTarget()`
   *
   * @example
   * beginRenderTarget(myTarget);
   *   drawSprite({ textureId: tex, x: 0, y: 0, w: 64, h: 64 });
   * endRenderTarget();
   */
  export declare function beginRenderTarget(id: RenderTargetId): void;
  /**
   * End the current render target pass and return to rendering on the main surface.
   *
   * @example
   * beginRenderTarget(myTarget);
   *   drawSprite({ textureId: tex, x: 0, y: 0, w: 64, h: 64 });
   * endRenderTarget();
   */
  export declare function endRenderTarget(): void;
  /**
   * Get the `TextureId` for sampling a render target in `drawSprite()`.
   * The returned value is the same as the `RenderTargetId` — they are identical.
   * This function exists for clarity; you can use the ID directly as a `textureId`.
   *
   * @param id Handle returned by `createRenderTarget()`
   * @returns TextureId for use with drawSprite, createTilemap, etc.
   *
   * @example
   * const rt = createRenderTarget(256, 256);
   * // Both are equivalent:
   * drawSprite({ textureId: rt, x: 0, y: 0, w: 256, h: 256 });
   * drawSprite({ textureId: getRenderTargetTextureId(rt), x: 0, y: 0, w: 256, h: 256 });
   */
  export declare function getRenderTargetTextureId(id: RenderTargetId): TextureId;
  /**
   * Free the GPU resources for a render target.
   * After this call, using the ID as a TextureId will produce a transparent sprite.
   * Do not call `beginRenderTarget()` on a destroyed target.
   *
   * @param id Handle returned by `createRenderTarget()`
   */
  export declare function destroyRenderTarget(id: RenderTargetId): void;

  /**
   * Composable Signed Distance Function (SDF) API for building shape trees
   * that compile to WGSL shader code.
   *
   * SDF nodes are pure data structures -- constructing them has no side effects.
   * Call {@link compileToWgsl} to generate WGSL expressions, or {@link sdfEntity}
   * to register a renderable SDF shape (headless-safe).
   *
   * ## Coordinate System
   *
   * After the vertex shader Y-flip, the coordinate system is:
   * - **+X** = right
   * - **+Y** = up (screen top)
   * - **-Y** = down (screen bottom)
   *
   * This matches typical math conventions but differs from some 2D graphics APIs
   * where Y increases downward. Keep this in mind when using:
   * - `sdfOffset(shape, x, y)` - positive Y moves the shape UP
   * - `gradient(..., angle)` - 90° goes from bottom to top
   * - triangle/polygon vertices - Y increases upward
   *
   * ## Performance Tips
   *
   * - Use instance-level transforms (`rotation`, `scale`, `opacity` in sdfEntity)
   *   for animation. These are GPU-efficient and don't cause shader recompilation.
   * - Avoid animating fill parameters or SDF-level transforms (`sdfRotate()`, `sdfScale()`)
   *   as these bake values into the shader and trigger recompilation each frame.
   * - Call `clearSdfEntities()` at the start of each frame for animated scenes,
   *   or use `createSdfFrame()` which handles clear+flush automatically.
   *
   * @example
   * ```ts
   * import { sdfCircle, sdfBox, sdfUnion, sdfOffset, sdfSmoothUnion, compileToWgsl, sdfEntity } from "@arcane/runtime/rendering";
   *
   * // Build a snowman shape
   * const snowman = sdfUnion(
   *   sdfCircle(20),
   *   sdfOffset(sdfCircle(14), 0, -30),
   *   sdfOffset(sdfCircle(10), 0, -54),
   * );
   *
   * // Compile to WGSL
   * const wgsl = compileToWgsl(snowman);
   *
   * // Or create a renderable entity
   * const id = sdfEntity({
   *   shape: snowman,
   *   fill: { type: "solid", color: "#ffffff" },
   *   position: [100, 200],
   * });
   * ```
   */
  /** A 2D vector as a two-element tuple: [x, y]. */
  export type Vec2 = [number, number];
  /** Discriminant for SDF node categories. */
  export type SdfNodeType = "primitive" | "bool_op" | "transform" | "modifier";
  /** Supported SDF primitive kinds. */
  export type SdfPrimitiveKind = "circle" | "box" | "rounded_box" | "ellipse" | "segment" | "triangle" | "egg" | "heart" | "moon" | "vesica" | "arc" | "hexagon" | "pentagon" | "octogon" | "star5" | "star" | "cross" | "ring" | "pie" | "rounded_x";
  /** Boolean operation types for combining SDF shapes. */
  export type SdfOpType = "union" | "subtract" | "intersect" | "smooth_union" | "smooth_subtract";
  /** A primitive SDF node -- a single geometric shape. */
  export interface SdfPrimitiveNode {
      type: "primitive";
      kind: SdfPrimitiveKind;
      params: number[];
      /** For triangle/segment: additional vec2 params. */
      points?: Vec2[];
  }
  /** A boolean operation node combining two or more child SDF nodes. */
  export interface SdfBoolOpNode {
      type: "bool_op";
      op: SdfOpType;
      children: SdfNode[];
      /** Blend radius for smooth operations. */
      blendFactor?: number;
  }
  /** A transform node that repositions/rotates/scales a child SDF node. */
  export interface SdfTransformNode {
      type: "transform";
      child: SdfNode;
      offset?: Vec2;
      /** Rotation angle in radians. */
      rotation?: number;
      scale?: number;
      symmetry?: "x";
      repeatSpacing?: Vec2;
  }
  /** A modifier node that adjusts the distance field of a child (round, onion). */
  export interface SdfModifierNode {
      type: "modifier";
      child: SdfNode;
      modifier: "round" | "onion";
      amount: number;
  }
  /** Any SDF node in the composition tree. */
  export type SdfNode = SdfPrimitiveNode | SdfBoolOpNode | SdfTransformNode | SdfModifierNode;
  /**
   * Predefined render layer constants for common use cases.
   * Higher numbers render on top of lower numbers.
   *
   * @example
   * sdfEntity({
   *   shape: sdfCircle(20),
   *   fill: solid("#ff0000"),
   *   layer: LAYERS.FOREGROUND,
   * });
   */
  export declare const LAYERS: {
      /** Far background elements (sky, distant mountains) */
      readonly BACKGROUND: 0;
      /** Ground-level terrain and platforms */
      readonly GROUND: 10;
      /** Game objects like items, enemies, player */
      readonly ENTITIES: 20;
      /** Near foreground elements (foliage, particles) */
      readonly FOREGROUND: 30;
      /** UI overlays */
      readonly UI: 40;
  };
  /** Solid color fill. */
  export interface SolidFill {
      type: "solid";
      color: string;
  }
  /** Outline-only fill (renders the border of the shape). */
  export interface OutlineFill {
      type: "outline";
      color: string;
      thickness: number;
  }
  /** Linear gradient fill between two colors at a given angle. */
  export interface GradientFill {
      type: "gradient";
      from: string;
      to: string;
      /** Angle in degrees (0 = left-to-right, 90 = bottom-to-top). */
      angle: number;
      /** Scale factor for gradient mapping (default 1.0). Scale > 1 makes gradient span a smaller region. */
      scale: number;
  }
  /** Glow/bloom fill around the shape boundary. */
  export interface GlowFill {
      type: "glow";
      color: string;
      intensity: number;
  }
  /** Combined solid fill with outline stroke. */
  export interface SolidOutlineFill {
      type: "solid_outline";
      fill: string;
      outline: string;
      thickness: number;
  }
  /**
   * Cosine palette fill using the formula:
   * color = a + b * cos(2*PI * (c*t + d))
   * where t is derived from the SDF distance.
   */
  export interface CosinePaletteFill {
      type: "cosine_palette";
      a: [number, number, number];
      b: [number, number, number];
      c: [number, number, number];
      d: [number, number, number];
  }
  /** All supported fill types for SDF entities. */
  export type SdfFill = SolidFill | OutlineFill | GradientFill | GlowFill | SolidOutlineFill | CosinePaletteFill;
  /**
   * Create a solid color fill.
   * @param color - Hex color string (e.g., "#ff0000").
   * @returns SolidFill object.
   *
   * @example
   * sdfEntity({ shape: sdfCircle(20), fill: solid("#ff0000") });
   */
  export declare function solid(color: string): SolidFill;
  /**
   * Create a glow fill effect.
   * Note: Lower intensity = larger glow (counterintuitive but mathematically correct).
   * @param color - Hex color string.
   * @param intensity - Glow intensity (0.1-1.0 typical, lower = bigger glow).
   * @returns GlowFill object.
   *
   * @example
   * // Soft, wide glow
   * sdfEntity({ shape: sdfHeart(30), fill: glow("#ff3366", 0.25), bounds: 90 });
   */
  export declare function glow(color: string, intensity?: number): GlowFill;
  /**
   * Create a linear gradient fill.
   * @param from - Start color (hex string).
   * @param to - End color (hex string).
   * @param angle - Gradient angle in degrees (0 = left-to-right, 90 = bottom-to-top).
   * @param scale - Scale factor for gradient mapping (default 1.0). Use scale > 1 to
   *   make the gradient span a smaller region, useful when bounds is larger than the
   *   shape's extent in the gradient direction. For example, if bounds=50 but the shape
   *   only spans ±37 in the gradient direction, use scale=50/37≈1.35.
   * @returns GradientFill object.
   *
   * @example
   * // Bottom-to-top gradient (green to white)
   * sdfEntity({
   *   shape: sdfTriangle([0, 30], [-50, -30], [50, -30]),
   *   fill: gradient("#2d4a1c", "#f0f8ff", 90),
   *   bounds: 35, // Tight bounds for visible gradient
   * });
   *
   * @example
   * // Equilateral triangle with properly scaled gradient
   * // bounds=43 (for width), but triangle Y extent is ±37
   * sdfEntity({
   *   shape: sdfTriangle([0, 37], [-43, -37], [43, -37]),
   *   fill: gradient("#000066", "#ff0000", 90, 43/37),
   *   bounds: 43,
   * });
   */
  export declare function gradient(from: string, to: string, angle?: number, scale?: number): GradientFill;
  /**
   * Create an outline-only fill.
   * @param color - Hex color string.
   * @param thickness - Outline thickness in pixels.
   * @returns OutlineFill object.
   *
   * @example
   * sdfEntity({ shape: sdfCircle(30), fill: outlineFill("#ffffff", 2) });
   */
  export declare function outlineFill(color: string, thickness: number): OutlineFill;
  /**
   * Create a solid fill with an outline stroke.
   * @param fillColor - Interior fill color (hex string).
   * @param outlineColor - Outline color (hex string).
   * @param thickness - Outline thickness in pixels.
   * @returns SolidOutlineFill object.
   *
   * @example
   * sdfEntity({
   *   shape: sdfStar(30, 5, 0.4),
   *   fill: solidOutline("#ffd700", "#000000", 2),
   * });
   */
  export declare function solidOutline(fillColor: string, outlineColor: string, thickness: number): SolidOutlineFill;
  /**
   * Create a cosine palette fill for rainbow/gradient distance effects.
   * Uses the formula: color = a + b * cos(2π * (c*t + d))
   *
   * @param a - Base color offset [r, g, b] (0-1 each).
   * @param b - Color amplitude [r, g, b].
   * @param c - Frequency multiplier [r, g, b].
   * @param d - Phase offset [r, g, b].
   * @returns CosinePaletteFill object.
   *
   * @example
   * // Classic rainbow palette
   * sdfEntity({
   *   shape: sdfCircle(40),
   *   fill: cosinePalette(
   *     [0.5, 0.5, 0.5],
   *     [0.5, 0.5, 0.5],
   *     [1.0, 1.0, 1.0],
   *     [0.0, 0.33, 0.67],
   *   ),
   * });
   */
  export declare function cosinePalette(a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]): CosinePaletteFill;
  /**
   * Create an SDF circle primitive.
   * @param radius - Circle radius in world units.
   * @returns SDF node representing a circle.
   */
  export declare function sdfCircle(radius: number): SdfNode;
  /**
   * Create an SDF axis-aligned box primitive.
   * @param width - Half-width of the box.
   * @param height - Half-height of the box.
   * @returns SDF node representing a box.
   */
  export declare function sdfBox(width: number, height: number): SdfNode;
  /**
   * Create an SDF rounded box primitive.
   * @param width - Half-width of the box.
   * @param height - Half-height of the box.
   * @param radius - Corner radius (uniform number or per-corner [tl, tr, br, bl]).
   * @returns SDF node representing a rounded box.
   */
  export declare function sdfRoundedBox(width: number, height: number, radius: number | [number, number, number, number]): SdfNode;
  /**
   * Create an SDF ellipse primitive.
   * @param width - Semi-major axis width.
   * @param height - Semi-minor axis height.
   * @returns SDF node representing an ellipse.
   */
  export declare function sdfEllipse(width: number, height: number): SdfNode;
  /**
   * Create an SDF triangle primitive from three points.
   * @param p0 - First vertex.
   * @param p1 - Second vertex.
   * @param p2 - Third vertex.
   * @returns SDF node representing a triangle.
   */
  export declare function sdfTriangle(p0: Vec2, p1: Vec2, p2: Vec2): SdfNode;
  /**
   * Create an SDF egg primitive.
   * @param ra - Primary radius.
   * @param rb - Bulge factor.
   * @returns SDF node representing an egg shape.
   */
  export declare function sdfEgg(ra: number, rb: number): SdfNode;
  /**
   * Create an SDF heart primitive.
   * @param size - Overall heart size.
   * @returns SDF node representing a heart shape.
   */
  export declare function sdfHeart(size: number): SdfNode;
  /**
   * Create an SDF star primitive with configurable point count.
   * @param radius - Outer radius.
   * @param points - Number of star points.
   * @param innerRadius - Inner radius between points.
   * @returns SDF node representing a star shape.
   */
  export declare function sdfStar(radius: number, points: number, innerRadius: number): SdfNode;
  /**
   * Create an SDF regular hexagon primitive.
   * @param radius - Hexagon circumradius.
   * @returns SDF node representing a hexagon.
   */
  export declare function sdfHexagon(radius: number): SdfNode;
  /**
   * Create an SDF regular pentagon primitive.
   * @param radius - Pentagon circumradius.
   * @returns SDF node representing a pentagon.
   */
  export declare function sdfPentagon(radius: number): SdfNode;
  /**
   * Create an SDF line segment primitive.
   * @param from - Start point.
   * @param to - End point.
   * @returns SDF node representing a line segment.
   */
  export declare function sdfSegment(from: Vec2, to: Vec2): SdfNode;
  /**
   * Create an SDF crescent moon primitive.
   * @param d - Distance between the two circle centers.
   * @param ra - Radius of the outer circle.
   * @param rb - Radius of the inner circle (subtracted).
   * @returns SDF node representing a moon shape.
   */
  export declare function sdfMoon(d: number, ra: number, rb: number): SdfNode;
  /**
   * Create an SDF cross/plus primitive.
   * @param width - Arm width (half-extent).
   * @param height - Arm height (half-extent).
   * @param radius - Corner rounding radius.
   * @returns SDF node representing a cross shape.
   */
  export declare function sdfCross(width: number, height: number, radius: number): SdfNode;
  /**
   * Create an SDF ring (annular) primitive.
   * @param radius - Center radius.
   * @param width - Ring thickness.
   * @returns SDF node representing a ring.
   */
  export declare function sdfRing(radius: number, width: number): SdfNode;
  /**
   * Combine multiple SDF shapes with a union (logical OR / min distance).
   * @param shapes - Two or more SDF nodes to combine.
   * @returns SDF node representing the union.
   */
  export declare function sdfUnion(...shapes: SdfNode[]): SdfNode;
  /**
   * Subtract cutout shapes from a base shape.
   * @param base - The shape to cut from.
   * @param cutouts - One or more shapes to subtract.
   * @returns SDF node representing the subtraction.
   */
  export declare function sdfSubtract(base: SdfNode, ...cutouts: SdfNode[]): SdfNode;
  /**
   * Intersect multiple SDF shapes (logical AND / max distance).
   * @param shapes - Two or more SDF nodes to intersect.
   * @returns SDF node representing the intersection.
   */
  export declare function sdfIntersect(...shapes: SdfNode[]): SdfNode;
  /**
   * Smooth union of multiple SDF shapes (blended boundary).
   * @param k - Blend radius (larger = smoother blend).
   * @param shapes - Two or more SDF nodes to combine.
   * @returns SDF node representing the smooth union.
   */
  export declare function sdfSmoothUnion(k: number, ...shapes: SdfNode[]): SdfNode;
  /**
   * Smooth subtraction of cutout shapes from a base.
   * @param k - Blend radius (larger = smoother blend).
   * @param base - The shape to cut from.
   * @param cutouts - One or more shapes to subtract.
   * @returns SDF node representing the smooth subtraction.
   */
  export declare function sdfSmoothSubtract(k: number, base: SdfNode, ...cutouts: SdfNode[]): SdfNode;
  /**
   * Translate an SDF shape by (x, y).
   * @param shape - The shape to translate.
   * @param x - Horizontal offset.
   * @param y - Vertical offset.
   * @returns SDF node with the translation applied.
   */
  export declare function sdfOffset(shape: SdfNode, x: number, y: number): SdfNode;
  /**
   * Rotate an SDF shape by the given angle in degrees.
   * @param shape - The shape to rotate.
   * @param degrees - Rotation angle in degrees.
   * @returns SDF node with the rotation applied.
   */
  export declare function sdfRotate(shape: SdfNode, degrees: number): SdfNode;
  /**
   * Uniformly scale an SDF shape.
   * @param shape - The shape to scale.
   * @param factor - Scale factor (>1 = larger, <1 = smaller).
   * @returns SDF node with the scale applied.
   */
  export declare function sdfScale(shape: SdfNode, factor: number): SdfNode;
  /**
   * Mirror an SDF shape along the X axis (left-right symmetry).
   * @param shape - The shape to mirror.
   * @returns SDF node with X-axis symmetry applied.
   */
  export declare function sdfMirrorX(shape: SdfNode): SdfNode;
  /**
   * Repeat an SDF shape infinitely on a 2D grid.
   * @param shape - The shape to repeat.
   * @param spacingX - Horizontal spacing between repetitions.
   * @param spacingY - Vertical spacing between repetitions.
   * @returns SDF node with the repeat pattern applied.
   */
  export declare function sdfRepeat(shape: SdfNode, spacingX: number, spacingY: number): SdfNode;
  /**
   * Round the edges of an SDF shape by expanding the boundary outward.
   * @param shape - The shape to round.
   * @param radius - Rounding radius.
   * @returns SDF node with rounding applied.
   */
  export declare function sdfRound(shape: SdfNode, radius: number): SdfNode;
  /**
   * Turn a filled SDF shape into an outline (onion skinning).
   * @param shape - The shape to outline.
   * @param thickness - Outline thickness.
   * @returns SDF node with onion modifier applied.
   */
  export declare function sdfOutline(shape: SdfNode, thickness: number): SdfNode;
  /**
   * Create multiple nested outlines (concentric rings).
   * @param shape - The base shape.
   * @param thickness - Thickness of each ring.
   * @param count - Number of nested outlines.
   * @returns SDF node with nested onion modifiers.
   *
   * @example
   * // Create 3 concentric rings
   * sdfEntity({
   *   shape: sdfOutlineN(sdfCircle(45), 8, 3),
   *   fill: solid("#e67e22"),
   * });
   */
  export declare function sdfOutlineN(shape: SdfNode, thickness: number, count: number): SdfNode;
  /**
   * Repeat an SDF shape in a bounded region (no infinite tiling).
   * Clips the repeat pattern to a rectangular area.
   *
   * @param shape - The shape to repeat.
   * @param spacingX - Horizontal spacing between repetitions.
   * @param spacingY - Vertical spacing between repetitions.
   * @param countX - Number of horizontal repetitions.
   * @param countY - Number of vertical repetitions.
   * @returns SDF node with bounded repeat pattern.
   *
   * @example
   * // 4x3 grid of circles
   * sdfEntity({
   *   shape: sdfRepeatBounded(sdfCircle(8), 30, 30, 4, 3),
   *   fill: solid("#2ecc71"),
   * });
   */
  export declare function sdfRepeatBounded(shape: SdfNode, spacingX: number, spacingY: number, countX: number, countY: number): SdfNode;
  /**
   * Calculate a pulsing scale value (oscillates between min and max).
   * @param time - Current time in seconds.
   * @param speed - Oscillation speed (cycles per second).
   * @param min - Minimum scale value. Default: 0.8.
   * @param max - Maximum scale value. Default: 1.2.
   * @returns Scale value between min and max.
   *
   * @example
   * sdfEntity({
   *   shape: sdfStar(30, 5, 0.4),
   *   fill: glow("#FFD700", 0.8),
   *   scale: pulse(time, 4),
   * });
   */
  export declare function pulse(time: number, speed?: number, min?: number, max?: number): number;
  /**
   * Calculate a spinning rotation angle.
   * @param time - Current time in seconds.
   * @param degreesPerSecond - Rotation speed. Default: 90.
   * @returns Rotation angle in degrees.
   *
   * @example
   * sdfEntity({
   *   shape: sdfStar(35, 6, 0.5),
   *   fill: solid("#e74c3c"),
   *   rotation: spin(time, 60),
   * });
   */
  export declare function spin(time: number, degreesPerSecond?: number): number;
  /**
   * Calculate a bobbing vertical offset (smooth up/down motion).
   * @param time - Current time in seconds.
   * @param speed - Oscillation speed.
   * @param amplitude - Maximum displacement from center. Default: 10.
   * @returns Y offset value.
   *
   * @example
   * sdfEntity({
   *   shape: sdfCircle(20),
   *   fill: solid("#3498db"),
   *   position: [100, 200 + bob(time, 2, 15)],
   * });
   */
  export declare function bob(time: number, speed?: number, amplitude?: number): number;
  /**
   * Calculate a breathing opacity value (pulsing alpha).
   * @param time - Current time in seconds.
   * @param speed - Oscillation speed.
   * @param min - Minimum opacity. Default: 0.5.
   * @param max - Maximum opacity. Default: 1.0.
   * @returns Opacity value between min and max.
   *
   * @example
   * sdfEntity({
   *   shape: sdfHeart(30),
   *   fill: glow("#ff3366", 0.25),
   *   opacity: breathe(time, 3),
   *   bounds: 90,
   * });
   */
  export declare function breathe(time: number, speed?: number, min?: number, max?: number): number;
  /**
   * Generate positions for a grid layout.
   * Returns an array of [x, y, column, row] tuples for each cell.
   *
   * @param columns - Number of columns.
   * @param rows - Number of rows.
   * @param cellWidth - Width of each cell.
   * @param cellHeight - Height of each cell.
   * @param originX - X origin (default: cellWidth/2 for centering first cell).
   * @param originY - Y origin (default: cellHeight/2 for centering first cell).
   * @returns Array of [x, y, col, row] positions.
   *
   * @example
   * // Create a 3x3 grid of effects
   * const grid = createGrid(3, 3, 200, 200, 100, 100);
   * for (const [x, y, col, row] of grid) {
   *   sdfEntity({
   *     shape: sdfCircle(20),
   *     fill: solid("#ff0000"),
   *     position: [x, y],
   *   });
   * }
   */
  export declare function createGrid(columns: number, rows: number, cellWidth: number, cellHeight: number, originX?: number, originY?: number): [number, number, number, number][];
  /**
   * Create an SDF frame context for animated scenes.
   * Automatically clears entities at the start and flushes at the end.
   *
   * @param callback - Frame rendering callback.
   * @returns A function that executes the frame.
   *
   * @example
   * let time = 0;
   * game.onFrame(() => {
   *   const dt = getDeltaTime();
   *   time += dt;
   *
   *   createSdfFrame(() => {
   *     sdfEntity({
   *       shape: sdfStar(30, 5, 0.4),
   *       fill: glow("#FFD700", 0.8),
   *       scale: pulse(time, 4),
   *     });
   *   });
   * });
   */
  export declare function createSdfFrame(callback: () => void): void;
  /**
   * Compile an SDF node tree to a WGSL expression string.
   * The expression uses variable `p` as the input coordinate of type `vec2<f32>`.
   *
   * @param node - The root SDF node to compile.
   * @returns WGSL expression string computing the signed distance.
   *
   * @example
   * const wgsl = compileToWgsl(sdfCircle(10));
   * // Returns: "sd_circle(p, 10.0)"
   *
   * @example
   * const wgsl = compileToWgsl(sdfOffset(sdfCircle(10), 20, 30));
   * // Returns: "sd_circle((p - vec2<f32>(20.0, 30.0)), 10.0)"
   */
  export declare function compileToWgsl(node: SdfNode): string;
  /**
   * Create a renderable SDF entity.
   * Returns a unique entity ID string. The entity is stored in an internal
   * registry and can be queried later. Headless-safe (no GPU calls).
   *
   * @param config - Entity configuration.
   * @param config.shape - The SDF node tree defining the shape.
   * @param config.fill - How the shape should be colored/rendered.
   * @param config.position - World position [x, y]. Default: [0, 0].
   * @param config.layer - Draw order layer. Default: 0.
   * @param config.bounds - Override bounding half-size. Auto-calculated if omitted.
   * @param config.rotation - Rotation in degrees. Default: 0. (GPU-efficient, no shader recompile)
   * @param config.scale - Uniform scale factor. Default: 1. (GPU-efficient, no shader recompile)
   * @param config.opacity - Opacity 0-1. Default: 1.
   * @returns Entity ID string (e.g., "sdf_1").
   *
   * @example
   * const id = sdfEntity({
   *   shape: sdfCircle(20),
   *   fill: { type: "solid", color: "#ff0000" },
   *   position: [100, 200],
   *   rotation: 45,
   *   scale: 1.5,
   *   layer: 5,
   * });
   */
  export declare function sdfEntity(config: {
      shape: SdfNode;
      fill: SdfFill;
      position?: Vec2;
      layer?: number;
      bounds?: number;
      rotation?: number;
      scale?: number;
      opacity?: number;
  }): string;
  /**
   * Get an SDF entity by ID. Returns undefined if not found.
   * Useful for testing and inspection.
   *
   * @param id - Entity ID string from {@link sdfEntity}.
   * @returns The entity data, or undefined.
   */
  export declare function getSdfEntity(id: string): {
      shape: SdfNode;
      fill: SdfFill;
      position: Vec2;
      layer: number;
      bounds: number;
      wgsl: string;
      rotation: number;
      scale: number;
      opacity: number;
  } | undefined;
  /**
   * Get the number of registered SDF entities.
   * Useful for testing and debugging.
   */
  /**
   * Clear all registered SDF entities and reset the ID counter.
   * Useful for testing.
   */
  export declare function clearSdfEntities(): void;
  /**
   * Flush all registered SDF entities to the Rust renderer.
   * Call this once per frame in your game loop.
   *
   * @example
   * onFrame(() => {
   *   flushSdfEntities();
   * });
   */
  export declare function flushSdfEntities(): void;

  /**
   * Custom shader support for user-defined WGSL fragment shaders.
   *
   * Three tiers of shader usage:
   *
   * 1. **Effect presets** — One-liner factories in `effects.ts` (outline, flash, dissolve, etc.)
   * 2. **Named uniform API** — `createShader()` + `setShaderUniform()` for custom WGSL with ergonomic names
   * 3. **Raw WGSL** — `createShaderFromSource()` + `setShaderParam()` for full control
   *
   * Built-in uniforms are auto-injected into every custom shader:
   * - `shader_params.time` — elapsed seconds
   * - `shader_params.delta` — frame delta time
   * - `shader_params.resolution` — viewport size (logical pixels)
   * - `shader_params.mouse` — mouse position (screen pixels)
   *
   * User uniforms: `shader_params.values[0..13]` (14 vec4 slots).
   *
   * @example
   * // Named uniform API (recommended)
   * const fx = createShader("dissolve", dissolveWgsl, { threshold: "float", edgeColor: "vec3" });
   * setShaderUniform(fx, "threshold", 0.5);
   *
   * @example
   * // Raw WGSL (full control)
   * const crt = createShaderFromSource("crt", `
   *   @fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
   *     let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
   *     let scanline = sin(in.tex_coords.y * shader_params.values[0].x) * 0.5 + 0.5;
   *     return vec4<f32>(tex.rgb * in.tint.rgb * scanline, tex.a * in.tint.a);
   *   }
   * `);
   * setShaderParam(crt, 0, 800.0);
   */
  /** Opaque handle to a custom shader. Returned by {@link createShaderFromSource}. */
  export type ShaderId = number;
  /** Uniform type for named shader uniforms. */
  export type UniformType = "float" | "vec2" | "vec3" | "vec4";
  /** Uniform layout definition for {@link createShader}. */
  export type UniformDef = Record<string, UniformType>;
  /**
   * Create a custom fragment shader from WGSL source.
   * The source must contain a `@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32>`.
   *
   * Standard declarations are prepended automatically:
   * - `camera` (group 0), `t_diffuse`/`s_diffuse` (group 1), `lighting` (group 2)
   * - `VertexOutput` struct with `tex_coords`, `tint`, `world_position`
   * - Standard vertex shader (`vs_main`)
   *
   * Built-in uniforms: `shader_params.time`, `.delta`, `.resolution`, `.mouse` (auto-injected).
   * User uniforms: `shader_params.values[0..13]` (group 3, 14 vec4 slots).
   *
   * @param name - Shader name (for debugging).
   * @param wgslSource - WGSL fragment shader source.
   * @returns ShaderId for use in {@link drawSprite}'s `shaderId` option.
   */
  export declare function createShaderFromSource(name: string, wgslSource: string): ShaderId;
  /**
   * Set a vec4 parameter slot on a custom shader.
   * Values are accessible in the shader as `shader_params.values[index]`.
   *
   * @param shaderId - Shader handle from {@link createShaderFromSource}.
   * @param index - Slot index (0-13).
   * @param x - First component (or the only value for scalar params).
   * @param y - Second component. Default: 0.
   * @param z - Third component. Default: 0.
   * @param w - Fourth component. Default: 0.
   */
  export declare function setShaderParam(shaderId: ShaderId, index: number, x: number, y?: number, z?: number, w?: number): void;
  /**
   * Create a custom fragment shader with named uniforms.
   * Wraps {@link createShaderFromSource} with a name→slot registry for ergonomic uniform access.
   *
   * @param name - Shader name (for debugging).
   * @param source - WGSL fragment shader source.
   * @param uniforms - Optional named uniform definitions. Slots allocated sequentially (max 14).
   * @returns ShaderId for use in drawSprite's `shaderId` option.
   *
   * @example
   * const fx = createShader("dissolve", wgslCode, {
   *   threshold: "float",
   *   edgeColor: "vec3",
   *   edgeWidth: "float",
   * });
   */
  export declare function createShader(name: string, source: string, uniforms?: UniformDef): ShaderId;
  /**
   * Set a named uniform on a custom shader.
   * The uniform name must match one declared in {@link createShader}'s `uniforms` parameter.
   *
   * @param id - Shader handle from {@link createShader}.
   * @param name - Uniform name.
   * @param values - 1-4 float values depending on uniform type.
   */
  export declare function setShaderUniform(id: ShaderId, name: string, ...values: number[]): void;
  /**
   * Get the names of all named uniforms registered for a shader.
   * Useful for agent introspection and debugging.
   *
   * @param id - Shader handle from {@link createShader}.
   * @returns Array of uniform names, or empty array if not a named-uniform shader.
   */
  export declare function getShaderUniformNames(id: ShaderId): string[];

  /**
   * Queue a sprite to be drawn this frame.
   * Must be called every frame -- sprites are not persisted between frames.
   * No-op in headless mode (safe to import in game logic).
   *
   * @param opts - Sprite rendering options (position, size, texture, layer, UV, tint).
   *
   * @example
   * drawSprite({
   *   textureId: playerTex,
   *   x: player.x, y: player.y,
   *   w: 32, h: 32,
   *   layer: 1,
   * });
   *
   * @example
   * // Draw a tinted, atlas-based sprite
   * drawSprite({
   *   textureId: atlas,
   *   x: 100, y: 200,
   *   w: 16, h: 16,
   *   uv: { x: 0.25, y: 0, w: 0.25, h: 0.5 },
   *   tint: { r: 1, g: 0.5, b: 0.5, a: 1 },
   *   layer: 5,
   * });
   */
  export declare function drawSprite(opts: SpriteOptions): void;
  /**
   * Flush the sprite batch buffer to the Rust renderer.
   * Called automatically by clearSprites() at the frame boundary.
   * Can also be called manually if needed (e.g., mid-frame flush).
   */
  /**
   * Clear all queued sprites for this frame.
   * Normally not needed -- the renderer clears automatically at frame start.
   * No-op in headless mode.
   *
   * When batch mode is active, flushes the accumulated batch to Rust first,
   * then clears the Rust-side sprite command list.
   */
  export declare function clearSprites(): void;

  /** Descriptor for a bitmap font backed by a texture atlas. */
  export type BitmapFont = {
      /** Texture handle containing the font glyph atlas. */
      textureId: TextureId;
      /** Width of each glyph cell in pixels. */
      glyphW: number;
      /** Height of each glyph cell in pixels. */
      glyphH: number;
      /** Number of glyph columns in the atlas. */
      columns: number;
      /** Number of glyph rows in the atlas. */
      rows: number;
      /** ASCII code of the first glyph in the atlas. Default: 32 (space). */
      firstChar: number;
  };
  /** RGBA color (0.0-1.0 per channel). */
  type Color = {
      r: number;
      g: number;
      b: number;
      a: number;
  };
  /** Outline configuration for MSDF text. */
  export type TextOutline = {
      /** Outline width in SDF distance units (0.5 = thin, 2.0 = thick). */
      width: number;
      /** Outline color. */
      color: Color;
  };
  /** Shadow configuration for MSDF text. */
  export type TextShadow = {
      /** Horizontal shadow offset in pixels. */
      offsetX: number;
      /** Vertical shadow offset in pixels. */
      offsetY: number;
      /** Shadow color. */
      color: Color;
      /** Shadow blur/softness (1.0 = sharp, 3.0 = soft). Default: 1.0. */
      softness?: number;
  };
  /** Glyph metrics from an MSDF font atlas. */
  export type MSDFGlyph = {
      /** Unicode codepoint. */
      char: number;
      /** UV rectangle in the atlas [x, y, w, h] (normalized 0-1). */
      uv: [number, number, number, number];
      /** Advance width in pixels (at the font's native size). */
      advance: number;
      /** Glyph pixel width at native size. */
      width: number;
      /** Glyph pixel height at native size. */
      height: number;
      /** Horizontal offset from cursor. */
      offsetX: number;
      /** Vertical offset from baseline. */
      offsetY: number;
  };
  /**
   * Descriptor for an MSDF (signed distance field) font.
   *
   * MSDF fonts render text as resolution-independent signed distance fields,
   * supporting outline and shadow effects. Each font owns a pool of shader
   * instances so that multiple `drawText()` calls in the same frame can use
   * different outline/shadow parameters without overwriting each other.
   */
  export type MSDFFont = {
      /** Internal font ID (from the Rust MSDF font store). */
      fontId: number;
      /** Texture handle for the MSDF atlas. */
      textureId: TextureId;
      /** Shader ID for the MSDF rendering pipeline (first slot in the pool). Backward-compatible shorthand for `shaderPool[0]`. */
      shaderId: number;
      /**
       * Pool of shader IDs (same WGSL, separate uniform buffers).
       * Each unique outline/shadow/scale combo in a frame claims a pool slot.
       * The pool resets every frame. With 8 slots, up to 8 distinct param combos
       * can coexist. Beyond 8, slots wrap around (last params win for that slot).
       */
      shaderPool: number[];
      /** Font size the atlas was generated at. */
      fontSize: number;
      /** Line height in pixels at the native font size. */
      lineHeight: number;
      /** SDF distance range in pixels. */
      distanceRange: number;
  };
  /** Options for {@link drawText} and {@link measureText}. */
  export type TextOptions = {
      /** Font to use. Default: built-in 8x8 CP437 bitmap font via getDefaultFont(). */
      font?: BitmapFont;
      /** MSDF font to use. When set, uses resolution-independent SDF rendering. Overrides `font`. */
      msdfFont?: MSDFFont;
      /** Scale multiplier for glyph size. Default: 1. A value of 2 draws at 16x16. */
      scale?: number;
      /** RGBA tint color for the text (0.0-1.0 per channel). Default: white. */
      tint?: Color;
      /** Draw order layer. Default: 100 (above most game sprites). */
      layer?: number;
      /** If true, position is in screen pixels (HUD). If false, position is in world units. Default: false. */
      screenSpace?: boolean;
      /**
       * Outline effect (MSDF fonts only). Ignored for bitmap fonts.
       * Renders a colored outline around the text at the specified width.
       */
      outline?: TextOutline;
      /**
       * Shadow effect (MSDF fonts only). Ignored for bitmap fonts.
       * Renders a colored shadow behind the text at the specified offset.
       */
      shadow?: TextShadow;
      /**
       * Horizontal text alignment relative to the given x position.
       * - `"left"` (default): text starts at x.
       * - `"center"`: text is centered on x.
       * - `"right"`: text ends at x.
       */
      align?: "left" | "center" | "right";
  };
  /** Result of {@link measureText}. Dimensions in pixels (before camera transform). */
  export type TextMeasurement = {
      /** Total width in pixels (text.length * glyphW * scale). */
      width: number;
      /** Total height in pixels (glyphH * scale). */
      height: number;
  };
  /**
   * Create a bitmap font descriptor from a texture atlas.
   * The atlas should contain a grid of equally-sized glyphs in ASCII order.
   *
   * @param textureId - Texture handle of the font atlas (from loadTexture()).
   * @param glyphW - Width of each glyph cell in pixels.
   * @param glyphH - Height of each glyph cell in pixels.
   * @param columns - Number of glyph columns in the atlas.
   * @param rows - Number of glyph rows in the atlas.
   * @param firstChar - ASCII code of the first glyph in the atlas. Default: 32 (space).
   * @returns BitmapFont descriptor for use with drawText().
   */
  export declare function loadFont(textureId: TextureId, glyphW: number, glyphH: number, columns: number, rows: number, firstChar?: number): BitmapFont;
  /**
   * Get the default built-in 8x8 CP437 bitmap font, lazily initialized.
   * In headless mode returns a dummy font (textureId 0).
   *
   * @returns The built-in BitmapFont (8x8 glyphs, 16 columns, 6 rows, ASCII 32-127).
   */
  export declare function getDefaultFont(): BitmapFont;
  /**
   * Get the default built-in MSDF font, lazily initialized.
   * This is a signed distance field version of the CP437 bitmap font,
   * providing resolution-independent text with support for outlines and shadows.
   * In headless mode returns a dummy font.
   *
   * @returns The built-in MSDFFont.
   *
   * @example
   * const font = getDefaultMSDFFont();
   * drawText("Crisp at any size!", 10, 10, {
   *   msdfFont: font,
   *   scale: 4,
   *   screenSpace: true,
   * });
   */
  export declare function getDefaultMSDFFont(): MSDFFont;
  /**
   * Load an MSDF font from a pre-generated atlas image and metrics JSON file.
   * The atlas should be generated with msdf-atlas-gen or a compatible tool.
   *
   * The atlas texture is uploaded in linear format (not sRGB) so that the SDF
   * distance field values are sampled correctly by the MSDF shader.
   *
   * @param atlasPath - Path to the MSDF atlas PNG image.
   * @param metricsJson - JSON string containing glyph metrics (msdf-atlas-gen format).
   * @returns MSDFFont descriptor for use with drawText(). Includes a `shaderPool` for
   *   per-draw-call outline/shadow parameters.
   *
   * @example
   * const metrics = await fetch("fonts/roboto-msdf.json").then(r => r.text());
   * const font = loadMSDFFont("fonts/roboto-msdf.png", metrics);
   * drawText("Custom font!", 10, 10, { msdfFont: font, scale: 2, screenSpace: true });
   */
  export declare function loadMSDFFont(atlasPath: string, metricsJson: string): MSDFFont;
  /**
   * Measure the pixel dimensions of a text string without drawing it.
   * Works with both bitmap fonts and MSDF fonts.
   * Pure math -- works in headless mode.
   *
   * @param text - The string to measure.
   * @param options - Font and scale options. Default font and scale 1 if omitted.
   * @returns Width and height in pixels.
   */
  export declare function measureText(text: string, options?: TextOptions): TextMeasurement;
  /**
   * Draw a text string using the sprite pipeline (one sprite per character).
   * Must be called every frame. No-op in headless mode.
   *
   * When `msdfFont` is specified in options, uses MSDF rendering for
   * resolution-independent text with optional outline and shadow effects.
   * When only `font` or no font is specified, uses the classic bitmap renderer.
   *
   * @param text - The string to draw.
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param options - Font, scale, tint, layer, screenSpace, outline, and shadow options.
   *
   * @example
   * // Draw HUD text at the top-left of the screen
   * drawText("HP: 100", 10, 10, { scale: 2, screenSpace: true });
   *
   * @example
   * // Draw MSDF text with outline and shadow
   * const font = getDefaultMSDFFont();
   * drawText("Sharp Text!", 100, 100, {
   *   msdfFont: font,
   *   scale: 3,
   *   screenSpace: true,
   *   outline: { width: 1.0, color: { r: 0, g: 0, b: 0, a: 1 } },
   *   shadow: { offsetX: 2, offsetY: 2, color: { r: 0, g: 0, b: 0, a: 0.5 } },
   * });
   *
   * @example
   * // Multiple drawText calls with different params in the same frame work correctly.
   * // Each unique outline/shadow combo gets its own shader slot from the pool.
   * drawText("Red outline", 10, 10, { msdfFont: font, outline: { width: 1, color: { r: 1, g: 0, b: 0, a: 1 } } });
   * drawText("Blue outline", 10, 40, { msdfFont: font, outline: { width: 2, color: { r: 0, g: 0, b: 1, a: 1 } } });
   * drawText("No effects", 10, 70, { msdfFont: font });
   */
  export declare function drawText(text: string, x: number, y: number, options?: TextOptions): void;
  /** Horizontal text alignment. */
  export type TextAlign = "left" | "center" | "right";
  /** Options for {@link drawTextWrapped}. */
  export type TextLayoutOptions = TextOptions & {
      /** Maximum width in pixels before wrapping. Required for wrapping to take effect. */
      maxWidth?: number;
      /** Line height multiplier. Default: 1.2. */
      lineHeight?: number;
      /** Horizontal alignment within the wrapped area. Default: "left". */
      layoutAlign?: TextAlign;
  };
  /**
   * Split text into lines that fit within maxWidth pixels.
   * Word-wraps at space boundaries. Words longer than maxWidth are placed on their own line.
   *
   * @param text - The text to wrap.
   * @param maxWidth - Maximum line width in pixels.
   * @param scale - Text scale multiplier. Default: 1.
   * @param options - Font options for measuring. Default: built-in bitmap font.
   * @returns Array of lines.
   */
  export declare function wrapText(text: string, maxWidth: number, scale?: number, options?: TextOptions): string[];
  /**
   * Draw text with automatic word wrapping and optional alignment.
   * Wraps text at maxWidth pixels, drawing each line at the appropriate y offset.
   *
   * @param text - The text to draw.
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position of the first line.
   * @param opts - Layout and text options (maxWidth, lineHeight, layoutAlign, plus all TextOptions).
   */
  export declare function drawTextWrapped(text: string, x: number, y: number, opts?: TextLayoutOptions): void;
  /**
   * Draw text aligned within a fixed-width box.
   * Unlike drawTextWrapped, this does NOT wrap -- it only adjusts horizontal position.
   *
   * @param text - The text to draw.
   * @param x - Left edge X position of the alignment box.
   * @param y - Y position.
   * @param width - Width of the alignment box in pixels.
   * @param opts - TextOptions plus optional align.
   */
  export declare function drawTextAligned(text: string, x: number, y: number, width: number, opts?: TextOptions & {
      layoutAlign?: TextAlign;
  }): void;
  export {};

  /**
   * Load a texture from a PNG file path. Returns an opaque texture handle.
   * Caches by path -- loading the same path twice returns the same handle.
   * Returns 0 (no texture) in headless mode.
   *
   * @param path - File path to a PNG image (relative to game entry file or absolute).
   * @returns Texture handle for use with drawSprite(), createTilemap(), etc.
   *
   * @example
   * const playerTex = loadTexture("assets/player.png");
   * drawSprite({ textureId: playerTex, x: 0, y: 0, w: 32, h: 32 });
   */
  export declare function loadTexture(path: string): TextureId;
  /**
   * Create a 1x1 solid-color texture. Useful for rectangles, placeholder sprites,
   * and UI elements. Cached by name -- creating the same name twice returns the same handle.
   * Returns 0 (no texture) in headless mode.
   *
   * @param name - Unique name for caching (e.g. "red", "health-green").
   * @param color - Color with 0.0-1.0 RGBA components. Use rgb() to create from 0-255 values.
   * @returns Texture handle for use with drawSprite().
   *
   * @example
   * const redTex = createSolidTexture("red", { r: 1, g: 0, b: 0, a: 1 });
   * drawSprite({ textureId: redTex, x: 10, y: 10, w: 50, h: 50 });
   */
  export declare function createSolidTexture(name: string, color: Color): TextureId;
  /**
   * Upload a raw RGBA pixel buffer as a texture. Cached by name --
   * uploading the same name twice returns the existing handle.
   * Returns 0 (no texture) in headless mode.
   *
   * @param name - Unique name for caching (e.g. "__circle_64").
   * @param w - Texture width in pixels.
   * @param h - Texture height in pixels.
   * @param pixels - RGBA pixel data (Uint8Array of length w * h * 4).
   * @returns Texture handle for use with drawSprite().
   */
  export declare function uploadRgbaTexture(name: string, w: number, h: number, pixels: Uint8Array): TextureId;
  /**
   * Preload multiple texture assets. Calls loadTexture() for each path and
   * tracks progress. The API is async for forward compatibility with a
   * truly async backend; the current implementation loads synchronously.
   *
   * @param paths - Array of texture file paths to preload.
   * @returns Promise that resolves when all textures are loaded.
   *
   * @example
   * await preloadAssets(["assets/player.png", "assets/enemy.png", "assets/tileset.png"]);
   * // All textures are now cached and ready for drawSprite()
   */
  export declare function preloadAssets(paths: string[]): Promise<void>;
  /**
   * Check if a texture at the given path has been loaded via loadTexture() or preloadAssets().
   *
   * @param path - File path to check.
   * @returns True if the texture has been loaded.
   */
  export declare function isTextureLoaded(path: string): boolean;
  /**
   * Get the loading progress (0.0-1.0) of the most recent preloadAssets() call.
   * Returns 1.0 if no preload is in progress or the last preload has completed.
   *
   * @returns Progress ratio between 0.0 and 1.0.
   */
  export declare function getLoadingProgress(): number;

  /** Definition for an animated tile: cycles through a sequence of tile IDs. */
  export type AnimatedTileDef = {
      /** Ordered list of tile IDs to cycle through. Must have at least 2 entries. */
      frames: number[];
      /** Duration of each frame in seconds. */
      frameDuration: number;
  };
  /**
   * Register a tile ID as animated. When this tile ID appears in any tilemap,
   * it will cycle through the given frames at the given speed.
   *
   * @param baseTileId - The tile ID that triggers animation (the one you place).
   * @param frames - Array of tile IDs to cycle through (atlas indices, 1-based).
   * @param frameDuration - Duration of each frame in seconds.
   */
  export declare function registerAnimatedTile(baseTileId: number, frames: number[], frameDuration: number): void;
  /**
   * Remove an animated tile registration.
   */
  export declare function unregisterAnimatedTile(baseTileId: number): void;
  /**
   * Clear all animated tile registrations.
   */
  export declare function clearAnimatedTiles(): void;
  /**
   * Update animated tile timer. Call once per frame with delta time.
   * This advances all animated tiles globally.
   *
   * @param dt - Delta time in seconds since last frame.
   */
  export declare function updateAnimatedTiles(dt: number): void;
  /**
   * Resolve a tile ID to its current animation frame.
   * If the tile is not animated, returns the original ID.
   */
  export declare function resolveAnimatedTile(tileId: number): number;
  /**
   * Get all registered animated tile definitions.
   * Returns a read-only copy.
   */
  export declare function getAnimatedTileDefs(): ReadonlyMap<number, AnimatedTileDef>;
  /** Custom properties for a tile type (indexed by tile ID). */
  export type TileProperties = Record<string, unknown>;
  /**
   * Define custom properties for a tile ID. Properties are metadata like
   * "walkable", "damage", "friction", etc. Queryable at runtime.
   *
   * @param tileId - The tile ID (atlas index, 1-based).
   * @param properties - Key-value pairs of custom metadata.
   */
  export declare function defineTileProperties(tileId: number, properties: TileProperties): void;
  /**
   * Get the custom properties for a tile ID.
   * Returns undefined if no properties are defined for this tile.
   */
  export declare function getTileProperties(tileId: number): TileProperties | undefined;
  /**
   * Get a specific property value for a tile ID.
   * Returns undefined if the tile has no properties or lacks the given key.
   */
  export declare function getTileProperty(tileId: number, key: string): unknown;
  /**
   * Query tile properties at a specific grid position in a layered tilemap.
   * Returns properties of the tile at (gx, gy) on the given layer,
   * or undefined if the tile has no properties or position is empty.
   */
  export declare function getTilePropertiesAt(tilemap: LayeredTilemap, layerName: string, gx: number, gy: number): TileProperties | undefined;
  /**
   * Query a specific property at a grid position.
   */
  export declare function getTilePropertyAt(tilemap: LayeredTilemap, layerName: string, gx: number, gy: number, key: string): unknown;
  /**
   * Clear all tile property definitions.
   */
  export declare function clearTileProperties(): void;
  /** A single layer in a layered tilemap. */
  export type TilemapLayer = {
      /** Layer name (unique within the tilemap). */
      name: string;
      /** Underlying Rust tilemap handle. */
      tilemapId: TilemapId;
      /** Draw order (lower = drawn first / behind). */
      zOrder: number;
      /** Whether this layer is visible. Default: true. */
      visible: boolean;
      /** Opacity for this layer (0-1). Default: 1. */
      opacity: number;
      /** Parallax depth factor (0 = fixed/HUD, 0.5 = half speed, 1 = normal). Default: 1. */
      parallaxFactor: number;
  };
  /** Options for creating a layer. */
  export type LayerOptions = {
      /** Draw order. Lower = behind. Default: 0. */
      zOrder?: number;
      /** Whether the layer is visible. Default: true. */
      visible?: boolean;
      /** Layer opacity (0-1). Default: 1. */
      opacity?: number;
      /** Parallax depth factor. Default: 1. */
      parallaxFactor?: number;
  };
  /** A multi-layer tilemap that manages multiple Rust tilemap instances. */
  export type LayeredTilemap = {
      /** Base configuration shared across all layers. */
      config: TilemapOptions;
      /** Map of layer name to layer data. */
      layers: Map<string, TilemapLayer>;
      /** Grid width in tiles. */
      width: number;
      /** Grid height in tiles. */
      height: number;
      /** Size of each tile in world units. */
      tileSize: number;
  };
  /**
   * Create a multi-layer tilemap. All layers share the same grid dimensions
   * and texture atlas. Each layer is a separate Rust tilemap handle.
   *
   * @param opts - Base tilemap configuration (atlas, grid size, tile size).
   * @param layerDefs - Array of [name, options?] pairs defining the layers.
   * @returns A LayeredTilemap that manages all layers.
   *
   * @example
   * ```ts
   * const map = createLayeredTilemap(
   *   { textureId: atlas, width: 40, height: 30, tileSize: 16, atlasColumns: 8, atlasRows: 8 },
   *   [
   *     ["ground", { zOrder: 0 }],
   *     ["walls", { zOrder: 10 }],
   *     ["decoration", { zOrder: 20 }],
   *     ["collision", { zOrder: -1, visible: false }],
   *   ],
   * );
   * ```
   */
  export declare function createLayeredTilemap(opts: TilemapOptions, layerDefs: Array<[string, LayerOptions?]>): LayeredTilemap;
  /**
   * Set a tile on a specific layer.
   *
   * @param tilemap - The layered tilemap.
   * @param layerName - Which layer to modify.
   * @param gx - Grid X position.
   * @param gy - Grid Y position.
   * @param tileId - Tile index in the atlas (1-based). 0 = empty.
   */
  export declare function setLayerTile(tilemap: LayeredTilemap, layerName: string, gx: number, gy: number, tileId: number): void;
  /**
   * Get a tile from a specific layer.
   *
   * @returns Tile ID at the given position, or 0 if empty/out of bounds/layer not found.
   */
  export declare function getLayerTile(tilemap: LayeredTilemap, layerName: string, gx: number, gy: number): number;
  /**
   * Set the visibility of a layer.
   */
  export declare function setLayerVisible(tilemap: LayeredTilemap, layerName: string, visible: boolean): void;
  /**
   * Set the opacity of a layer (0-1).
   */
  export declare function setLayerOpacity(tilemap: LayeredTilemap, layerName: string, opacity: number): void;
  /**
   * Get layer names in z-order (front to back).
   */
  export declare function getLayerNames(tilemap: LayeredTilemap): string[];
  /**
   * Draw all visible layers of a layered tilemap, sorted by z-order.
   * Supports animated tiles (call updateAnimatedTiles(dt) before this each frame).
   * Supports per-layer parallax scrolling relative to a camera position.
   *
   * @param tilemap - The layered tilemap to draw.
   * @param x - World X offset for the tilemap origin.
   * @param y - World Y offset for the tilemap origin.
   * @param baseLayer - Base draw order layer. Each tilemap layer adds its zOrder.
   * @param cameraX - Camera X for parallax calculation. Default: 0.
   * @param cameraY - Camera Y for parallax calculation. Default: 0.
   */
  export declare function drawLayeredTilemap(tilemap: LayeredTilemap, x?: number, y?: number, baseLayer?: number, cameraX?: number, cameraY?: number): void;
  /**
   * Create a tilemap backed by a texture atlas. Returns an opaque TilemapId handle.
   * The tilemap stores a grid of tile IDs that map to sub-regions of the atlas texture.
   * Returns 0 in headless mode.
   *
   * @param opts - Tilemap configuration (atlas texture, grid size, tile size, atlas layout).
   * @returns Tilemap handle for use with setTile(), getTile(), drawTilemap().
   */
  export declare function createTilemap(opts: TilemapOptions): TilemapId;
  /**
   * Set a tile at grid position (gx, gy).
   * Tile IDs correspond to positions in the texture atlas (left-to-right, top-to-bottom).
   * Tile ID 0 = empty (not drawn). No-op in headless mode.
   *
   * If the tile ID is registered as animated (via registerAnimatedTile), the tile
   * will automatically cycle through its frames when drawn.
   *
   * @param id - Tilemap handle from createTilemap().
   * @param gx - Grid X position (column). 0 = leftmost.
   * @param gy - Grid Y position (row). 0 = topmost.
   * @param tileId - Tile index in the atlas (1-based). 0 = empty/clear.
   */
  export declare function setTile(id: TilemapId, gx: number, gy: number, tileId: number): void;
  /**
   * Get the tile ID at grid position (gx, gy).
   * Returns the original tile ID (not the animated frame).
   * Returns 0 if out of bounds or in headless mode.
   *
   * @param id - Tilemap handle from createTilemap().
   * @param gx - Grid X position (column).
   * @param gy - Grid Y position (row).
   * @returns Tile ID at the given position, or 0 if empty/out of bounds.
   */
  export declare function getTile(id: TilemapId, gx: number, gy: number): number;
  /**
   * Draw all visible tiles as sprites. Only draws tiles within the camera viewport (culled).
   * Must be called every frame. No-op in headless mode.
   *
   * @param id - Tilemap handle from createTilemap().
   * @param x - World X offset for the tilemap origin. Default: 0.
   * @param y - World Y offset for the tilemap origin. Default: 0.
   * @param layer - Draw order layer. Default: 0.
   */
  export declare function drawTilemap(id: TilemapId, x?: number, y?: number, layer?: number): void;
  /**
   * Fill a rectangular region of a tilemap with a single tile ID.
   * Convenient for bulk tile placement.
   *
   * @param id - Tilemap handle.
   * @param startX - Starting grid X.
   * @param startY - Starting grid Y.
   * @param endX - Ending grid X (exclusive).
   * @param endY - Ending grid Y (exclusive).
   * @param tileId - Tile ID to fill with.
   */
  export declare function fillTiles(id: TilemapId, startX: number, startY: number, endX: number, endY: number, tileId: number): void;
  /**
   * Fill a rectangular region of a layered tilemap with a single tile ID.
   */
  export declare function fillLayerTiles(tilemap: LayeredTilemap, layerName: string, startX: number, startY: number, endX: number, endY: number, tileId: number): void;

  /**
   * Trail / ribbon renderer.
   *
   * Creates a ribbon that follows a moving point. Internally stores a list of
   * points. Each frame new points are added and old ones expire. The trail is
   * rendered as a sequence of sprite quads connecting adjacent points, with
   * configurable width, color fade, and opacity.
   *
   * This is a TS-only feature — no Rust/GPU changes needed. Each trail segment
   * is drawn as a rotated sprite quad.
   *
   * @example
   * ```ts
   * const trail = createTrail({ maxLength: 20, width: 8, color: rgb(255, 128, 0) });
   *
   * onFrame(() => {
   *   updateTrail(trail, mouseX, mouseY);
   *   drawTrail(trail);
   * });
   * ```
   */
  /** A single point in the trail. */
  export type TrailPoint = {
      x: number;
      y: number;
      age: number;
  };
  /** Configuration for creating a trail. */
  export type TrailConfig = {
      /** Maximum number of points before oldest are removed. Default: 30. */
      maxLength?: number;
      /** Width of the ribbon in world units. Default: 8. */
      width?: number;
      /** RGBA color of the trail. Default: white. */
      color?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** End color (fades from color to endColor along the trail). Optional. */
      endColor?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Maximum lifetime per point in seconds. Points older than this are removed. Default: 1.0. */
      maxAge?: number;
      /** Draw layer. Default: 0. */
      layer?: number;
      /** Optional texture for the trail segments. Uses solid color if not provided. */
      textureId?: TextureId;
      /** Blend mode for trail segments. Default: "alpha". */
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
      /** Minimum distance between consecutive points. Default: 2. */
      minDistance?: number;
  };
  /** A trail instance with state. */
  export type Trail = {
      config: Required<Omit<TrailConfig, "textureId" | "endColor">> & {
          textureId: TextureId | null;
          endColor: {
              r: number;
              g: number;
              b: number;
              a: number;
          } | null;
      };
      points: TrailPoint[];
      active: boolean;
  };
  /**
   * Create a new trail instance.
   *
   * @param config - Trail configuration.
   * @returns A new Trail ready for updateTrail/drawTrail.
   */
  export declare function createTrail(config?: TrailConfig): Trail;
  /**
   * Add a new point to the trail head and age existing points.
   * Points that exceed maxAge or when the trail exceeds maxLength are removed.
   *
   * @param trail - The trail instance.
   * @param x - World X position.
   * @param y - World Y position.
   * @param dt - Delta time in seconds (for aging points). Default: 1/60.
   */
  export declare function updateTrail(trail: Trail, x: number, y: number, dt?: number): void;
  /**
   * Draw the trail as a series of rotated sprite quads connecting adjacent points.
   * No-op in headless mode (drawSprite is no-op).
   *
   * @param trail - The trail instance.
   */
  export declare function drawTrail(trail: Trail): void;
  /**
   * Clear all points from a trail.
   *
   * @param trail - The trail instance.
   */
  export declare function clearTrail(trail: Trail): void;
  /**
   * Pause a trail — stops adding new points but keeps rendering existing ones.
   *
   * @param trail - The trail instance.
   */
  export declare function pauseTrail(trail: Trail): void;
  /**
   * Resume a paused trail.
   *
   * @param trail - The trail instance.
   */
  export declare function resumeTrail(trail: Trail): void;
  /**
   * Get the number of points currently in the trail.
   *
   * @param trail - The trail instance.
   * @returns Point count.
   */
  export declare function getTrailPointCount(trail: Trail): number;

  /**
   * Screen transitions: visual effects applied during scene changes.
   *
   * Transitions work as a timed overlay that covers the screen. At the midpoint
   * the actual scene swap happens (hidden behind the overlay). Each transition
   * type uses a different visual pattern to reveal/conceal.
   *
   * Built-in types:
   * - **fade** — simple alpha fade to/from a solid color
   * - **wipe** — horizontal sweep from left to right
   * - **circleIris** — expanding/contracting circle from center
   * - **diamond** — diamond-shaped iris
   * - **pixelate** — increasing pixel size that obscures the image
   *
   * Integrates with the scene manager: pass a {@link ScreenTransitionConfig} to
   * `pushScene()`, `popScene()`, or `replaceScene()` and the transition renders
   * automatically via {@link updateScreenTransition} / {@link drawScreenTransition}.
   *
   * @example
   * ```ts
   * import { startScreenTransition, updateScreenTransition, drawScreenTransition } from "./transition.ts";
   *
   * startScreenTransition("circleIris", 0.6, { color: rgb(0, 0, 0) }, () => {
   *   // swap scene at midpoint
   * });
   * ```
   */
  /** Available screen transition visual patterns. */
  export type ScreenTransitionType = "fade" | "wipe" | "circleIris" | "diamond" | "pixelate";
  /** Configuration for a screen transition. */
  export type ScreenTransitionConfig = {
      /** Transition visual pattern. Default: "fade". */
      type?: ScreenTransitionType;
      /** Total duration in seconds. Default: 0.5. */
      duration?: number;
      /** Overlay color. Default: black. */
      color?: {
          r: number;
          g: number;
          b: number;
      };
      /** Draw layer for the overlay. Default: 250. */
      layer?: number;
  };
  /**
   * Start a screen transition. At the midpoint (half duration), `onMidpoint`
   * is called — this is where you swap scenes. The transition then plays in
   * reverse to reveal the new scene.
   *
   * @param type - Visual pattern.
   * @param dur - Duration in seconds.
   * @param config - Color and layer overrides.
   * @param onMidpoint - Callback executed at the midpoint (scene swap).
   * @param onComplete - Callback executed when the transition finishes.
   */
  export declare function startScreenTransition(type: ScreenTransitionType, dur: number, config?: {
      color?: {
          r: number;
          g: number;
          b: number;
      };
      layer?: number;
  }, onMidpoint?: () => void, onComplete?: () => void): void;
  /**
   * Advance the transition timer. Call once per frame.
   *
   * @param dt - Delta time in seconds.
   */
  export declare function updateScreenTransition(dt: number): void;
  /**
   * Draw the transition overlay. Call after scene rendering each frame.
   * No-op when no transition is active.
   */
  export declare function drawScreenTransition(): void;
  /**
   * Check whether a screen transition is currently active.
   * @returns True if transitioning.
   */
  export declare function isScreenTransitionActive(): boolean;
  /**
   * Get the current transition progress (0-1). During "out" phase, 0->1.
   * During "in" phase, 1->0. Returns 0 when no transition is active.
   */
  export declare function getScreenTransitionProgress(): number;
  /**
   * Reset transition state. For testing only.
   */

  /**
   * Typewriter text: progressive character-by-character text reveal.
   *
   * Used for dialogue, tutorials, and narrative sequences. Characters appear
   * one at a time with configurable speed, punctuation pauses, and skip-ahead.
   *
   * @example
   * ```ts
   * const tw = createTypewriter("The dragon approaches...", {
   *   speed: 30,
   *   onChar: () => playSound(typeSound),
   * });
   *
   * // In game loop:
   * updateTypewriter(tw, dt);
   * drawTypewriter(tw, 50, 300, { scale: 1, layer: 100 });
   * ```
   */
  /** Configuration for creating a typewriter. */
  export type TypewriterConfig = {
      /** Characters revealed per second. Default: 30. */
      speed?: number;
      /** Extra pause duration in seconds on punctuation marks (. , ! ? ...). Default: 0.15. */
      punctuationPause?: number;
      /** Characters that trigger punctuation pause. Default: ".!?,;:". */
      punctuationChars?: string;
      /** Called for each character revealed. Use for sound effects. */
      onChar?: (char: string, index: number) => void;
      /** Called when all text has been fully revealed. */
      onComplete?: () => void;
  };
  /** Draw options for rendering typewriter text. */
  export type TypewriterDrawOptions = {
      /** Text scale. Default: 1. */
      scale?: number;
      /** Text color. Default: white. */
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Draw layer. Default: 100. */
      layer?: number;
      /** Screen-space coordinates. Default: false. */
      screenSpace?: boolean;
  };
  /** A typewriter instance. */
  export type Typewriter = {
      /** Full text to reveal. */
      fullText: string;
      /** Number of characters currently visible. */
      visibleChars: number;
      /** Whether the full text has been revealed. */
      complete: boolean;
      /** Whether the typewriter is paused. */
      paused: boolean;
      /** Characters per second. */
      speed: number;
      /** Punctuation pause duration in seconds. */
      punctuationPause: number;
      /** Characters that trigger punctuation pause. */
      punctuationChars: string;
      /** Internal accumulator for character timing. */
      _accumulator: number;
      /** Internal: whether we're in a punctuation pause. */
      _inPause: boolean;
      /** Internal: remaining pause time. */
      _pauseRemaining: number;
      /** Callbacks. */
      _onChar: ((char: string, index: number) => void) | null;
      _onComplete: (() => void) | null;
  };
  /**
   * Create a new typewriter instance.
   *
   * @param text - The full text to progressively reveal.
   * @param config - Speed, punctuation pause, and callback options.
   * @returns A Typewriter instance to pass to updateTypewriter/drawTypewriter.
   */
  export declare function createTypewriter(text: string, config?: TypewriterConfig): Typewriter;
  /**
   * Advance the typewriter by dt seconds. Reveals characters according to speed.
   * Applies punctuation pauses and fires callbacks.
   *
   * @param tw - The typewriter instance.
   * @param dt - Delta time in seconds.
   */
  export declare function updateTypewriter(tw: Typewriter, dt: number): void;
  /**
   * Draw the typewriter's currently visible text.
   * No-op in headless mode (drawText is no-op).
   *
   * @param tw - The typewriter instance.
   * @param x - X position.
   * @param y - Y position.
   * @param options - Scale, tint, layer, screenSpace.
   */
  export declare function drawTypewriter(tw: Typewriter, x: number, y: number, options?: TypewriterDrawOptions): void;
  /**
   * Skip ahead: immediately reveal all remaining text.
   * Fires onComplete if not already complete.
   *
   * @param tw - The typewriter instance.
   */
  export declare function skipTypewriter(tw: Typewriter): void;
  /**
   * Pause the typewriter. No characters will be revealed until resumed.
   *
   * @param tw - The typewriter instance.
   */
  export declare function pauseTypewriter(tw: Typewriter): void;
  /**
   * Resume a paused typewriter.
   *
   * @param tw - The typewriter instance.
   */
  export declare function resumeTypewriter(tw: Typewriter): void;
  /**
   * Reset the typewriter to the beginning with optional new text.
   *
   * @param tw - The typewriter instance.
   * @param newText - Optional new text. If not provided, replays the same text.
   */
  export declare function resetTypewriter(tw: Typewriter, newText?: string): void;
  /**
   * Get the currently visible text string.
   *
   * @param tw - The typewriter instance.
   * @returns The substring of fullText that is currently visible.
   */
  export declare function getVisibleText(tw: Typewriter): string;
  /**
   * Check whether the typewriter has finished revealing all text.
   *
   * @param tw - The typewriter instance.
   * @returns True if all text is visible.
   */
  export declare function isTypewriterComplete(tw: Typewriter): boolean;

}
