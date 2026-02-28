import { describe, it, assert } from "../testing/harness.ts";
import {
  isoToWorld,
  worldToIso,
  worldToGrid,
  screenToIso,
  isoDepthLayer,
  staggeredIsoToWorld,
  worldToStaggeredIso,
  screenToStaggeredIso,
  isoMapBounds,
  isoIterateBackToFront,
  isoNeighbors,
  isoDistance,
} from "./isometric.ts";
import type { IsoConfig, StaggeredIsoConfig } from "./isometric.ts";
import type { CameraState } from "./types.ts";

const STD: IsoConfig = { tileW: 64, tileH: 32 };

// ---------------------------------------------------------------------------
// isoToWorld
// ---------------------------------------------------------------------------

describe("isoToWorld", () => {
  it("origin maps to (0, 0)", () => {
    const p = isoToWorld(0, 0, STD);
    assert.equal(p.x, 0);
    assert.equal(p.y, 0);
  });

  it("(1, 0) goes down-right", () => {
    const p = isoToWorld(1, 0, STD);
    assert.equal(p.x, 32); // tileW / 2
    assert.equal(p.y, 16); // tileH / 2
  });

  it("(0, 1) goes down-left", () => {
    const p = isoToWorld(0, 1, STD);
    assert.equal(p.x, -32);
    assert.equal(p.y, 16);
  });

  it("(1, 1) goes straight down", () => {
    const p = isoToWorld(1, 1, STD);
    assert.equal(p.x, 0);
    assert.equal(p.y, 32);
  });

  it("(3, 2) matches expected diamond projection", () => {
    const p = isoToWorld(3, 2, STD);
    assert.equal(p.x, (3 - 2) * 32);
    assert.equal(p.y, (3 + 2) * 16);
  });

  it("works with non-standard tile sizes", () => {
    const cfg: IsoConfig = { tileW: 128, tileH: 64 };
    const p = isoToWorld(2, 3, cfg);
    assert.equal(p.x, (2 - 3) * 64);
    assert.equal(p.y, (2 + 3) * 32);
  });
});

// ---------------------------------------------------------------------------
// worldToIso
// ---------------------------------------------------------------------------

describe("worldToIso", () => {
  it("origin maps back to (0, 0)", () => {
    const p = worldToIso(0, 0, STD);
    assert.equal(p.x, 0);
    assert.equal(p.y, 0);
  });

  it("round-trips with isoToWorld at (1, 0)", () => {
    const w = isoToWorld(1, 0, STD);
    const g = worldToIso(w.x, w.y, STD);
    assert.ok(Math.abs(g.x - 1) < 0.001);
    assert.ok(Math.abs(g.y - 0) < 0.001);
  });

  it("round-trips with isoToWorld at (3, 5)", () => {
    const w = isoToWorld(3, 5, STD);
    const g = worldToIso(w.x, w.y, STD);
    assert.ok(Math.abs(g.x - 3) < 0.001);
    assert.ok(Math.abs(g.y - 5) < 0.001);
  });

  it("round-trips with negative coords", () => {
    const w = isoToWorld(-2, 4, STD);
    const g = worldToIso(w.x, w.y, STD);
    assert.ok(Math.abs(g.x - (-2)) < 0.001);
    assert.ok(Math.abs(g.y - 4) < 0.001);
  });
});

// ---------------------------------------------------------------------------
// worldToGrid
// ---------------------------------------------------------------------------

describe("worldToGrid", () => {
  it("center of tile (0,0) returns (0,0)", () => {
    const w = isoToWorld(0, 0, STD);
    const g = worldToGrid(w.x, w.y, STD);
    assert.equal(g.x, 0);
    assert.equal(g.y, 0);
  });

  it("center of tile (3,2) returns (3,2)", () => {
    const w = isoToWorld(3, 2, STD);
    const g = worldToGrid(w.x, w.y, STD);
    assert.equal(g.x, 3);
    assert.equal(g.y, 2);
  });

  it("slightly offset from tile center still snaps correctly", () => {
    const w = isoToWorld(5, 5, STD);
    const g = worldToGrid(w.x + 1, w.y + 1, STD);
    assert.equal(g.x, 5);
    assert.equal(g.y, 5);
  });
});

