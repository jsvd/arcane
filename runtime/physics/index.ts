// Existing pure-TS collision helpers
export type { AABB } from "./aabb.ts";
export { aabbOverlap, circleAABBOverlap, circleAABBResolve, sweepCircleAABB } from "./aabb.ts";

// Physics engine types
export type {
  BodyId,
  ConstraintId,
  BodyType,
  ShapeDef,
  MaterialDef,
  BodyDef,
  BodyState,
  Contact,
  RayHit,
  PhysicsWorldOptions,
} from "./types.ts";

// Physics world lifecycle
export { createPhysicsWorld, stepPhysics, destroyPhysicsWorld } from "./world.ts";

// Body management
export {
  createBody,
  removeBody,
  getBodyState,
  setBodyVelocity,
  setBodyAngularVelocity,
  applyForce,
  applyImpulse,
  setBodyPosition,
  setCollisionLayers,
  setKinematicVelocity,
} from "./body.ts";

// Constraints / joints
export { createDistanceJoint, createRevoluteJoint, removeConstraint } from "./constraints.ts";

// Spatial queries
export { queryAABB, raycast, getContacts } from "./query.ts";
