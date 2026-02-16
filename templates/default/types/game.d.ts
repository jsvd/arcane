// Arcane Engine — Game Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/game

declare module "@arcane/runtime/game" {
  /**
   * Convenience layer types for the Arcane game module.
   */
  /** Sprite options with inline color instead of textureId. */
  export type ColorSpriteOptions = Omit<SpriteOptions, "textureId"> & {
      /** Color to render. Auto-creates and caches a solid texture internally. */
      color: Color;
      /** Optional textureId override. If set, color is ignored. */
      textureId?: TextureId;
  };
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
  };
  /** Options for hud.bar(). All optional with sensible defaults. */
  export type HUDBarOptions = {
      /** Bar width in screen pixels. Default: 80. */
      width?: number;
      /** Bar height in screen pixels. Default: 12. */
      height?: number;
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
      /** Auto-center camera on viewport? Default: true. */
      autoCamera?: boolean;
      /** Camera zoom level. Default: 1. */
      zoom?: number;
      /** Auto-clear sprites each frame? Default: true. */
      autoClear?: boolean;
      /** Background color as {r, g, b} in 0-255 range. */
      background?: {
          r: number;
          g: number;
          b: number;
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
   * Draw sprites with inline color — no manual createSolidTexture() needed.
   *
   * Internally caches solid textures by RGBA value so repeated calls
   * with the same color reuse the same GPU texture.
   */
  /**
   * Draw a sprite using an inline color instead of a pre-created texture.
   * Textures are cached by color value — safe to call every frame.
   *
   * @param opts - Sprite options with `color` instead of `textureId`.
   *
   * @example
   * drawColorSprite({
   *   color: { r: 1, g: 0, b: 0, a: 1 },
   *   x: 100, y: 200, w: 32, h: 32,
   *   layer: 1,
   * });
   */
  export declare function drawColorSprite(opts: ColorSpriteOptions): void;
  /** @internal Reset color texture cache (for tests). */
  export declare function _resetColorTexCache(): void;

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
   *   sprite: { color: { r: 0, g: 0.5, b: 1, a: 1 }, w: 32, h: 32 },
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
   * - Auto-centering the camera on the viewport (web-like top-left origin)
   * - Setting background color
   * - Wiring up agent protocol for AI interaction
   *
   * @example
   * const game = createGame({ name: "my-game", background: { r: 30, g: 30, b: 50 } });
   * game.onFrame((ctx) => {
   *   drawSprite({ textureId: tex, x: 100, y: 100, w: 32, h: 32 });
   * });
   */
  /**
   * Create a game instance with sensible defaults for the frame loop.
   *
   * Defaults:
   * - `autoClear: true` -- clears all sprites at the start of each frame.
   * - `autoCamera: true` -- on the first frame, sets the camera so (0,0) is top-left.
   * - `zoom: 1` -- default zoom level.
   *
   * If `background` is provided (0-255 RGB), converts to 0.0-1.0 and calls setBackgroundColor().
   *
   * @param config - Optional configuration. All fields have sensible defaults.
   * @returns A Game object with `onFrame()` and `state()` methods.
   *
   * @example
   * const game = createGame({
   *   name: "dungeon-crawler",
   *   background: { r: 20, g: 12, b: 28 },
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
  };

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
