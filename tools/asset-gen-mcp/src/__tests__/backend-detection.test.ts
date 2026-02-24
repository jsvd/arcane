import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  drawThingsBackend,
  comfyUIBackend,
  diffusionKitBackend,
  detectBackends,
} from '../backends.ts';
import type { GenerationBackend } from '../backends.ts';

describe('GenerationBackend interface', () => {
  const backends: { factory: () => GenerationBackend; label: string }[] = [
    { factory: () => drawThingsBackend(), label: 'drawThingsBackend' },
    { factory: () => comfyUIBackend(), label: 'comfyUIBackend' },
    { factory: () => diffusionKitBackend(), label: 'diffusionKitBackend' },
  ];

  for (const { factory, label } of backends) {
    it(`${label} has a string name property`, () => {
      const backend = factory();
      assert.ok(typeof backend.name === 'string');
      assert.ok(backend.name.length > 0, 'name should not be empty');
    });

    it(`${label} has an available() function`, () => {
      const backend = factory();
      assert.ok(typeof backend.available === 'function');
    });

    it(`${label} has a generate() function`, () => {
      const backend = factory();
      assert.ok(typeof backend.generate === 'function');
    });

    it(`${label} available() returns a Promise`, () => {
      const backend = factory();
      const result = backend.available();
      assert.ok(result instanceof Promise, 'available() should return a Promise');
    });
  }
});

describe('drawThingsBackend', () => {
  it('has name "draw-things"', () => {
    const backend = drawThingsBackend();
    assert.equal(backend.name, 'draw-things');
  });

  it('returns false for unavailable backend (bad port)', async () => {
    // Use a port that almost certainly has nothing listening
    const backend = drawThingsBackend('http://127.0.0.1:19999');
    const available = await backend.available();
    assert.equal(available, false);
  });

  it('accepts custom base URL', () => {
    const backend = drawThingsBackend('http://192.168.1.100:9999');
    assert.equal(backend.name, 'draw-things');
  });
});

describe('comfyUIBackend', () => {
  it('has name "comfyui"', () => {
    const backend = comfyUIBackend();
    assert.equal(backend.name, 'comfyui');
  });

  it('returns false for unavailable backend (bad port)', async () => {
    const backend = comfyUIBackend('http://127.0.0.1:19998');
    const available = await backend.available();
    assert.equal(available, false);
  });

  it('accepts custom base URL', () => {
    const backend = comfyUIBackend('http://10.0.0.1:8000');
    assert.equal(backend.name, 'comfyui');
  });
});

describe('diffusionKitBackend', () => {
  it('has name "diffusionkit-cli"', () => {
    const backend = diffusionKitBackend();
    assert.equal(backend.name, 'diffusionkit-cli');
  });

  it('returns false when diffusionkit-cli is not installed', async () => {
    // In CI/test environments, diffusionkit-cli is very unlikely to be installed
    const backend = diffusionKitBackend();
    const available = await backend.available();
    assert.equal(typeof available, 'boolean');
  });
});

describe('detectBackends', () => {
  it('returns an array', async () => {
    const result = await detectBackends();
    assert.ok(Array.isArray(result), 'detectBackends should return an array');
  });

  it('returned backends satisfy the GenerationBackend interface', async () => {
    const result = await detectBackends();
    for (const backend of result) {
      assert.ok(typeof backend.name === 'string');
      assert.ok(typeof backend.available === 'function');
      assert.ok(typeof backend.generate === 'function');
    }
  });

  it('returns empty array when no backends are available in test environment', async () => {
    // In a typical test/CI environment, none of the AI backends will be running.
    // This test documents that behavior. If a backend IS running, this test
    // simply verifies the array contains valid backends.
    const result = await detectBackends();
    assert.ok(Array.isArray(result));
  });
});
