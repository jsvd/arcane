import { describe, it, assert } from "../testing/harness.ts";
import { createMemoryStorage, createFileStorage } from "./storage.ts";

describe("createMemoryStorage", () => {
  it("write then read returns same value", () => {
    const s = createMemoryStorage();
    s.write("key1", "value1");
    assert.equal(s.read("key1"), "value1");
  });

  it("read missing key returns null", () => {
    const s = createMemoryStorage();
    assert.equal(s.read("nonexistent"), null);
  });

  it("overwrite updates value", () => {
    const s = createMemoryStorage();
    s.write("k", "v1");
    s.write("k", "v2");
    assert.equal(s.read("k"), "v2");
  });

  it("remove makes read return null", () => {
    const s = createMemoryStorage();
    s.write("k", "v");
    s.remove("k");
    assert.equal(s.read("k"), null);
  });

  it("list returns all keys", () => {
    const s = createMemoryStorage();
    s.write("a", "1");
    s.write("b", "2");
    s.write("c", "3");
    const keys = s.list();
    assert.equal(keys.length, 3);
    assert.ok(keys.includes("a"));
    assert.ok(keys.includes("b"));
    assert.ok(keys.includes("c"));
  });

  it("list is empty initially", () => {
    const s = createMemoryStorage();
    assert.deepEqual(s.list(), []);
  });

  it("remove non-existent key does not throw", () => {
    const s = createMemoryStorage();
    s.remove("nope");
  });

  it("independent instances do not share state", () => {
    const s1 = createMemoryStorage();
    const s2 = createMemoryStorage();
    s1.write("key", "from-s1");
    assert.equal(s2.read("key"), null);
  });
});

describe("createFileStorage", () => {
  it("falls back to memory in headless", () => {
    const s = createFileStorage();
    s.write("test", "hello");
    assert.equal(s.read("test"), "hello");
  });

  it("all operations work in headless fallback", () => {
    const s = createFileStorage();
    s.write("a", "1");
    s.write("b", "2");
    assert.equal(s.read("a"), "1");
    s.remove("a");
    assert.equal(s.read("a"), null);
    const keys = s.list();
    assert.equal(keys.length, 1);
    assert.ok(keys.includes("b"));
  });
});
