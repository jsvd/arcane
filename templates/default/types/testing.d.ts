// Arcane Engine — Testing Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/testing

declare module "@arcane/runtime/testing" {
  /**
   * Universal test harness for Arcane — works in both Node.js and V8 (deno_core).
   *
   * In **Node mode**: delegates to `node:test` and `node:assert`.
   * In **V8 mode**: standalone implementations with result reporting via
   * `globalThis.__reportTest(suite, test, passed, error?)`.
   *
   * Test files import `{ describe, it, assert }` from this module and work
   * identically in both environments.
   *
   * @example
   * ```ts
   * import { describe, it, assert } from "../testing/harness.ts";
   *
   * describe("math", () => {
   *   it("adds numbers", () => {
   *     assert.equal(1 + 1, 2);
   *   });
   *
   *   it("supports deep equality", () => {
   *     assert.deepEqual({ a: 1 }, { a: 1 });
   *   });
   * });
   * ```
   */
  /** A synchronous or async test function. */
  type TestFn = () => void | Promise<void>;
  /** Function signature for `describe()` — defines a test suite. */
  type DescribeFn = (name: string, fn: () => void) => void;
  /** Function signature for `it()` — defines a single test case. */
  type ItFn = (name: string, fn: TestFn) => void;
  /**
   * Assertion interface providing common test assertions.
   *
   * All assertion methods throw on failure with a descriptive error message.
   */
  interface Assert {
      /**
       * Assert strict equality (`===`).
       * @param actual - The value to test.
       * @param expected - The expected value.
       * @param message - Optional custom failure message.
       */
      equal(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert deep structural equality (recursive comparison of objects/arrays).
       * @param actual - The value to test.
       * @param expected - The expected structure.
       * @param message - Optional custom failure message.
       */
      deepEqual(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert strict inequality (`!==`).
       * @param actual - The value to test.
       * @param expected - The value that `actual` must not equal.
       * @param message - Optional custom failure message.
       */
      notEqual(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert that two values are NOT deeply equal.
       * @param actual - The value to test.
       * @param expected - The value that `actual` must not deeply equal.
       * @param message - Optional custom failure message.
       */
      notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
      /**
       * Assert that a value is truthy.
       * @param value - The value to test.
       * @param message - Optional custom failure message.
       */
      ok(value: unknown, message?: string): void;
      /**
       * Assert that a string matches a regular expression.
       * @param actual - The string to test.
       * @param expected - The regex pattern to match against.
       * @param message - Optional custom failure message.
       */
      match(actual: string, expected: RegExp, message?: string): void;
      /**
       * Assert that a function throws an error.
       * @param fn - The function expected to throw.
       * @param expected - Optional regex to match against the error message.
       * @param message - Optional custom failure message.
       */
      throws(fn: () => unknown, expected?: RegExp, message?: string): void;
  }
  /**
   * Define a test suite. Can be nested with other describe() calls.
   * In V8 mode, nested suites have their test names prefixed with the parent suite name.
   *
   * @param name - Suite name displayed in test output.
   * @param fn - Function containing `it()` test cases and/or nested `describe()` calls.
   */
  export let describe: DescribeFn;
  /**
   * Define a single test case within a describe() suite.
   * Supports both synchronous and async test functions.
   *
   * @param name - Test name displayed in test output.
   * @param fn - Test function. Throw (or reject) to indicate failure; return to pass.
   */
  export let it: ItFn;
  /**
   * Assertion helpers for test cases. Methods throw on failure with descriptive messages.
   *
   * Available assertions: `equal`, `deepEqual`, `notEqual`, `notDeepEqual`, `ok`, `match`, `throws`.
   */
  export let assert: Assert;
  export { describe, it, assert };

  /**
   * Property-Based Testing framework for Arcane.
   *
   * Define invariants over game state that must hold for any sequence of random
   * inputs. The framework generates seeded, reproducible random input sequences,
   * tests invariants after each frame, and when a violation is found, shrinks
   * the input to the minimal failing case.
   *
   * @example
   * ```ts
   * import { property, randomKeys, checkProperty } from "../testing/property.ts";
   * import type { InputFrame } from "../testing/replay.ts";
   *
   * type State = { hp: number; maxHp: number; x: number };
   *
   * const result = checkProperty({
   *   name: "HP never exceeds max",
   *   seed: 42,
   *   numRuns: 100,
   *   framesPerRun: 50,
   *   initialState: { hp: 100, maxHp: 100, x: 0 },
   *   update: (state, input) => {
   *     let hp = state.hp;
   *     if (input.keysPressed.includes("h")) hp = Math.min(hp + 30, state.maxHp);
   *     if (input.keysPressed.includes("d")) hp -= 10;
   *     return { ...state, hp };
   *   },
   *   invariant: (state) => state.hp <= state.maxHp,
   *   generator: randomKeys(["h", "d", "ArrowLeft", "ArrowRight"]),
   * });
   * ```
   */
  /** A generator produces a random InputFrame from a PRNG state. */
  export type InputGenerator = (rng: PRNGState) => [InputFrame, PRNGState];
  /** An invariant function — returns true if the state is valid, false if violated. */
  export type Invariant<S> = (state: S, frame: number) => boolean;
  /** Pure update function for property checking. */
  export type PropertyUpdateFn<S> = (state: S, input: InputFrame) => S;
  /** Configuration for a property check. */
  export type PropertyConfig<S> = Readonly<{
      /** Property name (for error reporting). */
      name: string;
      /** PRNG seed for reproducibility. */
      seed: number;
      /** Number of random runs to attempt. Default: 100. */
      numRuns?: number;
      /** Frames per run. Default: 50. */
      framesPerRun?: number;
      /** Initial game state. */
      initialState: S;
      /** Pure update function. */
      update: PropertyUpdateFn<S>;
      /** Invariant that must hold at every frame. */
      invariant: Invariant<S>;
      /** Input generator. Use built-in generators or provide your own. */
      generator: InputGenerator;
      /** Whether to attempt shrinking on failure. Default: true. */
      shrink?: boolean;
  }>;
  /** Result of a single property run (one random input sequence). */
  export type RunResult<S> = Readonly<{
      /** True if invariant held for all frames. */
      ok: boolean;
      /** Frame where invariant was violated (-1 if ok). */
      violationFrame: number;
      /** State at violation point. */
      violationState?: S;
      /** The input sequence that caused the violation. */
      inputs: readonly InputFrame[];
      /** The seed used for this run. */
      runSeed: number;
  }>;
  /** Result of a full property check across all runs. */
  export type PropertyResult<S> = Readonly<{
      /** Property name. */
      name: string;
      /** True if invariant held across all runs. */
      ok: boolean;
      /** Number of runs completed. */
      runsCompleted: number;
      /** First failing run result, or undefined if all passed. */
      failure?: RunResult<S>;
      /** Shrunk (minimal) failing input, if shrinking found a shorter case. */
      shrunkFailure?: RunResult<S>;
      /** Total frames tested across all runs. */
      totalFramesTested: number;
  }>;
  /**
   * Check a property across many random input sequences.
   *
   * Generates `numRuns` random input sequences using the seeded PRNG,
   * runs each through the update function, and checks the invariant after
   * each frame. If a violation is found, attempts to shrink the input to
   * find the minimal failing case.
   *
   * @param config - Property configuration.
   * @returns PropertyResult with pass/fail and minimal failing input if found.
   */
  export declare function checkProperty<S>(config: PropertyConfig<S>): PropertyResult<S>;
  /**
   * Generator that randomly presses/holds keys from a given set.
   * Produces frames where 0-3 keys are held down and 0-1 key is newly pressed.
   *
   * @param keys - Array of valid key names.
   * @returns An InputGenerator function.
   */
  export declare function randomKeys(keys: readonly string[]): InputGenerator;
  /**
   * Generator that produces random mouse clicks at random positions.
   *
   * @param width - Maximum X coordinate. Default: 800.
   * @param height - Maximum Y coordinate. Default: 600.
   * @returns An InputGenerator function.
   */
  export declare function randomClicks(width?: number, height?: number): InputGenerator;
  /**
   * Generator that executes named actions randomly from a set.
   * Actions are encoded as key presses for the update function to interpret.
   *
   * @param actions - Array of action key names.
   * @returns An InputGenerator function.
   */
  export declare function randomActions(actions: readonly string[]): InputGenerator;
  /**
   * Combine multiple generators — each frame randomly picks one.
   *
   * @param generators - Array of InputGenerators to choose from.
   * @returns A combined InputGenerator.
   */
  export declare function combineGenerators(...generators: readonly InputGenerator[]): InputGenerator;
  /**
   * Define and immediately check a property. Convenience wrapper for use
   * in test suites — returns the PropertyResult and throws on failure.
   *
   * @param config - Property configuration.
   * @throws Error if the invariant is violated.
   */
  export declare function assertProperty<S>(config: PropertyConfig<S>): void;

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
  /**
   * Start a new input recording session.
   *
   * @param defaultDt - Default delta time per frame in seconds. Default: 1/60.
   * @returns A RecordingSession handle for recording frames and snapshots.
   */
  export declare function startRecording<S = unknown>(defaultDt?: number): RecordingSession<S>;
  /**
   * Stop a recording session and return the complete recording data.
   *
   * @param session - The active recording session.
   * @returns Immutable Recording data.
   */
  export declare function stopRecording<S = unknown>(session: RecordingSession<S>): Recording<S>;
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
  export declare function replay<S>(recording: Recording<S>, updateFn: UpdateFn<S>, initialState: S, options?: ReplayOptions<S>): ReplayResult<S>;
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
  export declare function diffReplays<S>(recordingA: Recording<S>, recordingB: Recording<S>, updateFn: UpdateFn<S>, initialState: S): DiffResult<S>;
  /**
   * Create a recording from a manual list of input frames.
   * Convenience for building test recordings without a live session.
   *
   * @param frames - Array of input frames.
   * @param defaultDt - Default delta time. Default: 1/60.
   * @returns A Recording object ready for replay.
   */
  export declare function createRecording<S = unknown>(frames: readonly InputFrame[], defaultDt?: number): Recording<S>;
  /**
   * Create an empty input frame with sensible defaults.
   * Convenience for building test input data.
   *
   * @param overrides - Partial input frame to merge with defaults.
   * @returns Complete InputFrame.
   */
  export declare function emptyFrame(overrides?: Partial<InputFrame>): InputFrame;
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
  export declare function replayWithSnapshots<S>(recording: Recording<S>, updateFn: UpdateFn<S>, initialState: S, options?: ReplayWithSnapshotsOptions<S>): ReplayWithSnapshotsResult<S>;
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
  export declare function compareReplaySnapshots(snapshotsA: ReadonlyMap<number, WorldSnapshot>, snapshotsB: ReadonlyMap<number, WorldSnapshot>): {
      frame: number;
      diffs: string[];
  }[];

  /**
   * World Snapshot — capture and restore complete game state for deterministic replay.
   *
   * Captures all subsystem state needed for deterministic replay:
   * - PRNG state (xoshiro128** state array)
   * - Animation states (current frame, elapsed time)
   * - Animation FSM states (current state, blend progress)
   * - Active tween states (id, progress, paused)
   * - Active particle emitter states (particles, timers)
   * - Scene stack state (active scene name, stack names)
   * - Custom user state (generic slot for game-specific data)
   *
   * All capture/restore functions are best-effort: systems that aren't active
   * are safely skipped.
   *
   * @example
   * ```ts
   * // Capture a snapshot with PRNG and animation state
   * const snapshot = captureWorldSnapshot({
   *   prng: myPrngState,
   *   animations: [playerAnim, enemyAnim],
   *   userData: { score: 100, level: 3 },
   * });
   *
   * // ... game state changes ...
   *
   * // Restore back to the snapshot
   * const restored = restoreWorldSnapshot(snapshot);
   * myPrngState = restored.prng!;
   * playerAnim = restored.animations![0];
   * ```
   */
  /** Serialized state of a single animation instance. */
  export type AnimationSnapshot = Readonly<{
      /** Reference to the animation definition. */
      defId: AnimationId;
      /** Total elapsed time in seconds. */
      elapsed: number;
      /** Current frame index. */
      frame: number;
      /** Whether the animation has finished (non-looping). */
      finished: boolean;
  }>;
  /** Serialized state of a blend transition in an animation FSM. */
  export type BlendSnapshot = Readonly<{
      /** Animation state of the outgoing animation. */
      fromAnim: AnimationSnapshot;
      /** AnimationId of the outgoing animation. */
      fromAnimId: AnimationId;
      /** Elapsed blend time in seconds. */
      elapsed: number;
      /** Total blend duration in seconds. */
      duration: number;
  }>;
  /** Serialized state of an animation FSM instance. */
  export type FSMSnapshot = Readonly<{
      /** Name of the current active state. */
      currentState: string;
      /** Animation playback state for the current animation. */
      animation: AnimationSnapshot;
      /** Active blend/crossfade, or null if not blending. */
      blend: BlendSnapshot | null;
  }>;
  /** Serialized state of a single tween. */
  export type TweenSnapshot = Readonly<{
      /** Tween unique ID. */
      id: string;
      /** Current lifecycle state. */
      state: string;
      /** Seconds elapsed since the tween became active. */
      elapsed: number;
      /** Seconds elapsed during the delay phase. */
      delayElapsed: number;
      /** Total animation duration. */
      duration: number;
      /** Current repeat iteration. */
      currentRepeat: number;
      /** Whether playing in reverse (yoyo). */
      isReversed: boolean;
      /** Target property values. */
      props: Record<string, number>;
      /** Start values captured when tween became active. */
      startValues: Record<string, number>;
  }>;
  /** Serialized state of a single particle. */
  export type ParticleSnapshot = Readonly<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      ax: number;
      ay: number;
      rotation: number;
      rotationSpeed: number;
      scale: number;
      scaleSpeed: number;
      color: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      startColor: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      endColor: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      lifetime: number;
      age: number;
      alive: boolean;
      textureId: number;
  }>;
  /** Serialized state of a single emitter. */
  export type EmitterSnapshot = Readonly<{
      /** Emitter unique ID. */
      id: string;
      /** All particles (alive and dead). */
      particles: readonly ParticleSnapshot[];
      /** Emission accumulator for continuous mode. */
      emissionAccumulator: number;
      /** Whether the emitter is actively spawning. */
      active: boolean;
      /** Whether the emitter has fired (burst/one-shot). */
      used: boolean;
  }>;
  /** Serialized scene stack state. */
  export type SceneStackSnapshot = Readonly<{
      /** Names of scenes on the stack, bottom to top. */
      sceneNames: readonly string[];
      /** Name of the active (topmost) scene. */
      activeSceneName: string | null;
      /** Stack depth. */
      depth: number;
  }>;
  /**
   * Complete world snapshot capturing all subsystem state.
   *
   * Each field is optional — only systems that the game uses need to be captured.
   * Fields that are `undefined` were not captured and will be skipped on restore.
   */
  export type WorldSnapshot = Readonly<{
      /** Timestamp when the snapshot was taken (milliseconds since epoch). */
      timestamp: number;
      /** Frame number when the snapshot was taken (user-provided). */
      frame: number;
      /** PRNG state (xoshiro128** internal words). */
      prng: PRNGState | null;
      /** Animation instance states. */
      animations: readonly AnimationSnapshot[] | null;
      /** Animation FSM instance states. */
      fsms: readonly FSMSnapshot[] | null;
      /** Active tween states. */
      tweens: readonly TweenSnapshot[] | null;
      /** Active particle emitter states. */
      emitters: readonly EmitterSnapshot[] | null;
      /** Scene stack state. */
      sceneStack: SceneStackSnapshot | null;
      /** Custom user state (JSON-serializable). */
      userData: unknown;
      /** Version tag for forward compatibility. */
      version: number;
  }>;
  /**
   * Options for capturing a world snapshot.
   *
   * Pass only the systems you want to capture. Everything is optional.
   */
  export type CaptureOptions = {
      /** Current frame number. */
      frame?: number;
      /** PRNG state to capture. */
      prng?: PRNGState;
      /** Animation states to capture. */
      animations?: readonly AnimationState[];
      /** Animation FSM states to capture. */
      fsms?: readonly FSMState[];
      /** Active tweens to capture (pass the Tween objects from the tween system). */
      tweens?: readonly TweenSnapshotInput[];
      /** Emitter states to capture (pass the Emitter objects from the particle system). */
      emitters?: readonly EmitterSnapshotInput[];
      /** Scene stack info to capture. */
      sceneStack?: SceneStackInput;
      /** Custom user state (will be deep-cloned via JSON). */
      userData?: unknown;
  };
  /** Input type for capturing tween state. Matches the Tween interface shape. */
  export type TweenSnapshotInput = {
      id: string;
      state: string;
      elapsed: number;
      delayElapsed: number;
      duration: number;
      currentRepeat: number;
      isReversed: boolean;
      props: Record<string, number>;
      startValues: Record<string, number>;
  };
  /** Input type for capturing emitter state. Matches the Emitter interface shape. */
  export type EmitterSnapshotInput = {
      id: string;
      particles: readonly ParticleInputData[];
      emissionAccumulator: number;
      active: boolean;
      used: boolean;
  };
  /** Input type for a single particle. Matches the Particle interface shape. */
  export type ParticleInputData = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      ax: number;
      ay: number;
      rotation: number;
      rotationSpeed: number;
      scale: number;
      scaleSpeed: number;
      color: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      startColor: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      endColor: {
          r: number;
          g: number;
          b: number;
          a: number;
      };
      lifetime: number;
      age: number;
      alive: boolean;
      textureId: number;
  };
  /** Input type for capturing scene stack state. */
  export type SceneStackInput = {
      sceneNames: readonly string[];
      activeSceneName: string | null;
      depth: number;
  };
  /**
   * Result of restoring a world snapshot.
   *
   * Contains the restored values for each system. Use these to update your
   * local state references.
   */
  export type RestoreResult = {
      /** Restored PRNG state, or undefined if not captured. */
      prng: PRNGState | undefined;
      /** Restored animation states, or undefined if not captured. */
      animations: AnimationState[] | undefined;
      /** Restored animation FSM states (partial — config must be re-attached by caller). */
      fsms: FSMSnapshotRestoreData[] | undefined;
      /** Restored tween data, or undefined if not captured. */
      tweens: TweenSnapshot[] | undefined;
      /** Restored emitter data, or undefined if not captured. */
      emitters: EmitterSnapshot[] | undefined;
      /** Restored scene stack info, or undefined if not captured. */
      sceneStack: SceneStackSnapshot | undefined;
      /** Restored custom user state, or undefined if not captured. */
      userData: unknown;
  };
  /** Data needed to restore an FSM state. Caller must re-attach config and sortedTransitions. */
  export type FSMSnapshotRestoreData = {
      currentState: string;
      animation: AnimationState;
      blend: BlendState | null;
  };
  /**
   * Capture a world snapshot of the specified subsystem states.
   *
   * Only the systems you pass will be captured. Everything else is set to null.
   * All values are deep-cloned so mutations after capture do not affect the snapshot.
   *
   * @param options - Which systems to capture and their current state.
   * @returns An immutable WorldSnapshot.
   *
   * @example
   * ```ts
   * const snapshot = captureWorldSnapshot({
   *   frame: 42,
   *   prng: myRng,
   *   animations: [walkAnim, idleAnim],
   *   userData: { score: playerScore },
   * });
   * ```
   */
  export declare function captureWorldSnapshot(options?: CaptureOptions): WorldSnapshot;
  /**
   * Restore subsystem state from a world snapshot.
   *
   * Returns a RestoreResult containing the restored values for each system.
   * Systems that were not captured (null in the snapshot) return undefined.
   *
   * For FSMs, the caller must re-attach the config and sortedTransitions from
   * the original FSMState, since those contain function references that cannot
   * be serialized.
   *
   * @param snapshot - The WorldSnapshot to restore from.
   * @returns RestoreResult with restored state for each system.
   *
   * @example
   * ```ts
   * const restored = restoreWorldSnapshot(snapshot);
   * if (restored.prng) myRng = restored.prng;
   * if (restored.animations) {
   *   walkAnim = restored.animations[0];
   *   idleAnim = restored.animations[1];
   * }
   * ```
   */
  export declare function restoreWorldSnapshot(snapshot: WorldSnapshot): RestoreResult;
  /**
   * Apply restored FSM data back to an existing FSMState object.
   *
   * Since FSMState contains function references (config, sortedTransitions) that
   * cannot be serialized, this helper merges the restored snapshot data back into
   * an existing FSMState while preserving the original config.
   *
   * @param original - The original FSMState with config and sortedTransitions intact.
   * @param restored - The restored data from restoreWorldSnapshot().fsms.
   * @returns A new FSMState with restored animation/blend state and original config.
   */
  export declare function applyFSMRestore(original: FSMState, restored: FSMSnapshotRestoreData): FSMState;
  /**
   * Serialize a WorldSnapshot to a JSON string for persistence or transport.
   *
   * @param snapshot - The snapshot to serialize.
   * @returns JSON string representation.
   */
  export declare function serializeSnapshot(snapshot: WorldSnapshot): string;
  /**
   * Deserialize a WorldSnapshot from a JSON string.
   *
   * @param json - JSON string from serializeSnapshot().
   * @returns Parsed WorldSnapshot.
   * @throws Error if the JSON is invalid or version is unsupported.
   */
  export declare function deserializeSnapshot(json: string): WorldSnapshot;
  /**
   * Compare two world snapshots and return a list of subsystems that differ.
   *
   * Useful for debugging determinism issues: capture snapshots at the same frame
   * in two replays and compare them to find which system diverged.
   *
   * @param a - First snapshot.
   * @param b - Second snapshot.
   * @returns Array of subsystem names that differ between the two snapshots.
   */
  export declare function diffSnapshots(a: WorldSnapshot, b: WorldSnapshot): string[];
  /**
   * Create an empty WorldSnapshot with all fields set to null/default.
   * Useful as a starting point or for testing.
   *
   * @param frame - Optional frame number. Default: 0.
   * @returns An empty WorldSnapshot.
   */
  export declare function emptySnapshot(frame?: number): WorldSnapshot;

