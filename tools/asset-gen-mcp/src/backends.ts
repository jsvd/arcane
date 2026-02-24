/**
 * Backend detection and generation interface for local AI image generation.
 *
 * Supports three backends:
 *   - Draw Things (macOS app with HTTP API)
 *   - ComfyUI (node-based UI with REST API)
 *   - DiffusionKit CLI (command-line tool)
 *
 * Each backend implements the GenerationBackend interface so the MCP server
 * can use whichever is available without caring about the underlying tool.
 */

import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

/** Common interface for all image generation backends. */
export interface GenerationBackend {
  /** Human-readable backend name. */
  name: string;
  /** Check whether this backend is currently reachable/installed. */
  available(): Promise<boolean>;
  /** Generate an image and write it to outputPath. */
  generate(
    prompt: string,
    negative: string,
    width: number,
    height: number,
    steps: number,
    cfg: number,
    outputPath: string,
  ): Promise<void>;
}

/**
 * Create a Draw Things backend that communicates via its Automatic1111-compatible HTTP API.
 *
 * @param baseUrl - Draw Things API URL. Default: http://127.0.0.1:7860
 * @returns A GenerationBackend for Draw Things.
 */
export function drawThingsBackend(baseUrl = 'http://127.0.0.1:7860'): GenerationBackend {
  return {
    name: 'draw-things',
    async available() {
      try {
        const res = await fetch(`${baseUrl}/sdapi/v1/sd-models`, {
          signal: AbortSignal.timeout(1000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    async generate(prompt, negative, width, height, steps, cfg, outputPath) {
      const res = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: negative,
          width,
          height,
          steps,
          cfg_scale: cfg,
        }),
      });
      if (!res.ok) throw new Error(`Draw Things API error: ${res.status}`);
      const data = (await res.json()) as { images: string[] };
      const buffer = Buffer.from(data.images[0], 'base64');
      await writeFile(outputPath, buffer);
    },
  };
}

/**
 * Create a ComfyUI backend that submits workflows via its REST API.
 *
 * @param baseUrl - ComfyUI API URL. Default: http://127.0.0.1:8188
 * @returns A GenerationBackend for ComfyUI.
 */
export function comfyUIBackend(baseUrl = 'http://127.0.0.1:8188'): GenerationBackend {
  return {
    name: 'comfyui',
    async available() {
      try {
        const res = await fetch(`${baseUrl}/system_stats`, {
          signal: AbortSignal.timeout(1000),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    async generate(prompt, negative, width, height, steps, cfg, outputPath) {
      // Build a minimal txt2img workflow for ComfyUI
      const workflow = {
        '1': {
          class_type: 'KSampler',
          inputs: {
            seed: Math.floor(Math.random() * 2 ** 32),
            steps,
            cfg,
            sampler_name: 'euler',
            scheduler: 'normal',
            denoise: 1.0,
            model: ['2', 0],
            positive: ['3', 0],
            negative: ['4', 0],
            latent_image: ['5', 0],
          },
        },
        '2': {
          class_type: 'CheckpointLoaderSimple',
          inputs: { ckpt_name: 'flux1-schnell.safetensors' },
        },
        '3': {
          class_type: 'CLIPTextEncode',
          inputs: { text: prompt, clip: ['2', 1] },
        },
        '4': {
          class_type: 'CLIPTextEncode',
          inputs: { text: negative, clip: ['2', 1] },
        },
        '5': {
          class_type: 'EmptyLatentImage',
          inputs: { width, height, batch_size: 1 },
        },
        '6': {
          class_type: 'VAEDecode',
          inputs: { samples: ['1', 0], vae: ['2', 2] },
        },
        '7': {
          class_type: 'SaveImage',
          inputs: { filename_prefix: 'arcane_gen', images: ['6', 0] },
        },
      };

      const res = await fetch(`${baseUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
      });
      if (!res.ok) throw new Error(`ComfyUI API error: ${res.status}`);
      const { prompt_id } = (await res.json()) as { prompt_id: string };

      // Poll for completion with 2 minute timeout
      let attempts = 0;
      while (attempts < 120) {
        await new Promise((r) => setTimeout(r, 1000));
        const histRes = await fetch(`${baseUrl}/history/${prompt_id}`);
        const hist = (await histRes.json()) as Record<string, any>;
        if (hist[prompt_id]?.outputs?.['7']?.images?.[0]) {
          const img = hist[prompt_id].outputs['7'].images[0];
          const imgRes = await fetch(
            `${baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`,
          );
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          await writeFile(outputPath, imgBuf);
          return;
        }
        attempts++;
      }
      throw new Error('ComfyUI generation timed out');
    },
  };
}

/**
 * Create a DiffusionKit CLI backend that shells out to the diffusionkit-cli command.
 *
 * @returns A GenerationBackend for DiffusionKit CLI.
 */
export function diffusionKitBackend(): GenerationBackend {
  return {
    name: 'diffusionkit-cli',
    async available() {
      return new Promise((resolve) => {
        execFile('which', ['diffusionkit-cli'], (err) => resolve(!err));
      });
    },
    async generate(prompt, negative, width, height, steps, cfg, outputPath) {
      return new Promise((resolve, reject) => {
        execFile(
          'diffusionkit-cli',
          [
            '--prompt',
            prompt,
            '--negative-prompt',
            negative,
            '--width',
            String(width),
            '--height',
            String(height),
            '--step',
            String(steps),
            '--cfg',
            String(cfg),
            '--output',
            outputPath,
          ],
          { timeout: 60000 },
          (err) => (err ? reject(err) : resolve()),
        );
      });
    },
  };
}

/**
 * Detect all available backends, returning those that respond.
 *
 * @returns Array of available GenerationBackend instances.
 */
export async function detectBackends(): Promise<GenerationBackend[]> {
  const all = [drawThingsBackend(), comfyUIBackend(), diffusionKitBackend()];
  const results: GenerationBackend[] = [];
  for (const backend of all) {
    if (await backend.available()) {
      results.push(backend);
    }
  }
  return results;
}

/**
 * Get the first available backend, or throw with install instructions.
 *
 * @returns The first available GenerationBackend.
 * @throws Error if no backends are available.
 */
export async function getBackend(): Promise<GenerationBackend> {
  const available = await detectBackends();
  if (available.length === 0) {
    throw new Error(
      'No image generation backend found. Install one of:\n' +
        '  - Draw Things (App Store, free) -- launch the app\n' +
        '  - ComfyUI (brew install comfyui) -- start with comfyui --listen\n' +
        '  - DiffusionKit CLI (pip install diffusionkit)',
    );
  }
  return available[0];
}
