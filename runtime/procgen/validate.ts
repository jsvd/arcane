/**
 * Validation and batch generation testing for procedural generation.
 *
 * `validateLevel` checks all constraints on a grid.
 * `generateAndTest` runs batch generation with a test function for quality assurance.
 */

import type {
  WFCGrid,
  Constraint,
  GenerateAndTestConfig,
  GenerateAndTestResult,
} from "./types.ts";
import { generate } from "./wfc.ts";

/**
 * Validate a grid against a list of constraints.
 * Returns true if all constraints pass.
 *
 * @param grid - The grid to validate.
 * @param constraints - Array of constraint functions.
 * @returns True if all constraints are satisfied.
 *
 * @example
 * ```ts
 * const valid = validateLevel(grid, [
 *   reachability((id) => id !== WALL),
 *   exactCount(ENTRANCE, 1),
 * ]);
 * ```
 */
export function validateLevel(grid: WFCGrid, constraints: readonly Constraint[]): boolean {
  for (const constraint of constraints) {
    if (!constraint(grid)) return false;
  }
  return true;
}

/**
 * Batch generate levels and run a test function on each.
 * Reports how many generated successfully, passed, and failed.
 *
 * Each iteration uses a different seed: `config.wfc.seed + i`.
 *
 * @param config - Batch generation configuration.
 * @returns Summary of passed, failed, and generation failures.
 *
 * @example
 * ```ts
 * const result = generateAndTest({
 *   wfc: { tileset, width: 20, height: 20, seed: 1, constraints: [connected] },
 *   iterations: 100,
 *   testFn: (grid) => {
 *     const entrances = findTile(grid, ENTRANCE);
 *     return entrances.length === 1;
 *   },
 * });
 * console.log(`${result.passed}/${result.total} levels passed`);
 * ```
 */
export function generateAndTest(config: GenerateAndTestConfig): GenerateAndTestResult {
  let passed = 0;
  let failed = 0;
  let generationFailures = 0;

  for (let i = 0; i < config.iterations; i++) {
    const wfcConfig = {
      ...config.wfc,
      seed: config.wfc.seed + i,
    };

    const result = generate(wfcConfig);

    if (!result.success || !result.grid) {
      generationFailures++;
      continue;
    }

    if (config.testFn(result.grid)) {
      passed++;
    } else {
      failed++;
    }
  }

  return {
    passed,
    failed,
    generationFailures,
    total: config.iterations,
  };
}
