/**
 * Style presets and prompt builder for AI image generation.
 *
 * Each preset defines prefix/suffix text that wraps the user description,
 * a negative prompt for quality filtering, and default generation parameters
 * (steps and CFG scale) tuned for fast FLUX-based models.
 */

/** A named style preset that controls prompt construction and generation parameters. */
export interface StylePreset {
  /** Text prepended to the user description. */
  prefix: string;
  /** Text appended after the user description. */
  suffix: string;
  /** Negative prompt for quality filtering. */
  negative: string;
  /** Number of inference steps. */
  steps: number;
  /** Classifier-free guidance scale. */
  cfg: number;
}

/** Built-in style presets for common game art styles. */
export const STYLE_PRESETS: Record<string, StylePreset> = {
  pixel_art_16bit: {
    prefix: 'pixel art, 16-bit style, clean pixels, game asset, ',
    suffix: ', transparent background, no anti-aliasing, limited palette',
    negative: 'blurry, smooth, photorealistic, 3d render, text, watermark',
    steps: 4,
    cfg: 0.0,
  },
  pixel_art_8bit: {
    prefix: 'pixel art, 8-bit style, NES palette, retro game sprite, ',
    suffix: ', transparent background, 4 colors maximum',
    negative: 'detailed, high resolution, smooth gradients',
    steps: 4,
    cfg: 0.0,
  },
  hand_drawn: {
    prefix: 'hand-drawn 2d game art, illustrated, ',
    suffix: ', clean lines, flat colors, game asset',
    negative: 'photorealistic, 3d, pixelated',
    steps: 4,
    cfg: 0.0,
  },
};

/**
 * Build a positive prompt string by wrapping the user description with preset style text.
 *
 * @param description - The user's description of the desired asset.
 * @param style - Style preset name. Falls back to pixel_art_16bit if unknown.
 * @returns The assembled positive prompt string.
 */
export function buildPrompt(description: string, style: string): string {
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.pixel_art_16bit;
  return `${preset.prefix}${description}${preset.suffix}`;
}

/**
 * Build both positive and negative prompt strings for the given description and style.
 *
 * @param description - The user's description of the desired asset.
 * @param style - Style preset name. Falls back to pixel_art_16bit if unknown.
 * @returns Object with `prompt` and `negative` strings.
 */
export function buildPromptPair(description: string, style: string): { prompt: string; negative: string } {
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS.pixel_art_16bit;
  return {
    prompt: `${preset.prefix}${description}${preset.suffix}`,
    negative: preset.negative,
  };
}
