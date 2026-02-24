/**
 * Color palette extraction using median-cut quantization.
 *
 * The medianCut function is pure TypeScript with no dependencies.
 * The extractPalette function wraps it with sharp for image decoding.
 */

/**
 * Extract dominant colors from raw pixel data using median-cut quantization.
 *
 * Recursively splits the pixel set along the RGB channel with the greatest
 * range, producing the requested number of representative colors.
 *
 * @param pixels - Array of [R, G, B] tuples (0-255 each).
 * @param numColors - Desired number of output colors.
 * @returns Array of [R, G, B] tuples representing the palette.
 */
export function medianCut(
  pixels: [number, number, number][],
  numColors: number,
): [number, number, number][] {
  if (pixels.length === 0) return [];

  if (numColors <= 1) {
    // Average all pixels into a single representative color
    const avg: [number, number, number] = [0, 0, 0];
    for (const p of pixels) {
      avg[0] += p[0];
      avg[1] += p[1];
      avg[2] += p[2];
    }
    return [
      [
        Math.round(avg[0] / pixels.length),
        Math.round(avg[1] / pixels.length),
        Math.round(avg[2] / pixels.length),
      ],
    ];
  }

  if (pixels.length <= numColors) {
    return pixels.slice(0, numColors);
  }

  // Find the RGB channel with the greatest range
  let maxRange = 0;
  let splitChannel = 0;
  for (let ch = 0; ch < 3; ch++) {
    let min = 255;
    let max = 0;
    for (const p of pixels) {
      if (p[ch] < min) min = p[ch];
      if (p[ch] > max) max = p[ch];
    }
    const range = max - min;
    if (range > maxRange) {
      maxRange = range;
      splitChannel = ch;
    }
  }

  // Sort by the channel with greatest range and split at the median
  pixels.sort((a, b) => a[splitChannel] - b[splitChannel]);
  const mid = Math.floor(pixels.length / 2);
  const left = pixels.slice(0, mid);
  const right = pixels.slice(mid);

  const leftColors = Math.floor(numColors / 2);
  const rightColors = numColors - leftColors;

  return [...medianCut(left, leftColors), ...medianCut(right, rightColors)];
}

/**
 * Extract a color palette from an image buffer.
 *
 * Uses sharp for image decoding and downscaling, then runs median-cut
 * quantization to find dominant colors. Results are sorted by frequency.
 *
 * @param imageBuffer - Raw image file data (PNG, JPEG, etc.).
 * @param numColors - Number of palette colors to extract.
 * @returns Array of hex color strings (e.g. "#ff8800").
 */
export async function extractPalette(
  imageBuffer: Buffer,
  numColors: number,
): Promise<string[]> {
  // Dynamic import sharp so the module is loadable even without sharp installed
  // @ts-expect-error sharp may not have types installed in all environments
  const sharp = (await import('sharp')).default;

  const { data, info } = await sharp(imageBuffer)
    .resize(32, 32, { kernel: 'nearest' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    // Skip transparent pixels in RGBA images
    if (info.channels === 4 && data[i + 3] < 128) continue;
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  if (pixels.length === 0) return [];

  const clusters = medianCut(pixels, numColors);

  // Sort by frequency (approximate by counting nearby pixels within Manhattan distance)
  const counts = clusters.map((cluster) => {
    let count = 0;
    for (const p of pixels) {
      const dist =
        Math.abs(p[0] - cluster[0]) +
        Math.abs(p[1] - cluster[1]) +
        Math.abs(p[2] - cluster[2]);
      if (dist < 50) count++;
    }
    return { cluster, count };
  });
  counts.sort((a, b) => b.count - a.count);

  return counts.map(
    ({ cluster: [r, g, b] }) =>
      '#' +
      [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join(''),
  );
}
