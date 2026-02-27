/**
 * Persistence system
 *
 * Provides save/load with schema migrations and auto-save.
 */

export type {
  SaveMetadata,
  SaveFile,
  Migration,
  SaveOptions,
  LoadResult,
  StorageBackend,
} from "./types.ts";

export {
  createMemoryStorage,
  createFileStorage,
} from "./storage.ts";

export {
  configureSaveSystem,
  registerMigration,
  serialize,
  deserialize,
  saveGame,
  loadGame,
  deleteSave,
  hasSave,
  listSaves,
  applyMigrations,
} from "./save.ts";

export {
  enableAutoSave,
  disableAutoSave,
  updateAutoSave,
  triggerAutoSave,
  isAutoSaveEnabled,
} from "./autosave.ts";
