import { describe, it, assert } from "../testing/harness.ts";
import {
  hex,
  hexFromCube,
  hexEqual,
  hexAdd,
  hexSubtract,
  hexScale,
  hexDirection,
  hexNeighbor,
  hexNeighbors,
  hexDistance,
  hexRing,
  hexSpiral,
  hexRound,
  hexLineDraw,
  hexToWorld,
  worldToHex,
  screenToHex,
  cubeToOffset,
  offsetToCube,
  hexRange,
  hexArea,
  computeHexAutotileBitmask,
  HEX_DIR_E,
  HEX_DIR_NE,
  HEX_DIR_NW,
  HEX_DIR_W,
  HEX_DIR_SW,
  HEX_DIR_SE,
} from "./hex.ts";
import type { HexConfig, HexCoord } from "./hex.ts";
import type { CameraState } from "./types.ts";

const POINTY: HexConfig = { hexSize: 32, orientation: "pointy" };
const FLAT: HexConfig = { hexSize: 32, orientation: "flat" };

// ---------------------------------------------------------------------------
// Cube coordinate basics
// ---------------------------------------------------------------------------

describe("hex creation", () => {
  it("hex() sets s = -q - r", () => {
    const h = hex(3, -1);
    assert.equal(h.q, 3);
    assert.equal(h.r, -1);
    assert.equal(h.s, -2);
  });

  it("hexFromCube validates constraint", () => {
    const h = hexFromCube(1, 2, -3);
    assert.equal(h.q, 1);
    assert.equal(h.r, 2);
    assert.equal(h.s, -3);
  });

  it("hexFromCube throws on invalid coordinates", () => {
    let threw = false;
    try {
      hexFromCube(1, 2, 3);
    } catch {
      threw = true;
    }
    assert.ok(threw);
  });
});

describe("hex arithmetic", () => {
  it("hexEqual compares coordinates", () => {
    assert.ok(hexEqual(hex(1, 2), hex(1, 2)));
    assert.ok(!hexEqual(hex(1, 2), hex(2, 1)));
  });

  it("hexAdd adds coordinates", () => {
    const result = hexAdd(hex(1, 2), hex(-1, 3));
    assert.equal(result.q, 0);
    assert.equal(result.r, 5);
    assert.equal(result.s, -5);
  });

  it("hexSubtract subtracts coordinates", () => {
    const result = hexSubtract(hex(3, 1), hex(1, 2));
    assert.equal(result.q, 2);
    assert.equal(result.r, -1);
    assert.equal(result.s, -1);
  });

  it("hexScale multiplies by scalar", () => {
    const result = hexScale(hex(2, -1), 3);
    assert.equal(result.q, 6);
    assert.equal(result.r, -3);
    assert.equal(result.s, -3);
  });

  it("q + r + s = 0 preserved through operations", () => {
    const a = hex(3, -5);
    const b = hex(-2, 4);
    const sum = hexAdd(a, b);
    assert.equal(sum.q + sum.r + sum.s, 0);
    const diff = hexSubtract(a, b);
    assert.equal(diff.q + diff.r + diff.s, 0);
    const scaled = hexScale(a, 7);
    assert.equal(scaled.q + scaled.r + scaled.s, 0);
  });
});

// ---------------------------------------------------------------------------
// Neighbors
// ---------------------------------------------------------------------------

describe("hexNeighbors", () => {
  it("returns 6 neighbors", () => {
    const n = hexNeighbors(0, 0);
    assert.equal(n.length, 6);
  });

  it("all neighbors are distance 1 from center", () => {
    const center = hex(3, -2);
    const n = hexNeighbors(center.q, center.r);
    for (const neighbor of n) {
      assert.equal(hexDistance(center, neighbor), 1);
    }
  });

  it("all neighbors satisfy q + r + s = 0", () => {
    const n = hexNeighbors(1, 2);
    for (const neighbor of n) {
      assert.equal(neighbor.q + neighbor.r + neighbor.s, 0);
    }
  });

  it("origin neighbors match expected directions", () => {
    const n = hexNeighbors(0, 0);
    // E, NE, NW, W, SW, SE
    assert.ok(hexEqual(n[0], hex(1, 0)));
    assert.ok(hexEqual(n[1], hex(1, -1)));
    assert.ok(hexEqual(n[2], hex(0, -1)));
    assert.ok(hexEqual(n[3], hex(-1, 0)));
    assert.ok(hexEqual(n[4], hex(-1, 1)));
    assert.ok(hexEqual(n[5], hex(0, 1)));
  });
});

