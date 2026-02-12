import { describe, it, assert } from "../testing/harness.ts";
import {
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
import {
  enableAutoSave,
  disableAutoSave,
  updateAutoSave,
  triggerAutoSave,
  isAutoSaveEnabled,
  _resetAutoSave,
} from "./autosave.ts";
import { createMemoryStorage, createFileStorage } from "./storage.ts";
import type { StorageBackend, Migration } from "./types.ts";

// ---------------------------------------------------------------------------
// 1. serialize/deserialize round-trip
// ---------------------------------------------------------------------------

describe("serialize/deserialize round-trip", () => {
  it("basic state serializes to valid JSON", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const json = serialize({ hp: 100, name: "Hero" });
    const parsed = JSON.parse(json);
    assert.ok(parsed, "should parse as valid JSON");
  });

  it("deserialized state matches original", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const state = { hp: 100, name: "Hero", items: ["sword", "shield"] };
    const json = serialize(state);
    const result = deserialize<typeof state>(json);
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, state);
  });

  it("SaveFile has __arcane: save marker", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const json = serialize({ x: 1 });
    const parsed = JSON.parse(json);
    assert.equal(parsed.__arcane, "save");
  });

  it("SaveFile has __version field", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const json = serialize({ x: 1 });
    const parsed = JSON.parse(json);
    assert.equal(parsed.__version, 1);
  });

  it("SaveFile has metadata with slot, timestamp, version", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const json = serialize({ x: 1 }, { slot: "slot1" });
    const parsed = JSON.parse(json);
    assert.equal(parsed.metadata.slot, "slot1");
    assert.equal(typeof parsed.metadata.timestamp, "number");
    assert.equal(parsed.metadata.version, 1);
  });

  it("options (label, playtime) are preserved", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const json = serialize({ x: 1 }, { label: "Before boss", playtime: 3600 });
    const result = deserialize(json);
    assert.equal(result.ok, true);
    assert.equal(result.metadata!.label, "Before boss");
    assert.equal(result.metadata!.playtime, 3600);
  });
});

// ---------------------------------------------------------------------------
// 2. Invalid input rejection
// ---------------------------------------------------------------------------

describe("invalid input rejection", () => {
  it("invalid JSON returns ok: false", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const result = deserialize("not json at all{{{");
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });

  it("missing __arcane marker returns ok: false", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const result = deserialize(JSON.stringify({ __version: 1, metadata: {}, state: {} }));
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });

  it("wrong __arcane value returns ok: false", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const result = deserialize(JSON.stringify({ __arcane: "wrong", __version: 1, metadata: {}, state: {} }));
    assert.equal(result.ok, false);
    assert.ok(result.error);
  });

  it("empty string returns ok: false", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const result = deserialize("");
    assert.equal(result.ok, false);
  });

  it("null state serializes and deserializes", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const json = serialize(null);
    const result = deserialize(json);
    assert.equal(result.ok, true);
    assert.equal(result.state, null);
  });

  it("malformed SaveFile returns ok: false", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const result = deserialize(JSON.stringify({ __arcane: "save" }));
    assert.equal(result.ok, false);
  });
});

// ---------------------------------------------------------------------------
// 3. saveGame + loadGame
// ---------------------------------------------------------------------------

