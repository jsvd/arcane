/**
 * Storage backend implementations.
 */

import type { StorageBackend } from "./types.ts";

/**
 * Create an in-memory storage backend.
 * Works everywhere (Node, V8, headless). Good for tests.
 */
export function createMemoryStorage(): StorageBackend {
  const store = new Map<string, string>();
  return {
    write: (key, value) => { store.set(key, value); },
    read: (key) => store.get(key) ?? null,
    remove: (key) => { store.delete(key); },
    list: () => Array.from(store.keys()),
  };
}

/**
 * Create a file-based storage backend using Rust ops.
 * Falls back to memory storage in headless mode.
 */
export function createFileStorage(): StorageBackend {
  const hasOps = typeof (globalThis as any).Deno?.core?.ops?.op_save_file === "function";
  if (!hasOps) return createMemoryStorage();

  const ops = (globalThis as any).Deno.core.ops;
  return {
    write: (key, value) => { ops.op_save_file(key, value); },
    read: (key) => ops.op_load_file(key) ?? null,
    remove: (key) => { ops.op_delete_file(key); },
    list: () => ops.op_list_save_files() ?? [],
  };
}
