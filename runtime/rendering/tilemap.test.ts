import { describe, it, assert } from "../testing/harness.ts";
import {
  // Animated tiles
  registerAnimatedTile,
  unregisterAnimatedTile,
  clearAnimatedTiles,
  updateAnimatedTiles,
  resolveAnimatedTile,
  getAnimatedTileDefs,
  // Tile properties
  defineTileProperties,
  getTileProperties,
  getTileProperty,
  clearTileProperties,
  // Layer types
  type LayeredTilemap,
  type TilemapLayer,
} from "./tilemap.ts";

// ---------------------------------------------------------------------------
// Animated tiles
// ---------------------------------------------------------------------------

describe("registerAnimatedTile", () => {
  it("registers a tile with frames and duration", () => {
    clearAnimatedTiles();
    registerAnimatedTile(10, [10, 11, 12], 0.2);
    const defs = getAnimatedTileDefs();
    assert.equal(defs.size, 1);
    assert.ok(defs.has(10));
    const def = defs.get(10)!;
    assert.deepEqual(def.frames, [10, 11, 12]);
    assert.equal(def.frameDuration, 0.2);
    clearAnimatedTiles();
  });

  it("throws if frames has fewer than 2 entries", () => {
    clearAnimatedTiles();
    assert.throws(
      () => registerAnimatedTile(10, [10], 0.2),
      /at least 2 entries/,
    );
    clearAnimatedTiles();
  });

  it("throws if frameDuration is zero or negative", () => {
    clearAnimatedTiles();
    assert.throws(
      () => registerAnimatedTile(10, [10, 11], 0),
      /must be positive/,
    );
    assert.throws(
      () => registerAnimatedTile(10, [10, 11], -1),
      /must be positive/,
    );
    clearAnimatedTiles();
  });
});

describe("unregisterAnimatedTile", () => {
  it("removes a registered animated tile", () => {
    clearAnimatedTiles();
    registerAnimatedTile(10, [10, 11, 12], 0.2);
    assert.equal(getAnimatedTileDefs().size, 1);
    unregisterAnimatedTile(10);
    assert.equal(getAnimatedTileDefs().size, 0);
    clearAnimatedTiles();
  });

  it("is a no-op for unregistered tiles", () => {
    clearAnimatedTiles();
    unregisterAnimatedTile(999);
    assert.equal(getAnimatedTileDefs().size, 0);
    clearAnimatedTiles();
  });
});

describe("clearAnimatedTiles", () => {
  it("clears all registrations and resets timer", () => {
    registerAnimatedTile(10, [10, 11], 0.5);
    registerAnimatedTile(20, [20, 21], 0.5);
    updateAnimatedTiles(1.0);
    clearAnimatedTiles();
    assert.equal(getAnimatedTileDefs().size, 0);
    // Timer is reset: resolveAnimatedTile should return tile ID unchanged
    // (since no defs registered)
    assert.equal(resolveAnimatedTile(10), 10);
  });
});

describe("updateAnimatedTiles + resolveAnimatedTile", () => {
  it("returns correct frame based on accumulated time", () => {
    clearAnimatedTiles();
    registerAnimatedTile(10, [10, 11, 12], 0.25); // 4fps

    // Time 0.0: frame 0 -> tile 10
    assert.equal(resolveAnimatedTile(10), 10);

    // Time 0.25: frame 1 -> tile 11
    updateAnimatedTiles(0.25);
    assert.equal(resolveAnimatedTile(10), 11);

    // Time 0.50: frame 2 -> tile 12
    updateAnimatedTiles(0.25);
    assert.equal(resolveAnimatedTile(10), 12);

    // Time 0.75: wraps to frame 0 -> tile 10
    updateAnimatedTiles(0.25);
    assert.equal(resolveAnimatedTile(10), 10);

    clearAnimatedTiles();
  });

  it("returns unchanged ID for non-animated tiles", () => {
    clearAnimatedTiles();
    registerAnimatedTile(10, [10, 11], 0.5);
    assert.equal(resolveAnimatedTile(5), 5);
    assert.equal(resolveAnimatedTile(0), 0);
    clearAnimatedTiles();
  });

  it("handles multiple animated tile definitions independently", () => {
    clearAnimatedTiles();
    registerAnimatedTile(10, [10, 11], 0.5); // 2fps
    registerAnimatedTile(20, [20, 21, 22], 0.25); // 4fps

    // At time 0
    assert.equal(resolveAnimatedTile(10), 10);
    assert.equal(resolveAnimatedTile(20), 20);

    // At time 0.25
    updateAnimatedTiles(0.25);
    assert.equal(resolveAnimatedTile(10), 10); // Still frame 0 (0.25/0.5 = 0)
    assert.equal(resolveAnimatedTile(20), 21); // Frame 1

    // At time 0.50
    updateAnimatedTiles(0.25);
    assert.equal(resolveAnimatedTile(10), 11); // Frame 1
    assert.equal(resolveAnimatedTile(20), 22); // Frame 2

    clearAnimatedTiles();
  });
});

