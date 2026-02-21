import { describe, it, assert } from "../testing/harness.ts";
import {
  createPhysicsWorld, stepPhysics, destroyPhysicsWorld,
  createBody, removeBody, getBodyState,
  setBodyVelocity, setBodyAngularVelocity,
  applyForce, applyImpulse, setBodyPosition,
  setCollisionLayers, setKinematicVelocity,
  createDistanceJoint, createRevoluteJoint, removeConstraint,
  queryAABB, raycast, getContacts,
  boxPolygonVertices,
} from "./index.ts";
import type {
  BodyDef, BodyState, Contact, RayHit, ShapeDef, MaterialDef,
  BodyId, ConstraintId, BodyType, PhysicsWorldOptions,
} from "./types.ts";

// Also verify existing AABB exports still work
import { aabbOverlap, circleAABBOverlap, circleAABBResolve } from "./index.ts";
import type { AABB } from "./index.ts";

describe("Physics API", () => {
  // ---- World lifecycle ----
  describe("world lifecycle (headless)", () => {
    it("createPhysicsWorld does not throw", () => {
      createPhysicsWorld();
    });

    it("createPhysicsWorld with options does not throw", () => {
      createPhysicsWorld({ gravityX: 0, gravityY: 9.81 });
    });

    it("createPhysicsWorld with zero gravity does not throw", () => {
      createPhysicsWorld({ gravityX: 0, gravityY: 0 });
    });

    it("createPhysicsWorld with partial options does not throw", () => {
      createPhysicsWorld({ gravityY: 20 });
    });

    it("stepPhysics does not throw", () => {
      stepPhysics(1 / 60);
    });

    it("stepPhysics with zero dt does not throw", () => {
      stepPhysics(0);
    });

    it("destroyPhysicsWorld does not throw", () => {
      destroyPhysicsWorld();
    });
  });

  // ---- Body management ----
  describe("body management (headless)", () => {
    it("createBody with circle returns 0 in headless", () => {
      const id = createBody({
        type: "dynamic",
        shape: { type: "circle", radius: 1 },
        x: 0, y: 0,
      });
      assert.equal(id, 0);
    });

    it("createBody with aabb returns 0 in headless", () => {
      const id = createBody({
        type: "static",
        shape: { type: "aabb", halfW: 2, halfH: 1 },
        x: 5, y: 10,
      });
      assert.equal(id, 0);
    });

    it("createBody with kinematic type returns 0 in headless", () => {
      const id = createBody({
        type: "kinematic",
        shape: { type: "circle", radius: 3 },
        x: 0, y: 0,
      });
      assert.equal(id, 0);
    });

    it("createBody with all options returns 0 in headless", () => {
      const id = createBody({
        type: "dynamic",
        shape: { type: "circle", radius: 5 },
        x: 10, y: 20,
        mass: 2.0,
        material: { restitution: 0.8, friction: 0.3 },
        layer: 0x0002,
        mask: 0x00FF,
      });
      assert.equal(id, 0);
    });

    it("removeBody does not throw", () => {
      removeBody(0);
      removeBody(1);
      removeBody(999);
    });

    it("getBodyState returns default in headless", () => {
      const state = getBodyState(1);
      assert.equal(state.x, 0);
      assert.equal(state.y, 0);
      assert.equal(state.angle, 0);
      assert.equal(state.vx, 0);
      assert.equal(state.vy, 0);
      assert.equal(state.angularVelocity, 0);
    });

    it("getBodyState returns consistent default for any id", () => {
      const a = getBodyState(0);
      const b = getBodyState(42);
      assert.deepEqual(a, b);
    });

    it("setBodyVelocity does not throw", () => {
      setBodyVelocity(1, 10, -5);
    });

    it("setBodyAngularVelocity does not throw", () => {
      setBodyAngularVelocity(1, 3.14);
    });

    it("applyForce does not throw", () => {
      applyForce(1, 100, 0);
    });

    it("applyImpulse does not throw", () => {
      applyImpulse(1, 0, -50);
    });

    it("setBodyPosition does not throw", () => {
      setBodyPosition(1, 100, 200);
    });

    it("setCollisionLayers does not throw", () => {
      setCollisionLayers(1, 0x0002, 0x00FF);
    });

    it("setKinematicVelocity does not throw", () => {
      setKinematicVelocity(1, 5, 0);
    });
  });

  // ---- Constraints ----
  describe("constraints (headless)", () => {
    it("createDistanceJoint returns 0 in headless", () => {
      const id = createDistanceJoint(1, 2, 5.0);
      assert.equal(id, 0);
    });

    it("createRevoluteJoint returns 0 in headless", () => {
      const id = createRevoluteJoint(1, 2, 0, 0);
      assert.equal(id, 0);
    });

    it("removeConstraint does not throw", () => {
      removeConstraint(0);
      removeConstraint(1);
    });
  });

  // ---- Queries ----
  describe("queries (headless)", () => {
    it("queryAABB returns empty array", () => {
      const result = queryAABB(0, 0, 10, 10);
      assert.deepEqual(result, []);
    });

    it("raycast returns null", () => {
      const result = raycast(0, 0, 1, 0);
      assert.equal(result, null);
    });

    it("raycast with maxDistance returns null", () => {
      const result = raycast(0, 0, 1, 0, 500);
      assert.equal(result, null);
    });

    it("getContacts returns empty array", () => {
      const result = getContacts();
      assert.deepEqual(result, []);
    });
  });

  // ---- Type definitions ----
  describe("type definitions", () => {
    it("BodyDef with all options is well-typed", () => {
      const def: BodyDef = {
        type: "dynamic",
        shape: { type: "circle", radius: 5 },
        x: 10, y: 20,
        mass: 2.0,
        material: { restitution: 0.8, friction: 0.3 },
        layer: 0x0002,
        mask: 0x00FF,
      };
      assert.equal(def.type, "dynamic");
      assert.equal(def.mass, 2.0);
      assert.equal(def.x, 10);
      assert.equal(def.y, 20);
    });

    it("BodyDef with minimal options is well-typed", () => {
      const def: BodyDef = {
        type: "static",
        shape: { type: "aabb", halfW: 100, halfH: 5 },
        x: 0, y: 300,
      };
      assert.equal(def.type, "static");
      assert.equal(def.shape.type, "aabb");
    });

    it("ShapeDef circle is well-typed", () => {
      const s: ShapeDef = { type: "circle", radius: 10 };
      assert.equal(s.type, "circle");
    });

    it("ShapeDef aabb is well-typed", () => {
      const s: ShapeDef = { type: "aabb", halfW: 8, halfH: 4 };
      assert.equal(s.type, "aabb");
    });

    it("ShapeDef polygon is well-typed", () => {
      const s: ShapeDef = { type: "polygon", vertices: [[0, 0], [1, 0], [0.5, 1]] };
      assert.equal(s.type, "polygon");
      assert.equal(s.vertices.length, 3);
    });

    it("MaterialDef defaults are optional", () => {
      const m: MaterialDef = {};
      assert.equal(m.restitution, undefined);
      assert.equal(m.friction, undefined);
    });

    it("BodyState has all expected fields", () => {
      const state: BodyState = { x: 1, y: 2, angle: 0.5, vx: 3, vy: 4, angularVelocity: 0.1, sleeping: false };
      assert.equal(state.x, 1);
      assert.equal(state.y, 2);
      assert.equal(state.angle, 0.5);
      assert.equal(state.vx, 3);
      assert.equal(state.vy, 4);
      assert.equal(state.angularVelocity, 0.1);
    });

    it("Contact has all expected fields", () => {
      const c: Contact = {
        bodyA: 1, bodyB: 2,
        normalX: 0, normalY: 1,
        penetration: 0.5,
        contactX: 10, contactY: 20,
      };
      assert.equal(c.bodyA, 1);
      assert.equal(c.bodyB, 2);
      assert.equal(c.penetration, 0.5);
    });

    it("RayHit has all expected fields", () => {
      const h: RayHit = { bodyId: 5, hitX: 10, hitY: 20, distance: 15.5 };
      assert.equal(h.bodyId, 5);
      assert.equal(h.distance, 15.5);
    });

    it("PhysicsWorldOptions fields are optional", () => {
      const opts: PhysicsWorldOptions = {};
      assert.equal(opts.gravityX, undefined);
      assert.equal(opts.gravityY, undefined);
    });

    it("BodyType accepts all three values", () => {
      const types: BodyType[] = ["static", "dynamic", "kinematic"];
      assert.equal(types.length, 3);
      assert.equal(types[0], "static");
      assert.equal(types[1], "dynamic");
      assert.equal(types[2], "kinematic");
    });

    it("BodyId is a number", () => {
      const id: BodyId = 42;
      assert.equal(typeof id, "number");
    });

    it("ConstraintId is a number", () => {
      const id: ConstraintId = 7;
      assert.equal(typeof id, "number");
    });
  });

  // ---- Polygon bodies ----
  describe("polygon bodies (headless)", () => {
    it("createBody with polygon returns 0 in headless", () => {
      const vertices: [number, number][] = [[-10, -10], [10, -10], [10, 10], [-10, 10]];
      const id = createBody({
        type: "dynamic",
        shape: { type: "polygon", vertices },
        x: 100, y: 100,
        mass: 1.0,
      });
      assert.equal(id, 0);
    });

    it("createBody with polygon triangle returns 0 in headless", () => {
      const vertices: [number, number][] = [[0, -10], [10, 10], [-10, 10]];
      const id = createBody({
        type: "dynamic",
        shape: { type: "polygon", vertices },
        x: 50, y: 50,
      });
      assert.equal(id, 0);
    });

    it("createBody with polygon and all options returns 0 in headless", () => {
      const vertices: [number, number][] = [[-5, -5], [5, -5], [5, 5], [-5, 5]];
      const id = createBody({
        type: "dynamic",
        shape: { type: "polygon", vertices },
        x: 200, y: 150,
        mass: 3.0,
        material: { restitution: 0.5, friction: 0.7 },
        layer: 0x0004,
        mask: 0x00FF,
      });
      assert.equal(id, 0);
    });
  });

  // ---- boxPolygonVertices helper ----
  describe("boxPolygonVertices helper", () => {
    it("returns 4 vertices for a box", () => {
      const verts = boxPolygonVertices(10, 5);
      assert.equal(verts.length, 4);
    });

    it("returns correct vertices for a square", () => {
      const verts = boxPolygonVertices(5, 5);
      assert.deepEqual(verts, [[-5, -5], [5, -5], [5, 5], [-5, 5]]);
    });

    it("returns correct vertices for a wide box", () => {
      const verts = boxPolygonVertices(20, 5);
      assert.deepEqual(verts, [[-20, -5], [20, -5], [20, 5], [-20, 5]]);
    });

    it("returns correct vertices for a tall box", () => {
      const verts = boxPolygonVertices(5, 20);
      assert.deepEqual(verts, [[-5, -20], [5, -20], [5, 20], [-5, 20]]);
    });

    it("returns CCW ordered vertices", () => {
      const verts = boxPolygonVertices(10, 10);
      // CCW order: top-left, top-right, bottom-right, bottom-left
      assert.deepEqual(verts[0], [-10, -10]); // top-left
      assert.deepEqual(verts[1], [10, -10]);  // top-right
      assert.deepEqual(verts[2], [10, 10]);   // bottom-right
      assert.deepEqual(verts[3], [-10, 10]);  // bottom-left
    });
  });

  // ---- Existing AABB exports still work ----
  describe("existing AABB exports preserved", () => {
    it("aabbOverlap still works", () => {
      const a: AABB = { x: 0, y: 0, w: 10, h: 10 };
      const b: AABB = { x: 5, y: 5, w: 10, h: 10 };
      assert.equal(aabbOverlap(a, b), true);
    });

    it("circleAABBOverlap still works", () => {
      const box: AABB = { x: 0, y: 0, w: 10, h: 10 };
      assert.equal(circleAABBOverlap(5, 5, 3, box), true);
    });

    it("circleAABBResolve still works", () => {
      const box: AABB = { x: 0, y: 0, w: 10, h: 10 };
      const result = circleAABBResolve(5, 5, 3, box);
      assert.ok(result !== null);
    });
  });
});
