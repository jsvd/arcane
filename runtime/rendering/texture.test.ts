import { describe, it, assert } from "../../runtime/testing/harness.ts";
import {
  loadTexture,
  isTextureLoaded,
  getLoadingProgress,
  preloadAssets,
} from "./texture.ts";

describe("texture preloading", () => {
  it("isTextureLoaded returns false for unknown path", () => {
    assert.equal(isTextureLoaded("nonexistent/sprite.png"), false);
  });

  it("getLoadingProgress returns 1.0 initially", () => {
    assert.equal(getLoadingProgress(), 1.0);
  });

  it("preloadAssets with empty array resolves and sets progress to 1.0", async () => {
    await preloadAssets([]);
    assert.equal(getLoadingProgress(), 1.0);
  });

  it("preloadAssets loads textures and marks them as loaded", async () => {
    // In headless mode, loadTexture returns 0 but doesn't throw
    await preloadAssets(["test_a.png", "test_b.png"]);
    assert.equal(isTextureLoaded("test_a.png"), true);
    assert.equal(isTextureLoaded("test_b.png"), true);
    assert.equal(getLoadingProgress(), 1.0);
  });

  it("isTextureLoaded returns true after loadTexture via preload", async () => {
    await preloadAssets(["test_c.png"]);
    assert.equal(isTextureLoaded("test_c.png"), true);
    // Unloaded path still returns false
    assert.equal(isTextureLoaded("never_loaded.png"), false);
  });

  it("preloadAssets is idempotent (same path twice is fine)", async () => {
    await preloadAssets(["idempotent.png", "idempotent.png"]);
    assert.equal(isTextureLoaded("idempotent.png"), true);
    assert.equal(getLoadingProgress(), 1.0);
  });
});
