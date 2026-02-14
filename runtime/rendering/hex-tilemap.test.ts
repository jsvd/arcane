import { describe, it, assert } from "../testing/harness.ts";
import {
  createHexTilemap,
  setHexTile,
  getHexTile,
  getHexTileId,
  fillHexTiles,
  setHexTileTexture,
  drawHexTilemap,
  hexTilemapToCube,
  hexTilemapFromCube,
  getHexTileAtCube,
  setHexTileAtCube,
  computeHexTilemapAutotile,
} from "./hex-tilemap.ts";
import { hex, hexEqual } from "./hex.ts";
import type { CameraState } from "./types.ts";

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

describe("createHexTilemap", () => {
  it("creates tilemap with correct dimensions", () => {
    const tm = createHexTilemap({ width: 10, height: 8, hexSize: 32, orientation: "pointy" });
    assert.equal(tm.width, 10);
    assert.equal(tm.height, 8);
  });

  it("initializes all tiles as empty", () => {
    const tm = createHexTilemap({ width: 4, height: 4, hexSize: 24, orientation: "pointy" });
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        assert.equal(getHexTileId(tm, col, row), 0);
      }
    }
  });

  it("pointy-top uses odd-r offset", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    assert.equal(tm.offsetType, "odd-r");
  });

  it("flat-top uses odd-q offset", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "flat" });
    assert.equal(tm.offsetType, "odd-q");
  });

  it("stores hex config", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 48, orientation: "flat" });
    assert.equal(tm.config.hexSize, 48);
    assert.equal(tm.config.orientation, "flat");
  });
});

// ---------------------------------------------------------------------------
// Tile access
// ---------------------------------------------------------------------------

describe("setHexTile / getHexTile", () => {
  it("sets and gets tile", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    setHexTile(tm, 3, 5, 7);
    const tile = getHexTile(tm, 3, 5);
    assert.ok(tile !== undefined);
    assert.equal(tile!.tileId, 7);
  });

  it("out of bounds set is no-op", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    setHexTile(tm, -1, 0, 1);
    setHexTile(tm, 0, -1, 1);
    setHexTile(tm, 5, 0, 1);
    setHexTile(tm, 0, 5, 1);
    assert.equal(getHexTileId(tm, 0, 0), 0);
  });

  it("out of bounds get returns undefined", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    assert.equal(getHexTile(tm, -1, 0), undefined);
    assert.equal(getHexTile(tm, 5, 5), undefined);
  });
});

describe("getHexTileId", () => {
  it("returns tile ID for valid position", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    setHexTile(tm, 2, 2, 42);
    assert.equal(getHexTileId(tm, 2, 2), 42);
  });

  it("returns 0 for out of bounds", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    assert.equal(getHexTileId(tm, -1, 0), 0);
    assert.equal(getHexTileId(tm, 10, 10), 0);
  });
});

// ---------------------------------------------------------------------------
// Fill
// ---------------------------------------------------------------------------

describe("fillHexTiles", () => {
  it("fills rectangular region", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    fillHexTiles(tm, 2, 3, 5, 6, 9);
    for (let row = 3; row < 6; row++) {
      for (let col = 2; col < 5; col++) {
        assert.equal(getHexTileId(tm, col, row), 9);
      }
    }
    assert.equal(getHexTileId(tm, 1, 3), 0);
    assert.equal(getHexTileId(tm, 5, 3), 0);
  });
});

// ---------------------------------------------------------------------------
// Texture mapping
// ---------------------------------------------------------------------------

describe("setHexTileTexture", () => {
  it("maps tileId to textureId", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    setHexTileTexture(tm, 1, 100);
    assert.equal(tm.textureMap.get(1), 100);
  });
});

// ---------------------------------------------------------------------------
// Cube coordinate helpers
// ---------------------------------------------------------------------------

