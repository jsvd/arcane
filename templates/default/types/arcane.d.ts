// Arcane Engine — TypeScript API Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/{module}
// Modules: rendering, ui, state, physics, tweening, particles, pathfinding, systems, agent, testing

// ============================================================================
// Module: @arcane/runtime/rendering (Rendering)
// ============================================================================

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
      /** Custom shader handle from createShaderFromSource(). Default: 0 (built-in shader). */
      shaderId?: number;
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
   * Opaque handle to a registered animation definition.
   * Returned by {@link createAnimation}.
   */
  export type AnimationId = number;
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
  }): AnimationId;
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
   * Opaque handle to a loaded sound. Returned by {@link loadSound}.
   * A value of 0 means "no sound" (headless mode fallback).
   */
  export type SoundId = number;
  /** Options for {@link playSound}. */
  export type PlayOptions = {
      /** Playback volume, 0.0 (silent) to 1.0 (full). Default: 1.0. */
      volume?: number;
      /** If true, sound loops until stopped. Default: false. */
      loop?: boolean;
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
   * Play a loaded sound effect.
   * No-op in headless mode.
   *
   * @param id - Sound handle from loadSound().
   * @param options - Volume and loop settings.
   */
  export declare function playSound(id: SoundId, options?: PlayOptions): void;
  /**
   * Load and play a sound file as looping background music.
   * Convenience function combining loadSound() + playSound() with loop: true.
   * Returns 0 in headless mode.
   *
   * @param path - File path to an audio file.
   * @param volume - Playback volume, 0.0-1.0. Default: 1.0.
   * @returns Sound handle for later stopping with stopSound().
   */
  export declare function playMusic(path: string, volume?: number): SoundId;
  /**
   * Stop a specific playing sound.
   * No-op in headless mode.
   *
   * @param id - Sound handle from loadSound() or playMusic().
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
   * Check if a key is currently held down (returns true every frame while held).
   * Returns false in headless mode.
   *
   * Key names follow web KeyboardEvent.key standards:
   * - Arrow keys: `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`
   * - Letters: `"a"` - `"z"` (lowercase)
   * - Digits: `"0"` - `"9"`
   * - Function keys: `"F1"` - `"F12"`
   * - Whitespace: `"Space"`, `"Tab"`, `"Enter"`
   * - Modifiers: `"Shift"`, `"Control"`, `"Alt"`
   * - Navigation: `"Escape"`, `"Backspace"`, `"Delete"`, `"Home"`, `"End"`, `"PageUp"`, `"PageDown"`
   *
   * @param key - Key name string (case-sensitive, web standard).
   * @returns true if the key is currently held down, false otherwise.
   *
   * @example
   * if (isKeyDown("ArrowRight")) {
   *   player.x += speed * dt;
   * }
   */
  export declare function isKeyDown(key: string): boolean;
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
  export declare function isKeyPressed(key: string): boolean;
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
   * Values are in 0.0-1.0 range. Default is dark blue-gray (0.1, 0.1, 0.15).
   * No-op in headless mode.
   *
   * @param r - Red channel (0.0 to 1.0).
   * @param g - Green channel (0.0 to 1.0).
   * @param b - Blue channel (0.0 to 1.0).
   */
  export declare function setBackgroundColor(r: number, g: number, b: number): void;
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
   * Set the ambient light color applied to all sprites.
   * (1, 1, 1) = full white (no darkening, the default).
   * (0, 0, 0) = complete darkness (only point lights visible).
   * No-op in headless mode.
   *
   * @param r - Red channel, 0.0-1.0.
   * @param g - Green channel, 0.0-1.0.
   * @param b - Blue channel, 0.0-1.0.
   */
  export declare function setAmbientLight(r: number, g: number, b: number): void;
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
   * Custom shader support for user-defined WGSL fragment shaders.
   *
   * Custom shaders replace the fragment stage while keeping the standard
   * vertex shader (rotation, transforms, camera projection). The standard
   * declarations (camera, texture, lighting, VertexOutput) are prepended
   * automatically — you only write the @fragment function.
   *
   * Custom uniforms are available via `shader_params.values[0..15]` (16 vec4 slots).
   *
   * @example
   * const crt = createShaderFromSource("crt", `
   *   @fragment
   *   fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
   *     let tex = textureSample(t_diffuse, s_diffuse, in.tex_coords);
   *     let scanline = sin(in.tex_coords.y * shader_params.values[0].x) * 0.5 + 0.5;
   *     return vec4<f32>(tex.rgb * in.tint.rgb * scanline, tex.a * in.tint.a);
   *   }
   * `);
   * setShaderParam(crt, 0, 800.0); // scanline frequency
   * drawSprite({ textureId: tex, x: 0, y: 0, w: 800, h: 600, shaderId: crt });
   */
  /** Opaque handle to a custom shader. Returned by {@link createShaderFromSource}. */
  export type ShaderId = number;
  /**
   * Create a custom fragment shader from WGSL source.
   * The source must contain a `@fragment fn fs_main(in: VertexOutput) -> @location(0) vec4<f32>`.
   *
   * Standard declarations are prepended automatically:
   * - `camera` (group 0), `t_diffuse`/`s_diffuse` (group 1), `lighting` (group 2)
   * - `VertexOutput` struct with `tex_coords`, `tint`, `world_position`
   * - Standard vertex shader (`vs_main`)
   *
   * Custom uniforms: `shader_params.values[0..15]` (group 3, 16 vec4 slots).
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
   * @param index - Slot index (0-15).
   * @param x - First component (or the only value for scalar params).
   * @param y - Second component. Default: 0.
   * @param z - Third component. Default: 0.
   * @param w - Fourth component. Default: 0.
   */
  export declare function setShaderParam(shaderId: ShaderId, index: number, x: number, y?: number, z?: number, w?: number): void;

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
   * Clear all queued sprites for this frame.
   * Normally not needed -- the renderer clears automatically at frame start.
   * No-op in headless mode.
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
  /** Options for {@link drawText} and {@link measureText}. */
  export type TextOptions = {
      /** Font to use. Default: built-in 8x8 CP437 bitmap font via getDefaultFont(). */
      font?: BitmapFont;
      /** Scale multiplier for glyph size. Default: 1. A value of 2 draws at 16x16. */
      scale?: number;
      /** RGBA tint color for the text (0.0-1.0 per channel). Default: white. */
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Draw order layer. Default: 100 (above most game sprites). */
      layer?: number;
      /** If true, position is in screen pixels (HUD). If false, position is in world units. Default: false. */
      screenSpace?: boolean;
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
   * Measure the pixel dimensions of a text string without drawing it.
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
   * @param text - The string to draw.
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param options - Font, scale, tint, layer, and screenSpace options.
   *
   * @example
   * // Draw HUD text at the top-left of the screen
   * drawText("HP: 100", 10, 10, { scale: 2, screenSpace: true });
   *
   * @example
   * // Draw world-space text above an entity
   * drawText("Enemy", enemy.x, enemy.y - 12, {
   *   tint: { r: 1, g: 0.3, b: 0.3, a: 1 },
   *   layer: 50,
   * });
   */
  export declare function drawText(text: string, x: number, y: number, options?: TextOptions): void;

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
   * @param r - Red channel, 0-255.
   * @param g - Green channel, 0-255.
   * @param b - Blue channel, 0-255.
   * @param a - Alpha channel, 0-255. Default: 255 (fully opaque).
   * @returns Texture handle for use with drawSprite().
   *
   * @example
   * const redTex = createSolidTexture("red", 255, 0, 0);
   * drawSprite({ textureId: redTex, x: 10, y: 10, w: 50, h: 50 });
   */
  export declare function createSolidTexture(name: string, r: number, g: number, b: number, a?: number): TextureId;

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
   * @param id - Tilemap handle from createTilemap().
   * @param gx - Grid X position (column). 0 = leftmost.
   * @param gy - Grid Y position (row). 0 = topmost.
   * @param tileId - Tile index in the atlas (1-based). 0 = empty/clear.
   */
  export declare function setTile(id: TilemapId, gx: number, gy: number, tileId: number): void;
  /**
   * Get the tile ID at grid position (gx, gy).
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

}

// ============================================================================
// Module: @arcane/runtime/ui (UI)
// ============================================================================

declare module "@arcane/runtime/ui" {
  /**
   * RGBA color with 0.0-1.0 float components (matching sprite tint format).
   * Use {@link rgb} to create from 0-255 integer values.
   */
  export type Color = {
      /** Red channel, 0.0 (none) to 1.0 (full). */
      r: number;
      /** Green channel, 0.0 (none) to 1.0 (full). */
      g: number;
      /** Blue channel, 0.0 (none) to 1.0 (full). */
      b: number;
      /** Alpha channel, 0.0 (transparent) to 1.0 (opaque). */
      a: number;
  };
  /**
   * Create a Color from 0-255 RGB(A) integer values, auto-normalized to 0.0-1.0 range.
   *
   * @param r - Red channel, 0-255.
   * @param g - Green channel, 0-255.
   * @param b - Blue channel, 0-255.
   * @param a - Alpha channel, 0-255. Default: 255 (fully opaque).
   * @returns Color with 0.0-1.0 float components.
   *
   * @example
   * rgb(255, 128, 0)        // Orange, fully opaque
   * rgb(255, 0, 0, 128)     // Red, 50% transparent
   */
  export declare function rgb(r: number, g: number, b: number, a?: number): Color;
  /** Options for {@link drawRect}. */
  export type RectOptions = {
      /** Fill color. Default: white `{ r: 1, g: 1, b: 1, a: 1 }`. */
      color?: Color;
      /** Draw order layer. Default: 90 (below text, above game sprites). */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };
  /** Options for {@link drawPanel}. */
  export type PanelOptions = {
      /** Interior fill color. Default: dark semi-transparent `{ r: 0.1, g: 0.1, b: 0.15, a: 0.9 }`. */
      fillColor?: Color;
      /** Border color. Default: gray `{ r: 0.5, g: 0.5, b: 0.5, a: 1 }`. */
      borderColor?: Color;
      /** Border width in pixels. Default: 2. */
      borderWidth?: number;
      /** Draw order layer. Default: 90. */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };
  /** Options for {@link drawBar}. */
  export type BarOptions = {
      /** Fill/foreground color (the filled portion). Default: green. */
      fillColor?: Color;
      /** Background color (the empty portion). Default: dark red. */
      bgColor?: Color;
      /** Optional border color. No border if omitted. */
      borderColor?: Color;
      /** Border width in pixels. Default: 0 (no border). */
      borderWidth?: number;
      /** Draw order layer. Default: 90. */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };
  /** Options for {@link drawLabel}. */
  export type LabelOptions = {
      /** Text color. Default: white. */
      textColor?: Color;
      /** Background panel color. Default: dark semi-transparent. */
      bgColor?: Color;
      /** Border color of the background panel. Default: gray. */
      borderColor?: Color;
      /** Border width of the background panel in pixels. Default: 1. */
      borderWidth?: number;
      /** Padding between text and panel edge in pixels. Default: 4. */
      padding?: number;
      /** Text scale multiplier. Default: 1. */
      scale?: number;
      /** Draw order layer. Default: 90. */
      layer?: number;
      /** If true, x/y are screen pixels (HUD). If false, world units. Default: false. */
      screenSpace?: boolean;
  };

  /**
   * Standard color palette and layout helpers for consistent UI styling.
   */
  /**
   * Arcane UI Color Palette.
   * Pre-defined colors (0.0-1.0 RGBA) for consistent visual style across all demos.
   */
  export declare const Colors: {
      /** Bright blue. */
      readonly PRIMARY: {
          readonly r: 0.2;
          readonly g: 0.6;
          readonly b: 1;
          readonly a: 1;
      };
      /** Green (success state). */
      readonly SUCCESS: {
          readonly r: 0.2;
          readonly g: 0.8;
          readonly b: 0.3;
          readonly a: 1;
      };
      /** Orange/Yellow (warning state). */
      readonly WARNING: {
          readonly r: 1;
          readonly g: 0.7;
          readonly b: 0;
          readonly a: 1;
      };
      /** Red (danger/error state). */
      readonly DANGER: {
          readonly r: 1;
          readonly g: 0.3;
          readonly b: 0.3;
          readonly a: 1;
      };
      /** Cyan (informational). */
      readonly INFO: {
          readonly r: 0.4;
          readonly g: 0.8;
          readonly b: 0.9;
          readonly a: 1;
      };
      /** Pure white. */
      readonly WHITE: {
          readonly r: 1;
          readonly g: 1;
          readonly b: 1;
          readonly a: 1;
      };
      /** Light gray. */
      readonly LIGHT_GRAY: {
          readonly r: 0.8;
          readonly g: 0.8;
          readonly b: 0.8;
          readonly a: 1;
      };
      /** Medium gray. */
      readonly GRAY: {
          readonly r: 0.5;
          readonly g: 0.5;
          readonly b: 0.5;
          readonly a: 1;
      };
      /** Dark gray. */
      readonly DARK_GRAY: {
          readonly r: 0.3;
          readonly g: 0.3;
          readonly b: 0.3;
          readonly a: 1;
      };
      /** Pure black. */
      readonly BLACK: {
          readonly r: 0;
          readonly g: 0;
          readonly b: 0;
          readonly a: 1;
      };
      /** Dark semi-transparent background for HUD panels. */
      readonly HUD_BG: {
          readonly r: 0.1;
          readonly g: 0.1;
          readonly b: 0.15;
          readonly a: 0.85;
      };
      /** Lighter semi-transparent background for HUD panels. */
      readonly HUD_BG_LIGHT: {
          readonly r: 0.2;
          readonly g: 0.2;
          readonly b: 0.25;
          readonly a: 0.75;
      };
      /** Gold color for scores, coins, rewards. */
      readonly GOLD: {
          readonly r: 1;
          readonly g: 0.84;
          readonly b: 0;
          readonly a: 1;
      };
      /** Silver color for secondary rewards. */
      readonly SILVER: {
          readonly r: 0.75;
          readonly g: 0.75;
          readonly b: 0.75;
          readonly a: 1;
      };
      /** Bronze color for tertiary rewards. */
      readonly BRONZE: {
          readonly r: 0.8;
          readonly g: 0.5;
          readonly b: 0.2;
          readonly a: 1;
      };
      /** Bright green for victory/win state. */
      readonly WIN: {
          readonly r: 0.2;
          readonly g: 1;
          readonly b: 0.4;
          readonly a: 1;
      };
      /** Bright red for defeat/lose state. */
      readonly LOSE: {
          readonly r: 1;
          readonly g: 0.2;
          readonly b: 0.2;
          readonly a: 1;
      };
      /** Yellow for paused state. */
      readonly PAUSED: {
          readonly r: 0.9;
          readonly g: 0.9;
          readonly b: 0.2;
          readonly a: 1;
      };
  };
  /**
   * Standard HUD layout constants. All values use **logical pixels** (DPI-independent).
   * Spacing values (PADDING, LINE_HEIGHT, TEXT_SCALE) work at any resolution.
   * **Position values assume 800×600** — for other viewports, compute positions
   * from `getViewportSize()` instead (e.g. `{ x: vpW - 100, y: 10 }` for top-right).
   */
  export declare const HUDLayout: {
      /** Standard padding from screen edges in pixels. Works at any resolution. */
      readonly PADDING: 10;
      /** Vertical spacing between HUD lines in pixels. Works at any resolution. */
      readonly LINE_HEIGHT: 25;
      /** Default text scale for main HUD text. Works at any resolution. */
      readonly TEXT_SCALE: 2;
      /** Smaller text scale for secondary HUD text. Works at any resolution. */
      readonly SMALL_TEXT_SCALE: 1.5;
      /** Top-left corner position. Works at any resolution. */
      readonly TOP_LEFT: {
          readonly x: 10;
          readonly y: 10;
      };
      /** Top-right corner position. **Assumes 800px width** — use `getViewportSize()` for other sizes. */
      readonly TOP_RIGHT: {
          readonly x: 700;
          readonly y: 10;
      };
      /** Bottom-left corner position. **Assumes 600px height** — use `getViewportSize()` for other sizes. */
      readonly BOTTOM_LEFT: {
          readonly x: 10;
          readonly y: 560;
      };
      /** Bottom-right corner position. **Assumes 800×600** — use `getViewportSize()` for other sizes. */
      readonly BOTTOM_RIGHT: {
          readonly x: 700;
          readonly y: 560;
      };
      /** Screen center position. **Assumes 800×600** — use `getViewportSize()` for other sizes. */
      readonly CENTER: {
          readonly x: 400;
          readonly y: 300;
      };
  };
  /**
   * Create a semi-transparent version of a color.
   *
   * @param color - Source color.
   * @param alpha - New alpha value, 0.0 (transparent) to 1.0 (opaque).
   * @returns New Color with the same RGB but the specified alpha.
   */
  export declare function withAlpha(color: Color, alpha: number): Color;
  /**
   * Lighten a color by adding a fixed amount to each RGB channel (clamped to 1.0).
   * Useful for hover effects and highlights.
   *
   * @param color - Source color.
   * @param amount - Amount to add to each RGB channel, 0.0-1.0. Default: 0.2.
   * @returns New lightened Color (alpha unchanged).
   */
  export declare function lighten(color: Color, amount?: number): Color;
  /**
   * Darken a color by subtracting a fixed amount from each RGB channel (clamped to 0.0).
   * Useful for pressed states and shadows.
   *
   * @param color - Source color.
   * @param amount - Amount to subtract from each RGB channel, 0.0-1.0. Default: 0.2.
   * @returns New darkened Color (alpha unchanged).
   */
  export declare function darken(color: Color, amount?: number): Color;

  /**
   * Draw a filled rectangle.
   * No-op in headless mode.
   *
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param w - Width in pixels (screenSpace) or world units.
   * @param h - Height in pixels (screenSpace) or world units.
   * @param options - Color, layer, and screenSpace options.
   *
   * @example
   * // Draw a red rectangle in screen space (HUD)
   * drawRect(10, 10, 200, 30, {
   *   color: { r: 1, g: 0, b: 0, a: 0.8 },
   *   screenSpace: true,
   * });
   */
  export declare function drawRect(x: number, y: number, w: number, h: number, options?: RectOptions): void;
  /**
   * Draw a panel with border and fill (5 sprites: 4 border edges + 1 fill).
   * No-op in headless mode.
   *
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param w - Total width including border.
   * @param h - Total height including border.
   * @param options - Fill color, border color, border width, layer, and screenSpace options.
   *
   * @example
   * // Draw a HUD panel
   * drawPanel(10, 10, 200, 100, {
   *   fillColor: { r: 0.1, g: 0.1, b: 0.2, a: 0.9 },
   *   borderColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
   *   borderWidth: 2,
   *   screenSpace: true,
   * });
   */
  export declare function drawPanel(x: number, y: number, w: number, h: number, options?: PanelOptions): void;
  /**
   * Draw a progress/health bar with background, fill, and optional border.
   * No-op in headless mode.
   *
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param w - Total width.
   * @param h - Total height.
   * @param fillRatio - Fill amount, 0.0 (empty) to 1.0 (full). Clamped to this range.
   * @param options - Colors, border, layer, and screenSpace options.
   */
  export declare function drawBar(x: number, y: number, w: number, h: number, fillRatio: number, options?: BarOptions): void;
  /**
   * Draw a text label with an automatic background panel.
   * Panel size is computed from the text measurement + padding.
   * No-op in headless mode.
   *
   * @param text - The text string to display.
   * @param x - X position (screen pixels if screenSpace, world units otherwise).
   * @param y - Y position (screen pixels if screenSpace, world units otherwise).
   * @param options - Text color, background, border, padding, scale, layer, and screenSpace.
   */
  export declare function drawLabel(text: string, x: number, y: number, options?: LabelOptions): void;

}

// ============================================================================
// Module: @arcane/runtime/state (State)
// ============================================================================

declare module "@arcane/runtime/state" {
  /**
   * Branded string type for entity identification.
   * Uses TypeScript's structural branding to prevent plain strings from being
   * used where an EntityId is expected. Create via {@link entityId} or {@link generateId}.
   */
  export type EntityId = string & {
      readonly __entityId: true;
  };
  /**
   * Create an EntityId from a known string value.
   * Use this for deterministic IDs (e.g., "player", "enemy_1").
   * For random unique IDs, use {@link generateId} instead.
   *
   * @param id - The string to brand as an EntityId.
   * @returns A branded EntityId.
   */
  export declare function entityId(id: string): EntityId;
  /**
   * Generate a unique EntityId using crypto.randomUUID().
   * Each call produces a new UUID v4 string branded as EntityId.
   * Use {@link entityId} instead when you need a deterministic, human-readable ID.
   *
   * @returns A new unique EntityId.
   */
  export declare function generateId(): EntityId;
  /**
   * Immutable 2D vector. Used for positions, velocities, and directions.
   *
   * - `x` - Horizontal component (positive = right).
   * - `y` - Vertical component (positive = down in screen coordinates).
   */
  export type Vec2 = Readonly<{
      x: number;
      y: number;
  }>;
  type Primitive = string | number | boolean | null | undefined;
  /**
   * Deep recursive readonly utility type. Enforces immutability at the type level
   * by recursively wrapping all properties, arrays, Maps, and Sets as readonly.
   * Applied to state returned by {@link GameStore.getState} to prevent accidental mutation.
   */
  export type DeepReadonly<T> = T extends Primitive ? T : T extends (infer U)[] ? ReadonlyArray<DeepReadonly<U>> : T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> : T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> : T extends object ? {
      readonly [K in keyof T]: DeepReadonly<T[K]>;
  } : T;
  export {};

  /**
   * Structured error type for the Arcane engine.
   * Provides machine-readable codes, human-readable messages, and actionable context.
   * Follows the error design in docs/api-design.md.
   *
   * - `code` - Machine-readable error code (e.g., "TRANSACTION_FAILED", "INVALID_PATH").
   * - `message` - Human-readable error description.
   * - `context.action` - What operation was being attempted.
   * - `context.reason` - Why the operation failed.
   * - `context.state` - Optional snapshot of relevant state at failure time.
   * - `context.suggestion` - Optional suggestion for how to fix the error.
   */
  export type ArcaneError = Readonly<{
      code: string;
      message: string;
      context: Readonly<{
          action: string;
          reason: string;
          state?: Readonly<Record<string, unknown>>;
          suggestion?: string;
      }>;
  }>;
  /**
   * Create an ArcaneError with structured context.
   * Pure function — returns a new frozen error object.
   *
   * @param code - Machine-readable error code (e.g., "TRANSACTION_FAILED").
   * @param message - Human-readable error description.
   * @param context - Structured context with action, reason, and optional suggestion.
   * @returns A new ArcaneError object.
   */
  export declare function createError(code: string, message: string, context: ArcaneError["context"]): ArcaneError;

  /**
   * Callback invoked when an observed path changes.
   * Receives the new value, old value, and context about the change.
   *
   * @param newValue - The value after the change.
   * @param oldValue - The value before the change.
   * @param context - Metadata about the change (path, full diff).
   */
  export type ObserverCallback<T = unknown> = (newValue: T, oldValue: T, context: ObserverContext) => void;
  /**
   * Context provided to observer callbacks when a change is detected.
   *
   * - `path` - The specific path that changed (e.g., "player.hp").
   * - `diff` - The full Diff from the transaction that triggered this notification.
   */
  export type ObserverContext = Readonly<{
      path: string;
      diff: Diff;
  }>;
  /**
   * Function returned by observe() to unsubscribe from further notifications.
   * Call it to stop receiving callbacks for that subscription.
   */
  export type Unsubscribe = () => void;
  /**
   * Pattern for matching state paths. Supports `*` wildcards at any segment position.
   * Examples: "player.hp", "enemies.*.hp", "*.position".
   * Each `*` matches exactly one path segment.
   */
  export type PathPattern = string;
  /**
   * Observer registry that manages subscriptions and dispatches change notifications.
   * Created via {@link createObserverRegistry}. Used internally by GameStore.
   *
   * - `observe` - Subscribe to changes matching a path pattern. Returns an Unsubscribe function.
   * - `notify` - Dispatch notifications to all matching observers for a given diff.
   * - `clear` - Remove all observers (useful for cleanup/reset).
   */
  export type ObserverRegistry<S> = Readonly<{
      /** Subscribe to changes at a path pattern. Returns an unsubscribe function. */
      observe: <T = unknown>(pattern: PathPattern, callback: ObserverCallback<T>) => Unsubscribe;
      /** Notify all matching observers after a transaction commits. */
      notify: (oldState: S, newState: S, diff: Diff) => void;
      /** Remove all observers. */
      clear: () => void;
  }>;
  /**
   * Create a new observer registry for tracking state change subscriptions.
   * Used internally by {@link createStore} to power the store's observe() method.
   *
   * @returns A new ObserverRegistry with observe, notify, and clear methods.
   */
  export declare function createObserverRegistry<S>(): ObserverRegistry<S>;

  /**
   * Opaque PRNG state using the xoshiro128** algorithm.
   * Serializable and deterministic — the same seed always produces the same sequence.
   * All PRNG functions are pure: they take a PRNGState and return a new PRNGState.
   * Create via {@link seed}.
   *
   * - `__brand` - Type brand, always "PRNGState".
   * - `seed` - The original seed value used to initialize this state.
   * - `s0`, `s1`, `s2`, `s3` - Internal 32-bit state words. Do not modify directly.
   */
  export type PRNGState = Readonly<{
      readonly __brand: "PRNGState";
      seed: number;
      s0: number;
      s1: number;
      s2: number;
      s3: number;
  }>;
  /**
   * Create a seeded PRNG state. The same seed always produces the same random sequence.
   * Uses splitmix32 to initialize the xoshiro128** internal state.
   *
   * @param n - The seed value. Truncated to a 32-bit integer.
   * @returns A new PRNGState ready for use with {@link rollDice}, {@link randomInt}, etc.
   *
   * @example
   * const rng = seed(42);
   * const [value, rng2] = randomInt(rng, 1, 6);
   * // value is deterministic for seed 42
   */
  export declare function seed(n: number): PRNGState;
  /**
   * Branded string type for dice notation (e.g., "2d6+3", "1d20", "3d8-1").
   * Format: `NdS` or `NdS+M` / `NdS-M` where N=count, S=sides, M=modifier.
   */
  export type DiceNotation = string & {
      readonly __dice: true;
  };
  /**
   * Parsed dice specification. Created by {@link parseDice} or passed directly to {@link rollDice}.
   *
   * - `count` - Number of dice to roll (the N in NdS). Must be >= 1.
   * - `sides` - Number of sides per die (the S in NdS). Must be >= 1.
   * - `modifier` - Added to the total after all dice are summed. Can be negative.
   */
  export type DiceSpec = Readonly<{
      count: number;
      sides: number;
      modifier: number;
  }>;
  /**
   * Parse a dice notation string into a DiceSpec.
   * Pure function. Throws if the notation is invalid.
   *
   * @param notation - Dice notation string (e.g., "2d6+3", "1d20", "3d8-1").
   * @returns Parsed DiceSpec with count, sides, and modifier.
   * @throws Error if notation doesn't match the `NdS` or `NdS+M` / `NdS-M` format.
   */
  export declare function parseDice(notation: string): DiceSpec;
  /**
   * Roll dice deterministically using the PRNG. Pure function — returns the result
   * and a new PRNGState without modifying the original.
   *
   * Accepts either a DiceSpec object or a dice notation string (e.g., "2d6+3").
   * Each die is rolled individually using {@link randomInt}, then summed with the modifier.
   *
   * @param rng - Current PRNG state.
   * @param spec - A DiceSpec or dice notation string (e.g., "1d20", "2d6+3").
   * @returns A tuple of [total roll result, new PRNGState].
   *
   * @example
   * const rng = seed(42);
   * const [damage, rng2] = rollDice(rng, "2d6+3");
   * const [toHit, rng3] = rollDice(rng2, "1d20");
   */
  export declare function rollDice(rng: PRNGState, spec: DiceSpec | string): [number, PRNGState];
  /**
   * Generate a random integer in the range [min, max] (inclusive on both ends).
   * Pure function — returns the value and a new PRNGState.
   *
   * @param rng - Current PRNG state.
   * @param min - Minimum value (inclusive).
   * @param max - Maximum value (inclusive). Must be >= min.
   * @returns A tuple of [random integer, new PRNGState].
   */
  export declare function randomInt(rng: PRNGState, min: number, max: number): [number, PRNGState];
  /**
   * Generate a random float in the range [0, 1) (inclusive of 0, exclusive of 1).
   * Pure function — returns the value and a new PRNGState.
   *
   * @param rng - Current PRNG state.
   * @returns A tuple of [random float in [0,1), new PRNGState].
   */
  export declare function randomFloat(rng: PRNGState): [number, PRNGState];
  /**
   * Pick one random element from an array. Pure function — does not modify the array.
   *
   * @param rng - Current PRNG state.
   * @param items - Non-empty array to pick from.
   * @returns A tuple of [randomly selected item, new PRNGState].
   */
  export declare function randomPick<T>(rng: PRNGState, items: readonly T[]): [T, PRNGState];
  /**
   * Shuffle an array using Fisher-Yates algorithm. Pure function — returns a new
   * shuffled array without modifying the original.
   *
   * @param rng - Current PRNG state.
   * @param items - Array to shuffle.
   * @returns A tuple of [new shuffled array, new PRNGState].
   */
  export declare function shuffle<T>(rng: PRNGState, items: readonly T[]): [readonly T[], PRNGState];

  /**
   * A predicate function for filtering state queries.
   * Returns true if the item matches the filter criteria.
   * Build predicates using combinators: {@link lt}, {@link gt}, {@link eq}, {@link oneOf}, etc.
   */
  export type Predicate<T> = (item: T) => boolean;
  /**
   * Query state at a dot-separated path, with optional filtering.
   * Pure function — does not modify the state.
   *
   * If the value at the path is an array, returns matching elements.
   * If the value is a single value, wraps it in an array.
   * If the path doesn't exist, returns an empty array.
   *
   * The filter can be a predicate function, or an object where each key-value pair
   * must match (values can be predicates or literal values).
   * Supports `*` wildcards in paths to query across array elements.
   *
   * @param state - The state to query.
   * @param path - Dot-separated path (e.g., "enemies", "player.inventory"). Use `*` for wildcards.
   * @param filter - Optional predicate function or property-matching object.
   * @returns Readonly array of matching results.
   *
   * @example
   * const alive = query(state, "enemies", { alive: true });
   * const nearby = query(state, "enemies", within({ x: 5, y: 5 }, 3));
   * const names = query(state, "enemies.*.name");
   */
  export declare function query<S, R = unknown>(state: S, path: string, filter?: Predicate<R> | Record<string, unknown>): readonly R[];
  /**
   * Get a single value at a dot-separated path. Pure function.
   * Returns undefined if the path doesn't exist.
   *
   * @param state - The state to read from.
   * @param path - Dot-separated path (e.g., "player.hp", "config.difficulty").
   * @returns The value at the path, or undefined if not found.
   *
   * @example
   * const hp = get(state, "player.hp"); // number | undefined
   */
  export declare function get<S, R = unknown>(state: S, path: string): R | undefined;
  /**
   * Check if a value exists at a path, optionally testing it with a predicate.
   * Pure function. Returns false if the path doesn't exist or if the predicate fails.
   *
   * @param state - The state to check.
   * @param path - Dot-separated path (e.g., "player.weapon").
   * @param predicate - Optional predicate to test the value against.
   * @returns True if the value exists (and passes the predicate, if provided).
   */
  export declare function has<S>(state: S, path: string, predicate?: Predicate<unknown>): boolean;
  /**
   * Create a predicate that tests if a number is less than the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item < value.
   */
  export declare function lt(value: number): Predicate<number>;
  /**
   * Create a predicate that tests if a number is greater than the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item > value.
   */
  export declare function gt(value: number): Predicate<number>;
  /**
   * Create a predicate that tests if a number is less than or equal to the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item <= value.
   */
  export declare function lte(value: number): Predicate<number>;
  /**
   * Create a predicate that tests if a number is greater than or equal to the given value.
   *
   * @param value - The threshold to compare against.
   * @returns A predicate returning true if item >= value.
   */
  export declare function gte(value: number): Predicate<number>;
  /**
   * Create a predicate that tests for strict equality (===) with the given value.
   *
   * @param value - The value to compare against.
   * @returns A predicate returning true if item === value.
   */
  export declare function eq<T>(value: T): Predicate<T>;
  /**
   * Create a predicate that tests for strict inequality (!==) with the given value.
   *
   * @param value - The value to compare against.
   * @returns A predicate returning true if item !== value.
   */
  export declare function neq<T>(value: T): Predicate<T>;
  /**
   * Create a predicate that tests if a value is one of the given options (using Array.includes).
   *
   * @param values - The allowed values to match against.
   * @returns A predicate returning true if item is in the values list.
   */
  export declare function oneOf<T>(...values: T[]): Predicate<T>;
  /**
   * Create a predicate that tests if a Vec2 position is within a circular radius
   * of a center point. Uses squared distance for efficiency (no sqrt).
   *
   * @param center - Center point of the circle.
   * @param radius - Radius of the circle. Must be >= 0.
   * @returns A predicate returning true if the position is within the circle (inclusive).
   */
  export declare function within(center: Vec2, radius: number): Predicate<Vec2>;
  /**
   * Combine multiple predicates with logical AND. All predicates must pass.
   *
   * @param predicates - Predicates to combine.
   * @returns A predicate returning true only if every predicate passes.
   */
  export declare function allOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  /**
   * Combine multiple predicates with logical OR. At least one predicate must pass.
   *
   * @param predicates - Predicates to combine.
   * @returns A predicate returning true if any predicate passes.
   */
  export declare function anyOf<T>(...predicates: Predicate<T>[]): Predicate<T>;
  /**
   * Negate a predicate. Returns the logical NOT of the original predicate.
   *
   * @param predicate - The predicate to negate.
   * @returns A predicate returning true when the original returns false, and vice versa.
   */
  export declare function not<T>(predicate: Predicate<T>): Predicate<T>;

  /**
   * The game store: central coordination point for state management.
   * Ties together state, transactions, queries, and observers.
   * Created via {@link createStore}.
   *
   * - `getState()` - Returns the current state as a deep readonly snapshot.
   * - `dispatch(mutations)` - Apply mutations atomically, update state, notify observers.
   * - `observe(pattern, callback)` - Subscribe to state changes matching a path pattern.
   * - `query(path, filter?)` - Query arrays or values in current state.
   * - `get(path)` - Get a single value from current state.
   * - `has(path, predicate?)` - Check existence in current state.
   * - `replaceState(state)` - Replace the entire state (for deserialization / time travel).
   * - `getHistory()` - Get the transaction history for recording/replay.
   */
  export type GameStore<S> = Readonly<{
      /** Returns the current state as a deep readonly snapshot. */
      getState: () => DeepReadonly<S>;
      /** Apply mutations atomically. Updates state and notifies observers on success. */
      dispatch: (mutations: readonly Mutation<S>[]) => TransactionResult<S>;
      /** Subscribe to state changes matching a path pattern. Returns an unsubscribe function. */
      observe: <T = unknown>(pattern: PathPattern, callback: ObserverCallback<T>) => Unsubscribe;
      /** Query arrays or values at a path, with optional filtering. */
      query: <R = unknown>(path: string, filter?: Predicate<R> | Record<string, unknown>) => readonly R[];
      /** Get a single value from current state by path. Returns undefined if not found. */
      get: <R = unknown>(path: string) => R | undefined;
      /** Check if a value exists at a path, optionally testing with a predicate. */
      has: (path: string, predicate?: Predicate<unknown>) => boolean;
      /** Replace the entire state (for deserialization / time travel). Does not trigger observers. */
      replaceState: (state: S) => void;
      /** Get the transaction history as an ordered list of TransactionRecords. */
      getHistory: () => readonly TransactionRecord<S>[];
  }>;
  /**
   * A recorded transaction for replay and debugging.
   * Stored in the store's history, accessible via getHistory().
   *
   * - `timestamp` - When the transaction was applied (Date.now() milliseconds).
   * - `mutations` - The mutations that were applied in this transaction.
   * - `diff` - The computed diff of changes from this transaction.
   */
  export type TransactionRecord<S> = Readonly<{
      timestamp: number;
      mutations: readonly Mutation<S>[];
      diff: Diff;
  }>;
  /**
   * Create a new game store with initial state, transactions, and observers.
   * The store is the central coordination point for game state management.
   *
   * @param initialState - The initial state object. Becomes the starting state for all queries.
   * @returns A GameStore with getState, dispatch, observe, query, get, has, replaceState, and getHistory.
   *
   * @example
   * const store = createStore({ player: { x: 0, y: 0, hp: 100 }, enemies: [] });
   * store.dispatch([set("player.x", 10)]);
   * console.log(store.getState().player.x); // 10
   */
  export declare function createStore<S>(initialState: S): GameStore<S>;

  /**
   * A mutation: a named, describable, applicable state change.
   * Created by mutation primitives ({@link set}, {@link update}, {@link push}, etc.)
   * and applied atomically via {@link transaction}.
   *
   * - `type` - Mutation kind: "set", "update", "push", or "remove".
   * - `path` - Dot-separated path to the target value (e.g., "player.hp").
   * - `description` - Human-readable description of what this mutation does.
   * - `apply` - Pure function that takes state and returns new state with the mutation applied.
   */
  export type Mutation<S> = Readonly<{
      type: string;
      path: string;
      description: string;
      apply: (state: S) => S;
  }>;
  /**
   * Create a mutation that sets a value at a dot-separated path.
   * Pure function — returns a Mutation object, does not modify state directly.
   * Apply via {@link transaction} or {@link GameStore.dispatch}.
   *
   * @param path - Dot-separated path (e.g., "player.hp", "enemies.0.alive").
   * @param value - The value to set at the path.
   * @returns A Mutation that can be applied in a transaction.
   *
   * @example
   * const result = transaction(state, [
   *   set("player.hp", 80),
   *   set("player.position.x", 10),
   * ]);
   */
  export declare function set<S>(path: string, value: unknown): Mutation<S>;
  /**
   * Create a mutation that updates a value at a path using a transform function.
   * The function receives the current value and returns the new value.
   * Pure function — returns a Mutation object, does not modify state directly.
   *
   * @param path - Dot-separated path to the value (e.g., "player.hp").
   * @param fn - Transform function: receives the current value, returns the new value.
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function update<S>(path: string, fn: (current: unknown) => unknown): Mutation<S>;
  /**
   * Create a mutation that pushes an item onto an array at a path.
   * Throws during application if the value at the path is not an array.
   *
   * @param path - Dot-separated path to the array (e.g., "enemies", "player.inventory").
   * @param item - The item to append to the array.
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function push<S>(path: string, item: unknown): Mutation<S>;
  /**
   * Create a mutation that removes items from an array at a path where the predicate returns true.
   * Throws during application if the value at the path is not an array.
   *
   * @param path - Dot-separated path to the array.
   * @param predicate - Function that returns true for items to remove.
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function removeWhere<S>(path: string, predicate: (item: unknown) => boolean): Mutation<S>;
  /**
   * Create a mutation that removes a key from an object.
   * The last segment of the path is the key to remove; the preceding segments
   * identify the parent object. Throws during application if the parent is not an object.
   *
   * @param path - Dot-separated path where the last segment is the key to remove
   *               (e.g., "player.buffs.shield" removes "shield" from player.buffs).
   * @returns A Mutation that can be applied in a transaction.
   */
  export declare function removeKey<S>(path: string): Mutation<S>;
  /**
   * A single change entry in a diff, representing one value that changed.
   *
   * - `path` - Dot-separated path to the changed value (e.g., "player.hp").
   * - `from` - The previous value (undefined if the key was added).
   * - `to` - The new value (undefined if the key was removed).
   */
  export type DiffEntry = Readonly<{
      path: string;
      from: unknown;
      to: unknown;
  }>;
  /**
   * All changes from a transaction, as a list of individual DiffEntry items.
   * Empty entries array means no changes occurred.
   *
   * - `entries` - Ordered list of individual value changes.
   */
  export type Diff = Readonly<{
      entries: readonly DiffEntry[];
  }>;
  /**
   * An effect triggered by a state change, for observer/event routing.
   * Reserved for future use — currently transactions return an empty effects array.
   *
   * - `type` - Effect type identifier (e.g., "damage", "levelUp").
   * - `source` - Identifier of the mutation or system that produced this effect.
   * - `data` - Arbitrary payload data for the effect.
   */
  export type Effect = Readonly<{
      type: string;
      source: string;
      data: Readonly<Record<string, unknown>>;
  }>;
  /**
   * Result of executing a transaction. Check `valid` before using the new state.
   *
   * - `state` - The resulting state. Equals the original state if the transaction failed.
   * - `diff` - Changes that occurred. Empty if the transaction failed.
   * - `effects` - Side effects produced (reserved for future use).
   * - `valid` - Whether the transaction succeeded. If false, state is unchanged.
   * - `error` - Structured error if `valid` is false. Undefined on success.
   */
  export type TransactionResult<S> = Readonly<{
      state: S;
      diff: Diff;
      effects: readonly Effect[];
      valid: boolean;
      error?: ArcaneError;
  }>;
  /**
   * Apply mutations atomically to state. All succeed or all roll back.
   * Pure function — returns a new state without modifying the original.
   * If any mutation throws, the entire transaction fails and the original state is returned.
   *
   * @param state - The current state to apply mutations to.
   * @param mutations - Ordered list of mutations to apply. Created via {@link set}, {@link update}, etc.
   * @returns A TransactionResult with the new state, diff, and validity flag.
   *
   * @example
   * const result = transaction(state, [
   *   set("player.hp", 80),
   *   update("player.xp", (xp: any) => xp + 50),
   * ]);
   * if (result.valid) {
   *   // Use result.state
   * }
   */
  export declare function transaction<S>(state: S, mutations: readonly Mutation<S>[]): TransactionResult<S>;
  /**
   * Compute the diff between two state trees by recursively comparing all values.
   * Pure function — does not modify either state tree.
   * Used internally by {@link transaction}, but can also be called directly.
   *
   * @param before - The state before changes.
   * @param after - The state after changes.
   * @returns A Diff containing all individual value changes.
   */
  export declare function computeDiff<S>(before: S, after: S): Diff;

}

// ============================================================================
// Module: @arcane/runtime/physics (Physics)
// ============================================================================

declare module "@arcane/runtime/physics" {
  /** Opaque body identifier returned by createBody(). */
  export type BodyId = number;
  /** Opaque constraint identifier returned by joint creation functions. */
  export type ConstraintId = number;
  /** Body simulation type. */
  export type BodyType = "static" | "dynamic" | "kinematic";
  /** Shape definition (discriminated union). */
  export type ShapeDef = {
      type: "circle";
      radius: number;
  } | {
      type: "aabb";
      halfW: number;
      halfH: number;
  } | {
      type: "polygon";
      vertices: [number, number][];
  };
  /** Physical material properties. */
  export type MaterialDef = {
      restitution?: number;
      friction?: number;
  };
  /** Body creation definition. */
  export type BodyDef = {
      type: BodyType;
      shape: ShapeDef;
      x: number;
      y: number;
      mass?: number;
      material?: MaterialDef;
      layer?: number;
      mask?: number;
  };
  /** Readonly body state snapshot. */
  export type BodyState = {
      readonly x: number;
      readonly y: number;
      readonly angle: number;
      readonly vx: number;
      readonly vy: number;
      readonly angularVelocity: number;
      readonly sleeping: boolean;
  };
  /** Contact information from collision detection. */
  export type Contact = {
      readonly bodyA: BodyId;
      readonly bodyB: BodyId;
      readonly normalX: number;
      readonly normalY: number;
      readonly penetration: number;
      readonly contactX: number;
      readonly contactY: number;
  };
  /** Raycast hit result. */
  export type RayHit = {
      readonly bodyId: BodyId;
      readonly hitX: number;
      readonly hitY: number;
      readonly distance: number;
  };
  /** Options for createPhysicsWorld(). */
  export type PhysicsWorldOptions = {
      gravityX?: number;
      gravityY?: number;
  };

  /**
   * Axis-Aligned Bounding Box for 2D collision detection.
   * Defined by its top-left corner and dimensions.
   *
   * - `x` - Left edge position (world units).
   * - `y` - Top edge position (world units).
   * - `w` - Width. Must be >= 0.
   * - `h` - Height. Must be >= 0.
   */
  export type AABB = {
      x: number;
      y: number;
      w: number;
      h: number;
  };
  /**
   * Check if two AABBs overlap. Pure function.
   * Uses the separating axis theorem — returns true if there is no gap between
   * the boxes on either the X or Y axis.
   *
   * @param a - First bounding box.
   * @param b - Second bounding box.
   * @returns True if the boxes overlap (touching edges do not count as overlap).
   *
   * @example
   * const player = { x: 10, y: 10, w: 16, h: 16 };
   * const enemy = { x: 20, y: 10, w: 16, h: 16 };
   * if (aabbOverlap(player, enemy)) {
   *   // Handle collision
   * }
   */
  export declare function aabbOverlap(a: AABB, b: AABB): boolean;
  /**
   * Check if a circle overlaps an AABB. Pure function.
   * Finds the closest point on the AABB to the circle center
   * and checks if it's within the radius.
   *
   * @param cx - Circle center X position.
   * @param cy - Circle center Y position.
   * @param radius - Circle radius. Must be >= 0.
   * @param box - The AABB to test against.
   * @returns True if the circle and AABB overlap (inclusive of touching).
   */
  export declare function circleAABBOverlap(cx: number, cy: number, radius: number, box: AABB): boolean;
  /**
   * Get the collision resolution normal for a circle vs AABB collision.
   * Returns a unit normal vector pointing from the AABB toward the circle center,
   * or null if there is no collision.
   *
   * When the circle center is inside the AABB, pushes out along the shortest axis
   * relative to the box center.
   *
   * @param cx - Circle center X position.
   * @param cy - Circle center Y position.
   * @param radius - Circle radius. Must be >= 0.
   * @param box - The AABB to resolve against.
   * @returns Object with `nx` and `ny` (unit normal), or null if no collision.
   *          nx and ny are in the range [-1, 1] and form a unit vector.
   */
  export declare function circleAABBResolve(cx: number, cy: number, radius: number, box: AABB): {
      nx: number;
      ny: number;
  } | null;

  /**
   * Create a rigid body in the physics world.
   * Returns a BodyId for future reference. Returns 0 in headless mode.
   */
  export declare function createBody(def: BodyDef): BodyId;
  /**
   * Remove a body from the physics world.
   * No-op in headless mode.
   */
  export declare function removeBody(id: BodyId): void;
  /**
   * Get the current state of a body (position, angle, velocity).
   * Returns a default state (all zeros) if the body doesn't exist or ops unavailable.
   */
  export declare function getBodyState(id: BodyId): BodyState;
  /**
   * Set a body's linear velocity. Wakes the body if sleeping.
   * No-op in headless mode.
   */
  export declare function setBodyVelocity(id: BodyId, vx: number, vy: number): void;
  /**
   * Set a body's angular velocity. Wakes the body if sleeping.
   * No-op in headless mode.
   */
  export declare function setBodyAngularVelocity(id: BodyId, av: number): void;
  /**
   * Apply a force to a body (accumulated over the frame). Wakes the body.
   * No-op in headless mode.
   */
  export declare function applyForce(id: BodyId, fx: number, fy: number): void;
  /**
   * Apply an instant impulse to a body (directly modifies velocity). Wakes the body.
   * No-op in headless mode.
   */
  export declare function applyImpulse(id: BodyId, ix: number, iy: number): void;
  /**
   * Teleport a body to a new position. Wakes the body.
   * No-op in headless mode.
   */
  export declare function setBodyPosition(id: BodyId, x: number, y: number): void;
  /**
   * Set collision filtering layers for a body.
   * Two bodies collide if (a.layer & b.mask) != 0 AND (b.layer & a.mask) != 0.
   * No-op in headless mode.
   */
  export declare function setCollisionLayers(id: BodyId, layer: number, mask: number): void;
  /**
   * Set a kinematic body's velocity for physics-driven movement.
   * Alias for setBodyVelocity, semantically for kinematic bodies.
   * No-op in headless mode.
   */
  export declare function setKinematicVelocity(id: BodyId, vx: number, vy: number): void;

  /**
   * Create a distance joint that maintains a fixed distance between two bodies.
   * Returns a ConstraintId for future reference. Returns 0 in headless mode.
   */
  export declare function createDistanceJoint(bodyA: BodyId, bodyB: BodyId, distance: number): ConstraintId;
  /**
   * Create a revolute (hinge) joint at a pivot point between two bodies.
   * Returns a ConstraintId for future reference. Returns 0 in headless mode.
   */
  export declare function createRevoluteJoint(bodyA: BodyId, bodyB: BodyId, pivotX: number, pivotY: number): ConstraintId;
  /**
   * Remove a constraint from the physics world.
   * No-op in headless mode.
   */
  export declare function removeConstraint(id: ConstraintId): void;

  /**
   * Query all bodies overlapping an axis-aligned bounding box.
   * Returns an empty array in headless mode.
   */
  export declare function queryAABB(minX: number, minY: number, maxX: number, maxY: number): BodyId[];
  /**
   * Cast a ray and return the first hit, or null if nothing hit.
   * Direction does not need to be normalized.
   * Returns null in headless mode.
   *
   * @param originX - Ray origin X.
   * @param originY - Ray origin Y.
   * @param dirX - Ray direction X (unnormalized).
   * @param dirY - Ray direction Y (unnormalized).
   * @param maxDistance - Maximum ray distance. Default: 1000.
   */
  export declare function raycast(originX: number, originY: number, dirX: number, dirY: number, maxDistance?: number): RayHit | null;
  /**
   * Get all contacts from the last physics step.
   * Returns an empty array in headless mode.
   */
  export declare function getContacts(): Contact[];

  /**
   * Create a physics world with gravity.
   * Call once before creating bodies. Default gravity is (0, 9.81) -- downward.
   * No-op in headless mode.
   */
  export declare function createPhysicsWorld(options?: PhysicsWorldOptions): void;
  /**
   * Advance the physics simulation by dt seconds.
   * Uses fixed timestep internally (1/60s) with accumulator.
   * No-op in headless mode.
   */
  export declare function stepPhysics(dt: number): void;
  /**
   * Destroy the physics world, freeing all bodies and constraints.
   * No-op in headless mode.
   */
  export declare function destroyPhysicsWorld(): void;

}

// ============================================================================
// Module: @arcane/runtime/tweening (Tweening)
// ============================================================================

declare module "@arcane/runtime/tweening" {
  /**
   * Tweening system type definitions.
   *
   * Tweens smoothly interpolate numeric properties on any object over time.
   * Used for animations, UI transitions, camera effects, and game juice.
   */
  /**
   * A function that maps linear progress to eased progress.
   * See `runtime/tweening/easing.ts` for 30 built-in easing functions.
   *
   * @param t - Linear progress, clamped to 0..1 by the tween system.
   * @returns Eased value. Usually 0..1, but may overshoot for back/elastic easings.
   */
  export type EasingFunction = (t: number) => number;
  /**
   * Callback invoked at tween lifecycle events (start, complete, repeat).
   */
  export type TweenCallback = () => void;
  /**
   * Callback invoked every frame while a tween is active.
   * @param progress - Linear progress from 0 to 1 (before easing).
   */
  export type TweenUpdateCallback = (progress: number) => void;
  /**
   * Options for creating a tween via {@link tween}.
   *
   * All fields are optional; sensible defaults are applied (linear easing, no delay, no repeat).
   */
  export interface TweenOptions {
      /** Easing function applied to progress. Default: linear (no easing). */
      easing?: EasingFunction;
      /** Delay in seconds before the tween starts animating. Default: 0. Must be >= 0. */
      delay?: number;
      /** Number of additional times to repeat after the first play. 0 = play once, -1 = infinite. Default: 0. */
      repeat?: number;
      /** When true, alternates direction on each repeat (ping-pong). Default: false. */
      yoyo?: boolean;
      /** Called once when the tween transitions from pending to active (after delay elapses). */
      onStart?: TweenCallback;
      /** Called every frame while the tween is active. Receives linear progress (0..1). */
      onUpdate?: TweenUpdateCallback;
      /** Called once when the tween finishes all iterations. Not called if stopped manually. */
      onComplete?: TweenCallback;
      /** Called each time the tween starts a new repeat iteration. */
      onRepeat?: TweenCallback;
  }
  /**
   * A map of property names to their target numeric values.
   * Each key must correspond to a numeric property on the tween target object.
   */
  export type TweenProps = Record<string, number>;
  /**
   * Lifecycle state of a tween instance.
   *
   * Transitions: pending -> active -> completed (normal flow),
   * active <-> paused (via pauseTween/resumeTween),
   * any -> stopped (via stopTween).
   */
  export type TweenState = "pending" | "active" | "paused" | "completed" | "stopped";
  /**
   * Tween state constants for comparing against {@link Tween.state}.
   *
   * @example
   * ```ts
   * if (myTween.state === TweenState.ACTIVE) { ... }
   * ```
   */
  export declare const TweenState: {
      /** Waiting for delay to elapse before starting. */
      PENDING: "pending";
      /** Currently animating properties each frame. */
      ACTIVE: "active";
      /** Temporarily paused; resumes from current progress via resumeTween(). */
      PAUSED: "paused";
      /** All iterations complete. The tween has been removed from the update list. */
      COMPLETED: "completed";
      /** Manually stopped via stopTween(). The tween has been removed from the update list. */
      STOPPED: "stopped";
  };
  /**
   * A tween instance returned by {@link tween}.
   *
   * Inspect `state` to check lifecycle. Use `stopTween()`, `pauseTween()`,
   * `resumeTween()`, or `reverseTween()` to control playback.
   */
  export interface Tween {
      /** Unique identifier, auto-generated as "tween_0", "tween_1", etc. */
      id: string;
      /** Current lifecycle state. See {@link TweenState}. */
      state: TweenState;
      /** The object whose properties are being interpolated. */
      target: any;
      /** Target values for each property being tweened. */
      props: TweenProps;
      /** Start values captured when the tween becomes active (after delay). */
      startValues: TweenProps;
      /** Total animation duration in seconds (excluding delay). Must be >= 0. */
      duration: number;
      /** Resolved options with defaults applied. */
      options: {
          /** Easing function applied to progress. */
          easing: EasingFunction;
          /** Delay in seconds before animation starts. */
          delay: number;
          /** Number of additional repeat iterations. -1 = infinite. */
          repeat: number;
          /** Whether direction alternates on repeat. */
          yoyo: boolean;
          /** Called when tween transitions to active. */
          onStart?: TweenCallback;
          /** Called every frame with linear progress (0..1). */
          onUpdate?: TweenUpdateCallback;
          /** Called when all iterations complete. */
          onComplete?: TweenCallback;
          /** Called at the start of each repeat iteration. */
          onRepeat?: TweenCallback;
      };
      /** Seconds elapsed since the tween became active (resets on repeat). */
      elapsed: number;
      /** Seconds elapsed during the delay phase. */
      delayElapsed: number;
      /** Zero-based index of the current repeat iteration. */
      currentRepeat: number;
      /** True when playing in reverse direction (yoyo mode). */
      isReversed: boolean;
  }

  /**
   * Tween chaining utilities for composing multiple tweens.
   *
   * - {@link sequence} — run tweens one after another.
   * - {@link parallel} — run tweens simultaneously.
   * - {@link stagger} — run tweens with a staggered delay between each.
   */
  /**
   * Configuration for a single tween within a {@link sequence}, {@link parallel}, or {@link stagger} chain.
   */
  export interface TweenConfig {
      /** The object whose properties will be interpolated. */
      target: any;
      /** Map of property names to target (end) values. */
      props: TweenProps;
      /** Animation duration in seconds. */
      duration: number;
      /** Optional tween options (easing, callbacks, etc.). */
      options?: TweenOptions;
  }
  /**
   * Run tweens one after another in sequence. Each tween starts when the
   * previous one completes. Wraps `onComplete` callbacks to chain automatically.
   *
   * Note: Only the first tween is created immediately. Subsequent tweens are
   * created lazily as each predecessor completes.
   *
   * @param tweens - Array of tween configurations to run in order.
   * @returns Array of created tweens (initially contains only the first; more are added as the sequence progresses).
   *
   * @example
   * ```ts
   * sequence([
   *   { target: sprite, props: { x: 100 }, duration: 0.5 },
   *   { target: sprite, props: { y: 200 }, duration: 0.3 },
   * ]);
   * ```
   */
  export declare function sequence(tweens: TweenConfig[]): Tween[];
  /**
   * Run all tweens simultaneously. All tweens start immediately.
   *
   * @param tweens - Array of tween configurations to run in parallel.
   * @returns Array of all created tween instances.
   */
  export declare function parallel(tweens: TweenConfig[]): Tween[];
  /**
   * Run tweens with a staggered delay between each start.
   * The i-th tween gets an additional delay of `i * staggerDelay` seconds
   * (added to any delay already specified in its options).
   *
   * @param tweens - Array of tween configurations to stagger.
   * @param staggerDelay - Delay in seconds between each successive tween start. Must be >= 0.
   * @returns Array of all created tween instances.
   */
  export declare function stagger(tweens: TweenConfig[], staggerDelay: number): Tween[];

  /**
   * 30 easing functions for tweens, organized into 10 families.
   *
   * All functions take `t` (0 to 1) and return an eased value.
   * Most return 0..1, but back and elastic easings may overshoot.
   *
   * Families: linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce.
   * Each family (except linear) has easeIn (slow start), easeOut (slow end),
   * and easeInOut (slow start + end) variants.
   *
   * Based on https://easings.net/ and Robert Penner's easing equations.
   *
   * @example
   * ```ts
   * import { easeOutQuad } from "./easing.ts";
   * tween(sprite, { x: 100 }, 0.5, { easing: easeOutQuad });
   * ```
   */
  /** No easing: constant speed from start to end. */
  export declare const linear: EasingFunction;
  /** Quadratic ease-in: slow start, accelerating. t^2 curve. */
  export declare const easeInQuad: EasingFunction;
  /** Quadratic ease-out: fast start, decelerating. Reverse t^2 curve. */
  export declare const easeOutQuad: EasingFunction;
  /** Quadratic ease-in-out: slow start and end, fast in the middle. */
  export declare const easeInOutQuad: EasingFunction;
  /** Cubic ease-in: slow start with t^3 curve. Slightly more pronounced than quad. */
  export declare const easeInCubic: EasingFunction;
  /** Cubic ease-out: fast start, decelerating with t^3 curve. */
  export declare const easeOutCubic: EasingFunction;
  /** Cubic ease-in-out: smooth acceleration then deceleration. */
  export declare const easeInOutCubic: EasingFunction;
  /** Quartic ease-in: very slow start with t^4 curve. */
  export declare const easeInQuart: EasingFunction;
  /** Quartic ease-out: fast start, strong deceleration. */
  export declare const easeOutQuart: EasingFunction;
  /** Quartic ease-in-out: pronounced slow start/end, fast middle. */
  export declare const easeInOutQuart: EasingFunction;
  /** Quintic ease-in: very slow start with t^5 curve. Most dramatic polynomial ease-in. */
  export declare const easeInQuint: EasingFunction;
  /** Quintic ease-out: fast start, very strong deceleration. */
  export declare const easeOutQuint: EasingFunction;
  /** Quintic ease-in-out: extremely slow start/end, very fast middle. */
  export declare const easeInOutQuint: EasingFunction;
  /** Sine ease-in: gentle slow start following a sine curve. */
  export declare const easeInSine: EasingFunction;
  /** Sine ease-out: gentle deceleration following a sine curve. */
  export declare const easeOutSine: EasingFunction;
  /** Sine ease-in-out: smooth sinusoidal acceleration and deceleration. */
  export declare const easeInOutSine: EasingFunction;
  /** Exponential ease-in: near-zero at start, rapidly accelerating. Returns 0 when t=0. */
  export declare const easeInExpo: EasingFunction;
  /** Exponential ease-out: fast start, asymptotically approaching 1. Returns 1 when t=1. */
  export declare const easeOutExpo: EasingFunction;
  /** Exponential ease-in-out: dramatic acceleration/deceleration with near-flat start/end. */
  export declare const easeInOutExpo: EasingFunction;
  /** Circular ease-in: quarter-circle curve, slow start. */
  export declare const easeInCirc: EasingFunction;
  /** Circular ease-out: quarter-circle curve, fast start. */
  export declare const easeOutCirc: EasingFunction;
  /** Circular ease-in-out: half-circle curve, slow at both ends. */
  export declare const easeInOutCirc: EasingFunction;
  /** Back ease-in: pulls back slightly before accelerating forward. Overshoots below 0. */
  export declare const easeInBack: EasingFunction;
  /** Back ease-out: overshoots past 1 then settles back. */
  export declare const easeOutBack: EasingFunction;
  /** Back ease-in-out: pulls back, accelerates, overshoots, then settles. */
  export declare const easeInOutBack: EasingFunction;
  /** Elastic ease-in: spring-like oscillation at the start. Overshoots below 0. */
  export declare const easeInElastic: EasingFunction;
  /** Elastic ease-out: spring-like oscillation at the end. Overshoots above 1. */
  export declare const easeOutElastic: EasingFunction;
  /** Elastic ease-in-out: spring oscillation at both start and end. */
  export declare const easeInOutElastic: EasingFunction;
  /** Bounce ease-out: simulates a ball bouncing to rest. Stays within 0..1. */
  export declare const easeOutBounce: EasingFunction;
  /** Bounce ease-in: reverse bouncing at the start. Stays within 0..1. */
  export declare const easeInBounce: EasingFunction;
  /** Bounce ease-in-out: bouncing at both start and end. */
  export declare const easeInOutBounce: EasingFunction;
  /**
   * Lookup object containing all 30 easing functions keyed by name.
   * Useful for selecting an easing function dynamically (e.g., from config or UI).
   *
   * @example
   * ```ts
   * const easingName = "easeOutQuad";
   * tween(obj, { x: 100 }, 1, { easing: Easing[easingName] });
   * ```
   */
  export declare const Easing: {
      readonly linear: EasingFunction;
      readonly easeInQuad: EasingFunction;
      readonly easeOutQuad: EasingFunction;
      readonly easeInOutQuad: EasingFunction;
      readonly easeInCubic: EasingFunction;
      readonly easeOutCubic: EasingFunction;
      readonly easeInOutCubic: EasingFunction;
      readonly easeInQuart: EasingFunction;
      readonly easeOutQuart: EasingFunction;
      readonly easeInOutQuart: EasingFunction;
      readonly easeInQuint: EasingFunction;
      readonly easeOutQuint: EasingFunction;
      readonly easeInOutQuint: EasingFunction;
      readonly easeInSine: EasingFunction;
      readonly easeOutSine: EasingFunction;
      readonly easeInOutSine: EasingFunction;
      readonly easeInExpo: EasingFunction;
      readonly easeOutExpo: EasingFunction;
      readonly easeInOutExpo: EasingFunction;
      readonly easeInCirc: EasingFunction;
      readonly easeOutCirc: EasingFunction;
      readonly easeInOutCirc: EasingFunction;
      readonly easeInBack: EasingFunction;
      readonly easeOutBack: EasingFunction;
      readonly easeInOutBack: EasingFunction;
      readonly easeInElastic: EasingFunction;
      readonly easeOutElastic: EasingFunction;
      readonly easeInOutElastic: EasingFunction;
      readonly easeInBounce: EasingFunction;
      readonly easeOutBounce: EasingFunction;
      readonly easeInOutBounce: EasingFunction;
  };

  /**
   * Tweening helper functions for common game "juice" effects.
   *
   * Camera shake and screen flash are implemented as global singletons.
   * Only one shake and one flash can be active at a time; starting a new one
   * replaces the previous.
   *
   * Usage: call the effect function, then read the offset/flash state each frame
   * when rendering.
   */
  /**
   * Start a camera shake effect that decays over time using easeOutQuad.
   *
   * Each frame, read the offset via {@link getCameraShakeOffset} and add it
   * to your camera position. The offset oscillates randomly and decays to zero.
   *
   * @param intensity - Maximum shake offset in pixels. Higher = more violent. Must be > 0.
   * @param duration - Duration of the shake in seconds. Must be > 0.
   * @param frequency - Unused currently; reserved for future use. Default: 20.
   */
  export declare function shakeCamera(intensity: number, duration: number, frequency?: number): void;
  /**
   * Get the current camera shake offset for this frame.
   * Returns {0, 0} when no shake is active.
   *
   * @returns Object with `x` and `y` pixel offsets to add to camera position.
   */
  export declare function getCameraShakeOffset(): {
      x: number;
      y: number;
  };
  /**
   * Check whether a camera shake effect is currently active.
   * @returns True if shake is in progress, false otherwise.
   */
  export declare function isCameraShaking(): boolean;
  /**
   * Stop the camera shake immediately, resetting the offset to zero.
   */
  export declare function stopCameraShake(): void;
  /**
   * Flash the screen with a colored overlay that fades out using easeOutQuad.
   *
   * Each frame, read the flash state via {@link getScreenFlash} and render
   * a full-screen rectangle with the returned color and opacity.
   *
   * @param r - Red component, 0.0 (none) to 1.0 (full).
   * @param g - Green component, 0.0 (none) to 1.0 (full).
   * @param b - Blue component, 0.0 (none) to 1.0 (full).
   * @param duration - Fade-out duration in seconds. Must be > 0.
   * @param startOpacity - Initial opacity of the flash overlay. Default: 0.8. Range: 0.0..1.0.
   */
  export declare function flashScreen(r: number, g: number, b: number, duration: number, startOpacity?: number): void;
  /**
   * Get the current screen flash color and opacity for this frame.
   *
   * @returns Flash state with `r`, `g`, `b` (0..1) and `opacity` (0..1), or `null` if no flash is active.
   */
  export declare function getScreenFlash(): {
      r: number;
      g: number;
      b: number;
      opacity: number;
  } | null;
  /**
   * Check whether a screen flash effect is currently active.
   * @returns True if flash is in progress, false otherwise.
   */
  export declare function isScreenFlashing(): boolean;
  /**
   * Stop the screen flash immediately, resetting opacity to zero.
   */
  export declare function stopScreenFlash(): void;

  /**
   * Core tweening implementation.
   *
   * Manages a global list of active tweens. Call {@link updateTweens} once per
   * frame (typically inside your `onFrame` callback) to advance all tweens.
   */
  /**
   * Linear easing function (identity). Used as the default when no easing is specified.
   * @param t - Progress from 0 to 1.
   * @returns The same value `t`, unchanged.
   */
  export declare function linear(t: number): number;
  /**
   * Create and start a tween that interpolates numeric properties on `target`
   * from their current values to the values specified in `props`.
   *
   * The tween is automatically added to the global update list. Call
   * {@link updateTweens} each frame to advance it.
   *
   * @param target - Object whose numeric properties will be interpolated.
   * @param props - Map of property names to their target (end) values.
   * @param duration - Animation duration in seconds. Use 0 for instant.
   * @param options - Optional easing, delay, repeat, yoyo, and lifecycle callbacks.
   * @returns The created {@link Tween} instance for further control.
   *
   * @example
   * ```ts
   * const sprite = { x: 0, y: 0, alpha: 1 };
   * // Move sprite to (100, 50) over 0.5 seconds with ease-out
   * const t = tween(sprite, { x: 100, y: 50 }, 0.5, {
   *   easing: easeOutQuad,
   *   onComplete: () => console.log("done!"),
   * });
   * ```
   */
  export declare function tween(target: any, props: TweenProps, duration: number, options?: TweenOptions): Tween;
  /**
   * Advance all active tweens by the given delta time.
   *
   * Call this once per frame in your game loop. Handles delay, easing,
   * property interpolation, repeat/yoyo, and lifecycle callbacks.
   * Completed and stopped tweens are automatically removed from the list.
   *
   * @param dt - Elapsed time since last frame, in seconds. Must be >= 0.
   */
  export declare function updateTweens(dt: number): void;
  /**
   * Stop a tween immediately and remove it from the update list.
   * Sets state to {@link TweenState.STOPPED}. The `onComplete` callback is NOT called.
   *
   * @param t - The tween to stop.
   */
  export declare function stopTween(t: Tween): void;
  /**
   * Pause a tween, freezing it at its current progress.
   * Only affects tweens in "active" or "pending" state. Use {@link resumeTween} to continue.
   *
   * @param t - The tween to pause.
   */
  export declare function pauseTween(t: Tween): void;
  /**
   * Resume a paused tween from where it left off.
   * Restores the tween to "active" or "pending" state depending on whether the delay had elapsed.
   * No-op if the tween is not paused.
   *
   * @param t - The tween to resume.
   */
  export declare function resumeTween(t: Tween): void;
  /**
   * Stop all active tweens and clear the update list.
   * Sets every tween's state to {@link TweenState.STOPPED}. No `onComplete` callbacks are called.
   */
  export declare function stopAllTweens(): void;
  /**
   * Reverse a tween's direction mid-flight.
   *
   * Captures the target's current property values as the new start,
   * and sets the original start values as the new target. Resets elapsed
   * time so the tween animates back from the current position.
   *
   * @param t - The tween to reverse.
   */
  export declare function reverseTween(t: Tween): void;
  /**
   * Get the number of tweens currently in the update list (active, pending, or paused).
   * Useful for debugging and testing.
   *
   * @returns Count of tweens that have not yet completed or been stopped.
   */
  export declare function getActiveTweenCount(): number;

}

// ============================================================================
// Module: @arcane/runtime/particles (Particles)
// ============================================================================

declare module "@arcane/runtime/particles" {
  /**
   * Particle system type definitions.
   *
   * Particles are small, short-lived visual elements (sparks, smoke, debris, etc.)
   * spawned by {@link Emitter}s and optionally modified by {@link Affector}s.
   */
  /**
   * A single particle managed by an emitter.
   *
   * Particles are pooled and reused. Check `alive` before rendering.
   * Color interpolates from `startColor` to `endColor` over the particle's lifetime.
   */
  export interface Particle {
      /** X position in world pixels. */
      x: number;
      /** Y position in world pixels. */
      y: number;
      /** X velocity in pixels per second. */
      vx: number;
      /** Y velocity in pixels per second. */
      vy: number;
      /** X acceleration in pixels per second squared. Reset each frame after affectors run. */
      ax: number;
      /** Y acceleration in pixels per second squared. Reset each frame after affectors run. */
      ay: number;
      /** Current rotation in radians. */
      rotation: number;
      /** Rotation speed in radians per second. */
      rotationSpeed: number;
      /** Current scale multiplier. 1.0 = original size. */
      scale: number;
      /** Scale change rate per second (positive = growing, negative = shrinking). */
      scaleSpeed: number;
      /** Current interpolated color (between startColor and endColor based on age/lifetime). */
      color: Color;
      /** Color at birth (age = 0). */
      startColor: Color;
      /** Color at death (age = lifetime). */
      endColor: Color;
      /** Total lifetime in seconds. The particle dies when age >= lifetime. */
      lifetime: number;
      /** Seconds since this particle was spawned. */
      age: number;
      /** Whether this particle is alive and should be updated/rendered. */
      alive: boolean;
      /** Texture ID used to render this particle via drawSprite(). */
      textureId: number;
  }
  /**
   * Shape of the emitter's spawn area.
   * - `"point"` — all particles spawn at the emitter's (x, y).
   * - `"line"` — particles spawn along a line from (x, y) to (x2, y2).
   * - `"area"` — particles spawn randomly within a rectangle.
   * - `"ring"` — particles spawn in an annular region between innerRadius and outerRadius.
   */
  export type EmitterShape = "point" | "line" | "area" | "ring";
  /**
   * How the emitter spawns particles.
   * - `"continuous"` — spawns at a steady rate (particles/second) every frame.
   * - `"burst"` — spawns `burstCount` particles all at once, then stops.
   * - `"one-shot"` — spawns a single particle, then stops.
   */
  export type EmissionMode = "continuous" | "burst" | "one-shot";
  /**
   * Configuration for creating a particle emitter via {@link createEmitter}.
   *
   * Range fields like `lifetime`, `velocityX`, etc. are `[min, max]` tuples.
   * Each spawned particle picks a random value within the range.
   */
  export interface EmitterConfig {
      /** Shape of the spawn area. See {@link EmitterShape}. */
      shape: EmitterShape;
      /** X position of the emitter in world pixels. */
      x: number;
      /** Y position of the emitter in world pixels. */
      y: number;
      /** Shape-specific parameters. Which fields are used depends on `shape`. */
      shapeParams?: {
          /** End X for "line" shape. Default: same as emitter x. */
          x2?: number;
          /** End Y for "line" shape. Default: same as emitter y. */
          y2?: number;
          /** Width in pixels for "area" shape. Default: 100. */
          width?: number;
          /** Height in pixels for "area" shape. Default: 100. */
          height?: number;
          /** Inner radius in pixels for "ring" shape. Default: 0. */
          innerRadius?: number;
          /** Outer radius in pixels for "ring" shape. Default: 50. */
          outerRadius?: number;
      };
      /** How particles are spawned. See {@link EmissionMode}. */
      mode: EmissionMode;
      /** Spawn rate in particles per second. Used when mode is "continuous". Default: 10. */
      rate?: number;
      /** Number of particles to spawn at once. Used when mode is "burst". Default: 10. */
      burstCount?: number;
      /** Particle lifetime range [min, max] in seconds. Each particle gets a random value in range. */
      lifetime: [number, number];
      /** Initial X velocity range [min, max] in pixels/second. */
      velocityX: [number, number];
      /** Initial Y velocity range [min, max] in pixels/second. */
      velocityY: [number, number];
      /** Initial X acceleration range [min, max] in pixels/second^2. Optional. */
      accelerationX?: [number, number];
      /** Initial Y acceleration range [min, max] in pixels/second^2. Optional. */
      accelerationY?: [number, number];
      /** Initial rotation range [min, max] in radians. Optional. */
      rotation?: [number, number];
      /** Rotation speed range [min, max] in radians/second. Optional. */
      rotationSpeed?: [number, number];
      /** Initial scale range [min, max]. 1.0 = original size. Optional. */
      scale?: [number, number];
      /** Scale change rate range [min, max] per second. Optional. */
      scaleSpeed?: [number, number];
      /** Color at particle birth. RGBA with components 0.0..1.0. */
      startColor: Color;
      /** Color at particle death. Interpolated linearly from startColor over lifetime. */
      endColor: Color;
      /** Texture ID for rendering particles. Obtain via loadTexture() or createSolidTexture(). */
      textureId: number;
      /** Maximum alive particles for this emitter. New particles are not spawned if at limit. Default: unlimited. */
      maxParticles?: number;
  }
  /**
   * Types of particle affectors that modify particle behavior each frame.
   * - `"gravity"` — constant downward (or any direction) force.
   * - `"wind"` — constant directional force (same as gravity, semantic distinction).
   * - `"attractor"` — pulls particles toward a point.
   * - `"repulsor"` — pushes particles away from a point.
   * - `"turbulence"` — random jitter applied to acceleration each frame.
   */
  export type AffectorType = "gravity" | "wind" | "attractor" | "repulsor" | "turbulence";
  /**
   * A particle affector that modifies particle acceleration each frame.
   * Attach to an emitter via {@link addAffector}.
   *
   * Which fields are used depends on `type`:
   * - gravity/wind: `forceX`, `forceY`
   * - attractor/repulsor: `centerX`, `centerY`, `strength`, `radius`
   * - turbulence: `turbulence`
   */
  export interface Affector {
      /** The type of force this affector applies. See {@link AffectorType}. */
      type: AffectorType;
      /** X component of force vector. Used by "gravity" and "wind". Default: 0. */
      forceX?: number;
      /** Y component of force vector. Used by "gravity" and "wind". Default: 0. */
      forceY?: number;
      /** X position of attraction/repulsion center. Used by "attractor" and "repulsor". Default: 0. */
      centerX?: number;
      /** Y position of attraction/repulsion center. Used by "attractor" and "repulsor". Default: 0. */
      centerY?: number;
      /** Force strength for attractor/repulsor. Higher = stronger pull/push. Default: 100. */
      strength?: number;
      /** Effect radius in pixels for attractor/repulsor. 0 = infinite range. Default: 0. */
      radius?: number;
      /** Turbulence intensity. Higher = more random jitter. Default: 10. */
      turbulence?: number;
  }
  /**
   * A particle emitter instance returned by {@link createEmitter}.
   *
   * Manages a pool of particles and spawns them according to its config.
   * Updated each frame by {@link updateParticles}.
   */
  export interface Emitter {
      /** Unique identifier, auto-generated as "emitter_0", "emitter_1", etc. */
      id: string;
      /** The emitter's configuration (shape, mode, ranges, colors, etc.). */
      config: EmitterConfig;
      /** All particles (alive and dead) managed by this emitter. */
      particles: Particle[];
      /** Object pool for particle reuse to reduce GC pressure. */
      pool: Particle[];
      /** Affectors that modify this emitter's particles each frame. */
      affectors: Affector[];
      /** Internal accumulator for continuous emission rate timing. */
      emissionAccumulator: number;
      /** Whether the emitter is actively spawning particles. Set to false to pause spawning. */
      active: boolean;
      /** Whether the emitter has fired (used by "burst" and "one-shot" modes to prevent re-firing). */
      used: boolean;
  }

  /**
   * Particle emitter implementation.
   *
   * Manages a global list of emitters. Call {@link updateParticles} once per frame
   * to spawn new particles and advance existing ones. Then read particles via
   * {@link getAllParticles} for rendering.
   */
  /**
   * Create a new particle emitter and add it to the global update list.
   *
   * The emitter immediately begins spawning particles according to its
   * configuration (mode, rate, shape, etc.).
   *
   * @param config - Emitter configuration describing shape, mode, particle properties, and colors.
   * @returns The created {@link Emitter} instance.
   *
   * @example
   * ```ts
   * const sparks = createEmitter({
   *   shape: "point",
   *   x: 100, y: 100,
   *   mode: "burst",
   *   burstCount: 20,
   *   lifetime: [0.3, 0.8],
   *   velocityX: [-50, 50],
   *   velocityY: [-100, -20],
   *   startColor: { r: 1, g: 0.8, b: 0, a: 1 },
   *   endColor: { r: 1, g: 0, b: 0, a: 0 },
   *   textureId: sparkTexture,
   * });
   * ```
   */
  export declare function createEmitter(config: EmitterConfig): Emitter;
  /**
   * Remove an emitter from the global update list.
   * Its particles will no longer be updated or included in {@link getAllParticles}.
   *
   * @param emitter - The emitter to remove.
   */
  export declare function removeEmitter(emitter: Emitter): void;
  /**
   * Update all emitters and their particles by one frame.
   *
   * Spawns new particles based on each emitter's mode and rate, then
   * advances all alive particles (velocity, position, rotation, scale,
   * color interpolation, affectors, lifetime). Dead particles are marked
   * `alive = false` and returned to the pool.
   *
   * Call this once per frame in your game loop.
   *
   * @param dt - Elapsed time since last frame in seconds. Must be >= 0.
   */
  export declare function updateParticles(dt: number): void;
  /**
   * Collect all alive particles from all active emitters.
   *
   * Use this each frame to get the particles to render (e.g., via drawSprite).
   *
   * @returns A new array of all alive {@link Particle} instances across all emitters.
   */
  export declare function getAllParticles(): Particle[];
  /**
   * Add a particle affector to an emitter.
   * Affectors modify particle acceleration each frame (gravity, wind, attraction, etc.).
   *
   * @param emitter - The emitter to add the affector to.
   * @param affector - The affector configuration. See {@link Affector} for field details.
   */
  export declare function addAffector(emitter: Emitter, affector: Affector): void;
  /**
   * Remove all emitters and their particles from the global update list.
   */
  export declare function clearEmitters(): void;
  /**
   * Get the number of emitters currently in the global update list.
   * Useful for debugging and testing.
   *
   * @returns Count of registered emitters (active or inactive).
   */
  export declare function getEmitterCount(): number;

}

// ============================================================================
// Module: @arcane/runtime/pathfinding (Pathfinding)
// ============================================================================

declare module "@arcane/runtime/pathfinding" {
  /**
   * A grid abstraction for pathfinding.
   *
   * Provides dimensions and callbacks for walkability and movement cost.
   * Tiles are addressed by integer (x, y) coordinates where (0,0) is the top-left.
   */
  export type PathGrid = {
      /** Grid width in tiles. Must be > 0. */
      width: number;
      /** Grid height in tiles. Must be > 0. */
      height: number;
      /**
       * Returns whether the tile at (x, y) can be traversed.
       * @param x - Tile X coordinate, 0..width-1.
       * @param y - Tile Y coordinate, 0..height-1.
       * @returns True if the tile is walkable.
       */
      isWalkable: (x: number, y: number) => boolean;
      /**
       * Optional movement cost for entering the tile at (x, y).
       * If omitted, cardinal moves cost 1 and diagonal moves cost sqrt(2).
       * @param x - Tile X coordinate.
       * @param y - Tile Y coordinate.
       * @returns Movement cost. Must be > 0. Higher values = harder to traverse.
       */
      cost?: (x: number, y: number) => number;
  };
  /**
   * Options for {@link findPath}.
   */
  export type PathOptions = {
      /** Allow diagonal movement (8-directional). Default: false (4-directional). */
      diagonal?: boolean;
      /** Maximum A* iterations before giving up. Default: 10000. Prevents runaway on large grids. */
      maxIterations?: number;
      /**
       * Heuristic function for distance estimation.
       * - `"manhattan"` — sum of axis distances. Best for 4-directional movement. (Default)
       * - `"euclidean"` — straight-line distance. Best for any-angle movement.
       * - `"chebyshev"` — max of axis distances. Best for 8-directional movement.
       */
      heuristic?: "manhattan" | "euclidean" | "chebyshev";
  };
  /**
   * Result returned by {@link findPath}.
   */
  export type PathResult = {
      /** Whether a path from start to goal was found. */
      found: boolean;
      /** Ordered array of tile positions from start to goal (inclusive). Empty if not found. */
      path: Vec2[];
      /** Total movement cost of the path. 0 if not found. */
      cost: number;
      /** Number of tiles explored during the search. Useful for profiling. */
      explored: number;
  };

  /**
   * Find the shortest path between two tiles on a grid using A* search
   * with a binary min-heap for the open set.
   *
   * Returns immediately if start equals goal, or if either endpoint is
   * out of bounds / unwalkable. Stops early if `maxIterations` is exceeded.
   *
   * @param grid - The pathfinding grid with dimensions, walkability, and optional cost function.
   * @param start - Starting tile position (integer coordinates).
   * @param goal - Goal tile position (integer coordinates).
   * @param options - Optional search parameters: diagonal movement, max iterations, heuristic.
   * @returns A {@link PathResult} with `found`, `path`, `cost`, and `explored` count.
   *
   * @example
   * ```ts
   * const grid: PathGrid = {
   *   width: 10, height: 10,
   *   isWalkable: (x, y) => map[y][x] !== "wall",
   * };
   * const result = findPath(grid, { x: 0, y: 0 }, { x: 9, y: 9 }, { diagonal: true });
   * if (result.found) {
   *   for (const step of result.path) {
   *     console.log(`Move to (${step.x}, ${step.y})`);
   *   }
   * }
   * ```
   */
  export declare function findPath(grid: PathGrid, start: Vec2, goal: Vec2, options?: PathOptions): PathResult;

}

// ============================================================================
// Module: @arcane/runtime/systems (Systems)
// ============================================================================

declare module "@arcane/runtime/systems" {
  /**
   * A predicate that checks whether a rule's preconditions are met.
   * Must be a pure function.
   *
   * @param state - Current game state (read-only by convention).
   * @param args - Additional arguments passed to {@link applyRule}.
   * @returns True if the condition is satisfied.
   */
  export type Condition<S> = (state: S, args: Record<string, unknown>) => boolean;
  /**
   * A pure transform that produces new state when a rule fires.
   * Multiple actions on a rule are chained: each receives the output of the previous.
   *
   * @param state - Current game state.
   * @param args - Additional arguments passed to {@link applyRule}.
   * @returns New state (must not mutate the input).
   */
  export type Action<S> = (state: S, args: Record<string, unknown>) => S;
  /**
   * A named rule consisting of conditions and actions.
   *
   * When applied via {@link applyRule}, all conditions must pass for the
   * actions to execute. Actions are chained in order.
   *
   * @typeParam S - The game state type.
   */
  export type Rule<S> = Readonly<{
      /** Unique name within the system. Used for lookup by {@link applyRule} and {@link extend}. */
      name: string;
      /** Conditions that must all return true for the rule to fire. Empty = always fires. */
      conditions: readonly Condition<S>[];
      /** State transforms to apply in order when the rule fires. */
      actions: readonly Action<S>[];
      /** If set, this rule replaces the rule with the given name when used in {@link extend}. */
      replaces?: string;
  }>;
  /**
   * A named system: an ordered collection of rules that together define game mechanics.
   * Created via {@link system} and extended via {@link extend}.
   *
   * @typeParam S - The game state type.
   */
  export type SystemDef<S> = Readonly<{
      /** System name (e.g., "combat", "inventory"). */
      name: string;
      /** Ordered list of rules in this system. */
      rules: readonly Rule<S>[];
  }>;
  /**
   * Result of applying a single rule via {@link applyRule}.
   *
   * @typeParam S - The game state type.
   */
  export type RuleResult<S> = Readonly<{
      /** True if all conditions passed and actions executed successfully. */
      ok: boolean;
      /** The resulting state (unchanged if ok is false). */
      state: S;
      /** Name of the rule that was applied. */
      ruleName: string;
      /** Error details if ok is false (rule not found or conditions failed). */
      error?: ArcaneError;
  }>;
  /**
   * Options for extending a system via {@link extend}.
   *
   * @typeParam S - The game state type.
   */
  export type ExtendOptions<S> = {
      /** New rules to add. Rules with `replaces` set will replace existing rules by name. */
      rules?: readonly Rule<S>[];
      /** Names of existing rules to remove from the system. */
      remove?: readonly string[];
  };

  /**
   * Create a system definition from a name and list of rules.
   *
   * A system is a named collection of rules that together define a game mechanic.
   * Use {@link rule} to build rules, then combine them into a system.
   *
   * @typeParam S - The game state type.
   * @param name - System name (e.g., "combat", "inventory").
   * @param rules - Ordered array of rules belonging to this system.
   * @returns An immutable {@link SystemDef}.
   *
   * @example
   * ```ts
   * const combat = system("combat", [
   *   rule<GameState>("attack")
   *     .when((s, args) => s.player.hp > 0)
   *     .then((s, args) => ({ ...s, enemy: { ...s.enemy, hp: s.enemy.hp - 10 } })),
   * ]);
   * ```
   */
  export declare function system<S>(name: string, rules: readonly Rule<S>[]): SystemDef<S>;
  type RuleBuilderWithConditions<S> = {
      then(...actions: Action<S>[]): Rule<S>;
  };
  type RuleBuilderBase<S> = {
      when(...conditions: Condition<S>[]): RuleBuilderWithConditions<S>;
      then(...actions: Action<S>[]): Rule<S>;
      replaces(targetName: string): {
          when(...conditions: Condition<S>[]): RuleBuilderWithConditions<S>;
          then(...actions: Action<S>[]): Rule<S>;
      };
  };
  /**
   * Fluent builder for creating named rules.
   *
   * Chain `.when()` to add conditions and `.then()` to add actions.
   * Use `.replaces()` to mark this rule as a replacement for an existing rule
   * when used with {@link extend}.
   *
   * @typeParam S - The game state type.
   * @param name - Unique rule name within the system.
   * @returns A fluent builder with `.when()`, `.then()`, and `.replaces()` methods.
   *
   * @example
   * ```ts
   * const attackRule = rule<GameState>("attack")
   *   .when((s) => s.player.hp > 0, (s) => s.enemy.hp > 0)
   *   .then((s, args) => ({ ...s, enemy: { ...s.enemy, hp: s.enemy.hp - 10 } }));
   * ```
   */
  export declare function rule<S>(name: string): RuleBuilderBase<S>;
  /**
   * Find a rule by name in a system, check its conditions, and execute its actions.
   *
   * If the rule is not found, returns `{ ok: false }` with an UNKNOWN_RULE error.
   * If any condition fails, returns `{ ok: false }` with a CONDITION_FAILED error.
   * Otherwise, chains all actions and returns `{ ok: true }` with the new state.
   *
   * @typeParam S - The game state type.
   * @param sys - The system to search for the rule.
   * @param ruleName - Name of the rule to apply.
   * @param state - Current game state.
   * @param args - Optional arguments passed to conditions and actions.
   * @returns A {@link RuleResult} with the outcome and resulting state.
   */
  export declare function applyRule<S>(sys: SystemDef<S>, ruleName: string, state: S, args?: Record<string, unknown>): RuleResult<S>;
  /**
   * Return names of rules whose conditions are all satisfied for the given state.
   * Useful for presenting valid actions to a player or AI agent.
   *
   * @typeParam S - The game state type.
   * @param sys - The system to query.
   * @param state - Current game state to test conditions against.
   * @param args - Optional arguments passed to condition functions.
   * @returns Array of rule names that can currently be applied.
   */
  export declare function getApplicableRules<S>(sys: SystemDef<S>, state: S, args?: Record<string, unknown>): string[];
  /**
   * Create a new system by extending an existing one.
   *
   * Supports three operations:
   * 1. **Replace** — new rules with `replaces` set swap out existing rules by name.
   * 2. **Add** — new rules without `replaces` are appended to the end.
   * 3. **Remove** — rules named in `options.remove` are excluded.
   *
   * The base system is not modified; a new {@link SystemDef} is returned.
   *
   * @typeParam S - The game state type.
   * @param base - The system to extend.
   * @param options - Rules to add/replace and rule names to remove.
   * @returns A new system with the modifications applied.
   */
  export declare function extend<S>(base: SystemDef<S>, options: ExtendOptions<S>): SystemDef<S>;
  export {};

}

// ============================================================================
// Module: @arcane/runtime/agent (Agent)
// ============================================================================

declare module "@arcane/runtime/agent" {
  /**
   * Verbosity levels for the describe() output.
   * - `"minimal"` — one-line summary (e.g., for logs).
   * - `"normal"` — standard detail (default).
   * - `"detailed"` — full state dump for debugging.
   */
  export type Verbosity = "minimal" | "normal" | "detailed";
  /**
   * Options passed to the agent's describe function.
   */
  export type DescribeOptions = Readonly<{
      /** Detail level for the description. Default: "normal". */
      verbosity?: Verbosity;
      /** Optional dot-path to focus description on a sub-tree of state (e.g., "player.inventory"). */
      path?: string;
  }>;
  /**
   * Metadata about a registered agent action, returned by `listActions()`.
   * Used by AI agents and the HTTP inspector to discover available commands.
   */
  export type ActionInfo = Readonly<{
      /** Action name used to invoke via executeAction(). */
      name: string;
      /** Human-readable description of what the action does. */
      description: string;
      /** Optional argument schema for the action. */
      args?: readonly ArgInfo[];
  }>;
  /**
   * Describes a single argument accepted by an agent action.
   */
  export type ArgInfo = Readonly<{
      /** Argument name (used as key in the args JSON object). */
      name: string;
      /** Type hint (e.g., "string", "number", "EntityId"). */
      type: string;
      /** Optional description of the argument's purpose and valid values. */
      description?: string;
  }>;
  /**
   * Result of executing an action via the agent protocol.
   * @typeParam S - The game state type.
   */
  export type ActionResult<S> = Readonly<{
      /** True if the action executed successfully. */
      ok: boolean;
      /** The game state after execution (unchanged if ok is false). */
      state: S;
      /** Error message if ok is false. */
      error?: string;
  }>;
  /**
   * Result of simulating an action without committing the state change.
   * The original game state is not modified.
   * @typeParam S - The game state type.
   */
  export type SimulateResult<S> = Readonly<{
      /** True if the simulation executed successfully. */
      ok: boolean;
      /** The hypothetical state after the action (original state is untouched). */
      state: S;
      /** Error message if ok is false. */
      error?: string;
  }>;
  /**
   * A captured snapshot of game state at a point in time, used for rewind.
   * @typeParam S - The game state type.
   */
  export type SnapshotData<S> = Readonly<{
      /** Deep clone of the game state at capture time. */
      state: S;
      /** Unix timestamp (ms) when the snapshot was captured. */
      timestamp: number;
  }>;
  /**
   * A pure function that handles an agent action.
   * Takes current state and parsed arguments, returns new state.
   * Must not mutate the input state.
   *
   * @typeParam S - The game state type.
   * @param state - Current game state.
   * @param args - Parsed arguments from the action invocation.
   * @returns New game state.
   */
  export type ActionHandler<S> = (state: S, args: Record<string, unknown>) => S;
  /**
   * Custom function for generating a text description of the game state.
   * Used by `arcane describe` and the HTTP inspector.
   *
   * @typeParam S - The game state type.
   * @param state - Current game state.
   * @param options - Verbosity and optional path focus.
   * @returns Human-readable text description.
   */
  export type DescribeFn<S> = (state: S, options: DescribeOptions) => string;
  /**
   * Configuration for registering an agent via {@link registerAgent}.
   *
   * Supports two state access patterns:
   * - **Store-backed**: provide a `store` (GameStore) — state access is automatic.
   * - **Manual**: provide `getState()` and `setState()` functions.
   *
   * @typeParam S - The game state type.
   */
  export type AgentConfig<S> = {
      /** Display name for the game/agent (shown in CLI and inspector). */
      name: string;
      /**
       * Optional map of named actions the agent can execute.
       * Each action has a handler, description, and optional argument schema.
       */
      actions?: Record<string, {
          handler: ActionHandler<S>;
          description: string;
          args?: ArgInfo[];
      }>;
      /** Optional custom describe function. Falls back to defaultDescribe() if not provided. */
      describe?: DescribeFn<S>;
  } & ({
      store: GameStore<S>;
  } | {
      getState: () => S; /** Function to replace current state. */
      setState: (s: S) => void;
  });
  /**
   * The agent protocol object installed on `globalThis.__arcaneAgent`.
   *
   * Provides the interface that Rust CLI commands (`describe`, `inspect`, `dev --inspector`)
   * use to interact with the game. Created by {@link registerAgent}.
   *
   * @typeParam S - The game state type.
   */
  export type AgentProtocol<S> = Readonly<{
      /** Game/agent display name. */
      name: string;
      /** Get a deep reference to the current game state. */
      getState: () => S;
      /** Query a value at a dot-separated path in the state tree. */
      inspect: (path: string) => unknown;
      /** Generate a text description of the current state. */
      describe: (options?: DescribeOptions) => string;
      /** List all registered actions with their metadata. */
      listActions: () => readonly ActionInfo[];
      /** Execute a named action with optional JSON arguments. Commits state changes. */
      executeAction: (name: string, argsJson?: string) => ActionResult<S>;
      /** Simulate a named action without committing. Returns hypothetical state. */
      simulate: (name: string, argsJson?: string) => SimulateResult<S>;
      /** Reset state to the initial snapshot captured at registerAgent() time. */
      rewind: () => S;
      /** Capture a deep clone of the current state as a snapshot. */
      captureSnapshot: () => SnapshotData<S>;
  }>;

  /** Default describe function that summarizes game state at the given verbosity */
  export declare function defaultDescribe(state: unknown, options: DescribeOptions): string;

  /**
   * Register this game with Arcane's agent protocol.
   *
   * Must be called once at startup. Installs a protocol object on
   * `globalThis.__arcaneAgent` that enables:
   * - `arcane describe <entry.ts>` — text description of game state.
   * - `arcane inspect <entry.ts> <path>` — query specific state values.
   * - `arcane dev <entry.ts> --inspector <port>` — HTTP inspector for live interaction.
   *
   * The protocol supports executing/simulating actions, rewinding to initial state,
   * and capturing snapshots.
   *
   * @typeParam S - The game state type.
   * @param config - Agent configuration with name, state accessors, optional actions, and describe function.
   *   Provide either a `store` (GameStore) or `getState`/`setState` functions.
   * @returns The created {@link AgentProtocol} instance (also installed on globalThis).
   *
   * @example
   * ```ts
   * let state = { score: 0, player: { x: 0, y: 0, hp: 100 } };
   *
   * registerAgent({
   *   name: "my-game",
   *   getState: () => state,
   *   setState: (s) => { state = s; },
   *   describe: (s, opts) => `Score: ${s.score}, HP: ${s.player.hp}`,
   *   actions: {
   *     heal: {
   *       handler: (s) => ({ ...s, player: { ...s.player, hp: 100 } }),
   *       description: "Restore player to full health",
   *     },
   *   },
   * });
   * ```
   */
  export declare function registerAgent<S>(config: AgentConfig<S>): AgentProtocol<S>;

}

// ============================================================================
// Module: @arcane/runtime/testing (Testing)
// ============================================================================

declare module "@arcane/runtime/testing" {
  /**
   * Universal test harness for Arcane — works in both Node.js and V8 (deno_core).
   *
   * In **Node mode**: delegates to `node:test` and `node:assert`.
   * In **V8 mode**: standalone implementations with result reporting via
   * `globalThis.__reportTest(suite, test, passed, error?)`.
   *
   * Test files import `{ describe, it, assert }` from this module and work
   * identically in both environments.
   *
   * @example
   * ```ts
   * import { describe, it, assert } from "../testing/harness.ts";
   *
   * describe("math", () => {
   *   it("adds numbers", () => {
   *     assert.equal(1 + 1, 2);
   *   });
   *
   *   it("supports deep equality", () => {
   *     assert.deepEqual({ a: 1 }, { a: 1 });
   *   });
   * });
   * ```
   */
  /** A synchronous or async test function. */
  type TestFn = () => void | Promise<void>;
  /** Function signature for `describe()` — defines a test suite. */
  type DescribeFn = (name: string, fn: () => void) => void;
  /** Function signature for `it()` — defines a single test case. */
  type ItFn = (name: string, fn: TestFn) => void;
  /**
   * Assertion interface providing common test assertions.
   *
   * All assertion methods throw on failure with a descriptive error message.
   */
  interface Assert {
      /**
       * Assert strict equality (`===`).
       * @param actual - The value to test.
       * @param expected - The expected value.
       * @param message - Optional custom failure message.
       */
      equal(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert deep structural equality (recursive comparison of objects/arrays).
       * @param actual - The value to test.
       * @param expected - The expected structure.
       * @param message - Optional custom failure message.
       */
      deepEqual(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert strict inequality (`!==`).
       * @param actual - The value to test.
       * @param expected - The value that `actual` must not equal.
       * @param message - Optional custom failure message.
       */
      notEqual(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert that two values are NOT deeply equal.
       * @param actual - The value to test.
       * @param expected - The value that `actual` must not deeply equal.
       * @param message - Optional custom failure message.
       */
      notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert that a value is truthy.
       * @param value - The value to test.
       * @param message - Optional custom failure message.
       */
      ok(value: unknown, message?: string): void;
      /**
       * Assert that a string matches a regular expression.
       * @param actual - The string to test.
       * @param expected - The regex pattern to match against.
       * @param message - Optional custom failure message.
       */
      match(actual: string, expected: RegExp, message?: string): void;
      /**
       * Assert that a function throws an error.
       * @param fn - The function expected to throw.
       * @param expected - Optional regex to match against the error message.
       * @param message - Optional custom failure message.
       */
      throws(fn: () => unknown, expected?: RegExp, message?: string): void;
  }
  /**
   * Define a test suite. Can be nested with other describe() calls.
   * In V8 mode, nested suites have their test names prefixed with the parent suite name.
   *
   * @param name - Suite name displayed in test output.
   * @param fn - Function containing `it()` test cases and/or nested `describe()` calls.
   */
  export let describe: DescribeFn;
  /**
   * Define a single test case within a describe() suite.
   * Supports both synchronous and async test functions.
   *
   * @param name - Test name displayed in test output.
   * @param fn - Test function. Throw (or reject) to indicate failure; return to pass.
   */
  export let it: ItFn;
  /**
   * Assertion helpers for test cases. Methods throw on failure with descriptive messages.
   *
   * Available assertions: `equal`, `deepEqual`, `notEqual`, `notDeepEqual`, `ok`, `match`, `throws`.
   */
  export let assert: Assert;
  export { describe, it, assert };

}

