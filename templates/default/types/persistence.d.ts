// Arcane Engine — Persistence Module Declarations
// Generated from runtime source. Do not edit manually.
// Regenerate with: ./scripts/generate-declarations.sh
//
// Import from: @arcane/runtime/persistence

declare module "@arcane/runtime/persistence" {
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

  /**
   * Auto-save functionality.
   */
  /**
   * Enable auto-save with the given configuration.
   */
  export declare function enableAutoSave<S>(config: {
      getState: () => S;
      interval?: number;
      options?: SaveOptions;
  }): void;
  /**
   * Disable auto-save.
   */
  export declare function disableAutoSave(): void;
  /**
   * Advance the auto-save timer. Saves when elapsed >= interval.
   * Returns true if a save was performed this frame.
   */
  export declare function updateAutoSave(dt: number): boolean;
  /**
   * Trigger an immediate auto-save if enabled.
   */
  export declare function triggerAutoSave(): void;
  /**
   * Check if auto-save is currently enabled.
   */
  export declare function isAutoSaveEnabled(): boolean;
  /**
   * Reset auto-save state for testing.
   */
  export declare function _resetAutoSave(): void;

  /**
   * Core save/load implementation.
   */
  /**
   * Configure the save system. Only updates provided fields.
   */
  export declare function configureSaveSystem(config: {
      storage?: StorageBackend;
      version?: number;
      prefix?: string;
  }): void;
  /**
   * Register a schema migration. Migrations are kept sorted by version.
   * Throws if a migration with the same version already exists.
   */
  export declare function registerMigration(migration: Migration): void;
  /**
   * Serialize game state into a JSON string with save envelope.
   */
  export declare function serialize<S>(state: S, options?: SaveOptions): string;
  /**
   * Apply migrations to data from fromVersion up to currentVersion.
   */
  export declare function applyMigrations(data: unknown, fromVersion: number): unknown;
  /**
   * Deserialize a JSON string back into a LoadResult.
   * Validates the save envelope and applies migrations if needed.
   */
  export declare function deserialize<S>(json: string): LoadResult<S>;
  /**
   * Save game state to the configured storage backend.
   */
  export declare function saveGame<S>(state: S, options?: SaveOptions): void;
  /**
   * Load game state from the configured storage backend.
   */
  export declare function loadGame<S>(slot?: string): LoadResult<S>;
  /**
   * Delete a save from storage.
   */
  export declare function deleteSave(slot?: string): void;
  /**
   * Check if a save exists in storage.
   */
  export declare function hasSave(slot?: string): boolean;
  /**
   * List all saves, returning metadata sorted by timestamp descending.
   */
  export declare function listSaves(): SaveMetadata[];
  /**
   * Reset all module-level state to defaults. For testing only.
   */
  export declare function _resetSaveSystem(): void;

  /**
   * Storage backend implementations.
   */
  /**
   * Create an in-memory storage backend.
   * Works everywhere (Node, V8, headless). Good for tests.
   */
  export declare function createMemoryStorage(): StorageBackend;
  /**
   * Create a file-based storage backend using Rust ops.
   * Falls back to memory storage in headless mode.
   */
  export declare function createFileStorage(): StorageBackend;

}
