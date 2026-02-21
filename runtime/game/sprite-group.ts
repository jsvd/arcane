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

import type { Color } from "../ui/types.ts";
import type { TextureId } from "../rendering/types.ts";
import { drawColorSprite } from "./color-sprite.ts";
import { drawSprite } from "../rendering/sprites.ts";

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
export function createSpriteGroup(parts: SpritePart[], baseLayer: number = 0): SpriteGroup {
  return {
    parts: parts.map(p => ({ ...p })), // shallow copy each part
    baseLayer,
  };
}

/**
 * Draw all visible parts of a sprite group at the given position.
 *
 * @param group - The sprite group to draw.
 * @param x - Group origin X position in world units.
 * @param y - Group origin Y position in world units.
 * @param opts - Optional flip and opacity overrides.
 */
export function drawSpriteGroup(
  group: SpriteGroup,
  x: number,
  y: number,
  opts?: SpriteGroupDrawOptions,
): void {
  const flipX = opts?.flipX ?? false;
  const groupOpacity = opts?.opacity ?? 1;

  for (const part of group.parts) {
    if (part.visible === false) continue;

    const partLayer = group.baseLayer + (part.layerOffset ?? 0);
    const partOpacity = (part.opacity ?? 1) * groupOpacity;
    const partFlip = flipX && (part.flipWithParent !== false);

    // Compute world position: when flipping, negate offsetX and shift by -part.w
    let partX: number;
    if (flipX && part.flipWithParent !== false) {
      partX = x - part.offsetX - part.w;
    } else {
      partX = x + part.offsetX;
    }
    const partY = y + part.offsetY;

    if (part.textureId !== undefined) {
      drawSprite({
        textureId: part.textureId,
        x: partX,
        y: partY,
        w: part.w,
        h: part.h,
        layer: partLayer,
        flipX: partFlip,
        opacity: partOpacity,
        blendMode: part.blendMode,
      });
    } else if (part.color) {
      drawColorSprite({
        color: part.color,
        x: partX,
        y: partY,
        w: part.w,
        h: part.h,
        layer: partLayer,
        flipX: partFlip,
        opacity: partOpacity,
        blendMode: part.blendMode,
      });
    }
  }
}

/**
 * Find a sprite part by name.
 *
 * @param group - The sprite group to search.
 * @param name - Part name to find.
 * @returns The matching SpritePart, or undefined if not found.
 */
export function getSpritePart(group: SpriteGroup, name: string): SpritePart | undefined {
  return group.parts.find(p => p.name === name);
}

/**
 * Set a part's visibility by name.
 *
 * @param group - The sprite group to modify.
 * @param name - Part name to update.
 * @param visible - Whether the part should be drawn.
 */
export function setPartVisible(group: SpriteGroup, name: string, visible: boolean): void {
  const part = group.parts.find(p => p.name === name);
  if (part) part.visible = visible;
}
