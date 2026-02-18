// Arcane Engine — Physics Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/physics

declare module "@arcane/runtime/physics" {
  /** Opaque body identifier returned by createBody(). */
  export type BodyId = number;
  /** Opaque constraint identifier returned by joint creation functions. */
  export type ConstraintId = number;
  /** Body simulation type. */
  export type BodyType = "static" | "dynamic" | "kinematic";
  /** Shape definition (discriminated union). */
  export type ShapeDef = {
      type: "circle";
      radius: number;
  } | {
      type: "aabb";
      halfW: number;
      halfH: number;
  } | {
      type: "polygon";
      vertices: [number, number][];
  };
  /** Physical material properties. */
  export type MaterialDef = {
      restitution?: number;
      friction?: number;
  };
  /** Body creation definition. */
  export type BodyDef = {
      type: BodyType;
      shape: ShapeDef;
      x: number;
      y: number;
      mass?: number;
      material?: MaterialDef;
      layer?: number;
      mask?: number;
  };
  /** Readonly body state snapshot. */
  export type BodyState = {
      readonly x: number;
      readonly y: number;
      readonly angle: number;
      readonly vx: number;
      readonly vy: number;
      readonly angularVelocity: number;
      readonly sleeping: boolean;
  };
  /** Contact information from collision detection. */
  export type Contact = {
      readonly bodyA: BodyId;
      readonly bodyB: BodyId;
      readonly normalX: number;
      readonly normalY: number;
      readonly penetration: number;
      readonly contactX: number;
      readonly contactY: number;
  };
  /** Raycast hit result. */
  export type RayHit = {
      readonly bodyId: BodyId;
      readonly hitX: number;
      readonly hitY: number;
      readonly distance: number;
  };
  /** Options for createPhysicsWorld(). */
  export type PhysicsWorldOptions = {
      gravityX?: number;
      gravityY?: number;
  };

  /**
   * Axis-Aligned Bounding Box for 2D collision detection.
   * Defined by its top-left corner and dimensions.
   *
   * - `x` - Left edge position (world units).
   * - `y` - Top edge position (world units).
   * - `w` - Width. Must be >= 0.
   * - `h` - Height. Must be >= 0.
   */
  export type AABB = {
      x: number;
      y: number;
      w: number;
      h: number;
  };
  /**
   * Check if two AABBs overlap. Pure function.
   * Uses the separating axis theorem — returns true if there is no gap between
   * the boxes on either the X or Y axis.
   *
   * @param a - First bounding box.
   * @param b - Second bounding box.
   * @returns True if the boxes overlap (touching edges do not count as overlap).
   *
   * @example
   * const player = { x: 10, y: 10, w: 16, h: 16 };
   * const enemy = { x: 20, y: 10, w: 16, h: 16 };
   * if (aabbOverlap(player, enemy)) {
   *   // Handle collision
   * }
   */
  export declare function aabbOverlap(a: AABB, b: AABB): boolean;
  /**
   * Check if a circle overlaps an AABB. Pure function.
   * Finds the closest point on the AABB to the circle center
   * and checks if it's within the radius.
   *
   * @param cx - Circle center X position.
   * @param cy - Circle center Y position.
   * @param radius - Circle radius. Must be >= 0.
   * @param box - The AABB to test against.
   * @returns True if the circle and AABB overlap (inclusive of touching).
   */
  export declare function circleAABBOverlap(cx: number, cy: number, radius: number, box: AABB): boolean;
  /**
   * Get the collision resolution normal for a circle vs AABB collision.
   * Returns a unit normal vector pointing from the AABB toward the circle center,
   * or null if there is no collision.
   *
   * When the circle center is inside the AABB, pushes out along the shortest axis
   * relative to the box center.
   *
   * @param cx - Circle center X position.
   * @param cy - Circle center Y position.
   * @param radius - Circle radius. Must be >= 0.
   * @param box - The AABB to resolve against.
   * @returns Object with `nx` and `ny` (unit normal), or null if no collision.
   *          nx and ny are in the range [-1, 1] and form a unit vector.
   */
  export declare function circleAABBResolve(cx: number, cy: number, radius: number, box: AABB): {
      nx: number;
      ny: number;
  } | null;
  /**
   * Sweep a moving circle against a static AABB and return the first hit.
   *
   * Expands the AABB by the circle's radius (Minkowski sum), then raycasts
   * from the circle center along its velocity. Handles edge and corner cases.
   *
   * @param cx - Circle center X at start of frame.
   * @param cy - Circle center Y at start of frame.
   * @param vx - Circle X velocity (pixels per frame or per second — same units as box).
   * @param vy - Circle Y velocity.
   * @param radius - Circle radius. Must be >= 0.
   * @param box - The static AABB to sweep against.
   * @returns Hit result with `t` (fraction 0..1 along velocity), `nx`/`ny` (surface normal),
   *          and `hitX`/`hitY` (contact point on AABB surface). Returns null if no hit.
   *
   * @example
   * const hit = sweepCircleAABB(bullet.x, bullet.y, bullet.vx * dt, bullet.vy * dt, 4, wall);
   * if (hit) {
   *   bullet.x += bullet.vx * dt * hit.t;
   *   bullet.y += bullet.vy * dt * hit.t;
   *   // Reflect: bullet.vx -= 2 * (bullet.vx * hit.nx) * hit.nx;
   * }
   */
  export declare function sweepCircleAABB(cx: number, cy: number, vx: number, vy: number, radius: number, box: AABB): {
      t: number;
      nx: number;
      ny: number;
      hitX: number;
      hitY: number;
  } | null;

