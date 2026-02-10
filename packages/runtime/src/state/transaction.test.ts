import { describe, it, assert } from "../testing/harness.ts";
import {
  set,
  update,
  push,
  removeWhere,
  removeKey,
  transaction,
  computeDiff,
} from "./transaction.ts";

type TestState = {
  hp: number;
  name: string;
  items: string[];
  party: { id: string; hp: number }[];
  nested: { a: { b: { c: number } } };
};

const initial: TestState = {
  hp: 10,
  name: "hero",
  items: ["sword", "shield", "potion"],
  party: [
    { id: "alice", hp: 20 },
    { id: "bob", hp: 15 },
  ],
  nested: { a: { b: { c: 42 } } },
};

describe("set", () => {
  it("sets a top-level value", () => {
    const m = set<TestState>("hp", 5);
    const result = m.apply(initial);
    assert.equal(result.hp, 5);
    assert.equal(initial.hp, 10); // original unchanged
  });

  it("sets a nested value", () => {
    const m = set<TestState>("nested.a.b.c", 99);
    const result = m.apply(initial);
    assert.equal(result.nested.a.b.c, 99);
  });

  it("sets a value inside an array element", () => {
    const m = set<TestState>("party.0.hp", 0);
    const result = m.apply(initial);
    assert.equal(result.party[0].hp, 0);
    assert.equal(result.party[1].hp, 15); // untouched
  });

  it("has correct metadata", () => {
    const m = set<TestState>("hp", 5);
    assert.equal(m.type, "set");
    assert.equal(m.path, "hp");
    assert.ok(m.description.includes("hp"));
  });
});

describe("update", () => {
  it("updates a value with a function", () => {
    const m = update<TestState>("hp", (hp) => (hp as number) - 3);
    const result = m.apply(initial);
    assert.equal(result.hp, 7);
  });

  it("updates a nested value", () => {
    const m = update<TestState>("nested.a.b.c", (c) => (c as number) * 2);
    const result = m.apply(initial);
    assert.equal(result.nested.a.b.c, 84);
  });
});

describe("push", () => {
  it("pushes an item onto an array", () => {
    const m = push<TestState>("items", "bow");
    const result = m.apply(initial);
    assert.deepEqual(result.items, ["sword", "shield", "potion", "bow"]);
    assert.equal(initial.items.length, 3); // original unchanged
  });

  it("throws when target is not an array", () => {
    const m = push<TestState>("hp", "invalid");
    assert.throws(() => m.apply(initial), /Expected array/);
  });
});

describe("removeWhere", () => {
  it("removes matching items from an array", () => {
    const m = removeWhere<TestState>("items", (item) => item === "shield");
    const result = m.apply(initial);
    assert.deepEqual(result.items, ["sword", "potion"]);
  });

  it("removes nothing when no match", () => {
    const m = removeWhere<TestState>("items", (item) => item === "axe");
    const result = m.apply(initial);
    assert.deepEqual(result.items, initial.items);
  });

  it("can remove by predicate on objects", () => {
    const m = removeWhere<TestState>(
      "party",
      (member: any) => member.hp < 18,
    );
    const result = m.apply(initial);
    assert.equal(result.party.length, 1);
    assert.equal(result.party[0].id, "alice");
  });
});

describe("removeKey", () => {
  it("removes a key from a nested object", () => {
    const m = removeKey<TestState>("nested.a.b");
    const result = m.apply(initial);
    assert.deepEqual(result.nested.a, {});
  });
});

describe("transaction", () => {
  it("applies multiple mutations atomically", () => {
    const result = transaction(initial, [
      set<TestState>("hp", 5),
      push<TestState>("items", "bow"),
      set<TestState>("party.0.hp", 18),
    ]);

    assert.equal(result.valid, true);
    assert.equal(result.state.hp, 5);
    assert.deepEqual(result.state.items, ["sword", "shield", "potion", "bow"]);
    assert.equal(result.state.party[0].hp, 18);
    assert.equal(result.error, undefined);
  });

  it("rolls back all changes on failure", () => {
    const result = transaction(initial, [
      set<TestState>("hp", 0),
      push<TestState>("hp", "invalid"), // hp is a number, not array — will throw
    ]);

    assert.equal(result.valid, false);
    assert.equal(result.state, initial); // original state returned
    assert.notEqual(result.error, undefined);
    assert.equal(result.error!.code, "TRANSACTION_FAILED");
  });

  it("produces a diff", () => {
    const result = transaction(initial, [
      set<TestState>("hp", 5),
      set<TestState>("name", "villain"),
    ]);

    assert.equal(result.valid, true);
    const hpEntry = result.diff.entries.find((e) => e.path === "hp");
    assert.notEqual(hpEntry, undefined);
    assert.equal(hpEntry!.from, 10);
    assert.equal(hpEntry!.to, 5);

    const nameEntry = result.diff.entries.find((e) => e.path === "name");
    assert.notEqual(nameEntry, undefined);
    assert.equal(nameEntry!.from, "hero");
    assert.equal(nameEntry!.to, "villain");
  });

  it("produces empty diff when nothing changes", () => {
    const result = transaction(initial, [set<TestState>("hp", 10)]);
    assert.equal(result.valid, true);
    assert.equal(result.diff.entries.length, 0);
  });

  it("does not mutate the original state", () => {
    const frozen = JSON.parse(JSON.stringify(initial));
    transaction(initial, [
      set<TestState>("hp", 0),
      push<TestState>("items", "new_item"),
    ]);
    assert.deepEqual(initial, frozen);
  });
});

describe("computeDiff", () => {
  it("detects simple value changes", () => {
    const before = { x: 1, y: 2 };
    const after = { x: 1, y: 3 };
    const diff = computeDiff(before, after);
    assert.equal(diff.entries.length, 1);
    assert.equal(diff.entries[0].path, "y");
    assert.equal(diff.entries[0].from, 2);
    assert.equal(diff.entries[0].to, 3);
  });

  it("detects nested changes", () => {
    const before = { a: { b: 1 } };
    const after = { a: { b: 2 } };
    const diff = computeDiff(before, after);
    assert.equal(diff.entries.length, 1);
    assert.equal(diff.entries[0].path, "a.b");
  });

  it("detects added keys", () => {
    const before = { x: 1 } as any;
    const after = { x: 1, y: 2 };
    const diff = computeDiff(before, after);
    const yEntry = diff.entries.find((e) => e.path === "y");
    assert.notEqual(yEntry, undefined);
    assert.equal(yEntry!.from, undefined);
    assert.equal(yEntry!.to, 2);
  });

  it("detects removed keys", () => {
    const before = { x: 1, y: 2 };
    const after = { x: 1 } as any;
    const diff = computeDiff(before, after);
    const yEntry = diff.entries.find((e) => e.path === "y");
    assert.notEqual(yEntry, undefined);
    assert.equal(yEntry!.from, 2);
    assert.equal(yEntry!.to, undefined);
  });

  it("detects array changes", () => {
    const before = { items: ["a", "b"] };
    const after = { items: ["a", "c"] };
    const diff = computeDiff(before, after);
    const entry = diff.entries.find((e) => e.path === "items.1");
    assert.notEqual(entry, undefined);
    assert.equal(entry!.from, "b");
    assert.equal(entry!.to, "c");
  });

  it("returns empty diff for identical objects", () => {
    const obj = { a: 1, b: { c: 2 } };
    const diff = computeDiff(obj, obj);
    assert.equal(diff.entries.length, 0);
  });
});