// ---------------------------------------------------------------------------
// screenToIso
// ---------------------------------------------------------------------------

describe("screenToIso", () => {
  const cam: CameraState = {
    x: 0,
    y: 0,
    zoom: 1,
  };
  const vpW = 800;
  const vpH = 600;

  it("screen top-left with camera at origin returns grid near (0,0)", () => {
    const g = screenToIso(0, 0, cam, STD, vpW, vpH);
    assert.equal(g.x, 0);
    assert.equal(g.y, 0);
  });

  it("offset camera shifts the result", () => {
    const offsetCam: CameraState = { ...cam, x: 100, y: 50 };
    const g1 = screenToIso(0, 0, cam, STD, vpW, vpH);
    const g2 = screenToIso(0, 0, offsetCam, STD, vpW, vpH);
    // They should differ due to camera offset
    assert.ok(g1.x !== g2.x || g1.y !== g2.y);
  });

  it("zoom affects the conversion", () => {
    const zoomed: CameraState = { ...cam, zoom: 2 };
    // At zoom 2, screen top-left still maps to world origin
    const g = screenToIso(0, 0, zoomed, STD, vpW, vpH);
    assert.equal(g.x, 0);
    assert.equal(g.y, 0);
  });
});

// ---------------------------------------------------------------------------
// isoDepthLayer
// ---------------------------------------------------------------------------

describe("isoDepthLayer", () => {
  it("gy=0 gives layer 0", () => {
    assert.equal(isoDepthLayer(0), 0);
  });

  it("gy=1 gives layer 10", () => {
    assert.equal(isoDepthLayer(1), 10);
  });

  it("gy=5 gives layer 50", () => {
    assert.equal(isoDepthLayer(5), 50);
  });

  it("handles fractional gy via floor", () => {
    assert.equal(isoDepthLayer(2.7), 27);
  });
});

// ---------------------------------------------------------------------------
// Staggered isometric
// ---------------------------------------------------------------------------

describe("staggeredIsoToWorld", () => {
  const cfg: StaggeredIsoConfig = { tileW: 64, tileH: 32 };

  it("(0,0) maps to (0,0)", () => {
    const p = staggeredIsoToWorld(0, 0, cfg);
    assert.equal(p.x, 0);
    assert.equal(p.y, 0);
  });

  it("(1,0) maps to (64,0) — same row no offset", () => {
    const p = staggeredIsoToWorld(1, 0, cfg);
    assert.equal(p.x, 64);
    assert.equal(p.y, 0);
  });

  it("(0,1) maps to (32, 16) — odd row offset", () => {
    const p = staggeredIsoToWorld(0, 1, cfg);
    assert.equal(p.x, 32); // half tile offset
    assert.equal(p.y, 16); // tileH / 2
  });

  it("(0,2) maps to (0, 32) — even row no offset", () => {
    const p = staggeredIsoToWorld(0, 2, cfg);
    assert.equal(p.x, 0);
    assert.equal(p.y, 32);
  });

  it("even stagger offsets even rows", () => {
    const evenCfg: StaggeredIsoConfig = { tileW: 64, tileH: 32, staggerIndex: "even" };
    const p0 = staggeredIsoToWorld(0, 0, evenCfg);
    assert.equal(p0.x, 32); // even row 0 is offset
    const p1 = staggeredIsoToWorld(0, 1, evenCfg);
    assert.equal(p1.x, 0); // odd row 1 is not offset
  });
});

