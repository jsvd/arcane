import { describe, it, assert } from "../testing/harness.ts";
import { system, rule, applyRule, getApplicableRules, extend } from "./system.ts";
import type { SystemDef, Rule } from "./types.ts";

type Counter = { count: number; label: string };

describe("system()", () => {
  it("creates a named system with rules", () => {
    const r = rule<Counter>("inc").then((s) => ({ ...s, count: s.count + 1 }));
    const sys = system("counter", [r]);
    assert.equal(sys.name, "counter");
    assert.equal(sys.rules.length, 1);
    assert.equal(sys.rules[0].name, "inc");
  });

  it("creates an empty system", () => {
    const sys = system<Counter>("empty", []);
    assert.equal(sys.rules.length, 0);
  });
});

describe("rule()", () => {
  it("creates a rule with no conditions", () => {
    const r = rule<Counter>("inc").then((s) => ({ ...s, count: s.count + 1 }));
    assert.equal(r.name, "inc");
    assert.equal(r.conditions.length, 0);
    assert.equal(r.actions.length, 1);
  });

  it("creates a rule with conditions and actions", () => {
    const r = rule<Counter>("inc-if-low")
      .when((s) => s.count < 10)
      .then((s) => ({ ...s, count: s.count + 1 }));
    assert.equal(r.conditions.length, 1);
    assert.equal(r.actions.length, 1);
  });

  it("chains multiple actions", () => {
    const r = rule<Counter>("double-inc")
      .then(
        (s) => ({ ...s, count: s.count + 1 }),
        (s) => ({ ...s, count: s.count * 2 }),
      );
    assert.equal(r.actions.length, 2);
  });

  it("chains multiple conditions", () => {
    const r = rule<Counter>("guarded")
      .when(
        (s) => s.count > 0,
        (s) => s.count < 100,
      )
      .then((s) => s);
    assert.equal(r.conditions.length, 2);
  });

  it("creates a replacement rule", () => {
    const r = rule<Counter>("new-inc")
      .replaces("inc")
      .then((s) => ({ ...s, count: s.count + 10 }));
    assert.equal(r.replaces, "inc");
    assert.equal(r.name, "new-inc");
  });

  it("replaces with conditions", () => {
    const r = rule<Counter>("guarded-inc")
      .replaces("inc")
      .when((s) => s.count < 5)
      .then((s) => ({ ...s, count: s.count + 1 }));
    assert.equal(r.replaces, "inc");
    assert.equal(r.conditions.length, 1);
  });
});

describe("applyRule()", () => {
  const inc = rule<Counter>("inc").then((s) => ({ ...s, count: s.count + 1 }));
  const guarded = rule<Counter>("guarded")
    .when((s) => s.count < 3)
    .then((s) => ({ ...s, count: s.count + 1 }));
  const sys = system("counter", [inc, guarded]);

  it("applies an unconditional rule", () => {
    const result = applyRule(sys, "inc", { count: 0, label: "x" });
    assert.ok(result.ok);
    assert.equal(result.state.count, 1);
    assert.equal(result.ruleName, "inc");
  });

  it("applies a conditional rule when met", () => {
    const result = applyRule(sys, "guarded", { count: 1, label: "x" });
    assert.ok(result.ok);
    assert.equal(result.state.count, 2);
  });

  it("rejects when condition not met", () => {
    const result = applyRule(sys, "guarded", { count: 3, label: "x" });
    assert.equal(result.ok, false);
    assert.equal(result.state.count, 3);
    assert.ok(result.error);
    assert.equal(result.error!.code, "CONDITION_FAILED");
  });

  it("returns error for unknown rule", () => {
    const result = applyRule(sys, "nope", { count: 0, label: "x" });
    assert.equal(result.ok, false);
    assert.equal(result.error!.code, "UNKNOWN_RULE");
  });

  it("chains multiple actions in order", () => {
    const r = rule<Counter>("add-then-double")
      .then(
        (s) => ({ ...s, count: s.count + 3 }),
        (s) => ({ ...s, count: s.count * 2 }),
      );
    const s = system("math", [r]);
    const result = applyRule(s, "add-then-double", { count: 1, label: "x" });
    assert.ok(result.ok);
    assert.equal(result.state.count, 8); // (1+3)*2 = 8
  });

  it("passes args to conditions and actions", () => {
    const r = rule<Counter>("add-n")
      .when((_s, args) => (args.n as number) > 0)
      .then((s, args) => ({ ...s, count: s.count + (args.n as number) }));
    const s = system("args-test", [r]);
    const result = applyRule(s, "add-n", { count: 5, label: "x" }, { n: 3 });
    assert.ok(result.ok);
    assert.equal(result.state.count, 8);
  });

  it("preserves original state on failure", () => {
    const original = { count: 5, label: "x" };
    const result = applyRule(sys, "guarded", original);
    assert.equal(result.state, original);
  });
});

