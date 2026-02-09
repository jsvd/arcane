import { describe, it, assert } from "../../../runtime/testing/harness.ts";

describe("simple fixture", () => {
  it("passes a basic assertion", () => {
    assert.equal(1 + 1, 2);
  });

  it("deep equality works", () => {
    assert.deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] });
  });

  it("string matching works", () => {
    assert.match("hello world", /hello/);
  });
});
