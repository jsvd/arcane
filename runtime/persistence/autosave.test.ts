import { describe, it, assert } from "../testing/harness.ts";
import { enableAutoSave, disableAutoSave, updateAutoSave, triggerAutoSave, isAutoSaveEnabled, _resetAutoSave } from "./autosave.ts";
import { _resetSaveSystem, loadGame } from "./save.ts";

describe("autosave", () => {
  it("isAutoSaveEnabled returns false initially", () => {
    _resetAutoSave();
    _resetSaveSystem();
    assert.equal(isAutoSaveEnabled(), false);
  });

  it("enableAutoSave sets enabled to true", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({ score: 0 }) });
    assert.equal(isAutoSaveEnabled(), true);
  });

  it("disableAutoSave sets enabled to false", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({ score: 0 }) });
    disableAutoSave();
    assert.equal(isAutoSaveEnabled(), false);
  });

  it("updateAutoSave returns false when not enabled", () => {
    _resetAutoSave();
    _resetSaveSystem();
    assert.equal(updateAutoSave(100), false);
  });

  it("updateAutoSave triggers at interval", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({ score: 42 }), interval: 60 });
    assert.equal(updateAutoSave(59), false);
    assert.equal(updateAutoSave(1), true);
  });

  it("updateAutoSave resets elapsed after trigger", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({ score: 1 }), interval: 10 });
    assert.equal(updateAutoSave(10), true);
    assert.equal(updateAutoSave(9), false);
    assert.equal(updateAutoSave(1), true);
  });

  it("updateAutoSave with zero dt returns false", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({}), interval: 10 });
    assert.equal(updateAutoSave(0), false);
  });

  it("triggerAutoSave saves immediately", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({ name: "test" }) });
    triggerAutoSave();
    const result = loadGame();
    assert.equal(result.ok, true);
  });

  it("triggerAutoSave does nothing when not enabled", () => {
    _resetAutoSave();
    _resetSaveSystem();
    triggerAutoSave();
    const result = loadGame();
    assert.equal(result.ok, false);
  });

  it("disableAutoSave prevents further saves", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({ x: 1 }), interval: 5 });
    disableAutoSave();
    assert.equal(updateAutoSave(100), false);
  });

  it("re-enable resets timer", () => {
    _resetAutoSave();
    _resetSaveSystem();
    enableAutoSave({ getState: () => ({ x: 1 }), interval: 10 });
    updateAutoSave(5);
    disableAutoSave();
    enableAutoSave({ getState: () => ({ x: 2 }), interval: 10 });
    assert.equal(updateAutoSave(5), false);
    assert.equal(updateAutoSave(5), true);
  });
});
