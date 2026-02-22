import { describe, it, assert } from "../testing/harness.ts";
import { loadAtlasFromDef, createAtlasBuilder } from "./atlas.ts";
import type { PackDefinition } from "./atlas.ts";

describe("atlas", () => {
  // Mock pack definition for testing
  const mockPack: PackDefinition = {
    id: "test-pack",
    primarySheet: "sheet.png",
    sheetWidth: 256,
    sheetHeight: 256,
    tileSize: 32,
    sprites: {
      "player": { x: 0, y: 0, w: 32, h: 32 },
      "enemy": { x: 32, y: 0, w: 32, h: 32 },
      "small-tile": { x: 64, y: 0 }, // Uses tileSize default
      "animated": {
        frames: [
          { x: 0, y: 32, w: 32, h: 32 },
          { x: 32, y: 32, w: 32, h: 32 },
          { x: 64, y: 32, w: 32, h: 32 },
        ],
        fps: 10,
        loop: true,
      },
    },
    tags: {
      "character": ["player", "enemy"],
      "terrain": ["small-tile"],
    },
  };

  describe("loadAtlasFromDef", () => {
    it("creates atlas with correct properties", () => {
      const atlas = loadAtlasFromDef(mockPack);
      assert.equal(atlas.id, "test-pack");
      assert.equal(atlas.sheetWidth, 256);
      assert.equal(atlas.sheetHeight, 256);
      assert.equal(atlas.tileSize, 32);
    });

    it("has() returns true for existing sprites", () => {
      const atlas = loadAtlasFromDef(mockPack);
      assert.equal(atlas.has("player"), true);
      assert.equal(atlas.has("enemy"), true);
      assert.equal(atlas.has("animated"), true);
      assert.equal(atlas.has("nonexistent"), false);
    });

    it("info() returns sprite dimensions", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const playerInfo = atlas.info("player");
      if (!playerInfo) { throw new Error("Expected playerInfo to exist"); return; }
      assert.equal(playerInfo.w, 32);
      assert.equal(playerInfo.h, 32);
      assert.equal(playerInfo.frames, 1);
    });

    it("info() returns tileSize for sprites without w/h", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const tileInfo = atlas.info("small-tile");
      if (!tileInfo) { throw new Error("Expected tileInfo to exist"); return; }
      assert.equal(tileInfo.w, 32);
      assert.equal(tileInfo.h, 32);
    });

    it("info() returns animation info for animated sprites", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const animInfo = atlas.info("animated");
      if (!animInfo) { throw new Error("Expected animInfo to exist"); return; }
      assert.equal(animInfo.frames, 3);
      assert.equal(animInfo.fps, 10);
      assert.equal(animInfo.loop, true);
    });

    it("info() returns null for nonexistent sprite", () => {
      const atlas = loadAtlasFromDef(mockPack);
      assert.equal(atlas.info("nonexistent"), null);
    });

    it("getByTag() returns sprite names", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const characters = atlas.getByTag("character");
      assert.equal(characters.length, 2);
      assert.ok(characters.includes("player"));
      assert.ok(characters.includes("enemy"));
    });

    it("getByTag() returns empty array for unknown tag", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const unknown = atlas.getByTag("unknown");
      assert.equal(unknown.length, 0);
    });

    it("getSpriteNames() returns all sprite names", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const names = atlas.getSpriteNames();
      assert.equal(names.length, 4);
      assert.ok(names.includes("player"));
      assert.ok(names.includes("animated"));
    });

    it("getTagNames() returns all tag names", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const tags = atlas.getTagNames();
      assert.equal(tags.length, 2);
      assert.ok(tags.includes("character"));
      assert.ok(tags.includes("terrain"));
    });

    it("sprite() returns normalized UV coordinates", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const opts = atlas.sprite("player", { x: 100, y: 100 });
      const uv = opts.uv;
      if (!uv) { throw new Error("Expected uv to exist"); return; }
      assert.equal(uv.x, 0); // 0 / 256
      assert.equal(uv.y, 0); // 0 / 256
      assert.equal(uv.w, 32 / 256);
      assert.equal(uv.h, 32 / 256);
    });

    it("sprite() centers sprite at position", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const opts = atlas.sprite("player", { x: 100, y: 100 });

      // Position should be offset to center the sprite
      assert.equal(opts.x, 100 - 16); // centered
      assert.equal(opts.y, 100 - 16);
      assert.equal(opts.w, 32);
      assert.equal(opts.h, 32);
    });

    it("sprite() applies scale", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const opts = atlas.sprite("player", { x: 100, y: 100, scale: 2 });

      assert.equal(opts.w, 64);
      assert.equal(opts.h, 64);
      assert.equal(opts.x, 100 - 32); // centered at scaled size
      assert.equal(opts.y, 100 - 32);
    });

    it("sprite() applies rotation", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const opts = atlas.sprite("player", { x: 100, y: 100, rotation: Math.PI });

      assert.equal(opts.rotation, Math.PI);
      assert.equal(opts.originX, 0.5);
      assert.equal(opts.originY, 0.5);
    });

    it("sprite() applies flip", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const opts = atlas.sprite("player", { x: 100, y: 100, flipX: true });

      assert.equal(opts.flipX, true);
    });

    it("sprite() applies opacity", () => {
      const atlas = loadAtlasFromDef(mockPack);
      const opts = atlas.sprite("player", { x: 100, y: 100, opacity: 0.5 });

      assert.equal(opts.opacity, 0.5);
    });

    it("sprite() handles animated sprites with frame index", () => {
      const atlas = loadAtlasFromDef(mockPack);

      const frame0 = atlas.sprite("animated", { x: 100, y: 100, frame: 0 });
      const uv0 = frame0.uv;
      if (!uv0) { throw new Error("Expected uv0 to exist"); return; }
      assert.equal(uv0.x, 0 / 256);

      const frame1 = atlas.sprite("animated", { x: 100, y: 100, frame: 1 });
      const uv1 = frame1.uv;
      if (!uv1) { throw new Error("Expected uv1 to exist"); return; }
      assert.equal(uv1.x, 32 / 256);

      const frame2 = atlas.sprite("animated", { x: 100, y: 100, frame: 2 });
      const uv2 = frame2.uv;
      if (!uv2) { throw new Error("Expected uv2 to exist"); return; }
      assert.equal(uv2.x, 64 / 256);
    });

    it("sprite() wraps frame index for animations", () => {
      const atlas = loadAtlasFromDef(mockPack);

      // Frame 3 should wrap to frame 0
      const frame3 = atlas.sprite("animated", { x: 100, y: 100, frame: 3 });
      const uv3 = frame3.uv;
      if (!uv3) { throw new Error("Expected uv3 to exist"); return; }
      assert.equal(uv3.x, 0 / 256);
    });

    it("sprite() throws for nonexistent sprite", () => {
      const atlas = loadAtlasFromDef(mockPack);
      let threw = false;
      try {
        atlas.sprite("nonexistent", { x: 0, y: 0 });
      } catch (e) {
        threw = true;
        assert.ok((e as Error).message.includes("not found"));
      }
      assert.ok(threw, "Expected error to be thrown");
    });

    it("throws if sheetWidth/sheetHeight missing", () => {
      const badPack = {
        id: "bad",
        primarySheet: "sheet.png",
        sprites: {},
      } as PackDefinition;

      let threw = false;
      try {
        loadAtlasFromDef(badPack);
      } catch (e) {
        threw = true;
        assert.ok((e as Error).message.includes("sheetWidth"));
      }
      assert.ok(threw, "Expected error to be thrown");
    });
  });

  describe("createAtlasBuilder", () => {
    it("builds atlas with added sprites", () => {
      // Note: can't actually test with real textureId without renderer
      // This tests the structure at least
      const builder = createAtlasBuilder(0, 128, 128);
      builder.addSprite("test", { x: 0, y: 0, w: 16, h: 16 });
      builder.addTag("items", ["test"]);

      const atlas = builder.build("custom-atlas");
      assert.equal(atlas.id, "custom-atlas");
      assert.equal(atlas.has("test"), true);
      assert.equal(atlas.getByTag("items").length, 1);
    });

    it("supports animated sprites", () => {
      const builder = createAtlasBuilder(0, 128, 128);
      builder.addAnimatedSprite("walk", {
        frames: [
          { x: 0, y: 0, w: 16, h: 16 },
          { x: 16, y: 0, w: 16, h: 16 },
        ],
        fps: 8,
        loop: true,
      });

      const atlas = builder.build();
      const info = atlas.info("walk");
      if (!info) { throw new Error("Expected info to exist"); return; }
      assert.equal(info.frames, 2);
      assert.equal(info.fps, 8);
    });
  });
});
