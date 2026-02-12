/**
 * Core save/load implementation.
 */

import type { SaveFile, SaveMetadata, SaveOptions, LoadResult, Migration, StorageBackend } from "./types.ts";
import { createMemoryStorage } from "./storage.ts";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let storage: StorageBackend = createMemoryStorage();
let currentVersion = 1;
let keyPrefix = "arcane_save_";
const migrations: Migration[] = [];

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configure the save system. Only updates provided fields.
 */
export function configureSaveSystem(config: {
  storage?: StorageBackend;
  version?: number;
  prefix?: string;
}): void {
  if (config.storage !== undefined) storage = config.storage;
  if (config.version !== undefined) currentVersion = config.version;
  if (config.prefix !== undefined) keyPrefix = config.prefix;
}

/**
 * Register a schema migration. Migrations are kept sorted by version.
 * Throws if a migration with the same version already exists.
 */
export function registerMigration(migration: Migration): void {
  for (const m of migrations) {
    if (m.version === migration.version) {
      throw new Error(`Migration for version ${migration.version} already registered`);
    }
  }
  migrations.push(migration);
  migrations.sort((a, b) => a.version - b.version);
}

// ---------------------------------------------------------------------------
// Serialization (pure)
// ---------------------------------------------------------------------------

/**
 * Serialize game state into a JSON string with save envelope.
 */
export function serialize<S>(state: S, options?: SaveOptions): string {
  const slot = options?.slot ?? "default";
  const metadata: SaveMetadata = {
    slot,
    timestamp: Date.now(),
    version: currentVersion,
    ...(options?.label !== undefined ? { label: options.label } : {}),
    ...(options?.playtime !== undefined ? { playtime: options.playtime } : {}),
  };
  const saveFile: SaveFile<S> = {
    __arcane: "save",
    __version: currentVersion,
    metadata,
    state,
  };
  return JSON.stringify(saveFile);
}

/**
 * Apply migrations to data from fromVersion up to currentVersion.
 */
export function applyMigrations(data: unknown, fromVersion: number): unknown {
  let result = data;
  for (const m of migrations) {
    if (m.version > fromVersion && m.version <= currentVersion) {
      result = m.up(result);
    }
  }
  return result;
}

/**
 * Deserialize a JSON string back into a LoadResult.
 * Validates the save envelope and applies migrations if needed.
 */
export function deserialize<S>(json: string): LoadResult<S> {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "Invalid save file format" };
  }

  if (parsed.__arcane !== "save") {
    return { ok: false, error: "Missing or invalid __arcane marker" };
  }

  if (typeof parsed.__version !== "number" || typeof parsed.metadata !== "object" || parsed.metadata === null) {
    return { ok: false, error: "Invalid save file format" };
  }

  let state = parsed.state;
  const fileVersion = parsed.__version;

  if (fileVersion < currentVersion) {
    state = applyMigrations(state, fileVersion);
  }

  const metadata: SaveMetadata = {
    ...parsed.metadata,
    version: currentVersion,
  };

  return { ok: true, state: state as S, metadata };
}

// ---------------------------------------------------------------------------
// Save / Load / Delete / Has / List
// ---------------------------------------------------------------------------

/**
 * Save game state to the configured storage backend.
 */
export function saveGame<S>(state: S, options?: SaveOptions): void {
  const slot = options?.slot ?? "default";
  const json = serialize(state, options);
  storage.write(keyPrefix + slot, json);
}

/**
 * Load game state from the configured storage backend.
 */
export function loadGame<S>(slot?: string): LoadResult<S> {
  const key = keyPrefix + (slot ?? "default");
  const json = storage.read(key);
  if (json === null) {
    return { ok: false, error: "Save not found" };
  }
  return deserialize<S>(json);
}

/**
 * Delete a save from storage.
 */
export function deleteSave(slot?: string): void {
  storage.remove(keyPrefix + (slot ?? "default"));
}

/**
 * Check if a save exists in storage.
 */
export function hasSave(slot?: string): boolean {
  return storage.read(keyPrefix + (slot ?? "default")) !== null;
}

/**
 * List all saves, returning metadata sorted by timestamp descending.
 */
export function listSaves(): SaveMetadata[] {
  const keys = storage.list();
  const results: SaveMetadata[] = [];
  for (const key of keys) {
    if (!key.startsWith(keyPrefix)) continue;
    const json = storage.read(key);
    if (json === null) continue;
    const result = deserialize(json);
    if (result.ok && result.metadata) {
      results.push(result.metadata);
    }
  }
  results.sort((a, b) => b.timestamp - a.timestamp);
  return results;
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

/**
 * Reset all module-level state to defaults. For testing only.
 */
export function _resetSaveSystem(): void {
  storage = createMemoryStorage();
  currentVersion = 1;
  keyPrefix = "arcane_save_";
  migrations.length = 0;
}