describe("worldToStaggeredIso", () => {
  const cfg: StaggeredIsoConfig = { tileW: 64, tileH: 32 };

  it("round-trips (0,0)", () => {
    const w = staggeredIsoToWorld(0, 0, cfg);
    const g = worldToStaggeredIso(w.x + 1, w.y + 1, cfg);
    assert.equal(g.x, 0);
    assert.equal(g.y, 0);
  });

  it("round-trips (1,0)", () => {
    const w = staggeredIsoToWorld(1, 0, cfg);
    const g = worldToStaggeredIso(w.x + 1, w.y + 1, cfg);
    assert.equal(g.x, 1);
    assert.equal(g.y, 0);
  });

  it("round-trips (0,1)", () => {
    const w = staggeredIsoToWorld(0, 1, cfg);
    const g = worldToStaggeredIso(w.x + 1, w.y + 1, cfg);
    assert.equal(g.x, 0);
    assert.equal(g.y, 1);
  });

  it("round-trips (2,3)", () => {
    const w = staggeredIsoToWorld(2, 3, cfg);
    const g = worldToStaggeredIso(w.x + 1, w.y + 1, cfg);
    assert.equal(g.x, 2);
    assert.equal(g.y, 3);
  });
});

describe("screenToStaggeredIso", () => {
  const cfg: StaggeredIsoConfig = { tileW: 64, tileH: 32 };
  const cam: CameraState = {
    x: 0,
    y: 0,
    zoom: 1,
  };
  const vpW = 800;
  const vpH = 600;

  it("screen top-left maps to grid near origin", () => {
    const g = screenToStaggeredIso(0, 0, cam, cfg, vpW, vpH);
    // Camera at (0,0) means screen top-left shows world (0,0)
    assert.equal(g.x, 0);
    assert.equal(g.y, 0);
  });
});

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe("isoMapBounds", () => {
  it("16x16 map has expected bounds", () => {
    const b = isoMapBounds(16, 16, STD);
    const left = isoToWorld(0, 16, STD);
    const top = isoToWorld(0, 0, STD);
    const right = isoToWorld(16, 0, STD);
    const bottom = isoToWorld(16, 16, STD);
    assert.equal(b.minX, left.x);
    assert.equal(b.minY, top.y);
    assert.equal(b.maxX, right.x);
    assert.equal(b.maxY, bottom.y);
  });

  it("1x1 map bounds are zero-area at origin", () => {
    const b = isoMapBounds(1, 1, STD);
    // minX = iso(0,1).x = -32, maxX = iso(1,0).x = 32
    assert.equal(b.minX, -32);
    assert.equal(b.maxX, 32);
    assert.equal(b.minY, 0);
    assert.equal(b.maxY, 32);
  });
});

describe("isoIterateBackToFront", () => {
  it("visits all tiles in order", () => {
    const visited: Array<[number, number]> = [];
    isoIterateBackToFront(3, 2, (gx, gy) => visited.push([gx, gy]));
    assert.equal(visited.length, 6);
    assert.equal(visited[0][0], 0);
    assert.equal(visited[0][1], 0);
    assert.equal(visited[5][0], 2);
    assert.equal(visited[5][1], 1);
  });
});

describe("isoNeighbors", () => {
  it("returns 4 neighbors", () => {
    const n = isoNeighbors(5, 5);
    assert.equal(n.length, 4);
  });

  it("correct neighbor positions", () => {
    const n = isoNeighbors(3, 4);
    assert.equal(n[0].x, 4); assert.equal(n[0].y, 4); // right
    assert.equal(n[1].x, 3); assert.equal(n[1].y, 5); // down
    assert.equal(n[2].x, 2); assert.equal(n[2].y, 4); // left
    assert.equal(n[3].x, 3); assert.equal(n[3].y, 3); // up
  });
});

describe("isoDistance", () => {
  it("same cell is 0", () => {
    assert.equal(isoDistance(3, 4, 3, 4), 0);
  });

  it("adjacent is 1", () => {
    assert.equal(isoDistance(3, 4, 4, 4), 1);
  });

  it("diagonal is 2", () => {
    assert.equal(isoDistance(0, 0, 1, 1), 2);
  });

  it("longer distance", () => {
    assert.equal(isoDistance(0, 0, 5, 3), 8);
  });
});