describe("hexDirection and hexNeighbor", () => {
  it("hexDirection wraps around", () => {
    const d0 = hexDirection(0);
    const d6 = hexDirection(6);
    assert.ok(hexEqual(d0, d6));
  });

  it("negative direction wraps", () => {
    const d5 = hexDirection(5);
    const dm1 = hexDirection(-1);
    assert.ok(hexEqual(d5, dm1));
  });

  it("hexNeighbor returns correct neighbor", () => {
    const center = hex(2, -1);
    const east = hexNeighbor(center, 0);
    assert.equal(east.q, 3);
    assert.equal(east.r, -1);
  });
});

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

describe("hexDistance", () => {
  it("same cell is 0", () => {
    assert.equal(hexDistance(hex(0, 0), hex(0, 0)), 0);
  });

  it("adjacent cells are 1", () => {
    assert.equal(hexDistance(hex(0, 0), hex(1, 0)), 1);
    assert.equal(hexDistance(hex(0, 0), hex(0, 1)), 1);
  });

  it("distance is symmetric", () => {
    const a = hex(3, -2);
    const b = hex(-1, 4);
    assert.equal(hexDistance(a, b), hexDistance(b, a));
  });

  it("known distance calculation", () => {
    // From (0,0) to (3, -1): max(3, 1, 2) = 3
    assert.equal(hexDistance(hex(0, 0), hex(3, -1)), 3);
  });

  it("long distance", () => {
    assert.equal(hexDistance(hex(0, 0), hex(5, 5)), 10);
  });
});

// ---------------------------------------------------------------------------
// Ring and spiral
// ---------------------------------------------------------------------------

describe("hexRing", () => {
  it("radius 0 returns center only", () => {
    const ring = hexRing(hex(0, 0), 0);
    assert.equal(ring.length, 1);
    assert.ok(hexEqual(ring[0], hex(0, 0)));
  });

  it("radius 1 returns 6 cells", () => {
    const ring = hexRing(hex(0, 0), 1);
    assert.equal(ring.length, 6);
  });

  it("radius 2 returns 12 cells", () => {
    const ring = hexRing(hex(0, 0), 2);
    assert.equal(ring.length, 12);
  });

  it("all ring cells are exactly radius distance from center", () => {
    const center = hex(2, -1);
    const ring = hexRing(center, 3);
    for (const h of ring) {
      assert.equal(hexDistance(center, h), 3);
    }
  });

  it("ring has no duplicates", () => {
    const ring = hexRing(hex(0, 0), 3);
    const keys = new Set(ring.map((h) => `${h.q},${h.r}`));
    assert.equal(keys.size, ring.length);
  });
});

describe("hexSpiral", () => {
  it("radius 0 returns center only", () => {
    const spiral = hexSpiral(hex(0, 0), 0);
    assert.equal(spiral.length, 1);
  });

  it("radius 1 returns 7 cells (1 + 6)", () => {
    const spiral = hexSpiral(hex(0, 0), 1);
    assert.equal(spiral.length, 7);
  });

  it("radius 2 returns 19 cells (1 + 6 + 12)", () => {
    const spiral = hexSpiral(hex(0, 0), 2);
    assert.equal(spiral.length, 19);
  });

  it("first cell is center", () => {
    const center = hex(3, -2);
    const spiral = hexSpiral(center, 2);
    assert.ok(hexEqual(spiral[0], center));
  });

  it("spiral has no duplicates", () => {
    const spiral = hexSpiral(hex(0, 0), 3);
    const keys = new Set(spiral.map((h) => `${h.q},${h.r}`));
    assert.equal(keys.size, spiral.length);
  });
});

// ---------------------------------------------------------------------------
// Line drawing
// ---------------------------------------------------------------------------

describe("hexLineDraw", () => {
  it("same cell returns single entry", () => {
    const line = hexLineDraw(hex(0, 0), hex(0, 0));
    assert.equal(line.length, 1);
  });

  it("adjacent cells returns 2 entries", () => {
    const line = hexLineDraw(hex(0, 0), hex(1, 0));
    assert.equal(line.length, 2);
  });

  it("line length equals distance + 1", () => {
    const a = hex(0, 0);
    const b = hex(3, -1);
    const line = hexLineDraw(a, b);
    assert.equal(line.length, hexDistance(a, b) + 1);
  });

  it("starts and ends at correct cells", () => {
    const a = hex(0, 0);
    const b = hex(2, -2);
    const line = hexLineDraw(a, b);
    assert.ok(hexEqual(line[0], a));
    assert.ok(hexEqual(line[line.length - 1], b));
  });

  it("each consecutive pair in line is adjacent", () => {
    const line = hexLineDraw(hex(0, 0), hex(4, -2));
    for (let i = 1; i < line.length; i++) {
      assert.equal(hexDistance(line[i - 1], line[i]), 1);
    }
  });
});

