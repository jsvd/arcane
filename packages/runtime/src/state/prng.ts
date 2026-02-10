/**
 * Opaque PRNG state using the xoshiro128** algorithm.
 * Serializable and deterministic — the same seed always produces the same sequence.
 * All PRNG functions are pure: they take a PRNGState and return a new PRNGState.
 * Create via {@link seed}.
 *
 * - `__brand` - Type brand, always "PRNGState".
 * - `seed` - The original seed value used to initialize this state.
 * - `s0`, `s1`, `s2`, `s3` - Internal 32-bit state words. Do not modify directly.
 */
export type PRNGState = Readonly<{
  readonly __brand: "PRNGState";
  seed: number;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}>;

/**
 * Create a seeded PRNG state. The same seed always produces the same random sequence.
 * Uses splitmix32 to initialize the xoshiro128** internal state.
 *
 * @param n - The seed value. Truncated to a 32-bit integer.
 * @returns A new PRNGState ready for use with {@link rollDice}, {@link randomInt}, etc.
 *
 * @example
 * const rng = seed(42);
 * const [value, rng2] = randomInt(rng, 1, 6);
 * // value is deterministic for seed 42
 */
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

/**
 * Branded string type for dice notation (e.g., "2d6+3", "1d20", "3d8-1").
 * Format: `NdS` or `NdS+M` / `NdS-M` where N=count, S=sides, M=modifier.
 */
export type DiceNotation = string & { readonly __dice: true };

/**
 * Parsed dice specification. Created by {@link parseDice} or passed directly to {@link rollDice}.
 *
 * - `count` - Number of dice to roll (the N in NdS). Must be >= 1.
 * - `sides` - Number of sides per die (the S in NdS). Must be >= 1.
 * - `modifier` - Added to the total after all dice are summed. Can be negative.
 */
export type DiceSpec = Readonly<{
  count: number;
  sides: number;
  modifier: number;
}>;

/**
 * Parse a dice notation string into a DiceSpec.
 * Pure function. Throws if the notation is invalid.
 *
 * @param notation - Dice notation string (e.g., "2d6+3", "1d20", "3d8-1").
 * @returns Parsed DiceSpec with count, sides, and modifier.
 * @throws Error if notation doesn't match the `NdS` or `NdS+M` / `NdS-M` format.
 */
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

/**
 * Roll dice deterministically using the PRNG. Pure function — returns the result
 * and a new PRNGState without modifying the original.
 *
 * Accepts either a DiceSpec object or a dice notation string (e.g., "2d6+3").
 * Each die is rolled individually using {@link randomInt}, then summed with the modifier.
 *
 * @param rng - Current PRNG state.
 * @param spec - A DiceSpec or dice notation string (e.g., "1d20", "2d6+3").
 * @returns A tuple of [total roll result, new PRNGState].
 *
 * @example
 * const rng = seed(42);
 * const [damage, rng2] = rollDice(rng, "2d6+3");
 * const [toHit, rng3] = rollDice(rng2, "1d20");
 */
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

/**
 * Generate a random integer in the range [min, max] (inclusive on both ends).
 * Pure function — returns the value and a new PRNGState.
 *
 * @param rng - Current PRNG state.
 * @param min - Minimum value (inclusive).
 * @param max - Maximum value (inclusive). Must be >= min.
 * @returns A tuple of [random integer, new PRNGState].
 */
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

/**
 * Generate a random float in the range [0, 1) (inclusive of 0, exclusive of 1).
 * Pure function — returns the value and a new PRNGState.
 *
 * @param rng - Current PRNG state.
 * @returns A tuple of [random float in [0,1), new PRNGState].
 */
export function randomFloat(rng: PRNGState): [number, PRNGState] {
  const next = advance(rng);
  const result = (xoshiro128ss(rng) >>> 0) / 4294967296;
  return [result, next];
}

/**
 * Pick one random element from an array. Pure function — does not modify the array.
 *
 * @param rng - Current PRNG state.
 * @param items - Non-empty array to pick from.
 * @returns A tuple of [randomly selected item, new PRNGState].
 */
export function randomPick<T>(
  rng: PRNGState,
  items: readonly T[],
): [T, PRNGState] {
  const [index, next] = randomInt(rng, 0, items.length - 1);
  return [items[index], next];
}

/**
 * Shuffle an array using Fisher-Yates algorithm. Pure function — returns a new
 * shuffled array without modifying the original.
 *
 * @param rng - Current PRNG state.
 * @param items - Array to shuffle.
 * @returns A tuple of [new shuffled array, new PRNGState].
 */
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
