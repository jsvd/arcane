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
  _resetSaveSystem,
} from "./save.ts";

export {
  enableAutoSave,
  disableAutoSave,
  updateAutoSave,
  triggerAutoSave,
  isAutoSaveEnabled,
  _resetAutoSave,
} from "./autosave.ts";