describe("saveGame + loadGame", () => {
  it("round-trip works", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const state = { level: 5, gold: 200 };
    saveGame(state);
    const result = loadGame<typeof state>();
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, state);
  });

  it("loadGame non-existent slot returns ok: false", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const result = loadGame("nonexistent");
    assert.equal(result.ok, false);
    assert.equal(result.error, "Save not found");
  });

  it("multiple slots work independently", () => {
    _resetSaveSystem();
    _resetAutoSave();
    saveGame({ a: 1 }, { slot: "slot1" });
    saveGame({ b: 2 }, { slot: "slot2" });
    const r1 = loadGame<{ a: number }>("slot1");
    const r2 = loadGame<{ b: number }>("slot2");
    assert.equal(r1.ok, true);
    assert.deepEqual(r1.state, { a: 1 });
    assert.equal(r2.ok, true);
    assert.deepEqual(r2.state, { b: 2 });
  });

  it("default slot is 'default'", () => {
    _resetSaveSystem();
    _resetAutoSave();
    saveGame({ x: 42 });
    const result = loadGame("default");
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, { x: 42 });
  });

  it("custom slot name works", () => {
    _resetSaveSystem();
    _resetAutoSave();
    saveGame({ x: 99 }, { slot: "my-slot" });
    const result = loadGame("my-slot");
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, { x: 99 });
  });

  it("overwriting a save works", () => {
    _resetSaveSystem();
    _resetAutoSave();
    saveGame({ v: 1 }, { slot: "s" });
    saveGame({ v: 2 }, { slot: "s" });
    const result = loadGame<{ v: number }>("s");
    assert.equal(result.ok, true);
    assert.equal(result.state!.v, 2);
  });

  it("deleteSave removes the save", () => {
    _resetSaveSystem();
    _resetAutoSave();
    saveGame({ x: 1 });
    assert.equal(hasSave(), true);
    deleteSave();
    assert.equal(hasSave(), false);
    const result = loadGame();
    assert.equal(result.ok, false);
  });

  it("hasSave returns correct boolean", () => {
    _resetSaveSystem();
    _resetAutoSave();
    assert.equal(hasSave(), false);
    saveGame({ x: 1 });
    assert.equal(hasSave(), true);
    assert.equal(hasSave("other"), false);
  });
});

// ---------------------------------------------------------------------------
// 4. listSaves
// ---------------------------------------------------------------------------

describe("listSaves", () => {
  it("empty list when no saves", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const saves = listSaves();
    assert.deepEqual(saves, []);
  });

  it("lists all saves", () => {
    _resetSaveSystem();
    _resetAutoSave();
    saveGame({ a: 1 }, { slot: "s1" });
    saveGame({ b: 2 }, { slot: "s2" });
    saveGame({ c: 3 }, { slot: "s3" });
    const saves = listSaves();
    assert.equal(saves.length, 3);
  });

  it("sorted by timestamp descending", () => {
    _resetSaveSystem();
    _resetAutoSave();
    // Save in order — timestamps should be monotonically increasing
    saveGame({ a: 1 }, { slot: "first" });
    saveGame({ b: 2 }, { slot: "second" });
    saveGame({ c: 3 }, { slot: "third" });
    const saves = listSaves();
    // Most recent first
    for (let i = 0; i < saves.length - 1; i++) {
      assert.ok(saves[i].timestamp >= saves[i + 1].timestamp);
    }
  });

  it("returns metadata for each save", () => {
    _resetSaveSystem();
    _resetAutoSave();
    saveGame({ x: 1 }, { slot: "labeled", label: "My Save", playtime: 120 });
    const saves = listSaves();
    assert.equal(saves.length, 1);
    assert.equal(saves[0].slot, "labeled");
    assert.equal(saves[0].label, "My Save");
    assert.equal(saves[0].playtime, 120);
    assert.equal(typeof saves[0].timestamp, "number");
    assert.equal(saves[0].version, 1);
  });
});

// ---------------------------------------------------------------------------
// 5. Schema migration
// ---------------------------------------------------------------------------

