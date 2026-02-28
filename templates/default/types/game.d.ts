// Arcane Engine — Game Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/game

declare module "@arcane/runtime/game" {
  /**
   * Convenience layer types for the Arcane game module.
   */
  /** Options for hud.text(). All optional with sensible defaults. */
  export type HUDTextOptions = {
      /** Text tint color. Default: Colors.WHITE */
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Text scale. Default: 2 (HUDLayout.TEXT_SCALE). */
      scale?: number;
      /** Draw layer. Default: 100. */
      layer?: number;
      /** Horizontal alignment. "left" = x is left edge, "center" = x is center, "right" = x is right edge. Default: "left". */
      align?: "left" | "center" | "right";
  };
  /** Options for hud.bar(). All optional with sensible defaults. */
  export type HUDBarOptions = {
      /** Bar width in screen pixels. Default: 80. */
      width?: number;
      /** Bar height in screen pixels. Default: 12. */
      height?: number;
      /** Alias for width (matches drawRect/drawSprite convention). */
      w?: number;
      /** Alias for height (matches drawRect/drawSprite convention). */
      h?: number;
      /** Fill color. Default: Colors.SUCCESS (green). */
      fillColor?: Color;
      /** Background color. Default: Colors.HUD_BG. */
      bgColor?: Color;
      /** Border color. Default: Colors.LIGHT_GRAY. */
      borderColor?: Color;
      /** Border width. Default: 1. */
      borderWidth?: number;
      /** Draw layer. Default: 100. */
      layer?: number;
  };
  /** Options for hud.label(). All optional with sensible defaults. */
  export type HUDLabelOptions = {
      /** Text color. Default: Colors.WHITE. */
      textColor?: Color;
      /** Background color. Default: Colors.HUD_BG. */
      bgColor?: Color;
      /** Text scale. Default: 2 (HUDLayout.TEXT_SCALE). */
      scale?: number;
      /** Padding around text. Default: 8. */
      padding?: number;
      /** Draw layer. Default: 110. */
      layer?: number;
      /** Horizontal alignment. "left" = x is left edge, "center" = x is center, "right" = x is right edge. Default: "left". */
      align?: "left" | "center" | "right";
  };
  /** Options for hud.overlay(). */
  export type HUDOverlayOptions = {
      /** Draw layer. Default: 200 (above other HUD). */
      layer?: number;
  };
  /** A single sprite part within a group. */
  export type SpritePart = {
      /** Unique name for lookup. */
      name: string;
      /** Horizontal offset from the group origin. */
      offsetX: number;
      /** Vertical offset from the group origin. */
      offsetY: number;
      /** Part width. */
      w: number;
      /** Part height. */
      h: number;
      /** Inline color. Used if textureId is not set. */
      color?: Color;
      /** Pre-loaded texture ID. Takes priority over color. */
      textureId?: TextureId;
      /** Layer offset relative to group baseLayer. Default: 0. */
      layerOffset?: number;
      /** Part opacity (0-1). Multiplied with group opacity. Default: 1. */
      opacity?: number;
      /** Blend mode. Default: "alpha". */
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
      /** Whether this part flips horizontally when the group flips. Default: true. */
      flipWithParent?: boolean;
      /** Whether this part is visible. Default: true. */
      visible?: boolean;
  };
  /** A collection of sprite parts with a shared base layer. */
  export type SpriteGroupType = {
      parts: SpritePart[];
      baseLayer: number;
  };
  /** Options for drawSpriteGroup(). */
  export type SpriteGroupDrawOptions = {
      /** Flip the entire group horizontally. */
      flipX?: boolean;
      /** Group opacity multiplier (0-1). Applied to all parts. */
      opacity?: number;
  };
  /** Configuration for the platformer controller. All optional fields have sensible defaults. */
  export type PlatformerConfig = {
      /** Downward acceleration in pixels/sec². Default: 980. */
      gravity?: number;
      /** Initial upward velocity when jumping (negative = up). Default: -400. */
      jumpForce?: number;
      /** Horizontal speed when walking, pixels/sec. Default: 160. */
      walkSpeed?: number;
      /** Horizontal speed when running, pixels/sec. Default: 280. */
      runSpeed?: number;
      /** Maximum downward velocity, pixels/sec. Default: 600. */
      terminalVelocity?: number;
      /** Seconds after leaving ground where jump is still allowed. Default: 0.08. */
      coyoteTime?: number;
      /** Seconds before landing that a jump input is remembered. Default: 0.1. */
      jumpBuffer?: number;
      /** Player AABB width. Required. */
      playerWidth: number;
      /** Player AABB height. Required. */
      playerHeight: number;
  };
  /** Mutable platformer state. Returned by all platformer functions. */
  export type PlatformerStateType = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      onGround: boolean;
      facingRight: boolean;
      coyoteTimer: number;
      jumpBufferTimer: number;
      /** External velocity X (e.g., knockback). Decays by ×0.85 per step. */
      externalVx: number;
      /** External velocity Y (e.g., knockback). Decays by ×0.85 per step. */
      externalVy: number;
  };
  /** A static platform rectangle. oneWay platforms only block from above. */
  export type PlatformType = {
      x: number;
      y: number;
      w: number;
      h: number;
      /** If true, only blocks downward movement (pass through from below/sides). */
      oneWay?: boolean;
  };
  /** Captured input state for one frame. Pass to autoUpdate* functions. */
  export type FrameInput = {
      readonly mouseX: number;
      readonly mouseY: number;
      readonly mouseDown: boolean;
      readonly enterPressed: boolean;
      readonly tabPressed: boolean;
      readonly shiftDown: boolean;
      readonly arrowLeftPressed: boolean;
      readonly arrowRightPressed: boolean;
      readonly arrowUpPressed: boolean;
      readonly arrowDownPressed: boolean;
  };
  /** Callback invoked when a collision contact is detected. */
  export type CollisionCallback = (contact: Contact) => void;
  /** Collision event registry. Create with createCollisionRegistry(). */
  export type CollisionRegistry = {
      /** @internal */ _bodyCallbacks: Map<BodyId, CollisionCallback[]>;
      /** @internal */ _pairCallbacks: Map<string, CollisionCallback[]>;
  };
  /** Sprite configuration for an entity. */
  export type EntitySprite = {
      /** Pre-loaded texture ID. If omitted, color must be set. */
      textureId?: TextureId;
      /** Inline color. Auto-creates a cached solid texture. Ignored if textureId is set. */
      color?: Color;
      /** Sprite width in world units. */
      w: number;
      /** Sprite height in world units. */
      h: number;
      /** Draw layer. Default: 0. */
      layer?: number;
      /** X offset from entity center. Default: -w/2 (centered). */
      offsetX?: number;
      /** Y offset from entity center. Default: -h/2 (centered). */
      offsetY?: number;
      /** Additional SpriteOptions fields. */
      rotation?: number;
      flipX?: boolean;
      flipY?: boolean;
      opacity?: number;
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
  };
  /** A lightweight game entity binding position, sprite, and physics. */
  export type Entity = {
      /** World X position. Auto-synced from physics body if present. */
      x: number;
      /** World Y position. Auto-synced from physics body if present. */
      y: number;
      /** Rotation in radians. Auto-synced from physics body if present. */
      angle: number;
      /** Bound physics body, or null. */
      bodyId: BodyId | null;
      /** Sprite configuration for auto-drawing, or null. */
      sprite: EntitySprite | null;
      /** User-defined tag for identification (collision filtering, etc.). */
      tag: string;
      /** Whether entity is active. Inactive entities are skipped by sync/draw. */
      active: boolean;
  };
  /** Options for createEntity(). */
  export type EntityOptions = {
      /** Sprite configuration. */
      sprite?: EntitySprite;
      /** Physics body definition (x,y are taken from entity position). */
      body?: Omit<BodyDef, "x" | "y">;
      /** Tag for identification. Default: "". */
      tag?: string;
  };
  /** Configuration for createGame(). All fields optional. */
  export type GameConfig = {
      /** Name for agent registration. If set, enables agent protocol. */
      name?: string;
      /** Camera zoom level. Default: 1. */
      zoom?: number;
      /** Auto-clear sprites each frame? Default: true. */
      autoClear?: boolean;
      /** Background color with 0.0-1.0 float components. Use rgb() to create from 0-255 values. */
      background?: {
          r: number;
          g: number;
          b: number;
      };
      /**
       * Auto-update subsystems each frame? Default: true.
       * When enabled, createGame() automatically calls before the user callback:
       *   updateTweens(dt), updateParticles(dt), updateScreenTransition(dt)
       * And after the user callback:
       *   drawScreenTransition(), drawScreenFlash()
       * Redundant manual calls are harmless (they're no-ops when idle).
       * Set to false if you need full manual control over subsystem update order.
       */
      autoSubsystems?: boolean;
      /** Maximum delta time in seconds. Clamps ctx.dt to this value. Default: none (250ms Rust cap still applies). */
      maxDeltaTime?: number;
  };
  /** Options for drawBody(). Draws a sprite centered on a physics body's position. */
  export type DrawBodyOptions = {
      /** Sprite width in world units. */
      w: number;
      /** Sprite height in world units. */
      h: number;
      /** Pre-loaded texture ID. If omitted, color must be set. */
      textureId?: TextureId;
      /** Inline color. */
      color?: Color;
      /** Draw layer. Default: 0. */
      layer?: number;
      /** Opacity (0-1). Default: 1. */
      opacity?: number;
      /** Blend mode. Default: "alpha". */
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
      /** Tint color. */
      tint?: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      /** Flip horizontally. */
      flipX?: boolean;
      /** Flip vertically. */
      flipY?: boolean;
      /** Custom shader ID. */
      shaderId?: number;
      /** UV sub-rectangle for atlas sprites. */
      uv?: {
          x: number;
          y: number;
          w: number;
          h: number;
      };
  };
  /** Context passed to the frame callback. */
  export type GameContext = {
      /** Delta time in seconds since last frame. */
      readonly dt: number;
      /** Viewport dimensions in screen pixels. */
      readonly viewport: {
          readonly width: number;
          readonly height: number;
      };
      /** Viewport width in screen pixels. Shorthand for `ctx.viewport.width`. */
      readonly vpW: number;
      /** Viewport height in screen pixels. Shorthand for `ctx.viewport.height`. */
      readonly vpH: number;
      /** Total elapsed time in seconds since game start. */
      readonly elapsed: number;
      /** Frame counter since game start. */
      readonly frame: number;
  };
  /** Frame callback signature. */
  export type FrameCallback = (ctx: GameContext) => void;
  /** State integration for agent protocol. */
  export type GameStateConfig<S> = {
      /** Return current game state. */
      get: () => S;
      /** Replace game state (for agent rewind/restore). */
      set: (s: S) => void;
      /** Optional custom describe function. */
      describe?: (state: S, opts: {
          verbosity?: string;
          path?: string;
      }) => string;
      /** Optional named actions for agent interaction. */
      actions?: Record<string, {
          handler: (state: S, args: Record<string, unknown>) => S;
          description: string;
          args?: Array<{
              name: string;
              type: string;
              description?: string;
          }>;
      }>;
  };
  /** Object returned by createGame(). */
  export type Game = {
      /** Register the per-frame update+render callback. */
      onFrame: (callback: FrameCallback) => void;
      /** Wire up game state for agent protocol integration. */
      state: <S>(config: GameStateConfig<S>) => void;
  };

  /**
   * Collision event system. Register callbacks for body or pair collisions,
   * then call processCollisions() each frame after stepPhysics().
   */
  /**
   * Create a collision event registry.
   * @returns Empty collision registry.
   */
  export declare function createCollisionRegistry(): CollisionRegistry;
  /**
   * Register a callback for when a specific body collides with anything.
   */
  export declare function onBodyCollision(registry: CollisionRegistry, bodyId: BodyId, callback: CollisionCallback): void;
  /**
   * Register a callback for when two specific bodies collide.
   */
  export declare function onCollision(registry: CollisionRegistry, bodyA: BodyId, bodyB: BodyId, callback: CollisionCallback): void;
  /**
   * Remove all collision callbacks involving a body.
   * Call when destroying an entity/body.
   */
  export declare function removeBodyCollisions(registry: CollisionRegistry, bodyId: BodyId): void;
  /**
   * Process all contacts from the last physics step and fire registered callbacks.
   * Call once per frame after stepPhysics().
   */
  export declare function processCollisions(registry: CollisionRegistry): void;

  /**
   * Lightweight entity handles binding position + sprite + physics body.
   */
  /**
   * Create a lightweight game entity.
   *
   * Binds a world position to an optional physics body and sprite configuration.
   * If a body definition is provided, a physics body is created at (x, y).
   *
   * @param x - Initial world X position.
   * @param y - Initial world Y position.
   * @param opts - Optional entity configuration (sprite, body, tag).
   * @returns A new Entity object.
   *
   * @example
   * const player = createEntity(100, 200, {
   *   sprite: { color: rgb(0, 128, 255), w: 32, h: 32 },
   *   body: { type: "dynamic", shape: { type: "aabb", halfW: 16, halfH: 16 } },
   *   tag: "player",
   * });
   */
  export declare function createEntity(x: number, y: number, opts?: EntityOptions): Entity;
  /**
   * Sync entity positions from their physics bodies.
   * Call once per frame after stepPhysics().
   *
   * Entities without a physics body or that are inactive are skipped.
   *
   * @param entities - Array of entities to synchronize.
   *
   * @example
   * stepPhysics(dt);
   * syncEntities(entities);
   */
  export declare function syncEntities(entities: Entity[]): void;
  /**
   * Draw all active entities that have sprite configurations.
   * Call once per frame during the render phase.
   *
   * Entities without a sprite or that are inactive are skipped.
   * If an entity sprite has a `color` but no `textureId`, a solid-color
   * texture is auto-created and cached.
   *
   * @param entities - Array of entities to draw.
   *
   * @example
   * drawEntities(entities);
   */
  export declare function drawEntities(entities: Entity[]): void;
  /**
   * Draw a sprite centered on a physics body's current position and rotation.
   *
   * Reads the body's position and angle via getBodyState(), then draws a sprite
   * centered on that position with the body's rotation applied.
   *
   * @param id - The physics body ID to draw.
   * @param opts - Sprite dimensions and visual options.
   *
   * @example
   * drawBody(boxId, { color: rgb(180, 120, 60), w: 40, h: 30, layer: 2 });
   */
  export declare function drawBody(id: BodyId, opts: DrawBodyOptions): void;
  /**
   * Destroy an entity: removes its physics body and marks it inactive.
   *
   * After destruction the entity will be skipped by syncEntities() and
   * drawEntities(). Its bodyId is set to null.
   *
   * @param entity - The entity to destroy.
   *
   * @example
   * destroyEntity(bullet);
   */
  export declare function destroyEntity(entity: Entity): void;
  /**
   * Find the first active entity with a matching tag.
   *
   * @param entities - Array of entities to search.
   * @param tag - Tag string to match.
   * @returns The first matching active entity, or undefined.
   *
   * @example
   * const player = findEntity(entities, "player");
   * if (player) { ... }
   */
  export declare function findEntity(entities: Entity[], tag: string): Entity | undefined;
  /**
   * Find all active entities with a matching tag.
   *
   * @param entities - Array of entities to search.
   * @param tag - Tag string to match.
   * @returns Array of matching active entities (may be empty).
   *
   * @example
   * const coins = findEntities(entities, "coin");
   * for (const coin of coins) { ... }
   */
  export declare function findEntities(entities: Entity[], tag: string): Entity[];

  /**
   * Game bootstrap -- createGame() sets up the frame loop with sane defaults.
   *
   * Provides a minimal wrapper that handles common boilerplate:
   * - Auto-clearing sprites each frame
   * - Setting background color
   * - Wiring up agent protocol for AI interaction
   *
   * @example
   * const game = createGame({ name: "my-game", background: { r: 0.12, g: 0.12, b: 0.2 } });
   * game.onFrame((ctx) => {
   *   drawSprite({ textureId: tex, x: 100, y: 100, w: 32, h: 32 });
   * });
   */
  /**
   * Create a game instance with sensible defaults for the frame loop.
   *
   * Defaults:
   * - `autoClear: true` -- clears all sprites at the start of each frame.
   * - `zoom: 1` -- default zoom level.
   *
   * If `background` is provided (0.0-1.0 RGB), calls setBackgroundColor().
   *
   * @param config - Optional configuration. All fields have sensible defaults.
   * @returns A Game object with `onFrame()` and `state()` methods.
   *
   * @example
   * const game = createGame({
   *   name: "dungeon-crawler",
   *   background: { r: 0.08, g: 0.05, b: 0.11 },
   *   zoom: 2,
   * });
   *
   * game.state({
   *   get: () => gameState,
   *   set: (s) => { gameState = s; },
   * });
   *
   * game.onFrame((ctx) => {
   *   update(ctx.dt);
   *   render();
   * });
   */
  export declare function createGame(config?: GameConfig): Game;

  /**
   * HUD convenience helpers. All functions default to screenSpace: true
   * with sensible layer, scale, and color defaults.
   *
   * These wrappers reduce the boilerplate of passing `screenSpace: true`,
   * layer numbers, and default colors for every HUD draw call. The raw
   * `drawText`, `drawBar`, and `drawLabel` functions are still available
   * for full control.
   *
   * @example
   * ```ts
   * import { hud } from "@arcane/runtime/game";
   *
   * hud.text("Score: 100", 10, 10);
   * hud.bar(10, 30, health / maxHealth);
   * hud.label("Game Over", 300, 250);
   * ```
   */
  export declare const hud: {
      /**
       * Draw HUD text with sensible defaults.
       * screenSpace: true, layer: 100, scale: HUDLayout.TEXT_SCALE, tint: white.
       *
       * @param content - The text string to display.
       * @param x - X position in screen pixels.
       * @param y - Y position in screen pixels.
       * @param opts - Optional overrides for scale, tint, and layer.
       */
      text(content: string, x: number, y: number, opts?: HUDTextOptions): void;
      /**
       * Draw a HUD progress/health bar with sensible defaults.
       * screenSpace: true, layer: 100, green fill on dark background.
       *
       * @param x - X position in screen pixels.
       * @param y - Y position in screen pixels.
       * @param fillRatio - Fill amount, 0.0 (empty) to 1.0 (full). Clamped internally by drawBar.
       * @param opts - Optional overrides for dimensions, colors, border, and layer.
       */
      bar(x: number, y: number, fillRatio: number, opts?: HUDBarOptions): void;
      /**
       * Draw a HUD label (text with background panel).
       * screenSpace: true, layer: 110, white text on dark background.
       *
       * @param content - The text string to display.
       * @param x - X position in screen pixels.
       * @param y - Y position in screen pixels.
       * @param opts - Optional overrides for colors, padding, scale, and layer.
       */
      label(content: string, x: number, y: number, opts?: HUDLabelOptions): void;
      /**
       * Draw a full-screen overlay rectangle (e.g., fade-to-black, damage flash).
       * screenSpace: true, default layer: 200 (above other HUD elements).
       *
       * @param color - Overlay color (use alpha for transparency).
       * @param opts - Optional layer override.
       *
       * @example
       * hud.overlay({ r: 0, g: 0, b: 0, a: 0.5 }); // 50% black overlay
       */
      overlay(color: Color, opts?: HUDOverlayOptions): void;
  };

  /**
   * Platformer controller: pure functions for 2D side-scrolling movement.
   *
   * State in, state out -- no rendering, no globals. Handles gravity, jump
   * (with coyote time + jump buffer), walk/run, and AABB platform collision.
   *
   * @example
   * ```ts
   * import { createPlatformerState, platformerMove, platformerJump, platformerStep } from "@arcane/runtime/game";
   *
   * const config = { playerWidth: 16, playerHeight: 24, gravity: 980 };
   * let player = createPlatformerState(100, 100);
   *
   * // In your frame callback:
   * if (isKeyDown("ArrowRight")) player = platformerMove(player, 1, false, config);
   * if (isKeyPressed("Space")) player = platformerJump(player, config);
   * player = platformerStep(player, dt, platforms, config);
   * ```
   */
  /** Configuration for the platformer controller. All optional fields have sensible defaults. */
  export type PlatformerConfig = {
      /** Downward acceleration in pixels/sec^2. Default: 980. */
      gravity?: number;
      /** Initial upward velocity when jumping (negative = up). Default: -400. */
      jumpForce?: number;
      /** Horizontal speed when walking, pixels/sec. Default: 160. */
      walkSpeed?: number;
      /** Horizontal speed when running, pixels/sec. Default: 280. */
      runSpeed?: number;
      /** Maximum downward velocity, pixels/sec. Default: 600. */
      terminalVelocity?: number;
      /** Seconds after leaving ground where jump is still allowed. Default: 0.08. */
      coyoteTime?: number;
      /** Seconds before landing that a jump input is remembered. Default: 0.1. */
      jumpBuffer?: number;
      /** Player AABB width. Required. */
      playerWidth: number;
      /** Player AABB height. Required. */
      playerHeight: number;
  };
  /** Mutable platformer state. Returned by all platformer functions. */
  export type PlatformerState = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      onGround: boolean;
      facingRight: boolean;
      coyoteTimer: number;
      jumpBufferTimer: number;
      /** External velocity X (e.g., knockback). Decays by ×0.85 per step. */
      externalVx: number;
      /** External velocity Y (e.g., knockback). Decays by ×0.85 per step. */
      externalVy: number;
  };
  /** A static platform rectangle. oneWay platforms only block from above. */
  export type Platform = {
      x: number;
      y: number;
      w: number;
      h: number;
      /** If true, only blocks downward movement (pass through from below/sides). */
      oneWay?: boolean;
  };
  /**
   * Create a new platformer state at the given position.
   *
   * Initializes velocity to zero, airborne, facing right, with no active
   * coyote or jump buffer timers.
   *
   * @param x - Initial horizontal position (left edge of player AABB).
   * @param y - Initial vertical position (top edge of player AABB).
   * @returns A fresh PlatformerState.
   */
  export declare function createPlatformerState(x: number, y: number): PlatformerState;
  /**
   * Set horizontal movement direction and speed.
   *
   * @param state - Current platformer state.
   * @param direction - -1 (left), 0 (stop), or 1 (right).
   * @param running - If true, use runSpeed instead of walkSpeed.
   * @param config - Platformer configuration.
   * @returns New state with updated vx and facingRight.
   */
  export declare function platformerMove(state: PlatformerState, direction: -1 | 0 | 1, running: boolean, config: PlatformerConfig): PlatformerState;
  /**
   * Request a jump. If on the ground (or within coyote time), applies jump force
   * immediately. Otherwise, sets the jump buffer timer so the jump triggers
   * automatically on the next landing.
   *
   * @param state - Current platformer state.
   * @param config - Platformer configuration.
   * @returns New state with jump applied or jump buffer set.
   */
  export declare function platformerJump(state: PlatformerState, config: PlatformerConfig): PlatformerState;
  /**
   * Advance the platformer by one frame. Applies gravity, integrates position,
   * resolves AABB collisions against platforms, and updates coyote time and
   * jump buffer timers.
   *
   * @param state - Current platformer state.
   * @param dt - Frame delta time in seconds.
   * @param platforms - Array of static platform rectangles to collide against.
   * @param config - Platformer configuration.
   * @returns New state after physics integration and collision resolution.
   */
  export declare function platformerStep(state: PlatformerState, dt: number, platforms: Platform[], config: PlatformerConfig): PlatformerState;
  /**
   * Apply an instant velocity impulse (e.g., knockback). The impulse is added
   * to movement velocity each frame and decays over time (x0.85 per step).
   *
   * @param state - Current platformer state.
   * @param vx - Horizontal impulse velocity.
   * @param vy - Vertical impulse velocity.
   * @returns New state with impulse added to external velocity.
   */
  export declare function platformerApplyImpulse(state: PlatformerState, vx: number, vy: number): PlatformerState;
  /**
   * Maximum jump height on flat ground: h = v^2 / (2g).
   *
   * Uses the absolute value of jumpForce and gravity from the config.
   * Useful for level design: checking whether a gap is clearable.
   *
   * @param config - Platformer configuration.
   * @returns Maximum height in pixels.
   *
   * @example
   * ```ts
   * const h = getJumpHeight({ playerWidth: 16, playerHeight: 24, gravity: 980, jumpForce: -400 });
   * // h ≈ 81.6 pixels
   * ```
   */
  export declare function getJumpHeight(config: PlatformerConfig): number;
  /**
   * Total airtime for a jump on flat ground: t = 2v / g.
   *
   * This is the time from leaving the ground to landing back at the same height.
   * Assumes no terminal velocity capping.
   *
   * @param config - Platformer configuration.
   * @returns Airtime in seconds.
   *
   * @example
   * ```ts
   * const t = getAirtime({ playerWidth: 16, playerHeight: 24, gravity: 980, jumpForce: -400 });
   * // t ≈ 0.816 seconds
   * ```
   */
  export declare function getAirtime(config: PlatformerConfig): number;
  /**
   * Horizontal distance covered during a full jump on flat ground.
   *
   * reach = speed * airtime, where speed is walkSpeed or runSpeed.
   *
   * @param config - Platformer configuration.
   * @param running - If true, use runSpeed instead of walkSpeed. Default: false.
   * @returns Horizontal jump reach in pixels.
   *
   * @example
   * ```ts
   * const reach = getJumpReach({ playerWidth: 16, playerHeight: 24, gravity: 980, jumpForce: -400, walkSpeed: 160, runSpeed: 280 });
   * // walking: 160 * 0.816 ≈ 130.6 pixels
   * const runReach = getJumpReach(config, true);
   * // running: 280 * 0.816 ≈ 228.6 pixels
   * ```
   */
  export declare function getJumpReach(config: PlatformerConfig, running?: boolean): number;
  /**
   * Convert a 2D number grid into merged Platform rectangles.
   *
   * Uses greedy rectangle merging: scans rows left-to-right to find horizontal
   * spans of consecutive solid tiles, then extends each span downward as far as
   * possible. Produces fewer, larger rectangles than one-per-tile.
   *
   * @param grid - 2D array of tile IDs (grid[row][col]). Row 0 = top.
   * @param tileSize - Size of each tile in world units.
   * @param solidTileIds - Tile IDs considered solid. 0 is typically empty.
   * @param startX - World X offset for the grid origin. Default: 0.
   * @param startY - World Y offset for the grid origin. Default: 0.
   * @returns Array of merged Platform rectangles in world coordinates.
   *
   * @example
   * ```ts
   * const grid = [
   *   [0, 0, 0, 0],
   *   [1, 1, 0, 0],
   *   [1, 1, 1, 0],
   * ];
   * const platforms = gridToPlatforms(grid, 16, [1]);
   * // Produces merged rectangles instead of one per tile
   * ```
   */
  export declare function gridToPlatforms(grid: number[][], tileSize: number, solidTileIds: number[] | Set<number>, startX?: number, startY?: number): Platform[];
  /**
   * Read a tilemap layer and convert solid tiles to Platform rectangles.
   *
   * Extracts the tile grid from a LayeredTilemap layer, determines which tiles
   * are solid, and delegates to gridToPlatforms for greedy merging.
   *
   * By default, a tile is considered solid if getTileProperty(tileId, "solid")
   * returns a truthy value. Pass a custom isSolid function to override.
   *
   * @param tilemap - A LayeredTilemap from the rendering module.
   * @param layerName - Name of the layer to read.
   * @param isSolid - Optional predicate: returns true if a tile ID is solid.
   *   Default checks getTileProperty(tileId, "solid").
   * @param startX - World X offset. Default: 0.
   * @param startY - World Y offset. Default: 0.
   * @returns Array of merged Platform rectangles in world coordinates.
   *
   * @example
   * ```ts
   * // Using tile properties (define solid tiles beforehand)
   * defineTileProperties(1, { solid: true });
   * defineTileProperties(2, { solid: true });
   * const platforms = platformsFromTilemap(myMap, "collision");
   *
   * // Using a custom predicate
   * const platforms = platformsFromTilemap(myMap, "ground", (id) => id >= 1 && id <= 10);
   * ```
   */
  export declare function platformsFromTilemap(tilemap: LayeredTilemap, layerName: string, isSolid?: (tileId: number) => boolean, startX?: number, startY?: number): Platform[];

  /**
   * Sprite group: bundle multiple sprite parts with relative offsets.
   * Draw composite characters or multi-part objects with a single call.
   *
   * @example
   * ```ts
   * import { createSpriteGroup, drawSpriteGroup, setPartVisible } from "@arcane/runtime/game";
   *
   * const knight = createSpriteGroup([
   *   { name: "body", offsetX: 0, offsetY: 0, w: 16, h: 16, color: rgb(153, 153, 153) },
   *   { name: "head", offsetX: 2, offsetY: -12, w: 12, h: 12, color: rgb(255, 204, 179) },
   *   { name: "sword", offsetX: 14, offsetY: -2, w: 6, h: 20, color: rgb(204, 204, 230), layerOffset: 1 },
   * ], 5);
   *
   * drawSpriteGroup(knight, 100, 200);
   * drawSpriteGroup(knight, 100, 200, { flipX: true }); // mirrors all parts
   * setPartVisible(knight, "sword", false); // hide sword
   * ```
   */
  /** A single sprite part within a group. */
  export type SpritePart = {
      /** Unique name for lookup. */
      name: string;
      /** Horizontal offset from the group origin. */
      offsetX: number;
      /** Vertical offset from the group origin. */
      offsetY: number;
      /** Part width. */
      w: number;
      /** Part height. */
      h: number;
      /** Inline color. Used if textureId is not set. */
      color?: Color;
      /** Pre-loaded texture ID. Takes priority over color. */
      textureId?: TextureId;
      /** Layer offset relative to group baseLayer. Default: 0. */
      layerOffset?: number;
      /** Part opacity (0-1). Multiplied with group opacity. Default: 1. */
      opacity?: number;
      /** Blend mode. Default: "alpha". */
      blendMode?: "alpha" | "additive" | "multiply" | "screen";
      /** Whether this part flips horizontally when the group flips. Default: true. */
      flipWithParent?: boolean;
      /** Whether this part is visible. Default: true. */
      visible?: boolean;
  };
  /** A collection of sprite parts with a shared base layer. */
  export type SpriteGroup = {
      parts: SpritePart[];
      baseLayer: number;
  };
  /** Options for drawSpriteGroup(). */
  export type SpriteGroupDrawOptions = {
      /** Flip the entire group horizontally. */
      flipX?: boolean;
      /** Group opacity multiplier (0-1). Applied to all parts. */
      opacity?: number;
  };
  /**
   * Create a sprite group from an array of parts.
   *
   * @param parts - Sprite parts with relative offsets.
   * @param baseLayer - Base draw layer. Part layers = baseLayer + part.layerOffset. Default: 0.
   * @returns A new SpriteGroup.
   */
  export declare function createSpriteGroup(parts: SpritePart[], baseLayer?: number): SpriteGroup;
  /**
   * Draw all visible parts of a sprite group at the given position.
   *
   * @param group - The sprite group to draw.
   * @param x - Group origin X position in world units.
   * @param y - Group origin Y position in world units.
   * @param opts - Optional flip and opacity overrides.
   */
  export declare function drawSpriteGroup(group: SpriteGroup, x: number, y: number, opts?: SpriteGroupDrawOptions): void;
  /**
   * Find a sprite part by name.
   *
   * @param group - The sprite group to search.
   * @param name - Part name to find.
   * @returns The matching SpritePart, or undefined if not found.
   */
  export declare function getSpritePart(group: SpriteGroup, name: string): SpritePart | undefined;
  /**
   * Set a part's visibility by name.
   *
   * @param group - The sprite group to modify.
   * @param name - Part name to update.
   * @param visible - Whether the part should be drawn.
   */
  export declare function setPartVisible(group: SpriteGroup, name: string, visible: boolean): void;

  /**
   * Lightweight scene node / transform hierarchy.
   *
   * Provides parent-child relationships with local transforms that compose
   * into world transforms. Useful for attaching weapons to characters,
   * UI element grouping, or any hierarchical positioning.
   *
   * No caching or dirty flags -- getWorldTransform() walks the parent chain
   * each call. This is fine for typical scene depths of 3-5 levels.
   */
  /** Opaque handle to a scene node. */
  export type SceneNodeId = number;
  /** A node in the scene hierarchy with a local transform relative to its parent. */
  export type SceneNode = {
      id: SceneNodeId;
      parentId: SceneNodeId | null;
      localX: number;
      localY: number;
      localRotation: number;
      localScaleX: number;
      localScaleY: number;
  };
  /** World-space transform computed by walking the parent chain. */
  export type WorldTransform = {
      x: number;
      y: number;
      rotation: number;
      scaleX: number;
      scaleY: number;
  };
  /**
   * Create a new scene node, optionally parented to an existing node.
   * Starts at position (0,0), rotation 0, scale (1,1).
   *
   * @param parentId - Parent node ID. If omitted, the node is a root node.
   * @returns The new node's ID.
   */
  export declare function createNode(parentId?: SceneNodeId): SceneNodeId;
  /**
   * Destroy a scene node. Children are detached (become roots), not destroyed.
   *
   * @param id - The node to destroy.
   */
  export declare function destroyNode(id: SceneNodeId): void;
  /**
   * Set the local transform of a node.
   *
   * @param id - Node to update.
   * @param x - Local X position.
   * @param y - Local Y position.
   * @param rotation - Local rotation in radians. Default: 0.
   * @param scaleX - Local X scale. Default: 1.
   * @param scaleY - Local Y scale. Default: 1.
   */
  export declare function setNodeTransform(id: SceneNodeId, x: number, y: number, rotation?: number, scaleX?: number, scaleY?: number): void;
  /**
   * Reparent a node to a new parent.
   *
   * @param childId - The node to reparent.
   * @param parentId - The new parent node ID.
   */
  export declare function setParent(childId: SceneNodeId, parentId: SceneNodeId): void;
  /**
   * Detach a node from its parent, making it a root node.
   *
   * @param childId - The node to detach.
   */
  export declare function detachFromParent(childId: SceneNodeId): void;
  /**
   * Compute the world-space transform by walking the parent chain
   * and composing local transforms.
   *
   * Transform composition order: parent scale -> parent rotation -> parent translation.
   * Each child's local position is scaled and rotated by its parent's world transform.
   *
   * @param id - Node to compute world transform for.
   * @returns World-space transform, or identity if node not found.
   */
  export declare function getWorldTransform(id: SceneNodeId): WorldTransform;
  /**
   * Get the node data for a scene node.
   *
   * @param id - Node ID to look up.
   * @returns The SceneNode, or undefined if not found.
   */
  export declare function getNode(id: SceneNodeId): SceneNode | undefined;
  /**
   * Get the children of a node.
   *
   * @param id - Parent node ID.
   * @returns ReadonlySet of child node IDs, or empty set if not found.
   */
  export declare function getChildren(id: SceneNodeId): ReadonlySet<SceneNodeId>;
  /**
   * Merge a node's world transform into sprite options.
   * Returns a new object with x, y, rotation, w, h adjusted by the world transform.
   *
   * @param nodeId - Scene node whose world transform to apply.
   * @param opts - Sprite options to merge into (must have x, y, w, h).
   * @returns New sprite options with world transform applied.
   */
  export declare function applyToSprite(nodeId: SceneNodeId, opts: {
      x: number;
      y: number;
      w: number;
      h: number;
      rotation?: number;
      [key: string]: unknown;
  }): {
      x: number;
      y: number;
      w: number;
      h: number;
      rotation: number;
      [key: string]: unknown;
  };
  /**
   * Reset the transform system (for testing).
   * Clears all nodes and resets the ID counter.
   */

  /**
   * Widget auto-wiring: capture input once per frame, pass to all widgets.
   * Eliminates the repetitive (mouseX, mouseY, mouseDown, enterPressed) args.
   */
  /**
   * Capture all input state needed for widget updates. Call once per frame.
   * @returns Snapshot of mouse/keyboard state for this frame.
   */
  export declare function captureInput(): FrameInput;
  /**
   * Update a button using captured frame input.
   * @param btn - The button state to update.
   * @param input - Captured frame input from captureInput().
   */
  export declare function autoUpdateButton(btn: ButtonState, input: FrameInput): void;
  /**
   * Update a slider using captured frame input.
   * @param slider - The slider state to update.
   * @param input - Captured frame input from captureInput().
   */
  export declare function autoUpdateSlider(slider: SliderState, input: FrameInput): void;
  /**
   * Update a checkbox using captured frame input.
   * @param cb - The checkbox state to update.
   * @param input - Captured frame input from captureInput().
   */
  export declare function autoUpdateCheckbox(cb: CheckboxState, input: FrameInput): void;
  /**
   * Update focus manager using captured frame input.
   * @param fm - The focus manager state to update.
   * @param input - Captured frame input from captureInput().
   */
  export declare function autoUpdateFocus(fm: FocusManagerState, input: FrameInput): void;

}
