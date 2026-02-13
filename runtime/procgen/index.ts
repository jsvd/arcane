// Types
export type {
  Direction,
  AdjacencyRule,
  TileSet,
  Constraint,
  WFCConfig,
  WFCGrid,
  WFCResult,
  GenerateAndTestConfig,
  GenerateAndTestResult,
} from "./types.ts";
export { DIRECTIONS, OPPOSITE, DIR_OFFSET } from "./types.ts";

// WFC core
export { generate } from "./wfc.ts";

// Constraints
export {
  reachability,
  exactCount,
  minCount,
  maxCount,
  border,
  custom,
  countTile,
  findTile,
} from "./constraints.ts";

// Validation & batch testing
export { validateLevel, generateAndTest } from "./validate.ts";