describe("schema migration", () => {
  it("single migration transforms data", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 2 });
    registerMigration({ version: 2, description: "add score", up: (d: any) => ({ ...d, score: 0 }) });
    const result = applyMigrations({ hp: 10 }, 1);
    assert.deepEqual(result, { hp: 10, score: 0 });
  });

  it("multiple migrations applied in order", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 3 });
    registerMigration({ version: 2, description: "add score", up: (d: any) => ({ ...d, score: 0 }) });
    registerMigration({ version: 3, description: "add level", up: (d: any) => ({ ...d, level: 1 }) });
    const result = applyMigrations({ hp: 10 }, 1);
    assert.deepEqual(result, { hp: 10, score: 0, level: 1 });
  });

  it("skips migrations below fromVersion", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 3 });
    registerMigration({ version: 2, description: "add score", up: (d: any) => ({ ...d, score: 0 }) });
    registerMigration({ version: 3, description: "add level", up: (d: any) => ({ ...d, level: 1 }) });
    const result = applyMigrations({ hp: 10, score: 50 }, 2);
    assert.deepEqual(result, { hp: 10, score: 50, level: 1 });
  });

  it("no migrations needed (current version)", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 1 });
    const result = applyMigrations({ hp: 10 }, 1);
    assert.deepEqual(result, { hp: 10 });
  });

  it("registerMigration sorts by version", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 3 });
    // Register out of order
    registerMigration({ version: 3, description: "v3", up: (d: any) => ({ ...d, c: 3 }) });
    registerMigration({ version: 2, description: "v2", up: (d: any) => ({ ...d, b: 2 }) });
    const result = applyMigrations({ a: 1 }, 1);
    // v2 should run before v3
    assert.deepEqual(result, { a: 1, b: 2, c: 3 });
  });

  it("duplicate version throws", () => {
    _resetSaveSystem();
    _resetAutoSave();
    registerMigration({ version: 2, description: "first", up: (d) => d });
    assert.throws(() => {
      registerMigration({ version: 2, description: "duplicate", up: (d) => d });
    }, /already registered/);
  });

  it("migration chain works end-to-end (save v1, migrate to v3, load)", () => {
    _resetSaveSystem();
    _resetAutoSave();
    // Save at v1
    configureSaveSystem({ version: 1 });
    saveGame({ hp: 100 }, { slot: "chain" });

    // Upgrade to v3
    configureSaveSystem({ version: 3 });
    registerMigration({ version: 2, description: "add mp", up: (d: any) => ({ ...d, mp: 50 }) });
    registerMigration({ version: 3, description: "add xp", up: (d: any) => ({ ...d, xp: 0 }) });

    const result = loadGame<{ hp: number; mp: number; xp: number }>("chain");
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, { hp: 100, mp: 50, xp: 0 });
  });

  it("applyMigrations with no registered migrations returns data unchanged", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const data = { foo: "bar" };
    const result = applyMigrations(data, 0);
    assert.deepEqual(result, data);
  });

  it("deserialization auto-migrates old saves", () => {
    _resetSaveSystem();
    _resetAutoSave();
    // Create a v1 save envelope manually
    const v1Save = JSON.stringify({
      __arcane: "save",
      __version: 1,
      metadata: { slot: "test", timestamp: 1000, version: 1 },
      state: { hp: 50 },
    });

    configureSaveSystem({ version: 2 });
    registerMigration({ version: 2, description: "add armor", up: (d: any) => ({ ...d, armor: 10 }) });

    const result = deserialize<{ hp: number; armor: number }>(v1Save);
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, { hp: 50, armor: 10 });
  });

  it("migration receives correct data at each step", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 3 });
    const steps: unknown[] = [];
    registerMigration({
      version: 2,
      description: "v2",
      up: (d) => {
        steps.push(JSON.parse(JSON.stringify(d)));
        return { ...(d as any), v2: true };
      },
    });
    registerMigration({
      version: 3,
      description: "v3",
      up: (d) => {
        steps.push(JSON.parse(JSON.stringify(d)));
        return { ...(d as any), v3: true };
      },
    });
    applyMigrations({ base: true }, 1);
    assert.deepEqual(steps[0], { base: true });
    assert.deepEqual(steps[1], { base: true, v2: true });
  });
});

// ---------------------------------------------------------------------------
// 6. Auto-save
// ---------------------------------------------------------------------------