describe("getApplicableRules()", () => {
  const always = rule<Counter>("always").then((s) => s);
  const lowOnly = rule<Counter>("low-only")
    .when((s) => s.count < 3)
    .then((s) => s);
  const highOnly = rule<Counter>("high-only")
    .when((s) => s.count >= 3)
    .then((s) => s);
  const sys = system("multi", [always, lowOnly, highOnly]);

  it("returns all applicable rules for low count", () => {
    const names = getApplicableRules(sys, { count: 1, label: "x" });
    assert.deepEqual(names, ["always", "low-only"]);
  });

  it("returns all applicable rules for high count", () => {
    const names = getApplicableRules(sys, { count: 5, label: "x" });
    assert.deepEqual(names, ["always", "high-only"]);
  });

  it("passes args to conditions", () => {
    const argRule = rule<Counter>("needs-flag")
      .when((_s, args) => args.enabled === true)
      .then((s) => s);
    const s = system("arg-sys", [argRule]);
    assert.deepEqual(getApplicableRules(s, { count: 0, label: "x" }, { enabled: true }), ["needs-flag"]);
    assert.deepEqual(getApplicableRules(s, { count: 0, label: "x" }, { enabled: false }), []);
  });
});

describe("extend()", () => {
  const inc = rule<Counter>("inc").then((s) => ({ ...s, count: s.count + 1 }));
  const dec = rule<Counter>("dec").then((s) => ({ ...s, count: s.count - 1 }));
  const base = system("counter", [inc, dec]);

  it("adds new rules", () => {
    const doubleRule = rule<Counter>("double").then((s) => ({ ...s, count: s.count * 2 }));
    const ext = extend(base, { rules: [doubleRule] });
    assert.equal(ext.rules.length, 3);
    assert.equal(ext.rules[2].name, "double");
  });

  it("replaces rules by name", () => {
    const bigInc = rule<Counter>("big-inc")
      .replaces("inc")
      .then((s) => ({ ...s, count: s.count + 10 }));
    const ext = extend(base, { rules: [bigInc] });
    assert.equal(ext.rules.length, 2);
    // First rule is replaced
    const result = applyRule(ext, "big-inc", { count: 0, label: "x" });
    assert.ok(result.ok);
    assert.equal(result.state.count, 10);
  });

  it("removes rules by name", () => {
    const ext = extend(base, { remove: ["dec"] });
    assert.equal(ext.rules.length, 1);
    assert.equal(ext.rules[0].name, "inc");
  });

  it("combines add, replace, and remove", () => {
    const bigInc = rule<Counter>("big-inc")
      .replaces("inc")
      .then((s) => ({ ...s, count: s.count + 10 }));
    const reset = rule<Counter>("reset").then((s) => ({ ...s, count: 0 }));
    const ext = extend(base, {
      rules: [bigInc, reset],
      remove: ["dec"],
    });
    // inc replaced by big-inc, dec removed, reset added
    assert.equal(ext.rules.length, 2);
    assert.equal(ext.rules[0].name, "big-inc");
    assert.equal(ext.rules[1].name, "reset");
  });

  it("preserves system name", () => {
    const ext = extend(base, { rules: [] });
    assert.equal(ext.name, "counter");
  });
});
