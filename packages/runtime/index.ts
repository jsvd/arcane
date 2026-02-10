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
export * from "../../runtime/state/index.ts";

// Rendering
export * from "../../runtime/rendering/index.ts";

// UI primitives
export * from "../../runtime/ui/index.ts";

// Physics
export * from "../../runtime/physics/index.ts";

// Pathfinding
export * from "../../runtime/pathfinding/index.ts";

// Systems and recipes
export * from "../../runtime/systems/index.ts";

// Agent protocol
export * from "../../runtime/agent/index.ts";

// Testing (for user tests)
export * from "../../runtime/testing/harness.ts";
