// Universal test harness — works in both Node.js and V8 (deno_core).
//
// Node mode: delegates to node:test and node:assert.
// V8 mode: standalone implementations with result reporting via
//   globalThis.__reportTest(suite, test, passed, error?)

type TestFn = () => void | Promise<void>;
type DescribeFn = (name: string, fn: () => void) => void;
type ItFn = (name: string, fn: TestFn) => void;

interface Assert {
  equal(actual: unknown, expected: unknown, message?: string): void;
  deepEqual(actual: unknown, expected: unknown, message?: string): void;
  notEqual(actual: unknown, expected: unknown, message?: string): void;
  notDeepEqual(actual: unknown, expected: unknown, message?: string): void;
  ok(value: unknown, message?: string): void;
  match(actual: string, expected: RegExp, message?: string): void;
  throws(fn: () => unknown, expected?: RegExp, message?: string): void;
}

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

const isNode =
  typeof globalThis.process !== "undefined" &&
  typeof globalThis.process.versions?.node === "string";

// ---------------------------------------------------------------------------
// V8 standalone implementations
// ---------------------------------------------------------------------------

function deepEqualImpl(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a !== "object") return false;

  // Both are non-null objects at this point
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aIsArray = Array.isArray(aObj);
  const bIsArray = Array.isArray(bObj);
  if (aIsArray !== bIsArray) return false;

  if (aIsArray) {
    const aArr = a as unknown[];
    const bArr = b as unknown[];
    if (aArr.length !== bArr.length) return false;
    for (let i = 0; i < aArr.length; i++) {
      if (!deepEqualImpl(aArr[i], bArr[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
  }
  for (const key of aKeys) {
    if (!deepEqualImpl(aObj[key], bObj[key])) return false;
  }
  return true;
}

function formatValue(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "object" && v !== null) {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function fail(message: string): never {
  throw new Error(message);
}

const v8Assert: Assert = {
  equal(actual, expected, message?) {
    if (actual !== expected) {
      fail(
        message ??
          `Expected ${formatValue(actual)} to strictly equal ${formatValue(expected)}`,
      );
    }
  },
  deepEqual(actual, expected, message?) {
    if (!deepEqualImpl(actual, expected)) {
      fail(
        message ??
          `Expected deep equality.\nActual:   ${formatValue(actual)}\nExpected: ${formatValue(expected)}`,
      );
    }
  },
  notEqual(actual, expected, message?) {
    if (actual === expected) {
      fail(
        message ??
          `Expected ${formatValue(actual)} to not strictly equal ${formatValue(expected)}`,
      );
    }
  },
  notDeepEqual(actual, expected, message?) {
    if (deepEqualImpl(actual, expected)) {
      fail(
        message ??
          `Expected values to not be deeply equal.\nValue: ${formatValue(actual)}`,
      );
    }
  },
  ok(value, message?) {
    if (!value) {
      fail(message ?? `Expected truthy value, got ${formatValue(value)}`);
    }
  },
  match(actual, expected, message?) {
    if (!expected.test(actual)) {
      fail(
        message ??
          `Expected ${formatValue(actual)} to match ${expected}`,
      );
    }
  },
  throws(fn, expected?, message?) {
    let threw = false;
    let error: unknown;
    try {
      fn();
    } catch (e) {
      threw = true;
      error = e;
    }
    if (!threw) {
      fail(message ?? "Expected function to throw");
    }
    if (expected instanceof RegExp) {
      const errMsg =
        error instanceof Error ? error.message : String(error);
      if (!expected.test(errMsg)) {
        fail(
          message ??
            `Expected thrown error message to match ${expected}, got ${formatValue(errMsg)}`,
        );
      }
    }
  },
};

// ---------------------------------------------------------------------------
// V8 test runner — collects describe/it blocks, runs them on demand
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  fn: TestFn;
}

interface Suite {
  name: string;
  tests: TestCase[];
}

const suites: Suite[] = [];
let currentSuite: Suite | null = null;

const v8Describe: DescribeFn = (name, fn) => {
  const suite: Suite = { name, tests: [] };
  const parentSuite = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = parentSuite;

  if (parentSuite) {
    // Nested describe: prefix child tests with parent name
    for (const test of suite.tests) {
      parentSuite.tests.push({
        name: `${name} > ${test.name}`,
        fn: test.fn,
      });
    }
  } else {
    suites.push(suite);
  }
};

const v8It: ItFn = (name, fn) => {
  if (!currentSuite) {
    const anon: Suite = { name: "<root>", tests: [{ name, fn }] };
    suites.push(anon);
  } else {
    currentSuite.tests.push({ name, fn });
  }
};

// Declare the reporter op that Rust will provide
declare const __reportTest: (
  suite: string,
  test: string,
  passed: boolean,
  error?: string,
) => void;

(globalThis as any).__runTests = async () => {
  let total = 0;
  let passed = 0;
  let failed = 0;

  const hasReporter = typeof (globalThis as any).__reportTest === "function";

  for (const suite of suites) {
    for (const test of suite.tests) {
      total++;
      try {
        const result = test.fn();
        if (result && typeof (result as any).then === "function") {
          await result;
        }
        passed++;
        if (hasReporter) {
          (globalThis as any).__reportTest(suite.name, test.name, true);
        }
      } catch (e) {
        failed++;
        const errMsg = e instanceof Error ? e.message : String(e);
        if (hasReporter) {
          (globalThis as any).__reportTest(suite.name, test.name, false, errMsg);
        }
      }
    }
  }

  return { total, passed, failed };
};

// ---------------------------------------------------------------------------
// Node.js — delegate to built-in modules
// ---------------------------------------------------------------------------

let describe: DescribeFn;
let it: ItFn;
let assert: Assert;

if (isNode) {
  const nodeTest = await import("node:test");
  const nodeAssert = await import("node:assert");
  describe = nodeTest.describe;
  it = nodeTest.it;
  assert = {
    equal: nodeAssert.strict.equal,
    deepEqual: nodeAssert.strict.deepEqual,
    notEqual: nodeAssert.strict.notEqual,
    notDeepEqual: nodeAssert.strict.notDeepEqual,
    ok: nodeAssert.strict.ok,
    match: nodeAssert.strict.match,
    throws: nodeAssert.strict.throws,
  };
} else {
  describe = v8Describe;
  it = v8It;
  assert = v8Assert;
}

export { describe, it, assert };
