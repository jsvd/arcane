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

import type { PRNGState } from "../state/prng.ts";
import type { AnimationState, AnimationId } from "../rendering/animation.ts";
import type { FSMState, BlendState, FSMConfig } from "../rendering/animation-fsm.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  color: { r: number; g: number; b: number; a: number };
  startColor: { r: number; g: number; b: number; a: number };
  endColor: { r: number; g: number; b: number; a: number };
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
  color: { r: number; g: number; b: number; a: number };
  startColor: { r: number; g: number; b: number; a: number };
  endColor: { r: number; g: number; b: number; a: number };
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

// ---------------------------------------------------------------------------
// Current snapshot format version
// ---------------------------------------------------------------------------

const SNAPSHOT_VERSION = 1;

// ---------------------------------------------------------------------------
// Deep clone helper
// ---------------------------------------------------------------------------

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Capture helpers
// ---------------------------------------------------------------------------

function captureAnimationState(anim: AnimationState): AnimationSnapshot {
  return {
    defId: anim.defId,
    elapsed: anim.elapsed,
    frame: anim.frame,
    finished: anim.finished,
  };
}

function captureBlendState(blend: BlendState): BlendSnapshot {
  return {
    fromAnim: captureAnimationState(blend.fromAnim),
    fromAnimId: blend.fromAnimId,
    elapsed: blend.elapsed,
    duration: blend.duration,
  };
}

function captureFSMState(fsm: FSMState): FSMSnapshot {
  return {
    currentState: fsm.currentState,
    animation: captureAnimationState(fsm.animation),
    blend: fsm.blend ? captureBlendState(fsm.blend) : null,
  };
}

function captureTweenState(tw: TweenSnapshotInput): TweenSnapshot {
  return {
    id: tw.id,
    state: tw.state,
    elapsed: tw.elapsed,
    delayElapsed: tw.delayElapsed,
    duration: tw.duration,
    currentRepeat: tw.currentRepeat,
    isReversed: tw.isReversed,
    props: { ...tw.props },
    startValues: { ...tw.startValues },
  };
}

function captureParticle(p: ParticleInputData): ParticleSnapshot {
  return {
    x: p.x,
    y: p.y,
    vx: p.vx,
    vy: p.vy,
    ax: p.ax,
    ay: p.ay,
    rotation: p.rotation,
    rotationSpeed: p.rotationSpeed,
    scale: p.scale,
    scaleSpeed: p.scaleSpeed,
    color: { ...p.color },
    startColor: { ...p.startColor },
    endColor: { ...p.endColor },
    lifetime: p.lifetime,
    age: p.age,
    alive: p.alive,
    textureId: p.textureId,
  };
}

function captureEmitterState(em: EmitterSnapshotInput): EmitterSnapshot {
  return {
    id: em.id,
    particles: em.particles.map(captureParticle),
    emissionAccumulator: em.emissionAccumulator,
    active: em.active,
    used: em.used,
  };
}

// ---------------------------------------------------------------------------
// Restore helpers
// ---------------------------------------------------------------------------

function restoreAnimationState(snap: AnimationSnapshot): AnimationState {
  return {
    defId: snap.defId,
    elapsed: snap.elapsed,
    frame: snap.frame,
    finished: snap.finished,
  };
}

function restoreBlendState(snap: BlendSnapshot): BlendState {
  return {
    fromAnim: restoreAnimationState(snap.fromAnim),
    fromAnimId: snap.fromAnimId,
    elapsed: snap.elapsed,
    duration: snap.duration,
  };
}

