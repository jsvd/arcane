import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createError } from "./error.ts";

describe("createError", () => {
  it("creates an error with code, message, and context", () => {
    const err = createError(
      "COMBAT_TARGET_OUT_OF_RANGE",
      "Cannot attack goblin_3: distance 7 exceeds weapon range 5",
      {
        action: "attack",
        reason: "target out of range",
        state: { distance: 7, range: 5 },
        suggestion: "Move closer or use a ranged weapon",
      },
    );

    assert.equal(err.code, "COMBAT_TARGET_OUT_OF_RANGE");
    assert.equal(err.message, "Cannot attack goblin_3: distance 7 exceeds weapon range 5");
    assert.equal(err.context.action, "attack");
    assert.equal(err.context.reason, "target out of range");
    assert.deepEqual(err.context.state, { distance: 7, range: 5 });
    assert.equal(err.context.suggestion, "Move closer or use a ranged weapon");
  });

  it("works without optional fields", () => {
    const err = createError("INVALID_PATH", "Path not found", {
      action: "query",
      reason: "path does not exist",
    });

    assert.equal(err.context.state, undefined);
    assert.equal(err.context.suggestion, undefined);
  });

  it("is JSON-serializable", () => {
    const err = createError("TEST", "test error", {
      action: "test",
      reason: "testing",
      state: { hp: 0 },
    });

    const roundTripped = JSON.parse(JSON.stringify(err));
    assert.deepEqual(roundTripped, err);
  });
});
