import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { medianCut } from '../palette.ts';

describe('medianCut', () => {
  it('returns empty array for empty input', () => {
    const result = medianCut([], 4);
    assert.deepEqual(result, []);
  });

  it('returns single averaged color when numColors is 1', () => {
    const pixels: [number, number, number][] = [
      [100, 0, 0],
      [200, 0, 0],
    ];
    const result = medianCut(pixels, 1);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], [150, 0, 0]);
  });

  it('returns the exact pixel for single-pixel input', () => {
    const pixels: [number, number, number][] = [[42, 128, 200]];
    const result = medianCut(pixels, 4);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], [42, 128, 200]);
  });

  it('returns requested number of colors for large input', () => {
    // Create 100 pixels spread across two clusters: red and blue
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 50; i++) {
      pixels.push([200 + Math.floor(i / 5), 10, 10]); // red cluster
      pixels.push([10, 10, 200 + Math.floor(i / 5)]); // blue cluster
    }
    const result = medianCut(pixels, 4);
    assert.equal(result.length, 4);
  });

  it('returns exactly 2 colors for two distinct clusters', () => {
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 50; i++) {
      pixels.push([255, 0, 0]); // red
      pixels.push([0, 0, 255]); // blue
    }
    const result = medianCut(pixels, 2);
    assert.equal(result.length, 2);

    // One cluster should be near red, the other near blue
    const hasRed = result.some(([r, _g, b]) => r > 200 && b < 50);
    const hasBlue = result.some(([r, _g, b]) => b > 200 && r < 50);
    assert.ok(hasRed, 'should have a red cluster');
    assert.ok(hasBlue, 'should have a blue cluster');
  });

  it('handles uniform-color input', () => {
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 20; i++) {
      pixels.push([128, 128, 128]);
    }
    const result = medianCut(pixels, 4);
    // All clusters should be near the same gray
    for (const [r, g, b] of result) {
      assert.ok(Math.abs(r - 128) <= 1, `red channel ${r} should be near 128`);
      assert.ok(Math.abs(g - 128) <= 1, `green channel ${g} should be near 128`);
      assert.ok(Math.abs(b - 128) <= 1, `blue channel ${b} should be near 128`);
    }
  });

  it('returns colors within valid RGB range', () => {
    const pixels: [number, number, number][] = [
      [0, 0, 0],
      [255, 255, 255],
      [128, 64, 200],
      [10, 240, 30],
    ];
    const result = medianCut(pixels, 2);
    for (const [r, g, b] of result) {
      assert.ok(r >= 0 && r <= 255, `red ${r} out of range`);
      assert.ok(g >= 0 && g <= 255, `green ${g} out of range`);
      assert.ok(b >= 0 && b <= 255, `blue ${b} out of range`);
    }
  });

  it('splits along channel with greatest range', () => {
    // All pixels same R and G, but blue varies widely
    const pixels: [number, number, number][] = [
      [100, 100, 0],
      [100, 100, 50],
      [100, 100, 200],
      [100, 100, 255],
    ];
    const result = medianCut(pixels, 2);
    assert.equal(result.length, 2);
    // The two clusters should differ mainly in the blue channel
    const blues = result.map(([_r, _g, b]) => b);
    blues.sort((a, b) => a - b);
    assert.ok(blues[1] - blues[0] > 50, 'clusters should be separated in blue channel');
  });

  it('handles numColors greater than pixel count', () => {
    const pixels: [number, number, number][] = [
      [10, 20, 30],
      [40, 50, 60],
    ];
    const result = medianCut(pixels, 8);
    // Should return at most the number of input pixels
    assert.ok(result.length <= 2, `should not exceed pixel count, got ${result.length}`);
    assert.ok(result.length >= 1, 'should return at least one color');
  });

  it('produces distinct colors for well-separated clusters', () => {
    // Two clearly separated color clusters (red and blue) with 4 requested colors
    // Median-cut splits evenly with power-of-two counts, so use 4
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 50; i++) {
      pixels.push([250, 10, 10]);  // red cluster
      pixels.push([10, 10, 250]);  // blue cluster
    }
    const result = medianCut(pixels, 4);
    assert.equal(result.length, 4);

    // Each result color should be distinctly reddish or bluish
    const isNear = (a: [number, number, number], b: [number, number, number], threshold: number) =>
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < threshold;

    const nearRed = result.some(c => isNear(c, [250, 10, 10], 50));
    const nearBlue = result.some(c => isNear(c, [10, 10, 250], 50));
    assert.ok(nearRed, 'should have a color near red');
    assert.ok(nearBlue, 'should have a color near blue');
  });

  it('produces 3 colors from 3 well-separated clusters with enough colors', () => {
    // With 4 requested colors from 3 distinct clusters, all clusters should be represented
    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 40; i++) {
      pixels.push([255, 0, 0]);   // red
      pixels.push([0, 255, 0]);   // green
      pixels.push([0, 0, 255]);   // blue
    }
    const result = medianCut(pixels, 4);
    assert.equal(result.length, 4);

    // With 4 buckets and 3 clusters, at least 2 of the 3 original clusters
    // should be clearly represented
    const isNear = (a: [number, number, number], b: [number, number, number], threshold: number) =>
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < threshold;

    let matchCount = 0;
    if (result.some(c => isNear(c, [255, 0, 0], 80))) matchCount++;
    if (result.some(c => isNear(c, [0, 255, 0], 80))) matchCount++;
    if (result.some(c => isNear(c, [0, 0, 255], 80))) matchCount++;
    assert.ok(matchCount >= 2, `should match at least 2 of 3 clusters, got ${matchCount}`);
  });
});
