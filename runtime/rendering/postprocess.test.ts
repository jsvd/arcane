import { describe, it, assert } from "../testing/harness.ts";
import { addPostProcessEffect, setEffectParam, removeEffect, clearEffects } from "./postprocess.ts";

describe("postprocess headless", () => {
  it("addPostProcessEffect bloom returns 0", () => {
    assert.equal(addPostProcessEffect("bloom"), 0);
  });

  it("addPostProcessEffect blur returns 0", () => {
    assert.equal(addPostProcessEffect("blur"), 0);
  });

  it("addPostProcessEffect vignette returns 0", () => {
    assert.equal(addPostProcessEffect("vignette"), 0);
  });

  it("addPostProcessEffect crt returns 0", () => {
    assert.equal(addPostProcessEffect("crt"), 0);
  });

  it("setEffectParam does not throw", () => {
    setEffectParam(0, 0, 1.0);
    setEffectParam(0, 1, 0.5, 0.3);
    setEffectParam(0, 2, 0.1, 0.2, 0.3);
    setEffectParam(0, 3, 0.1, 0.2, 0.3, 0.4);
  });

  it("removeEffect does not throw", () => {
    removeEffect(0);
    removeEffect(999);
  });

  it("clearEffects does not throw", () => {
    clearEffects();
  });

  it("chained add+set+remove does not throw", () => {
    const id = addPostProcessEffect("bloom");
    setEffectParam(id, 0, 0.7, 0.5, 3.0);
    removeEffect(id);
  });

  it("chained add+add+clear does not throw", () => {
    addPostProcessEffect("bloom");
    addPostProcessEffect("vignette");
    clearEffects();
  });

  it("multiple effects can be added", () => {
    const a = addPostProcessEffect("bloom");
    const b = addPostProcessEffect("crt");
    const c = addPostProcessEffect("blur");
    assert.equal(a, 0);
    assert.equal(b, 0);
    assert.equal(c, 0);
  });
});
