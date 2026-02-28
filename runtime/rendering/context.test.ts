import { describe, it, assert } from "../testing/harness.ts";
import { withScreenSpace, isScreenSpaceActive, resolveScreenSpace } from "./context.ts";

describe("withScreenSpace", () => {
  it("isScreenSpaceActive returns false by default", () => {
    assert.equal(isScreenSpaceActive(), false);
  });

  it("isScreenSpaceActive returns true inside withScreenSpace", () => {
    let inside = false;
    withScreenSpace(() => {
      inside = isScreenSpaceActive();
    });
    assert.equal(inside, true);
    assert.equal(isScreenSpaceActive(), false);
  });

  it("nested withScreenSpace maintains active state", () => {
    let outerBefore = false;
    let inner = false;
    let outerAfter = false;
    withScreenSpace(() => {
      outerBefore = isScreenSpaceActive();
      withScreenSpace(() => {
        inner = isScreenSpaceActive();
      });
      outerAfter = isScreenSpaceActive();
    });
    assert.equal(outerBefore, true);
    assert.equal(inner, true);
    assert.equal(outerAfter, true);
    assert.equal(isScreenSpaceActive(), false);
  });

  it("exception safety — context pops even on throw", () => {
    try {
      withScreenSpace(() => {
        throw new Error("boom");
      });
    } catch (_) {
      // expected
    }
    assert.equal(isScreenSpaceActive(), false);
  });
});

describe("resolveScreenSpace", () => {
  it("returns false when no context and no explicit", () => {
    assert.equal(resolveScreenSpace(undefined), false);
  });

  it("returns true inside context when no explicit", () => {
    let result = false;
    withScreenSpace(() => {
      result = resolveScreenSpace(undefined);
    });
    assert.equal(result, true);
  });

  it("explicit true overrides outside context", () => {
    assert.equal(resolveScreenSpace(true), true);
  });

  it("explicit false overrides inside context", () => {
    let result = true;
    withScreenSpace(() => {
      result = resolveScreenSpace(false);
    });
    assert.equal(result, false);
  });

  it("explicit true inside context stays true", () => {
    let result = false;
    withScreenSpace(() => {
      result = resolveScreenSpace(true);
    });
    assert.equal(result, true);
  });
});
