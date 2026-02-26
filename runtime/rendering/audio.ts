import { tween } from "../tweening/tween.ts";

/**
 * Opaque handle to a loaded sound. Returned by {@link loadSound}.
 * A value of 0 means "no sound" (headless mode fallback).
 */
export type SoundId = number;

/**
 * Unique identifier for a sound instance. Each call to {@link playSound} or
 * {@link playSoundAt} returns a new InstanceId.
 */
export type InstanceId = number;

/**
 * Audio bus identifier for grouping sounds.
 * - "sfx" — Sound effects (default)
 * - "music" — Background music
 * - "ambient" — Ambient loops
 * - "voice" — Dialog and voice-over
 */
export type AudioBus = "sfx" | "music" | "ambient" | "voice";

/** Options for {@link playSound}. */
export type PlayOptions = {
  /** Playback volume, 0.0 (silent) to 1.0 (full). Default: 1.0. */
  volume?: number;
  /** If true, sound loops until stopped. Default: false. */
  loop?: boolean;
  /** Audio bus to route this sound through. Default: "sfx". */
  bus?: AudioBus;
  /** Stereo panning: -1.0 (left) to 1.0 (right). Default: 0.0 (center). */
  pan?: number;
  /** Playback pitch multiplier. 1.0 = normal, 2.0 = double speed. Default: 1.0. */
  pitch?: number;
  /** Random pitch variation amount added/subtracted from pitch. Default: 0.0. */
  pitchVariation?: number;
  /** Low-pass filter cutoff frequency in Hz. 0 = disabled. Default: 0. */
  lowPassFreq?: number;
  /** Reverb mix amount, 0.0 (dry) to 1.0 (fully wet). Default: 0.0. */
  reverb?: number;
  /** Reverb delay in milliseconds. Default: 50. */
  reverbDelay?: number;
};

/** Options for {@link playSoundAt} spatial audio. */
export type SpatialOptions = PlayOptions & {
  /** World X coordinate of sound source. */
  x: number;
  /** World Y coordinate of sound source. */
  y: number;
  /** Maximum audible distance from listener. Default: 500. */
  maxDistance?: number;
  /** Reference distance for volume falloff. Default: 50. */
  refDistance?: number;
};

/** Pool configuration for limiting concurrent instances of a sound. */
export type PoolConfig = {
  /** Maximum concurrent instances. Default: unlimited. */
  maxInstances?: number;
  /** What to do when pool is full: "oldest" = stop oldest, "reject" = don't play new. Default: "oldest". */
  policy?: "oldest" | "reject";
};

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_load_sound === "function";

const hasPlaySoundEx =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_play_sound_ex === "function";

/** Bus string to u32 mapping */
const BUS_MAP: Record<AudioBus, number> = {
  sfx: 0,
  music: 1,
  ambient: 2,
  voice: 3,
};

/** Module state for instance tracking */
let nextInstanceId = 1;
const activeInstances = new Map<InstanceId, { soundId: SoundId; bus: AudioBus; startTime: number }>();
const poolConfigs = new Map<SoundId, PoolConfig>();
const busVolumes = new Map<AudioBus, number>();
let listenerX = 0;
let listenerY = 0;
const spatialInstances = new Map<InstanceId, { x: number; y: number }>();
let currentMusicInstance: InstanceId = 0;

// Initialize bus volumes to 1.0
busVolumes.set("sfx", 1.0);
busVolumes.set("music", 1.0);
busVolumes.set("ambient", 1.0);
busVolumes.set("voice", 1.0);

/**
 * Load a sound file (WAV, OGG, MP3). Returns an opaque sound handle.
 * Caches by path -- loading the same path twice returns the same handle.
 * Returns 0 in headless mode.
 *
 * @param path - File path to an audio file (relative to game entry file or absolute).
 * @returns Sound handle for use with playSound(), stopSound().
 */
export function loadSound(path: string): SoundId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_load_sound(path);
}

/**
 * Play a loaded sound effect and return an instance ID for later control.
 * No-op in headless mode (but still returns a unique InstanceId).
 *
 * @param id - Sound handle from loadSound().
 * @param options - Volume, loop, bus, pan, pitch, effects settings.
 * @returns Unique instance ID for controlling this sound instance.
 */
