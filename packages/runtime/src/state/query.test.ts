import { describe, it, assert } from "../testing/harness.ts";
import {
  query,
  get,
  has,
  lt,
  gt,
  lte,
  gte,
  eq,
  neq,
  oneOf,
  within,
  allOf,
  anyOf,
  not,
} from "./query.ts";

const state = {
  turn: 3,
  party: [
    { id: "alice", hp: 20, maxHp: 20, position: { x: 1, y: 2 }, role: "fighter" },
    { id: "bob", hp: 8, maxHp: 15, position: { x: 3, y: 4 }, role: "mage" },
    { id: "carol", hp: 0, maxHp: 12, position: { x: 5, y: 6 }, role: "rogue" },
  ],
  dungeon: {
    level: 2,
    rooms: [
      { id: "r1", type: "corridor" },
      { id: "r2", type: "treasure" },
      { id: "r3", type: "corridor" },
    ],
  },
};

describe("get", () => {
  it("gets a top-level value", () => {
    assert.equal(get(state, "turn"), 3);
  });

  it("gets a nested value", () => {
    assert.equal(get(state, "dungeon.level"), 2);
  });

  it("gets an array element by index", () => {
    const alice = get<typeof state, typeof state.party[0]>(state, "party.0");
    assert.equal(alice!.id, "alice");
  });

  it("gets a deeply nested value through array index", () => {
    assert.equal(get(state, "party.1.hp"), 8);
  });

  it("returns undefined for missing paths", () => {
    assert.equal(get(state, "nonexistent"), undefined);
    assert.equal(get(state, "party.0.nonexistent"), undefined);
    assert.equal(get(state, "a.b.c.d"), undefined);
  });

  it("supports wildcard paths to get all values", () => {
    const hps = get(state, "party.*.hp");
    assert.deepEqual(hps, [20, 8, 0]);
  });
});

describe("has", () => {
  it("returns true for existing paths", () => {
    assert.equal(has(state, "turn"), true);
    assert.equal(has(state, "party.0.hp"), true);
  });

  it("returns false for missing paths", () => {
    assert.equal(has(state, "nonexistent"), false);
  });

  it("checks a predicate when provided", () => {
    assert.equal(has(state, "turn", (v) => (v as number) > 2), true);
    assert.equal(has(state, "turn", (v) => (v as number) > 5), false);
  });
});

describe("query", () => {
  it("returns an array at a path", () => {
    const result = query(state, "party");
    assert.equal(result.length, 3);
  });

  it("filters with a predicate function", () => {
    const alive = query<typeof state, typeof state.party[0]>(
      state,
      "party",
      (member) => member.hp > 0,
    );
    assert.equal(alive.length, 2);
    assert.equal(alive[0].id, "alice");
    assert.equal(alive[1].id, "bob");
  });

  it("filters with an object filter (property matching)", () => {
    const fighters = query(state, "party", { role: "fighter" });
    assert.equal(fighters.length, 1);
  });

  it("filters with predicate values in object filter", () => {
    const wounded = query(state, "party", { hp: lt(15) });
    assert.equal(wounded.length, 2); // bob (8) and carol (0)
  });

  it("wraps a non-array value as a single-element array", () => {
    const result = query(state, "dungeon.level");
    assert.deepEqual(result, [2]);
  });

  it("returns empty for missing paths", () => {
    const result = query(state, "nonexistent");
    assert.deepEqual(result, []);
  });

  it("queries nested arrays", () => {
    const corridors = query(state, "dungeon.rooms", { type: "corridor" });
    assert.equal(corridors.length, 2);
  });
});

describe("filter combinators", () => {
  it("lt", () => {
    const f = lt(10);
    assert.equal(f(5), true);
    assert.equal(f(10), false);
    assert.equal(f(15), false);
  });

  it("gt", () => {
    const f = gt(10);
    assert.equal(f(15), true);
    assert.equal(f(10), false);
    assert.equal(f(5), false);
  });

  it("lte", () => {
    const f = lte(10);
    assert.equal(f(10), true);
    assert.equal(f(11), false);
  });

  it("gte", () => {
    const f = gte(10);
    assert.equal(f(10), true);
    assert.equal(f(9), false);
  });

  it("eq", () => {
    const f = eq("fighter");
    assert.equal(f("fighter"), true);
    assert.equal(f("mage"), false);
  });

  it("neq", () => {
    const f = neq(0);
    assert.equal(f(1), true);
    assert.equal(f(0), false);
  });

  it("oneOf", () => {
    const f = oneOf("fighter", "mage");
    assert.equal(f("fighter"), true);
    assert.equal(f("mage"), true);
    assert.equal(f("rogue"), false);
  });

  it("within", () => {
    const f = within({ x: 0, y: 0 }, 5);
    assert.equal(f({ x: 3, y: 4 }), true);  // distance = 5
    assert.equal(f({ x: 4, y: 4 }), false); // distance > 5
    assert.equal(f({ x: 0, y: 0 }), true);  // distance = 0
  });

  it("allOf", () => {
    const f = allOf(gt(0), lt(20));
    assert.equal(f(10), true);
    assert.equal(f(0), false);
    assert.equal(f(20), false);
  });

  it("anyOf", () => {
    const f = anyOf(eq(0), eq(20));
    assert.equal(f(0), true);
    assert.equal(f(20), true);
    assert.equal(f(10), false);
  });

  it("not", () => {
    const f = not(eq(0));
    assert.equal(f(0), false);
    assert.equal(f(1), true);
  });

  it("composing combinators", () => {
    // Find party members who are alive and wounded (hp > 0 but hp < maxHp)
    const aliveAndWounded = query<typeof state, typeof state.party[0]>(
      state,
      "party",
      (member) => allOf(gt(0), lt(member.maxHp))(member.hp),
    );
    assert.equal(aliveAndWounded.length, 1);
    assert.equal(aliveAndWounded[0].id, "bob");
  });
});
