import { describe, it, assert } from "../testing/harness.ts";
import { createStore } from "./store.ts";
import { set, update, push, removeKey } from "./transaction.ts";
import { lt } from "./query.ts";
import type { EntityId } from "./types.ts";

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

// --- Component index tests ---

type ECSState = {
  entities: Record<string, Record<string, unknown>>;
  meta: { count: number };
};

describe("component index", () => {
  it("getEntitiesWithComponent returns empty set before enabling index", () => {
    const store = createStore<ECSState>({
      entities: {
        e1: { hp: 100, position: { x: 0, y: 0 } },
      },
      meta: { count: 1 },
    });
    const result = store.getEntitiesWithComponent("hp");
    assert.equal(result.size, 0);
  });

  it("enableComponentIndex builds index from initial state", () => {
    const store = createStore<ECSState>({
      entities: {
        e1: { hp: 100, position: { x: 0, y: 0 } },
        e2: { hp: 50, name: "goblin" },
        e3: { name: "door", locked: true },
      },
      meta: { count: 3 },
    });
    store.enableComponentIndex("entities");

    const withHp = store.getEntitiesWithComponent("hp");
    assert.equal(withHp.size, 2);
    assert.ok(withHp.has("e1" as EntityId));
    assert.ok(withHp.has("e2" as EntityId));

    const withName = store.getEntitiesWithComponent("name");
    assert.equal(withName.size, 2);
    assert.ok(withName.has("e2" as EntityId));
    assert.ok(withName.has("e3" as EntityId));

    const withLocked = store.getEntitiesWithComponent("locked");
    assert.equal(withLocked.size, 1);
    assert.ok(withLocked.has("e3" as EntityId));

    const withPosition = store.getEntitiesWithComponent("position");
    assert.equal(withPosition.size, 1);
    assert.ok(withPosition.has("e1" as EntityId));
  });

  it("index updates after dispatch that changes indexed collection", () => {
    const store = createStore<ECSState>({
      entities: {
        e1: { hp: 100 },
      },
      meta: { count: 1 },
    });
    store.enableComponentIndex("entities");

    assert.equal(store.getEntitiesWithComponent("hp").size, 1);
    assert.equal(store.getEntitiesWithComponent("name").size, 0);

    // Add a new component to e1
    store.dispatch([set<ECSState>("entities.e1.name", "hero")]);
    assert.equal(store.getEntitiesWithComponent("name").size, 1);
    assert.ok(store.getEntitiesWithComponent("name").has("e1" as EntityId));
  });

  it("index updates after adding a new entity", () => {
    const store = createStore<ECSState>({
      entities: {
        e1: { hp: 100 },
      },
      meta: { count: 1 },
    });
    store.enableComponentIndex("entities");

    store.dispatch([set<ECSState>("entities.e2", { hp: 50, armor: 10 })]);
    assert.equal(store.getEntitiesWithComponent("hp").size, 2);
    assert.equal(store.getEntitiesWithComponent("armor").size, 1);
  });

  it("index rebuilds on replaceState", () => {
    const store = createStore<ECSState>({
      entities: {
        e1: { hp: 100 },
      },
      meta: { count: 1 },
    });
    store.enableComponentIndex("entities");
    assert.equal(store.getEntitiesWithComponent("hp").size, 1);

    store.replaceState({
      entities: {
        e5: { speed: 10 },
        e6: { speed: 20, hp: 50 },
      },
      meta: { count: 2 },
    });

    assert.equal(store.getEntitiesWithComponent("hp").size, 1);
    assert.ok(store.getEntitiesWithComponent("hp").has("e6" as EntityId));
    assert.equal(store.getEntitiesWithComponent("speed").size, 2);
  });

  it("returns empty set for unknown component", () => {
    const store = createStore<ECSState>({
      entities: { e1: { hp: 100 } },
      meta: { count: 1 },
    });
    store.enableComponentIndex("entities");
    assert.equal(store.getEntitiesWithComponent("nonexistent").size, 0);
  });

  it("dispatch that doesn't touch indexed path doesn't break index", () => {
    const store = createStore<ECSState>({
      entities: { e1: { hp: 100 } },
      meta: { count: 1 },
    });
    store.enableComponentIndex("entities");

    // Change meta, not entities
    store.dispatch([set<ECSState>("meta.count", 5)]);
    assert.equal(store.getEntitiesWithComponent("hp").size, 1);
  });
});
