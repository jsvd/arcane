import { describe, it, assert } from "../testing/harness.ts";
import { defaultDescribe } from "./describe.ts";

describe("defaultDescribe", () => {
  describe("minimal verbosity", () => {
    it("shows object keys only", () => {
      const result = defaultDescribe({ hp: 10, mp: 5 }, { verbosity: "minimal" });
      assert.equal(result, "{hp, mp}");
    });

    it("shows Array(N) for arrays", () => {
      const result = defaultDescribe([1, 2, 3], { verbosity: "minimal" });
      assert.equal(result, "Array(3)");
    });
  });

  describe("normal verbosity", () => {
    it("shows key-value pairs for <= 3 keys", () => {
      const result = defaultDescribe({ a: 1, b: 2 }, { verbosity: "normal" });
      assert.ok(result.includes("a: 1"));
      assert.ok(result.includes("b: 2"));
    });

    it("shows first 3 and suffix for > 3 keys", () => {
      const result = defaultDescribe({ a: 1, b: 2, c: 3, d: 4, e: 5 }, { verbosity: "normal" });
      assert.ok(result.includes("a: 1"));
      assert.ok(result.includes("5 keys total"));
    });

    it("shows all items for array <= 3", () => {
      const result = defaultDescribe([10, 20], { verbosity: "normal" });
      assert.ok(result.includes("10"));
      assert.ok(result.includes("20"));
    });

    it("shows first 3 and suffix for array > 3", () => {
      const result = defaultDescribe([1, 2, 3, 4, 5], { verbosity: "normal" });
      assert.ok(result.includes("5 total"));
    });

    it("is default when verbosity not specified", () => {
      const result = defaultDescribe({ a: 1, b: 2 }, {});
      assert.ok(result.includes("a: 1"));
      assert.ok(result.includes("b: 2"));
    });
  });

  describe("detailed verbosity", () => {
    it("returns JSON.stringify with indentation", () => {
      const state = { hp: 100, name: "hero" };
      const result = defaultDescribe(state, { verbosity: "detailed" });
      assert.equal(result, JSON.stringify(state, null, 2));
    });
  });

  describe("path navigation", () => {
    it("accesses nested property", () => {
      const state = { player: { hp: 42 } };
      const result = defaultDescribe(state, { verbosity: "detailed", path: "player.hp" });
      assert.equal(result, "42");
    });

    it("deep nesting works", () => {
      const state = { a: { b: { c: { d: 99 } } } };
      const result = defaultDescribe(state, { verbosity: "detailed", path: "a.b.c.d" });
      assert.equal(result, "99");
    });

    it("invalid path returns not found", () => {
      const state = { x: 1 };
      const result = defaultDescribe(state, { path: "foo.bar" });
      assert.equal(result, 'Path "foo.bar" not found');
    });
  });

  describe("edge cases", () => {
    it("undefined state returns No state", () => {
      const result = defaultDescribe(undefined, {});
      assert.equal(result, "No state");
    });

    it("null state returns null", () => {
      const result = defaultDescribe(null, {});
      assert.equal(result, "null");
    });

    it("boolean state returns string", () => {
      assert.equal(defaultDescribe(true, {}), "true");
      assert.equal(defaultDescribe(false, {}), "false");
    });

    it("number state returns string", () => {
      assert.equal(defaultDescribe(42, {}), "42");
    });

    it("string state returns string", () => {
      assert.equal(defaultDescribe("hello", {}), "hello");
    });

    it("nested array summarized in normal", () => {
      const result = defaultDescribe({ items: [1, 2, 3] }, { verbosity: "normal" });
      assert.ok(result.includes("items: Array(3)"));
    });

    it("nested object summarized as N keys", () => {
      const result = defaultDescribe({ sub: { a: 1, b: 2 } }, { verbosity: "normal" });
      assert.ok(result.includes("sub: {2 keys}"));
    });
  });
});
