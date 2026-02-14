import { describe, it, assert } from "../testing/harness.ts";
import {
  createIsoTilemap,
  setIsoTile,
  getIsoTile,
  getIsoTileId,
  setIsoTileElevation,
  fillIsoTiles,
  setIsoTileTexture,
  drawIsoTilemap,
  computeIsoAutotile4,
} from "./iso-tilemap.ts";
import type { CameraState } from "./types.ts";

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

describe("createIsoTilemap", () => {
  it("creates tilemap with correct dimensions", () => {
    const tm = createIsoTilemap({ width: 10, height: 8, tileW: 64, tileH: 32 });
    assert.equal(tm.width, 10);
    assert.equal(tm.height, 8);
  });

  it("initializes all tiles as empty", () => {
    const tm = createIsoTilemap({ width: 4, height: 4, tileW: 64, tileH: 32 });
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        assert.equal(getIsoTileId(tm, gx, gy), 0);
      }
    }
  });

  it("stores tile config", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 128, tileH: 64 });
    assert.equal(tm.config.tileW, 128);
    assert.equal(tm.config.tileH, 64);
  });
});

// ---------------------------------------------------------------------------
// Tile access
// ---------------------------------------------------------------------------

describe("setIsoTile / getIsoTile", () => {
  it("sets and gets tile by coordinates", () => {
    const tm = createIsoTilemap({ width: 10, height: 10, tileW: 64, tileH: 32 });
    setIsoTile(tm, 3, 5, 7);
    const tile = getIsoTile(tm, 3, 5);
    assert.ok(tile !== undefined);
    assert.equal(tile!.tileId, 7);
    assert.equal(tile!.elevation, 0);
  });

  it("sets tile with elevation", () => {
    const tm = createIsoTilemap({ width: 10, height: 10, tileW: 64, tileH: 32 });
    setIsoTile(tm, 2, 3, 5, 16);
    const tile = getIsoTile(tm, 2, 3);
    assert.equal(tile!.tileId, 5);
    assert.equal(tile!.elevation, 16);
  });

  it("out of bounds set is no-op", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, -1, 0, 1);
    setIsoTile(tm, 0, -1, 1);
    setIsoTile(tm, 5, 0, 1);
    setIsoTile(tm, 0, 5, 1);
    // No crash, and boundary tiles unchanged
    assert.equal(getIsoTileId(tm, 0, 0), 0);
  });

  it("out of bounds get returns undefined", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    assert.equal(getIsoTile(tm, -1, 0), undefined);
    assert.equal(getIsoTile(tm, 5, 5), undefined);
  });
});

describe("getIsoTileId", () => {
  it("returns tile ID for valid position", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 2, 2, 42);
    assert.equal(getIsoTileId(tm, 2, 2), 42);
  });

  it("returns 0 for out of bounds", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    assert.equal(getIsoTileId(tm, -1, 0), 0);
    assert.equal(getIsoTileId(tm, 10, 10), 0);
  });
});

describe("setIsoTileElevation", () => {
  it("changes elevation without affecting tileId", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 1, 1, 3);
    setIsoTileElevation(tm, 1, 1, 24);
    const tile = getIsoTile(tm, 1, 1);
    assert.equal(tile!.tileId, 3);
    assert.equal(tile!.elevation, 24);
  });

  it("out of bounds is no-op", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTileElevation(tm, -1, 0, 10);
    // No crash
  });
});

// ---------------------------------------------------------------------------
// Fill
// ---------------------------------------------------------------------------

describe("fillIsoTiles", () => {
  it("fills rectangular region", () => {
    const tm = createIsoTilemap({ width: 10, height: 10, tileW: 64, tileH: 32 });
    fillIsoTiles(tm, 2, 3, 5, 6, 9);
    for (let gy = 3; gy < 6; gy++) {
      for (let gx = 2; gx < 5; gx++) {
        assert.equal(getIsoTileId(tm, gx, gy), 9);
      }
    }
    // Outside region still empty
    assert.equal(getIsoTileId(tm, 1, 3), 0);
    assert.equal(getIsoTileId(tm, 5, 3), 0);
  });

  it("fills with elevation", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    fillIsoTiles(tm, 0, 0, 2, 2, 1, 8);
    const tile = getIsoTile(tm, 0, 0);
    assert.equal(tile!.elevation, 8);
  });
});

// ---------------------------------------------------------------------------
// Texture mapping
// ---------------------------------------------------------------------------

describe("setIsoTileTexture", () => {
  it("maps tileId to textureId", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTileTexture(tm, 1, 100);
    assert.equal(tm.textureMap.get(1), 100);
  });

  it("overwrites existing mapping", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTileTexture(tm, 1, 100);
    setIsoTileTexture(tm, 1, 200);
    assert.equal(tm.textureMap.get(1), 200);
  });
});

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

describe("drawIsoTilemap", () => {
  it("does not crash on empty tilemap", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    // No textures mapped, no tiles set — should not throw
    drawIsoTilemap(tm);
  });

  it("does not crash with camera culling", () => {
    const tm = createIsoTilemap({ width: 10, height: 10, tileW: 64, tileH: 32 });
    setIsoTile(tm, 0, 0, 1);
    setIsoTileTexture(tm, 1, 42);
    const cam: CameraState = {
      x: 0, y: 0, zoom: 1,
    };
    drawIsoTilemap(tm, cam);
  });

  it("does not crash with offsets", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 0, 0, 1);
    setIsoTileTexture(tm, 1, 10);
    drawIsoTilemap(tm, undefined, 0, 100, 50);
  });
});

// ---------------------------------------------------------------------------
// Iso auto-tiling
// ---------------------------------------------------------------------------

describe("computeIsoAutotile4", () => {
  it("isolated tile returns 0", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 2, 2, 1);
    assert.equal(computeIsoAutotile4(tm, 2, 2), 0);
  });

  it("surrounded tile returns 15", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 2, 2, 1);
    setIsoTile(tm, 2, 1, 1); // N
    setIsoTile(tm, 3, 2, 1); // E
    setIsoTile(tm, 2, 3, 1); // S
    setIsoTile(tm, 1, 2, 1); // W
    assert.equal(computeIsoAutotile4(tm, 2, 2), 15);
  });

  it("north only returns 1", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 2, 2, 1);
    setIsoTile(tm, 2, 1, 1);
    assert.equal(computeIsoAutotile4(tm, 2, 2), 1);
  });

  it("east and west returns 10", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 2, 2, 1);
    setIsoTile(tm, 3, 2, 1); // E = 2
    setIsoTile(tm, 1, 2, 1); // W = 8
    assert.equal(computeIsoAutotile4(tm, 2, 2), 10);
  });

  it("custom match function", () => {
    const tm = createIsoTilemap({ width: 5, height: 5, tileW: 64, tileH: 32 });
    setIsoTile(tm, 2, 2, 1);
    setIsoTile(tm, 2, 1, 2); // N: different tile type
    setIsoTile(tm, 3, 2, 1); // E: same type
    // Match only same tile type
    const mask = computeIsoAutotile4(tm, 2, 2, (id) => id === 1);
    assert.equal(mask, 2); // Only E
  });
});
