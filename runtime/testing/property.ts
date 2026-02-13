/**
 * Property-Based Testing framework for Arcane.
 *
 * Define invariants over game state that must hold for any sequence of random
 * inputs. The framework generates seeded, reproducible random input sequences,
 * tests invariants after each frame, and when a violation is found, shrinks
 * the input to the minimal failing case.
 *
 * @example
 * ```ts
 * import { property, randomKeys, checkProperty } from "../testing/property.ts";
 * import type { InputFrame } from "../testing/replay.ts";
 *
 * type State = { hp: number; maxHp: number; x: number };
 *
 * const result = checkProperty({
 *   name: "HP never exceeds max",
 *   seed: 42,
 *   numRuns: 100,
 *   framesPerRun: 50,
 *   initialState: { hp: 100, maxHp: 100, x: 0 },
 *   update: (state, input) => {
 *     let hp = state.hp;
 *     if (input.keysPressed.includes("h")) hp = Math.min(hp + 30, state.maxHp);
 *     if (input.keysPressed.includes("d")) hp -= 10;
 *     return { ...state, hp };
 *   },
 *   invariant: (state) => state.hp <= state.maxHp,
 *   generator: randomKeys(["h", "d", "ArrowLeft", "ArrowRight"]),
 * });
 * ```
 */

import { seed, randomInt, randomFloat, randomPick, type PRNGState } from "../state/prng.ts";
import type { InputFrame } from "./replay.ts";

/** A generator produces a random InputFrame from a PRNG state. */
export type InputGenerator = (rng: PRNGState) => [InputFrame, PRNGState];

/** An invariant function — returns true if the state is valid, false if violated. */
export type Invariant<S> = (state: S, frame: number) => boolean;

/** Pure update function for property checking. */
export type PropertyUpdateFn<S> = (state: S, input: InputFrame) => S;

/** Configuration for a property check. */
export type PropertyConfig<S> = Readonly<{
  /** Property name (for error reporting). */
  name: string;
  /** PRNG seed for reproducibility. */
  seed: number;
  /** Number of random runs to attempt. Default: 100. */
  numRuns?: number;
  /** Frames per run. Default: 50. */
  framesPerRun?: number;
  /** Initial game state. */
  initialState: S;
  /** Pure update function. */
  update: PropertyUpdateFn<S>;
  /** Invariant that must hold at every frame. */
  invariant: Invariant<S>;
  /** Input generator. Use built-in generators or provide your own. */
  generator: InputGenerator;
  /** Whether to attempt shrinking on failure. Default: true. */
  shrink?: boolean;
}>;

/** Result of a single property run (one random input sequence). */
export type RunResult<S> = Readonly<{
  /** True if invariant held for all frames. */
  ok: boolean;
  /** Frame where invariant was violated (-1 if ok). */
  violationFrame: number;
  /** State at violation point. */
  violationState?: S;
  /** The input sequence that caused the violation. */
  inputs: readonly InputFrame[];
  /** The seed used for this run. */
  runSeed: number;
}>;

/** Result of a full property check across all runs. */
export type PropertyResult<S> = Readonly<{
  /** Property name. */
  name: string;
  /** True if invariant held across all runs. */
  ok: boolean;
  /** Number of runs completed. */
  runsCompleted: number;
  /** First failing run result, or undefined if all passed. */
  failure?: RunResult<S>;
  /** Shrunk (minimal) failing input, if shrinking found a shorter case. */
  shrunkFailure?: RunResult<S>;
  /** Total frames tested across all runs. */
  totalFramesTested: number;
}>;

/**
 * Check a property across many random input sequences.
 *
 * Generates `numRuns` random input sequences using the seeded PRNG,
 * runs each through the update function, and checks the invariant after
 * each frame. If a violation is found, attempts to shrink the input to
 * find the minimal failing case.
 *
 * @param config - Property configuration.
 * @returns PropertyResult with pass/fail and minimal failing input if found.
 */
export function checkProperty<S>(config: PropertyConfig<S>): PropertyResult<S> {
  const numRuns = config.numRuns ?? 100;
  const framesPerRun = config.framesPerRun ?? 50;
  const shouldShrink = config.shrink ?? true;

  let rng = seed(config.seed);
  let totalFramesTested = 0;

  for (let run = 0; run < numRuns; run++) {
    // Each run gets a unique sub-seed
    const [runSeed, nextRng] = randomInt(rng, 0, 2147483647);
    rng = nextRng;

    // Generate input sequence
    let genRng = seed(runSeed);
    const inputs: InputFrame[] = [];
    for (let f = 0; f < framesPerRun; f++) {
      const [input, next] = config.generator(genRng);
      inputs.push(input);
      genRng = next;
    }

    // Run the sequence
    const result = runSequence(config.initialState, config.update, config.invariant, inputs);
    totalFramesTested += inputs.length;

    if (!result.ok) {
      const failure: RunResult<S> = { ...result, inputs, runSeed };

      let shrunkFailure: RunResult<S> | undefined;
      if (shouldShrink) {
        shrunkFailure = shrinkInputs(config.initialState, config.update, config.invariant, inputs, result.violationFrame);
      }

      return {
        name: config.name,
        ok: false,
        runsCompleted: run + 1,
        failure,
        shrunkFailure,
        totalFramesTested,
      };
    }
  }

  return {
    name: config.name,
    ok: true,
    runsCompleted: numRuns,
    totalFramesTested,
  };
}

