import { describe, it, assert } from "../testing/harness.ts";
import { createObserverRegistry } from "./observe.ts";
import { computeDiff } from "./transaction.ts";
import type { Diff } from "./transaction.ts";

type State = {
  party: { id: string; hp: number }[];
  turn: number;
};

const before: State = {
  party: [
    { id: "alice", hp: 20 },
    { id: "bob", hp: 15 },
  ],
  turn: 1,
};

describe("createObserverRegistry", () => {
  it("creates a registry with observe, notify, and clear", () => {
    const reg = createObserverRegistry<State>();
    assert.equal(typeof reg.observe, "function");
    assert.equal(typeof reg.notify, "function");
    assert.equal(typeof reg.clear, "function");
  });
});

describe("observe + notify", () => {
  it("fires callback when path matches a diff entry", () => {
    const reg = createObserverRegistry<State>();
    const calls: { newVal: unknown; oldVal: unknown; path: string }[] = [];

    reg.observe("turn", (newVal, oldVal, ctx) => {
      calls.push({ newVal, oldVal, path: ctx.path });
    });

    const after = { ...before, turn: 2 };
    const diff = computeDiff(before, after);
    reg.notify(before, after, diff);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].newVal, 2);
    assert.equal(calls[0].oldVal, 1);
    assert.equal(calls[0].path, "turn");
  });

  it("does not fire when path does not match", () => {
    const reg = createObserverRegistry<State>();
    let fired = false;

    reg.observe("turn", () => {
      fired = true;
    });

    // Change party, not turn
    const after = {
      ...before,
      party: [{ id: "alice", hp: 18 }, before.party[1]],
    };
    const diff = computeDiff(before, after);
    reg.notify(before, after, diff);

    assert.equal(fired, false);
  });

  it("supports wildcard patterns", () => {
    const reg = createObserverRegistry<State>();
    const changedPaths: string[] = [];

    reg.observe("party.*.hp", (_newVal, _oldVal, ctx) => {
      changedPaths.push(ctx.path);
    });

    const after: State = {
      ...before,
      party: [
        { id: "alice", hp: 18 },
        { id: "bob", hp: 10 },
      ],
    };
    const diff = computeDiff(before, after);
    reg.notify(before, after, diff);

    assert.deepEqual(changedPaths.sort(), ["party.0.hp", "party.1.hp"]);
  });

  it("wildcard matches only at the right depth", () => {
    const reg = createObserverRegistry<State>();
    let fired = false;

    // This pattern expects 3 segments: party.*.hp
    reg.observe("party.*.hp", () => {
      fired = true;
    });

    // Change at "turn" (1 segment) — should not match
    const after = { ...before, turn: 5 };
    const diff = computeDiff(before, after);
    reg.notify(before, after, diff);

    assert.equal(fired, false);
  });

  it("supports multiple observers on the same pattern", () => {
    const reg = createObserverRegistry<State>();
    let count = 0;

    reg.observe("turn", () => count++);
    reg.observe("turn", () => count++);

    const after = { ...before, turn: 2 };
    const diff = computeDiff(before, after);
    reg.notify(before, after, diff);

    assert.equal(count, 2);
  });

  it("provides the full diff in context", () => {
    const reg = createObserverRegistry<State>();
    let receivedDiff: Diff | undefined;

    reg.observe("turn", (_n, _o, ctx) => {
      receivedDiff = ctx.diff;
    });

    const after = { ...before, turn: 2 };
    const diff = computeDiff(before, after);
    reg.notify(before, after, diff);

    assert.notEqual(receivedDiff, undefined);
    assert.equal(receivedDiff!.entries.length, 1);
  });
});

describe("unsubscribe", () => {
  it("stops receiving notifications after unsubscribe", () => {
    const reg = createObserverRegistry<State>();
    let count = 0;

    const unsub = reg.observe("turn", () => count++);

    const after1 = { ...before, turn: 2 };
    reg.notify(before, after1, computeDiff(before, after1));
    assert.equal(count, 1);

    unsub();

    const after2 = { ...after1, turn: 3 };
    reg.notify(after1, after2, computeDiff(after1, after2));
    assert.equal(count, 1); // no change
  });
});

describe("clear", () => {
  it("removes all observers", () => {
    const reg = createObserverRegistry<State>();
    let count = 0;

    reg.observe("turn", () => count++);
    reg.observe("party.*.hp", () => count++);

    reg.clear();

    const after = {
      ...before,
      turn: 5,
      party: [{ id: "alice", hp: 0 }, before.party[1]],
    };
    reg.notify(before, after, computeDiff(before, after));

    assert.equal(count, 0);
  });
});
