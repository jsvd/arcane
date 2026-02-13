// Testing harness
export { describe, it, assert } from "./harness.ts";

// Snapshot-Replay testing
export {
  startRecording,
  stopRecording,
  replay,
  diffReplays,
  createRecording,
  emptyFrame,
} from "./replay.ts";
export type {
  InputFrame,
  StateSnapshot,
  Recording,
  RecordingSession,
  FrameAssertion,
  ReplayOptions,
  ReplayResult,
  DiffResult,
  UpdateFn,
} from "./replay.ts";

// Property-based testing
export {
  checkProperty,
  assertProperty,
  randomKeys,
  randomClicks,
  randomActions,
  combineGenerators,
} from "./property.ts";
export type {
  InputGenerator,
  Invariant,
  PropertyUpdateFn,
  PropertyConfig,
  RunResult,
  PropertyResult,
} from "./property.ts";
