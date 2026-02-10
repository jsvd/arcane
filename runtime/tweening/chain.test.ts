/**
 * Tests for tween chaining
 */

import { describe, it, assert } from "../testing/harness.ts";
import { sequence, parallel, stagger } from "./chain.ts";
import { updateTweens, stopAllTweens, getActiveTweenCount, reverseTween } from "./tween.ts";

describe("Tween Chaining", () => {
  it("sequence should run tweens one after another", () => {
    stopAllTweens();

    const target1 = { x: 0 };
    const target2 = { y: 0 };
    const target3 = { z: 0 };

    sequence([
      { target: target1, props: { x: 100 }, duration: 1.0 },
      { target: target2, props: { y: 100 }, duration: 1.0 },
      { target: target3, props: { z: 100 }, duration: 1.0 },
    ]);

    // First tween should start immediately
    updateTweens(1.0);
    assert.equal(target1.x, 100);
    assert.equal(target2.y, 0); // Not started yet
    assert.equal(target3.z, 0);

    // Second tween starts after first completes
    updateTweens(1.0);
    assert.equal(target1.x, 100);
    assert.equal(target2.y, 100);
    assert.equal(target3.z, 0); // Not started yet

    // Third tween starts after second completes
    updateTweens(1.0);
    assert.equal(target1.x, 100);
    assert.equal(target2.y, 100);
    assert.equal(target3.z, 100);
  });

  it("parallel should run tweens simultaneously", () => {
    stopAllTweens();

    const target1 = { x: 0 };
    const target2 = { y: 0 };
    const target3 = { z: 0 };

    parallel([
      { target: target1, props: { x: 100 }, duration: 1.0 },
      { target: target2, props: { y: 100 }, duration: 1.0 },
      { target: target3, props: { z: 100 }, duration: 1.0 },
    ]);

    // All tweens should run simultaneously
    updateTweens(0.5);
    assert.equal(target1.x, 50);
    assert.equal(target2.y, 50);
    assert.equal(target3.z, 50);

    updateTweens(0.5);
    assert.equal(target1.x, 100);
    assert.equal(target2.y, 100);
    assert.equal(target3.z, 100);
  });

  it("stagger should delay each tween by stagger amount", () => {
    stopAllTweens();

    const target1 = { x: 0 };
    const target2 = { y: 0 };
    const target3 = { z: 0 };

    stagger(
      [
        { target: target1, props: { x: 100 }, duration: 1.0 },
        { target: target2, props: { y: 100 }, duration: 1.0 },
        { target: target3, props: { z: 100 }, duration: 1.0 },
      ],
      0.5
    );

    // First tween starts immediately (delay 0)
    updateTweens(0.5);
    assert.equal(target1.x, 50);
    assert.equal(target2.y, 0); // Still in delay
    assert.equal(target3.z, 0); // Still in delay

    // Second tween starts (delay 0.5), first continues
    updateTweens(0.5);
    assert.equal(target1.x, 100); // Complete
    assert.equal(target2.y, 50); // Halfway
    assert.equal(target3.z, 0); // Still in delay

    // Third tween starts (delay 1.0), second continues
    updateTweens(0.5);
    assert.equal(target1.x, 100);
    assert.equal(target2.y, 100); // Complete
    assert.equal(target3.z, 50); // Halfway

    // All complete
    updateTweens(0.5);
    assert.equal(target1.x, 100);
    assert.equal(target2.y, 100);
    assert.equal(target3.z, 100);
  });

  it("sequence should chain callbacks correctly", () => {
    stopAllTweens();

    let completionOrder: number[] = [];

    sequence([
      {
        target: { x: 0 },
        props: { x: 100 },
        duration: 1.0,
        options: { onComplete: () => completionOrder.push(1) },
      },
      {
        target: { y: 0 },
        props: { y: 100 },
        duration: 1.0,
        options: { onComplete: () => completionOrder.push(2) },
      },
      {
        target: { z: 0 },
        props: { z: 100 },
        duration: 1.0,
        options: { onComplete: () => completionOrder.push(3) },
      },
    ]);

    updateTweens(1.0);
    assert.equal(completionOrder.length, 1);
    assert.equal(completionOrder[0], 1);

    updateTweens(1.0);
    assert.equal(completionOrder.length, 2);
    assert.equal(completionOrder[1], 2);

    updateTweens(1.0);
    assert.equal(completionOrder.length, 3);
    assert.equal(completionOrder[2], 3);
  });

  it("reverseTween should swap start and target values", () => {
    stopAllTweens();

    const target = { x: 0 };
    const tweens = parallel([
      { target, props: { x: 100 }, duration: 1.0 },
    ]);

    // Animate halfway
    updateTweens(0.5);
    assert.equal(target.x, 50);
    assert.equal(getActiveTweenCount(), 1); // Tween still active

    // Reverse the tween
    reverseTween(tweens[0]);
    assert.equal(getActiveTweenCount(), 1); // Tween still active

    // Now it should animate back towards 0
    updateTweens(0.5);
    assert.equal(getActiveTweenCount(), 1); // Should still be active
    assert.equal(target.x, 25); // Halfway from 50 to 0

    updateTweens(0.5);
    assert.equal(getActiveTweenCount(), 0); // Now complete
    assert.equal(target.x, 0);
  });

  it("sequence should handle empty array", () => {
    stopAllTweens();
    const result = sequence([]);
    assert.equal(result.length, 0);
  });

  it("parallel should handle empty array", () => {
    stopAllTweens();
    const result = parallel([]);
    assert.equal(result.length, 0);
  });

  it("stagger should handle empty array", () => {
    stopAllTweens();
    const result = stagger([], 0.5);
    assert.equal(result.length, 0);
  });
});
