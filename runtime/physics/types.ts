/** Opaque body identifier returned by createBody(). */
export type BodyId = number;

/** Opaque constraint identifier returned by joint creation functions. */
export type ConstraintId = number;

/** Body simulation type. */
export type BodyType = "static" | "dynamic" | "kinematic";

/** Shape definition (discriminated union). */
export type ShapeDef =
  | { type: "circle"; radius: number }
  | { type: "aabb"; halfW: number; halfH: number }
  | { type: "polygon"; vertices: [number, number][] };

/** Physical material properties. */
export type MaterialDef = {
  restitution?: number;  // Default 0.3
  friction?: number;     // Default 0.5
};

/** Body creation definition. */
export type BodyDef = {
  type: BodyType;
  shape: ShapeDef;
  x: number;
  y: number;
  mass?: number;          // Default 1.0 (ignored for static)
  material?: MaterialDef;
  layer?: number;         // Default 0x0001
  mask?: number;          // Default 0xFFFF
};

/** Readonly body state snapshot. */
export type BodyState = {
  readonly x: number;
  readonly y: number;
  readonly angle: number;
  readonly vx: number;
  readonly vy: number;
  readonly angularVelocity: number;
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
  gravityX?: number;  // Default 0
  gravityY?: number;  // Default 9.81 (downward)
};
