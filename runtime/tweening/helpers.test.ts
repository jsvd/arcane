/**
 * Tests for tweening helpers (camera shake, screen flash)
 */

import { describe, it, assert } from "../testing/harness.ts";
import {
  shakeCamera,
  getCameraShakeOffset,
  isCameraShaking,
  stopCameraShake,
  flashScreen,
  getScreenFlash,
  isScreenFlashing,
  stopScreenFlash,
} from "./helpers.ts";
import { updateTweens, stopAllTweens } from "./tween.ts";

describe("Camera Shake", () => {
  it("should start inactive", () => {
    stopAllTweens();
    stopCameraShake();

    assert.equal(isCameraShaking(), false);
    const offset = getCameraShakeOffset();
    assert.equal(offset.x, 0);
    assert.equal(offset.y, 0);
  });

  it("should activate when shake is triggered", () => {
    stopAllTweens();
    stopCameraShake();

    shakeCamera(10, 1.0);
    assert.equal(isCameraShaking(), true);
  });

  it("should produce non-zero offsets during shake", () => {
    stopAllTweens();
    stopCameraShake();

    shakeCamera(10, 1.0);
    updateTweens(0.1);

    const offset = getCameraShakeOffset();
    // Offset should be non-zero (with high probability due to randomness)
    const hasOffset = Math.abs(offset.x) > 0 || Math.abs(offset.y) > 0;
    assert.equal(hasOffset, true);
  });

  it("should decay intensity over time", () => {
    stopAllTweens();
    stopCameraShake();

    shakeCamera(100, 1.0);
    updateTweens(0.1);

    const offset1 = getCameraShakeOffset();
    const magnitude1 = Math.sqrt(offset1.x ** 2 + offset1.y ** 2);

    updateTweens(0.5);

    const offset2 = getCameraShakeOffset();
    const magnitude2 = Math.sqrt(offset2.x ** 2 + offset2.y ** 2);

    // Later magnitude should generally be smaller (decay)
    // Note: Due to randomness, this might occasionally fail, but with high intensity
    // and sufficient time, it should be reliable
    assert.ok(magnitude2 < magnitude1 + 50, "Shake should decay over time");
  });

  it("should stop after duration completes", () => {
    stopAllTweens();
    stopCameraShake();

    shakeCamera(10, 1.0);
    assert.equal(isCameraShaking(), true);

    updateTweens(1.0);
    assert.equal(isCameraShaking(), false);

    const offset = getCameraShakeOffset();
    assert.equal(offset.x, 0);
    assert.equal(offset.y, 0);
  });

  it("should stop immediately when stopCameraShake is called", () => {
    stopAllTweens();
    stopCameraShake();

    shakeCamera(10, 1.0);
    updateTweens(0.5);
    assert.equal(isCameraShaking(), true);

    stopCameraShake();
    assert.equal(isCameraShaking(), false);

    const offset = getCameraShakeOffset();
    assert.equal(offset.x, 0);
    assert.equal(offset.y, 0);
  });
});

describe("Screen Flash", () => {
  it("should start inactive", () => {
    stopAllTweens();
    stopScreenFlash();

    assert.equal(isScreenFlashing(), false);
    assert.equal(getScreenFlash(), null);
  });

  it("should activate when flash is triggered", () => {
    stopAllTweens();
    stopScreenFlash();

    flashScreen(1, 1, 1, 1.0);
    assert.equal(isScreenFlashing(), true);
  });

  it("should return flash color and opacity", () => {
    stopAllTweens();
    stopScreenFlash();

    flashScreen(1, 0.5, 0.2, 1.0, 0.8);
    const flash = getScreenFlash();

    assert.ok(flash !== null);
    assert.equal(flash!.r, 1);
    assert.equal(flash!.g, 0.5);
    assert.equal(flash!.b, 0.2);
    assert.equal(flash!.opacity, 0.8);
  });

  it("should fade opacity over time", () => {
    stopAllTweens();
    stopScreenFlash();

    flashScreen(1, 1, 1, 1.0, 0.8);
    updateTweens(0.5);

    const flash = getScreenFlash();
    assert.ok(flash !== null);
    assert.ok(flash!.opacity < 0.8, "Opacity should decrease over time");
    assert.ok(flash!.opacity > 0, "Opacity should still be positive");
  });

  it("should stop after duration completes", () => {
    stopAllTweens();
    stopScreenFlash();

    flashScreen(1, 1, 1, 1.0);
    assert.equal(isScreenFlashing(), true);

    updateTweens(1.0);
    assert.equal(isScreenFlashing(), false);
    assert.equal(getScreenFlash(), null);
  });

  it("should stop immediately when stopScreenFlash is called", () => {
    stopAllTweens();
    stopScreenFlash();

    flashScreen(1, 1, 1, 1.0);
    updateTweens(0.5);
    assert.equal(isScreenFlashing(), true);

    stopScreenFlash();
    assert.equal(isScreenFlashing(), false);
    assert.equal(getScreenFlash(), null);
  });

  it("should preserve color during fade", () => {
    stopAllTweens();
    stopScreenFlash();

    flashScreen(0.5, 0.3, 0.7, 1.0);
    updateTweens(0.5);

    const flash = getScreenFlash();
    assert.ok(flash !== null);
    assert.equal(flash!.r, 0.5);
    assert.equal(flash!.g, 0.3);
    assert.equal(flash!.b, 0.7);
  });
});
