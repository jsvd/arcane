/** Opaque handle to a loaded sound. */
export type SoundId = number;

export type PlayOptions = {
  volume?: number;
  loop?: boolean;
};

const hasRenderOps =
  typeof (globalThis as any).Deno !== "undefined" &&
  typeof (globalThis as any).Deno?.core?.ops?.op_load_sound === "function";

/**
 * Load a sound file (WAV, OGG, MP3). Returns a sound handle.
 * Caches by path — loading the same path twice returns the same handle.
 * Returns 0 in headless mode.
 */
export function loadSound(path: string): SoundId {
  if (!hasRenderOps) return 0;
  return (globalThis as any).Deno.core.ops.op_load_sound(path);
}

/**
 * Play a loaded sound.
 * No-op in headless mode.
 */
export function playSound(id: SoundId, options?: PlayOptions): void {
  if (!hasRenderOps) return;
  const volume = options?.volume ?? 1.0;
  const loop_ = options?.loop ?? false;
  (globalThis as any).Deno.core.ops.op_play_sound(id, volume, loop_);
}

/**
 * Convenience: load and play a sound file as looping music.
 * Returns the sound ID for later stopping.
 * Returns 0 in headless mode.
 */
export function playMusic(path: string, volume: number = 1.0): SoundId {
  const id = loadSound(path);
  playSound(id, { volume, loop: true });
  return id;
}

/**
 * Stop a specific sound.
 * No-op in headless mode.
 */
export function stopSound(id: SoundId): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_stop_sound(id);
}

/**
 * Stop all playing sounds.
 * No-op in headless mode.
 */
export function stopAll(): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_stop_all_sounds();
}

/**
 * Set the master volume (0.0 = mute, 1.0 = full).
 * No-op in headless mode.
 */
export function setVolume(volume: number): void {
  if (!hasRenderOps) return;
  (globalThis as any).Deno.core.ops.op_set_master_volume(volume);
}
