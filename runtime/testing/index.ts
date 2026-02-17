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
  replayWithSnapshots,
  compareReplaySnapshots,
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
  SnapshotCaptureFn,
  ReplayWithSnapshotsOptions,
  ReplayWithSnapshotsResult,
} from "./replay.ts";

// World Snapshots
export {
  captureWorldSnapshot,
  restoreWorldSnapshot,
  applyFSMRestore,
  serializeSnapshot,
  deserializeSnapshot,
  diffSnapshots,
  emptySnapshot,
} from "./snapshot.ts";
export type {
  AnimationSnapshot,
  BlendSnapshot,
  FSMSnapshot,
  TweenSnapshot,
  ParticleSnapshot,
  EmitterSnapshot,
  SceneStackSnapshot,
  WorldSnapshot,
  CaptureOptions,
  TweenSnapshotInput,
  EmitterSnapshotInput,
  ParticleInputData,
  SceneStackInput,
  RestoreResult,
  FSMSnapshotRestoreData,
} from "./snapshot.ts";

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

// Draw call capture & visual assertions
export {
  enableDrawCallCapture,
  disableDrawCallCapture,
  getDrawCalls,
  clearDrawCalls,
  findDrawCalls,
  assertSpriteDrawn,
  assertTextDrawn,
  assertDrawCallCount,
  assertNothingDrawnAt,
  assertLayerHasDrawCalls,
  assertScreenSpaceDrawn,
  getDrawCallSummary,
} from "./visual.ts";
export type {
  DrawCall,
  SpriteDrawCall,
  TextDrawCall,
  RectDrawCall,
  PanelDrawCall,
  BarDrawCall,
  LabelDrawCall,
  TilemapDrawCall,
  CircleDrawCall,
  LineDrawCall,
  TriangleDrawCall,
  DrawCallFilter,
} from "./visual.ts";