// ---------------------------------------------------------------------------
// hexRound
// ---------------------------------------------------------------------------

describe("hexRound", () => {
  it("integer coords round to themselves", () => {
    const h = hexRound(2, -1, -1);
    assert.equal(h.q, 2);
    assert.equal(h.r, -1);
    assert.equal(h.s, -1);
  });

  it("fractional coords round to nearest", () => {
    const h = hexRound(0.1, -0.2, 0.1);
    assert.ok(h.q === 0 || Object.is(h.q, -0));
    assert.ok(h.r === 0 || Object.is(h.r, -0));
    assert.ok(h.s === 0 || Object.is(h.s, -0));
    assert.equal(h.q + h.r + h.s, 0);
  });

  it("result satisfies q + r + s = 0", () => {
    const h = hexRound(1.3, -0.7, -0.6);
    assert.equal(h.q + h.r + h.s, 0);
  });
});

// ---------------------------------------------------------------------------
// World coordinate conversions
// ---------------------------------------------------------------------------

describe("hexToWorld (pointy-top)", () => {
  it("origin maps to (0, 0)", () => {
    const p = hexToWorld(hex(0, 0), POINTY);
    assert.ok(Math.abs(p.x) < 0.001);
    assert.ok(Math.abs(p.y) < 0.001);
  });

  it("(1, 0) moves right along x-axis", () => {
    const p = hexToWorld(hex(1, 0), POINTY);
    assert.ok(p.x > 0);
    assert.ok(Math.abs(p.y) < 0.001);
  });

  it("(0, 1) moves down and slightly right", () => {
    const p = hexToWorld(hex(0, 1), POINTY);
    assert.ok(p.y > 0);
  });
});

describe("hexToWorld (flat-top)", () => {
  it("origin maps to (0, 0)", () => {
    const p = hexToWorld(hex(0, 0), FLAT);
    assert.ok(Math.abs(p.x) < 0.001);
    assert.ok(Math.abs(p.y) < 0.001);
  });

  it("(1, 0) moves right", () => {
    const p = hexToWorld(hex(1, 0), FLAT);
    assert.ok(p.x > 0);
  });
});

describe("worldToHex round-trips", () => {
  it("round-trips pointy-top (0, 0)", () => {
    const w = hexToWorld(hex(0, 0), POINTY);
    const h = worldToHex(w.x, w.y, POINTY);
    assert.ok(hexEqual(h, hex(0, 0)));
  });

  it("round-trips pointy-top (3, -2)", () => {
    const w = hexToWorld(hex(3, -2), POINTY);
    const h = worldToHex(w.x, w.y, POINTY);
    assert.ok(hexEqual(h, hex(3, -2)));
  });

  it("round-trips flat-top (2, 1)", () => {
    const w = hexToWorld(hex(2, 1), FLAT);
    const h = worldToHex(w.x, w.y, FLAT);
    assert.ok(hexEqual(h, hex(2, 1)));
  });

  it("round-trips flat-top (-1, 3)", () => {
    const w = hexToWorld(hex(-1, 3), FLAT);
    const h = worldToHex(w.x, w.y, FLAT);
    assert.ok(hexEqual(h, hex(-1, 3)));
  });

  it("round-trips for many cells", () => {
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        const orig = hex(q, r);
        const w = hexToWorld(orig, POINTY);
        const back = worldToHex(w.x, w.y, POINTY);
        assert.ok(hexEqual(orig, back), `Failed for (${q}, ${r})`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// screenToHex
// ---------------------------------------------------------------------------

describe("screenToHex", () => {
  const cam: CameraState = {
    x: 0,
    y: 0,
    zoom: 1,
    viewportWidth: 800,
    viewportHeight: 600,
  };

  it("screen center maps to origin hex", () => {
    const h = screenToHex(400, 300, cam, POINTY);
    assert.ok(hexEqual(h, hex(0, 0)));
  });

  it("zoomed camera still maps screen center to origin", () => {
    const zoomed: CameraState = { ...cam, zoom: 2 };
    const h = screenToHex(400, 300, zoomed, POINTY);
    assert.ok(hexEqual(h, hex(0, 0)));
  });
});

// ---------------------------------------------------------------------------
// Offset coordinate conversions
// ---------------------------------------------------------------------------

describe("offset conversions (odd-r)", () => {
  it("origin round-trips", () => {
    const off = cubeToOffset(hex(0, 0), "odd-r");
    assert.equal(off.col, 0);
    assert.equal(off.row, 0);
    const back = offsetToCube(off.col, off.row, "odd-r");
    assert.ok(hexEqual(back, hex(0, 0)));
  });

  it("(1, 0) round-trips", () => {
    const off = cubeToOffset(hex(1, 0), "odd-r");
    const back = offsetToCube(off.col, off.row, "odd-r");
    assert.ok(hexEqual(back, hex(1, 0)));
  });

  it("(0, 1) round-trips", () => {
    const off = cubeToOffset(hex(0, 1), "odd-r");
    const back = offsetToCube(off.col, off.row, "odd-r");
    assert.ok(hexEqual(back, hex(0, 1)));
  });

  it("round-trips for many cells", () => {
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        const orig = hex(q, r);
        const off = cubeToOffset(orig, "odd-r");
        const back = offsetToCube(off.col, off.row, "odd-r");
        assert.ok(hexEqual(back, orig), `Failed for (${q}, ${r})`);
      }
    }
  });
});

describe("offset conversions (even-r)", () => {
  it("round-trips for many cells", () => {
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        const orig = hex(q, r);
        const off = cubeToOffset(orig, "even-r");
        const back = offsetToCube(off.col, off.row, "even-r");
        assert.ok(hexEqual(back, orig), `Failed for (${q}, ${r})`);
      }
    }
  });
});

describe("offset conversions (odd-q)", () => {
  it("round-trips for many cells", () => {
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        const orig = hex(q, r);
        const off = cubeToOffset(orig, "odd-q");
        const back = offsetToCube(off.col, off.row, "odd-q");
        assert.ok(hexEqual(back, orig), `Failed for (${q}, ${r})`);
      }
    }
  });
});

