import { describe, it, assert } from "../testing/harness.ts";
import { createDistanceJoint, createSoftDistanceJoint, createRevoluteJoint, createSoftRevoluteJoint, removeConstraint } from "./constraints.ts";

describe("physics constraints headless", () => {
  it("createDistanceJoint returns 0", () => {
    assert.equal(createDistanceJoint(1, 2, 100), 0);
  });

  it("createSoftDistanceJoint returns 0", () => {
    assert.equal(createSoftDistanceJoint(1, 2, 100, { frequencyHz: 3, dampingRatio: 0.5 }), 0);
  });

  it("createRevoluteJoint returns 0", () => {
    assert.equal(createRevoluteJoint(1, 2, 50, 50), 0);
  });

  it("createSoftRevoluteJoint returns 0", () => {
    assert.equal(createSoftRevoluteJoint(1, 2, 50, 50, { frequencyHz: 4, dampingRatio: 0.8 }), 0);
  });

  it("removeConstraint does not throw", () => {
    removeConstraint(0);
    removeConstraint(999);
  });

  it("soft params with various values do not throw", () => {
    createSoftDistanceJoint(0, 1, 50, { frequencyHz: 0, dampingRatio: 0 });
    createSoftDistanceJoint(0, 1, 50, { frequencyHz: 30, dampingRatio: 2.0 });
    createSoftRevoluteJoint(0, 1, 0, 0, { frequencyHz: 1, dampingRatio: 1.0 });
  });

  it("multiple constraints can be created", () => {
    const a = createDistanceJoint(1, 2, 10);
    const b = createRevoluteJoint(3, 4, 0, 0);
    const c = createSoftDistanceJoint(5, 6, 20, { frequencyHz: 5, dampingRatio: 0.5 });
    assert.equal(a, 0);
    assert.equal(b, 0);
    assert.equal(c, 0);
  });

  it("zero distance returns 0", () => {
    assert.equal(createSoftDistanceJoint(0, 1, 0, { frequencyHz: 1, dampingRatio: 1 }), 0);
  });
});
