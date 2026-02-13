/**
 * Snapshot-Replay Testing — record, replay, and diff deterministic game sessions.
 *
 * Records frame-by-frame input events and state snapshots, then replays them
 * deterministically. Supports assertion at specific frames and replay diffing.
 *
 * Works in both Node and V8 environments (headless-compatible).
 *
 * @example
 * ```ts
 * const recording = startRecording();
 * recording.recordFrame({ keysDown: ["ArrowRight"], keysPressed: [], mouseX: 0, mouseY: 0 });
 * recording.recordFrame({ keysDown: [], keysPressed: ["Space"], mouseX: 100, mouseY: 50 });
 * const data = stopRecording(recording);
 *
 * const result = replay(data, myUpdateFn, myInitState, {
 *   assertFrame: { frame: 1, check: (state) => state.x > 0 },
 * });
 * ```
 */

/** A single frame of recorded input. */
export type InputFrame = Readonly<{
  /** Keys held down during this frame. */
  keysDown: readonly string[];
  /** Keys newly pressed this frame (just-pressed). */
  keysPressed: readonly string[];
  /** Mouse X position in screen pixels. */
  mouseX: number;
  /** Mouse Y position in screen pixels. */
  mouseY: number;
  /** Delta time for this frame in seconds. If omitted, defaults to 1/60. */
  dt?: number;
}>;

/** A state snapshot captured at a specific frame. */
export type StateSnapshot<S = unknown> = Readonly<{
  /** Frame number when this snapshot was captured. */
  frame: number;
  /** Deep clone of the game state. */
  state: S;
  /** Timestamp in milliseconds (relative to recording start). */
  timestamp: number;
}>;

/** Complete recording data — input frames and optional state snapshots. */
export type Recording<S = unknown> = Readonly<{
  /** Ordered list of input frames, one per game frame. */
  frames: readonly InputFrame[];
  /** State snapshots captured during recording. */
  snapshots: readonly StateSnapshot<S>[];
  /** Total number of frames recorded. */
  frameCount: number;
  /** Fixed delta time used if frames don't specify their own. */
  defaultDt: number;
}>;

/** Active recording session handle. */
export type RecordingSession<S = unknown> = {
  /** Record a single frame of input. */
  recordFrame: (input: InputFrame) => void;
  /** Capture a state snapshot at the current frame. */
  captureSnapshot: (state: S) => void;
  /** Get the current frame number. */
  readonly currentFrame: number;
};

/** Frame assertion — check state at a specific frame during replay. */
export type FrameAssertion<S> = Readonly<{
  /** Frame number to check (0-indexed). */
  frame: number;
  /** Assertion function. Throw or return false to fail. */
  check: (state: S) => boolean | void;
}>;

/** Options for replay(). */
export type ReplayOptions<S> = Readonly<{
  /** Assert state at a specific frame. */
  assertFrame?: FrameAssertion<S> | readonly FrameAssertion<S>[];
  /** Expected final state — deep-compared after all frames. */
  expectedFinalState?: S;
  /** Stop replay at this frame (exclusive). Defaults to all frames. */
  stopAtFrame?: number;
}>;

/** Result of a replay run. */
export type ReplayResult<S> = Readonly<{
  /** True if all assertions passed. */
  ok: boolean;
  /** Final state after replay. */
  finalState: S;
  /** Number of frames replayed. */
  framesPlayed: number;
  /** Error message if any assertion failed. */
  error?: string;
  /** Frame number where assertion failed (-1 if no failure). */
  failedFrame: number;
}>;

/** Result of comparing two replays. */
export type DiffResult<S> = Readonly<{
  /** True if the replays produced identical states at every snapshot frame. */
  identical: boolean;
  /** Frame where states first diverged (-1 if identical). */
  divergenceFrame: number;
  /** State from recording A at divergence point. */
  stateA?: S;
  /** State from recording B at divergence point. */
  stateB?: S;
  /** Paths where the states differ at the divergence point. */
  differingPaths: readonly string[];
}>;

/** Game update function — takes current state and input, returns new state. */
export type UpdateFn<S> = (state: S, input: InputFrame) => S;

