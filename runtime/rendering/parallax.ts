/**
 * Parallax scrolling support.
 *
 * Draw sprites at different scroll speeds to create a depth illusion.
 * Parallax transforms are applied on the CPU side before calling drawSprite(),
 * so no Rust/GPU changes are needed.
 */

import type { SpriteOptions } from "./types.ts";
import { drawSprite } from "./sprites.ts";
import { getCamera } from "./camera.ts";

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
export function drawParallaxSprite(options: ParallaxSpriteOptions): void {
  const cam = getCamera();
  const { parallaxFactor, ...spriteOpts } = options;

  // Offset position based on camera and parallax factor
  // At factor=1, no offset (sprite moves with world normally)
  // At factor=0, sprite is offset by full camera position (appears fixed)
  const offsetX = cam.x * (1 - parallaxFactor);
  const offsetY = cam.y * (1 - parallaxFactor);

  drawSprite({
    ...spriteOpts,
    x: spriteOpts.x + offsetX,
    y: spriteOpts.y + offsetY,
  });
}
