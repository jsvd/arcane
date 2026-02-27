/**
 * Tests for placeholder sprite generation.
 */

import { describe, it, assert } from "../testing/harness.ts";
import {
  placeholder,
  quickPlaceholder,
  PLACEHOLDER_COLORS,
  _clearPlaceholderCache,
  _getPlaceholderCacheSize,
} from "./placeholder.ts";

describe("placeholder", () => {
  it("returns a texture id (0 in headless)", () => {
    _clearPlaceholderCache();
    const tex = placeholder("test-sprite");
    assert.equal(typeof tex, "number");
  });

  it("caches textures by name and options", () => {
    _clearPlaceholderCache();

    const tex1 = placeholder("player", { shape: "circle", color: [1, 0, 0] });
    const tex2 = placeholder("player", { shape: "circle", color: [1, 0, 0] });
    placeholder("player", { shape: "square", color: [1, 0, 0] });

    // Same params should return same handle (even if 0 in headless)
    assert.equal(tex1, tex2);
    // Different shape should be different cache entry
    // In headless mode both are 0, but cache size differs
    assert.equal(_getPlaceholderCacheSize(), 2);
  });

  it("supports all shape types", () => {
    _clearPlaceholderCache();

    const shapes = [
      "circle",
      "square",
      "diamond",
      "triangle",
      "hexagon",
      "star",
    ] as const;

    for (const shape of shapes) {
      const tex = placeholder(`test-${shape}`, { shape });
      assert.equal(typeof tex, "number");
    }

    assert.equal(_getPlaceholderCacheSize(), 6);
  });

  it("defaults to square shape and gray color", () => {
    _clearPlaceholderCache();
    const tex = placeholder("default-test");
    assert.equal(typeof tex, "number");
  });

  it("supports custom sizes", () => {
    _clearPlaceholderCache();

    const small = placeholder("small", { size: 8 });
    const large = placeholder("large", { size: 64 });

    assert.equal(typeof small, "number");
    assert.equal(typeof large, "number");
    assert.equal(_getPlaceholderCacheSize(), 2);
  });

  it("supports outline option", () => {
    _clearPlaceholderCache();

    const noOutline = placeholder("no-outline", { outline: false });
    const withOutline = placeholder("with-outline", { outline: true });

    assert.equal(typeof noOutline, "number");
    assert.equal(typeof withOutline, "number");
  });

  it("supports custom outline color", () => {
    _clearPlaceholderCache();

    const tex = placeholder("custom-outline", {
      color: [1, 1, 1],
      outline: true,
      outlineColor: [0, 0, 0],
    });

    assert.equal(typeof tex, "number");
  });
});

describe("quickPlaceholder", () => {
  it("uses predefined colors", () => {
    _clearPlaceholderCache();

    const player = quickPlaceholder("player");
    const enemy = quickPlaceholder("enemy");
    const coin = quickPlaceholder("coin");

    assert.equal(typeof player, "number");
    assert.equal(typeof enemy, "number");
    assert.equal(typeof coin, "number");
  });

  it("assigns default shapes based on type", () => {
    _clearPlaceholderCache();

    // These should use different default shapes
    const player = quickPlaceholder("player"); // circle
    const enemy = quickPlaceholder("enemy"); // diamond
    const wall = quickPlaceholder("wall"); // square
    const tree = quickPlaceholder("tree"); // triangle

    // All return numbers (0 in headless)
    assert.equal(typeof player, "number");
    assert.equal(typeof enemy, "number");
    assert.equal(typeof wall, "number");
    assert.equal(typeof tree, "number");
  });

  it("allows shape override", () => {
    _clearPlaceholderCache();

    quickPlaceholder("enemy"); // default diamond
    quickPlaceholder("enemy", { shape: "hexagon" }); // override to hexagon

    assert.equal(_getPlaceholderCacheSize(), 2);
  });

  it("allows size override", () => {
    _clearPlaceholderCache();

    quickPlaceholder("coin", { size: 16 });
    quickPlaceholder("coin", { size: 48 });

    assert.equal(_getPlaceholderCacheSize(), 2);
  });
});

describe("PLACEHOLDER_COLORS", () => {
  it("has colors for common game objects", () => {
    // Characters
    assert.ok(PLACEHOLDER_COLORS.player);
    assert.ok(PLACEHOLDER_COLORS.enemy);
    assert.ok(PLACEHOLDER_COLORS.npc);

    // Environment
    assert.ok(PLACEHOLDER_COLORS.wall);
    assert.ok(PLACEHOLDER_COLORS.floor);
    assert.ok(PLACEHOLDER_COLORS.water);
    assert.ok(PLACEHOLDER_COLORS.grass);
    assert.ok(PLACEHOLDER_COLORS.tree);
    assert.ok(PLACEHOLDER_COLORS.rock);

    // Items
    assert.ok(PLACEHOLDER_COLORS.coin);
    assert.ok(PLACEHOLDER_COLORS.gem);
    assert.ok(PLACEHOLDER_COLORS.heart);
    assert.ok(PLACEHOLDER_COLORS.key);
    assert.ok(PLACEHOLDER_COLORS.chest);
    assert.ok(PLACEHOLDER_COLORS.potion);

    // Effects
    assert.ok(PLACEHOLDER_COLORS.bullet);
    assert.ok(PLACEHOLDER_COLORS.explosion);
    assert.ok(PLACEHOLDER_COLORS.magic);

    // UI
    assert.ok(PLACEHOLDER_COLORS.button);
    assert.ok(PLACEHOLDER_COLORS.panel);
  });

  it("colors are valid RGB tuples", () => {
    for (const [, color] of Object.entries(PLACEHOLDER_COLORS)) {
      assert.ok(Array.isArray(color));
      assert.equal(color.length, 3);
      for (const channel of color) {
        assert.equal(typeof channel, "number");
        assert.ok(channel >= 0 && channel <= 1);
      }
    }
  });
});

describe("_clearPlaceholderCache", () => {
  it("clears all cached textures", () => {
    placeholder("cache-test-1");
    placeholder("cache-test-2");
    placeholder("cache-test-3");

    assert.ok(_getPlaceholderCacheSize() > 0);

    _clearPlaceholderCache();

    assert.equal(_getPlaceholderCacheSize(), 0);
  });
});

describe("_getPlaceholderCacheSize", () => {
  it("returns accurate count", () => {
    _clearPlaceholderCache();
    assert.equal(_getPlaceholderCacheSize(), 0);

    placeholder("count-1");
    assert.equal(_getPlaceholderCacheSize(), 1);

    placeholder("count-2");
    assert.equal(_getPlaceholderCacheSize(), 2);

    // Same call should not increase count
    placeholder("count-1");
    assert.equal(_getPlaceholderCacheSize(), 2);
  });
});