describe("hexTilemapToCube / hexTilemapFromCube", () => {
  it("round-trips pointy-top", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    const cube = hexTilemapToCube(tm, 3, 4);
    const back = hexTilemapFromCube(tm, cube);
    assert.equal(back.col, 3);
    assert.equal(back.row, 4);
  });

  it("round-trips flat-top", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "flat" });
    const cube = hexTilemapToCube(tm, 5, 2);
    const back = hexTilemapFromCube(tm, cube);
    assert.equal(back.col, 5);
    assert.equal(back.row, 2);
  });
});

describe("getHexTileAtCube / setHexTileAtCube", () => {
  it("sets and gets tile via cube coords", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    const target = hex(2, 3);
    setHexTileAtCube(tm, target, 15);
    assert.equal(getHexTileAtCube(tm, target), 15);
  });

  it("returns 0 for empty tile at cube coords", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    assert.equal(getHexTileAtCube(tm, hex(0, 0)), 0);
  });
});

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

describe("drawHexTilemap", () => {
  it("does not crash on empty tilemap (pointy)", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    drawHexTilemap(tm);
  });

  it("does not crash on empty tilemap (flat)", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "flat" });
    drawHexTilemap(tm);
  });

  it("does not crash with camera culling", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    setHexTile(tm, 0, 0, 1);
    setHexTileTexture(tm, 1, 42);
    const cam: CameraState = {
      x: 0, y: 0, zoom: 1,
    };
    drawHexTilemap(tm, cam);
  });

  it("does not crash with offsets", () => {
    const tm = createHexTilemap({ width: 5, height: 5, hexSize: 32, orientation: "pointy" });
    setHexTile(tm, 0, 0, 1);
    setHexTileTexture(tm, 1, 10);
    drawHexTilemap(tm, undefined, 0, 100, 50);
  });
});

// ---------------------------------------------------------------------------
// Hex auto-tiling
// ---------------------------------------------------------------------------

describe("computeHexTilemapAutotile", () => {
  it("isolated tile returns 0", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    setHexTile(tm, 5, 5, 1);
    assert.equal(computeHexTilemapAutotile(tm, 5, 5), 0);
  });

  it("fully surrounded tile returns 63", () => {
    // Create a large enough grid and fill the center + all 6 neighbors
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    // Set the center tile
    const centerCube = hexTilemapToCube(tm, 5, 5);
    setHexTileAtCube(tm, centerCube, 1);
    // Set all 6 neighbors
    const neighbors = hexNeighborsCube(centerCube);
    for (const n of neighbors) {
      setHexTileAtCube(tm, n, 1);
    }
    assert.equal(computeHexTilemapAutotile(tm, 5, 5), 63);
  });

  it("custom match function filters by tile type", () => {
    const tm = createHexTilemap({ width: 10, height: 10, hexSize: 32, orientation: "pointy" });
    const centerCube = hexTilemapToCube(tm, 5, 5);
    setHexTileAtCube(tm, centerCube, 1);
    // Set some neighbors to type 1, others to type 2
    const neighbors = hexNeighborsCube(centerCube);
    setHexTileAtCube(tm, neighbors[0], 1); // E
    setHexTileAtCube(tm, neighbors[1], 2); // NE
    setHexTileAtCube(tm, neighbors[2], 1); // NW
    // Match only type 1
    const mask = computeHexTilemapAutotile(tm, 5, 5, (id) => id === 1);
    // E=1, NW=4 -> 5
    assert.equal(mask, 5);
  });
});

// Helper: get hex neighbors in cube coords
function hexNeighborsCube(h: { q: number; r: number; s: number }) {
  const dirs = [
    { q: 1, r: 0, s: -1 },
    { q: 1, r: -1, s: 0 },
    { q: 0, r: -1, s: 1 },
    { q: -1, r: 0, s: 1 },
    { q: -1, r: 1, s: 0 },
    { q: 0, r: 1, s: -1 },
  ];
  return dirs.map((d) => hex(h.q + d.q, h.r + d.r));
}