/** Run a single input sequence and check invariant at each frame. */
function runSequence<S>(
  initialState: S,
  update: PropertyUpdateFn<S>,
  invariant: Invariant<S>,
  inputs: readonly InputFrame[],
): { ok: boolean; violationFrame: number; violationState?: S } {
  let state = deepClone(initialState);

  for (let i = 0; i < inputs.length; i++) {
    state = update(state, inputs[i]);

    if (!invariant(state, i)) {
      return { ok: false, violationFrame: i, violationState: deepClone(state) };
    }
  }

  return { ok: true, violationFrame: -1 };
}

/**
 * Shrink the failing input sequence to find a minimal failing case.
 *
 * Strategy:
 * 1. Try removing frames from the end (shorten sequence).
 * 2. Try removing individual frames.
 * 3. Try simplifying individual frame inputs (remove keys).
 */
function shrinkInputs<S>(
  initialState: S,
  update: PropertyUpdateFn<S>,
  invariant: Invariant<S>,
  originalInputs: readonly InputFrame[],
  violationFrame: number,
): RunResult<S> | undefined {
  let bestInputs = [...originalInputs];
  let bestFrame = violationFrame;
  let improved = true;

  // Phase 1: Trim from end — find minimum length that still fails
  while (improved) {
    improved = false;

    // Try removing trailing frames
    for (let len = bestFrame + 1; len < bestInputs.length; len++) {
      const trimmed = bestInputs.slice(0, len);
      const result = runSequence(initialState, update, invariant, trimmed);
      if (!result.ok) {
        bestInputs = trimmed;
        bestFrame = result.violationFrame;
        improved = true;
        break;
      }
    }
  }

  // Phase 2: Try removing individual frames
  improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < bestInputs.length; i++) {
      const without = [...bestInputs.slice(0, i), ...bestInputs.slice(i + 1)];
      const result = runSequence(initialState, update, invariant, without);
      if (!result.ok) {
        bestInputs = without;
        bestFrame = result.violationFrame;
        improved = true;
        break;
      }
    }
  }

  // Phase 3: Try simplifying each frame (remove keys)
  for (let i = 0; i < bestInputs.length; i++) {
    const frame = bestInputs[i];

    // Try with empty keys
    const simplified: InputFrame = {
      keysDown: [],
      keysPressed: [],
      mouseX: 0,
      mouseY: 0,
    };
    const attempt1 = [...bestInputs];
    attempt1[i] = simplified;
    const r1 = runSequence(initialState, update, invariant, attempt1);
    if (!r1.ok) {
      bestInputs = attempt1;
      bestFrame = r1.violationFrame;
      continue;
    }

    // Try keeping just keysDown
    if (frame.keysDown.length > 0) {
      const keepDown: InputFrame = { ...simplified, keysDown: frame.keysDown };
      const attempt2 = [...bestInputs];
      attempt2[i] = keepDown;
      const r2 = runSequence(initialState, update, invariant, attempt2);
      if (!r2.ok) {
        bestInputs = attempt2;
        bestFrame = r2.violationFrame;
        continue;
      }
    }

    // Try keeping just keysPressed
    if (frame.keysPressed.length > 0) {
      const keepPressed: InputFrame = { ...simplified, keysPressed: frame.keysPressed };
      const attempt3 = [...bestInputs];
      attempt3[i] = keepPressed;
      const r3 = runSequence(initialState, update, invariant, attempt3);
      if (!r3.ok) {
        bestInputs = attempt3;
        bestFrame = r3.violationFrame;
        continue;
      }
    }
  }

  // Check if we actually improved
  if (bestInputs.length < originalInputs.length || bestFrame < violationFrame) {
    const finalResult = runSequence(initialState, update, invariant, bestInputs);
    if (!finalResult.ok) {
      return {
        ok: false,
        violationFrame: finalResult.violationFrame,
        violationState: finalResult.violationState,
        inputs: bestInputs,
        runSeed: -1,
      };
    }
  }

  return undefined;
}

// --- Built-in Generators ---

/**
 * Generator that randomly presses/holds keys from a given set.
 * Produces frames where 0-3 keys are held down and 0-1 key is newly pressed.
 *
 * @param keys - Array of valid key names.
 * @returns An InputGenerator function.
 */
