import { describe, it, assert } from "../testing/harness.ts";
import { createRng } from "./rng.ts";
import { seed } from "./prng.ts";

describe("createRng determinism", () => {
  it("same seed produces same sequence of int/float/pick/shuffle/roll", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    for (let i = 0; i < 10; i++) {
      assert.equal(rng1.int(1, 100), rng2.int(1, 100));
    }
    for (let i = 0; i < 10; i++) {
      assert.equal(rng1.float(), rng2.float());
    }
    const items = ["goblin", "orc", "troll"];
    for (let i = 0; i < 10; i++) {
      assert.equal(rng1.pick(items), rng2.pick(items));
    }
    assert.deepEqual(rng1.shuffle([1, 2, 3, 4, 5]), rng2.shuffle([1, 2, 3, 4, 5]));
    assert.equal(rng1.roll("2d6+3"), rng2.roll("2d6+3"));
  });
});

describe("Rng.int", () => {
  it("returns values always in [min, max]", () => {
    const rng = createRng(99);
    for (let i = 0; i < 200; i++) {
      const v = rng.int(1, 6);
      assert.ok(v >= 1, `Expected >= 1, got ${v}`);
      assert.ok(v <= 6, `Expected <= 6, got ${v}`);
    }
  });

  it("returns that value when min === max", () => {
    const rng = createRng(123);
    for (let i = 0; i < 20; i++) {
      assert.equal(rng.int(7, 7), 7);
    }
  });
});

describe("Rng.float", () => {
  it("returns values always in [0, 1)", () => {
    const rng = createRng(77);
    for (let i = 0; i < 200; i++) {
      const v = rng.float();
      assert.ok(v >= 0, `Expected >= 0, got ${v}`);
      assert.ok(v < 1, `Expected < 1, got ${v}`);
    }
  });
});

describe("Rng.pick", () => {
  it("always returns an element from the array", () => {
    const items = ["sword", "shield", "potion", "scroll"];
    const rng = createRng(55);
    for (let i = 0; i < 50; i++) {
      const v = rng.pick(items);
      assert.ok(items.includes(v), `Picked unknown item: ${v}`);
    }
  });
});

describe("Rng.shuffle", () => {
  it("returns all elements with same length", () => {
    const rng = createRng(42);
    const items = [10, 20, 30, 40, 50];
    const result = rng.shuffle(items);
    assert.equal(result.length, items.length);
    assert.deepEqual([...result].sort((a, b) => a - b), [...items].sort((a, b) => a - b));
  });

  it("returns empty array for empty input", () => {
    const rng = createRng(42);
    const result = rng.shuffle([]);
    assert.equal(result.length, 0);
    assert.deepEqual(result, []);
  });
});

describe("Rng.roll", () => {
  it("rolls with string notation", () => {
    const rng = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = rng.roll("2d6+3");
      assert.ok(v >= 5, `2d6+3 minimum is 5, got ${v}`);
      assert.ok(v <= 15, `2d6+3 maximum is 15, got ${v}`);
    }
  });

  it("rolls with DiceSpec object", () => {
    const rng = createRng(42);
    const spec = { count: 1, sides: 20, modifier: 0 };
    for (let i = 0; i < 100; i++) {
      const v = rng.roll(spec);
      assert.ok(v >= 1, `1d20 minimum is 1, got ${v}`);
      assert.ok(v <= 20, `1d20 maximum is 20, got ${v}`);
    }
  });
});

describe("Rng.snapshot and restore", () => {
  it("snapshot captures state that can be restored", () => {
    const rng = createRng(42);
    // Advance a few steps
    rng.int(1, 100);
    rng.int(1, 100);
    const snap = rng.snapshot();

    // Generate a sequence from this point
    const seq1: number[] = [];
    for (let i = 0; i < 10; i++) {
      seq1.push(rng.float());
    }

    // Restore and replay
    rng.restore(snap);
    const seq2: number[] = [];
    for (let i = 0; i < 10; i++) {
      seq2.push(rng.float());
    }

    assert.deepEqual(seq1, seq2);
  });

  it("restore then calling the same sequence reproduces values", () => {
    const rng = createRng(99);
    const snap = rng.snapshot();

    const a = rng.int(0, 1000);
    const b = rng.pick(["x", "y", "z"]);
    const c = rng.roll("1d20");

    rng.restore(snap);

    assert.equal(rng.int(0, 1000), a);
    assert.equal(rng.pick(["x", "y", "z"]), b);
    assert.equal(rng.roll("1d20"), c);
  });
});

describe("Rng.fork", () => {
  it("creates independent child that diverges from parent", () => {
    const parent = createRng(42);
    // Advance parent to a known point
    parent.int(1, 100);

    const child = parent.fork();

    // Parent and child should produce different sequences
    const parentSeq: number[] = [];
    const childSeq: number[] = [];
    for (let i = 0; i < 10; i++) {
      parentSeq.push(parent.float());
      childSeq.push(child.float());
    }

    assert.notDeepEqual(parentSeq, childSeq);
  });

  it("fork child is deterministic given parent state", () => {
    const parent1 = createRng(42);
    const parent2 = createRng(42);

    const child1 = parent1.fork();
    const child2 = parent2.fork();

    const seq1: number[] = [];
    const seq2: number[] = [];
    for (let i = 0; i < 10; i++) {
      seq1.push(child1.int(1, 1000));
      seq2.push(child2.int(1, 1000));
    }

    assert.deepEqual(seq1, seq2);
  });
});

describe("Rng multiple operations sequence", () => {
  it("multiple operations in sequence are deterministic", () => {
    const rng1 = createRng(7);
    const rng2 = createRng(7);

    const results1: unknown[] = [];
    const results2: unknown[] = [];

    results1.push(rng1.int(0, 50));
    results1.push(rng1.float());
    results1.push(rng1.pick(["a", "b", "c"]));
    results1.push(rng1.roll("3d6"));
    results1.push(rng1.shuffle([1, 2, 3]));
    results1.push(rng1.int(100, 200));

    results2.push(rng2.int(0, 50));
    results2.push(rng2.float());
    results2.push(rng2.pick(["a", "b", "c"]));
    results2.push(rng2.roll("3d6"));
    results2.push(rng2.shuffle([1, 2, 3]));
    results2.push(rng2.int(100, 200));

    assert.deepEqual(results1, results2);
  });
});

describe("createRng from PRNGState", () => {
  it("creates from an existing PRNGState directly", () => {
    const state = seed(42);
    const rng1 = createRng(state);
    const rng2 = createRng(state);

    const seq1: number[] = [];
    const seq2: number[] = [];
    for (let i = 0; i < 10; i++) {
      seq1.push(rng1.float());
      seq2.push(rng2.float());
    }

    assert.deepEqual(seq1, seq2);
  });
});