  /**
   * Create a rigid body in the physics world.
   * Returns a BodyId for future reference. Returns 0 in headless mode.
   */
  export declare function createBody(def: BodyDef): BodyId;
  /**
   * Remove a body from the physics world.
   * No-op in headless mode.
   */
  export declare function removeBody(id: BodyId): void;
  /**
   * Get the current state of a body (position, angle, velocity).
   * Returns a default state (all zeros) if the body doesn't exist or ops unavailable.
   */
  export declare function getBodyState(id: BodyId): BodyState;
  /**
   * Set a body's linear velocity. Wakes the body if sleeping.
   * No-op in headless mode.
   */
  export declare function setBodyVelocity(id: BodyId, vx: number, vy: number): void;
  /**
   * Set a body's angular velocity. Wakes the body if sleeping.
   * No-op in headless mode.
   */
  export declare function setBodyAngularVelocity(id: BodyId, av: number): void;
  /**
   * Apply a force to a body (accumulated over the frame). Wakes the body.
   * No-op in headless mode.
   */
  export declare function applyForce(id: BodyId, fx: number, fy: number): void;
  /**
   * Apply an instant impulse to a body (directly modifies velocity). Wakes the body.
   * No-op in headless mode.
   */
  export declare function applyImpulse(id: BodyId, ix: number, iy: number): void;
  /**
   * Teleport a body to a new position. Wakes the body.
   * No-op in headless mode.
   */
  export declare function setBodyPosition(id: BodyId, x: number, y: number): void;
  /**
   * Set collision filtering layers for a body.
   * Two bodies collide if (a.layer & b.mask) != 0 AND (b.layer & a.mask) != 0.
   * No-op in headless mode.
   */
  export declare function setCollisionLayers(id: BodyId, layer: number, mask: number): void;
  /**
   * Set a kinematic body's velocity for physics-driven movement.
   * Alias for setBodyVelocity, semantically for kinematic bodies.
   * No-op in headless mode.
   */
  export declare function setKinematicVelocity(id: BodyId, vx: number, vy: number): void;

  /**
   * Create a distance joint that maintains a fixed distance between two bodies.
   * Returns a ConstraintId for future reference. Returns 0 in headless mode.
   */
  export declare function createDistanceJoint(bodyA: BodyId, bodyB: BodyId, distance: number): ConstraintId;
  /**
   * Create a revolute (hinge) joint at a pivot point between two bodies.
   * Returns a ConstraintId for future reference. Returns 0 in headless mode.
   */
  export declare function createRevoluteJoint(bodyA: BodyId, bodyB: BodyId, pivotX: number, pivotY: number): ConstraintId;
  /**
   * Remove a constraint from the physics world.
   * No-op in headless mode.
   */
  export declare function removeConstraint(id: ConstraintId): void;

  /**
   * Query all bodies overlapping an axis-aligned bounding box.
   * Returns an empty array in headless mode.
   */
  export declare function queryAABB(minX: number, minY: number, maxX: number, maxY: number): BodyId[];
  /**
   * Cast a ray and return the first hit, or null if nothing hit.
   * Direction does not need to be normalized.
   * Returns null in headless mode.
   *
   * @param originX - Ray origin X.
   * @param originY - Ray origin Y.
   * @param dirX - Ray direction X (unnormalized).
   * @param dirY - Ray direction Y (unnormalized).
   * @param maxDistance - Maximum ray distance. Default: 1000.
   */
  export declare function raycast(originX: number, originY: number, dirX: number, dirY: number, maxDistance?: number): RayHit | null;
  /**
   * Get all contacts from the last physics step.
   * Returns an empty array in headless mode.
   */
  export declare function getContacts(): Contact[];

  /**
   * Create a physics world with gravity.
   * Call once before creating bodies. Default gravity is (0, 9.81) -- downward.
   * No-op in headless mode.
   */
  export declare function createPhysicsWorld(options?: PhysicsWorldOptions): void;
  /**
   * Advance the physics simulation by dt seconds.
   * Uses fixed timestep internally (1/60s) with accumulator.
   * No-op in headless mode.
   */
  export declare function stepPhysics(dt: number): void;
  /**
   * Destroy the physics world, freeing all bodies and constraints.
   * No-op in headless mode.
   */
  export declare function destroyPhysicsWorld(): void;

}