// ---------------------------------------------------------------------------
// Tile properties
// ---------------------------------------------------------------------------

describe("defineTileProperties", () => {
  it("stores properties for a tile ID", () => {
    clearTileProperties();
    defineTileProperties(1, { walkable: true, damage: 0 });
    const props = getTileProperties(1);
    assert.ok(props);
    assert.equal(props!.walkable, true);
    assert.equal(props!.damage, 0);
    clearTileProperties();
  });

  it("overwrites existing properties", () => {
    clearTileProperties();
    defineTileProperties(1, { walkable: true });
    defineTileProperties(1, { walkable: false, speed: 0.5 });
    const props = getTileProperties(1);
    assert.equal(props!.walkable, false);
    assert.equal(props!.speed, 0.5);
    clearTileProperties();
  });

  it("returns a copy (not the original object)", () => {
    clearTileProperties();
    const original = { walkable: true };
    defineTileProperties(1, original);
    const props = getTileProperties(1)!;
    props.walkable = false;
    // Original should not be modified
    assert.equal(getTileProperties(1)!.walkable, true);
    clearTileProperties();
  });
});

describe("getTileProperties", () => {
  it("returns undefined for undefined tile", () => {
    clearTileProperties();
    assert.equal(getTileProperties(999), undefined);
    clearTileProperties();
  });
});

describe("getTileProperty", () => {
  it("returns a specific property value", () => {
    clearTileProperties();
    defineTileProperties(1, { walkable: true, damage: 5, name: "lava" });
    assert.equal(getTileProperty(1, "walkable"), true);
    assert.equal(getTileProperty(1, "damage"), 5);
    assert.equal(getTileProperty(1, "name"), "lava");
    clearTileProperties();
  });

  it("returns undefined for missing key", () => {
    clearTileProperties();
    defineTileProperties(1, { walkable: true });
    assert.equal(getTileProperty(1, "nonexistent"), undefined);
    clearTileProperties();
  });

  it("returns undefined for undefined tile", () => {
    clearTileProperties();
    assert.equal(getTileProperty(999, "anything"), undefined);
    clearTileProperties();
  });
});

describe("clearTileProperties", () => {
  it("removes all definitions", () => {
    defineTileProperties(1, { a: 1 });
    defineTileProperties(2, { b: 2 });
    clearTileProperties();
    assert.equal(getTileProperties(1), undefined);
    assert.equal(getTileProperties(2), undefined);
  });
});

// ---------------------------------------------------------------------------
// Layered tilemap (headless — createTilemap returns 0, but structure tests work)
// ---------------------------------------------------------------------------

describe("LayeredTilemap structure", () => {
  it("has correct type shape", () => {
    // Verify the type structure works at runtime
    const layer: TilemapLayer = {
      name: "ground",
      tilemapId: 0,
      zOrder: 0,
      visible: true,
      opacity: 1,
      parallaxFactor: 1,
    };
    assert.equal(layer.name, "ground");
    assert.equal(layer.visible, true);
    assert.equal(layer.opacity, 1);
    assert.equal(layer.parallaxFactor, 1);
  });

  it("LayeredTilemap has correct fields", () => {
    const tilemap: LayeredTilemap = {
      config: { textureId: 1, width: 10, height: 10, tileSize: 16, atlasColumns: 4, atlasRows: 4 },
      layers: new Map(),
      width: 10,
      height: 10,
      tileSize: 16,
    };
    assert.equal(tilemap.width, 10);
    assert.equal(tilemap.height, 10);
    assert.equal(tilemap.tileSize, 16);
    assert.equal(tilemap.layers.size, 0);
  });
});

