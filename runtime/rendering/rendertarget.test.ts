import { describe, it, assert } from "../testing/harness.ts";
import {
  createRenderTarget,
  beginRenderTarget,
  endRenderTarget,
  getRenderTargetTextureId,
  destroyRenderTarget,
} from "./rendertarget.ts";

describe("Render targets (headless)", () => {
  it("createRenderTarget returns 0 in headless mode", () => {
    const id = createRenderTarget(256, 256);
    assert.equal(id, 0);
  });

  it("getRenderTargetTextureId is identity", () => {
    const id = createRenderTarget(128, 128);
    assert.equal(getRenderTargetTextureId(id), id);
  });

  it("beginRenderTarget / endRenderTarget are no-ops in headless", () => {
    const id = createRenderTarget(64, 64);
    beginRenderTarget(id);
    endRenderTarget();
  });

  it("destroyRenderTarget is a no-op in headless", () => {
    const id = createRenderTarget(64, 64);
    destroyRenderTarget(id);
  });

  it("RenderTargetId is a number", () => {
    const id = createRenderTarget(512, 512);
    assert.equal(typeof id, "number");
  });
});
