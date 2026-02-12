/**
 * Save/load system type definitions.
 */

/** Metadata stored with each save file. */
export type SaveMetadata = Readonly<{
  /** Save slot identifier. */
  slot: string;
  /** Unix timestamp (ms) when save was created. */
  timestamp: number;
  /** Schema version number for migration support. */
  version: number;
  /** Optional human-readable label. */
  label?: string;
  /** Optional cumulative play time in seconds. */
  playtime?: number;
}>;

/** Envelope wrapping saved game state with metadata. */
export type SaveFile<S = unknown> = Readonly<{
  /** Magic marker identifying this as an Arcane save file. */
  __arcane: "save";
  /** Schema version for migration. */
  __version: number;
  /** Save metadata. */
  metadata: SaveMetadata;
  /** The actual game state. */
  state: S;
}>;

/** A schema migration that transforms state from one version to the next. */
export type Migration = Readonly<{
  /** Target version this migration produces. */
  version: number;
  /** Human-readable description. */
  description: string;
  /** Transform function: takes state at version-1, returns state at version. */
  up: (data: unknown) => unknown;
}>;

/** Options for saving. */
export type SaveOptions = {
  /** Save slot name. Default: "default". */
  slot?: string;
  /** Human-readable label. */
  label?: string;
  /** Cumulative play time in seconds. */
  playtime?: number;
};

/** Result of a load operation. */
export type LoadResult<S = unknown> = Readonly<{
  /** Whether the load succeeded. */
  ok: boolean;
  /** Loaded state (present if ok is true). */
  state?: S;
  /** Save metadata (present if ok is true). */
  metadata?: SaveMetadata;
  /** Error message (present if ok is false). */
  error?: string;
}>;

/** Backend for reading/writing save data. */
export type StorageBackend = Readonly<{
  /** Write a value to storage. */
  write: (key: string, value: string) => void;
  /** Read a value from storage. Returns null if not found. */
  read: (key: string) => string | null;
  /** Remove a value from storage. */
  remove: (key: string) => void;
  /** List all keys in storage. */
  list: () => string[];
}>;
