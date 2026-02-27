/**
 * Tests for core tweening system
 */

import { describe, it, assert } from "../testing/harness.ts";
import {
  tween,
  updateTweens,
  cancelTween,
  pauseTween,
  resumeTween,
  stopAllTweens,
  getActiveTweenCount,
} from "./tween.ts";
import { TweenState } from "./types.ts";

describe("Core Tweening", () => {
  it("should tween a single property", () => {
    stopAllTweens();
    const target = { x: 0 };
    tween(target, { x: 100 }, 1.0);

    // At 0s
    assert.equal(target.x, 0);

    // At 0.5s (halfway)
    updateTweens(0.5);
    assert.equal(target.x, 50);

    // At 1.0s (complete)
    updateTweens(0.5);
    assert.equal(target.x, 100);
  });

  it("should tween multiple properties", () => {
    stopAllTweens();
    const target = { x: 0, y: 0, scale: 1 };
    tween(target, { x: 100, y: 50, scale: 2 }, 1.0);

    updateTweens(0.5);
    assert.equal(target.x, 50);
    assert.equal(target.y, 25);
    assert.equal(target.scale, 1.5);

    updateTweens(0.5);
    assert.equal(target.x, 100);
    assert.equal(target.y, 50);
    assert.equal(target.scale, 2);
  });

  it("should handle delay", () => {
    const target = { x: 0 };
    const t = tween(target, { x: 100 }, 1.0, { delay: 0.5 });

    // Initially pending
    assert.equal(t.state, TweenState.PENDING);

    // During delay, target unchanged
    updateTweens(0.3);
    assert.equal(target.x, 0);
    assert.equal(t.state, TweenState.PENDING);

    // After delay, tween starts
    updateTweens(0.2);
    assert.equal(t.state, TweenState.ACTIVE);

    // Now tweening
    updateTweens(0.5);
    assert.equal(target.x, 50);
  });

  it("should call onStart callback after delay", () => {
    let started = false;
    const target = { x: 0 };

    tween(target, { x: 100 }, 1.0, {
      delay: 0.5,
      onStart: () => {
        started = true;
      },
    });

    assert.equal(started, false);

    // Before delay ends
    updateTweens(0.3);
    assert.equal(started, false);

    // After delay ends
    updateTweens(0.2);
    assert.equal(started, true);
  });

  it("should call onUpdate callback", () => {
    let updateCount = 0;
    let lastProgress = 0;
    const target = { x: 0 };

    tween(target, { x: 100 }, 1.0, {
      onUpdate: (progress) => {
        updateCount++;
        lastProgress = progress;
      },
    });

    updateTweens(0.5);
    assert.equal(updateCount, 1);
    assert.ok(Math.abs(lastProgress - 0.5) < 0.01, `Expected progress ~0.5, got ${lastProgress}`);

    updateTweens(0.5);
    assert.equal(updateCount, 2);
    assert.ok(Math.abs(lastProgress - 1.0) < 0.01, `Expected progress ~1.0, got ${lastProgress}`);
  });

  it("should call onComplete callback", () => {
    let completed = false;
    const target = { x: 0 };

    tween(target, { x: 100 }, 1.0, {
      onComplete: () => {
        completed = true;
      },
    });

    updateTweens(0.5);
    assert.equal(completed, false);

    updateTweens(0.5);
    assert.equal(completed, true);
  });

  it("should remove completed tweens from active list", () => {
    const target = { x: 0 };
    tween(target, { x: 100 }, 1.0);

    assert.equal(getActiveTweenCount(), 1);

    updateTweens(1.0);
    assert.equal(getActiveTweenCount(), 0);
  });

  it("should handle repeat", () => {
    let repeatCount = 0;
    const target = { x: 0 };

    tween(target, { x: 100 }, 1.0, {
      repeat: 2,
      onRepeat: () => {
        repeatCount++;
      },
    });

    // First iteration
    updateTweens(1.0);
    assert.equal(target.x, 100);
    assert.equal(repeatCount, 1);

    // Second iteration
    updateTweens(1.0);
    assert.equal(target.x, 100);
    assert.equal(repeatCount, 2);

    // Third iteration (completes)
    updateTweens(1.0);
    assert.equal(target.x, 100);
    assert.equal(repeatCount, 2);
    assert.equal(getActiveTweenCount(), 0);
  });

  it("should handle infinite repeat", () => {
    const target = { x: 0 };
    tween(target, { x: 100 }, 1.0, { repeat: -1 });

    for (let i = 0; i < 10; i++) {
      updateTweens(1.0);
      assert.equal(target.x, 100);
    }

    // Should still be active
    assert.equal(getActiveTweenCount(), 1);
  });

  it("should handle yoyo mode", () => {
    stopAllTweens();
    const target = { x: 0 };
    tween(target, { x: 100 }, 1.0, { repeat: 1, yoyo: true });

    // Forward
    updateTweens(1.0);
    assert.equal(target.x, 100);

    // Backward
    updateTweens(1.0);
    assert.equal(target.x, 0);

    assert.equal(getActiveTweenCount(), 0);
  });

  it("should stop a tween", () => {
    stopAllTweens();
    const target = { x: 0 };
    const t = tween(target, { x: 100 }, 1.0);

    updateTweens(0.5);
    assert.equal(target.x, 50);

    cancelTween(t);
    assert.equal(t.state, TweenState.STOPPED);
    assert.equal(getActiveTweenCount(), 0);

    // Further updates do nothing
    updateTweens(0.5);
    assert.equal(target.x, 50);
  });

  it("should pause and resume a tween", () => {
    const target = { x: 0 };
    const t = tween(target, { x: 100 }, 1.0);

    updateTweens(0.3);
    assert.equal(target.x, 30);

    pauseTween(t);
    assert.equal(t.state, TweenState.PAUSED);

    // No update while paused
    updateTweens(0.5);
    assert.equal(target.x, 30);

    resumeTween(t);
    assert.equal(t.state, TweenState.ACTIVE);

    // Continues from where it left off
    updateTweens(0.5);
    assert.equal(target.x, 80);
  });

  it("should handle multiple simultaneous tweens", () => {
    stopAllTweens();
    const target1 = { x: 0 };
    const target2 = { y: 0 };
    const target3 = { z: 0 };

    tween(target1, { x: 100 }, 1.0);
    tween(target2, { y: 200 }, 2.0);
    tween(target3, { z: 50 }, 0.5);

    assert.equal(getActiveTweenCount(), 3);

    updateTweens(0.5);
    assert.equal(target1.x, 50);
    assert.equal(target2.y, 50);
    assert.equal(target3.z, 50);
    assert.equal(getActiveTweenCount(), 2); // target3 completed

    updateTweens(0.5);
    assert.equal(target1.x, 100);
    assert.equal(target2.y, 100);
    assert.equal(getActiveTweenCount(), 1); // target1 completed

    updateTweens(1.0);
    assert.equal(target2.y, 200);
    assert.equal(getActiveTweenCount(), 0); // all completed
  });

  it("should stop all tweens", () => {
    stopAllTweens();
    tween({ x: 0 }, { x: 100 }, 1.0);
    tween({ y: 0 }, { y: 100 }, 1.0);
    tween({ z: 0 }, { z: 100 }, 1.0);

    assert.equal(getActiveTweenCount(), 3);

    stopAllTweens();
    assert.equal(getActiveTweenCount(), 0);
  });

  it("should handle custom easing function", () => {
    const target = { x: 0 };
    // Square easing: t^2
    tween(target, { x: 100 }, 1.0, {
      easing: (t) => t * t,
    });

    updateTweens(0.5);
    // With square easing: 0.5^2 = 0.25
    assert.equal(target.x, 25);

    updateTweens(0.5);
    assert.equal(target.x, 100);
  });

  it("should handle negative target values", () => {
    const target = { x: 100 };
    tween(target, { x: -50 }, 1.0);

    updateTweens(0.5);
    assert.equal(target.x, 25); // Halfway between 100 and -50

    updateTweens(0.5);
    assert.equal(target.x, -50);
  });

  it("should initialize missing properties to zero", () => {
    const target: any = {};
    tween(target, { x: 100 }, 1.0);

    updateTweens(0.5);
    assert.equal(target.x, 50);
  });

  it("should handle zero duration", () => {
    stopAllTweens();
    const target = { x: 0 };
    tween(target, { x: 100 }, 0);

    // Should complete immediately
    updateTweens(0);
    assert.equal(target.x, 100);
    assert.equal(getActiveTweenCount(), 0);
  });
});
