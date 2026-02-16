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
  /** Background color as {r, g, b} in 0-255 range. */
  background?: { r: number; g: number; b: number };
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