export function randomKeys(keys: readonly string[]): InputGenerator {
  return (rng: PRNGState): [InputFrame, PRNGState] => {
    let current = rng;

    // Number of keys held down (0-3)
    const [numDown, r1] = randomInt(current, 0, Math.min(3, keys.length));
    current = r1;

    const keysDown: string[] = [];
    const used = new Set<number>();
    for (let i = 0; i < numDown; i++) {
      const [idx, r] = randomInt(current, 0, keys.length - 1);
      current = r;
      if (!used.has(idx)) {
        used.add(idx);
        keysDown.push(keys[idx]);
      }
    }

    // Whether a key is newly pressed (50% chance)
    const [pressChance, r2] = randomFloat(current);
    current = r2;

    const keysPressed: string[] = [];
    if (pressChance < 0.5 && keys.length > 0) {
      const [key, r3] = randomPick(current, keys);
      current = r3;
      keysPressed.push(key);
    }

    return [{
      keysDown,
      keysPressed,
      mouseX: 0,
      mouseY: 0,
    }, current];
  };
}

/**
 * Generator that produces random mouse clicks at random positions.
 *
 * @param width - Maximum X coordinate. Default: 800.
 * @param height - Maximum Y coordinate. Default: 600.
 * @returns An InputGenerator function.
 */
export function randomClicks(width: number = 800, height: number = 600): InputGenerator {
  return (rng: PRNGState): [InputFrame, PRNGState] => {
    let current = rng;

    const [mx, r1] = randomInt(current, 0, width);
    current = r1;
    const [my, r2] = randomInt(current, 0, height);
    current = r2;

    // 30% chance of a mouse "click" (simulated as key press)
    const [clickChance, r3] = randomFloat(current);
    current = r3;

    const keysPressed: string[] = [];
    if (clickChance < 0.3) {
      keysPressed.push("MouseLeft");
    }

    return [{
      keysDown: [],
      keysPressed,
      mouseX: mx,
      mouseY: my,
    }, current];
  };
}

/**
 * Generator that executes named actions randomly from a set.
 * Actions are encoded as key presses for the update function to interpret.
 *
 * @param actions - Array of action key names.
 * @returns An InputGenerator function.
 */
export function randomActions(actions: readonly string[]): InputGenerator {
  return (rng: PRNGState): [InputFrame, PRNGState] => {
    let current = rng;

    // 70% chance of performing an action, 30% empty frame
    const [chance, r1] = randomFloat(current);
    current = r1;

    const keysPressed: string[] = [];
    if (chance < 0.7 && actions.length > 0) {
      const [action, r2] = randomPick(current, actions);
      current = r2;
      keysPressed.push(action);
    }

    return [{
      keysDown: [],
      keysPressed,
      mouseX: 0,
      mouseY: 0,
    }, current];
  };
}

/**
 * Combine multiple generators — each frame randomly picks one.
 *
 * @param generators - Array of InputGenerators to choose from.
 * @returns A combined InputGenerator.
 */
export function combineGenerators(...generators: readonly InputGenerator[]): InputGenerator {
  return (rng: PRNGState): [InputFrame, PRNGState] => {
    const [idx, nextRng] = randomInt(rng, 0, generators.length - 1);
    return generators[idx](nextRng);
  };
}

/**
 * Define and immediately check a property. Convenience wrapper for use
 * in test suites — returns the PropertyResult and throws on failure.
 *
 * @param config - Property configuration.
 * @throws Error if the invariant is violated.
 */
export function assertProperty<S>(config: PropertyConfig<S>): void {
  const result = checkProperty(config);
  if (!result.ok) {
    const failure = result.shrunkFailure ?? result.failure!;
    const inputSummary = failure.inputs
      .map((f, i) => {
        const parts: string[] = [];
        if (f.keysDown.length > 0) parts.push(`down:[${f.keysDown.join(",")}]`);
        if (f.keysPressed.length > 0) parts.push(`press:[${f.keysPressed.join(",")}]`);
        if (f.mouseX !== 0 || f.mouseY !== 0) parts.push(`mouse:(${f.mouseX},${f.mouseY})`);
        return parts.length > 0 ? `  frame ${i}: ${parts.join(" ")}` : null;
      })
      .filter(Boolean)
      .join("\n");

    throw new Error(
      `Property "${config.name}" violated at frame ${failure.violationFrame}` +
      (result.shrunkFailure ? ` (shrunk from ${result.failure!.inputs.length} to ${failure.inputs.length} frames)` : "") +
      `\nState: ${JSON.stringify(failure.violationState)}` +
      `\nMinimal input sequence (${failure.inputs.length} frames):\n${inputSummary}`,
    );
  }
}

/** Deep clone via JSON round-trip. */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
