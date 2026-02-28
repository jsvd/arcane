import { describe, it, assert } from "../testing/harness.ts";
import { queryAABB, raycast, getContacts, getManifolds } from "./query.ts";

describe("physics queries headless", () => {
  it("queryAABB returns empty array", () => {
    const result = queryAABB(0, 0, 100, 100);
    assert.deepEqual(result, []);
  });

  it("queryAABB with zero-size box returns empty", () => {
    assert.deepEqual(queryAABB(50, 50, 50, 50), []);
  });

  it("queryAABB with large box returns empty", () => {
    assert.deepEqual(queryAABB(-10000, -10000, 10000, 10000), []);
  });

  it("raycast returns null", () => {
    assert.equal(raycast(0, 0, 1, 0), null);
  });

  it("raycast with zero direction returns null", () => {
    assert.equal(raycast(0, 0, 0, 0), null);
  });

  it("raycast with custom maxDistance returns null", () => {
    assert.equal(raycast(0, 0, 1, 0, 5000), null);
  });

  it("getContacts returns empty array", () => {
    assert.deepEqual(getContacts(), []);
  });

  it("getManifolds returns empty array", () => {
    assert.deepEqual(getManifolds(), []);
  });
});
