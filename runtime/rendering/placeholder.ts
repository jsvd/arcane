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

import type { TextureId } from "./types.ts";
import { uploadRgbaTexture } from "./texture.ts";

/** Shape type for placeholder sprites. */
export type PlaceholderShape =
  | "circle"
  | "square"
  | "diamond"
  | "triangle"
  | "hexagon"
  | "star";

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

/** Cache of generated placeholder textures by key. */
const placeholderCache = new Map<string, TextureId>();

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
export function placeholder(
  name: string,
  options?: PlaceholderOptions,
): TextureId {
  const shape = options?.shape ?? "square";
  const color = options?.color ?? [0.7, 0.7, 0.7];
  const size = options?.size ?? 32;
  const outline = options?.outline ?? false;
  const outlineColor = options?.outlineColor ?? [
    color[0] * 0.5,
    color[1] * 0.5,
    color[2] * 0.5,
  ];

  // Create cache key from all options
  const key = `__placeholder_${name}_${shape}_${color.join(",")}_${size}_${outline}_${outlineColor.join(",")}`;

  const cached = placeholderCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Generate pixel data
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = Math.floor(color[0] * 255);
  const g = Math.floor(color[1] * 255);
  const b = Math.floor(color[2] * 255);
  const or = Math.floor(outlineColor[0] * 255);
  const og = Math.floor(outlineColor[1] * 255);
  const ob = Math.floor(outlineColor[2] * 255);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const inside = isInsideShape(x, y, cx, cy, size, shape);
      const nearEdge = outline && isNearEdge(x, y, cx, cy, size, shape);

      if (inside) {
        if (nearEdge) {
          pixels[idx] = or;
          pixels[idx + 1] = og;
          pixels[idx + 2] = ob;
          pixels[idx + 3] = 255;
        } else {
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = 255;
        }
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  const texId = uploadRgbaTexture(key, size, size, pixels);
  placeholderCache.set(key, texId);
  return texId;
}

/** Check if a pixel is inside the shape. */
function isInsideShape(
  x: number,
  y: number,
  cx: number,
  cy: number,
  size: number,
  shape: PlaceholderShape,
): boolean {
  const dx = x - cx + 0.5;
  const dy = y - cy + 0.5;
  const radius = size / 2 - 1;

  switch (shape) {
    case "circle": {
      return dx * dx + dy * dy <= radius * radius;
    }
    case "square": {
      return Math.abs(dx) <= radius && Math.abs(dy) <= radius;
    }
    case "diamond": {
      return Math.abs(dx) + Math.abs(dy) <= radius;
    }
    case "triangle": {
      // Equilateral triangle pointing up
      const nx = dx / radius;
      const ny = dy / radius;
      // Triangle with vertices at top, bottom-left, bottom-right
      const inLeft = nx + ny * 1.73 >= -1;
      const inRight = -nx + ny * 1.73 >= -1;
      const inBottom = ny <= 0.7;
      return inLeft && inRight && inBottom;
    }
    case "hexagon": {
      // Regular hexagon (flat-top)
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      return ay <= radius * 0.866 && ax + ay * 0.577 <= radius;
    }
    case "star": {
      // 5-pointed star
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const points = 5;
      const innerRadius = radius * 0.4;
      const starAngle = angle + Math.PI / 2;
      const sector = (starAngle / (Math.PI * 2)) * points * 2;
      const sectorMod = ((sector % 2) + 2) % 2;
      const pointRadius =
        sectorMod < 1
          ? innerRadius + (radius - innerRadius) * (1 - sectorMod)
          : innerRadius + (radius - innerRadius) * (sectorMod - 1);
      return dist <= pointRadius;
    }
    default:
      return false;
  }
}

/** Check if a pixel is near the edge of the shape (for outline). */
function isNearEdge(
  x: number,
  y: number,
  cx: number,
  cy: number,
  size: number,
  shape: PlaceholderShape,
): boolean {
  const borderWidth = Math.max(1, Math.floor(size / 16));

  // Check if any neighbor is outside the shape
  for (let dy = -borderWidth; dy <= borderWidth; dy++) {
    for (let dx = -borderWidth; dx <= borderWidth; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (!isInsideShape(x + dx, y + dy, cx, cy, size, shape)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Pre-defined placeholder palettes for common game object types.
 * Use these as starting points for prototyping.
 */
export const PLACEHOLDER_COLORS = {
  // Characters
  player: [0.2, 0.6, 1.0] as [number, number, number],
  enemy: [1.0, 0.2, 0.2] as [number, number, number],
  npc: [0.2, 0.8, 0.4] as [number, number, number],

  // Environment
  wall: [0.3, 0.3, 0.35] as [number, number, number],
  floor: [0.5, 0.45, 0.4] as [number, number, number],
  water: [0.2, 0.5, 0.9] as [number, number, number],
  grass: [0.3, 0.7, 0.3] as [number, number, number],
  tree: [0.2, 0.5, 0.2] as [number, number, number],
  rock: [0.5, 0.5, 0.5] as [number, number, number],

  // Items
  coin: [1.0, 0.85, 0.0] as [number, number, number],
  gem: [0.9, 0.2, 0.9] as [number, number, number],
  heart: [1.0, 0.3, 0.4] as [number, number, number],
  key: [0.9, 0.75, 0.3] as [number, number, number],
  chest: [0.6, 0.4, 0.2] as [number, number, number],
  potion: [0.4, 0.2, 0.8] as [number, number, number],

  // Effects
  bullet: [1.0, 1.0, 0.5] as [number, number, number],
  explosion: [1.0, 0.6, 0.1] as [number, number, number],
  magic: [0.6, 0.3, 1.0] as [number, number, number],

  // UI
  button: [0.3, 0.5, 0.7] as [number, number, number],
  panel: [0.2, 0.2, 0.25] as [number, number, number],
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
export function quickPlaceholder(
  type: keyof typeof PLACEHOLDER_COLORS,
  options?: Omit<PlaceholderOptions, "color">,
): TextureId {
  const color = PLACEHOLDER_COLORS[type];
  const defaultShape = getDefaultShapeForType(type);
  return placeholder(type, {
    ...options,
    color,
    shape: options?.shape ?? defaultShape,
  });
}

/** Get a sensible default shape for a placeholder type. */
function getDefaultShapeForType(type: string): PlaceholderShape {
  switch (type) {
    case "player":
    case "npc":
    case "coin":
    case "gem":
    case "heart":
    case "potion":
    case "bullet":
    case "explosion":
    case "magic":
      return "circle";
    case "enemy":
      return "diamond";
    case "wall":
    case "floor":
    case "chest":
    case "button":
    case "panel":
      return "square";
    case "tree":
      return "triangle";
    case "key":
    case "star":
      return "star";
    default:
      return "square";
  }
}

/**
 * Clear the placeholder texture cache.
 * Useful for memory management or when regenerating placeholders.
 */
export function clearPlaceholderCache(): void {
  placeholderCache.clear();
}

/**
 * Get the number of cached placeholder textures.
 * Useful for debugging or monitoring memory usage.
 */
export function getPlaceholderCacheSize(): number {
  return placeholderCache.size;
}
