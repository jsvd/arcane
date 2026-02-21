/**
 * Convenience layer types for the Arcane game module.
 */

import type { Color } from "../ui/types.ts";
import type { SpriteOptions, TextureId } from "../rendering/types.ts";
import type { BodyId, BodyDef, Contact } from "../physics/types.ts";

// --- Color Sprite ---

/** Sprite options with inline color instead of textureId. */
export type ColorSpriteOptions = Omit<SpriteOptions, "textureId"> & {
  /** Color to render. Auto-creates and caches a solid texture internally. */
  color: Color;
  /** Optional textureId override. If set, color is ignored. */
  textureId?: TextureId;
};

// --- HUD ---

/** Options for hud.text(). All optional with sensible defaults. */
export type HUDTextOptions = {
  /** Text tint color. Default: Colors.WHITE */
  tint?: { r: number; g: number; b: number; a: number };
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

// --- Sprite Group ---

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

// --- Platformer ---

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

// --- Widgets ---

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

// --- Collision ---

/** Callback invoked when a collision contact is detected. */
export type CollisionCallback = (contact: Contact) => void;

/** Collision event registry. Create with createCollisionRegistry(). */
export type CollisionRegistry = {
  /** @internal */ _bodyCallbacks: Map<BodyId, CollisionCallback[]>;
  /** @internal */ _pairCallbacks: Map<string, CollisionCallback[]>;
};

// --- Entity ---

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

// --- Game Bootstrap ---

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
  /** Background color with 0.0-1.0 float components. Use rgb() to create from 0-255 values. */
  background?: { r: number; g: number; b: number };
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
};

/** Context passed to the frame callback. */
export type GameContext = {
  /** Delta time in seconds since last frame. */
  readonly dt: number;
  /** Viewport dimensions in screen pixels. */
  readonly viewport: { readonly width: number; readonly height: number };
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
  describe?: (state: S, opts: { verbosity?: string; path?: string }) => string;
  /** Optional named actions for agent interaction. */
  actions?: Record<string, {
    handler: (state: S, args: Record<string, unknown>) => S;
    description: string;
    args?: Array<{ name: string; type: string; description?: string }>;
  }>;
};

/** Object returned by createGame(). */
export type Game = {
  /** Register the per-frame update+render callback. */
  onFrame: (callback: FrameCallback) => void;
  /** Wire up game state for agent protocol integration. */
  state: <S>(config: GameStateConfig<S>) => void;
};