export function playSound(id: SoundId, options?: PlayOptions): InstanceId {
  const instanceId = nextInstanceId++;
  const bus = options?.bus ?? "sfx";
  const startTime = Date.now();

  activeInstances.set(instanceId, { soundId: id, bus, startTime });

  if (!hasRenderOps) return instanceId;

  // Check pool limits
  const poolCfg = poolConfigs.get(id);
  if (poolCfg?.maxInstances !== undefined) {
    const currentCount = Array.from(activeInstances.values()).filter(
      (inst) => inst.soundId === id
    ).length;

    if (currentCount > poolCfg.maxInstances) {
      if (poolCfg.policy === "reject") {
        activeInstances.delete(instanceId);
        return instanceId;
      } else {
        // Stop oldest instance
        let oldestId: InstanceId | null = null;
        let oldestTime = Infinity;
        for (const [instId, inst] of activeInstances) {
          if (inst.soundId === id && inst.startTime < oldestTime) {
            oldestTime = inst.startTime;
            oldestId = instId;
          }
        }
        if (oldestId !== null) {
          activeInstances.delete(oldestId);
          spatialInstances.delete(oldestId);
          if (hasPlaySoundEx) {
            (globalThis as any).Deno.core.ops.op_stop_instance(oldestId);
          }
        }
      }
    }
  }

  const volume = options?.volume ?? 1.0;
  const loop_ = options?.loop ?? false;
  const pan = options?.pan ?? 0.0;
  let pitch = options?.pitch ?? 1.0;
  const pitchVariation = options?.pitchVariation ?? 0.0;

  // Apply pitch variation
  if (pitchVariation > 0) {
    pitch += (Math.random() * 2 - 1) * pitchVariation;
  }

  const lowPassFreq = options?.lowPassFreq ?? 0;
  const reverb = options?.reverb ?? 0.0;
  const reverbDelay = options?.reverbDelay ?? 50;
  const busId = BUS_MAP[bus];

  if (hasPlaySoundEx) {
    (globalThis as any).Deno.core.ops.op_play_sound_ex(
      id,
      instanceId,
      volume,
      loop_,
      busId,
      pan,
      pitch,
      lowPassFreq,
      reverb,
      reverbDelay
    );
  } else {
    // Fallback to old op for backward compatibility
    (globalThis as any).Deno.core.ops.op_play_sound(id, volume, loop_);
  }

  return instanceId;
}

/**
 * Load and play a sound file as looping background music.
 * Convenience function combining loadSound() + playSound() with loop: true and bus: "music".
 *
 * @param path - File path to an audio file.
 * @param volume - Playback volume, 0.0-1.0. Default: 1.0.
 * @returns Instance ID for controlling this music instance.
 */
export function playMusic(path: string, volume: number = 1.0): InstanceId {
  const id = loadSound(path);
  const instanceId = playSound(id, { volume, loop: true, bus: "music" });
  currentMusicInstance = instanceId;
  return instanceId;
}

/**
 * Stop a specific playing sound.
 * No-op in headless mode.
 *
 * @param id - Sound handle from loadSound().
 */
export function stopSound(id: SoundId): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_stop_sound(id);
}

/**
 * Stop all currently playing sounds and music.
 * No-op in headless mode.
 */
export function stopAll(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_stop_all_sounds();
}

/**
 * Set the master volume for all audio output.
 * No-op in headless mode.
 *
 * @param volume - Master volume level, 0.0 (mute) to 1.0 (full). Values outside this range are not clamped.
 */
export function setVolume(volume: number): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_master_volume(volume);
}

/**
 * Play a sound at a specific world position with spatial audio.
 * Volume automatically attenuates based on distance from listener.
 * No-op in headless mode (but still returns a unique InstanceId).
 *
 * @param id - Sound handle from loadSound().
 * @param options - Spatial position, volume, loop, and other settings.
 * @returns Unique instance ID for controlling this sound instance.
 */
export function playSoundAt(id: SoundId, options: SpatialOptions): InstanceId {
  const instanceId = nextInstanceId++;
  const bus = options?.bus ?? "sfx";
  const startTime = Date.now();

  activeInstances.set(instanceId, { soundId: id, bus, startTime });
  spatialInstances.set(instanceId, { x: options.x, y: options.y });

  if (!hasRenderOps) return instanceId;

  const volume = options?.volume ?? 1.0;
  const loop_ = options?.loop ?? false;
  let pitch = options?.pitch ?? 1.0;
  const pitchVariation = options?.pitchVariation ?? 0.0;

  // Apply pitch variation
  if (pitchVariation > 0) {
    pitch += (Math.random() * 2 - 1) * pitchVariation;
  }

  const busId = BUS_MAP[bus];
  const x = options.x;
  const y = options.y;

  if (hasPlaySoundEx) {
    (globalThis as any).Deno.core.ops.op_play_sound_spatial(
      id,
      instanceId,
      volume,
      loop_,
      busId,
      pitch,
      x,
      y,
      listenerX,
      listenerY
    );
  }

  return instanceId;
}

/**
 * Crossfade from current music to a new track.
 * Tweens the old music volume down and new music volume up over the specified duration.
 * No-op in headless mode (but still returns a unique InstanceId).
 *
 * @param path - File path to the new music file.
 * @param duration - Crossfade duration in milliseconds. Default: 2000.
 * @param volume - Target volume for the new music. Default: 1.0.
 * @returns Instance ID of the new music track.
 */