function restoreFSMData(snap: FSMSnapshot): FSMSnapshotRestoreData {
  return {
    currentState: snap.currentState,
    animation: restoreAnimationState(snap.animation),
    blend: snap.blend ? restoreBlendState(snap.blend) : null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
export function captureWorldSnapshot(options: CaptureOptions = {}): WorldSnapshot {
  return {
    timestamp: Date.now(),
    frame: options.frame ?? 0,
    version: SNAPSHOT_VERSION,
    prng: options.prng ? deepClone(options.prng) : null,
    animations: options.animations
      ? options.animations.map(captureAnimationState)
      : null,
    fsms: options.fsms
      ? options.fsms.map(captureFSMState)
      : null,
    tweens: options.tweens
      ? options.tweens.map(captureTweenState)
      : null,
    emitters: options.emitters
      ? options.emitters.map(captureEmitterState)
      : null,
    sceneStack: options.sceneStack
      ? {
          sceneNames: [...options.sceneStack.sceneNames],
          activeSceneName: options.sceneStack.activeSceneName,
          depth: options.sceneStack.depth,
        }
      : null,
    userData: options.userData !== undefined ? deepClone(options.userData) : undefined,
  };
}

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
export function restoreWorldSnapshot(snapshot: WorldSnapshot): RestoreResult {
  return {
    prng: snapshot.prng ? deepClone(snapshot.prng) : undefined,
    animations: snapshot.animations
      ? snapshot.animations.map(restoreAnimationState)
      : undefined,
    fsms: snapshot.fsms
      ? snapshot.fsms.map(restoreFSMData)
      : undefined,
    tweens: snapshot.tweens
      ? snapshot.tweens.map((tw) => deepClone(tw))
      : undefined,
    emitters: snapshot.emitters
      ? snapshot.emitters.map((em) => deepClone(em) as EmitterSnapshot)
      : undefined,
    sceneStack: snapshot.sceneStack
      ? {
          sceneNames: [...snapshot.sceneStack.sceneNames],
          activeSceneName: snapshot.sceneStack.activeSceneName,
          depth: snapshot.sceneStack.depth,
        }
      : undefined,
    userData: snapshot.userData !== undefined ? deepClone(snapshot.userData) : undefined,
  };
}

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
export function applyFSMRestore(original: FSMState, restored: FSMSnapshotRestoreData): FSMState {
  return {
    config: original.config,
    sortedTransitions: original.sortedTransitions,
    currentState: restored.currentState,
    animation: restored.animation,
    blend: restored.blend,
  };
}

/**
 * Serialize a WorldSnapshot to a JSON string for persistence or transport.
 *
 * @param snapshot - The snapshot to serialize.
 * @returns JSON string representation.
 */
export function serializeSnapshot(snapshot: WorldSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Deserialize a WorldSnapshot from a JSON string.
 *
 * @param json - JSON string from serializeSnapshot().
 * @returns Parsed WorldSnapshot.
 * @throws Error if the JSON is invalid or version is unsupported.
 */
export function deserializeSnapshot(json: string): WorldSnapshot {
  const parsed = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid snapshot: expected an object");
  }
  if (typeof parsed.version !== "number") {
    throw new Error("Invalid snapshot: missing version field");
  }
  if (parsed.version > SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported snapshot version: ${parsed.version} (max supported: ${SNAPSHOT_VERSION})`,
    );
  }
  return parsed as WorldSnapshot;
}

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
export function diffSnapshots(a: WorldSnapshot, b: WorldSnapshot): string[] {
  const diffs: string[] = [];

  if (!jsonEqual(a.prng, b.prng)) diffs.push("prng");
  if (!jsonEqual(a.animations, b.animations)) diffs.push("animations");
  if (!jsonEqual(a.fsms, b.fsms)) diffs.push("fsms");
  if (!jsonEqual(a.tweens, b.tweens)) diffs.push("tweens");
  if (!jsonEqual(a.emitters, b.emitters)) diffs.push("emitters");
  if (!jsonEqual(a.sceneStack, b.sceneStack)) diffs.push("sceneStack");
  if (!jsonEqual(a.userData, b.userData)) diffs.push("userData");

  return diffs;
}

/**
 * Create an empty WorldSnapshot with all fields set to null/default.
 * Useful as a starting point or for testing.
 *
 * @param frame - Optional frame number. Default: 0.
 * @returns An empty WorldSnapshot.
 */
export function emptySnapshot(frame: number = 0): WorldSnapshot {
  return {
    timestamp: Date.now(),
    frame,
    version: SNAPSHOT_VERSION,
    prng: null,
    animations: null,
    fsms: null,
    tweens: null,
    emitters: null,
    sceneStack: null,
    userData: undefined,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Deep equality via JSON serialization (handles all JSON-serializable types). */
function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
