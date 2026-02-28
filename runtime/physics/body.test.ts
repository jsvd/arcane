import { describe, it, assert } from "../testing/harness.ts";
import { createBody, _boxPolygonVertices, destroyBody, getBodyState, setBodyVelocity, applyForce, applyImpulse, setBodyPosition, getAllBodyStates } from "./body.ts";

describe("createBody", () => {
  it("returns 0 for circle shape in headless", () => {
    const id = createBody({ type: "dynamic", shape: { type: "circle", radius: 10 }, x: 0, y: 0 });
    assert.equal(id, 0);
  });

  it("returns 0 for aabb shape in headless", () => {
    const id = createBody({ type: "dynamic", shape: { type: "aabb", halfW: 10, halfH: 5 }, x: 0, y: 0 });
    assert.equal(id, 0);
  });

  it("returns 0 for polygon shape in headless", () => {
    const verts: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const id = createBody({ type: "dynamic", shape: { type: "polygon", vertices: verts }, x: 0, y: 0 });
    assert.equal(id, 0);
  });

  it("returns 0 for static body type", () => {
    const id = createBody({ type: "static", shape: { type: "circle", radius: 5 }, x: 0, y: 0 });
    assert.equal(id, 0);
  });

  it("returns 0 for kinematic body type", () => {
    const id = createBody({ type: "kinematic", shape: { type: "circle", radius: 5 }, x: 0, y: 0 });
    assert.equal(id, 0);
  });
});

describe("_boxPolygonVertices", () => {
  it("returns 4 vertices in CCW order", () => {
    const verts = _boxPolygonVertices(30, 10);
    assert.equal(verts.length, 4);
    assert.deepEqual(verts[0], [-30, -10]);
    assert.deepEqual(verts[1], [30, -10]);
    assert.deepEqual(verts[2], [30, 10]);
    assert.deepEqual(verts[3], [-30, 10]);
  });

  it("handles zero dimensions", () => {
    const verts = _boxPolygonVertices(0, 0);
    assert.equal(verts.length, 4);
    // All vertices should be at origin (use + to normalize -0 to 0)
    assert.ok(+verts[0][0] === 0 && +verts[0][1] === 0);
  });

  it("handles large values", () => {
    const verts = _boxPolygonVertices(10000, 5000);
    assert.equal(verts.length, 4);
    assert.deepEqual(verts[0], [-10000, -5000]);
    assert.deepEqual(verts[2], [10000, 5000]);
  });
});

describe("body operations headless", () => {
  it("destroyBody does not throw", () => {
    destroyBody(0);
    destroyBody(999);
  });

  it("getBodyState returns default state", () => {
    const state = getBodyState(0);
    assert.equal(state.x, 0);
    assert.equal(state.y, 0);
    assert.equal(state.angle, 0);
    assert.equal(state.vx, 0);
    assert.equal(state.vy, 0);
    assert.equal(state.angularVelocity, 0);
    assert.equal(state.sleeping, false);
  });

  it("setBodyVelocity does not throw", () => {
    setBodyVelocity(0, 10, 20);
  });

  it("applyForce does not throw", () => {
    applyForce(0, 100, -50);
  });

  it("applyImpulse does not throw", () => {
    applyImpulse(0, 5, 5);
  });

  it("setBodyPosition does not throw", () => {
    setBodyPosition(0, 100, 200);
  });

  it("getAllBodyStates returns empty array", () => {
    const states = getAllBodyStates();
    assert.deepEqual(states, []);
  });
});