  /**
   * Draw call capture and visual assertion helpers.
   *
   * Captures the *intent* of draw calls (what the game code asked to render)
   * as structured data. Works in both headless and renderer modes — captures
   * happen at the TS level before the Rust op boundary.
   *
   * ## Usage
   *
   * ```typescript
   * import { enableDrawCallCapture, disableDrawCallCapture, getDrawCalls, clearDrawCalls } from "@arcane/runtime/testing";
   *
   * enableDrawCallCapture();
   * // ... run one frame of game logic ...
   * const calls = getDrawCalls();
   * // calls is an array of DrawCall objects describing everything drawn
   * disableDrawCallCapture();
   * ```
   *
   * ## Visual Assertions
   *
   * ```typescript
   * import { assertSpriteDrawn, assertTextDrawn, assertDrawCallCount } from "@arcane/runtime/testing";
   *
   * assertSpriteDrawn({ x: 100, y: 200 });           // at least one sprite at (100, 200)
   * assertTextDrawn("HP: 10");                         // text containing "HP: 10" was drawn
   * assertDrawCallCount("sprite", 5);                  // exactly 5 sprites drawn
   * ```
   */
  /** Discriminated union of all captured draw call types. */
  export type DrawCall = SpriteDrawCall | TextDrawCall | RectDrawCall | PanelDrawCall | BarDrawCall | LabelDrawCall | TilemapDrawCall | CircleDrawCall | LineDrawCall | TriangleDrawCall;
  /** A drawSprite() call. */
  export type SpriteDrawCall = {
      type: "sprite";
      textureId: number;
      x: number;
      y: number;
      w: number;
      h: number;
      layer: number;
      rotation: number;
      flipX: boolean;
      flipY: boolean;
      opacity: number;
      blendMode: string;
      shaderId: number;
  };
  /** A drawText() call (the full text, not individual glyph sprites). */
  export type TextDrawCall = {
      type: "text";
      content: string;
      x: number;
      y: number;
      scale: number;
      layer: number;
      screenSpace: boolean;
  };
  /** A drawRect() call. */
  export type RectDrawCall = {
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      layer: number;
      screenSpace: boolean;
  };
  /** A drawPanel() call. */
  export type PanelDrawCall = {
      type: "panel";
      x: number;
      y: number;
      w: number;
      h: number;
      layer: number;
      screenSpace: boolean;
      borderWidth: number;
  };
  /** A drawBar() call. */
  export type BarDrawCall = {
      type: "bar";
      x: number;
      y: number;
      w: number;
      h: number;
      fillRatio: number;
      layer: number;
      screenSpace: boolean;
  };
  /** A drawLabel() call. */
  export type LabelDrawCall = {
      type: "label";
      content: string;
      x: number;
      y: number;
      scale: number;
      layer: number;
      screenSpace: boolean;
  };
  /** A drawTilemap() call. */
  export type TilemapDrawCall = {
      type: "tilemap";
      tilemapId: number;
      x: number;
      y: number;
      layer: number;
  };
  /** A drawCircle() call. */
  export type CircleDrawCall = {
      type: "circle";
      cx: number;
      cy: number;
      radius: number;
      layer: number;
      screenSpace: boolean;
  };
  /** A drawLine() call. */
  export type LineDrawCall = {
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      thickness: number;
      layer: number;
      screenSpace: boolean;
  };
  /** A drawTriangle() call. */
  export type TriangleDrawCall = {
      type: "triangle";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x3: number;
      y3: number;
      layer: number;
      screenSpace: boolean;
  };
  /** Filter criteria for finding draw calls. All fields are optional — only specified fields are matched. */
  export type DrawCallFilter = {
      type?: DrawCall["type"];
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      layer?: number;
      textureId?: number;
      content?: string;
      screenSpace?: boolean;
      /** Match x/y within this tolerance (default: 0.001). */
      tolerance?: number;
  };
  /**
   * Enable draw call capture. All subsequent drawSprite/drawText/drawRect/etc.
   * calls will be logged as structured DrawCall objects. Works in headless mode.
   *
   * Call {@link getDrawCalls} to retrieve captured calls.
   * Call {@link clearDrawCalls} between frames to reset.
   * Call {@link disableDrawCallCapture} to stop capturing.
   */
  export declare function enableDrawCallCapture(): void;
  /**
   * Disable draw call capture and clear the log.
   */
  export declare function disableDrawCallCapture(): void;
  /**
   * Get all draw calls captured since the last {@link clearDrawCalls} or
   * {@link enableDrawCallCapture}. Returns a copy of the array.
   *
   * @returns Array of DrawCall objects, or empty array if capture is not enabled.
   */
  export declare function getDrawCalls(): DrawCall[];
  /**
   * Clear all captured draw calls without disabling capture.
   * Call this between frames to see only the current frame's draws.
   */
  export declare function clearDrawCalls(): void;
  /** @internal Push a draw call to the capture log. No-op when capture is disabled. */
  export declare function _logDrawCall(call: DrawCall): void;
  /**
   * Find all captured draw calls matching the given filter.
   * Returns an empty array if none match or capture is not enabled.
   *
   * @param filter - Criteria to match against. All specified fields must match.
   * @returns Matching DrawCall objects.
   *
   * @example
   * const sprites = findDrawCalls({ type: "sprite", layer: 1 });
   * const hudText = findDrawCalls({ type: "text", screenSpace: true });
   */
  export declare function findDrawCalls(filter: DrawCallFilter): DrawCall[];
  /**
   * Assert that at least one sprite was drawn matching the given filter.
   * Throws with a descriptive message if no matching sprite is found.
   *
   * @param filter - Optional criteria. If omitted, asserts any sprite was drawn.
   *
   * @example
   * assertSpriteDrawn({ x: 100, y: 200 });
   * assertSpriteDrawn({ textureId: playerTex, layer: 1 });
   */
  export declare function assertSpriteDrawn(filter?: Omit<DrawCallFilter, "type">): void;
  /**
   * Assert that text containing the given content was drawn.
   * Matches against both drawText() and drawLabel() calls.
   *
   * @param content - Substring to search for in drawn text.
   * @param filter - Additional filter criteria (layer, screenSpace, etc.).
   *
   * @example
   * assertTextDrawn("HP: 10");
   * assertTextDrawn("Score", { screenSpace: true });
   */
  export declare function assertTextDrawn(content: string, filter?: Omit<DrawCallFilter, "type" | "content">): void;
  /**
   * Assert the exact number of draw calls of a given type.
   *
   * @param type - Draw call type to count.
   * @param expected - Expected count.
   *
   * @example
   * assertDrawCallCount("sprite", 5);
   * assertDrawCallCount("text", 2);
   */
  export declare function assertDrawCallCount(type: DrawCall["type"], expected: number): void;
  /**
   * Assert that no draw calls overlap a given point (within tolerance).
   * Checks sprites, rects, panels, and bars for bounding box containment.
   *
   * @param x - World X coordinate.
   * @param y - World Y coordinate.
   * @param tolerance - Padding around the point. Default: 0.
   *
   * @example
   * assertNothingDrawnAt(500, 500); // no sprites/rects cover this point
   */
  export declare function assertNothingDrawnAt(x: number, y: number, tolerance?: number): void;
  /**
   * Assert that at least one draw call exists on the given layer.
   *
   * @param layer - Layer number to check.
   *
   * @example
   * assertLayerHasDrawCalls(0);  // ground layer has something
   * assertLayerHasDrawCalls(90); // UI layer has something
   */
  export declare function assertLayerHasDrawCalls(layer: number): void;
  /**
   * Assert that a draw call of the given type was drawn in screen space (HUD).
   * Only applies to types that support screenSpace: text, rect, panel, bar, label.
   *
   * @param type - Draw call type.
   *
   * @example
   * assertScreenSpaceDrawn("text");  // at least one HUD text
   * assertScreenSpaceDrawn("bar");   // at least one HUD bar
   */
  export declare function assertScreenSpaceDrawn(type: "text" | "rect" | "panel" | "bar" | "label"): void;
  /**
   * Get a summary of all captured draw calls, grouped by type.
   * Useful for debugging and logging.
   *
   * @returns Object with type counts and total.
   *
   * @example
   * const summary = getDrawCallSummary();
   * // { total: 15, sprite: 10, text: 3, rect: 2, ... }
   */
  export declare function getDrawCallSummary(): Record<string, number>;

}
