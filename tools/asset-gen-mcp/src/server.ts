#!/usr/bin/env node
// @ts-nocheck - Standalone MCP tool with external dependencies not available in test environment
/**
 * Arcane Asset Gen MCP Server
 *
 * A Model Context Protocol server that wraps local AI image generation backends
 * (Draw Things, ComfyUI, DiffusionKit CLI) to produce sprites, tilesets, and
 * sprite sheets for Arcane game projects.
 *
 * Provides five MCP tools:
 *   - generate_sprite: Single sprite image from a text description
 *   - generate_tileset: Grid-based tileset sheet
 *   - generate_sprite_sheet: Horizontal animation strip
 *   - extract_palette: Color palette extraction from an existing image
 *   - concept_to_assets: High-level batch generation from a concept description
 *
 * Usage:
 *   node --experimental-strip-types src/server.ts
 *
 * The server communicates over stdio using the MCP protocol.
 * Requires @modelcontextprotocol/sdk and sharp to be installed.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { getBackend } from './backends.js';
import { buildPromptPair, STYLE_PRESETS } from './prompts.js';
import { extractPalette } from './palette.js';
import {
  buildSpriteMetadata,
  buildTilesetMetadata,
  buildSpriteSheetMetadata,
} from './metadata.js';

const server = new McpServer({
  name: 'arcane-asset-gen',
  version: '0.1.0',
});

const styleEnum = z
  .enum(['pixel_art_16bit', 'pixel_art_8bit', 'hand_drawn'])
  .default('pixel_art_16bit')
  .describe('Art style preset');

// ---------------------------------------------------------------------------
// Tool: generate_sprite
// ---------------------------------------------------------------------------
server.tool(
  'generate_sprite',
  'Generate a single sprite image from a text description using a local AI backend.',
  {
    description: z.string().describe('What the sprite should depict, e.g. "a warrior holding a sword"'),
    name: z.string().describe('Asset name used for the output filename, e.g. "player_idle"'),
    width: z.number().int().min(16).max(2048).default(64).describe('Output width in pixels'),
    height: z.number().int().min(16).max(2048).default(64).describe('Output height in pixels'),
    style: styleEnum,
    outputDir: z.string().default('assets/sprites').describe('Directory to write the output file'),
  },
  async ({ description, name, width, height, style, outputDir }: { description: string; name: string; width: number; height: number; style: string; outputDir: string }) => {
    const backend = await getBackend();
    const { prompt, negative } = buildPromptPair(description, style);
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.pixel_art_16bit;

    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${name}.png`);

    await backend.generate(prompt, negative, width, height, preset.steps, preset.cfg, outputPath);

    const metadata = buildSpriteMetadata(name, width, height, outputPath);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Tool: generate_tileset
// ---------------------------------------------------------------------------
server.tool(
  'generate_tileset',
  'Generate a tileset sheet (grid of tiles) from a text description.',
  {
    description: z.string().describe('What the tiles should depict, e.g. "stone dungeon walls and floors"'),
    name: z.string().describe('Asset name for the output filename'),
    tileSize: z.number().int().min(8).max(256).default(16).describe('Tile size in pixels (tiles are square)'),
    columns: z.number().int().min(1).max(32).default(4).describe('Number of tile columns'),
    rows: z.number().int().min(1).max(32).default(4).describe('Number of tile rows'),
    style: styleEnum,
    outputDir: z.string().default('assets/tilesets').describe('Directory to write the output file'),
  },
  async ({ description, name, tileSize, columns, rows, style, outputDir }: { description: string; name: string; tileSize: number; columns: number; rows: number; style: string; outputDir: string }) => {
    const backend = await getBackend();
    const tilesetDesc = `${description}, tileset grid, ${columns}x${rows} tiles, seamless`;
    const { prompt, negative } = buildPromptPair(tilesetDesc, style);
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.pixel_art_16bit;

    const sheetWidth = tileSize * columns;
    const sheetHeight = tileSize * rows;

    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${name}.png`);

    await backend.generate(prompt, negative, sheetWidth, sheetHeight, preset.steps, preset.cfg, outputPath);

    const metadata = buildTilesetMetadata(name, tileSize, columns, rows, outputPath);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Tool: generate_sprite_sheet
// ---------------------------------------------------------------------------
server.tool(
  'generate_sprite_sheet',
  'Generate a horizontal sprite sheet (animation frames) from a text description.',
  {
    description: z.string().describe('What the animation should show, e.g. "character walking cycle"'),
    name: z.string().describe('Asset name for the output filename'),
    animation: z.string().describe('Animation name for createAnimation(), e.g. "walk"'),
    frames: z.number().int().min(2).max(32).default(4).describe('Number of animation frames'),
    frameWidth: z.number().int().min(8).max(512).default(32).describe('Width of each frame in pixels'),
    frameHeight: z.number().int().min(8).max(512).default(32).describe('Height of each frame in pixels'),
    style: styleEnum,
    outputDir: z.string().default('assets/sprites').describe('Directory to write the output file'),
  },
  async ({ description, name, animation, frames, frameWidth, frameHeight, style, outputDir }: { description: string; name: string; animation: string; frames: number; frameWidth: number; frameHeight: number; style: string; outputDir: string }) => {
    const backend = await getBackend();
    const sheetDesc = `${description}, sprite sheet, ${frames} frames, horizontal strip, animation sequence`;
    const { prompt, negative } = buildPromptPair(sheetDesc, style);
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.pixel_art_16bit;

    const sheetWidth = frameWidth * frames;

    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${name}.png`);

    await backend.generate(prompt, negative, sheetWidth, frameHeight, preset.steps, preset.cfg, outputPath);

    const metadata = buildSpriteSheetMetadata(name, frames, animation, frameWidth, frameHeight, outputPath);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Tool: extract_palette
// ---------------------------------------------------------------------------
server.tool(
  'extract_palette',
  'Extract a color palette from an existing image file using median-cut quantization.',
  {
    imagePath: z.string().describe('Path to the source image file'),
    numColors: z.number().int().min(1).max(64).default(8).describe('Number of palette colors to extract'),
  },
  async ({ imagePath, numColors }: { imagePath: string; numColors: number }) => {
    const imageBuffer = await readFile(imagePath);
    const colors = await extractPalette(imageBuffer, numColors);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ imagePath, numColors, colors }, null, 2),
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Tool: concept_to_assets
// ---------------------------------------------------------------------------
server.tool(
  'concept_to_assets',
  'Generate a full set of game assets from a high-level concept description. Produces a player sprite, an enemy sprite, and a tileset.',
  {
    concept: z.string().describe('High-level game concept, e.g. "medieval fantasy dungeon crawler"'),
    style: styleEnum,
    outputDir: z.string().default('assets').describe('Root output directory'),
  },
  async ({ concept, style, outputDir }: { concept: string; style: string; outputDir: string }) => {
    const backend = await getBackend();
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.pixel_art_16bit;

    const spritesDir = join(outputDir, 'sprites');
    const tilesetsDir = join(outputDir, 'tilesets');
    await mkdir(spritesDir, { recursive: true });
    await mkdir(tilesetsDir, { recursive: true });

    // Generate player sprite
    const playerPrompt = buildPromptPair(`${concept}, player character, front-facing, idle pose`, style);
    const playerPath = join(spritesDir, 'player.png');
    await backend.generate(playerPrompt.prompt, playerPrompt.negative, 64, 64, preset.steps, preset.cfg, playerPath);

    // Generate enemy sprite
    const enemyPrompt = buildPromptPair(`${concept}, enemy creature, menacing, front-facing`, style);
    const enemyPath = join(spritesDir, 'enemy.png');
    await backend.generate(enemyPrompt.prompt, enemyPrompt.negative, 64, 64, preset.steps, preset.cfg, enemyPath);

    // Generate tileset
    const tilePrompt = buildPromptPair(`${concept}, environment tiles, tileset grid, 4x4 tiles, seamless`, style);
    const tilesPath = join(tilesetsDir, 'environment.png');
    await backend.generate(tilePrompt.prompt, tilePrompt.negative, 64, 64, preset.steps, preset.cfg, tilesPath);

    const results = {
      player: buildSpriteMetadata('player', 64, 64, playerPath),
      enemy: buildSpriteMetadata('enemy', 64, 64, enemyPath),
      tileset: buildTilesetMetadata('environment', 16, 4, 4, tilesPath),
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  },
);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