// ---------------------------------------------------------------------------
// Tile properties with complex data
// ---------------------------------------------------------------------------

describe("tile properties with complex values", () => {
  it("stores arrays", () => {
    clearTileProperties();
    defineTileProperties(1, { effects: ["poison", "slow"] });
    const props = getTileProperties(1)!;
    assert.deepEqual(props.effects, ["poison", "slow"]);
    clearTileProperties();
  });

  it("stores nested objects", () => {
    clearTileProperties();
    defineTileProperties(1, {
      cost: { movement: 2, stamina: 1 },
    });
    const props = getTileProperties(1)!;
    assert.deepEqual(props.cost, { movement: 2, stamina: 1 });
    clearTileProperties();
  });

  it("stores numeric and boolean properties", () => {
    clearTileProperties();
    defineTileProperties(1, {
      walkable: true,
      swimmable: false,
      damage: 10,
      friction: 0.8,
    });
    assert.equal(getTileProperty(1, "walkable"), true);
    assert.equal(getTileProperty(1, "swimmable"), false);
    assert.equal(getTileProperty(1, "damage"), 10);
    assert.equal(getTileProperty(1, "friction"), 0.8);
    clearTileProperties();
  });
});

// ---------------------------------------------------------------------------
// Fill tiles helper (headless — no-ops on actual Rust calls but logic works)
// ---------------------------------------------------------------------------

describe("fillTiles", () => {
  it("exported without error", async () => {
    // fillTiles is a no-op in headless mode, but we verify it exists
    const mod = await import("./tilemap.ts");
    assert.equal(typeof mod.fillTiles, "function");
    assert.equal(typeof mod.fillLayerTiles, "function");
  });
});

// ---------------------------------------------------------------------------
// Export verification
// ---------------------------------------------------------------------------

describe("tilemap exports", () => {
  it("exports all new layer functions", async () => {
    const mod = await import("./tilemap.ts");
    assert.equal(typeof mod.createLayeredTilemap, "function");
    assert.equal(typeof mod.setLayerTile, "function");
    assert.equal(typeof mod.getLayerTile, "function");
    assert.equal(typeof mod.setLayerVisible, "function");
    assert.equal(typeof mod.setLayerOpacity, "function");
    assert.equal(typeof mod.getLayerNames, "function");
    assert.equal(typeof mod.drawLayeredTilemap, "function");
  });

  it("exports all animated tile functions", async () => {
    const mod = await import("./tilemap.ts");
    assert.equal(typeof mod.registerAnimatedTile, "function");
    assert.equal(typeof mod.unregisterAnimatedTile, "function");
    assert.equal(typeof mod.clearAnimatedTiles, "function");
    assert.equal(typeof mod.updateAnimatedTiles, "function");
    assert.equal(typeof mod.resolveAnimatedTile, "function");
    assert.equal(typeof mod.getAnimatedTileDefs, "function");
  });

  it("exports all tile property functions", async () => {
    const mod = await import("./tilemap.ts");
    assert.equal(typeof mod.defineTileProperties, "function");
    assert.equal(typeof mod.getTileProperties, "function");
    assert.equal(typeof mod.getTileProperty, "function");
    assert.equal(typeof mod.getTilePropertiesAt, "function");
    assert.equal(typeof mod.getTilePropertyAt, "function");
    assert.equal(typeof mod.clearTileProperties, "function");
  });

  it("preserves backward-compatible exports", async () => {
    const mod = await import("./tilemap.ts");
    assert.equal(typeof mod.createTilemap, "function");
    assert.equal(typeof mod.setTile, "function");
    assert.equal(typeof mod.getTile, "function");
    assert.equal(typeof mod.drawTilemap, "function");
  });
});
