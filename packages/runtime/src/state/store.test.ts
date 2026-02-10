import { describe, it, assert } from "../testing/harness.ts";
import { createStore } from "./store.ts";
import { set, update, push } from "./transaction.ts";
import { lt } from "./query.ts";

type GameState = {
  turn: number;
  party: { id: string; hp: number; role: string }[];
  score: number;
};

const initial: GameState = {
  turn: 1,
  party: [
    { id: "alice", hp: 20, role: "fighter" },
    { id: "bob", hp: 15, role: "mage" },
  ],
  score: 0,
};

describe("createStore", () => {
  it("returns a store with the initial state", () => {
    const store = createStore(initial);
    assert.deepEqual(store.getState(), initial);
  });
});

describe("dispatch", () => {
  it("applies mutations and updates state", () => {
    const store = createStore(initial);
    const result = store.dispatch([
      set<GameState>("turn", 2),
      set<GameState>("score", 100),
    ]);

    assert.equal(result.valid, true);
    assert.equal(store.getState().turn, 2);
    assert.equal(store.getState().score, 100);
  });

  it("returns the transaction result with diff", () => {
    const store = createStore(initial);
    const result = store.dispatch([set<GameState>("turn", 2)]);

    assert.equal(result.valid, true);
    const turnEntry = result.diff.entries.find((e) => e.path === "turn");
    assert.notEqual(turnEntry, undefined);
    assert.equal(turnEntry!.from, 1);
    assert.equal(turnEntry!.to, 2);
  });

  it("does not update state on invalid transaction", () => {
    const store = createStore(initial);
    const result = store.dispatch([
      set<GameState>("turn", 2),
      push<GameState>("turn", "invalid"), // turn is number, not array
    ]);

    assert.equal(result.valid, false);
    assert.equal(store.getState().turn, 1); // unchanged
  });

  it("records transaction in history", () => {
    const store = createStore(initial);
    assert.equal(store.getHistory().length, 0);

    store.dispatch([set<GameState>("turn", 2)]);
    assert.equal(store.getHistory().length, 1);

    store.dispatch([set<GameState>("turn", 3)]);
    assert.equal(store.getHistory().length, 2);
  });

  it("does not record failed transactions", () => {
    const store = createStore(initial);
    store.dispatch([push<GameState>("turn", "invalid")]);
    assert.equal(store.getHistory().length, 0);
  });
});

describe("observe via store", () => {
  it("notifies observers after dispatch", () => {
    const store = createStore(initial);
    const observed: { newVal: unknown; oldVal: unknown }[] = [];

    store.observe("turn", (newVal, oldVal) => {
      observed.push({ newVal, oldVal });
    });

    store.dispatch([set<GameState>("turn", 2)]);

    assert.equal(observed.length, 1);
    assert.equal(observed[0].newVal, 2);
    assert.equal(observed[0].oldVal, 1);
  });

  it("does not notify on failed dispatch", () => {
    const store = createStore(initial);
    let notified = false;

    store.observe("turn", () => {
      notified = true;
    });

    store.dispatch([
      set<GameState>("turn", 2),
      push<GameState>("turn", "invalid"),
    ]);

    assert.equal(notified, false);
  });

  it("supports unsubscribe", () => {
    const store = createStore(initial);
    let count = 0;

    const unsub = store.observe("turn", () => count++);
    store.dispatch([set<GameState>("turn", 2)]);
    assert.equal(count, 1);

    unsub();
    store.dispatch([set<GameState>("turn", 3)]);
    assert.equal(count, 1);
  });
});

describe("query/get/has via store", () => {
  it("queries current state", () => {
    const store = createStore(initial);
    const fighters = store.query("party", { role: "fighter" });
    assert.equal(fighters.length, 1);
  });

  it("gets a value from current state", () => {
    const store = createStore(initial);
    assert.equal(store.get("turn"), 1);
    assert.equal(store.get("party.0.id"), "alice");
  });

  it("checks existence in current state", () => {
    const store = createStore(initial);
    assert.equal(store.has("turn"), true);
    assert.equal(store.has("nonexistent"), false);
  });

  it("queries reflect dispatched changes", () => {
    const store = createStore(initial);
    store.dispatch([set<GameState>("party.0.hp", 5)]);

    const wounded = store.query("party", { hp: lt(10) });
    assert.equal(wounded.length, 1);
  });
});

describe("replaceState", () => {
  it("replaces the entire state", () => {
    const store = createStore(initial);
    const newState: GameState = {
      turn: 10,
      party: [],
      score: 999,
    };

    store.replaceState(newState);
    assert.deepEqual(store.getState(), newState);
  });

  it("enables undo/redo (time travel)", () => {
    const store = createStore(initial);
    const snapshot = store.getState();

    store.dispatch([set<GameState>("turn", 2)]);
    store.dispatch([set<GameState>("turn", 3)]);
    assert.equal(store.getState().turn, 3);

    // Undo to the original state
    store.replaceState(snapshot as GameState);
    assert.equal(store.getState().turn, 1);
  });
});

describe("integration: full dispatch → observe → query cycle", () => {
  it("works end-to-end", () => {
    const store = createStore(initial);
    const hpChanges: { who: string; from: number; to: number }[] = [];

    store.observe("party.*.hp", (newVal, oldVal, ctx) => {
      const index = ctx.path.split(".")[1];
      const member = store.get<{ id: string }>(`party.${index}`);
      hpChanges.push({
        who: member!.id,
        from: oldVal as number,
        to: newVal as number,
      });
    });

    store.dispatch([
      update<GameState>("party.0.hp", (hp) => (hp as number) - 5),
      update<GameState>("party.1.hp", (hp) => (hp as number) - 3),
      update<GameState>("turn", (t) => (t as number) + 1),
    ]);

    assert.equal(hpChanges.length, 2);
    assert.deepEqual(hpChanges[0], { who: "alice", from: 20, to: 15 });
    assert.deepEqual(hpChanges[1], { who: "bob", from: 15, to: 12 });

    assert.equal(store.getState().turn, 2);
    assert.equal(store.get("party.0.hp"), 15);
    assert.equal(store.get("party.1.hp"), 12);
  });
});
