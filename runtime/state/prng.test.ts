import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  seed,
  parseDice,
  rollDice,
  randomInt,
  randomFloat,
  randomPick,
  shuffle,
} from "./prng.ts";

describe("seed", () => {
  it("creates a PRNGState from a number", () => {
    const rng = seed(42);
    assert.equal(rng.__brand, "PRNGState");
    assert.equal(rng.seed, 42);
    assert.equal(typeof rng.s0, "number");
    assert.equal(typeof rng.s1, "number");
    assert.equal(typeof rng.s2, "number");
    assert.equal(typeof rng.s3, "number");
  });

  it("produces different internal state for different seeds", () => {
    const a = seed(1);
    const b = seed(2);
    assert.notDeepEqual(
      [a.s0, a.s1, a.s2, a.s3],
      [b.s0, b.s1, b.s2, b.s3],
    );
  });
});

describe("determinism", () => {
  it("same seed produces same sequence of floats", () => {
    let rng1 = seed(42);
    let rng2 = seed(42);
    const seq1: number[] = [];
    const seq2: number[] = [];

    for (let i = 0; i < 20; i++) {
      const [v1, next1] = randomFloat(rng1);
      const [v2, next2] = randomFloat(rng2);
      seq1.push(v1);
      seq2.push(v2);
      rng1 = next1;
      rng2 = next2;
    }

    assert.deepEqual(seq1, seq2);
  });

  it("same seed produces same dice rolls", () => {
    let rng1 = seed(123);
    let rng2 = seed(123);

    for (let i = 0; i < 10; i++) {
      const [roll1, next1] = rollDice(rng1, "2d6+3");
      const [roll2, next2] = rollDice(rng2, "2d6+3");
      assert.equal(roll1, roll2);
      rng1 = next1;
      rng2 = next2;
    }
  });

  it("different seeds produce different sequences", () => {
    let rng1 = seed(1);
    let rng2 = seed(2);
    const seq1: number[] = [];
    const seq2: number[] = [];

    for (let i = 0; i < 10; i++) {
      const [v1, next1] = randomFloat(rng1);
      const [v2, next2] = randomFloat(rng2);
      seq1.push(v1);
      seq2.push(v2);
      rng1 = next1;
      rng2 = next2;
    }

    assert.notDeepEqual(seq1, seq2);
  });
});

describe("parseDice", () => {
  it("parses basic notation", () => {
    assert.deepEqual(parseDice("2d6"), { count: 2, sides: 6, modifier: 0 });
  });

  it("parses positive modifier", () => {
    assert.deepEqual(parseDice("1d20+5"), { count: 1, sides: 20, modifier: 5 });
  });

  it("parses negative modifier", () => {
    assert.deepEqual(parseDice("3d8-2"), { count: 3, sides: 8, modifier: -2 });
  });

  it("throws on invalid notation", () => {
    assert.throws(() => parseDice("bad"), /Invalid dice notation/);
    assert.throws(() => parseDice("d6"), /Invalid dice notation/);
    assert.throws(() => parseDice("2d"), /Invalid dice notation/);
  });
});

describe("rollDice", () => {
  it("returns a result within expected range", () => {
    let rng = seed(42);
    for (let i = 0; i < 100; i++) {
      const [result, next] = rollDice(rng, "2d6+3");
      assert.ok(result >= 5, `2d6+3 minimum is 5, got ${result}`);
      assert.ok(result <= 15, `2d6+3 maximum is 15, got ${result}`);
      rng = next;
    }
  });

  it("accepts DiceSpec directly", () => {
    const spec = parseDice("1d20");
    let rng = seed(99);
    const [result, _] = rollDice(rng, spec);
    assert.ok(result >= 1 && result <= 20);
  });

  it("accepts string notation", () => {
    const rng = seed(99);
    const [result, _] = rollDice(rng, "1d20");
    assert.ok(result >= 1 && result <= 20);
  });
});

describe("randomInt", () => {
  it("returns values within [min, max] inclusive", () => {
    let rng = seed(42);
    for (let i = 0; i < 200; i++) {
      const [value, next] = randomInt(rng, 1, 6);
      assert.ok(value >= 1, `Expected >= 1, got ${value}`);
      assert.ok(value <= 6, `Expected <= 6, got ${value}`);
      rng = next;
    }
  });

  it("covers the full range", () => {
    let rng = seed(42);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const [value, next] = randomInt(rng, 1, 6);
      seen.add(value);
      rng = next;
    }
    assert.deepEqual([...seen].sort(), [1, 2, 3, 4, 5, 6]);
  });
});

describe("randomFloat", () => {
  it("returns values in [0, 1)", () => {
    let rng = seed(42);
    for (let i = 0; i < 200; i++) {
      const [value, next] = randomFloat(rng);
      assert.ok(value >= 0, `Expected >= 0, got ${value}`);
      assert.ok(value < 1, `Expected < 1, got ${value}`);
      rng = next;
    }
  });
});

describe("randomPick", () => {
  it("picks an element from the array", () => {
    const items = ["sword", "shield", "potion"];
    let rng = seed(42);
    for (let i = 0; i < 50; i++) {
      const [item, next] = randomPick(rng, items);
      assert.ok(items.includes(item), `Picked unknown item: ${item}`);
      rng = next;
    }
  });

  it("covers all elements given enough picks", () => {
    const items = ["a", "b", "c"];
    let rng = seed(42);
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const [item, next] = randomPick(rng, items);
      seen.add(item);
      rng = next;
    }
    assert.equal(seen.size, 3);
  });
});

describe("shuffle", () => {
  it("returns an array of the same length", () => {
    const items = [1, 2, 3, 4, 5];
    const [result, _] = shuffle(seed(42), items);
    assert.equal(result.length, items.length);
  });

  it("contains the same elements", () => {
    const items = [1, 2, 3, 4, 5];
    const [result, _] = shuffle(seed(42), items);
    assert.deepEqual([...result].sort(), [...items].sort());
  });

  it("does not mutate the original array", () => {
    const items = [1, 2, 3, 4, 5];
    const copy = [...items];
    shuffle(seed(42), items);
    assert.deepEqual(items, copy);
  });

  it("is deterministic", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const [r1, _] = shuffle(seed(42), items);
    const [r2, __] = shuffle(seed(42), items);
    assert.deepEqual(r1, r2);
  });

  it("actually shuffles (not identity)", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const [result, _] = shuffle(seed(42), items);
    // With 10 elements, the probability of no change is astronomically low
    assert.notDeepEqual(result, items);
  });
});
