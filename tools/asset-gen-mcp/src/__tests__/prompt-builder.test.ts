import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildPrompt, buildPromptPair, STYLE_PRESETS } from '../prompts.ts';

describe('STYLE_PRESETS', () => {
  it('has all expected preset names', () => {
    assert.ok('pixel_art_16bit' in STYLE_PRESETS);
    assert.ok('pixel_art_8bit' in STYLE_PRESETS);
    assert.ok('hand_drawn' in STYLE_PRESETS);
  });

  it('every preset has required fields', () => {
    for (const [name, preset] of Object.entries(STYLE_PRESETS)) {
      assert.ok(typeof preset.prefix === 'string', `${name}.prefix should be a string`);
      assert.ok(typeof preset.suffix === 'string', `${name}.suffix should be a string`);
      assert.ok(typeof preset.negative === 'string', `${name}.negative should be a string`);
      assert.ok(typeof preset.steps === 'number', `${name}.steps should be a number`);
      assert.ok(typeof preset.cfg === 'number', `${name}.cfg should be a number`);
      assert.ok(preset.steps > 0, `${name}.steps should be positive`);
      assert.ok(preset.cfg >= 0, `${name}.cfg should be non-negative`);
    }
  });

  it('presets have non-empty prefix and suffix', () => {
    for (const [name, preset] of Object.entries(STYLE_PRESETS)) {
      assert.ok(preset.prefix.length > 0, `${name}.prefix should not be empty`);
      assert.ok(preset.suffix.length > 0, `${name}.suffix should not be empty`);
    }
  });

  it('presets have non-empty negative prompts', () => {
    for (const [name, preset] of Object.entries(STYLE_PRESETS)) {
      assert.ok(preset.negative.length > 0, `${name}.negative should not be empty`);
    }
  });
});

describe('buildPrompt', () => {
  it('wraps user description with pixel_art_16bit style markers', () => {
    const result = buildPrompt('a fierce dragon', 'pixel_art_16bit');
    assert.ok(result.includes('pixel art'), 'should include pixel art prefix');
    assert.ok(result.includes('16-bit'), 'should include 16-bit style marker');
    assert.ok(result.includes('a fierce dragon'), 'should include user description');
    assert.ok(result.includes('transparent background'), 'should include suffix');
  });

  it('wraps user description with pixel_art_8bit style markers', () => {
    const result = buildPrompt('a treasure chest', 'pixel_art_8bit');
    assert.ok(result.includes('8-bit'), 'should include 8-bit style marker');
    assert.ok(result.includes('NES palette'), 'should include NES palette');
    assert.ok(result.includes('a treasure chest'), 'should include user description');
  });

  it('wraps user description with hand_drawn style markers', () => {
    const result = buildPrompt('a magic staff', 'hand_drawn');
    assert.ok(result.includes('hand-drawn'), 'should include hand-drawn marker');
    assert.ok(result.includes('a magic staff'), 'should include user description');
    assert.ok(result.includes('flat colors'), 'should include flat colors in suffix');
  });

  it('falls back to pixel_art_16bit for unknown style', () => {
    const result = buildPrompt('a sword', 'nonexistent_style');
    const expected = buildPrompt('a sword', 'pixel_art_16bit');
    assert.equal(result, expected);
  });

  it('inserts description between prefix and suffix', () => {
    const description = 'UNIQUE_MARKER_TEXT';
    const result = buildPrompt(description, 'pixel_art_16bit');
    const preset = STYLE_PRESETS.pixel_art_16bit;

    // The description should appear after the prefix and before the suffix
    const prefixEnd = result.indexOf(description);
    const suffixStart = result.indexOf(preset.suffix);
    assert.ok(prefixEnd >= 0, 'description should be in the result');
    assert.ok(suffixStart >= 0, 'suffix should be in the result');
    assert.ok(prefixEnd < suffixStart, 'description should appear before suffix');

    // And the prefix should be at the start
    assert.ok(result.startsWith(preset.prefix), 'result should start with prefix');
  });
});

describe('buildPromptPair', () => {
  it('returns both prompt and negative strings', () => {
    const result = buildPromptPair('a goblin', 'pixel_art_16bit');
    assert.ok(typeof result.prompt === 'string');
    assert.ok(typeof result.negative === 'string');
  });

  it('prompt matches buildPrompt output', () => {
    const pair = buildPromptPair('a goblin', 'pixel_art_16bit');
    const single = buildPrompt('a goblin', 'pixel_art_16bit');
    assert.equal(pair.prompt, single);
  });

  it('negative prompt comes from the style preset', () => {
    const pair = buildPromptPair('a goblin', 'pixel_art_16bit');
    assert.equal(pair.negative, STYLE_PRESETS.pixel_art_16bit.negative);
  });

  it('negative prompt includes quality filters for pixel art', () => {
    const pair = buildPromptPair('anything', 'pixel_art_16bit');
    assert.ok(pair.negative.includes('blurry'), 'should filter blurry');
    assert.ok(pair.negative.includes('photorealistic'), 'should filter photorealistic');
    assert.ok(pair.negative.includes('watermark'), 'should filter watermark');
  });

  it('hand_drawn negative excludes pixelated', () => {
    const pair = buildPromptPair('anything', 'hand_drawn');
    assert.ok(pair.negative.includes('pixelated'), 'hand_drawn should filter pixelated');
  });

  it('falls back to pixel_art_16bit for unknown style', () => {
    const unknown = buildPromptPair('a sword', 'totally_bogus');
    const fallback = buildPromptPair('a sword', 'pixel_art_16bit');
    assert.deepEqual(unknown, fallback);
  });
});
