import { describe, it, assert } from "../testing/harness.ts";
import { entityId, generateId } from "./types.ts";

describe("entityId", () => {
  it("creates an EntityId from a string", () => {
    const id = entityId("goblin_1");
    assert.equal(id, "goblin_1");
    assert.equal(typeof id, "string");
  });

  it("preserves the original string value", () => {
    const id = entityId("player");
    assert.equal(`${id}`, "player");
    assert.equal(JSON.stringify(id), '"player"');
  });
});

describe("generateId", () => {
  it("returns a string", () => {
    const id = generateId();
    assert.equal(typeof id, "string");
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    assert.equal(ids.size, 100);
  });

  it("generates UUID-format strings", () => {
    const id = generateId();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
