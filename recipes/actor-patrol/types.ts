export type ActorState = "idle" | "patrol" | "chase" | "stunned" | "dead";

export type PatrolBehavior = {
  type: "patrol";
  minX: number;
  maxX: number;
  speed: number;
};

export type ChaseBehavior = {
  type: "chase";
  speed: number;
  range: number;
};

export type SineBehavior = {
  type: "sine";
  amplitude: number;
  frequency: number;
};

export type ActorBehavior = PatrolBehavior | ChaseBehavior | SineBehavior;

export type Actor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  state: ActorState;
  facingRight: boolean;
  behavior: ActorBehavior;
  stunTimer: number;
  elapsed: number;
  baseY: number;
};

export type ActorOptions = {
  w?: number;
  h?: number;
  hp?: number;
  behavior?: ActorBehavior;
};
