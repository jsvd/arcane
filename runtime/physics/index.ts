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
  ContactManifold,
  ManifoldPoint,
  RayHit,
  PhysicsWorldOptions,
} from "./types.ts";

// Physics world lifecycle
export { createPhysicsWorld, stepPhysics, destroyPhysicsWorld } from "./world.ts";

// Body management
export {
  createBody,
  destroyBody,
  getBodyState,
  getAllBodyStates,
  setBodyVelocity,
  setBodyAngularVelocity,
  applyForce,
  applyImpulse,
  setBodyPosition,
  setCollisionLayers,
  setKinematicVelocity,
  _boxPolygonVertices,
} from "./body.ts";

// Constraints / joints
export type { SoftConstraintParams } from "./constraints.ts";
export {
  createDistanceJoint,
  createSoftDistanceJoint,
  createRevoluteJoint,
  createSoftRevoluteJoint,
  removeConstraint,
} from "./constraints.ts";

// Spatial queries
export { queryAABB, raycast, getContacts, getManifolds } from "./query.ts";