describe("offset conversions (even-q)", () => {
  it("round-trips for many cells", () => {
    for (let q = -5; q <= 5; q++) {
      for (let r = -5; r <= 5; r++) {
        const orig = hex(q, r);
        const off = cubeToOffset(orig, "even-q");
        const back = offsetToCube(off.col, off.row, "even-q");
        assert.ok(hexEqual(back, orig), `Failed for (${q}, ${r})`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// hexRange and hexArea
// ---------------------------------------------------------------------------

describe("hexRange", () => {
  it("range 0 returns only center", () => {
    const cells = hexRange(hex(0, 0), 0);
    assert.equal(cells.length, 1);
  });

  it("range 1 returns 7 cells", () => {
    const cells = hexRange(hex(0, 0), 1);
    assert.equal(cells.length, 7);
  });

  it("range 2 returns 19 cells", () => {
    const cells = hexRange(hex(0, 0), 2);
    assert.equal(cells.length, 19);
  });

  it("all cells within range have correct distance", () => {
    const center = hex(1, -1);
    const cells = hexRange(center, 3);
    for (const c of cells) {
      assert.ok(hexDistance(center, c) <= 3);
    }
  });

  it("has no duplicates", () => {
    const cells = hexRange(hex(0, 0), 3);
    const keys = new Set(cells.map((h) => `${h.q},${h.r}`));
    assert.equal(keys.size, cells.length);
  });
});

describe("hexArea", () => {
  it("radius 0 = 1", () => assert.equal(hexArea(0), 1));
  it("radius 1 = 7", () => assert.equal(hexArea(1), 7));
  it("radius 2 = 19", () => assert.equal(hexArea(2), 19));
  it("radius 3 = 37", () => assert.equal(hexArea(3), 37));
});

// ---------------------------------------------------------------------------
// Hex auto-tiling
// ---------------------------------------------------------------------------

describe("computeHexAutotileBitmask", () => {
  it("no neighbors returns 0", () => {
    const mask = computeHexAutotileBitmask(0, 0, () => false);
    assert.equal(mask, 0);
  });

  it("all neighbors returns 63", () => {
    const mask = computeHexAutotileBitmask(0, 0, () => true);
    assert.equal(mask, 63);
  });

  it("only east neighbor sets bit 1", () => {
    const mask = computeHexAutotileBitmask(0, 0, (q, r) => q === 1 && r === 0);
    assert.equal(mask, HEX_DIR_E);
  });

  it("direction bits are independent powers of 2", () => {
    assert.equal(HEX_DIR_E, 1);
    assert.equal(HEX_DIR_NE, 2);
    assert.equal(HEX_DIR_NW, 4);
    assert.equal(HEX_DIR_W, 8);
    assert.equal(HEX_DIR_SW, 16);
    assert.equal(HEX_DIR_SE, 32);
    assert.equal(HEX_DIR_E | HEX_DIR_NE | HEX_DIR_NW | HEX_DIR_W | HEX_DIR_SW | HEX_DIR_SE, 63);
  });
});
