import { describe, it, assert } from "../../runtime/testing/harness.ts";
import { setPalette, getPalette, paletteColor, resetPalette } from "./palette.ts";

describe("palette", () => {
  it("default palette has all standard keys", () => {
    resetPalette();
    const p = getPalette();
    const keys = ["bg", "fg", "primary", "secondary", "accent", "danger", "success", "warning"];
    for (const key of keys) {
      assert.ok(p[key] !== undefined, `palette should have key "${key}"`);
      assert.equal(typeof p[key].r, "number", `${key}.r should be a number`);
      assert.equal(typeof p[key].g, "number", `${key}.g should be a number`);
      assert.equal(typeof p[key].b, "number", `${key}.b should be a number`);
      assert.equal(typeof p[key].a, "number", `${key}.a should be a number`);
    }
  });

  it("getPalette returns current palette", () => {
    resetPalette();
    const p = getPalette();
    assert.equal(p.primary.r, 0.3, "primary.r should be 0.3");
    assert.equal(p.primary.g, 0.6, "primary.g should be 0.6");
    assert.equal(p.primary.b, 1, "primary.b should be 1");
    assert.equal(p.primary.a, 1, "primary.a should be 1");
  });

  it("setPalette merges with existing (does not replace entirely)", () => {
    resetPalette();
    const originalDanger = { ...getPalette().danger };
    setPalette({ primary: { r: 1, g: 0, b: 0, a: 1 } });
    const p = getPalette();
    assert.equal(p.primary.r, 1, "primary.r should be updated to 1");
    assert.equal(p.primary.g, 0, "primary.g should be updated to 0");
    assert.equal(p.danger.r, originalDanger.r, "danger.r should be unchanged");
    assert.equal(p.danger.g, originalDanger.g, "danger.g should be unchanged");
  });

  it("paletteColor returns correct color for known key", () => {
    resetPalette();
    const c = paletteColor("accent");
    assert.equal(c.r, 1, "accent.r should be 1");
    assert.equal(c.g, 0.75, "accent.g should be 0.75");
    assert.equal(c.b, 0.2, "accent.b should be 0.2");
    assert.equal(c.a, 1, "accent.a should be 1");
  });

  it("paletteColor returns white for unknown key", () => {
    resetPalette();
    const c = paletteColor("nonexistent");
    assert.equal(c.r, 1, "fallback r should be 1");
    assert.equal(c.g, 1, "fallback g should be 1");
    assert.equal(c.b, 1, "fallback b should be 1");
    assert.equal(c.a, 1, "fallback a should be 1");
  });

  it("custom keys work", () => {
    resetPalette();
    setPalette({ myCustom: { r: 0.1, g: 0.2, b: 0.3, a: 0.4 } });
    const c = paletteColor("myCustom");
    assert.equal(c.r, 0.1, "custom r should be 0.1");
    assert.equal(c.g, 0.2, "custom g should be 0.2");
    assert.equal(c.b, 0.3, "custom b should be 0.3");
    assert.equal(c.a, 0.4, "custom a should be 0.4");
  });

  it("resetPalette returns to defaults", () => {
    setPalette({ primary: { r: 0, g: 0, b: 0, a: 0 } });
    assert.equal(getPalette().primary.r, 0, "primary.r should be 0 after setPalette");
    resetPalette();
    assert.equal(getPalette().primary.r, 0.3, "primary.r should be 0.3 after reset");
    assert.equal(getPalette().primary.g, 0.6, "primary.g should be 0.6 after reset");
  });
});
