/**
 * @arcane/runtime - Agent-native 2D game engine runtime
 *
 * Re-exports all runtime modules for convenient importing.
 * Use subpath imports for tree-shaking:
 * - import { createStore } from "@arcane/runtime/state"
 * - import { drawSprite } from "@arcane/runtime/rendering"
 *
 * Or import everything:
 * - import * as Arcane from "@arcane/runtime"
 */

// State management
export * from "./src/state/index.ts";

// Rendering
export * from "./src/rendering/index.ts";

// UI primitives
export * from "./src/ui/index.ts";

// Physics
export * from "./src/physics/index.ts";

// Pathfinding
export * from "./src/pathfinding/index.ts";

// Systems and recipes
export * from "./src/systems/index.ts";

// Agent protocol
export * from "./src/agent/index.ts";

// Testing (for user tests)
export * from "./src/testing/harness.ts";
