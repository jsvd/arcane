/**
 * Sprite Atlas - Load Asset Palace JSON definitions and draw sprites by name.
 * Handles UV normalization automatically.
 */

import { loadTexture } from "./texture.ts";
import { drawSprite } from "./sprites.ts";
import type { TextureId, SpriteOptions } from "./types.ts";
import type { Color } from "../ui/types.ts";

// --- Asset Palace JSON Types ---

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
  frames: Array<{ x: number; y: number; w?: number; h?: number }>;
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

/** Check if a sprite def is animated. */
function isAnimated(def: SpriteDef): def is AnimatedSpriteDef {
  return "frames" in def;
}

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
export function loadAtlasFromDef(
  def: PackDefinition,
  options: LoadAtlasOptions = {}
): SpriteAtlas {
  const basePath = options.basePath ?? "";
  const sheetPath = basePath + def.primarySheet;
  const textureId = loadTexture(sheetPath);

  const sheetWidth = def.sheetWidth;
  const sheetHeight = def.sheetHeight;

  if (!sheetWidth || !sheetHeight) {
    throw new Error(
      `Atlas "${def.id}": sheetWidth and sheetHeight are required for UV normalization.`
    );
  }

  const tileSize = def.tileSize ?? 16;
  const sprites = def.sprites;
  const tags = def.tags ?? {};

  // Build the atlas object
  const atlas: SpriteAtlas = {
    id: def.id,
    textureId,
    sheetWidth,
    sheetHeight,
    tileSize,
    sprites,
    tags,

    getByTag(tag: string): string[] {
      return tags[tag] ?? [];
    },

    has(name: string): boolean {
      return name in sprites;
    },

    info(name: string): SpriteInfo | null {
      const spriteDef = sprites[name];
      if (!spriteDef) return null;

      if (isAnimated(spriteDef)) {
        const frame = spriteDef.frames[0];
        return {
          w: frame.w ?? tileSize,
          h: frame.h ?? tileSize,
          frames: spriteDef.frames.length,
          fps: spriteDef.fps,
          loop: spriteDef.loop,
        };
      } else {
        return {
          w: spriteDef.w ?? tileSize,
          h: spriteDef.h ?? tileSize,
          frames: 1,
        };
      }
    },

    sprite(name: string, opts: AtlasSpriteOptions): SpriteOptions {
      const spriteDef = sprites[name];
      if (!spriteDef) {
        throw new Error(`Atlas "${def.id}": sprite "${name}" not found`);
      }

      let px: number, py: number, pw: number, ph: number;

      if (isAnimated(spriteDef)) {
        const frameIdx = opts.frame ?? 0;
        const frame = spriteDef.frames[frameIdx % spriteDef.frames.length];
        px = frame.x;
        py = frame.y;
        pw = frame.w ?? tileSize;
        ph = frame.h ?? tileSize;
      } else {
        px = spriteDef.x;
        py = spriteDef.y;
        pw = spriteDef.w ?? tileSize;
        ph = spriteDef.h ?? tileSize;
      }

      // Apply overrides
      const w = opts.w ?? pw;
      const h = opts.h ?? ph;
      const scale = opts.scale ?? 1;

      // Normalize UV coordinates
      const uv = {
        x: px / sheetWidth,
        y: py / sheetHeight,
        w: pw / sheetWidth,
        h: ph / sheetHeight,
      };

      // Build SpriteOptions - center sprite at position
      const result: SpriteOptions = {
        textureId,
        x: opts.x - (w * scale) / 2,
        y: opts.y - (h * scale) / 2,
        w: w * scale,
        h: h * scale,
        uv,
        layer: opts.layer ?? 0,
      };

      if (opts.rotation !== undefined) {
        result.rotation = opts.rotation;
        result.originX = opts.originX ?? 0.5;
        result.originY = opts.originY ?? 0.5;
      }
      if (opts.flipX) result.flipX = true;
      if (opts.flipY) result.flipY = true;
      if (opts.opacity !== undefined) result.opacity = opts.opacity;
      if (opts.tint) {
        result.tint = {
          r: opts.tint.r,
          g: opts.tint.g,
          b: opts.tint.b,
          a: opts.tint.a ?? 1,
        };
      }
      if (opts.blendMode) result.blendMode = opts.blendMode;
      if (opts.screenSpace) result.screenSpace = true;

      return result;
    },

    draw(name: string, opts: AtlasSpriteOptions): void {
      drawSprite(atlas.sprite(name, opts));
    },

    getSpriteNames(): string[] {
      return Object.keys(sprites);
    },

    getTagNames(): string[] {
      return Object.keys(tags);
    },
  };

  return atlas;
}

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
export function createAtlasBuilder(
  textureId: TextureId,
  sheetWidth: number,
  sheetHeight: number
) {
  const sprites: Record<string, SpriteDef> = {};
  const tags: Record<string, string[]> = {};

  return {
    addSprite(name: string, def: StaticSpriteDef): void {
      sprites[name] = def;
    },

    addAnimatedSprite(name: string, def: AnimatedSpriteDef): void {
      sprites[name] = def;
    },

    addTag(tag: string, spriteNames: string[]): void {
      tags[tag] = spriteNames;
    },

    build(id: string = "custom"): SpriteAtlas {
      return loadAtlasFromDef(
        {
          id,
          primarySheet: "", // Not used, texture already loaded
          sheetWidth,
          sheetHeight,
          sprites,
          tags,
        },
        {}
      );
    },
  };
}
