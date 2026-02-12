/**
 * Auto-save functionality.
 */

import type { SaveOptions } from "./types.ts";
import { saveGame } from "./save.ts";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let autoSaveEnabled = false;
let autoSaveInterval = 60; // seconds
let autoSaveElapsed = 0;
let autoSaveGetState: (() => unknown) | null = null;
let autoSaveOptions: SaveOptions = {};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enable auto-save with the given configuration.
 */
export function enableAutoSave<S>(config: {
  getState: () => S;
  interval?: number;
  options?: SaveOptions;
}): void {
  autoSaveEnabled = true;
  autoSaveGetState = config.getState;
  if (config.interval !== undefined) autoSaveInterval = config.interval;
  if (config.options !== undefined) autoSaveOptions = config.options;
  autoSaveElapsed = 0;
}

/**
 * Disable auto-save.
 */
export function disableAutoSave(): void {
  autoSaveEnabled = false;
  autoSaveGetState = null;
}

/**
 * Advance the auto-save timer. Saves when elapsed >= interval.
 * Returns true if a save was performed this frame.
 */
export function updateAutoSave(dt: number): boolean {
  if (!autoSaveEnabled || autoSaveGetState === null) return false;
  autoSaveElapsed += dt;
  if (autoSaveElapsed >= autoSaveInterval) {
    autoSaveElapsed = 0;
    const state = autoSaveGetState();
    saveGame(state, autoSaveOptions);
    return true;
  }
  return false;
}

/**
 * Trigger an immediate auto-save if enabled.
 */
export function triggerAutoSave(): void {
  if (!autoSaveEnabled || autoSaveGetState === null) return;
  const state = autoSaveGetState();
  saveGame(state, autoSaveOptions);
}

/**
 * Check if auto-save is currently enabled.
 */
export function isAutoSaveEnabled(): boolean {
  return autoSaveEnabled;
}

/**
 * Reset auto-save state for testing.
 */
export function _resetAutoSave(): void {
  autoSaveEnabled = false;
  autoSaveInterval = 60;
  autoSaveElapsed = 0;
  autoSaveGetState = null;
  autoSaveOptions = {};
}