export function crossfadeMusic(path: string, duration: number = 2000, volume: number = 1.0): InstanceId {
  const oldMusicId = currentMusicInstance;

  // Start new music at volume 0
  const newMusicId = playMusic(path, 0.0);
  currentMusicInstance = newMusicId;

  if (!hasRenderOps) return newMusicId;

  const durationSec = duration / 1000;

  // Tween old music volume down
  if (oldMusicId !== 0) {
    const oldVolume = { value: 1.0 };
    tween(oldVolume, { value: 0.0 }, durationSec, {
      onUpdate: (progress: number) => {
        setInstanceVolume(oldMusicId, oldVolume.value);
      },
      onComplete: () => {
        stopInstance(oldMusicId);
      },
    });
  }

  // Tween new music volume up
  const newVolume = { value: 0.0 };
  tween(newVolume, { value: volume }, durationSec, {
    onUpdate: (progress: number) => {
      setInstanceVolume(newMusicId, newVolume.value);
    },
  });

  return newMusicId;
}

/**
 * Stop a specific sound instance.
 * No-op in headless mode.
 *
 * @param instanceId - Instance ID from playSound() or playSoundAt().
 */
export function stopInstance(instanceId: InstanceId): void {
  activeInstances.delete(instanceId);
  spatialInstances.delete(instanceId);

  if (!hasRenderOps) return;
  if (hasPlaySoundEx) {
    (globalThis as any).Deno.core.ops.op_stop_instance(instanceId);
  }
}

/**
 * Set the volume of a specific audio bus.
 * Affects all sounds currently playing or that will play on this bus.
 * No-op in headless mode (but still updates local state).
 *
 * @param bus - Audio bus identifier.
 * @param volume - Bus volume level, 0.0 (mute) to 1.0 (full).
 */
export function setBusVolume(bus: AudioBus, volume: number): void {
  busVolumes.set(bus, volume);

  if (!hasRenderOps) return;
  if (hasPlaySoundEx) {
    const busId = BUS_MAP[bus];
    (globalThis as any).Deno.core.ops.op_set_bus_volume(busId, volume);
  }
}

/**
 * Get the current volume of a specific audio bus.
 *
 * @param bus - Audio bus identifier.
 * @returns Current bus volume, 0.0 to 1.0.
 */
export function getBusVolume(bus: AudioBus): number {
  return busVolumes.get(bus) ?? 1.0;
}

/**
 * Set the listener position for spatial audio calculations.
 * Typically this should match the camera position or player position.
 * No-op in headless mode (but still updates local state).
 *
 * @param x - Listener X position in world coordinates.
 * @param y - Listener Y position in world coordinates.
 */
export function setListenerPosition(x: number, y: number): void {
  listenerX = x;
  listenerY = y;
}

/**
 * Update spatial audio for all active spatial instances.
 * Should be called once per frame (typically in onFrame callback) if using spatial audio.
 * No-op in headless mode.
 */
export function updateSpatialAudio(): void {
  if (!hasRenderOps || !hasPlaySoundEx) return;

  if (spatialInstances.size === 0) return;

  // Build JSON payload matching Rust's expected format:
  // {"instanceIds": [...], "sourceXs": [...], "sourceYs": [...]}
  const instanceIds: number[] = [];
  const sourceXs: number[] = [];
  const sourceYs: number[] = [];
  for (const [instanceId, pos] of spatialInstances) {
    instanceIds.push(instanceId);
    sourceXs.push(pos.x);
    sourceYs.push(pos.y);
  }

  const json = JSON.stringify({ instanceIds, sourceXs, sourceYs });
  (globalThis as any).Deno.core.ops.op_update_spatial_positions(json, listenerX, listenerY);
}

/**
 * Configure pooling limits for a sound.
 * When maxInstances is reached, either the oldest instance is stopped (policy: "oldest")
 * or new play requests are rejected (policy: "reject").
 *
 * @param id - Sound handle from loadSound().
 * @param config - Pool configuration.
 */
export function setPoolConfig(id: SoundId, config: PoolConfig): void {
  poolConfigs.set(id, config);
}

/**
 * Set the volume of a specific sound instance.
 * No-op in headless mode.
 *
 * @param instanceId - Instance ID from playSound() or playSoundAt().
 * @param volume - Volume level, 0.0 (mute) to 1.0 (full).
 */
export function setInstanceVolume(instanceId: InstanceId, volume: number): void {
  if (!hasRenderOps) return;
  if (hasPlaySoundEx) {
    (globalThis as any).Deno.core.ops.op_set_instance_volume(instanceId, volume);
  }
}
