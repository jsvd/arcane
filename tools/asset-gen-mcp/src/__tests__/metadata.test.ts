import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  buildSpriteMetadata,
  buildTilesetMetadata,
  buildSpriteSheetMetadata,
} from '../metadata.ts';
import type {
  SpriteMetadata,
  TilesetMetadata,
  SpriteSheetMetadata,
} from '../metadata.ts';

describe('buildSpriteMetadata', () => {
  it('returns an object with all required fields', () => {
    const meta = buildSpriteMetadata('player_idle', 64, 64, 'assets/sprites/player_idle.png');
    assert.equal(meta.name, 'player_idle');
    assert.equal(meta.width, 64);
    assert.equal(meta.height, 64);
    assert.equal(meta.path, 'assets/sprites/player_idle.png');
  });

  it('preserves exact values passed in', () => {
    const meta = buildSpriteMetadata('goblin', 128, 256, '/tmp/goblin.png');
    assert.equal(meta.name, 'goblin');
    assert.equal(meta.width, 128);
    assert.equal(meta.height, 256);
    assert.equal(meta.path, '/tmp/goblin.png');
  });

  it('has no extra properties beyond the interface', () => {
    const meta = buildSpriteMetadata('test', 32, 32, 'test.png');
    const keys = Object.keys(meta).sort();
    assert.deepEqual(keys, ['height', 'name', 'path', 'width']);
  });

  it('handles non-square dimensions', () => {
    const meta = buildSpriteMetadata('banner', 200, 50, 'banner.png');
    assert.equal(meta.width, 200);
    assert.equal(meta.height, 50);
  });
});

describe('buildTilesetMetadata', () => {
  it('returns an object with all required fields', () => {
    const meta = buildTilesetMetadata('dungeon_walls', 16, 4, 4, 'assets/tilesets/dungeon.png');
    assert.equal(meta.name, 'dungeon_walls');
    assert.equal(meta.tileSize, 16);
    assert.equal(meta.columns, 4);
    assert.equal(meta.rows, 4);
    assert.equal(meta.path, 'assets/tilesets/dungeon.png');
  });

  it('computes totalTiles as columns * rows', () => {
    const meta = buildTilesetMetadata('tiles', 16, 4, 4, 'tiles.png');
    assert.equal(meta.totalTiles, 16);
  });

  it('computes totalTiles correctly for non-square grids', () => {
    const meta = buildTilesetMetadata('tiles', 32, 8, 3, 'tiles.png');
    assert.equal(meta.totalTiles, 24);
  });

  it('computes totalTiles correctly for single row', () => {
    const meta = buildTilesetMetadata('row', 16, 10, 1, 'row.png');
    assert.equal(meta.totalTiles, 10);
  });

  it('computes totalTiles correctly for single column', () => {
    const meta = buildTilesetMetadata('col', 16, 1, 10, 'col.png');
    assert.equal(meta.totalTiles, 10);
  });

  it('has no extra properties beyond the interface', () => {
    const meta = buildTilesetMetadata('test', 16, 4, 4, 'test.png');
    const keys = Object.keys(meta).sort();
    assert.deepEqual(keys, ['columns', 'name', 'path', 'rows', 'tileSize', 'totalTiles']);
  });
});

describe('buildSpriteSheetMetadata', () => {
  it('returns an object with all required fields', () => {
    const meta = buildSpriteSheetMetadata('player_walk', 4, 'walk', 32, 32, 'assets/sprites/walk.png');
    assert.equal(meta.name, 'player_walk');
    assert.equal(meta.frames, 4);
    assert.equal(meta.animation, 'walk');
    assert.equal(meta.frameWidth, 32);
    assert.equal(meta.frameHeight, 32);
    assert.equal(meta.path, 'assets/sprites/walk.png');
  });

  it('computes sheetWidth as frames * frameWidth', () => {
    const meta = buildSpriteSheetMetadata('anim', 6, 'run', 48, 64, 'anim.png');
    assert.equal(meta.sheetWidth, 288); // 6 * 48
  });

  it('sets sheetHeight equal to frameHeight', () => {
    const meta = buildSpriteSheetMetadata('anim', 6, 'run', 48, 64, 'anim.png');
    assert.equal(meta.sheetHeight, 64);
  });

  it('computes correct dimensions for many frames', () => {
    const meta = buildSpriteSheetMetadata('explosion', 16, 'explode', 64, 64, 'explosion.png');
    assert.equal(meta.sheetWidth, 1024); // 16 * 64
    assert.equal(meta.sheetHeight, 64);
    assert.equal(meta.frames, 16);
  });

  it('handles 2-frame minimum animation', () => {
    const meta = buildSpriteSheetMetadata('blink', 2, 'blink', 16, 16, 'blink.png');
    assert.equal(meta.sheetWidth, 32); // 2 * 16
    assert.equal(meta.frames, 2);
  });

  it('has no extra properties beyond the interface', () => {
    const meta = buildSpriteSheetMetadata('test', 4, 'anim', 32, 32, 'test.png');
    const keys = Object.keys(meta).sort();
    assert.deepEqual(keys, [
      'animation', 'frameHeight', 'frameWidth', 'frames',
      'name', 'path', 'sheetHeight', 'sheetWidth',
    ]);
  });
});
