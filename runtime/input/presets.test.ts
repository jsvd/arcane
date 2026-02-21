/**
 * Tests for input presets
 */

import { describe, it, assert } from "../testing/harness.ts";
import { WASD_ARROWS } from "./presets.ts";
import { createInputMap, getActionNames, getActionBindings } from "./actions.ts";

describe("Input Presets", () => {
  describe("WASD_ARROWS", () => {
    it("should define left, right, up, down, and action actions", () => {
      const map = createInputMap(WASD_ARROWS);
      const names = getActionNames(map).sort();
      assert.equal(names.length, 5);
      assert.ok(names.includes("left"), "should have left action");
      assert.ok(names.includes("right"), "should have right action");
      assert.ok(names.includes("up"), "should have up action");
      assert.ok(names.includes("down"), "should have down action");
      assert.ok(names.includes("action"), "should have action action");
    });

    it("left should have ArrowLeft, a, and gamepad stick", () => {
      const map = createInputMap(WASD_ARROWS);
      const bindings = getActionBindings(map, "left");
      assert.equal(bindings.length, 3);
      // First binding: ArrowLeft key
      assert.equal(bindings[0].type, "key");
      if (bindings[0].type === "key") {
        assert.equal(bindings[0].key, "ArrowLeft");
      }
      // Second binding: a key
      assert.equal(bindings[1].type, "key");
      if (bindings[1].type === "key") {
        assert.equal(bindings[1].key, "a");
      }
      // Third binding: gamepad axis
      assert.equal(bindings[2].type, "gamepadAxis");
    });

    it("action should have Space, Enter, and GamepadA", () => {
      const map = createInputMap(WASD_ARROWS);
      const bindings = getActionBindings(map, "action");
      assert.equal(bindings.length, 3);
      // Space
      assert.equal(bindings[0].type, "key");
      if (bindings[0].type === "key") {
        assert.equal(bindings[0].key, "Space");
      }
      // Enter
      assert.equal(bindings[1].type, "key");
      if (bindings[1].type === "key") {
        assert.equal(bindings[1].key, "Enter");
      }
      // GamepadA
      assert.equal(bindings[2].type, "gamepadButton");
    });

    it("should be usable as a spread base for extension", () => {
      const map = createInputMap({
        ...WASD_ARROWS,
        shoot: ["x", "GamepadX"],
      });
      const names = getActionNames(map);
      assert.equal(names.length, 6);
      assert.ok(names.includes("shoot"), "should have shoot action");
    });
  });
});
