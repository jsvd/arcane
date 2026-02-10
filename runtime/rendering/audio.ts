/**
 * Opaque handle to a loaded sound. Returned by {@link loadSound}.
 * A value of 0 means "no sound" (headless mode fallback).
 */
export type SoundId = number;

/** Options for {@link playSound}. */
export type PlayOptions = {
  /** Playback volume, 0.0 (silent) to 1.0 (full). Default: 1.0. */
  volume?: number;
  /** If true, sound loops until stopped. Default: false. */
  loop?: boolean;
};

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_load_sound === "function";

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
 * Play a loaded sound effect.
 * No-op in headless mode.
 *
 * @param id - Sound handle from loadSound().
 * @param options - Volume and loop settings.
 */
export function playSound(id: SoundId, options?: PlayOptions): void {
  if (!hasRenderOps) return;
  const volume = options?.volume ?? 1.0;
  const loop_ = options?.loop ?? false;
  (globalThis as any).Deno.core.ops.op_play_sound(id, volume, loop_);
}

/**
 * Load and play a sound file as looping background music.
 * Convenience function combining loadSound() + playSound() with loop: true.
 * Returns 0 in headless mode.
 *
 * @param path - File path to an audio file.
 * @param volume - Playback volume, 0.0-1.0. Default: 1.0.
 * @returns Sound handle for later stopping with stopSound().
 */
export function playMusic(path: string, volume: number = 1.0): SoundId {
  const id = loadSound(path);
  playSound(id, { volume, loop: true });
  return id;
}

/**
 * Stop a specific playing sound.
 * No-op in headless mode.
 *
 * @param id - Sound handle from loadSound() or playMusic().
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