describe("auto-save", () => {
  it("enableAutoSave sets enabled", () => {
    _resetSaveSystem();
    _resetAutoSave();
    assert.equal(isAutoSaveEnabled(), false);
    enableAutoSave({ getState: () => ({}) });
    assert.equal(isAutoSaveEnabled(), true);
  });

  it("disableAutoSave clears", () => {
    _resetSaveSystem();
    _resetAutoSave();
    enableAutoSave({ getState: () => ({}) });
    disableAutoSave();
    assert.equal(isAutoSaveEnabled(), false);
  });

  it("updateAutoSave returns false before interval", () => {
    _resetSaveSystem();
    _resetAutoSave();
    enableAutoSave({ getState: () => ({}), interval: 10 });
    const saved = updateAutoSave(5);
    assert.equal(saved, false);
  });

  it("updateAutoSave returns true at interval", () => {
    _resetSaveSystem();
    _resetAutoSave();
    enableAutoSave({ getState: () => ({ x: 1 }), interval: 10 });
    updateAutoSave(5);
    const saved = updateAutoSave(5);
    assert.equal(saved, true);
  });

  it("timer resets after save", () => {
    _resetSaveSystem();
    _resetAutoSave();
    enableAutoSave({ getState: () => ({ x: 1 }), interval: 10 });
    updateAutoSave(10); // triggers save, resets
    const saved = updateAutoSave(5); // only 5 since reset
    assert.equal(saved, false);
  });

  it("triggerAutoSave saves immediately", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const state = { triggered: true };
    enableAutoSave({ getState: () => state });
    triggerAutoSave();
    const result = loadGame<typeof state>();
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, state);
  });

  it("triggerAutoSave when disabled does nothing", () => {
    _resetSaveSystem();
    _resetAutoSave();
    triggerAutoSave();
    const result = loadGame();
    assert.equal(result.ok, false);
  });

  it("isAutoSaveEnabled reflects state", () => {
    _resetSaveSystem();
    _resetAutoSave();
    assert.equal(isAutoSaveEnabled(), false);
    enableAutoSave({ getState: () => ({}) });
    assert.equal(isAutoSaveEnabled(), true);
    disableAutoSave();
    assert.equal(isAutoSaveEnabled(), false);
  });

  it("custom interval works", () => {
    _resetSaveSystem();
    _resetAutoSave();
    enableAutoSave({ getState: () => ({ x: 1 }), interval: 5 });
    assert.equal(updateAutoSave(4), false);
    assert.equal(updateAutoSave(1), true);
  });

  it("auto-save uses configured options", () => {
    _resetSaveSystem();
    _resetAutoSave();
    enableAutoSave({
      getState: () => ({ data: 42 }),
      interval: 1,
      options: { slot: "auto", label: "Autosave" },
    });
    updateAutoSave(1);
    const result = loadGame("auto");
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, { data: 42 });
    assert.equal(result.metadata!.label, "Autosave");
  });
});

// ---------------------------------------------------------------------------
// 7. configureSaveSystem
// ---------------------------------------------------------------------------

