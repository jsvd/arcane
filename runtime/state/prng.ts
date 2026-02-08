/** Opaque PRNG state — serializable, deterministic (xoshiro128**) */
export type PRNGState = Readonly<{
  readonly __brand: "PRNGState";
  seed: number;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}>;

/** Create a seeded PRNG */
export function seed(n: number): PRNGState {
  // Initialize state from seed using splitmix32
  let s = n | 0;
  const s0 = splitmix32(s);
  s = s0.state;
  const s1 = splitmix32(s);
  s = s1.state;
  const s2 = splitmix32(s);
  s = s2.state;
  const s3 = splitmix32(s);

  return {
    __brand: "PRNGState" as const,
    seed: n,
    s0: s0.value,
    s1: s1.value,
    s2: s2.value,
    s3: s3.value,
  };
}

/** Dice notation: "2d6+3" */
export type DiceNotation = string & { readonly __dice: true };

/** Parsed dice specification */
export type DiceSpec = Readonly<{
  count: number;
  sides: number;
  modifier: number;
}>;

/** Parse dice notation string into a spec */
export function parseDice(notation: string): DiceSpec {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    throw new Error(
      `Invalid dice notation: "${notation}". Expected format: NdS or NdS+M (e.g. "2d6+3")`,
    );
  }
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

/** Roll dice. Returns [result, newRngState] */
export function rollDice(
  rng: PRNGState,
  spec: DiceSpec | string,
): [number, PRNGState] {
  const parsed = typeof spec === "string" ? parseDice(spec) : spec;
  let total = parsed.modifier;
  let current = rng;

  for (let i = 0; i < parsed.count; i++) {
    const [roll, next] = randomInt(current, 1, parsed.sides);
    total += roll;
    current = next;
  }

  return [total, current];
}

/** Random integer in [min, max] inclusive */
export function randomInt(
  rng: PRNGState,
  min: number,
  max: number,
): [number, PRNGState] {
  const [f, next] = randomFloat(rng);
  const range = max - min + 1;
  const value = min + Math.floor(f * range);
  return [value, next];
}

/** Random float in [0, 1) */
export function randomFloat(rng: PRNGState): [number, PRNGState] {
  const next = advance(rng);
  const result = (xoshiro128ss(rng) >>> 0) / 4294967296;
  return [result, next];
}

/** Pick one random element */
export function randomPick<T>(
  rng: PRNGState,
  items: readonly T[],
): [T, PRNGState] {
  const [index, next] = randomInt(rng, 0, items.length - 1);
  return [items[index], next];
}

/** Shuffle array (Fisher-Yates). Returns new array. */
export function shuffle<T>(
  rng: PRNGState,
  items: readonly T[],
): [readonly T[], PRNGState] {
  const result = [...items];
  let current = rng;

  for (let i = result.length - 1; i > 0; i--) {
    const [j, next] = randomInt(current, 0, i);
    current = next;
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return [result, current];
}

// --- Internal: xoshiro128** ---

function xoshiro128ss(state: PRNGState): number {
  const result = Math.imul(rotl(Math.imul(state.s1, 5), 7), 9);
  return result | 0;
}

function advance(state: PRNGState): PRNGState {
  const t = state.s1 << 9;

  let s2 = state.s2 ^ state.s0;
  let s3 = state.s3 ^ state.s1;
  const s1 = state.s1 ^ s2;
  const s0 = state.s0 ^ s3;

  s2 = s2 ^ t;
  s3 = rotl(s3, 11);

  return {
    __brand: "PRNGState" as const,
    seed: state.seed,
    s0,
    s1,
    s2,
    s3,
  };
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

function splitmix32(state: number): { value: number; state: number } {
  state = (state + 0x9e3779b9) | 0;
  let z = state;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  z = z ^ (z >>> 16);
  return { value: z, state };
}