/** Deep clone via JSON round-trip. */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Deep equality check. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr !== bIsArr) return false;

  if (aIsArr) {
    const aArr = a as unknown[];
    const bArr = b as unknown[];
    if (aArr.length !== bArr.length) return false;
    for (let i = 0; i < aArr.length; i++) {
      if (!deepEqual(aArr[i], bArr[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
  }
  for (const key of aKeys) {
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

/** Find differing paths between two objects. */
function findDifferingPaths(
  a: unknown,
  b: unknown,
  prefix: string = "",
): string[] {
  if (a === b) return [];
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return prefix ? [prefix] : ["<root>"];
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  const paths: string[] = [];

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!(key in aObj)) {
      paths.push(path);
    } else if (!(key in bObj)) {
      paths.push(path);
    } else if (!deepEqual(aObj[key], bObj[key])) {
      if (typeof aObj[key] === "object" && aObj[key] !== null &&
          typeof bObj[key] === "object" && bObj[key] !== null) {
        paths.push(...findDifferingPaths(aObj[key], bObj[key], path));
      } else {
        paths.push(path);
      }
    }
  }

  return paths;
}

/**
 * Start a new input recording session.
 *
 * @param defaultDt - Default delta time per frame in seconds. Default: 1/60.
 * @returns A RecordingSession handle for recording frames and snapshots.
 */
export function startRecording<S = unknown>(defaultDt: number = 1 / 60): RecordingSession<S> {
  const frames: InputFrame[] = [];
  const snapshots: StateSnapshot<S>[] = [];
  let currentFrame = 0;
  const startTime = Date.now();

  return {
    recordFrame(input: InputFrame): void {
      frames.push({
        keysDown: [...input.keysDown],
        keysPressed: [...input.keysPressed],
        mouseX: input.mouseX,
        mouseY: input.mouseY,
        dt: input.dt,
      });
      currentFrame++;
    },

    captureSnapshot(state: S): void {
      snapshots.push({
        frame: currentFrame,
        state: deepClone(state),
        timestamp: Date.now() - startTime,
      });
    },

    get currentFrame(): number {
      return currentFrame;
    },

    // Expose internal arrays via non-enumerable property for stopRecording
    ...({
      _frames: frames,
      _snapshots: snapshots,
      _defaultDt: defaultDt,
    } as any),
  };
}

/**
 * Stop a recording session and return the complete recording data.
 *
 * @param session - The active recording session.
 * @returns Immutable Recording data.
 */
export function stopRecording<S = unknown>(session: RecordingSession<S>): Recording<S> {
  const s = session as any;
  const frames: InputFrame[] = s._frames ?? [];
  const snapshots: StateSnapshot<S>[] = s._snapshots ?? [];
  const defaultDt: number = s._defaultDt ?? 1 / 60;

  return {
    frames: [...frames],
    snapshots: [...snapshots],
    frameCount: frames.length,
    defaultDt,
  };
}

/**
 * Deterministically replay a recording through a game update function.
 *
 * Each frame feeds the recorded input into updateFn, building up state
 * from initialState. Supports frame-level assertions and final state comparison.
 *
 * @param recording - The recording to replay.
 * @param updateFn - Pure update function: (state, input) => newState.
 * @param initialState - Starting state for the replay.
 * @param options - Assertions and replay control.
 * @returns ReplayResult with final state and assertion outcomes.
 */
export function replay<S>(
  recording: Recording<S>,
  updateFn: UpdateFn<S>,
  initialState: S,
  options: ReplayOptions<S> = {},
): ReplayResult<S> {
  let state = deepClone(initialState);
  const assertions = options.assertFrame
    ? Array.isArray(options.assertFrame)
      ? options.assertFrame
      : [options.assertFrame]
    : [];

  // Sort assertions by frame for efficient checking
  const sortedAssertions = [...assertions].sort((a, b) => a.frame - b.frame);
  let assertionIdx = 0;

  const maxFrame = options.stopAtFrame ?? recording.frameCount;
  const framesToPlay = Math.min(maxFrame, recording.frameCount);

  for (let i = 0; i < framesToPlay; i++) {
    const frame = recording.frames[i];
    state = updateFn(state, frame);

    // Check assertions for this frame
    while (assertionIdx < sortedAssertions.length && sortedAssertions[assertionIdx].frame === i) {
      const assertion = sortedAssertions[assertionIdx];
      try {
        const result = assertion.check(state);
        if (result === false) {
          return {
            ok: false,
            finalState: state,
            framesPlayed: i + 1,
            error: `Assertion failed at frame ${i}`,
            failedFrame: i,
          };
        }
      } catch (e) {
        return {
          ok: false,
          finalState: state,
          framesPlayed: i + 1,
          error: `Assertion threw at frame ${i}: ${e instanceof Error ? e.message : String(e)}`,
          failedFrame: i,
        };
      }
      assertionIdx++;
    }
  }

  // Check expected final state
  if (options.expectedFinalState !== undefined) {
    if (!deepEqual(state, options.expectedFinalState)) {
      const paths = findDifferingPaths(state, options.expectedFinalState);
      return {
        ok: false,
        finalState: state,
        framesPlayed: framesToPlay,
        error: `Final state mismatch. Differing paths: ${paths.join(", ")}`,
        failedFrame: framesToPlay - 1,
      };
    }
  }

  return {
    ok: true,
    finalState: state,
    framesPlayed: framesToPlay,
    failedFrame: -1,
  };
}

/**
 * Compare two replay runs and find where their states diverge.
 *
 * Replays both recordings through the same update function and compares
 * state at each frame. Reports the first frame where states differ.
 *
 * @param recordingA - First recording.
 * @param recordingB - Second recording.
 * @param updateFn - Pure update function.
 * @param initialState - Starting state (same for both replays).
 * @returns DiffResult indicating where and how the replays diverge.
 */
export function diffReplays<S>(
  recordingA: Recording<S>,
  recordingB: Recording<S>,
  updateFn: UpdateFn<S>,
  initialState: S,
): DiffResult<S> {
  let stateA = deepClone(initialState);
  let stateB = deepClone(initialState);

  const maxFrames = Math.max(recordingA.frameCount, recordingB.frameCount);

  for (let i = 0; i < maxFrames; i++) {
    if (i < recordingA.frameCount) {
      stateA = updateFn(stateA, recordingA.frames[i]);
    }
    if (i < recordingB.frameCount) {
      stateB = updateFn(stateB, recordingB.frames[i]);
    }

    if (!deepEqual(stateA, stateB)) {
      return {
        identical: false,
        divergenceFrame: i,
        stateA: deepClone(stateA),
        stateB: deepClone(stateB),
        differingPaths: findDifferingPaths(stateA, stateB),
      };
    }
  }

  return {
    identical: true,
    divergenceFrame: -1,
    differingPaths: [],
  };
}

/**
 * Create a recording from a manual list of input frames.
 * Convenience for building test recordings without a live session.
 *
 * @param frames - Array of input frames.
 * @param defaultDt - Default delta time. Default: 1/60.
 * @returns A Recording object ready for replay.
 */
export function createRecording<S = unknown>(
  frames: readonly InputFrame[],
  defaultDt: number = 1 / 60,
): Recording<S> {
  return {
    frames: [...frames],
    snapshots: [],
    frameCount: frames.length,
    defaultDt,
  };
}

/**
 * Create an empty input frame with sensible defaults.
 * Convenience for building test input data.
 *
 * @param overrides - Partial input frame to merge with defaults.
 * @returns Complete InputFrame.
 */
export function emptyFrame(overrides: Partial<InputFrame> = {}): InputFrame {
  return {
    keysDown: overrides.keysDown ?? [],
    keysPressed: overrides.keysPressed ?? [],
    mouseX: overrides.mouseX ?? 0,
    mouseY: overrides.mouseY ?? 0,
    dt: overrides.dt,
  };
}

// ---------------------------------------------------------------------------
// WorldSnapshot integration
// ---------------------------------------------------------------------------

import type { WorldSnapshot, CaptureOptions } from "./snapshot.ts";
import { captureWorldSnapshot, diffSnapshots } from "./snapshot.ts";

/**
 * Callback that captures a WorldSnapshot at a given frame during replay.
 * Called after the update function runs for each frame.
 *
 * @param state - Current game state after the frame update.
 * @param frame - Current frame number (0-indexed).
 * @returns CaptureOptions for the snapshot, or undefined to skip capture.
 */
export type SnapshotCaptureFn<S> = (state: S, frame: number) => CaptureOptions | undefined;

/**
 * Options for replayWithSnapshots().
 */
export type ReplayWithSnapshotsOptions<S> = ReplayOptions<S> & {
  /** Callback to capture a WorldSnapshot after each frame. Return undefined to skip. */
  captureEveryFrame?: SnapshotCaptureFn<S>;
  /** Specific frame numbers at which to capture WorldSnapshots. */
  captureAtFrames?: readonly number[];
  /** Capture function used for captureAtFrames (required if captureAtFrames is set). */
  captureFn?: SnapshotCaptureFn<S>;
};

/**
 * Result of replayWithSnapshots().
 */
export type ReplayWithSnapshotsResult<S> = ReplayResult<S> & {
  /** WorldSnapshots captured during replay, keyed by frame number. */
  worldSnapshots: ReadonlyMap<number, WorldSnapshot>;
};

/**
 * Replay a recording with WorldSnapshot capture support.
 *
 * Like `replay()`, but additionally captures WorldSnapshots at specified frames.
 * This enables comparing full engine state between replay runs using `diffSnapshots()`.
 *
 * @param recording - The recording to replay.
 * @param updateFn - Pure update function: (state, input) => newState.
 * @param initialState - Starting state for the replay.
 * @param options - Replay options plus snapshot capture configuration.
 * @returns ReplayWithSnapshotsResult with captured WorldSnapshots.
 *
 * @example
 * ```ts
 * const result = replayWithSnapshots(recording, updateFn, initState, {
 *   captureAtFrames: [0, 10, 20],
 *   captureFn: (state, frame) => ({
 *     frame,
 *     prng: state.rng,
 *     userData: { score: state.score },
 *   }),
 * });
 * // Compare snapshots at frame 10
 * const snap10 = result.worldSnapshots.get(10)!;
 * ```
 */
export function replayWithSnapshots<S>(
  recording: Recording<S>,
  updateFn: UpdateFn<S>,
  initialState: S,
  options: ReplayWithSnapshotsOptions<S> = {},
): ReplayWithSnapshotsResult<S> {
  const worldSnapshots = new Map<number, WorldSnapshot>();
  const captureAtSet = new Set(options.captureAtFrames ?? []);
  const captureFn = options.captureFn ?? options.captureEveryFrame;

  // Build a wrapper update function that captures snapshots after each frame
  let currentFrameNum = -1;
  const wrappedUpdateFn: UpdateFn<S> = (state, input) => {
    const newState = updateFn(state, input);
    currentFrameNum++;

    // Capture if this is an every-frame capture
    if (options.captureEveryFrame) {
      const captureOpts = options.captureEveryFrame(newState, currentFrameNum);
      if (captureOpts) {
        worldSnapshots.set(currentFrameNum, captureWorldSnapshot({
          ...captureOpts,
          frame: currentFrameNum,
        }));
      }
    }

    // Capture if this frame is in the captureAtFrames set
    if (captureAtSet.has(currentFrameNum) && captureFn && !options.captureEveryFrame) {
      const captureOpts = captureFn(newState, currentFrameNum);
      if (captureOpts) {
        worldSnapshots.set(currentFrameNum, captureWorldSnapshot({
          ...captureOpts,
          frame: currentFrameNum,
        }));
      }
    }

    return newState;
  };

  const result = replay(recording, wrappedUpdateFn, initialState, {
    assertFrame: options.assertFrame,
    expectedFinalState: options.expectedFinalState,
    stopAtFrame: options.stopAtFrame,
  });

  return {
    ...result,
    worldSnapshots,
  };
}

/**
 * Compare WorldSnapshots from two replay runs at matching frame numbers.
 *
 * Useful for checking determinism: replay the same recording twice with
 * WorldSnapshot capture and compare all subsystem states.
 *
 * @param snapshotsA - WorldSnapshots from first replay, keyed by frame.
 * @param snapshotsB - WorldSnapshots from second replay, keyed by frame.
 * @returns Array of { frame, diffs } for each frame that differs.
 */
export function compareReplaySnapshots(
  snapshotsA: ReadonlyMap<number, WorldSnapshot>,
  snapshotsB: ReadonlyMap<number, WorldSnapshot>,
): { frame: number; diffs: string[] }[] {
  const allFrames = new Set([...snapshotsA.keys(), ...snapshotsB.keys()]);
  const results: { frame: number; diffs: string[] }[] = [];

  for (const frame of [...allFrames].sort((a, b) => a - b)) {
    const snapA = snapshotsA.get(frame);
    const snapB = snapshotsB.get(frame);

    if (!snapA || !snapB) {
      results.push({ frame, diffs: ["<missing snapshot>"] });
      continue;
    }

    const diffs = diffSnapshots(snapA, snapB);
    if (diffs.length > 0) {
      results.push({ frame, diffs });
    }
  }

  return results;
}