describe("configureSaveSystem", () => {
  it("sets storage backend", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const mem = createMemoryStorage();
    configureSaveSystem({ storage: mem });
    saveGame({ x: 1 });
    // Verify it wrote to the custom storage
    assert.ok(mem.read("arcane_save_default") !== null);
  });

  it("sets version", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 5 });
    const json = serialize({ x: 1 });
    const parsed = JSON.parse(json);
    assert.equal(parsed.__version, 5);
    assert.equal(parsed.metadata.version, 5);
  });

  it("sets prefix", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const mem = createMemoryStorage();
    configureSaveSystem({ storage: mem, prefix: "myGame_" });
    saveGame({ x: 1 });
    assert.ok(mem.read("myGame_default") !== null);
    assert.equal(mem.read("arcane_save_default"), null);
  });

  it("partial config only updates provided fields", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 3 });
    configureSaveSystem({ prefix: "test_" });
    // version should still be 3
    const json = serialize({ x: 1 });
    const parsed = JSON.parse(json);
    assert.equal(parsed.__version, 3);
  });

  it("_resetSaveSystem restores defaults", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 10, prefix: "custom_" });
    _resetSaveSystem();
    const json = serialize({ x: 1 });
    const parsed = JSON.parse(json);
    assert.equal(parsed.__version, 1);
    // Saves should use default prefix again
    saveGame({ x: 1 });
    const result = loadGame();
    assert.equal(result.ok, true);
  });
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("empty object state", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const json = serialize({});
    const result = deserialize(json);
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, {});
  });

  it("nested objects preserved", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const state = { player: { stats: { hp: 100, mp: 50 }, pos: { x: 10, y: 20 } } };
    const json = serialize(state);
    const result = deserialize<typeof state>(json);
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, state);
  });

  it("arrays preserved", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const state = { items: [1, 2, 3], nested: [[1, 2], [3, 4]] };
    const json = serialize(state);
    const result = deserialize<typeof state>(json);
    assert.equal(result.ok, true);
    assert.deepEqual(result.state, state);
  });

  it("large state (1000 items)", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const items: { id: number; name: string }[] = [];
    for (let i = 0; i < 1000; i++) {
      items.push({ id: i, name: `item_${i}` });
    }
    const state = { items };
    saveGame(state);
    const result = loadGame<typeof state>();
    assert.equal(result.ok, true);
    assert.equal(result.state!.items.length, 1000);
    assert.equal(result.state!.items[999].id, 999);
  });

  it("state with special characters in strings", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const state = { msg: 'Hello "world"\nnewline\ttab\\backslash' };
    const json = serialize(state);
    const result = deserialize<typeof state>(json);
    assert.equal(result.ok, true);
    assert.equal(result.state!.msg, 'Hello "world"\nnewline\ttab\\backslash');
  });

  it("multiple configure calls accumulate", () => {
    _resetSaveSystem();
    _resetAutoSave();
    configureSaveSystem({ version: 7 });
    const mem = createMemoryStorage();
    configureSaveSystem({ storage: mem });
    // Version should still be 7
    const json = serialize({ x: 1 });
    const parsed = JSON.parse(json);
    assert.equal(parsed.__version, 7);
    // Storage should be the custom one
    saveGame({ x: 1 });
    assert.ok(mem.read("arcane_save_default") !== null);
  });
});

// ---------------------------------------------------------------------------
// 9. Storage
// ---------------------------------------------------------------------------

describe("storage", () => {
  it("memory storage write/read", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const mem = createMemoryStorage();
    mem.write("key1", "value1");
    assert.equal(mem.read("key1"), "value1");
  });

  it("memory storage remove", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const mem = createMemoryStorage();
    mem.write("key1", "value1");
    mem.remove("key1");
    assert.equal(mem.read("key1"), null);
  });

  it("memory storage list", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const mem = createMemoryStorage();
    mem.write("a", "1");
    mem.write("b", "2");
    mem.write("c", "3");
    const keys = mem.list();
    assert.equal(keys.length, 3);
    assert.ok(keys.includes("a"));
    assert.ok(keys.includes("b"));
    assert.ok(keys.includes("c"));
  });

  it("memory storage returns null for missing key", () => {
    _resetSaveSystem();
    _resetAutoSave();
    const mem = createMemoryStorage();
    assert.equal(mem.read("nonexistent"), null);
  });

  it("createFileStorage falls back to memory in headless", () => {
    _resetSaveSystem();
    _resetAutoSave();
    // In test environment (Node or V8 without ops), should fall back to memory
    const fs = createFileStorage();
    fs.write("test_key", "test_val");
    assert.equal(fs.read("test_key"), "test_val");
    fs.remove("test_key");
    assert.equal(fs.read("test_key"), null);
  });
});
