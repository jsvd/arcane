export type {
  ActorState,
  PatrolBehavior,
  ChaseBehavior,
  SineBehavior,
  ActorBehavior,
  Actor,
  ActorOptions,
} from "./types.ts";
export {
  createActor,
  updateActor,
  updateActors,
  damageActor,
  isActorAlive,
} from "./system.ts";
